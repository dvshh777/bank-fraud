export interface IsolationForestModelData {
  model_type: string;
  version: string;
  n_estimators: number;
  max_samples: number;
  contamination: number;
  baseline_metrics: {
    legitimate_mean: number;
    legitimate_std: number;
    caught_fraud_mean: number;
    missed_fraud_mean: number;
    anomaly_cutoff_98th: number;
    min_score: number;
    max_score: number;
  };
  feature_importance_weights: Record<string, number>;
  amount_anomaly_parameters: {
    threshold_amount: number;
    log_scale_factor: number;
    max_amount_contribution: number;
  };
  calibration_offset: number;
  calibration_scale: number;
}

let cachedIsoForestModel: IsolationForestModelData | null = null;
let isoForestLoadingPromise: Promise<IsolationForestModelData | null> | null = null;

export async function loadIsolationForestModel(): Promise<IsolationForestModelData | null> {
  if (cachedIsoForestModel) return cachedIsoForestModel;
  if (isoForestLoadingPromise) return isoForestLoadingPromise;

  isoForestLoadingPromise = (async () => {
    try {
      const res = await fetch('/models/isolationforest_model.json');
      if (!res.ok) {
        console.warn(`Failed to fetch Isolation Forest model file: ${res.statusText}`);
        return null;
      }
      const data: IsolationForestModelData = await res.json();
      cachedIsoForestModel = data;
      return cachedIsoForestModel;
    } catch (err) {
      console.warn('Could not load local Isolation Forest model artifact, using embedded fallback:', err);
      return null;
    }
  })();

  return isoForestLoadingPromise;
}

export function isIsolationForestLoaded(): boolean {
  return cachedIsoForestModel !== null;
}

export function computeIsolationForestScore(features: number[]): number {
  const model = cachedIsoForestModel;

  let sumSq = 0;
  const weights = model ? model.feature_importance_weights : null;

  for (let i = 1; i <= 28; i++) {
    const val = features[i] || 0;
    const featKey = `V${i}`;
    const w = weights && weights[featKey] !== undefined ? weights[featKey] : 0.05;
    sumSq += Math.pow(val * w, 2);
  }

  const amount = features[29] || 0;
  const threshAmount = model?.amount_anomaly_parameters?.threshold_amount ?? 500;
  const maxContrib = model?.amount_anomaly_parameters?.max_amount_contribution ?? 2.5;

  if (amount > threshAmount) {
    sumSq += Math.min(maxContrib, Math.log10(amount / threshAmount));
  }

  const offset = model?.calibration_offset ?? -0.1070;
  const scale = model?.calibration_scale ?? 0.11;
  const minScore = model?.baseline_metrics?.min_score ?? -0.1553;
  const maxScore = model?.baseline_metrics?.max_score ?? 0.2581;

  const rawScore = offset + (Math.sqrt(sumSq) * scale);
  return Math.min(maxScore, Math.max(minScore, rawScore));
}
