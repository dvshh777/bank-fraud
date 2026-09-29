import React, { useState } from 'react';
import { Image, BarChart2, Eye, X, ZoomIn, Info } from 'lucide-react';

interface ReportItem {
  id: string;
  title: string;
  category: 'eda' | 'model' | 'anomaly';
  image: string;
  description: string;
}

const REPORTS_LIST: ReportItem[] = [
  {
    id: 'class-dist',
    title: 'Class Distribution',
    category: 'eda',
    image: '/reports/eda/class_distribution.png',
    description: 'Visualises the severe 578:1 imbalance: 199,020 legitimate transactions (99.8275%) vs 344 frauds (0.1725%).'
  },
  {
    id: 'amount-dist',
    title: 'Amount Distribution by Class',
    category: 'eda',
    image: '/reports/eda/amount_distribution_by_class.png',
    description: 'Compares transaction values. While mean fraud amount ($109.78) is higher, median fraud amount ($9.02) is lower than legitimate ($21.96).'
  },
  {
    id: 'log-amount-dist',
    title: 'Log Amount Distribution',
    category: 'eda',
    image: '/reports/eda/log_amount_distribution_by_class.png',
    description: 'Log-transformed view demonstrating bimodal tendencies and extreme positive skewness up to $19,656.'
  },
  {
    id: 'top10-v',
    title: 'Top 10 PCA Features (Mean Difference)',
    category: 'eda',
    image: '/reports/eda/top10_v_features_mean_diff.png',
    description: 'Highlights the strongest separating PCA components: V3 (diff 7.24), V14 (7.16), V17 (6.86), V12 (6.46), and V10 (5.82).'
  },
  {
    id: 'corr-heatmap',
    title: 'Feature Correlation Heatmap',
    category: 'eda',
    image: '/reports/eda/correlation_heatmap.png',
    description: 'Correlation matrix validating PCA orthogonality among V features and moderate correlations with Amount and Class.'
  },
  {
    id: 'time-bins',
    title: 'Fraud Rate Across Time Bins',
    category: 'eda',
    image: '/reports/eda/fraud_rate_across_time_bins.png',
    description: 'Evaluates fraud incidence across 20 equal-width 2.4-hour intervals over the 48-hour timeline.'
  },
  {
    id: 'xgb-prob-dist',
    title: 'XGBoost Probability by Class',
    category: 'model',
    image: '/reports/eda/xgboost_probability_distribution_by_class.png',
    description: 'Probability density separation. Median predicted fraud probability is 0.9997 for actual fraud and 0.00005 for legitimate.'
  },
  {
    id: 'xgb-pr-thresholds',
    title: 'Precision-Recall Threshold Curve',
    category: 'model',
    image: '/reports/eda/xgboost_precision_recall_thresholds.png',
    description: 'Precision, recall, and F1 trade-offs across probability threshold space (selected reference threshold: 0.80).'
  },
  {
    id: 'fn-amount',
    title: 'Missed Frauds Amount Analysis',
    category: 'model',
    image: '/reports/eda/xgboost_false_negative_amount.png',
    description: 'Profile of the 65 missed frauds (FNs at t=0.80): median $12.31, confirming stealth low-dollar test transactions.'
  },
  {
    id: 'fp-amount',
    title: 'False Alarms Amount Analysis',
    category: 'model',
    image: '/reports/eda/xgboost_false_positive_amount.png',
    description: 'Profile of the 28 false positive alarms (0.014% FPR) showing small amounts and atypical PCA values.'
  },
  {
    id: 'anomaly-dist',
    title: 'Isolation Anomaly Score Distribution',
    category: 'anomaly',
    image: '/reports/eda/anomaly_score_distribution_by_class.png',
    description: 'Anomaly score profiles: caught frauds (+0.1087 mean), legitimate (-0.0980 mean), and missed stealth frauds (-0.0472).'
  },
  {
    id: 'hybrid-pr-auc',
    title: 'Hybrid PR-AUC Comparison',
    category: 'anomaly',
    image: '/reports/eda/hybrid_pr_auc_comparison.png',
    description: 'Evaluation curves demonstrating why Isolation Forest is reserved as a secondary review filter rather than a probability blender.'
  },
  {
    id: 'hybrid-risk',
    title: 'Hybrid Risk Score Distribution',
    category: 'anomaly',
    image: '/reports/eda/hybrid_risk_distribution.png',
    description: 'Multi-tier risk band partitions across the two-stage decision surface.'
  },
  {
    id: 'temp-density',
    title: 'Temporal Density Fraud Rate',
    category: 'eda',
    image: '/reports/eda/temporal_density_fraud_rate.png',
    description: 'Evidence that burst volume windows do not correspond to higher fraud rates.'
  }
];

export const EdaGalleryTab: React.FC = () => {
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [zoomedItem, setZoomedItem] = useState<ReportItem | null>(null);

  const filteredReports = REPORTS_LIST.filter(r => {
    if (selectedCat === 'all') return true;
    return r.category === selectedCat;
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-400" />
              Exploratory Data Analysis (EDA) & Model Visualizations
            </h2>
            <p className="text-xs text-slate-400">
              14 research artifacts generated by the project data pipeline under reports/eda/.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setSelectedCat('all')}
              className={`px-3 py-1 rounded-lg transition ${
                selectedCat === 'all'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All Plots ({REPORTS_LIST.length})
            </button>
            <button
              onClick={() => setSelectedCat('eda')}
              className={`px-3 py-1 rounded-lg transition ${
                selectedCat === 'eda'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Dataset EDA
            </button>
            <button
              onClick={() => setSelectedCat('model')}
              className={`px-3 py-1 rounded-lg transition ${
                selectedCat === 'model'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              XGBoost Errors
            </button>
            <button
              onClick={() => setSelectedCat('anomaly')}
              className={`px-3 py-1 rounded-lg transition ${
                selectedCat === 'anomaly'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Anomaly & Hybrid
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map(item => (
            <div
              key={item.id}
              onClick={() => setZoomedItem(item)}
              className="group bg-slate-950/70 border border-slate-800 hover:border-blue-500/50 rounded-xl overflow-hidden cursor-pointer transition shadow-sm hover:shadow-md"
            >
              <div className="aspect-[4/3] bg-slate-900 overflow-hidden relative">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  onError={(e) => {
                    // Fallback placeholder if image not rendered
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/0 transition" />
                <div className="absolute top-2 right-2 bg-slate-950/80 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition shadow">
                  <ZoomIn className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="p-3.5 space-y-1">
                <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition">
                  {item.title}
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Zoom View */}
      {zoomedItem && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setZoomedItem(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">{zoomedItem.title}</h3>
                <p className="text-xs text-slate-400">{zoomedItem.description}</p>
              </div>
              <button
                onClick={() => setZoomedItem(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center overflow-auto max-h-[70vh]">
              <img
                src={zoomedItem.image}
                alt={zoomedItem.title}
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            </div>
            <div className="p-3.5 bg-slate-900 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span className="font-mono text-[11px]">{zoomedItem.image}</span>
              <span className="text-slate-500">Press Esc or click outside to close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
