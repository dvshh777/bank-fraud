import React, { useState, useMemo } from 'react';
import { useDataContext } from '../context/DataContext';
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  Search,
  CheckCircle2,
  Ban,
  Eye,
  FileText,
  UserCheck,
  Lock,
  Database,
  FileSpreadsheet,
  Download,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  RefreshCw
} from 'lucide-react';
import { TransactionDetailModal } from './TransactionDetailModal';
import { BatchResultRow, CsvHistoryEntry } from '../types';

export const EmployeePortalTab: React.FC = () => {
  const {
    rows,
    alerts,
    datasetName,
    userSession,
    csvHistory,
    loadHistoryEntry,
    policy
  } = useDataContext();

  const [activeQueue, setActiveQueue] = useState<'approved' | 'review' | 'flagged' | 'all'>('approved');
  const [searchQuery, setSearchQuery] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [selectedDetailRow, setSelectedDetailRow] = useState<BatchResultRow | null>(null);
  const [restoredId, setRestoredId] = useState<string | null>(null);

  // Map all dataset rows into unified items with Auto-Approved classification
  const allMappedItems = useMemo(() => {
    if (rows.length > 0) {
      return rows.map((row, idx) => {
        const txId = `TX-${row.Time}`;
        const alertId = `ALT-${1000 + idx}`;
        const prob = row.xgb_probability;
        const risk: string = row.risk_level || (prob >= policy.criticalThreshold ? 'CRITICAL' : prob >= policy.highThreshold ? 'HIGH' : prob >= policy.mediumThreshold ? 'MEDIUM' : 'LOW');
        
        const isAutoApproved = row.action === 'APPROVE' || risk === 'LOW' || prob < policy.mediumThreshold;
        const isBlocked = row.action === 'BLOCK' || risk === 'CRITICAL';

        const status = isAutoApproved ? 'AUTO-APPROVED' : isBlocked ? 'BLOCKED' : 'IN REVIEW';
        const reason = row.explanation || (isAutoApproved ? 'Passed low risk automated policy threshold' : 'Triggered elevated risk score');

        return {
          id: alertId,
          txId,
          timeSec: row.Time,
          amount: row.Amount,
          prob,
          risk,
          status,
          reasons: [reason],
          rawRow: row,
          isAutoApproved
        };
      });
    }

    return alerts.map(ticket => ({
      id: ticket.id,
      txId: ticket.txId,
      timeSec: ticket.timeSec,
      amount: ticket.amount,
      prob: ticket.prob,
      risk: ticket.risk,
      status: ticket.status === 'APPROVED' ? 'AUTO-APPROVED' : ticket.status === 'BLOCKED' ? 'BLOCKED' : 'IN REVIEW',
      reasons: ticket.reasons,
      rawRow: ticket.rawRow,
      isAutoApproved: ticket.status === 'APPROVED' || (ticket.risk as string) === 'LOW'
    }));
  }, [rows, alerts, policy]);

  const autoApprovedList = useMemo(() => {
    return allMappedItems.filter(item => item.isAutoApproved || item.status === 'AUTO-APPROVED' || item.status === 'APPROVED');
  }, [allMappedItems]);

  const inReviewList = useMemo(() => {
    return allMappedItems.filter(item => item.status === 'IN REVIEW' || item.status === 'PENDING');
  }, [allMappedItems]);

  const flaggedBlockedList = useMemo(() => {
    return allMappedItems.filter(item => item.status === 'BLOCKED' || item.risk === 'CRITICAL' || item.risk === 'HIGH');
  }, [allMappedItems]);

  const currentList =
    activeQueue === 'approved'
      ? autoApprovedList
      : activeQueue === 'review'
      ? inReviewList
      : activeQueue === 'flagged'
      ? flaggedBlockedList
      : allMappedItems;

  const filteredList = currentList.filter(ticket =>
    ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.txId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.amount.toString().includes(searchQuery) ||
    ticket.risk.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (datasetName && datasetName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    ticket.reasons.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter CSV History Database
  const filteredHistory = csvHistory.filter(entry =>
    entry.datasetName.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
    entry.id.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
    entry.timestamp.toLowerCase().includes(historySearchQuery.toLowerCase())
  );

  const handleLoadHistory = (entry: CsvHistoryEntry) => {
    loadHistoryEntry(entry.id);
    setRestoredId(entry.id);
    setTimeout(() => setRestoredId(null), 2500);
  };

  const handleDownloadHistoryReport = (entry: CsvHistoryEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const csvHeader = 'Time,Amount,XGB_Fraud_Prob,Anomaly_Score,Risk_Level,Recommended_Action,Explanation\n';
    const csvRows = entry.rows.map(r =>
      `${r.Time},${r.Amount},${r.xgb_probability.toFixed(4)},${r.anomaly_score.toFixed(4)},${r.risk_level},${r.action},"${(r.explanation || '').replace(/"/g, '""')}"`
    ).join('\n');

    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${entry.id}_${entry.datasetName.replace(/\s+/g, '_')}_employee_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Employee Top Header Banner */}
      <div className="bg-[#0e1628] border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Employee Analyst Terminal</span>
            <span aria-hidden="true">&bull;</span>
            <span className="text-slate-400 font-mono">READ-ONLY AUDIT & INSPECTION ACCESS</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight mt-1">
            Transaction Risk & Batch Inspector
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Logged in as <strong className="text-white">{userSession.name}</strong> ({userSession.department}). Select any past Admin CSV analysis batch from the left panel to inspect auto-approved, in-review, and flagged transactions.
          </p>
        </div>

        {/* Read-Only Control Notice Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl px-3 py-2 text-amber-300 text-xs font-medium flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="font-bold text-[11px] uppercase tracking-wider">Review & Release Controls</div>
              <div className="text-[10px] text-amber-400/80">Restricted to Administrator</div>
            </div>
          </div>
        </div>
      </div>

      {/* TWO COLUMN SIDEBAR & MAIN INSPECTOR LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT SIDE PANEL: ADMIN CSV ANALYSIS HISTORY DATABASE */}
        <div className="lg:col-span-4 xl:col-span-4 bg-[#0e1628] border border-slate-800 rounded-2xl p-4 space-y-4 shadow-sm">
          {/* Side Panel Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-tight">
                  Admin CSV Analysis History
                </h3>
                <span className="text-[10px] text-blue-400 font-mono font-bold">
                  {csvHistory.length} Saved Batches
                </span>
              </div>
            </div>
          </div>

          {/* Search Box in Left Panel */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={historySearchQuery}
              onChange={e => setHistorySearchQuery(e.target.value)}
              placeholder="Search batch name..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Batch History List */}
          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {filteredHistory.length > 0 ? (
              filteredHistory.map(entry => {
                const isActive = datasetName === entry.datasetName;
                const isJustRestored = restoredId === entry.id;

                return (
                  <div
                    key={entry.id}
                    onClick={() => handleLoadHistory(entry)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer group relative ${
                      isActive
                        ? 'bg-blue-950/80 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-blue-400">
                            {entry.id}
                          </span>
                          {isActive && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <div className="font-semibold text-xs text-white truncate flex items-center gap-1.5" title={entry.datasetName}>
                          <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="truncate">{entry.datasetName}</span>
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{entry.timestamp}</span>
                        </div>
                      </div>

                      {/* Download Button */}
                      <button
                        onClick={e => handleDownloadHistoryReport(entry, e)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700 shrink-0"
                        title="Download Analysis Report CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Batch Stats Row */}
                    <div className="grid grid-cols-3 gap-1 mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-center">
                      <div className="bg-slate-950/50 p-1 rounded border border-slate-800/60">
                        <div className="text-slate-400 text-[9px]">TOTAL</div>
                        <div className="font-bold text-white">{entry.totalCount}</div>
                      </div>
                      <div className="bg-slate-950/50 p-1 rounded border border-slate-800/60">
                        <div className="text-red-400 text-[9px]">FRAUDS</div>
                        <div className="font-bold text-red-400">{entry.fraudCount}</div>
                      </div>
                      <div className="bg-slate-950/50 p-1 rounded border border-slate-800/60">
                        <div className="text-emerald-400 text-[9px]">CLEAN</div>
                        <div className="font-bold text-emerald-400">{entry.approvedCount}</div>
                      </div>
                    </div>

                    {/* Load Action Bar */}
                    <div className="mt-2 text-right">
                      <span className={`text-[10px] font-bold flex items-center justify-end gap-1 ${
                        isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                      }`}>
                        <span>{isActive ? 'Loaded in Inspector' : 'Click to Load Inspector'}</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center space-y-2 bg-slate-900/50 rounded-xl border border-slate-800">
                <Database className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-xs font-bold text-slate-300">No History Found</div>
                <div className="text-[11px] text-slate-500">
                  No Admin CSV analysis runs recorded yet.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT MAIN PANEL: ACTIVE BATCH TRANSACTION INSPECTOR */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-4">
          
          {/* Active Batch Header Banner */}
          <div className="bg-[#0e1628] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider">
                  Active Inspector Batch
                </div>
                <h3 className="text-sm font-bold text-white truncate max-w-sm">
                  {datasetName || 'Default Simulated Live Batch'}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
                Loaded Items: <strong className="text-white">{allMappedItems.length}</strong>
              </span>
            </div>
          </div>

          {/* Queue Filter Segmented Controls & Global Search Bar */}
          <div className="bg-[#0e1628] border border-slate-800 rounded-2xl p-4 space-y-4 shadow-sm">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
              {/* Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800 w-full lg:w-auto">
                <button
                  onClick={() => setActiveQueue('approved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                    activeQueue === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Auto-Approved ({autoApprovedList.length})</span>
                </button>

                <button
                  onClick={() => setActiveQueue('review')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                    activeQueue === 'review'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>In-Review ({inReviewList.length})</span>
                </button>

                <button
                  onClick={() => setActiveQueue('flagged')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                    activeQueue === 'flagged'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5 text-rose-400" />
                  <span>Flagged & Blocked ({flaggedBlockedList.length})</span>
                </button>

                <button
                  onClick={() => setActiveQueue('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                    activeQueue === 'all'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5 text-blue-400" />
                  <span>All ({allMappedItems.length})</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full lg:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search Alert ID, Tx ID, Amount..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Alert ID</th>
                    <th className="py-3 px-4 font-semibold">Tx ID & Time</th>
                    <th className="py-3 px-4 font-semibold text-right">Amount ($)</th>
                    <th className="py-3 px-4 font-semibold text-right">XGB Fraud %</th>
                    <th className="py-3 px-4 font-semibold">Risk Level</th>
                    <th className="py-3 px-4 font-semibold">Automated Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-200">
                  {filteredList.length > 0 ? (
                    filteredList.map(item => {
                      const isHighRisk = item.risk === 'CRITICAL' || item.risk === 'HIGH';
                      const isApproved = item.status === 'AUTO-APPROVED' || item.isAutoApproved;

                      return (
                        <tr key={item.id} className="hover:bg-slate-850/80 transition group">
                          <td className="py-3 px-4 font-mono font-bold text-blue-400">
                            {item.id}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            <div>{item.txId}</div>
                            <div className="text-[10px] text-slate-500">T + {item.timeSec}s</div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-right text-white">
                            ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-right">
                            <span
                              className={
                                item.prob >= policy.criticalThreshold
                                  ? 'text-red-400'
                                  : item.prob >= policy.highThreshold
                                  ? 'text-rose-400'
                                  : item.prob >= policy.mediumThreshold
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }
                            >
                              {(item.prob * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border ${
                                item.risk === 'CRITICAL'
                                  ? 'bg-red-950/80 text-red-400 border-red-800'
                                  : item.risk === 'HIGH'
                                  ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                                  : item.risk === 'MEDIUM'
                                  ? 'bg-amber-950/80 text-amber-400 border-amber-800'
                                  : 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                              }`}
                            >
                              {item.risk}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono border ${
                                isApproved
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                                  : item.status === 'BLOCKED'
                                  ? 'bg-rose-950/60 text-rose-400 border-rose-800/80'
                                  : 'bg-amber-950/60 text-amber-400 border-amber-800/80'
                              }`}
                            >
                              {isApproved ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              ) : item.status === 'BLOCKED' ? (
                                <Ban className="w-3 h-3 text-rose-400" />
                              ) : (
                                <Clock className="w-3 h-3 text-amber-400" />
                              )}
                              <span>{item.status}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedDetailRow(item.rawRow || null)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-[11px] font-semibold border border-slate-700 inline-flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3 text-blue-400" />
                              <span>Inspect Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No transactions found matching your current filter or search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Details Inspector Modal */}
      <TransactionDetailModal
        isOpen={!!selectedDetailRow}
        transaction={selectedDetailRow}
        onClose={() => setSelectedDetailRow(null)}
      />
    </div>
  );
};
