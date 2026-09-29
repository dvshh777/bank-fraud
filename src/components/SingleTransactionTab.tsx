import React, { useState } from 'react';
import { TransactionData, PredictionResult, PolicyConfig } from '../types';
import { predictTransaction, FEATURE_COLS } from '../lib/xgboost';
import { QUICK_PRESETS } from '../lib/demoData';
import { useDataContext } from '../context/DataContext';
import { Search, CheckCircle2, AlertTriangle, ShieldX, Sparkles, RotateCcw, Activity, Info } from 'lucide-react';

interface Props {
  policy: PolicyConfig;
}

const DEFAULT_TX: TransactionData = {
  Time: 3600.0,
  Amount: 25.50,
  ...Object.fromEntries(Array.from({ length: 28 }, (_, i) => [`V${i + 1}`, 0.0]))
};

export const SingleTransactionTab: React.FC<Props> = ({ policy }) => {
  const { appendSingleTransaction } = useDataContext();
  const [formData, setFormData] = useState<TransactionData>(DEFAULT_TX);
  const [prediction, setPrediction] = useState<PredictionResult | null>(() => predictTransaction(DEFAULT_TX, policy));
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const handleInputChange = (field: string, val: string) => {
    const num = parseFloat(val);
    setFormData(prev => ({
      ...prev,
      [field]: isNaN(num) ? 0 : num
    }));
  };

  const handlePresetSelect = (index: number) => {
    const preset = QUICK_PRESETS[index];
    setFormData(preset.values);
    setActivePreset(preset.label);
    const result = predictTransaction(preset.values, policy);
    setPrediction(result);
    appendSingleTransaction({
      ...preset.values,
      Time: preset.values.Time,
      Amount: preset.values.Amount,
      xgb_probability: result.fraud_probability,
      anomaly_score: result.anomaly_score,
      risk_level: result.risk_level,
      action: result.recommended_action,
      explanation: result.explanation
    });
  };

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    const result = predictTransaction(formData, policy);
    setPrediction(result);
    appendSingleTransaction({
      ...formData,
      Time: formData.Time,
      Amount: formData.Amount,
      xgb_probability: result.fraud_probability,
      anomaly_score: result.anomaly_score,
      risk_level: result.risk_level,
      action: result.recommended_action,
      explanation: result.explanation
    });
  };

  const handleReset = () => {
    setFormData(DEFAULT_TX);
    setActivePreset(null);
    setPrediction(predictTransaction(DEFAULT_TX, policy));
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-500/10 border-red-500/30 text-red-400',
          badge: 'bg-red-500 text-white',
          glow: 'shadow-red-500/20'
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
          badge: 'bg-orange-500 text-white',
          glow: 'shadow-orange-500/20'
        };
      case 'MEDIUM':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          badge: 'bg-amber-500 text-slate-950 font-bold',
          glow: 'shadow-amber-500/20'
        };
      default:
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          badge: 'bg-emerald-500 text-white',
          glow: 'shadow-emerald-500/20'
        };
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'BLOCK':
        return <ShieldX className="w-5 h-5 text-red-400" />;
      case 'REVIEW':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    }
  };

  const riskStyle = prediction ? getRiskColor(prediction.risk_level) : getRiskColor('LOW');

  // Key model features with high prediction contribution in model benchmarks
  const primaryVFeatures = ['V14', 'V17', 'V12', 'V10', 'V4', 'V3', 'V11', 'V7', 'V2', 'V16'];
  const otherVFeatures = Array.from({ length: 28 }, (_, i) => `V${i + 1}`).filter(f => !primaryVFeatures.includes(f));

  return (
    <div className="space-y-6">
      {/* Preset Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
                Simulation / Demo Scenarios
              </span>
              <span className="text-[10px] text-slate-500">
                Preset parameter profiles for testing. Scenario labels are simulations, not model features.
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePresetSelect(idx)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  activePreset === preset.label
                    ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form Column (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-white">
                Transaction Features (Time, Amount, Anonymized features V1-V28)
              </h2>
              <p className="text-xs text-slate-400">
                Supply Time (seconds elapsed), Amount, and Anonymized features V1-V28.
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition"
              title="Reset all inputs to default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-4">
            {/* Primary Attributes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Time (seconds elapsed)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.Time}
                  onChange={e => handleInputChange('Time', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.Amount}
                  onChange={e => handleInputChange('Amount', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Top Model-Influential Features */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Top Model-Influential Features
                </span>
                <span className="text-[11px] text-slate-400">Key model features</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {primaryVFeatures.map(feat => (
                  <div key={feat} className="bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                    <label className="block text-[11px] font-mono font-medium text-slate-400 mb-1">
                      {feat}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData[feat] ?? 0}
                      onChange={e => handleInputChange(feat, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Remaining Anonymized Features */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Anonymized features V1-V28 (Remaining 18 Features)
                </span>
                <span className="text-[11px] text-slate-500">Orthogonal numerical components</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
                {otherVFeatures.map(feat => (
                  <div key={feat} className="bg-slate-950/30 p-1.5 rounded border border-slate-800/80">
                    <label className="block text-[10px] font-mono text-slate-400 mb-0.5">
                      {feat}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData[feat] ?? 0}
                      onChange={e => handleInputChange(feat, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition"
              >
                <Search className="w-4 h-4" />
                <span>Evaluate Signals & Apply Risk Policy</span>
              </button>
            </div>
          </form>
        </div>

        {/* Prediction Results Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {prediction && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  Engine Assessment
                </h3>
                <span className="text-[11px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  Primary + Secondary Signal
                </span>
              </div>

              {/* 1. SEPARATE MODEL SIGNALS DISPLAY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Primary Signal: XGBoost Fraud Probability */}
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-blue-900/40 relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400">
                      Primary Signal
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">Supervised</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-300">
                    XGBoost Fraud Probability
                  </div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">
                    {(prediction.fraud_probability * 100).toFixed(2)}%
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                    Score: {prediction.fraud_probability.toFixed(5)}
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        prediction.fraud_probability >= policy.highThreshold
                          ? 'bg-red-500'
                          : prediction.fraud_probability >= policy.mediumThreshold
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(1, prediction.fraud_probability * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Secondary Signal: Isolation Forest Anomaly Score */}
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-purple-900/40 relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400">
                      Secondary Signal
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">Unsupervised</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-300">
                    Isolation Forest Anomaly Score
                  </div>
                  <div className="text-2xl font-bold font-mono text-purple-300 mt-1">
                    {prediction.anomaly_score.toFixed(4)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Exploratory anomaly reference: Top 2% (~+0.037)
                  </div>
                  {/* Indicator bar */}
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
                    <div
                      className="h-full bg-purple-500 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(5, ((prediction.anomaly_score + 0.15) / 0.4) * 100))}%`
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. RISK CLASSIFICATION & RECOMMENDED ACTION (DRIVEN BY XGBOOST PROBABILITY) */}
              <div className={`p-4 rounded-xl border ${riskStyle.bg} shadow-md ${riskStyle.glow} space-y-3`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-300 block">
                      Risk Classification
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Driven by XGBoost fraud probability vs risk policy
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${riskStyle.badge}`}>
                    {prediction.risk_level} RISK
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <div className="flex items-center gap-2">
                    {getActionIcon(prediction.recommended_action)}
                    <div>
                      <div className="text-xs text-slate-400">Recommended Action</div>
                      <div className="text-base font-bold text-white tracking-wide">
                        {prediction.recommended_action}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Policy Threshold Band</div>
                    <div className="text-xs font-mono font-bold text-white">
                      {prediction.fraud_probability >= policy.criticalThreshold
                        ? '≥ 0.90 → CRITICAL → BLOCK'
                        : prediction.fraud_probability >= policy.highThreshold
                        ? '≥ 0.80 → HIGH → BLOCK'
                        : prediction.fraud_probability >= policy.mediumThreshold
                        ? '≥ 0.60 → MEDIUM → REVIEW'
                        : '< 0.60 → LOW → APPROVE'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Policy Mapping Reference Banner */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] space-y-1.5">
                <span className="font-semibold text-slate-300 block">
                  Reference Decision Policy:
                </span>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[10px] text-slate-400">
                  <div>• Prob ≥ 0.90 → <strong className="text-red-400">CRITICAL → BLOCK</strong></div>
                  <div>• Prob ≥ 0.80 → <strong className="text-orange-400">HIGH → BLOCK</strong></div>
                  <div>• Prob ≥ 0.60 → <strong className="text-amber-400">MEDIUM → REVIEW</strong></div>
                  <div>• Prob &lt; 0.60 → <strong className="text-emerald-400">LOW → APPROVE</strong></div>
                </div>
                <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-850">
                  * Isolation Forest provides secondary anomaly context for investigation/review support and does not override the XGBoost decision.
                </p>
              </div>

              {/* Model Explanation */}
              <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Model Decision Explanation
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {prediction.explanation}
                </p>
              </div>

              {/* Top Model-Influential Features */}
              {prediction.feature_impacts && prediction.feature_impacts.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                    Top Model-Influential Features
                  </span>
                  <div className="space-y-1.5">
                    {prediction.feature_impacts.map(impact => (
                      <div
                        key={impact.feature}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-950/60 border border-slate-850"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-slate-200">{impact.feature}</span>
                          <span className="text-slate-400 text-[11px]">
                            {impact.feature} contributed strongly to the model decision.
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400 text-[11px]">
                            val: {impact.value.toFixed(2)}
                          </span>
                          <span className="font-mono text-slate-300 text-[11px] px-1.5 py-0.5 rounded bg-slate-800">
                            imp: {impact.impact.toFixed(3)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
