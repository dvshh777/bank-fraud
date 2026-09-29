import React from 'react';
import { Database, CheckCircle, BarChart3, TrendingUp, Info, GitFork, Award } from 'lucide-react';

export const ModelSummaryTab: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span>Training Corpus</span>
            <Database className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">199,364</div>
          <p className="text-[11px] text-slate-500 mt-1">
            Credit card transactions (48-hour timeline)
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span>Fraud Prevalence</span>
            <TrendingUp className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">0.1725%</div>
          <p className="text-[11px] text-slate-500 mt-1">
            344 frauds (1 in 578 extreme class imbalance)
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span>XGBoost OOF PR-AUC</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">0.8473</div>
          <p className="text-[11px] text-emerald-500/80 mt-1">
            +15.54% over Logistic Regression (0.7334)
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span>Validation Strategy</span>
            <GitFork className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400">5-Fold</div>
          <p className="text-[11px] text-slate-500 mt-1">
            Stratified cross-validation (shuffle=True)
          </p>
        </div>
      </div>

      {/* Methodology & Model Comparison Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-white">Methodology & Model Performance Comparison</h3>
            <p className="text-xs text-slate-400">
              Evaluated across stratified 5-fold cross-validation. Due to severe class imbalance, PR-AUC is the primary benchmark.
            </p>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
            Out-of-Fold (OOF)
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Detector Model</th>
                <th className="py-2.5 px-3">Role In System</th>
                <th className="py-2.5 px-3 text-cyan-400">Benchmark Values (Acc / Prec)</th>
                <th className="py-2.5 px-3">OOF PR-AUC</th>
                <th className="py-2.5 px-3">OOF ROC-AUC</th>
                <th className="py-2.5 px-3">Relative Gain</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              <tr className="bg-blue-950/20">
                <td className="py-2.5 px-3 font-semibold text-white">XGBoost (Hist Gradient Boosting)</td>
                <td className="py-2.5 px-3 text-slate-300">Primary Classifier (Primary Signal)</td>
                <td className="py-2.5 px-3 font-mono font-medium">
                  <span className="text-emerald-400 font-bold">99.95%</span> Acc &bull; <span className="text-cyan-400 font-bold">90.88%</span> Prec
                </td>
                <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">0.8473</td>
                <td className="py-2.5 px-3 font-mono text-slate-200">0.9801</td>
                <td className="py-2.5 px-3 font-mono text-emerald-400 font-medium">+15.54%</td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-[10px]">
                    Primary Champion
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-200">Logistic Regression Baseline</td>
                <td className="py-2.5 px-3 text-slate-400">Linear Benchmark</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">
                  <span className="text-slate-300">99.91%</span> Acc &bull; <span className="text-slate-300">86.20%</span> Prec
                </td>
                <td className="py-2.5 px-3 font-mono text-slate-300">0.7334</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">0.9829</td>
                <td className="py-2.5 px-3 font-mono text-slate-500">Baseline</td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                    Superseded
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-200">Isolation Forest (Unsupervised)</td>
                <td className="py-2.5 px-3 text-slate-300">Secondary Anomaly Context (Secondary Signal)</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">
                  <span className="text-purple-400">98.00%</span> Acc &bull; <span className="text-purple-400">3.70%</span> Prec
                </td>
                <td className="py-2.5 px-3 font-mono text-slate-300">0.1534</td>
                <td className="py-2.5 px-3 font-mono text-slate-300">0.9379</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">Complementary</td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-semibold text-[10px]">
                    Secondary Triage
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-400">Temporal Surge / Density Signal</td>
                <td className="py-2.5 px-3 text-slate-500">Volume Time-window Analysis</td>
                <td className="py-2.5 px-3 font-mono text-slate-500">
                  <span>99.82%</span> Acc &bull; <span className="text-red-400">0.17%</span> Prec
                </td>
                <td className="py-2.5 px-3 font-mono text-slate-500">~0.0015</td>
                <td className="py-2.5 px-3 font-mono text-slate-500">–</td>
                <td className="py-2.5 px-3 font-mono text-red-400">-99.8%</td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-semibold text-[10px]">
                    Excluded (No Signal)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stratified 5-Fold Cross Validation Detail */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              XGBoost 5-Fold Stratified CV Breakdown
            </h4>
            <span className="text-[10px] font-mono text-slate-400">PR-AUC 0.8494 ± 0.0378</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] font-mono uppercase text-slate-500 bg-slate-950/60">
                <tr>
                  <th className="py-1.5 px-2">Fold</th>
                  <th className="py-1.5 px-2">Scale Pos Weight</th>
                  <th className="py-1.5 px-2">PR-AUC</th>
                  <th className="py-1.5 px-2">ROC-AUC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-mono">
                <tr>
                  <td className="py-1.5 px-2 text-slate-300">Fold 1</td>
                  <td className="py-1.5 px-2 text-slate-400">578.97</td>
                  <td className="py-1.5 px-2 text-emerald-400 font-semibold">0.8739</td>
                  <td className="py-1.5 px-2 text-slate-300">0.9839</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-2 text-slate-300">Fold 2</td>
                  <td className="py-1.5 px-2 text-slate-400">578.97</td>
                  <td className="py-1.5 px-2 text-emerald-400 font-semibold">0.8089</td>
                  <td className="py-1.5 px-2 text-slate-300">0.9701</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-2 text-slate-300">Fold 3</td>
                  <td className="py-1.5 px-2 text-slate-400">578.97</td>
                  <td className="py-1.5 px-2 text-emerald-400 font-semibold">0.8199</td>
                  <td className="py-1.5 px-2 text-slate-300">0.9825</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-2 text-slate-300">Fold 4</td>
                  <td className="py-1.5 px-2 text-slate-400">578.97</td>
                  <td className="py-1.5 px-2 text-emerald-400 font-semibold">0.8442</td>
                  <td className="py-1.5 px-2 text-slate-300">0.9722</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-2 text-slate-300">Fold 5</td>
                  <td className="py-1.5 px-2 text-slate-400">576.87</td>
                  <td className="py-1.5 px-2 text-emerald-400 font-semibold">0.9002</td>
                  <td className="py-1.5 px-2 text-slate-300">0.9960</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Confusion Matrix Widget */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Out-of-Fold Confusion Matrix (t = 0.80)
            </h4>
            <span className="text-[10px] font-mono text-emerald-400">Precision: 90.88% • Recall: 81.10%</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center pt-1">
            <div className="bg-emerald-950/40 border border-emerald-800/40 p-3 rounded-lg">
              <span className="text-[10px] uppercase font-semibold text-emerald-400 block">
                True Positives (Caught)
              </span>
              <span className="text-2xl font-bold font-mono text-emerald-300">279</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">81.1% of all frauds</span>
            </div>

            <div className="bg-orange-950/30 border border-orange-800/40 p-3 rounded-lg">
              <span className="text-[10px] uppercase font-semibold text-orange-400 block">
                False Positives (Alarms)
              </span>
              <span className="text-2xl font-bold font-mono text-orange-300">28</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">0.014% false alarm rate</span>
            </div>

            <div className="bg-red-950/40 border border-red-800/40 p-3 rounded-lg">
              <span className="text-[10px] uppercase font-semibold text-red-400 block">
                False Negatives (Missed)
              </span>
              <span className="text-2xl font-bold font-mono text-red-300">65</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">18.9% stealth frauds</span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                True Negatives (Legit)
              </span>
              <span className="text-2xl font-bold font-mono text-slate-200">198,992</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">99.986% specificity</span>
            </div>
          </div>
        </div>
      </div>

      {/* Governance & Architectural Takeaways */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Info className="w-4 h-4 text-blue-400" />
          Key Architectural Takeaways & Governance Notice
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300 pt-1">
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
            <span className="font-semibold text-white block mb-1">1. Non-linear PCA Interactions</span>
            XGBoost tree depth captures complex cross-feature interactions across V17, V14, V12, and V10, improving PR-AUC by +0.1140 (+15.54%) over linear models.
          </div>
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
            <span className="font-semibold text-white block mb-1">2. Two-Stage Anomaly Guardrail</span>
            The secondary Isolation Forest anomaly detector isolates geometric outliers without contaminating primary supervised probabilities.
          </div>
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
            <span className="font-semibold text-white block mb-1">3. Demo / Reference Policy Only</span>
            All thresholds (CRITICAL 0.90, HIGH 0.80, MEDIUM 0.60) are for demonstration purposes and calibrated from the hackathon benchmark dataset.
          </div>
        </div>
      </div>
    </div>
  );
};
