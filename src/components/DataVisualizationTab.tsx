import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  PieChart,
  Activity,
  TrendingUp,
  Download,
  FileSpreadsheet,
  Upload,
  Layers,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Images,
  Info
} from 'lucide-react';
import { useDataContext } from '../context/DataContext';
import { EdaGalleryTab } from './EdaGalleryTab';
import { generateSampleCsvContent } from '../lib/demoData';
import { predictTransaction } from '../lib/xgboost';
import { BatchResultRow } from '../types';

export const DataVisualizationTab: React.FC<{ onNavigateTab?: (tab: string) => void }> = ({ onNavigateTab }) => {
  const { datasetName, rows, policy, setDataset } = useDataContext();
  const [viewMode, setViewMode] = useState<'dataset' | 'reference'>('dataset');

  const hasData = rows.length > 0;
  const totalCount = rows.length;

  // Dynamic calculations from uploaded dataset
  const stats = useMemo(() => {
    if (!hasData) return null;

    let totalAmount = 0;
    let legitAmountSum = 0;
    let fraudAmountSum = 0;
    let legitCount = 0;
    let fraudCount = 0;
    let maxAmount = 0;

    const amountTiers = {
      under25: { legit: 0, fraud: 0 },
      between25_100: { legit: 0, fraud: 0 },
      between100_500: { legit: 0, fraud: 0 },
      over500: { legit: 0, fraud: 0 },
    };

    const probBins = Array(10).fill(0).map(() => ({ legit: 0, fraud: 0 }));
    const anomalyBins = Array(8).fill(0).map(() => ({ count: 0 }));

    // Feature mean differences for top PCA features
    const topVCols = ['V14', 'V10', 'V12', 'V4', 'V17', 'V3', 'V11', 'V7'];
    const featureSums: Record<string, { legit: number; fraud: number }> = {};
    topVCols.forEach(c => {
      featureSums[c] = { legit: 0, fraud: 0 };
    });

    rows.forEach(r => {
      const isFraud = r.Class === 1 || r.xgb_probability >= policy.highThreshold;
      totalAmount += r.Amount;
      if (r.Amount > maxAmount) maxAmount = r.Amount;

      if (isFraud) {
        fraudCount++;
        fraudAmountSum += r.Amount;
      } else {
        legitCount++;
        legitAmountSum += r.Amount;
      }

      // Amount tiers
      if (r.Amount < 25) {
        if (isFraud) amountTiers.under25.fraud++;
        else amountTiers.under25.legit++;
      } else if (r.Amount <= 100) {
        if (isFraud) amountTiers.between25_100.fraud++;
        else amountTiers.between25_100.legit++;
      } else if (r.Amount <= 500) {
        if (isFraud) amountTiers.between100_500.fraud++;
        else amountTiers.between100_500.legit++;
      } else {
        if (isFraud) amountTiers.over500.fraud++;
        else amountTiers.over500.legit++;
      }

      // Probability bins (0.0 to 1.0 in 10 bins)
      const pBin = Math.min(9, Math.max(0, Math.floor(r.xgb_probability * 10)));
      if (isFraud) probBins[pBin].fraud++;
      else probBins[pBin].legit++;

      // Anomaly bins (-0.15 to +0.25)
      const anomBin = Math.min(7, Math.max(0, Math.floor((r.anomaly_score + 0.15) / 0.05)));
      anomalyBins[anomBin].count++;

      // Feature sums
      topVCols.forEach(col => {
        const val = r[col] || 0;
        if (isFraud) featureSums[col].fraud += val;
        else featureSums[col].legit += val;
      });
    });

    const featureDiffs = topVCols.map(col => {
      const meanLegit = legitCount > 0 ? featureSums[col].legit / legitCount : 0;
      const meanFraud = fraudCount > 0 ? featureSums[col].fraud / fraudCount : 0;
      return {
        feature: col,
        meanLegit,
        meanFraud,
        diff: Math.abs(meanFraud - meanLegit)
      };
    }).sort((a, b) => b.diff - a.diff);

    const approvedCount = rows.filter(r => r.action === 'APPROVE').length;
    const reviewCount = rows.filter(r => r.action === 'REVIEW').length;
    const blockedCount = rows.filter(r => r.action === 'BLOCK').length;

    return {
      totalCount: rows.length,
      totalAmount,
      avgAmount: rows.length > 0 ? totalAmount / rows.length : 0,
      avgLegitAmount: legitCount > 0 ? legitAmountSum / legitCount : 0,
      avgFraudAmount: fraudCount > 0 ? fraudAmountSum / fraudCount : 0,
      maxAmount,
      legitCount,
      fraudCount,
      approvedCount,
      reviewCount,
      blockedCount,
      amountTiers,
      probBins,
      anomalyBins,
      featureDiffs
    };
  }, [rows, hasData, policy]);

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

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-tab Switcher */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Data Visualization & Distribution Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {hasData
              ? `Visualizations generated dynamically from ${datasetName || 'current session'} (${totalCount.toLocaleString()} transactions).`
              : 'Interactive visual analytics computed directly from your uploaded dataset.'}
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('dataset')}
            className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5 ${
              viewMode === 'dataset'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Uploaded Dataset Charts</span>
          </button>
          <button
            onClick={() => setViewMode('reference')}
            className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5 ${
              viewMode === 'reference'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Images className="w-3.5 h-3.5" />
            <span>Reference Research Plots (14)</span>
          </button>
        </div>
      </div>

      {viewMode === 'reference' ? (
        <EdaGalleryTab />
      ) : !hasData ? (
        /* Empty State: No Dataset Uploaded Yet */
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto shadow-inner">
            <BarChart3 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-white">No Dataset Uploaded Yet</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload your transaction CSV dataset or score demo records to dynamically generate feature distribution charts, risk density curves, amount comparisons, and anomaly scatter plots.
            </p>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('batch')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-lg shadow-blue-600/20"
              >
                <Upload className="w-4 h-4" />
                <span>Upload CSV Dataset</span>
              </button>
            )}

            <button
              onClick={handleLoadSampleDataset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs transition border border-cyan-800/60"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Load 15-Row Demo Batch</span>
            </button>

            <button
              onClick={() => setViewMode('reference')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition border border-slate-700"
            >
              <Images className="w-4 h-4" />
              <span>View Benchmark Reference Plots</span>
            </button>
          </div>
        </div>
      ) : (
        /* Active Dynamic Visualizations computed from Uploaded Dataset */
        stats && (
          <div className="space-y-6">
            {/* Quick KPI Bar for Dataset */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                <div className="text-[11px] text-slate-400">Total Analyzed Volume</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5">
                  ${stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">Avg: ${stats.avgAmount.toFixed(2)} / tx</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                <div className="text-[11px] text-slate-400">Avg Legit vs Fraud Amount</div>
                <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">
                  ${stats.avgLegitAmount.toFixed(2)} <span className="text-xs text-slate-500">vs</span> <span className="text-red-400">${stats.avgFraudAmount.toFixed(2)}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">Max Amount: ${stats.maxAmount.toFixed(2)}</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                <div className="text-[11px] text-slate-400">Fraud Ratio in Dataset</div>
                <div className="text-xl font-bold font-mono text-red-400 mt-0.5">
                  {((stats.fraudCount / stats.totalCount) * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{stats.fraudCount} Frauds / {stats.legitCount} Legit</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                <div className="text-[11px] text-slate-400">Policy Enforcement Action</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5 flex items-center gap-2">
                  <span className="text-emerald-400">{stats.approvedCount}</span>
                  <span className="text-slate-500 text-xs">/</span>
                  <span className="text-amber-400">{stats.reviewCount}</span>
                  <span className="text-slate-500 text-xs">/</span>
                  <span className="text-rose-400">{stats.blockedCount}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">Approved / Review / Block</div>
              </div>
            </div>

            {/* Visual Charts Grid 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Amount Distribution by Class */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Amount Distribution by Class</h3>
                    <p className="text-[11px] text-slate-400">Transaction counts across value brackets in your dataset</p>
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

                <div className="space-y-3 pt-2">
                  {[
                    { label: '< $25 (Micro Transactions)', data: stats.amountTiers.under25 },
                    { label: '$25 - $100 (Standard Retail)', data: stats.amountTiers.between25_100 },
                    { label: '$100 - $500 (Elevated Value)', data: stats.amountTiers.between100_500 },
                    { label: '> $500 (High-Ticket / Outlier)', data: stats.amountTiers.over500 },
                  ].map((tier, idx) => {
                    const maxTierCount = Math.max(1, stats.totalCount);
                    const legitPct = (tier.data.legit / maxTierCount) * 100;
                    const fraudPct = (tier.data.fraud / maxTierCount) * 100;

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 font-medium">{tier.label}</span>
                          <span className="font-mono text-slate-400">
                            Legit: <span className="text-blue-400">{tier.data.legit}</span> | Fraud: <span className="text-red-400">{tier.data.fraud}</span>
                          </span>
                        </div>
                        <div className="h-3.5 bg-slate-950 rounded-full overflow-hidden flex gap-1 p-0.5 border border-slate-800">
                          {tier.data.legit > 0 && (
                            <div
                              style={{ width: `${Math.max(5, legitPct)}%` }}
                              className="bg-blue-500 rounded-full transition-all duration-300"
                            />
                          )}
                          {tier.data.fraud > 0 && (
                            <div
                              style={{ width: `${Math.max(5, fraudPct)}%` }}
                              className="bg-red-500 rounded-full transition-all duration-300"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart 2: Model Fraud Probability Distribution */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">XGBoost Fraud Probability Bins</h3>
                    <p className="text-[11px] text-slate-400">Density of scored transactions across 0.0 to 1.0 spectrum</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    Threshold: {policy.highThreshold.toFixed(2)}
                  </span>
                </div>

                <div className="h-44 flex items-end justify-between gap-1.5 pt-4 border-b border-slate-800 pb-2">
                  {stats.probBins.map((bin, i) => {
                    const totalBin = bin.legit + bin.fraud;
                    const maxBin = Math.max(1, ...stats.probBins.map(b => b.legit + b.fraud));
                    const heightPct = (totalBin / maxBin) * 100;
                    const isOverThreshold = (i + 1) * 0.1 >= policy.highThreshold;

                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                        <div className="opacity-0 group-hover:opacity-100 transition absolute -top-8 bg-slate-950 text-white text-[10px] px-2 py-1 rounded shadow-lg border border-slate-700 pointer-events-none z-20 whitespace-nowrap">
                          Band: {(i * 0.1).toFixed(1)}-{((i + 1) * 0.1).toFixed(1)} | Total: {totalBin} ({bin.fraud} Fraud)
                        </div>

                        <div
                          style={{ height: `${Math.max(6, heightPct)}%` }}
                          className={`w-full rounded-t transition-all duration-300 ${
                            isOverThreshold ? 'bg-red-500' : (i + 1) * 0.1 >= policy.mediumThreshold ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1">
                  <span>0.0</span>
                  <span>0.2</span>
                  <span>0.4</span>
                  <span>0.6</span>
                  <span>0.8</span>
                  <span>1.0</span>
                </div>
              </div>
            </div>

            {/* Visual Charts Grid 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 3: Top PCA Feature Mean Differences in Uploaded Dataset */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Top PCA Feature Separation in Dataset</h3>
                  <p className="text-[11px] text-slate-400">Mean displacement between Legitimate vs Fraud records (|Mean Fraud - Mean Legit|)</p>
                </div>

                <div className="space-y-2.5">
                  {stats.featureDiffs.slice(0, 6).map((feat, idx) => {
                    const maxDiff = Math.max(1, stats.featureDiffs[0]?.diff || 1);
                    const widthPct = (feat.diff / maxDiff) * 100;

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-mono font-bold text-slate-200">{feat.feature}</span>
                          <span className="font-mono text-slate-400 text-[11px]">
                            Mean Legit: <span className="text-blue-400">{feat.meanLegit.toFixed(2)}</span> | Mean Fraud: <span className="text-red-400">{feat.meanFraud.toFixed(2)}</span> (Diff: <span className="text-white font-bold">{feat.diff.toFixed(2)}</span>)
                          </span>
                        </div>
                        <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                          <div
                            style={{ width: `${Math.max(8, widthPct)}%` }}
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart 4: Policy Action Breakdown */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Policy Enforcement Breakdown</h3>
                  <p className="text-[11px] text-slate-400">Distribution of actions executed across the uploaded records</p>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-4 text-center space-y-1">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                    <div className="text-xs text-slate-400">Approved</div>
                    <div className="text-xl font-bold font-mono text-emerald-400">{stats.approvedCount}</div>
                    <div className="text-[10px] text-emerald-300 font-mono">
                      {((stats.approvedCount / stats.totalCount) * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-4 text-center space-y-1">
                    <Clock className="w-5 h-5 text-amber-400 mx-auto" />
                    <div className="text-xs text-slate-400">Under Review</div>
                    <div className="text-xl font-bold font-mono text-amber-400">{stats.reviewCount}</div>
                    <div className="text-[10px] text-amber-300 font-mono">
                      {((stats.reviewCount / stats.totalCount) * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-4 text-center space-y-1">
                    <ShieldAlert className="w-5 h-5 text-red-400 mx-auto" />
                    <div className="text-xs text-slate-400">Blocked</div>
                    <div className="text-xl font-bold font-mono text-red-400">{stats.blockedCount}</div>
                    <div className="text-[10px] text-red-300 font-mono">
                      {((stats.blockedCount / stats.totalCount) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 leading-relaxed flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>
                    Enforced at thresholds: Block (&ge;{policy.highThreshold * 100}%), Review (&ge;{policy.mediumThreshold * 100}%), Approve (&lt;{policy.mediumThreshold * 100}%).
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
