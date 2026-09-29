export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RecommendedAction = 'APPROVE' | 'REVIEW' | 'BLOCK';

export interface TransactionData {
  Time: number;
  Amount: number;
  [key: string]: any;
}

export interface FeatureImpact {
  feature: string;
  value: number;
  impact: number;
  direction: 'fraud' | 'legit';
}

export interface PredictionResult {
  fraud_probability: number;
  anomaly_score: number;
  risk_level: RiskLevel;
  recommended_action: RecommendedAction;
  explanation: string;
  top_influential_features: string[];
  feature_impacts?: FeatureImpact[];
}

export interface DemoTransactionItem {
  id: string;
  name: string;
  category: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'REVIEW';
  description: string;
  features: TransactionData;
  expectedResult: {
    risk: RiskLevel;
    action: RecommendedAction;
    expectedProb: string;
    anomalyStatus: string;
  };
}

export interface PolicyConfig {
  criticalThreshold: number;
  highThreshold: number;
  mediumThreshold: number;
  anomalyCutoff: number; // e.g. 0.0369 (top 2% cutoff)
}

export interface BatchResultRow {
  Time: number;
  Amount: number;
  xgb_probability: number;
  anomaly_score: number;
  risk_level: RiskLevel;
  action: RecommendedAction;
  explanation: string;
  Class?: number;
  [key: string]: any;
}
