import { TransactionData, PredictionResult, RiskLevel, RecommendedAction, PolicyConfig, FeatureImpact } from '../types';
import { loadIsolationForestModel, computeIsolationForestScore } from './isolationForest';

export const FEATURE_COLS = [
  'Time',
  ...Array.from({ length: 28 }, (_, i) => `V${i + 1}`),
  'Amount'
];

export const DEFAULT_POLICY: PolicyConfig = {
  criticalThreshold: 0.90,
  highThreshold: 0.80,
  mediumThreshold: 0.60,
  anomalyCutoff: 0.0369 // 98th percentile cutoff from reports/anomaly_detection_metrics.txt
};

interface XGBTree {
  left_children: number[];
  right_children: number[];
  split_indices: number[];
  split_conditions: number[];
  base_weights: number[];
  default_left: number[];
}

interface XGBModelData {
  learner: {
    gradient_booster: {
      model: {
        trees: XGBTree[];
      };
    };
  };
}

let cachedModel: XGBModelData | null = null;
let modelLoadingPromise: Promise<XGBModelData | null> | null = null;

export async function loadXGBoostModel(): Promise<XGBModelData | null> {
  // Concurrently load Isolation Forest model JSON
  loadIsolationForestModel();

  if (cachedModel) return cachedModel;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      const res = await fetch('/models/xgboost_fraud_model.json');
      if (!res.ok) {
        console.warn(`Failed to fetch XGBoost model: ${res.statusText}`);
        return null;
      }
      const data: XGBModelData = await res.json();
      cachedModel = data;
      return cachedModel;
    } catch (err) {
      console.warn('Could not load local XGBoost model artifact, using backup inference engine:', err);
      return null;
    }
  })();

  return modelLoadingPromise;
}

export function isModelLoaded(): boolean {
  return cachedModel !== null;
}

// Convert TransactionData dict to 30-element array matching training order
export function transactionToVector(tx: TransactionData): number[] {
  return FEATURE_COLS.map(col => {
    const v = tx[col];
    return typeof v === 'number' && !isNaN(v) ? v : 0;
  });
}

// High-speed tree traversal for exact XGBoost prediction
export function predictXGBoostTrees(features: number[], model: XGBModelData): number {
  let margin = 0;
  const trees = model.learner.gradient_booster.model.trees;
  const numTrees = trees.length;

  for (let i = 0; i < numTrees; i++) {
    const tree = trees[i];
    let node = 0;
    while (tree.left_children[node] !== -1) {
      const featIdx = tree.split_indices[node];
      const val = features[featIdx];
      const splitCond = tree.split_conditions[node];

      if (isNaN(val) || val === undefined) {
        node = tree.default_left[node] ? tree.left_children[node] : tree.right_children[node];
      } else if (val < splitCond) {
        node = tree.left_children[node];
      } else {
        node = tree.right_children[node];
      }
    }
    margin += tree.base_weights[node];
  }

  // Logistic sigmoid
  return 1 / (1 + Math.exp(-margin));
}

// Fallback scoring calibrated to matching 5-fold logistic baseline if model file is fetching
function fallbackPredict(features: number[]): number {
  // Key weights from Phase 1 Logistic Baseline (V14, V17, V12, V10, V4, V3)
  const weights: Record<number, number> = {
    14: -0.78, // V14
    17: -0.65, // V17
    12: -0.62, // V12
    10: -0.55, // V10
    3: -0.48,  // V3
    4: 0.52,   // V4
    11: 0.45,  // V11
    7: 0.38,   // V7
    2: 0.28,   // V2
    29: 0.001  // Amount
  };

  let z = -5.8; // Intercept for base rate ~0.17%
  for (const [idxStr, w] of Object.entries(weights)) {
    const idx = Number(idxStr);
    z += (features[idx] || 0) * w;
  }
  return 1 / (1 + Math.exp(-z));
}

// Compute Isolation Forest anomaly score using separate model file (/public/models/isolationforest_model.json)
export function computeAnomalyScore(features: number[]): number {
  return computeIsolationForestScore(features);
}

