import React from 'react';
import { PolicyConfig } from '../types';
import { DEFAULT_POLICY } from '../lib/xgboost';
import { ArrowDown, GitBranch, ShieldAlert, ShieldCheck, AlertTriangle, Sliders, RotateCcw, Cpu, Layers, CheckCircle2, FileCode, Check } from 'lucide-react';

interface Props {
  policy: PolicyConfig;
  onUpdatePolicy: (policy: PolicyConfig) => void;
}

export const ArchitectureTab: React.FC<Props> = ({ policy, onUpdatePolicy }) => {
  const handleResetDefaults = () => {
    onUpdatePolicy(DEFAULT_POLICY);
  };

  return (
    <div className="space-y-6">
      {/* Visual Workflow Diagram */}
      <div className="bg-[#0e1628] border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-blue-400" />
              Real-Time Decision Architecture
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Two-tiered scoring topology: Supervised Gradient Boosted Decision Forest + Secondary Unsupervised Outlier Profiling.
            </p>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-mono text-slate-200">ACTIVE RULE ENGINE</span>
          </div>
        </div>

        {/* Tree Flow Representation */}
        <div className="max-w-4xl mx-auto flex flex-col items-center space-y-3">
          {/* Node 1: Incoming Transaction */}
          <div className="w-full max-w-lg bg-slate-900 p-4 rounded-xl border border-slate-800 text-center shadow-sm">
            <span className="text-[10px] uppercase font-bold text-blue-400 block tracking-wider mb-0.5">
              01. Raw Transaction Ingestion Layer
            </span>
            <span className="text-xs font-semibold text-white">
              Elapsed Seconds (Time), Normalized Amount, PCA Vectors V1 through V28
            </span>
            <div className="text-[11px] text-slate-400 mt-1">
              Zero-latency payload parsing · PCI-DSS compliant payload isolation
            </div>
          </div>

          <ArrowDown className="w-4 h-4 text-slate-600" />

          {/* Node 2: Primary Detector */}
          <div className="w-full max-w-lg bg-slate-900 p-4 rounded-xl border border-blue-600/40 text-center shadow-sm">
            <div className="flex items-center justify-center gap-1.5 text-blue-400 text-xs font-bold uppercase tracking-wider mb-0.5">
              <Cpu className="w-4 h-4" />
              02. Primary Supervised Decision Forest (XGBoost)
            </div>
            <div className="text-sm font-bold text-white">300 Histogram Trees · Max Depth 6 · Subsample 0.8</div>
            <div className="text-xs text-slate-300 font-mono mt-1">
              Deterministic Output: Posterior Probability <span className="text-blue-400 font-bold">P(Fraud) ∈ [0.00, 1.00]</span>
            </div>
          </div>

          <ArrowDown className="w-4 h-4 text-slate-600" />

          {/* Node 3: Risk Policy Bands */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
            {/* LOW BAND */}
            <div className="bg-slate-900 p-3.5 rounded-xl border border-emerald-900/50 text-center space-y-2">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                Standard Settlement
              </span>
              <div className="text-xs font-mono text-slate-200">
                P(Fraud) &lt; {(policy.mediumThreshold * 100).toFixed(0)}%
              </div>
              <ArrowDown className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
              <div className="py-1.5 px-2 rounded-lg bg-emerald-950/80 text-emerald-400 text-xs font-bold border border-emerald-700/60 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                AUTO-APPROVE
              </div>
              <p className="text-[10px] text-slate-400">Zero friction cardholder pass-through</p>
            </div>

            {/* MEDIUM BAND */}
            <div className="bg-slate-900 p-3.5 rounded-xl border border-amber-900/50 text-center space-y-2">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                Challenge & Review
              </span>
              <div className="text-xs font-mono text-slate-200">
                {(policy.mediumThreshold * 100).toFixed(0)}% – {(policy.highThreshold * 100).toFixed(0)}%
              </div>
              <ArrowDown className="w-3.5 h-3.5 text-amber-500 mx-auto" />
              <div className="py-1.5 px-2 rounded-lg bg-amber-950/80 text-amber-400 text-xs font-bold border border-amber-700/60 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                STEP-UP 2FA / QUEUE
              </div>
              <p className="text-[10px] text-slate-400">Dispatch SMS OTP / queue for risk analyst</p>
            </div>

            {/* HIGH BAND */}
            <div className="bg-slate-900 p-3.5 rounded-xl border border-orange-900/50 text-center space-y-2">
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block">
                High Risk Intercept
              </span>
              <div className="text-xs font-mono text-slate-200">
                {(policy.highThreshold * 100).toFixed(0)}% – {(policy.criticalThreshold * 100).toFixed(0)}%
              </div>
              <ArrowDown className="w-3.5 h-3.5 text-orange-500 mx-auto" />
              <div className="py-1.5 px-2 rounded-lg bg-orange-950/80 text-orange-400 text-xs font-bold border border-orange-700/60 flex items-center justify-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                BLOCK & HOLD
              </div>
              <p className="text-[10px] text-slate-400">Decline authorization at payment gateway</p>
            </div>

            {/* CRITICAL BAND */}
            <div className="bg-slate-900 p-3.5 rounded-xl border border-red-900/50 text-center space-y-2">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">
                Critical Severity
              </span>
              <div className="text-xs font-mono text-slate-200">
                P(Fraud) ≥ {(policy.criticalThreshold * 100).toFixed(0)}%
              </div>
              <ArrowDown className="w-3.5 h-3.5 text-red-500 mx-auto" />
              <div className="py-1.5 px-2 rounded-lg bg-red-950/80 text-red-400 text-xs font-bold border border-red-700/60 flex items-center justify-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                BLOCK & FREEZE CARD
              </div>
              <p className="text-[10px] text-slate-400">Immediate card freeze & merchant blacklist</p>
            </div>
          </div>

          {/* Secondary Context Box */}
          <div className="w-full max-w-3xl bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 text-center mt-3">
            <div className="flex items-center justify-center gap-1.5 text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">
              <Layers className="w-4 h-4 text-blue-400" />
              Secondary Context Layer: Isolation Forest Outlier Profiling
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl mx-auto">
              Computes topological isolation depths across 100 iTrees to deliver anomaly context to human review teams. Isolates novel fraud vectors that deviate geometrically from historical normal spend.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Policy Thresholds Configurator */}
      <div className="bg-[#0e1628] border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              Decision Threshold Policy Engine
            </h3>
            <p className="text-xs text-slate-400">
              Dynamically calibrate risk boundary cutoffs across all live decision endpoints.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onUpdatePolicy({ criticalThreshold: 0.98, highThreshold: 0.95, mediumThreshold: 0.50, anomalyCutoff: policy.anomalyCutoff })}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition font-medium"
              title="Prioritizes 2FA step-up to minimize legitimate customer friction"
            >
              Friction-Minimizing Preset
            </button>
            <button
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Standards
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Critical Cutoff:</span>
              <span className="font-mono font-bold text-red-400">
                {(policy.criticalThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.80"
              max="0.99"
              step="0.01"
              value={policy.criticalThreshold}
              onChange={e => onUpdatePolicy({ ...policy, criticalThreshold: parseFloat(e.target.value) })}
              className="w-full accent-red-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block font-mono">Policy Default: ≥ 0.90 (BLOCK)</span>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">High Risk Cutoff:</span>
              <span className="font-mono font-bold text-orange-400">
                {(policy.highThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.70"
              max="0.89"
              step="0.01"
              value={policy.highThreshold}
              onChange={e => onUpdatePolicy({ ...policy, highThreshold: parseFloat(e.target.value) })}
              className="w-full accent-orange-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block font-mono">Policy Default: ≥ 0.80 (BLOCK)</span>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Review / Step-Up Cutoff:</span>
              <span className="font-mono font-bold text-amber-400">
                {(policy.mediumThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.40"
              max="0.75"
              step="0.01"
              value={policy.mediumThreshold}
              onChange={e => onUpdatePolicy({ ...policy, mediumThreshold: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block font-mono">Policy Default: ≥ 0.60 (CHALLENGE)</span>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Anomaly Context Sigma:</span>
              <span className="font-mono font-bold text-blue-400">
                +{policy.anomalyCutoff.toFixed(4)}
              </span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.10"
              step="0.005"
              value={policy.anomalyCutoff}
              onChange={e => onUpdatePolicy({ ...policy, anomalyCutoff: parseFloat(e.target.value) })}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block font-mono">Isolation Forest ~Top 2%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
