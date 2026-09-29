import React, { useState } from 'react';
import { BarChart2, ZoomIn, X, Download, Archive, Check, ExternalLink, Sparkles, Loader2 } from 'lucide-react';
import JSZip from 'jszip';

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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  const filteredReports = REPORTS_LIST.filter(r => {
    if (selectedCat === 'all') return true;
    return r.category === selectedCat;
  });

  const triggerSuccessToast = (msg: string) => {
    setDownloadSuccessMessage(msg);
    setTimeout(() => {
      setDownloadSuccessMessage(null);
    }, 3500);
  };

  const handleDownloadSingle = async (item: ReportItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDownloadingId(item.id);
    try {
      const filename = item.image.split('/').pop() || `${item.id}.png`;
      const res = await fetch(item.image);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      triggerSuccessToast(`Downloaded "${item.title}"`);
    } catch (err) {
      console.error('Download error:', err);
      // Fallback direct link download
      const filename = item.image.split('/').pop() || `${item.id}.png`;
      const a = document.createElement('a');
      a.href = item.image;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      triggerSuccessToast(`Downloaded "${item.title}"`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadZip = async () => {
    setIsDownloadingZip(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('sentinel_eda_visualizations');

      await Promise.all(
        filteredReports.map(async (item) => {
          try {
            const res = await fetch(item.image);
            const blob = await res.blob();
            const filename = item.image.split('/').pop() || `${item.id}.png`;
            folder?.file(filename, blob);
          } catch (err) {
            console.error(`Failed to load ${item.image} for ZIP:`, err);
          }
        })
      );

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      const categoryLabel = selectedCat === 'all' ? 'all' : selectedCat;
      a.download = `sentinel-fraud-eda-reports-${categoryLabel}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      triggerSuccessToast(`Successfully downloaded ZIP archive containing ${filteredReports.length} plots!`);
    } catch (err) {
      console.error('ZIP generation error:', err);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {downloadSuccessMessage && (
        <div className="bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{downloadSuccessMessage}</span>
          </div>
          <button
            onClick={() => setDownloadSuccessMessage(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-400" />
              Exploratory Data Analysis (EDA) & Model Visualizations
            </h2>
            <p className="text-xs text-slate-400">
              14 research artifacts generated by the project data pipeline under <span className="font-mono text-slate-300">reports/eda/</span>. Download individual plots or the full package.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Category Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setSelectedCat('all')}
                className={`px-2.5 py-1 rounded transition ${
                  selectedCat === 'all'
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Plots ({REPORTS_LIST.length})
              </button>
              <button
                onClick={() => setSelectedCat('eda')}
                className={`px-2.5 py-1 rounded transition ${
                  selectedCat === 'eda'
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Dataset EDA
              </button>
              <button
                onClick={() => setSelectedCat('model')}
                className={`px-2.5 py-1 rounded transition ${
                  selectedCat === 'model'
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                XGBoost Errors
              </button>
              <button
                onClick={() => setSelectedCat('anomaly')}
                className={`px-2.5 py-1 rounded transition ${
                  selectedCat === 'anomaly'
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Anomaly & Hybrid
              </button>
            </div>

            {/* Bulk Download ZIP Button */}
            <button
              onClick={handleDownloadZip}
              disabled={isDownloadingZip}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-medium transition shadow-sm"
              title="Download all displayed plots in a single compressed ZIP archive"
            >
              {isDownloadingZip ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Packaging ZIP...</span>
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" />
                  <span>Download All ({filteredReports.length}) as ZIP</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map(item => (
            <div
              key={item.id}
              onClick={() => setZoomedItem(item)}
              className="group bg-slate-950/70 border border-slate-800 hover:border-blue-500/50 rounded-xl overflow-hidden cursor-pointer transition shadow-sm hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="aspect-[4/3] bg-slate-900 overflow-hidden relative">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/0 transition" />
                  
                  {/* Floating Action Buttons on Top Right */}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleDownloadSingle(item, e)}
                      disabled={downloadingId === item.id}
                      className="bg-slate-900/90 hover:bg-blue-600 p-1.5 rounded-lg text-slate-200 hover:text-white transition shadow backdrop-blur-sm border border-slate-700/60 hover:border-blue-500"
                      title="Download this graph image (PNG)"
                    >
                      {downloadingId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <div 
                      className="bg-slate-900/90 p-1.5 rounded-lg text-slate-200 opacity-0 group-hover:opacity-100 transition shadow backdrop-blur-sm border border-slate-700/60"
                      title="Click card to zoom in full resolution"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition truncate">
                      {item.title}
                    </h4>
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0 font-mono">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Card Footer Download Action */}
              <div className="px-3.5 py-2.5 bg-slate-900/60 border-t border-slate-850 flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono text-[10px] text-slate-500 truncate max-w-[170px]">
                  {item.image.split('/').pop()}
                </span>
                <button
                  onClick={(e) => handleDownloadSingle(item, e)}
                  disabled={downloadingId === item.id}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium transition"
                >
                  <Download className="w-3 h-3" />
                  <span>Download PNG</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Zoom View */}
      {zoomedItem && (
        <div
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setZoomedItem(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{zoomedItem.title}</h3>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700">
                    {zoomedItem.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-2xl">{zoomedItem.description}</p>
              </div>

              <div className="flex items-center gap-2">
                {/* Modal Download Button */}
                <button
                  onClick={() => handleDownloadSingle(zoomedItem)}
                  disabled={downloadingId === zoomedItem.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition shadow"
                  title="Download this high-resolution image"
                >
                  {downloadingId === zoomedItem.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Graph (PNG)</span>
                    </>
                  )}
                </button>

                <a
                  href={zoomedItem.image}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                  title="Open image in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  onClick={() => setZoomedItem(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                  title="Close modal (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-950 flex items-center justify-center overflow-auto max-h-[72vh]">
              <img
                src={zoomedItem.image}
                alt={zoomedItem.title}
                className="max-h-full max-w-full object-contain rounded-lg shadow-md"
              />
            </div>

            <div className="p-3 bg-slate-900 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span className="font-mono text-[11px] text-slate-400">
                Asset Path: {zoomedItem.image}
              </span>
              <span className="text-slate-500 text-[11px]">
                Click outside or press Esc to close
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

