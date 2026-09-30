import React, { useState, useRef, useEffect } from 'react';
import { PolicyConfig, BatchResultRow, RiskLevel, RecommendedAction, TransactionData } from '../types';
import { FEATURE_COLS, predictTransaction } from '../lib/xgboost';
import { generateSampleCsvContent } from '../lib/demoData';
import { useDataContext } from '../context/DataContext';
import { formatStandardTime, formatClockTime } from '../lib/timeUtils';
import { TransactionDetailModal } from './TransactionDetailModal';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ShieldX,
  Search,
  ClipboardList,
  Sparkles,
  RotateCcw,
  Loader2,
  Eye
} from 'lucide-react';

interface Props {
  policy: PolicyConfig;
}

export const BatchCsvTab: React.FC<Props> = ({ policy }) => {
  const { datasetName, rows: contextRows, setDataset, clearDataset } = useDataContext();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [scoredRows, setScoredRows] = useState<BatchResultRow[]>(contextRows);
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedDetailRow, setSelectedDetailRow] = useState<BatchResultRow | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showPasteBox, setShowPasteBox] = useState<boolean>(false);
  const [pastedText, setPastedText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (contextRows.length > 0 && scoredRows.length === 0) {
      setScoredRows(contextRows);
    }
  }, [contextRows]);

  const pageSize = 15;

  const handleDownloadSample = () => {
    const csvContent = generateSampleCsvContent();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_transactions_for_scoring.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadDemoBatch = () => {
    const sample = generateSampleCsvContent();
    processCsvText(sample, '15-Row Demonstration Batch');
  };

  // Robust line parser that supports quotes and dynamic delimiters
  const parseCsvLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^["']|["']$/g, ''));
    return result;
  };

  const processCsvText = (rawText: string, sourceName?: string) => {
    setIsProcessing(true);
    setProcessingProgress(0);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Strip UTF-8 Byte Order Mark (BOM) if present
      const cleanText = rawText.replace(/^\uFEFF/, '').trim();
      if (!cleanText) {
        throw new Error('The provided file or text is empty.');
      }

      const lines = cleanText.split(/\r\n|\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        throw new Error('CSV must contain a header row and at least one data row.');
      }

      // 2. Detect delimiter (comma, semicolon, or tab)
      const headerLine = lines[0];
      let delimiter = ',';
      if (headerLine.includes(';') && !headerLine.includes(',')) delimiter = ';';
      else if (headerLine.includes('\t') && !headerLine.includes(',')) delimiter = '\t';

      // 3. Normalize headers (case-insensitive and whitespace stripped)
      const rawHeaders = parseCsvLine(headerLine, delimiter);
      const normalizedHeaderIndices: Record<string, number> = {};

      rawHeaders.forEach((h, idx) => {
        const cleaned = h.trim().replace(/^["']|["']$/g, '');
        const lower = cleaned.toLowerCase();

        if (lower === 'time') {
          normalizedHeaderIndices['Time'] = idx;
        } else if (lower === 'amount') {
          normalizedHeaderIndices['Amount'] = idx;
        } else if (lower === 'class') {
          normalizedHeaderIndices['Class'] = idx;
        } else {
          const vMatch = lower.match(/^v([1-9]|1\d|2[0-8])$/);
          if (vMatch) {
            normalizedHeaderIndices[`V${vMatch[1]}`] = idx;
          } else {
            normalizedHeaderIndices[cleaned] = idx;
          }
        }
      });

      // 4. Validate mandatory columns: Time, Amount, V1-V28
      const missingCols = FEATURE_COLS.filter(col => normalizedHeaderIndices[col] === undefined);
      if (missingCols.length > 0) {
        const preview = missingCols.slice(0, 4).join(', ');
        const remainder = missingCols.length > 4 ? ` and ${missingCols.length - 4} more` : '';
        throw new Error(
          `Missing required column(s): ${preview}${remainder}. Required columns are: Time (seconds elapsed), Amount, Anonymized features V1 through V28.`
        );
      }

      const hasClass = normalizedHeaderIndices['Class'] !== undefined;
      const totalDataRows = lines.length - 1;

      // 5. Asynchronous chunk processing for smooth performance and progress tracking
      const CHUNK_SIZE = 250;
      let currentIndex = 1;
      const results: BatchResultRow[] = [];

      const processNextChunk = () => {
        const limit = Math.min(currentIndex + CHUNK_SIZE, lines.length);

        for (let i = currentIndex; i < limit; i++) {
          const rowValues = parseCsvLine(lines[i], delimiter);
          const rowObj: TransactionData = {
            Time: 0,
            Amount: 0
          };

          for (const col of FEATURE_COLS) {
            const colIdx = normalizedHeaderIndices[col];
            const rawVal = rowValues[colIdx];
            const num = parseFloat(rawVal);
            rowObj[col] = isNaN(num) ? 0 : num;
          }

          // Evaluate model signals
          const pred = predictTransaction(rowObj, policy);

          const resultRow: BatchResultRow = {
            ...rowObj,
            xgb_probability: pred.fraud_probability,
            anomaly_score: pred.anomaly_score,
            risk_level: pred.risk_level,
            action: pred.recommended_action,
            explanation: pred.explanation,
          };

          if (hasClass) {
            const classIdx = normalizedHeaderIndices['Class'];
            const classNum = parseInt(rowValues[classIdx], 10);
            resultRow.Class = isNaN(classNum) ? undefined : classNum;
          }

          results.push(resultRow);
        }

        currentIndex = limit;
        const progressPct = Math.round((results.length / totalDataRows) * 100);
        setProcessingProgress(progressPct);

        if (currentIndex < lines.length) {
          setTimeout(processNextChunk, 0);
        } else {
          setScoredRows(results);
          setDataset(sourceName || 'Uploaded CSV Batch', results);
          setIsProcessing(false);
          setShowPasteBox(false);
          setSuccessMsg(
            `Successfully scored ${results.length.toLocaleString()} transactions${
              sourceName ? ` from ${sourceName}` : ''
            } through the Primary + Secondary Risk Policy Engine.`
          );
          setCurrentPage(1);
        }
      };

      processNextChunk();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error parsing CSV file.');
      setIsProcessing(false);
    }
  };

  const handleFile = (file: File) => {
    if (!file) return;

    // Check extension
    if (!file.name.toLowerCase().endsWith('.csv') && !file.name.toLowerCase().endsWith('.txt')) {
      setErrorMsg('Please select a valid CSV file (.csv).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        processCsvText(content, file.name);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read the file. Please check file permissions or try copy-pasting the text.');
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Always clear the input value so selecting the same file again triggers onChange
    e.target.value = '';
    if (file) {
      handleFile(file);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDownloadScoredCsv = () => {
    if (scoredRows.length === 0) return;

    const exportHeaders = [
      'Time',
      'Amount',
      'xgb_probability',
      'anomaly_score',
      'risk_level',
      'action',
      'explanation',
      ...(scoredRows[0].Class !== undefined ? ['Class'] : [])
    ];

    const rows = [exportHeaders.join(',')];

    for (const r of scoredRows) {
      const vals = [
        r.Time,
        r.Amount.toFixed(2),
        r.xgb_probability.toFixed(6),
        r.anomaly_score.toFixed(6),
        r.risk_level,
        r.action,
        `"${r.explanation.replace(/"/g, '""')}"`,
        ...(r.Class !== undefined ? [r.Class] : [])
      ];
      rows.push(vals.join(','));
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'scored_transactions_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Distributions
  const riskCounts: Record<RiskLevel, number> = {
    LOW: scoredRows.filter(r => r.risk_level === 'LOW').length,
    MEDIUM: scoredRows.filter(r => r.risk_level === 'MEDIUM').length,
    HIGH: scoredRows.filter(r => r.risk_level === 'HIGH').length,
    CRITICAL: scoredRows.filter(r => r.risk_level === 'CRITICAL').length,
  };

  const actionCounts: Record<RecommendedAction, number> = {
    APPROVE: scoredRows.filter(r => r.action === 'APPROVE').length,
    REVIEW: scoredRows.filter(r => r.action === 'REVIEW').length,
    BLOCK: scoredRows.filter(r => r.action === 'BLOCK').length,
  };

  // Filtering, Time Sorting & Pagination
  const filteredRows = scoredRows
    .filter(r => {
      if (filterAction !== 'ALL' && r.action !== filterAction) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          r.risk_level.toLowerCase().includes(term) ||
          r.action.toLowerCase().includes(term) ||
          r.Amount.toString().includes(term) ||
          r.explanation.toLowerCase().includes(term)
        );
      }
      return true;
    })
    .sort((a, b) => sortDirection === 'asc' ? a.Time - b.Time : b.Time - a.Time);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Upload & Action Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-white">Batch CSV Scoring Engine</h2>
            <p className="text-xs text-slate-400">
              Upload any CSV with Time (seconds elapsed), Amount, and Anonymized features V1-V28 (Class optional).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleLoadDemoBatch}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 hover:text-white rounded-lg text-xs font-medium border border-blue-800/60 transition disabled:opacity-50"
              title="Instantly load and score the 15-row demonstration dataset"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Load 15-Row Demo Batch</span>
            </button>
            <button
              onClick={handleDownloadSample}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition disabled:opacity-50"
              title="Download pre-populated CSV template with varied risk scenarios"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Download Test Template</span>
            </button>
            <button
              onClick={() => setShowPasteBox(!showPasteBox)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition disabled:opacity-50"
            >
              <ClipboardList className="w-3.5 h-3.5 text-purple-400" />
              <span>{showPasteBox ? 'Hide Paste Box' : 'Paste CSV Text'}</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium shadow-sm transition disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{scoredRows.length > 0 ? 'Upload New CSV' : 'Upload CSV File'}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".csv,.txt"
              className="hidden"
            />
          </div>
        </div>

        {/* Expandable Direct Paste Box */}
        {showPasteBox && (
          <div className="mt-4 p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Paste Raw CSV Text (Includes header row)
              </span>
              <button
                type="button"
                onClick={() => setPastedText(generateSampleCsvContent())}
                className="text-xs text-blue-400 hover:underline"
              >
                Insert Sample Data
              </button>
            </div>
            <textarea
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
              placeholder="Paste comma-separated rows here (Time, V1..V28, Amount, Class)..."
              rows={5}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPasteBox(false)}
                className="px-3 py-1 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => processCsvText(pastedText, 'Pasted Text')}
                disabled={!pastedText.trim() || isProcessing}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition"
              >
                Score Pasted Transactions
              </button>
            </div>
          </div>
        )}

        {/* Drag and Drop Zone */}
        {scoredRows.length === 0 && (
          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
              isDragging
                ? 'border-blue-400 bg-blue-950/30 ring-2 ring-blue-500/20'
                : 'border-slate-800 hover:border-blue-500/50 bg-slate-950/40 hover:bg-slate-950/60'
            }`}
          >
            <FileSpreadsheet
              className={`w-10 h-10 mx-auto mb-2 transition ${
                isDragging ? 'text-blue-400 scale-110' : 'text-slate-500'
              }`}
            />
            <div className="text-sm font-semibold text-slate-200">
              {isDragging ? 'Drop your CSV file here' : 'Click to select or drop a CSV file'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Required: Time (seconds elapsed), Amount, Anonymized features V1-V28. Optional: Class (will be preserved in output).
            </p>
            <div className="flex items-center justify-center gap-3 mt-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadDemoBatch();
                }}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium underline"
              >
                Load pre-built 15-row demonstration batch
              </button>
              <span className="text-slate-600">&bull;</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadSample();
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium"
              >
                Download sample_test.csv template
              </button>
            </div>
          </div>
        )}

        {/* Loading Progress State */}
        {isProcessing && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-blue-900/40 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                Scoring transactions with XGBoost & Isolation Forest models...
              </span>
              <span className="font-mono text-blue-400 font-bold">{processingProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-150"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="mt-4 p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5">
            <ShieldX className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block text-red-300">File Processing Error:</span>
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Success Notification */}
        {successMsg && (
          <div className="mt-4 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-slate-300 hover:text-white px-2.5 py-1 rounded bg-slate-800 text-xs"
              >
                Upload Another
              </button>
              <button
                onClick={handleDownloadScoredCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-xs shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Scored Results CSV</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Batch Overview Cards & Visual Breakdown */}
      {scoredRows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Risk Level Distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Risk Level Distribution ({scoredRows.length.toLocaleString()} total)
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
                <span className="text-[11px] font-bold text-emerald-400 block">LOW</span>
                <span className="text-xl font-bold font-mono text-white">{riskCounts.LOW}</span>
                <span className="text-[10px] text-slate-500 block">
                  {((riskCounts.LOW / scoredRows.length) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
                <span className="text-[11px] font-bold text-amber-400 block">MEDIUM</span>
                <span className="text-xl font-bold font-mono text-white">{riskCounts.MEDIUM}</span>
                <span className="text-[10px] text-slate-500 block">
                  {((riskCounts.MEDIUM / scoredRows.length) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
                <span className="text-[11px] font-bold text-orange-400 block">HIGH</span>
                <span className="text-xl font-bold font-mono text-white">{riskCounts.HIGH}</span>
                <span className="text-[10px] text-slate-500 block">
                  {((riskCounts.HIGH / scoredRows.length) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
                <span className="text-[11px] font-bold text-red-400 block">CRITICAL</span>
                <span className="text-xl font-bold font-mono text-white">{riskCounts.CRITICAL}</span>
                <span className="text-[10px] text-slate-500 block">
                  {((riskCounts.CRITICAL / scoredRows.length) * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Distribution Bar */}
            <div className="w-full h-2 rounded-full bg-slate-950 flex overflow-hidden">
              <div
                className="bg-emerald-500 h-full"
                style={{ width: `${(riskCounts.LOW / scoredRows.length) * 100}%` }}
                title={`LOW: ${riskCounts.LOW}`}
              />
              <div
                className="bg-amber-500 h-full"
                style={{ width: `${(riskCounts.MEDIUM / scoredRows.length) * 100}%` }}
                title={`MEDIUM: ${riskCounts.MEDIUM}`}
              />
              <div
                className="bg-orange-500 h-full"
                style={{ width: `${(riskCounts.HIGH / scoredRows.length) * 100}%` }}
                title={`HIGH: ${riskCounts.HIGH}`}
              />
              <div
                className="bg-red-500 h-full"
                style={{ width: `${(riskCounts.CRITICAL / scoredRows.length) * 100}%` }}
                title={`CRITICAL: ${riskCounts.CRITICAL}`}
              />
            </div>
          </div>

          {/* Action Distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Policy Action Distribution
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
                <span className="text-[11px] font-bold text-emerald-400 block">APPROVE</span>
                <span className="text-xl font-bold font-mono text-white">{actionCounts.APPROVE}</span>
                <span className="text-[10px] text-slate-500 block">
                  {((actionCounts.APPROVE / scoredRows.length) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
                <span className="text-[11px] font-bold text-amber-400 block">REVIEW</span>
                <span className="text-xl font-bold font-mono text-white">{actionCounts.REVIEW}</span>
                <span className="text-[10px] text-slate-500 block">
                  {((actionCounts.REVIEW / scoredRows.length) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
                <span className="text-[11px] font-bold text-red-400 block">BLOCK</span>
                <span className="text-xl font-bold font-mono text-white">{actionCounts.BLOCK}</span>
                <span className="text-[10px] text-slate-500 block">
                  {((actionCounts.BLOCK / scoredRows.length) * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Distribution Bar */}
            <div className="w-full h-2 rounded-full bg-slate-950 flex overflow-hidden">
              <div
                className="bg-emerald-500 h-full"
                style={{ width: `${(actionCounts.APPROVE / scoredRows.length) * 100}%` }}
                title={`APPROVE: ${actionCounts.APPROVE}`}
              />
              <div
                className="bg-amber-500 h-full"
                style={{ width: `${(actionCounts.REVIEW / scoredRows.length) * 100}%` }}
                title={`REVIEW: ${actionCounts.REVIEW}`}
              />
              <div
                className="bg-red-500 h-full"
                style={{ width: `${(actionCounts.BLOCK / scoredRows.length) * 100}%` }}
                title={`BLOCK: ${actionCounts.BLOCK}`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Scored Results Table */}
      {scoredRows.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by amount, risk, or action..."
                  value={searchTerm}
                  onChange={e => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-56"
                />
              </div>

              <div className="flex items-center gap-1 text-xs">
                {['ALL', 'BLOCK', 'REVIEW', 'APPROVE'].map(action => (
                  <button
                    key={action}
                    onClick={() => {
                      setFilterAction(action);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded text-xs transition ${
                      filterAction === action
                        ? 'bg-blue-600 text-white font-medium'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-400">
              Showing {(currentPage - 1) * pageSize + 1} -{' '}
              {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length.toLocaleString()} rows
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">
                    <button
                      onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="flex items-center gap-1 hover:text-white transition uppercase font-mono text-[10px]"
                      title="Sort by Time"
                    >
                      <span>Time</span>
                      <span className="text-blue-400 font-bold">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    </button>
                  </th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Fraud Prob</th>
                  <th className="py-2.5 px-3">Anomaly</th>
                  <th className="py-2.5 px-3">Risk Level</th>
                  <th className="py-2.5 px-3">Action</th>
                  {scoredRows[0]?.Class !== undefined && <th className="py-2.5 px-3">True Class</th>}
                  <th className="py-2.5 px-3">Explanation</th>
                  <th className="py-2.5 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {paginatedRows.map((row, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={idx}
                      onClick={() => setSelectedDetailRow(row)}
                      className="hover:bg-blue-950/30 cursor-pointer transition group"
                      title="Click to inspect all features V1 to V28 and anomaly drivers"
                    >
                      <td className="py-2 px-3 font-mono text-slate-500">{globalIdx}</td>
                      <td className="py-2 px-3 font-mono text-slate-300">
                        <div className="font-semibold text-slate-200 group-hover:text-blue-300 transition">{formatClockTime(row.Time)}</div>
                        <div className="text-[10px] text-slate-500">T+{row.Time.toFixed(0)}s</div>
                      </td>
                      <td className="py-2 px-3 font-mono font-medium text-white">${row.Amount.toFixed(2)}</td>
                      <td className="py-2 px-3 font-mono">
                        <span className={row.xgb_probability > 0.8 ? 'text-red-400 font-bold' : row.xgb_probability > 0.5 ? 'text-amber-400' : 'text-slate-300'}>
                          {(row.xgb_probability * 100).toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono">
                        <span className={row.anomaly_score > policy.anomalyCutoff ? 'text-purple-400 font-medium' : 'text-slate-400'}>
                          {row.anomaly_score.toFixed(4)}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.risk_level === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          row.risk_level === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                          row.risk_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {row.risk_level}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold">
                        <span className={row.action === 'BLOCK' ? 'text-red-400' : row.action === 'REVIEW' ? 'text-amber-400' : 'text-emerald-400'}>
                          {row.action}
                        </span>
                      </td>
                      {row.Class !== undefined && (
                        <td className="py-2 px-3 font-mono">
                          {row.action === 'BLOCK' && row.Class === 1 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 inline-flex items-center gap-1 whitespace-nowrap">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Fraud (1) &bull; TP
                            </span>
                          )}
                          {row.action === 'BLOCK' && row.Class === 0 && (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-950/80 text-orange-300 border border-orange-800/80 inline-flex items-center gap-1 whitespace-nowrap"
                              title="False Alarm (False Positive): Model predicted high risk/block on a legitimate transaction."
                            >
                              <AlertTriangle className="w-3 h-3 text-orange-400" />
                              Legit (0) &bull; False Alarm
                            </span>
                          )}
                          {row.action === 'APPROVE' && row.Class === 0 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900 text-slate-300 border border-slate-800 inline-flex items-center gap-1 whitespace-nowrap">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Legit (0) &bull; TN
                            </span>
                          )}
                          {row.action === 'APPROVE' && row.Class === 1 && (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/80 inline-flex items-center gap-1 whitespace-nowrap"
                              title="Missed Fraud (False Negative): Model approved a fraudulent transaction."
                            >
                              <ShieldX className="w-3 h-3 text-rose-400" />
                              Fraud (1) &bull; Missed
                            </span>
                          )}
                          {row.action === 'REVIEW' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/80 inline-flex items-center gap-1 whitespace-nowrap">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              {row.Class === 1 ? 'Fraud (1)' : 'Legit (0)'} &bull; In Review
                            </span>
                          )}
                        </td>
                      )}
                      <td className="py-2 px-3 text-slate-300 max-w-xs truncate" title={row.explanation}>
                        {row.explanation}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDetailRow(row);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white font-medium text-[11px] transition inline-flex items-center gap-1 border border-blue-500/30 shadow-sm"
                          title="Inspect V1-V28 and anomaly drivers"
                        >
                          <Eye className="w-3 h-3" />
                          <span>V1-V28</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-500">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transaction Deep Dive & V1-V28 Inspector Modal */}
      <TransactionDetailModal
        isOpen={!!selectedDetailRow}
        transaction={selectedDetailRow}
        onClose={() => setSelectedDetailRow(null)}
      />
    </div>
  );
};
