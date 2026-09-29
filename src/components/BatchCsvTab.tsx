import React, { useState, useRef } from 'react';
import { PolicyConfig, BatchResultRow, RiskLevel, RecommendedAction } from '../types';
import { FEATURE_COLS, predictTransaction } from '../lib/xgboost';
import { generateSampleCsvContent } from '../lib/demoData';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, ShieldX, Search, Filter, RefreshCw } from 'lucide-react';

interface Props {
  policy: PolicyConfig;
}

export const BatchCsvTab: React.FC<Props> = ({ policy }) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [scoredRows, setScoredRows] = useState<BatchResultRow[]>([]);
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const processCsvText = (text: string) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const lines = text.trim().split(/\r\n|\n/);
      if (lines.length < 2) {
        throw new Error('CSV is empty or missing headers.');
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      
      // Validate required columns (Time, Amount, V1-V28)
      const missing = FEATURE_COLS.filter(col => !headers.includes(col));
      if (missing.length > 0) {
        throw new Error(`Missing required column(s): ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ` and ${missing.length - 5} more` : ''}. Required: Time, Amount, V1-V28.`);
      }

      const hasClass = headers.includes('Class');
      const results: BatchResultRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        const rowObj: Record<string, number> = {};

        headers.forEach((h, colIdx) => {
          rowObj[h] = parseFloat(values[colIdx]) || 0;
        });

        // Run prediction
        const pred = predictTransaction(rowObj as any, policy);

        const resultRow: BatchResultRow = {
          Time: rowObj.Time,
          Amount: rowObj.Amount,
          ...rowObj,
          xgb_probability: pred.fraud_probability,
          anomaly_score: pred.anomaly_score,
          risk_level: pred.risk_level,
          action: pred.recommended_action,
          explanation: pred.explanation,
        };

        if (hasClass) {
          resultRow.Class = rowObj.Class;
        }

        results.push(resultRow);
      }

      setScoredRows(results);
      setSuccessMsg(`Successfully processed ${results.length} transactions through the Two-Stage Risk Engine.`);
      setCurrentPage(1);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error parsing CSV file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        processCsvText(content);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read the file.');
    };
    reader.readAsText(file);
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

  // Filtering & Pagination
  const filteredRows = scoredRows.filter(r => {
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
  });

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
              Upload any CSV with Time, Amount, V1-V28 (Class optional) for automated two-stage scoring.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition"
              title="Download pre-populated CSV template with varied risk scenarios"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Download Test Template</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium shadow-sm transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload CSV File</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />
          </div>
        </div>

        {/* Drag and Drop Zone if empty */}
        {scoredRows.length === 0 && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-xl p-8 text-center cursor-pointer transition bg-slate-950/40"
          >
            <FileSpreadsheet className="w-10 h-10 text-slate-500 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-300">Click to select or drop a CSV file</div>
            <p className="text-xs text-slate-500 mt-1">
              Required: Time, Amount, V1 through V28. Optional: Class (will be preserved in output).
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadSample();
              }}
              className="mt-3 text-xs text-blue-400 hover:underline"
            >
              Don't have a file? Download our 15-row demonstration dataset.
            </button>
          </div>
        )}

        {/* Messages */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <ShieldX className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button
              onClick={handleDownloadScoredCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-xs shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Scored Results</span>
            </button>
          </div>
        )}
      </div>

      {/* Batch Overview Cards & Visual Breakdown */}
      {scoredRows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Risk Level Distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Risk Level Distribution ({scoredRows.length} total)
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
              {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} rows
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Fraud Prob</th>
                  <th className="py-2.5 px-3">Anomaly</th>
                  <th className="py-2.5 px-3">Risk Level</th>
                  <th className="py-2.5 px-3">Action</th>
                  {scoredRows[0]?.Class !== undefined && <th className="py-2.5 px-3">True Class</th>}
                  <th className="py-2.5 px-3">Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {paginatedRows.map((row, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-2 px-3 font-mono text-slate-500">{globalIdx}</td>
                      <td className="py-2 px-3 font-mono text-slate-300">{row.Time.toFixed(0)}s</td>
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
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${row.Class === 1 ? 'bg-red-950 text-red-400 border border-red-800' : 'text-slate-400'}`}>
                            {row.Class === 1 ? 'Fraud (1)' : 'Legit (0)'}
                          </span>
                        </td>
                      )}
                      <td className="py-2 px-3 text-slate-300 max-w-xs truncate" title={row.explanation}>
                        {row.explanation}
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
    </div>
  );
};
