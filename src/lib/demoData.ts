import { DemoTransactionItem, TransactionData } from '../types';

export const DEMO_TRANSACTIONS: DemoTransactionItem[] = [
  {
    id: 'demo-low',
    name: 'Simulation Scenario 1: Baseline Low Probability',
    category: 'LOW',
    description: 'Simulation scenario representing low-probability transaction. Features V1-V28 remain near baseline with low amount, resulting in APPROVE.',
    features: {
      Time: 406.0,
      Amount: 14.50,
      V1: -0.92, V2: 0.18, V3: 1.55, V4: -0.22, V5: 0.38,
      V6: -0.15, V7: 0.42, V8: 0.12, V9: -0.35, V10: -0.18,
      V11: 0.41, V12: 0.05, V13: -0.32, V14: -0.25, V15: 0.88,
      V16: 0.14, V17: -0.08, V18: -0.19, V19: 0.22, V20: 0.05,
      V21: -0.12, V22: -0.25, V23: -0.05, V24: 0.18, V25: 0.35,
      V26: -0.11, V27: 0.02, V28: 0.01
    },
    expectedResult: {
      risk: 'LOW',
      action: 'APPROVE',
      expectedProb: '< 0.01%',
      anomalyStatus: 'Normal reference (-0.10)'
    }
  },
  {
    id: 'demo-med-review',
    name: 'Simulation Scenario 2: Moderate Probability (Review Band)',
    category: 'MEDIUM',
    description: 'Simulation scenario with moderate shifts in model-influential features. Primary XGBoost probability falls into the 0.60–0.80 MEDIUM band (~68.7%), routing to REVIEW.',
    features: {
      Time: 52140.0,
      Amount: 145.00,
      V1: -0.85, V2: 0.42, V3: -0.65, V4: 0.80, V5: -0.35,
      V6: -0.22, V7: -0.45, V8: 0.18, V9: -0.55, V10: -1.80,
      V11: 0.65, V12: -0.75, V13: 0.12, V14: -2.30, V15: -0.15,
      V16: -0.35, V17: -0.65, V18: -0.25, V19: 0.35, V20: 0.12,
      V21: 0.15, V22: -0.05, V23: -0.08, V24: -0.12, V25: 0.25,
      V26: 0.12, V27: 0.08, V28: -0.02
    },
    expectedResult: {
      risk: 'MEDIUM',
      action: 'REVIEW',
      expectedProb: '~68.7%',
      anomalyStatus: 'Secondary context for review'
    }
  },
  {
    id: 'demo-anomaly-review',
    name: 'Simulation Scenario 3: Elevated Anomaly Context',
    category: 'REVIEW',
    description: 'Simulation scenario with higher amount and geometric distance in V feature space, providing secondary anomaly context for review.',
    features: {
      Time: 86450.0,
      Amount: 1420.00,
      V1: 0.25, V2: -0.85, V3: 0.42, V4: 0.80, V5: -0.65,
      V6: 0.45, V7: -0.35, V8: 0.25, V9: -0.45, V10: -1.80,
      V11: 0.65, V12: -0.85, V13: 0.45, V14: -2.30, V15: -0.15,
      V16: -0.45, V17: -0.65, V18: 0.25, V19: -0.35, V20: 3.50,
      V21: 2.50, V22: -2.00, V23: -0.48, V24: -0.25, V25: 0.15,
      V26: -0.25, V27: 0.08, V28: 0.12
    },
    expectedResult: {
      risk: 'MEDIUM',
      action: 'REVIEW',
      expectedProb: '~64.6%',
      anomalyStatus: 'Elevated anomaly context'
    }
  },
  {
    id: 'demo-high',
    name: 'Simulation Scenario 4: High Fraud Probability Pattern',
    category: 'HIGH',
    description: 'Simulation scenario with strong negative shifts across model-influential features V14, V17, and V12. Primary XGBoost probability > 0.80 triggers automated BLOCK.',
    features: {
      Time: 71200.0,
      Amount: 99.99,
      V1: -3.85, V2: 2.85, V3: -4.15, V4: 3.45, V5: -2.85,
      V6: -1.65, V7: -4.12, V8: 1.95, V9: -2.65, V10: -4.85,
      V11: 3.15, V12: -5.12, V13: 0.45, V14: -5.85, V15: -0.65,
      V16: -3.95, V17: -5.45, V18: -1.85, V19: 1.25, V20: 0.65,
      V21: 0.85, V22: -0.35, V23: -0.42, V24: -0.15, V25: 0.65,
      V26: 0.35, V27: 0.65, V28: 0.22
    },
    expectedResult: {
      risk: 'HIGH',
      action: 'BLOCK',
      expectedProb: '~85-89%',
      anomalyStatus: 'High anomaly context'
    }
  },
  {
    id: 'demo-critical',
    name: 'Simulation Scenario 5: Critical Fraud Probability Pattern',
    category: 'CRITICAL',
    description: 'Simulation scenario with severe negative deviations on V14, V17, V10, and V12. Primary XGBoost probability >= 0.90 triggers automated BLOCK.',
    features: {
      Time: 94250.0,
      Amount: 180.50,
      V1: -6.25, V2: 4.85, V3: -7.23, V4: 4.95, V5: -5.15,
      V6: -2.35, V7: -6.85, V8: 3.15, V9: -4.25, V10: -5.81,
      V11: 4.85, V12: -6.45, V13: 0.25, V14: -7.15, V15: -0.85,
      V16: -5.45, V17: -6.84, V18: -2.65, V19: 1.85, V20: 1.15,
      V21: 1.45, V22: -0.65, V23: -0.85, V24: -0.25, V25: 0.95,
      V26: 0.45, V27: 0.95, V28: 0.35
    },
    expectedResult: {
      risk: 'CRITICAL',
      action: 'BLOCK',
      expectedProb: '> 99.5%',
      anomalyStatus: 'Critical anomaly context'
    }
  }
];

