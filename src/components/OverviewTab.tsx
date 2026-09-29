import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Ban,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Download,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  Cpu,
  Layers,
  Sparkles,
  ArrowUpRight,
  Check,
  Upload,
  PlusCircle,
  FileText
} from 'lucide-react';
import { PolicyConfig, BatchResultRow } from '../types';
import { generateSampleCsvContent } from '../lib/demoData';
import { useDataContext } from '../context/DataContext';
import { predictTransaction, FEATURE_COLS } from '../lib/xgboost';

interface OverviewTabProps {
  onNavigateTab: (tab: string) => void;
}

interface LiveStreamRow {
  id: string;
  time: string;
  amount: number;
  prob: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  action: 'APPROVE' | 'REVIEW' | 'BLOCK';
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ onNavigateTab }) => {
  const { datasetName, rows, policy, setDataset } = useDataContext();
  const [isLiveActive, setIsLiveActive] = useState<boolean>(rows.length > 0);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Live simulation tick if dataset is active
  const [liveRows, setLiveRows] = useState<LiveStreamRow[]>([]);

  useEffect(() => {
    if (rows.length > 0) {
      // Seed initial stream rows from dataset
      const seeded = rows.slice(0, 4).map((r, i) => ({
        id: i.toString(),
        time: `${r.Time}s`,
        amount: r.Amount,
        prob: r.xgb_probability,
        risk: r.risk_level,
        action: r.action
      }));
      setLiveRows(seeded);
      setIsLiveActive(true);
    } else {
      setLiveRows([]);
      setIsLiveActive(false);
    }
  }, [rows]);

  const handleDownloadSampleCsv = () => {
    const csvContent = generateSampleCsvContent();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sentinel_fraud_sample_1000tx.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handleLoadSampleDataset = () => {
    const csvText = generateSampleCsvContent();
    const lines = csvText.trim().split(/\r\n|\n/).filter(l => l.trim().length > 0);
    const headerLine = lines[0];
    const rawHeaders = headerLine.split(',').map(h => h.trim());
    const headerMap: Record<string, number> = {};
    rawHeaders.forEach((h, idx) => {
      headerMap[h] = idx;
    });

    const parsedRows: BatchResultRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim());
      const rowObj: any = { Time: parseFloat(vals[headerMap['Time'] || 0]) || 0, Amount: parseFloat(vals[headerMap['Amount'] || 29]) || 0 };
      for (let k = 1; k <= 28; k++) {
        const key = `V${k}`;
        rowObj[key] = parseFloat(vals[headerMap[key] || k]) || 0;
      }
      const pred = predictTransaction(rowObj, policy);
      const classVal = headerMap['Class'] !== undefined ? parseInt(vals[headerMap['Class']], 10) : undefined;
      parsedRows.push({
        ...rowObj,
        xgb_probability: pred.fraud_probability,
        anomaly_score: pred.anomaly_score,
        risk_level: pred.risk_level,
        action: pred.recommended_action,
        explanation: pred.explanation,
        Class: isNaN(classVal as number) ? undefined : classVal
      });
    }

    setDataset('Benchmark Sample (14 Curated Records)', parsedRows);
  };

  // Metrics computation from active dataset
  const totalCount = rows.length;
  const hasData = totalCount > 0;
  
  const fraudCases = rows.filter(r => r.Class === 1 || r.xgb_probability >= policy.highThreshold).length;
  const blockedCount = rows.filter(r => r.action === 'BLOCK').length;
  const reviewCount = rows.filter(r => r.action === 'REVIEW').length;
  const approvedCount = rows.filter(r => r.action === 'APPROVE').length;

  const lowRiskCount = rows.filter(r => r.risk_level === 'LOW').length;
  const medRiskCount = rows.filter(r => r.risk_level === 'MEDIUM').length;
  const highRiskCount = rows.filter(r => r.risk_level === 'HIGH').length;
  const critRiskCount = rows.filter(r => r.risk_level === 'CRITICAL').length;

  // Histogram calculation from uploaded dataset (20 equal probability bins)
  const legitBins = Array(20).fill(0);
  const fraudBins = Array(20).fill(0);

  if (hasData) {
    rows.forEach(r => {
      const binIdx = Math.min(19, Math.max(0, Math.floor(r.xgb_probability * 20)));
      const isFraud = r.Class === 1 || r.xgb_probability >= policy.highThreshold;
      if (isFraud) {
        fraudBins[binIdx]++;
      } else {
        legitBins[binIdx]++;
      }
    });
  }

  const maxBinCount = Math.max(1, ...legitBins, ...fraudBins);

  return (
    <div className="space-y-6">
      {/* 5 Top KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. Total Transactions */}
        <div className="bg-slate-900/90 border border-slate-800/90 hover:border-blue-500/40 rounded-2xl p-4 transition-all duration-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">Total Transactions</div>
              <div className="text-2xl font-bold text-white tracking-tight mt-0.5 font-mono">
                {hasData ? totalCount.toLocaleString() : '0'}
              </div>
              <div className="text-[10px] text-blue-400 font-medium mt-0.5 truncate max-w-[120px]">
                {hasData ? datasetName || 'Active Session' : 'No dataset yet'}
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
        </div>

        {/* 2. Fraud Cases */}
        <div className="bg-slate-900/90 border border-slate-800/90 hover:border-red-500/40 rounded-2xl p-4 transition-all duration-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">Fraud Cases</div>
              <div className="text-2xl font-bold text-white tracking-tight mt-0.5 font-mono">
                {hasData ? fraudCases.toLocaleString() : '0'}
              </div>
              <div className="text-[10px] text-red-400 font-medium mt-0.5">
                {hasData && totalCount > 0 ? `${((fraudCases / totalCount) * 100).toFixed(1)}% of total` : '0.0% of total'}
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
        </div>

        {/* 3. Blocked */}
        <div className="bg-slate-900/90 border border-slate-800/90 hover:border-rose-500/40 rounded-2xl p-4 transition-all duration-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">Blocked</div>
              <div className="text-2xl font-bold text-white tracking-tight mt-0.5 font-mono">
                {hasData ? blockedCount.toLocaleString() : '0'}
              </div>
              <div className="text-[10px] text-rose-400 font-medium mt-0.5">
                {hasData && fraudCases > 0 ? `${((blockedCount / Math.max(1, fraudCases)) * 100).toFixed(1)}% of frauds` : '(0.0%)'}
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
        </div>

        {/* 4. Under Review */}
        <div className="bg-slate-900/90 border border-slate-800/90 hover:border-amber-500/40 rounded-2xl p-4 transition-all duration-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">Under Review</div>
              <div className="text-2xl font-bold text-white tracking-tight mt-0.5 font-mono">
                {hasData ? reviewCount.toLocaleString() : '0'}
              </div>
              <div className="text-[10px] text-amber-400 font-medium mt-0.5">
                {hasData && totalCount > 0 ? `${((reviewCount / totalCount) * 100).toFixed(1)}% queue` : '(0.0%)'}
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
        </div>

        {/* 5. Approved */}
        <div className="bg-slate-900/90 border border-slate-800/90 hover:border-emerald-500/40 rounded-2xl p-4 transition-all duration-200 shadow-sm relative overflow-hidden group col-span-2 sm:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">Approved</div>
              <div className="text-2xl font-bold text-white tracking-tight mt-0.5 font-mono">
                {hasData ? approvedCount.toLocaleString() : '0'}
              </div>
              <div className="text-[10px] text-emerald-400 font-medium mt-0.5">
                {hasData && totalCount > 0 ? `${((approvedCount / totalCount) * 100).toFixed(1)}% legit` : '(0.0%)'}
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
        </div>
      </div>

      {/* When NO dataset is uploaded yet: Show clear Onboarding Actions Banner */}
      {!hasData && (
        <div className="bg-gradient-to-r from-blue-950/40 via-slate-900/90 to-purple-950/40 border border-blue-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ready for Data Ingestion & Analysis</span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                No dataset uploaded yet
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Upload your transactions CSV file to begin live machine learning scoring, automated fraud alert generation, and custom data visualizations.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={() => onNavigateTab('batch')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-lg shadow-blue-600/30"
              >
                <Upload className="w-4 h-4" />
                <span>Upload CSV Dataset</span>
              </button>

              <button
                onClick={handleLoadSampleDataset}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition border border-slate-700"
              >
                <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                <span>Load Sample Benchmark Data</span>
              </button>

              <button
                onClick={() => onNavigateTab('investigate')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition border border-slate-700"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>Score Single Transaction</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3 Column: Charts & Recent Transactions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top Charts Grid (Distribution + Donut) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Chart 1: Transaction Risk Score Distribution (Histogram) */}
            <div className="md:col-span-7 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Transaction Risk Score Distribution</h3>
                  <p className="text-[11px] text-slate-400">
                    {hasData ? `Generated from ${totalCount.toLocaleString()} analyzed transactions` : 'Awaiting dataset upload'}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-slate-300">Legitimate</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-slate-300">Fraud</span>
                  </div>
                </div>
              </div>

              {/* Histogram Plot */}
              {hasData ? (
                <div className="relative h-48 w-full pt-4 flex flex-col justify-end">
                  {/* Dashed Threshold Line */}
                  <div className="absolute top-2 bottom-6 left-[80%] border-l border-dashed border-slate-400 z-10">
                    <span className="absolute -top-3.5 -left-12 text-[10px] font-mono text-slate-300 bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700">
                      Threshold: {policy.highThreshold.toFixed(2)}
                    </span>
                  </div>

                  {/* Bars Area */}
                  <div className="flex-1 flex items-end justify-between gap-1 relative z-0">
                    {legitBins.map((legitCount, idx) => {
                      const fraudCount = fraudBins[idx] || 0;
                      const legitHeight = (legitCount / maxBinCount) * 100;
                      const fraudHeight = (fraudCount / maxBinCount) * 100;

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                          <div className="opacity-0 group-hover:opacity-100 transition absolute -top-8 bg-slate-950 text-white text-[10px] px-2 py-1 rounded shadow-lg border border-slate-700 pointer-events-none z-20 whitespace-nowrap">
                            Bin: {(idx * 0.05).toFixed(2)} - {((idx + 1) * 0.05).toFixed(2)} | Legit: {legitCount}, Fraud: {fraudCount}
                          </div>

                          {fraudHeight > 0 && (
                            <div
                              style={{ height: `${Math.max(4, fraudHeight)}%` }}
                              className="w-full bg-red-500 rounded-t-sm transition-all duration-300"
                            />
                          )}
                          {legitHeight > 0 && (
                            <div
                              style={{ height: `${Math.max(4, legitHeight)}%` }}
                              className="w-full bg-blue-500 rounded-t-sm transition-all duration-300"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Y Axis Labels */}
                  <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[9px] font-mono text-slate-500 pointer-events-none">
                    <span>{maxBinCount}</span>
                    <span>{Math.round(maxBinCount * 0.75)}</span>
                    <span>{Math.round(maxBinCount * 0.5)}</span>
                    <span>{Math.round(maxBinCount * 0.25)}</span>
                    <span>0</span>
                  </div>

                  {/* X Axis Labels */}
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2 border-t border-slate-800 pt-1.5 px-2">
                    <span>0.0</span>
                    <span>0.2</span>
                    <span>0.4</span>
                    <span>0.6</span>
                    <span>0.8</span>
                    <span>1.0</span>
                  </div>
                </div>
              ) : (
                <div className="h-48 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs">
                  <FileSpreadsheet className="w-8 h-8 text-slate-600 mb-2" />
                  <p>No transactions available to plot</p>
                  <button
                    onClick={() => onNavigateTab('batch')}
                    className="mt-2 text-blue-400 hover:text-blue-300 underline text-xs"
                  >
                    Upload CSV to generate risk curve
                  </button>
                </div>
              )}
            </div>

            {/* Chart 2: Risk Level Breakdown (Donut) */}
            <div className="md:col-span-5 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Risk Level Breakdown</h3>
                <p className="text-[11px] text-slate-400">
                  {hasData ? 'Tiers mapped to policy actions' : 'Awaiting data'}
                </p>
              </div>

              {hasData ? (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                  <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="38" fill="none" stroke="#1e293b" strokeWidth="12" />
                      {/* Low Risk Segment */}
                      {lowRiskCount > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="12"
                          strokeDasharray={`${(lowRiskCount / totalCount) * 238} 238`}
                          strokeDashoffset="0"
                        />
                      )}
                      {/* Medium Risk Segment */}
                      {medRiskCount > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="12"
                          strokeDasharray={`${(medRiskCount / totalCount) * 238} 238`}
                          strokeDashoffset={`-${(lowRiskCount / totalCount) * 238}`}
                        />
                      )}
                      {/* High Risk Segment */}
                      {highRiskCount > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#f97316"
                          strokeWidth="12"
                          strokeDasharray={`${(highRiskCount / totalCount) * 238} 238`}
                          strokeDashoffset={`-${((lowRiskCount + medRiskCount) / totalCount) * 238}`}
                        />
                      )}
                      {/* Critical Risk Segment */}
                      {critRiskCount > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="12"
                          strokeDasharray={`${(critRiskCount / totalCount) * 238} 238`}
                          strokeDashoffset={`-${((lowRiskCount + medRiskCount + highRiskCount) / totalCount) * 238}`}
                        />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-base font-bold text-white font-mono leading-tight">{totalCount.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400">Transactions</span>
                    </div>
                  </div>

                  {/* Legend Items */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-slate-300">Low Risk</span>
                      <span className="font-mono text-white font-medium ml-auto">
                        {lowRiskCount} ({totalCount > 0 ? ((lowRiskCount / totalCount) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-slate-300">Medium Risk</span>
                      <span className="font-mono text-white font-medium ml-auto">
                        {medRiskCount} ({totalCount > 0 ? ((medRiskCount / totalCount) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      <span className="text-slate-300">High Risk</span>
                      <span className="font-mono text-white font-medium ml-auto">
                        {highRiskCount} ({totalCount > 0 ? ((highRiskCount / totalCount) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span className="text-slate-300">Critical</span>
                      <span className="font-mono text-white font-medium ml-auto">
                        {critRiskCount} ({totalCount > 0 ? ((critRiskCount / totalCount) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-48 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs">
                  <Clock className="w-8 h-8 text-slate-600 mb-2" />
                  <p>Awaiting risk tier breakdown</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Transactions Table */}
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Recent Transactions</h3>
                <p className="text-[11px] text-slate-400">
                  {hasData ? `Showing first ${Math.min(5, rows.length)} records from ${datasetName || 'current session'}` : 'No transactions recorded yet'}
                </p>
              </div>
              {hasData && (
                <button
                  onClick={() => onNavigateTab('batch')}
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition"
                >
                  <span>View All ({rows.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {hasData ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] text-slate-400 uppercase font-mono border-b border-slate-800 pb-2">
                    <tr>
                      <th className="pb-2 font-semibold">ID</th>
                      <th className="pb-2 font-semibold">TIME (SEC)</th>
                      <th className="pb-2 font-semibold">AMOUNT (USD)</th>
                      <th className="pb-2 font-semibold">P(FRAUD)</th>
                      <th className="pb-2 font-semibold">ANOMALY</th>
                      <th className="pb-2 font-semibold">RISK LEVEL</th>
                      <th className="pb-2 font-semibold">ACTION</th>
                      <th className="pb-2 font-semibold">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {rows.slice(0, 5).map((tx, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 font-mono text-slate-300 font-medium">S-{(1001 + idx).toString()}</td>
                        <td className="py-2.5 font-mono text-slate-400">{tx.Time}</td>
                        <td className="py-2.5 font-mono text-white font-medium">${tx.Amount.toFixed(2)}</td>
                        <td className="py-2.5 font-mono">
                          <span className={tx.xgb_probability >= 0.8 ? 'text-red-400 font-bold' : tx.xgb_probability >= 0.6 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                            {tx.xgb_probability.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2.5 font-mono text-slate-400">{tx.anomaly_score.toFixed(3)}</td>
                        <td className="py-2.5">
                          <span className={`text-[10px] font-bold ${
                            tx.risk_level === 'CRITICAL' ? 'text-red-400' :
                            tx.risk_level === 'HIGH' ? 'text-orange-400' :
                            tx.risk_level === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {tx.risk_level}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.action === 'BLOCK' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            tx.action === 'REVIEW' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {tx.action}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                            <span className={`w-1.5 h-1.5 rounded-full ${tx.action === 'REVIEW' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                            {tx.action === 'REVIEW' ? 'Under Review' : 'Completed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl space-y-2">
                <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                <p>No recent transaction rows available</p>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => onNavigateTab('batch')}
                    className="text-blue-400 hover:text-blue-300 underline font-medium"
                  >
                    Upload CSV file
                  </button>
                  <span>or</span>
                  <button
                    onClick={handleLoadSampleDataset}
                    className="text-cyan-400 hover:text-cyan-300 underline font-medium"
                  >
                    Load sample dataset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1/3 Column: Model Status, Risk Policy & Live Stream */}
        <div className="space-y-6">
          {/* Card 1: Model Status */}
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Model Status</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                VALIDATED
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">XGBoost</div>
                    <div className="text-[10px] text-slate-400">Primary Fraud Model</div>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-xs font-bold text-emerald-400">0.8473</div>
                  <div className="text-[9px] text-slate-500">OOF PR-AUC</div>
                </div>
                <div className="text-right font-mono border-l border-slate-800 pl-2">
                  <div className="text-xs font-bold text-blue-400">0.9801</div>
                  <div className="text-[9px] text-slate-500">OOF ROC-AUC</div>
                </div>
              </div>

              <div className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Isolation Forest</div>
                    <div className="text-[10px] text-slate-400">Secondary Anomaly Signal</div>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-xs font-bold text-purple-400">—</div>
                  <div className="text-[9px] text-slate-500">Top 2% Cutoff (+0.037)</div>
                </div>
              </div>

              {/* Dedicated Benchmark Values Bar / Column */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-blue-950/50 via-slate-950/80 to-indigo-950/50 border border-blue-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-blue-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="font-bold tracking-wide uppercase text-[11px]">Benchmark Values</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    5-Fold OOF Validation
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-sans">Accuracy</div>
                      <div className="text-sm font-bold text-emerald-400">99.95%</div>
                    </div>
                    <span className="text-[9px] text-slate-500 font-sans">Balanced</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-sans">Precision</div>
                      <div className="text-sm font-bold text-cyan-400">90.88%</div>
                    </div>
                    <span className="text-[9px] text-slate-500 font-sans">@ t=0.80</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-1">
                  <span>PR-AUC: <span className="text-emerald-400 font-bold">0.8473</span></span>
                  <span>ROC-AUC: <span className="text-blue-400 font-bold">0.9801</span></span>
                  <span>Recall: <span className="text-purple-400 font-bold">81.10%</span></span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Risk Decision is driven by XGBoost fraud probability. Isolation Forest provides secondary anomaly context for investigation and review.
            </p>
          </div>

          {/* Card 2: Risk Policy */}
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-white">
              Risk Policy <span className="text-xs font-normal text-slate-400">(XGBoost Fraud Probability)</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/40">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="font-mono text-slate-300">&ge; {policy.criticalThreshold.toFixed(2)}</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                  CRITICAL
                </span>
                <span className="text-slate-500">&rarr;</span>
                <span className="text-red-400 font-bold">BLOCK</span>
                <span className="text-[11px] text-slate-400">(Very high risk)</span>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/40">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="font-mono text-slate-300">&ge; {policy.highThreshold.toFixed(2)}</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  HIGH
                </span>
                <span className="text-slate-500">&rarr;</span>
                <span className="text-orange-400 font-bold">BLOCK</span>
                <span className="text-[11px] text-slate-400">(High risk)</span>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/40">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="font-mono text-slate-300">&ge; {policy.mediumThreshold.toFixed(2)}</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  MEDIUM
                </span>
                <span className="text-slate-500">&rarr;</span>
                <span className="text-amber-400 font-bold">REVIEW</span>
                <span className="text-[11px] text-slate-400">(Requires review)</span>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/40">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-mono text-slate-300">&lt; {policy.mediumThreshold.toFixed(2)}</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LOW
                </span>
                <span className="text-slate-500">&rarr;</span>
                <span className="text-emerald-400 font-bold">APPROVE</span>
                <span className="text-[11px] text-slate-400">(Low risk)</span>
              </div>
            </div>
          </div>

          {/* Card 3: Live Transaction Stream */}
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Live Transaction Stream
              </h3>
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition ${
                  hasData
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${hasData ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                  {hasData ? 'ACTIVE' : 'IDLE'}
                </span>
              </div>
            </div>

            {hasData ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="text-[9px] text-slate-400 uppercase font-mono border-b border-slate-800">
                    <tr>
                      <th className="pb-1.5">TIME</th>
                      <th className="pb-1.5">AMOUNT</th>
                      <th className="pb-1.5">P(FRAUD)</th>
                      <th className="pb-1.5">RISK</th>
                      <th className="pb-1.5">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 font-mono">
                    {rows.slice(0, 4).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-850/50 transition">
                        <td className="py-2 text-slate-400">T+{row.Time}s</td>
                        <td className="py-2 text-white font-medium">${row.Amount.toFixed(2)}</td>
                        <td className="py-2">
                          <span className={row.xgb_probability >= 0.8 ? 'text-red-400 font-bold' : row.xgb_probability >= 0.6 ? 'text-amber-400' : 'text-emerald-400'}>
                            {row.xgb_probability.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2">
                          <span className={`text-[10px] font-bold ${
                            row.risk_level === 'CRITICAL' ? 'text-red-400' :
                            row.risk_level === 'HIGH' ? 'text-orange-400' :
                            row.risk_level === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {row.risk_level}
                          </span>
                        </td>
                        <td className="py-2">
                          <span className={`font-bold ${
                            row.action === 'BLOCK' ? 'text-red-400' :
                            row.action === 'REVIEW' ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {row.action}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                <Clock className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                <p>Awaiting transaction stream</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Sample CSV File for Testing + Dataset Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Sample CSV Preview (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Sample CSV File for Testing
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Download or load the calibrated test template with legitimate, borderline review, and block transactions.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleLoadSampleDataset}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs transition border border-cyan-800/60"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Score This Dataset</span>
              </button>

              <button
                onClick={handleDownloadSampleCsv}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-blue-600/20"
              >
                {downloadSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Downloaded!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download CSV</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Table Preview */}
          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/70">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Amount</th>
                  <th className="py-2 px-3">V1</th>
                  <th className="py-2 px-3">V2</th>
                  <th className="py-2 px-3">V3</th>
                  <th className="py-2 px-3">V4</th>
                  <th className="py-2 px-3">V5</th>
                  <th className="py-2 px-3">V6</th>
                  <th className="py-2 px-3">V7</th>
                  <th className="py-2 px-3">V8</th>
                  <th className="py-2 px-3">&hellip;</th>
                  <th className="py-2 px-3">V28</th>
                  <th className="py-2 px-3 font-bold">Class</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-mono text-[11px] text-slate-300">
                <tr>
                  <td className="py-2 px-3 text-slate-500">0</td>
                  <td className="py-2 px-3">406</td>
                  <td className="py-2 px-3 font-medium text-white">14.50</td>
                  <td className="py-2 px-3">-0.9200</td>
                  <td className="py-2 px-3">0.1800</td>
                  <td className="py-2 px-3">1.5500</td>
                  <td className="py-2 px-3">-0.2200</td>
                  <td className="py-2 px-3">0.3800</td>
                  <td className="py-2 px-3">-0.1500</td>
                  <td className="py-2 px-3">0.4200</td>
                  <td className="py-2 px-3">0.1200</td>
                  <td className="py-2 px-3 text-slate-600">&hellip;</td>
                  <td className="py-2 px-3">0.0100</td>
                  <td className="py-2 px-3 text-emerald-400 font-bold">0</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-500">1</td>
                  <td className="py-2 px-3">1240</td>
                  <td className="py-2 px-3 font-medium text-white">4.85</td>
                  <td className="py-2 px-3">0.1500</td>
                  <td className="py-2 px-3">-0.0500</td>
                  <td className="py-2 px-3">0.8500</td>
                  <td className="py-2 px-3">-0.1000</td>
                  <td className="py-2 px-3">0.2000</td>
                  <td className="py-2 px-3">-0.0800</td>
                  <td className="py-2 px-3">0.1800</td>
                  <td className="py-2 px-3">0.0400</td>
                  <td className="py-2 px-3 text-slate-600">&hellip;</td>
                  <td className="py-2 px-3">0.0100</td>
                  <td className="py-2 px-3 text-emerald-400 font-bold">0</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-500">2</td>
                  <td className="py-2 px-3">52140</td>
                  <td className="py-2 px-3 font-medium text-white">145.00</td>
                  <td className="py-2 px-3">-0.8500</td>
                  <td className="py-2 px-3">0.4200</td>
                  <td className="py-2 px-3">-0.6500</td>
                  <td className="py-2 px-3">0.8000</td>
                  <td className="py-2 px-3">-0.3500</td>
                  <td className="py-2 px-3">-0.2200</td>
                  <td className="py-2 px-3">-0.4500</td>
                  <td className="py-2 px-3">0.1800</td>
                  <td className="py-2 px-3 text-slate-600">&hellip;</td>
                  <td className="py-2 px-3">-0.0200</td>
                  <td className="py-2 px-3 text-amber-400 font-bold">0</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-500">3</td>
                  <td className="py-2 px-3">71200</td>
                  <td className="py-2 px-3 font-medium text-white">99.99</td>
                  <td className="py-2 px-3">-1.8500</td>
                  <td className="py-2 px-3">1.2500</td>
                  <td className="py-2 px-3">-2.1500</td>
                  <td className="py-2 px-3">1.0000</td>
                  <td className="py-2 px-3">-1.4500</td>
                  <td className="py-2 px-3">-0.8500</td>
                  <td className="py-2 px-3">-1.9500</td>
                  <td className="py-2 px-3">0.8500</td>
                  <td className="py-2 px-3 text-slate-600">&hellip;</td>
                  <td className="py-2 px-3">0.0800</td>
                  <td className="py-2 px-3 text-red-400 font-bold">1</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-500">4</td>
                  <td className="py-2 px-3">94250</td>
                  <td className="py-2 px-3 font-medium text-white">180.50</td>
                  <td className="py-2 px-3">-6.2500</td>
                  <td className="py-2 px-3">4.8500</td>
                  <td className="py-2 px-3">-7.2300</td>
                  <td className="py-2 px-3">4.9500</td>
                  <td className="py-2 px-3">-5.1500</td>
                  <td className="py-2 px-3">-2.3500</td>
                  <td className="py-2 px-3">-6.8500</td>
                  <td className="py-2 px-3">3.1500</td>
                  <td className="py-2 px-3 text-slate-600">&hellip;</td>
                  <td className="py-2 px-3">0.3500</td>
                  <td className="py-2 px-3 text-red-400 font-bold">1</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Sample Dataset Summary (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            Active Session Summary
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                Scored Transactions
              </span>
              <span className="font-mono font-bold text-white">{totalCount.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400 flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                Flagged Fraud & Blocked
              </span>
              <span className="font-mono font-bold text-red-400">
                {blockedCount} ({totalCount > 0 ? ((blockedCount / totalCount) * 100).toFixed(1) : 0}%)
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Approved Legitimate
              </span>
              <span className="font-mono font-bold text-emerald-400">
                {approvedCount} ({totalCount > 0 ? ((approvedCount / totalCount) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          </div>

          <div className="pt-1 space-y-2">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
              File Requirements
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1 pl-4 list-disc marker:text-blue-500">
              <li>Columns: <span className="font-mono text-slate-300">Time, Amount, V1, V2, ..., V28</span></li>
              <li>Optional Ground Truth: <span className="font-mono text-slate-300">Class (0 or 1)</span></li>
              <li>Encoding: <span className="font-mono text-slate-300">UTF-8 CSV (Comma, Semicolon, Tab)</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
