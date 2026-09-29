import React, { useState } from 'react';
import { PolicyConfig, DemoTransactionItem } from '../types';
import { DEMO_TRANSACTIONS } from '../lib/demoData';
import { predictTransaction } from '../lib/xgboost';
import { CheckCircle2, AlertTriangle, ShieldX, ArrowRight, Layers, Tag, Eye } from 'lucide-react';

interface Props {
  policy: PolicyConfig;
  onLoadIntoCustomForm?: (item: DemoTransactionItem) => void;
}

export const DemoTransactionsTab: React.FC<Props> = ({ policy, onLoadIntoCustomForm }) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const selectedItem = DEMO_TRANSACTIONS[selectedIdx];
  const prediction = predictTransaction(selectedItem.features, policy);

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'BLOCK':
        return { bg: 'bg-red-500 text-white', icon: <ShieldX className="w-3.5 h-3.5" /> };
      case 'REVIEW':
        return { bg: 'bg-amber-500 text-slate-950', icon: <AlertTriangle className="w-3.5 h-3.5" /> };
      default:
        return { bg: 'bg-emerald-500 text-white', icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
    }
  };

  const actionStyle = getActionBadge(prediction.recommended_action);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-white">Representative Demo Transactions</h2>
            <p className="text-xs text-slate-400">
              Curated rows representing distinct points across the two-stage decision policy.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Select Row:</span>
            <select
              value={selectedIdx}
              onChange={e => setSelectedIdx(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
            >
              {DEMO_TRANSACTIONS.map((item, idx) => (
                <option key={item.id} value={idx}>
                  {item.name} ({item.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Demo Cards Carousel/Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-4">
          {DEMO_TRANSACTIONS.map((item, idx) => {
            const isSelected = idx === selectedIdx;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedIdx(idx)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-500/70 shadow-sm shadow-blue-500/10 ring-1 ring-blue-500/30'
                    : 'bg-slate-950/50 hover:bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${getRiskBadge(item.category)}`}>
                    {item.category}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    ${item.features.Amount.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-200 truncate">
                  {item.name}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  Target: {item.expectedResult.action}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Transaction Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Score & Explanation (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-blue-400 block">
                Scenario #{selectedIdx + 1}
              </span>
              <h3 className="text-base font-bold text-white">{selectedItem.name}</h3>
            </div>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${actionStyle.bg} flex items-center gap-1`}>
              {actionStyle.icon}
              {prediction.recommended_action}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
            {selectedItem.description}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">XGBoost Probability</div>
              <div className="text-xl font-bold font-mono text-white mt-0.5">
                {(prediction.fraud_probability * 100).toFixed(2)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Raw: {prediction.fraud_probability.toFixed(5)}
              </div>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Isolation Anomaly Score</div>
              <div className={`text-xl font-bold font-mono mt-0.5 ${
                prediction.anomaly_score > policy.anomalyCutoff ? 'text-purple-400' : 'text-slate-200'
              }`}>
                {prediction.anomaly_score.toFixed(4)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Cutoff: +{policy.anomalyCutoff.toFixed(4)}
              </div>
            </div>
          </div>

          <div className="space-y-2 p-3 bg-slate-950/40 rounded-xl border border-slate-800">
            <div className="text-xs font-semibold text-slate-300">Policy Explanation:</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {prediction.explanation}
            </p>
          </div>

          {onLoadIntoCustomForm && (
            <button
              onClick={() => onLoadIntoCustomForm(selectedItem)}
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition flex items-center justify-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>Inspect & Edit in Single Transaction Analyzer</span>
            </button>
          )}
        </div>

        {/* Right Side: Feature Value Table (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-white">Full Feature Vector (30 Values)</h3>
              <p className="text-xs text-slate-400">All features passed to Stage 1 & Stage 2 models.</p>
            </div>
            <div className="text-xs font-mono text-slate-400">
              Amount: <span className="text-white font-bold">${selectedItem.features.Amount.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 max-h-96 overflow-y-auto pr-1">
            <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono font-medium text-slate-400 block">Time</span>
              <span className="text-xs font-mono font-semibold text-blue-400">
                {selectedItem.features.Time.toFixed(1)}s
              </span>
            </div>
            <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono font-medium text-slate-400 block">Amount</span>
              <span className="text-xs font-mono font-semibold text-emerald-400">
                ${selectedItem.features.Amount.toFixed(2)}
              </span>
            </div>
            {Array.from({ length: 28 }, (_, i) => {
              const feat = `V${i + 1}`;
              const val = selectedItem.features[feat] ?? 0;
              const isHighlight = ['V14', 'V17', 'V12', 'V10', 'V4', 'V3'].includes(feat);
              return (
                <div
                  key={feat}
                  className={`p-2 rounded-lg border ${
                    isHighlight
                      ? 'bg-blue-950/20 border-blue-900/60'
                      : 'bg-slate-950/60 border-slate-800/80'
                  }`}
                >
                  <span className={`text-[10px] font-mono font-medium block ${
                    isHighlight ? 'text-blue-300' : 'text-slate-400'
                  }`}>
                    {feat}
                  </span>
                  <span className={`text-xs font-mono font-medium ${
                    val < -2
                      ? 'text-red-400'
                      : val > 2
                      ? 'text-amber-400'
                      : 'text-slate-200'
                  }`}>
                    {val.toFixed(3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