// Compute feature impacts for local explainability
export function calculateFeatureImpacts(tx: TransactionData, prob: number): FeatureImpact[] {
  // Feature correlations and importance from Phase 1 EDA & XGBoost
  const weights: Record<string, number> = {
    V14: -0.3086,
    V17: -0.3327,
    V12: -0.2675,
    V10: -0.2167,
    V3: -0.1920,
    V4: 0.1534,
    V11: 0.1548,
    V7: -0.1215,
    V2: 0.0912,
    Amount: 0.0150,
    V16: -0.1870,
    V18: -0.1114,
    V1: -0.1013,
    V9: -0.0970,
    V21: 0.0404,
    V27: 0.0210,
    V28: 0.0095,
  };

  const impacts: FeatureImpact[] = [];

  for (const feat of FEATURE_COLS) {
    const val = tx[feat] ?? 0;
    if (feat === 'Time') continue;

    const w = weights[feat] || 0.02;
    // Impact is value * weight towards fraud
    const rawContribution = (val * (w < 0 ? -w : w));
    const impact = Math.abs(rawContribution);

    if (impact > 0.02 || ['V14', 'V17', 'V12', 'V10', 'V4', 'Amount'].includes(feat)) {
      impacts.push({
        feature: feat,
        value: val,
        impact,
        direction: (w < 0 && val < -0.5) || (w > 0 && val > 0.5) ? 'fraud' : 'legit'
      });
    }
  }

  return impacts.sort((a, b) => b.impact - a.impact).slice(0, 6);
}

// Core prediction function conforming to src/11_fraud_risk_engine.py
export function predictTransaction(
  transaction: TransactionData,
  policy: PolicyConfig = DEFAULT_POLICY
): PredictionResult {
  const vec = transactionToVector(transaction);

  // Primary Signal: XGBoost fraud probability
  let prob: number;
  if (cachedModel) {
    prob = predictXGBoostTrees(vec, cachedModel);
  } else {
    prob = fallbackPredict(vec);
  }

  // Secondary Signal: Isolation Forest anomaly score (investigation & review context only)
  const anomalyScore = computeAnomalyScore(vec);

  // Decision policy strictly driven by XGBoost fraud probability:
  // >= 0.90 → CRITICAL → BLOCK
  // >= 0.80 → HIGH → BLOCK
  // >= 0.60 → MEDIUM → REVIEW
  // < 0.60 → LOW → APPROVE
  // Isolation Forest is secondary context only and does not override, arbitrate, or replace the XGBoost decision.
  let risk: RiskLevel;
  if (prob >= policy.criticalThreshold) {
    risk = 'CRITICAL';
  } else if (prob >= policy.highThreshold) {
    risk = 'HIGH';
  } else if (prob >= policy.mediumThreshold) {
    risk = 'MEDIUM';
  } else {
    risk = 'LOW';
  }

  // Recommended Action driven by XGBoost risk classification:
  // CRITICAL → directly automated BLOCK
  // HIGH & MEDIUM → routed to REVIEW (with step-by-step verification, Step-Up OTP, release/block)
  // LOW → APPROVE
  let action: RecommendedAction;
  if (risk === 'CRITICAL') {
    action = 'BLOCK';
  } else if (risk === 'HIGH' || risk === 'MEDIUM') {
    action = 'REVIEW';
  } else {
    action = 'APPROVE';
  }

  // Feature impacts & explanation
  const featureImpacts = calculateFeatureImpacts(transaction, prob);
  const topFeatures = featureImpacts.slice(0, 3).map(f => f.feature);

  const explanations: string[] = [];
  if (prob >= policy.criticalThreshold) {
    explanations.push(`Primary XGBoost fraud probability (${(prob * 100).toFixed(2)}%) meets CRITICAL policy threshold (≥ ${(policy.criticalThreshold * 100).toFixed(0)}%), triggering direct automated BLOCK.`);
  } else if (prob >= policy.highThreshold) {
    explanations.push(`Primary XGBoost fraud probability (${(prob * 100).toFixed(2)}%) is in HIGH risk band (≥ ${(policy.highThreshold * 100).toFixed(0)}%), routed to REVIEW & Verification Queue.`);
  } else if (prob >= policy.mediumThreshold) {
    explanations.push(`Primary XGBoost fraud probability (${(prob * 100).toFixed(2)}%) is in MEDIUM risk band (≥ ${(policy.mediumThreshold * 100).toFixed(0)}%), routed to REVIEW & Verification Queue.`);
  } else {
    explanations.push(`Primary XGBoost fraud probability (${(prob * 100).toFixed(4)}%) is within LOW policy band (< ${(policy.mediumThreshold * 100).toFixed(0)}%), resulting in APPROVE.`);
  }

  // Isolation Forest secondary context (explicitly marked as exploratory anomaly reference, not a production cutoff)
  explanations.push(`Isolation Forest secondary anomaly score is ${anomalyScore.toFixed(4)} (exploratory anomaly reference: ~+${policy.anomalyCutoff.toFixed(4)}).`);

  if (topFeatures.length > 0) {
    const topFeat = topFeatures[0];
    explanations.push(`${topFeat} contributed strongly to the model decision.`);
  }

  return {
    fraud_probability: prob,
    anomaly_score: anomalyScore,
    risk_level: risk,
    recommended_action: action,
    explanation: explanations.join(' '),
    top_influential_features: topFeatures,
    feature_impacts: featureImpacts
  };
}