// Presets for quick-fill in Single Transaction Tab
export const QUICK_PRESETS = [
  {
    label: 'Simulation Scenario: Baseline Values',
    values: DEMO_TRANSACTIONS[0].features
  },
  {
    label: 'Simulation Scenario: Higher Amount ($850.00)',
    values: {
      ...DEMO_TRANSACTIONS[0].features,
      Amount: 850.00,
      Time: 3600 * 14,
      V2: 0.45, V7: 0.85, V20: 0.35
    }
  },
  {
    label: 'Simulation Scenario: Moderate Signal (Review)',
    values: DEMO_TRANSACTIONS[1].features
  },
  {
    label: 'Simulation Scenario: Elevated Anomaly Ref',
    values: DEMO_TRANSACTIONS[2].features
  },
  {
    label: 'Simulation Scenario: Critical Probability',
    values: DEMO_TRANSACTIONS[4].features
  }
];

// Generate calibrated sample batch CSV content covering APPROVE, REVIEW, and BLOCK
export function generateSampleCsvContent(): string {
  const headers = ['Time', ...Array.from({ length: 28 }, (_, i) => `V${i + 1}`), 'Amount', 'Class'];
  const rows: string[] = [headers.join(',')];

  const calibratedDataset: Array<{ Time: number; Amount: number; Class: number; features?: Record<string, number> }> = [
    // 1-5: APPROVE (Low Risk, Class 0)
    { Time: 406.0, Amount: 14.50, Class: 0, features: { V1: -0.92, V2: 0.18, V3: 1.55, V4: -0.22, V5: 0.38, V7: 0.42, V11: 0.41, V14: -0.25 } },
    { Time: 1240.0, Amount: 4.85, Class: 0, features: { V1: 0.15, V2: -0.05, V3: 0.85, V4: -0.10, V5: 0.20, V7: 0.18, V11: 0.18, V14: -0.12 } },
    { Time: 5800.0, Amount: 62.30, Class: 0, features: { V1: -0.25, V2: 0.45, V3: -0.15, V4: 0.12, V5: 0.10, V7: 0.22, V11: 0.25, V14: -0.20 } },
    { Time: 14200.0, Amount: 12.99, Class: 0, features: { V1: 0.05, V2: -0.12, V3: 0.35, V4: -0.05, V5: 0.18, V7: 0.15, V11: 0.12, V14: -0.15 } },
    { Time: 28900.0, Amount: 45.00, Class: 0, features: { V1: -0.45, V2: 0.22, V3: 0.65, V4: -0.18, V5: 0.25, V7: 0.30, V11: 0.30, V14: -0.18 } },

    // 6-8: REVIEW (Medium Risk ~64-69%, Review Actions)
    { Time: 52140.0, Amount: 145.00, Class: 0, features: { V4: 0.80, V10: -1.80, V14: -2.30, V1: -0.85, V2: 0.42, V3: -0.65 } },
    { Time: 58900.0, Amount: 195.00, Class: 1, features: { V4: 0.80, V10: -1.80, V14: -2.30, V17: -0.80, V1: -0.80, V2: 0.38 } },
    { Time: 86450.0, Amount: 1420.00, Class: 0, features: { V4: 0.80, V10: -1.80, V14: -2.30, V20: 3.50, V21: 2.50, V22: -2.00 } },

    // 9-10: BLOCK (High Risk ~83-88%, Class 1)
    { Time: 71200.0, Amount: 99.99, Class: 1, features: { V4: 1.00, V10: -1.50, V12: -2.20, V14: -3.70, V17: -1.95 } },
    { Time: 75400.0, Amount: 150.00, Class: 1, features: { V4: 1.10, V10: -1.60, V12: -2.30, V14: -3.80, V17: -2.05 } },

    // 11-13: BLOCK (Critical Risk > 99%, Class 1)
    { Time: 89000.0, Amount: 280.00, Class: 1, features: { V4: 3.00, V10: -3.50, V12: -4.00, V14: -5.50, V17: -4.50 } },
    { Time: 94250.0, Amount: 180.50, Class: 1, features: { V1: -6.25, V2: 4.85, V3: -7.23, V4: 4.95, V10: -5.81, V12: -6.45, V14: -7.15, V17: -6.84 } },
    { Time: 98100.0, Amount: 310.00, Class: 1, features: { V4: 3.50, V10: -4.20, V12: -4.80, V14: -6.20, V17: -5.10 } }
  ];

  for (const item of calibratedDataset) {
    const vVals = Array.from({ length: 28 }, (_, k) => {
      const vKey = `V${k + 1}`;
      const val = item.features?.[vKey] ?? 0;
      return val.toFixed(4);
    });
    rows.push([item.Time.toFixed(0), ...vVals, item.Amount.toFixed(2), item.Class.toString()].join(','));
  }

  return rows.join('\n');
}
