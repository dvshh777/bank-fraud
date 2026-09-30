import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Ban,
  Activity,
  Sparkles,
  Copy,
  Check,
  Clock,
  DollarSign,
  TrendingUp,
  Flame,
  Info,
  Layers,
  ArrowRight,
  Search,
  Sliders,
  Smartphone,
  Unlock
} from 'lucide-react';
import { BatchResultRow, RiskLevel, RecommendedAction, FeatureImpact } from '../types';
import { formatStandardTime, formatClockTime } from '../lib/timeUtils';
import { FEATURE_COLS, calculateFeatureImpacts } from '../lib/xgboost';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: BatchResultRow | null;
  ticketId?: string;
  onActionBlock?: (tx: BatchResultRow) => void;
  onActionOtp?: (tx: BatchResultRow) => void;
  onActionRelease?: (tx: BatchResultRow) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  transaction,
  ticketId,
  onActionBlock,
  onActionOtp,
  onActionRelease
}) => {
  const [copied, setCopied] = useState(false);
  const [featureFilter, setFeatureFilter] = useState<'ALL' | 'ANOMALIES' | 'TOP_MODEL'>('ALL');
  const [featureSearch, setFeatureSearch] = useState('');

  if (!isOpen || !transaction) return null;

  const timeSec = transaction.Time;
  const amount = transaction.Amount;
  const prob = transaction.xgb_probability;
  const anomaly = transaction.anomaly_score;
  const risk = transaction.risk_level;
  const action = transaction.action;
  const explanation = transaction.explanation;

  // Key weights from model architecture
  const topModelFeatures = ['V14', 'V17', 'V12', 'V10', 'V4', 'V3', 'V11', 'V7', 'V2', 'V16', 'V18', 'V1'];
  
  // Calculate impacts
  const featureImpacts = calculateFeatureImpacts(transaction, prob);

  // Analyze all 28 V features for anomaly deviation
  // Features V1-V28 are zero-mean unit-variance PCA features
  const analyzedFeatures = Array.from({ length: 28 }, (_, i) => {
    const feat = `V${i + 1}`;
    const val = typeof transaction[feat] === 'number' ? transaction[feat] : 0;
    const absVal = Math.abs(val);

    // Is it a key driver?
    const isTopModel = topModelFeatures.includes(feat);
    
    // Anomaly classification:
    // Critical Anomaly: |val| >= 2.5 OR (isTopModel && |val| >= 1.8)
    // Moderate Anomaly: |val| >= 1.4
    let anomalyLevel: 'CRITICAL' | 'MODERATE' | 'BASELINE' = 'BASELINE';
    if (absVal >= 2.5 || (isTopModel && absVal >= 1.8)) {
      anomalyLevel = 'CRITICAL';
    } else if (absVal >= 1.4) {
      anomalyLevel = 'MODERATE';
    }

    // Directional signal towards fraud
    // Negative values on V14, V17, V12, V10, V3, V7 indicate severe fraud
    // Positive values on V4, V11, V2 indicate fraud
    let fraudDirection: 'FRAUD_TRIGGER' | 'LEGIT_SIGNAL' | 'NEUTRAL' = 'NEUTRAL';
    if (['V14', 'V17', 'V12', 'V10', 'V3', 'V7', 'V16', 'V18', 'V1'].includes(feat) && val < -1.0) {
      fraudDirection = 'FRAUD_TRIGGER';
    } else if (['V4', 'V11', 'V2'].includes(feat) && val > 1.0) {
      fraudDirection = 'FRAUD_TRIGGER';
    } else if (absVal >= 2.0) {
      fraudDirection = 'FRAUD_TRIGGER';
    } else if (absVal < 0.5) {
      fraudDirection = 'LEGIT_SIGNAL';
    }

    return {
      feature: feat,
      value: val,
      absVal,
      anomalyLevel,
      fraudDirection,
      isTopModel,
      zScore: val.toFixed(3)
    };
  });

  const criticalAnomalies = analyzedFeatures.filter(f => f.anomalyLevel === 'CRITICAL');
  const moderateAnomalies = analyzedFeatures.filter(f => f.anomalyLevel === 'MODERATE');
  const allAnomalyDrivers = [...criticalAnomalies, ...moderateAnomalies].sort((a, b) => b.absVal - a.absVal);

  // Filter features for display
  const displayedFeatures = analyzedFeatures.filter(f => {
    if (featureSearch && !f.feature.toLowerCase().includes(featureSearch.toLowerCase())) {
      return false;
    }
    if (featureFilter === 'ANOMALIES') {
      return f.anomalyLevel === 'CRITICAL' || f.anomalyLevel === 'MODERATE';
    }
    if (featureFilter === 'TOP_MODEL') {
      return f.isTopModel;
    }
    return true;
  });

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(transaction, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              risk === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              risk === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
              risk === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Transaction Deep Dive & Feature Breakdown
                </h2>
                {ticketId && (
                  <span className="font-mono text-xs bg-slate-800 text-blue-300 px-2 py-0.5 rounded border border-slate-700">
                    {ticketId}
                  </span>
                )}
                <span className="font-mono text-xs text-slate-400">
                  TX-{timeSec}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-cyan-300 font-semibold">{formatStandardTime(timeSec)}</span>
                <span className="text-slate-600">&bull;</span>
                <span className="font-mono text-slate-400">T+{timeSec.toLocaleString()}s</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1.5 border border-slate-700"
              title="Copy transaction JSON"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          
          {/* 1. Primary Metrics Overview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Probability */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 relative">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Fraud Probability (XGBoost)
              </span>
              <div className={`text-2xl font-bold font-mono ${
                prob >= 0.90 ? 'text-red-400' :
                prob >= 0.80 ? 'text-orange-400' :
                prob >= 0.60 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {(prob * 100).toFixed(2)}%
              </div>
              <div className="w-full bg-slate-850 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className={`h-full ${
                    prob >= 0.80 ? 'bg-red-500' : prob >= 0.60 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(2, prob * 100))}%` }}
                />
              </div>
            </div>

            {/* Anomaly Score */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-purple-900/40 relative">
              <span className="text-[10px] uppercase font-bold text-purple-400 block mb-1">
                Anomaly Score (Isolation Forest)
              </span>
              <div className="text-2xl font-bold font-mono text-purple-300">
                {anomaly > 0 ? `+${anomaly.toFixed(4)}` : anomaly.toFixed(4)}
              </div>
              <span className={`text-[10px] font-semibold mt-1 block ${
                anomaly > 0.0369 ? 'text-purple-400 font-bold' : 'text-slate-500'
              }`}>
                {anomaly > 0.0369 ? '⚠️ High Outlier (> +0.0369)' : '✓ Normal Profile'}
              </span>
            </div>

            {/* Amount */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 relative">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Transaction Amount
              </span>
              <div className="text-2xl font-bold font-mono text-white">
                ${amount.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {amount > 500 ? 'High-value transaction' : 'Standard transaction volume'}
              </span>
            </div>

            {/* Policy Action */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 relative flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Policy Decision
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    action === 'BLOCK' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    action === 'REVIEW' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {action}
                  </span>
                  <span className="font-bold text-slate-300">({risk} RISK)</span>
                </div>
              </div>
              <span className="text-[9px] text-slate-500 font-mono mt-1">
                {risk === 'CRITICAL' ? 'Direct Auto-Block' : risk === 'HIGH' || risk === 'MEDIUM' ? 'Verification Queue' : 'Settled'}
              </span>
            </div>
          </div>

          {/* 2. Highlighted Anomaly & Fraud Drivers Section */}
          <div className="bg-gradient-to-r from-red-950/30 via-slate-950 to-purple-950/30 border border-red-900/40 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-bold text-white">
                  Identified Anomaly & Risk Drivers ({allAnomalyDrivers.length} Features Highlighted)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                PCA standard deviation cutoff: &ge; 1.80&sigma;
              </span>
            </div>

            {allAnomalyDrivers.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center text-slate-400">
                <Check className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                No statistical PCA anomaly outliers found. All V features are within normal operational baseline boundaries.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {allAnomalyDrivers.map(item => (
                  <div
                    key={item.feature}
                    className={`p-3 rounded-xl border transition-all ${
                      item.anomalyLevel === 'CRITICAL'
                        ? 'bg-red-950/40 border-red-500/60 shadow-sm shadow-red-950/40 ring-1 ring-red-500/30'
                        : 'bg-amber-950/30 border-amber-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${item.anomalyLevel === 'CRITICAL' ? 'bg-red-400 animate-pulse' : 'bg-amber-400'}`} />
                        {item.feature}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        item.anomalyLevel === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {item.anomalyLevel === 'CRITICAL' ? 'CRITICAL OUTLIER' : 'MODERATE SHIFT'}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between mt-1">
                      <span className="font-mono text-sm font-bold text-white">
                        {item.value.toFixed(4)}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {item.absVal.toFixed(2)}&sigma; dev
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-800 flex items-center justify-between">
                      <span>{item.isTopModel ? '★ Primary Model Weight' : 'PCA Vector Component'}</span>
                      <span className={item.fraudDirection === 'FRAUD_TRIGGER' ? 'text-red-400 font-semibold' : 'text-slate-400'}>
                        {item.fraudDirection === 'FRAUD_TRIGGER' ? '⚠️ Fraud Driver' : 'Baseline'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Explanation text */}
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
              <span className="font-semibold text-blue-400 block">Model Explanation Summary:</span>
              <p className="leading-relaxed text-slate-300">
                {explanation || 'Evaluated against XGBoost decision boundaries and Isolation Forest multi-dimensional PCA vector density.'}
              </p>
            </div>
          </div>

          {/* 3. Full 30-Feature Vector Grid (V1 to V28, Time, Amount) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  Full Feature Vector (All 30 Input Parameters)
                </h3>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
                  <input
                    type="text"
                    placeholder="Search feature (e.g. V14)..."
                    value={featureSearch}
                    onChange={e => setFeatureSearch(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg pl-6 pr-2.5 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-44"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                  <button
                    onClick={() => setFeatureFilter('ALL')}
                    className={`px-2 py-0.5 rounded ${
                      featureFilter === 'ALL' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All 30
                  </button>
                  <button
                    onClick={() => setFeatureFilter('ANOMALIES')}
                    className={`px-2 py-0.5 rounded ${
                      featureFilter === 'ANOMALIES' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Anomalies ({allAnomalyDrivers.length})
                  </button>
                  <button
                    onClick={() => setFeatureFilter('TOP_MODEL')}
                    className={`px-2 py-0.5 rounded ${
                      featureFilter === 'TOP_MODEL' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Top Influential
                  </button>
                </div>
              </div>
            </div>

            {/* Grid of features */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {/* Time Card */}
              {(!featureSearch || 'time'.includes(featureSearch.toLowerCase())) && featureFilter === 'ALL' && (
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] font-mono text-cyan-400 font-bold">Time</div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5 truncate" title={formatStandardTime(timeSec)}>
                    {formatClockTime(timeSec, '24h')}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">T+{timeSec}s</div>
                </div>
              )}

              {/* Amount Card */}
              {(!featureSearch || 'amount'.includes(featureSearch.toLowerCase())) && featureFilter === 'ALL' && (
                <div className={`p-2.5 rounded-xl border ${amount > 500 ? 'bg-amber-950/30 border-amber-700/60' : 'bg-slate-950/80 border-slate-800'}`}>
                  <div className="text-[10px] font-mono text-emerald-400 font-bold">Amount</div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">
                    ${amount.toFixed(2)}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">{amount > 500 ? '⚠️ High Outlier' : 'Normal'}</div>
                </div>
              )}

              {/* V1 to V28 Cards */}
              {displayedFeatures.map(item => {
                const isCritical = item.anomalyLevel === 'CRITICAL';
                const isModerate = item.anomalyLevel === 'MODERATE';

                return (
                  <div
                    key={item.feature}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isCritical
                        ? 'bg-red-950/40 border-red-500/70 shadow-sm shadow-red-900/30'
                        : isModerate
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : item.isTopModel
                        ? 'bg-slate-950/90 border-blue-900/40'
                        : 'bg-slate-950/60 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-[10px] font-mono font-bold ${
                        isCritical ? 'text-red-300' : isModerate ? 'text-amber-300' : item.isTopModel ? 'text-blue-300' : 'text-slate-400'
                      }`}>
                        {item.feature}
                      </span>
                      {isCritical && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" title="Critical anomaly outlier" />
                      )}
                    </div>
                    <div className={`text-xs font-mono font-bold ${
                      isCritical ? 'text-red-200' : isModerate ? 'text-amber-200' : 'text-slate-200'
                    }`}>
                      {item.value.toFixed(4)}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono flex items-center justify-between mt-0.5">
                      <span>{item.absVal.toFixed(1)}&sigma;</span>
                      {item.isTopModel && <span className="text-blue-400 font-bold">★ Key</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400">
            {allAnomalyDrivers.length > 0 ? (
              <span className="text-amber-400">
                ⚠️ {allAnomalyDrivers.length} anomaly drivers detected across V features.
              </span>
            ) : (
              <span className="text-emerald-400">
                ✓ All feature parameters adhere to standard operational baselines.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onActionOtp && action !== 'APPROVE' && (
              <button
                onClick={() => {
                  onClose();
                  onActionOtp(transaction);
                }}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition flex items-center gap-1 shadow-md shadow-purple-600/20"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Step-Up OTP</span>
              </button>
            )}

            {onActionBlock && (
              <button
                onClick={() => {
                  onClose();
                  onActionBlock(transaction);
                }}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition flex items-center gap-1 shadow-md shadow-red-600/20"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Block Card</span>
              </button>
            )}

            {onActionRelease && (
              <button
                onClick={() => {
                  onClose();
                  onActionRelease(transaction);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 font-semibold text-xs transition flex items-center gap-1 border border-slate-700"
              >
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Approve & Release</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition border border-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
