import React from 'react';
import { PolicyConfig } from '../types';
import { DEFAULT_POLICY } from '../lib/xgboost';
import { ArrowDown, GitBranch, ShieldAlert, ShieldCheck, AlertTriangle, Sliders, RotateCcw, Cpu, Layers } from 'lucide-react';

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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-blue-400" />
              Primary + Secondary Signal Architecture
            </h2>
            <p className="text-xs text-slate-400">
              Structural overview of the primary XGBoost decision pipeline and secondary Isolation Forest anomaly context.
            </p>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
            Demo Reference Policy
          </span>
        </div>

        {/* Tree Flow Representation */}
        <div className="max-w-3xl mx-auto flex flex-col items-center space-y-3">
          {/* Node 1: Incoming Transaction */}
          <div className="w-full max-w-md bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-center shadow-md">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Input Vector
            </span>
            <span className="text-sm font-semibold text-white">
              Time (seconds elapsed), Amount, Anonymized features V1–V28
            </span>
          </div>

          <ArrowDown className="w-4 h-4 text-slate-500" />

          {/* Node 2: Primary Detector */}
          <div className="w-full max-w-md bg-blue-950/30 p-3.5 rounded-xl border border-blue-900/60 text-center shadow-md">
            <div className="flex items-center justify-center gap-1.5 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-0.5">
              <Cpu className="w-4 h-4" />
              Primary Signal: Supervised Detector
            </div>
            <div className="text-sm font-bold text-white">XGBoost Classifier (300 Hist Trees)</div>
            <div className="text-xs text-blue-300/80 font-mono mt-0.5">Outputs: Fraud Probability [0.00 – 1.00]</div>
          </div>

          <ArrowDown className="w-4 h-4 text-slate-500" />

          {/* Node 3: Risk Policy Bands */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
            {/* LOW BAND */}
            <div className="bg-slate-950 p-3 rounded-xl border border-emerald-900/40 text-center space-y-2">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                LOW BAND
              </span>
              <div className="text-xs font-mono text-slate-300">
                Prob &lt; {(policy.mediumThreshold * 100).toFixed(0)}%
              </div>
              <ArrowDown className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
              <div className="py-1 px-2 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                APPROVE
              </div>
            </div>

            {/* MEDIUM BAND */}
            <div className="bg-slate-950 p-3 rounded-xl border border-amber-900/40 text-center space-y-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                MEDIUM BAND
              </span>
              <div className="text-xs font-mono text-slate-300">
                {(policy.mediumThreshold * 100).toFixed(0)}% – {(policy.highThreshold * 100).toFixed(0)}%
              </div>
              <ArrowDown className="w-3.5 h-3.5 text-amber-500 mx-auto" />
              <div className="py-1 px-2 rounded bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                REVIEW
              </div>
            </div>

            {/* HIGH BAND */}
            <div className="bg-slate-950 p-3 rounded-xl border border-orange-900/40 text-center space-y-2">
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block">
                HIGH BAND
              </span>
              <div className="text-xs font-mono text-slate-300">
                {(policy.highThreshold * 100).toFixed(0)}% – {(policy.criticalThreshold * 100).toFixed(0)}%
              </div>
              <ArrowDown className="w-3.5 h-3.5 text-orange-500 mx-auto" />
              <div className="py-1 px-2 rounded bg-orange-500/20 text-orange-400 text-xs font-bold border border-orange-500/30 flex items-center justify-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                BLOCK
              </div>
            </div>

            {/* CRITICAL BAND */}
            <div className="bg-slate-950 p-3 rounded-xl border border-red-900/40 text-center space-y-2">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">
                CRITICAL BAND
              </span>
              <div className="text-xs font-mono text-slate-300">
                Prob ≥ {(policy.criticalThreshold * 100).toFixed(0)}%
              </div>
              <ArrowDown className="w-3.5 h-3.5 text-red-500 mx-auto" />
              <div className="py-1 px-2 rounded bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30 flex items-center justify-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                BLOCK
              </div>
            </div>
          </div>

          {/* Secondary Context Box */}
          <div className="w-full max-w-2xl bg-purple-950/20 border border-purple-800/40 rounded-xl p-3.5 text-center mt-3">
            <div className="flex items-center justify-center gap-1.5 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Layers className="w-4 h-4" />
              Secondary Signal: Isolation Forest Anomaly Context
            </div>
            <p className="text-xs text-purple-200/90 leading-relaxed">
              Provides unsupervised anomaly scores for human analysts during manual investigation and review support.
              Isolation Forest does <strong>not</strong> override, arbitrate, average, or replace the primary XGBoost decision.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Policy Thresholds Configurator */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              Adjust Decision Policy Thresholds
            </h3>
            <p className="text-xs text-slate-400">
              Modify the XGBoost decision policy thresholds without model retraining.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onUpdatePolicy({ criticalThreshold: 0.98, highThreshold: 0.95, mediumThreshold: 0.50, anomalyCutoff: policy.anomalyCutoff })}
              className="text-xs px-2.5 py-1 rounded bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-800/60 transition"
              title="Keeps borderline/suspect transactions in Review to prevent false alarms from blocking legitimate customers"
            >
              Review-First Policy (Minimize False Alarms)
            </button>
            <button
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition px-2.5 py-1 rounded bg-slate-800"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Defaults
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Critical Threshold:</span>
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
              className="w-full accent-red-500"
            />
            <span className="text-[10px] text-slate-500 block">Default: ≥ 0.90 (BLOCK)</span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">High Threshold:</span>
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
              className="w-full accent-orange-500"
            />
            <span className="text-[10px] text-slate-500 block">Default: ≥ 0.80 (BLOCK)</span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Medium Threshold:</span>
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
              className="w-full accent-amber-500"
            />
            <span className="text-[10px] text-slate-500 block">Default: ≥ 0.60 (REVIEW)</span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Exploratory Anomaly Ref:</span>
              <span className="font-mono font-bold text-purple-400">
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
              className="w-full accent-purple-500"
            />
            <span className="text-[10px] text-slate-500 block">Exploratory reference only (~Top 2%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
