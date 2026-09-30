import React, { useState } from 'react';
import { useDataContext } from '../context/DataContext';
import {
  Database,
  FileSpreadsheet,
  Clock,
  Search,
  Trash2,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Ban,
  Check,
  Download,
  PlusCircle,
  FileText,
  Filter
} from 'lucide-react';
import { CsvHistoryEntry } from '../types';
import { generateSampleCsvContent } from '../lib/demoData';
import { predictTransaction } from '../lib/xgboost';
import { TransactionDetailModal } from './TransactionDetailModal';

export const AdminHistoryTab: React.FC = () => {
  const { csvHistory, loadHistoryEntry, deleteHistoryEntry, setDataset, datasetName, policy } = useDataContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<CsvHistoryEntry | null>(null);
  const [restoredId, setRestoredId] = useState<string | null>(null);

  const filteredHistory = csvHistory.filter(entry =>
    entry.datasetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.timestamp.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRestore = (entry: CsvHistoryEntry) => {
    loadHistoryEntry(entry.id);
    setRestoredId(entry.id);
    setTimeout(() => setRestoredId(null), 2500);
  };

  const handleDownloadReport = (entry: CsvHistoryEntry) => {
    const csvHeader = 'Time,Amount,XGB_Fraud_Prob,Anomaly_Score,Risk_Level,Recommended_Action,Explanation\n';
    const csvRows = entry.rows.map(r =>
      `${r.Time},${r.Amount},${r.xgb_probability.toFixed(4)},${r.anomaly_score.toFixed(4)},${r.risk_level},${r.action},"${(r.explanation || '').replace(/"/g, '""')}"`
    ).join('\n');

    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${entry.id}_${entry.datasetName.replace(/\s+/g, '_')}_analysis.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSeedDemoData = () => {
    const csvText = generateSampleCsvContent();
    const lines = csvText.trim().split(/\r\n|\n/).filter(l => l.trim().length > 0);
    const headerLine = lines[0];
    const rawHeaders = headerLine.split(',').map(h => h.trim());
    const headerMap: Record<string, number> = {};
    rawHeaders.forEach((h, idx) => {
      headerMap[h] = idx;
    });

    const parsedRows: any[] = [];
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

    setDataset('Benchmark Run #' + (csvHistory.length + 1), parsedRows);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0e1628] border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
            <Database className="w-4 h-4 text-blue-400" />
            <span>Admin Persistent Database</span>
            <span aria-hidden="true">&bull;</span>
            <span className="text-slate-400 font-mono">ENCRYPTED AUDIT LOGS</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight mt-1">
            CSV Batch Analysis History Database
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Central repository storing past CSV batch runs, model risk scores, and compliance audit snapshots. Re-load any historical analysis session into active memory with one click.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleSeedDemoData}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-sm flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record New Analysis Batch</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0e1628] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search batch ID, filename, or date..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
          <span>Total Database Records: <strong className="text-white font-mono">{csvHistory.length}</strong></span>
        </div>
      </div>

      {/* Database History Table */}
      {filteredHistory.length > 0 ? (
        <div className="bg-[#0e1628] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Batch ID</th>
                  <th className="py-3 px-4 font-semibold">Dataset Name</th>
                  <th className="py-3 px-4 font-semibold">Ingested Timestamp</th>
                  <th className="py-3 px-4 font-semibold text-right">Total TX</th>
                  <th className="py-3 px-4 font-semibold text-right">Frauds Flagged</th>
                  <th className="py-3 px-4 font-semibold text-right">Blocked</th>
                  <th className="py-3 px-4 font-semibold text-right">Review Queue</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-200">
                {filteredHistory.map(entry => {
                  const isActive = datasetName === entry.datasetName;
                  const isJustRestored = restoredId === entry.id;

                  return (
                    <tr key={entry.id} className="hover:bg-slate-900/60 transition group">
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">
                        {entry.id}
                      </td>
                      <td className="py-3 px-4 font-medium text-white flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="truncate max-w-[180px]" title={entry.datasetName}>
                          {entry.datasetName}
                        </span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[9px] font-bold border border-emerald-800 font-mono">
                            ACTIVE IN MEMORY
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{entry.timestamp}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-right text-white font-bold">
                        {entry.totalCount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-right">
                        <span className="text-red-400 font-bold">
                          {entry.fraudCount}
                        </span>
                        <span className="text-slate-500 text-[10px] ml-1">
                          ({((entry.fraudCount / Math.max(1, entry.totalCount)) * 100).toFixed(1)}%)
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-right text-rose-400 font-semibold">
                        {entry.blockedCount}
                      </td>
                      <td className="py-3 px-4 font-mono text-right text-amber-400 font-semibold">
                        {entry.reviewCount}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 text-[10px] font-mono border border-slate-800">
                          PERSISTED
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleRestore(entry)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                              isJustRestored
                                ? 'bg-emerald-600 text-white'
                                : isActive
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            }`}
                            title="Load this past CSV analysis batch into active workspace"
                          >
                            {isJustRestored ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Loaded!</span>
                              </>
                            ) : (
                              <>
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>{isActive ? 'Active' : 'Load Batch'}</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleDownloadReport(entry)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
                            title="Export analysis CSV report"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => deleteHistoryEntry(entry.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition border border-slate-700 hover:border-rose-800"
                            title="Delete this history database record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-[#0e1628] border border-slate-800 rounded-2xl p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto">
            <Database className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-white">No Saved CSV Analysis Runs in Database</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When you upload or analyze CSV transaction batches, Admin history records are automatically persisted here for long-term audit trail and quick re-loading.
            </p>
          </div>
          <button
            onClick={handleSeedDemoData}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Seed Sample Analysis Batch to Database</span>
          </button>
        </div>
      )}
    </div>
  );
};
