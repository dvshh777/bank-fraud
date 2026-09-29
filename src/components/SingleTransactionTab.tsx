import React, { useState } from 'react';
import { TransactionData, PredictionResult, PolicyConfig } from '../types';
import { predictTransaction, FEATURE_COLS } from '../lib/xgboost';
import { QUICK_PRESETS } from '../lib/demoData';
import { Search, AlertOctagon, CheckCircle2, AlertTriangle, ShieldX, Sparkles, RotateCcw, ArrowRight, Activity } from 'lucide-react';

interface Props {
  policy: PolicyConfig;
}

const DEFAULT_TX: TransactionData = {
  Time: 3600.0,
  Amount: 25.50,
  ...Object.fromEntries(Array.from({ length: 28 }, (_, i) => [`V${i + 1}`, 0.0]))
};

export const SingleTransactionTab: React.FC<Props> = ({ policy }) => {
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
  };

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    const result = predictTransaction(formData, policy);
    setPrediction(result);
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

  // Key PCA features that have strongest correlation in Phase 1 analysis
  const primaryVFeatures = ['V14', 'V17', 'V12', 'V10', 'V4', 'V3', 'V11', 'V7', 'V2', 'V16'];
  const otherVFeatures = Array.from({ length: 28 }, (_, i) => `V${i + 1}`).filter(f => !primaryVFeatures.includes(f));

  return (
    <div className="space-y-6">
      {/* Preset Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Quick Test Scenarios
            </span>
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
              <h2 className="text-base font-semibold text-white">Transaction Features (30 Inputs)</h2>
              <p className="text-xs text-slate-400">
                Supply transaction timestamp, amount, and PCA components (V1-V28).
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition"
              title="Reset all inputs"
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
                  Time (seconds elapsed: 0 – 172,800)
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
                  Amount ($ USD)
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

            {/* High-Impact PCA Features */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Top Influential PCA Components (High Correlation)
                </span>
                <span className="text-[11px] text-blue-400">Primary fraud drivers</span>
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

            {/* Remaining PCA Components Accordion/Grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Remaining PCA Components (Orthogonal)
                </span>
                <span className="text-[11px] text-slate-500">18 components</span>
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
                <span>Evaluate Fraud Risk & Anomaly Score</span>
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
                <span className="text-[11px] font-mono text-slate-400">Two-Stage Policy</span>
              </div>

              {/* Status and Action Banners */}
              <div className={`p-4 rounded-xl border ${riskStyle.bg} shadow-md ${riskStyle.glow} space-y-3`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-300">
                    Risk Classification
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${riskStyle.badge}`}>
                    {prediction.risk_level} RISK
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
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
                    <div className="text-xs text-slate-400">Primary Band</div>
                    <div className="text-xs font-mono font-medium text-slate-200">
                      {prediction.fraud_probability >= policy.criticalThreshold
                        ? 'CRITICAL (≥ 0.90)'
                        : prediction.fraud_probability >= policy.highThreshold
                        ? 'HIGH (≥ 0.80)'
                        : prediction.fraud_probability >= policy.mediumThreshold
                        ? 'MEDIUM (≥ 0.60)'
                        : 'LOW (< 0.60)'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Metric Breakdown Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1">Stage 1: Fraud Probability</div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {(prediction.fraud_probability * 100).toFixed(2)}%
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-1">
                    Raw: {prediction.fraud_probability.toFixed(5)}
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        prediction.fraud_probability >= 0.8
                          ? 'bg-red-500'
                          : prediction.fraud_probability >= 0.6
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(1, prediction.fraud_probability * 100))}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1">Stage 2: Anomaly Score</div>
                  <div className={`text-2xl font-bold font-mono ${
                    prediction.anomaly_score > policy.anomalyCutoff ? 'text-purple-400' : 'text-slate-200'
                  }`}>
                    {prediction.anomaly_score.toFixed(4)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Cutoff: +{policy.anomalyCutoff.toFixed(4)}
                  </div>
                  {/* Anomaly indicator */}
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        prediction.anomaly_score > policy.anomalyCutoff ? 'bg-purple-500' : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(5, ((prediction.anomaly_score + 0.15) / 0.4) * 100))}%`
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Explanation Text */}
              <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Model Explanation
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {prediction.explanation}
                </p>
                <p className="text-[11px] text-slate-500 italic pt-1">
                  * Thresholds are DEMO / REFERENCE policy only — calibrated from hackathon validation set.
                </p>
              </div>

              {/* Influential Features Table */}
              {prediction.feature_impacts && prediction.feature_impacts.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                    Top Feature Contributions
                  </span>
                  <div className="space-y-1.5">
                    {prediction.feature_impacts.map(impact => (
                      <div
                        key={impact.feature}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-950/60 border border-slate-850"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-slate-200">{impact.feature}</span>
                          <span className="text-slate-400 text-[11px]">val: {impact.value.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${
                              impact.direction === 'fraud'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {impact.direction === 'fraud' ? '↑ Risk' : '↓ Safe'}
                          </span>
                          <span className="font-mono text-slate-300 text-[11px]">
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
