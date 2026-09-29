import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  Check,
  Search,
  ArrowRight,
  Filter,
  Sparkles,
  Zap,
  PhoneCall,
  ShieldCheck,
  Upload,
  CreditCard,
  UserCheck,
  X,
  Send,
  RefreshCw,
  FileCheck,
  History,
  Lock,
  Smartphone,
  Shield,
  FileText
} from 'lucide-react';
import { useDataContext, AlertTicket } from '../context/DataContext';

export const FraudAlertsTab: React.FC<{ onInvestigate: (txId: string) => void; onNavigateTab?: (tab: string) => void }> = ({
  onInvestigate,
  onNavigateTab
}) => {
  const { alerts, updateAlertStatus, datasetName, rows, auditLogs, addAuditLog } = useDataContext();
  const [activeSubTab, setActiveSubTab] = useState<'alerts' | 'review' | 'audit'>('alerts');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');

  // Modal states
  const [selectedAlertForBlock, setSelectedAlertForBlock] = useState<AlertTicket | null>(null);
  const [selectedAlertForOtp, setSelectedAlertForOtp] = useState<AlertTicket | null>(null);
  const [selectedAlertForRelease, setSelectedAlertForRelease] = useState<AlertTicket | null>(null);

  // Form states for Block Modal
  const [blockReason, setBlockReason] = useState<string>('Confirmed unauthorized charge');
  const [blockNotes, setBlockNotes] = useState<string>('');
  const [freezeAccount, setFreezeAccount] = useState<boolean>(true);
  const [blacklistMerchant, setBlacklistMerchant] = useState<boolean>(false);

  // Form states for Release Modal
  const [releaseReason, setReleaseReason] = useState<string>('Verified with customer by phone');
  const [releaseNotes, setReleaseNotes] = useState<string>('');
  const [whitelistMerchant, setWhitelistMerchant] = useState<boolean>(true);

  // Step-Up OTP State
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpTimer, setOtpTimer] = useState<number>(60);
  const [otpStatus, setOtpStatus] = useState<'IDLE' | 'SENT' | 'VERIFIED' | 'FAILED'>('SENT');
  const [enteredOtp, setEnteredOtp] = useState<string>('');

  // Review Queue Checklist State
  const [checklist, setChecklist] = useState<Record<string, { phone: boolean; device: boolean; velocity: boolean }>>({});

  useEffect(() => {
    if (selectedAlertForOtp) {
      // Generate random 6-digit OTP code
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      setOtpCode(newCode);
      setOtpTimer(60);
      setOtpStatus('SENT');
      setEnteredOtp('');
    }
  }, [selectedAlertForOtp]);

  // Timer countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (selectedAlertForOtp && otpStatus === 'SENT' && otpTimer > 0) {
      timer = setInterval(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [selectedAlertForOtp, otpStatus, otpTimer]);

  const handleExecuteBlock = () => {
    if (!selectedAlertForBlock) return;
    const notesSummary = `${blockReason}. ${blockNotes ? `Notes: ${blockNotes}` : ''}${freezeAccount ? ' [Account Frozen]' : ''}${blacklistMerchant ? ' [Merchant Blacklisted]' : ''}`;
    
    updateAlertStatus(selectedAlertForBlock.id, 'BLOCKED', {
      reason: notesSummary,
      actionType: 'BLOCKED'
    });
    setSelectedAlertForBlock(null);
    setBlockNotes('');
  };

  const handleExecuteRelease = () => {
    if (!selectedAlertForRelease) return;
    const notesSummary = `${releaseReason}. ${releaseNotes ? `Notes: ${releaseNotes}` : ''}${whitelistMerchant ? ' [Added to Whitelist]' : ''}`;

    updateAlertStatus(selectedAlertForRelease.id, 'APPROVED', {
      reason: notesSummary,
      actionType: 'APPROVED'
    });
    setSelectedAlertForRelease(null);
    setReleaseNotes('');
  };

  const handleSimulateOtpPass = () => {
    if (!selectedAlertForOtp) return;
    setOtpStatus('VERIFIED');
    setTimeout(() => {
      updateAlertStatus(selectedAlertForOtp.id, 'APPROVED', {
        reason: `Cardholder successfully passed 2FA Step-Up OTP challenge (Code: ${otpCode})`,
        actionType: 'STEP_UP_PASSED'
      });
      setSelectedAlertForOtp(null);
    }, 1200);
  };

  const handleSimulateOtpFail = () => {
    if (!selectedAlertForOtp) return;
    setOtpStatus('FAILED');
    setTimeout(() => {
      updateAlertStatus(selectedAlertForOtp.id, 'BLOCKED', {
        reason: `Cardholder failed 2FA Step-Up OTP / Denied transaction authorization`,
        actionType: 'STEP_UP_FAILED'
      });
      setSelectedAlertForOtp(null);
    }, 1200);
  };

  const handleResendOtp = () => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpCode(newCode);
    setOtpTimer(60);
    setOtpStatus('SENT');
  };

  const toggleChecklistItem = (alertId: string, item: 'phone' | 'device' | 'velocity') => {
    setChecklist(prev => {
      const current = prev[alertId] || { phone: false, device: false, velocity: false };
      return {
        ...prev,
        [alertId]: {
          ...current,
          [item]: !current[item]
        }
      };
    });
  };

  const filteredAlerts = alerts.filter(a => filterRisk === 'ALL' || a.risk === filterRisk);
  const reviewQueueAlerts = alerts.filter(a => a.risk === 'MEDIUM' || a.status === 'PENDING');
  const pendingCount = alerts.filter(a => a.status === 'PENDING').length;
  const hasRows = rows.length > 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Sub-Navigation */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              Fraud Alerts & Verification Engine
            </h2>
            {alerts.length > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                {pendingCount} Pending Action
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                0 Active Alerts
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {hasRows
              ? `Operational triage and compliance verification from ${datasetName || 'current session'}.`
              : 'Alert triage and manual verification engine. Populates automatically when suspicious transactions are detected.'}
          </p>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSubTab('alerts')}
            className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5 ${
              activeSubTab === 'alerts'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Alerts Queue ({alerts.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('review')}
            className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5 ${
              activeSubTab === 'review'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Review & Verify ({reviewQueueAlerts.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5 ${
              activeSubTab === 'audit'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5 text-purple-400" />
            <span>Audit Trail ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. FRAUD ALERTS QUEUE SUB-TAB                             */}
      {/* ========================================================= */}
      {activeSubTab === 'alerts' && (
        <div className="space-y-4">
          {/* Risk Level Filter */}
          {alerts.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Showing <span className="text-white font-bold">{filteredAlerts.length}</span> suspicious transaction items
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map(risk => (
                  <button
                    key={risk}
                    onClick={() => setFilterRisk(risk)}
                    className={`px-3 py-1 rounded-lg transition font-medium text-xs ${
                      filterRisk === risk
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {risk === 'ALL' ? 'All Tiers' : risk}
                  </button>
                ))}
              </div>
            </div>
          )}

          {alerts.length === 0 ? (
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-12 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-inner">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-bold text-white">No Fraud Alerts</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {hasRows
                    ? 'All analyzed transactions scored safely within acceptable bounds. No accounts currently require hold or operational review.'
                    : 'No dataset has been uploaded or analyzed yet. Upload a CSV file or score transactions to see fraud alerts pop up here.'}
                </p>
              </div>

              {!hasRows && onNavigateTab && (
                <div className="pt-2">
                  <button
                    onClick={() => onNavigateTab('batch')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-lg shadow-blue-600/20"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Dataset to Analyze</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`bg-slate-900/90 border rounded-2xl p-5 transition shadow-sm ${
                    alert.status === 'BLOCKED' ? 'border-red-900/60 bg-red-950/15' :
                    alert.status === 'APPROVED' ? 'border-emerald-900/60 bg-emerald-950/15' :
                    alert.status === 'STEP_UP' ? 'border-purple-900/60 bg-purple-950/15' :
                    alert.risk === 'CRITICAL' ? 'border-red-500/40 hover:border-red-500' :
                    alert.risk === 'HIGH' ? 'border-orange-500/40 hover:border-orange-500' :
                    'border-amber-500/40 hover:border-amber-500'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-xs font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded-md">
                          {alert.id}
                        </span>
                        <span className="font-mono text-xs text-blue-400 font-semibold">
                          {alert.txId}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          alert.risk === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          alert.risk === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                          'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {alert.risk} RISK
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {alert.timestamp}
                        </span>

                        {alert.status !== 'PENDING' && (
                          <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            alert.status === 'BLOCKED' ? 'bg-red-950 text-red-300 border border-red-800' :
                            alert.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                            'bg-purple-950 text-purple-300 border border-purple-800'
                          }`}>
                            Status: {alert.status} {alert.resolvedAt && `(${alert.resolvedAt})`}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 text-xs font-mono">
                        <div>
                          <div className="text-[10px] text-slate-500">AMOUNT</div>
                          <div className="text-sm font-bold text-white">${alert.amount.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">P(FRAUD)</div>
                          <div className="text-sm font-bold text-red-400">{(alert.prob * 100).toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">ANOMALY SCORE</div>
                          <div className="text-sm font-bold text-purple-400">{alert.anomaly.toFixed(3)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">TIMESTAMP</div>
                          <div className="text-sm font-bold text-slate-300">{alert.timeSec}s</div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold text-slate-400">Flagged Risk Drivers:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {alert.reasons.map((r, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                              &bull; {r}
                            </span>
                          ))}
                        </div>
                      </div>

                      {alert.resolutionNote && (
                        <div className="mt-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
                          <span className="font-semibold text-blue-400">Analyst Resolution Note:</span> {alert.resolutionNote}
                        </div>
                      )}
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="flex flex-row lg:flex-col gap-2 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800 pt-3 lg:pt-0 lg:pl-4 justify-end">
                      <button
                        onClick={() => setSelectedAlertForBlock(alert)}
                        className="px-3.5 py-2 rounded-xl bg-red-600/90 hover:bg-red-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Block Card</span>
                      </button>

                      <button
                        onClick={() => setSelectedAlertForOtp(alert)}
                        className="px-3.5 py-2 rounded-xl bg-purple-600/90 hover:bg-purple-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Step-Up OTP</span>
                      </button>

                      <button
                        onClick={() => setSelectedAlertForRelease(alert)}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 font-semibold text-xs transition flex items-center justify-center gap-1.5 border border-slate-700"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Release</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. TRANSACTION REVIEW & VERIFICATION SUB-TAB              */}
      {/* ========================================================= */}
      {activeSubTab === 'review' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-400" />
              Manual Review & Compliance Verification Queue
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Transactions in the moderate risk band (0.60 &le; P(Fraud) &lt; 0.80) or with high Isolation Forest anomaly scores require step-by-step identity and merchant verification before settlement.
            </p>
          </div>

          {reviewQueueAlerts.length === 0 ? (
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-10 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">Review Queue Clean</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                There are currently no transactions waiting in the manual verification queue.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviewQueueAlerts.map(alert => {
                const alertChecklist = checklist[alert.id] || { phone: false, device: false, velocity: false };
                const verifiedCount = Object.values(alertChecklist).filter(Boolean).length;

                return (
                  <div
                    key={alert.id}
                    className="bg-slate-900/95 border border-slate-800 rounded-2xl p-6 shadow-md space-y-5"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-sm font-bold text-white bg-slate-800 px-2.5 py-0.5 rounded">
                            {alert.id}
                          </span>
                          <span className="font-mono text-xs text-blue-400 font-bold">
                            {alert.txId}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            MANUAL REVIEW REQUIRED
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Amount: <span className="font-mono text-white font-bold">${alert.amount.toFixed(2)}</span> &bull; Scored Time: <span className="font-mono text-slate-300">T+{alert.timeSec}s</span>
                        </div>
                      </div>

                      {/* Verification Score Meter */}
                      <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 uppercase font-medium">Verification Status</div>
                          <div className={`text-xs font-bold font-mono ${verifiedCount === 3 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {verifiedCount} of 3 Checks Completed
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-white">
                          {verifiedCount}/3
                        </div>
                      </div>
                    </div>

                    {/* 3-Step Verification Checklist & Signals Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left: Model Signals & Flags */}
                      <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                        <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                          <span>Model Confidence & Anomaly Score</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                            <div className="text-[10px] text-slate-500">XGBOOST PROBABILITY</div>
                            <div className="text-base font-bold text-amber-400 mt-0.5">
                              {(alert.prob * 100).toFixed(1)}%
                            </div>
                            <div className="text-[9px] text-slate-500 mt-0.5">Review band (60-80%)</div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                            <div className="text-[10px] text-slate-500">ISOLATION FOREST ANOMALY</div>
                            <div className="text-base font-bold text-purple-400 mt-0.5">
                              {alert.anomaly.toFixed(3)}
                            </div>
                            <div className="text-[9px] text-slate-500 mt-0.5">Outlier cutoff (+0.037)</div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[11px] font-semibold text-slate-400">Risk Drivers:</div>
                          <ul className="text-xs text-slate-300 space-y-1">
                            {alert.reasons.map((r, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Right: Compliance Verification Checklist */}
                      <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                        <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Analyst Verification Protocol</span>
                        </div>

                        <div className="space-y-2">
                          <label
                            onClick={() => toggleChecklistItem(alert.id, 'phone')}
                            className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition text-xs ${
                              alertChecklist.phone ? 'bg-emerald-950/20 border-emerald-800/60 text-slate-200' : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={alertChecklist.phone}
                              onChange={() => {}}
                              className="mt-0.5 accent-emerald-500 rounded"
                            />
                            <div>
                              <div className="font-semibold text-slate-200">1. Customer Contact & Outreach</div>
                              <div className="text-[11px] text-slate-400">Confirm phone number or dispatch 2FA Step-Up challenge.</div>
                            </div>
                          </label>

                          <label
                            onClick={() => toggleChecklistItem(alert.id, 'device')}
                            className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition text-xs ${
                              alertChecklist.device ? 'bg-emerald-950/20 border-emerald-800/60 text-slate-200' : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={alertChecklist.device}
                              onChange={() => {}}
                              className="mt-0.5 accent-emerald-500 rounded"
                            />
                            <div>
                              <div className="font-semibold text-slate-200">2. Device & IP Fingerprint</div>
                              <div className="text-[11px] text-slate-400">Inspect device reputation, VPN proxy headers, and location.</div>
                            </div>
                          </label>

                          <label
                            onClick={() => toggleChecklistItem(alert.id, 'velocity')}
                            className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition text-xs ${
                              alertChecklist.velocity ? 'bg-emerald-950/20 border-emerald-800/60 text-slate-200' : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={alertChecklist.velocity}
                              onChange={() => {}}
                              className="mt-0.5 accent-emerald-500 rounded"
                            />
                            <div>
                              <div className="font-semibold text-slate-200">3. Card Velocity & Merchant Validity</div>
                              <div className="text-[11px] text-slate-400">Ensure no rapid multiple auth attempts within 10 minutes.</div>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                      <button
                        onClick={() => setSelectedAlertForOtp(alert)}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-purple-600/20"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Dispatch Step-Up OTP</span>
                      </button>

                      <button
                        onClick={() => setSelectedAlertForRelease(alert)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve & Release</span>
                      </button>

                      <button
                        onClick={() => setSelectedAlertForBlock(alert)}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-red-600/20"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Block & Freeze Account</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. AUDIT TRAIL & RESOLUTIONS SUB-TAB                      */}
      {/* ========================================================= */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              Compliance Audit Trail & Resolution Certificates
            </h3>
            <p className="text-xs text-slate-400">
              Immutable log of every card freeze, 2FA step-up challenge, and manual override executed during this session.
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-10 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Audit Events Logged</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Actions such as Block Card, Step-Up OTP, and Release will automatically record operational entries here.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">TIMESTAMP</th>
                    <th className="py-3 px-4">LOG ID</th>
                    <th className="py-3 px-4">TARGET TX</th>
                    <th className="py-3 px-4">AMOUNT</th>
                    <th className="py-3 px-4">ACTION TAKEN</th>
                    <th className="py-3 px-4">REASON & AUDIT NOTES</th>
                    <th className="py-3 px-4">ANALYST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 font-mono text-xs">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-850/40 transition">
                      <td className="py-3 px-4 text-slate-400">{log.timestamp}</td>
                      <td className="py-3 px-4 font-bold text-white">{log.id}</td>
                      <td className="py-3 px-4 text-blue-400">{log.txId}</td>
                      <td className="py-3 px-4 text-slate-200">${log.amount.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action === 'BLOCKED' || log.action === 'STEP_UP_FAILED'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : log.action === 'APPROVED' || log.action === 'STEP_UP_PASSED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-300 max-w-xs truncate">{log.reason}</td>
                      <td className="py-3 px-4 font-sans text-slate-400">{log.analyst}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: BLOCK CARD & FREEZE ACCOUNT                      */}
      {/* ========================================================= */}
      {selectedAlertForBlock && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl shadow-red-950/50">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Block Card & Account Freeze</h3>
                  <p className="text-xs text-slate-400">Operational freeze for {selectedAlertForBlock.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlertForBlock(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Transaction:</span>
                  <span className="font-mono text-white font-bold">{selectedAlertForBlock.txId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Transaction Amount:</span>
                  <span className="font-mono text-red-400 font-bold">${selectedAlertForBlock.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Calculated Fraud Prob:</span>
                  <span className="font-mono text-red-400 font-bold">{(selectedAlertForBlock.prob * 100).toFixed(1)}%</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Select Freeze Reason:</label>
                <select
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="Confirmed unauthorized charge">Confirmed unauthorized charge</option>
                  <option value="Stolen cardholder identity / Account Takeover">Stolen cardholder identity / Account Takeover</option>
                  <option value="Card PAN skimming / Compromised terminal">Card PAN skimming / Compromised terminal</option>
                  <option value="Severe high-risk score policy breach">Severe high-risk score policy breach</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={freezeAccount}
                    onChange={e => setFreezeAccount(e.target.checked)}
                    className="accent-red-500 rounded"
                  />
                  <span>Immediately freeze cardholder virtual & plastic tokens</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={blacklistMerchant}
                    onChange={e => setBlacklistMerchant(e.target.checked)}
                    className="accent-red-500 rounded"
                  />
                  <span>Add originating terminal/merchant to velocity blacklist</span>
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Compliance Audit Notes (Optional):</label>
                <textarea
                  value={blockNotes}
                  onChange={e => setBlockNotes(e.target.value)}
                  placeholder="Add case notes for dispute settlement..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedAlertForBlock(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBlock}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-600/30 flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Execute Card Freeze</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: STEP-UP OTP 2FA VERIFICATION                     */}
      {/* ========================================================= */}
      {selectedAlertForOtp && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-purple-500/40 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl shadow-purple-950/50">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">2FA Step-Up OTP Verification</h3>
                  <p className="text-xs text-slate-400">Dispatch verification challenge for {selectedAlertForOtp.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlertForOtp(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-2">
                <div className="text-[11px] text-slate-400">Active Challenge Code Dispatched:</div>
                <div className="text-2xl font-mono font-extrabold tracking-widest text-purple-400">
                  {otpCode.slice(0, 3)} {otpCode.slice(3)}
                </div>
                <div className="text-[10px] text-slate-500 flex items-center justify-center gap-2">
                  <span>Sent via SMS to +1 (555) ***-8921</span>
                  <span>&bull;</span>
                  <span>Expires in: <span className="font-bold text-white font-mono">{otpTimer}s</span></span>
                </div>
              </div>

              {otpStatus === 'VERIFIED' && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-xl flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>OTP Verified! Releasing payment hold...</span>
                </div>
              )}

              {otpStatus === 'FAILED' && (
                <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded-xl flex items-center gap-2 font-medium">
                  <Ban className="w-4 h-4 text-red-400" />
                  <span>OTP Challenge Failed / Denied by Cardholder! Freezing account...</span>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <div className="text-xs font-semibold text-slate-300">Simulate Customer Response:</div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleSimulateOtpPass}
                    disabled={otpStatus !== 'SENT'}
                    className="p-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-semibold transition text-center space-y-0.5 disabled:opacity-50"
                  >
                    <div className="text-xs font-bold">Simulate Passed OTP</div>
                    <div className="text-[10px] text-emerald-400/80">Customer approved charge</div>
                  </button>

                  <button
                    onClick={handleSimulateOtpFail}
                    disabled={otpStatus !== 'SENT'}
                    className="p-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 font-semibold transition text-center space-y-0.5 disabled:opacity-50"
                  >
                    <div className="text-xs font-bold">Simulate Failed / Denied</div>
                    <div className="text-[10px] text-red-400/80">Customer reported fraud</div>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={handleResendOtp}
                className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Resend New OTP Code</span>
              </button>

              <button
                onClick={() => setSelectedAlertForOtp(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: RELEASE & SETTLE TRANSACTION                     */}
      {/* ========================================================= */}
      {selectedAlertForRelease && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl shadow-emerald-950/50">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Release Transaction Hold</h3>
                  <p className="text-xs text-slate-400">Authorize payment settlement for {selectedAlertForRelease.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlertForRelease(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Transaction:</span>
                  <span className="font-mono text-white font-bold">{selectedAlertForRelease.txId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Settlement Amount:</span>
                  <span className="font-mono text-emerald-400 font-bold">${selectedAlertForRelease.amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Release Justification:</label>
                <select
                  value={releaseReason}
                  onChange={e => setReleaseReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Verified with customer by phone">Verified with customer by phone</option>
                  <option value="Customer completed biometric in-app authorization">Customer completed biometric in-app authorization</option>
                  <option value="Trusted merchant with recurring billing history">Trusted merchant with recurring billing history</option>
                  <option value="Pre-notified customer international travel">Pre-notified customer international travel</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={whitelistMerchant}
                    onChange={e => setWhitelistMerchant(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Whitelist this merchant for 30 days to avoid future holds</span>
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Verification Notes (Optional):</label>
                <textarea
                  value={releaseNotes}
                  onChange={e => setReleaseNotes(e.target.value)}
                  placeholder="Notes for compliance records..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedAlertForRelease(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRelease}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm Release to Settlement</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
