import { DemoTransactionItem, TransactionData } from '../types';

export const DEMO_TRANSACTIONS: DemoTransactionItem[] = [
  {
    id: 'demo-low',
    name: 'Row #1: Everyday Coffee Purchase',
    category: 'LOW',
    description: 'Typical normal retail transaction. PCA values cluster near 0, standard low retail amount, minimal deviation.',
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
      anomalyStatus: 'Normal (-0.10)'
    }
  },
  {
    id: 'demo-med-review',
    name: 'Row #2: Borderline Secondary Review',
    category: 'MEDIUM',
    description: 'Transaction with moderate negative deviations on V10 and V12. Primary XGBoost probability falls into the 60-80% MEDIUM band, triggering secondary anomaly triage.',
    features: {
      Time: 52140.0,
      Amount: 245.00,
      V1: -1.85, V2: 1.12, V3: -1.45, V4: 1.82, V5: -0.95,
      V6: -0.72, V7: -1.35, V8: 0.88, V9: -1.15, V10: -2.45,
      V11: 1.65, V12: -2.35, V13: 0.12, V14: -2.85, V15: -0.45,
      V16: -1.25, V17: -1.85, V18: -0.65, V19: 0.75, V20: 0.32,
      V21: 0.42, V22: -0.15, V23: -0.18, V24: -0.22, V25: 0.45,
      V26: 0.25, V27: 0.18, V28: -0.08
    },
    expectedResult: {
      risk: 'MEDIUM',
      action: 'REVIEW',
      expectedProb: '~60-75%',
      anomalyStatus: 'Elevated anomaly check'
    }
  },
  {
    id: 'demo-anomaly-review',
    name: 'Row #3: Outlier Review (High Isolation Score)',
    category: 'REVIEW',
    description: 'Large purchase amount with elevated distance in PCA space. Anomaly score exceeds 98th percentile cutoff (+0.0369), flagged for compliance verification.',
    features: {
      Time: 86450.0,
      Amount: 1420.00,
      V1: 0.85, V2: -2.15, V3: 0.42, V4: -0.85, V5: -1.65,
      V6: 1.45, V7: -1.15, V8: 0.35, V9: -0.45, V10: 1.15,
      V11: 0.65, V12: -0.85, V13: 1.25, V14: -1.95, V15: -0.15,
      V16: -0.45, V17: -0.95, V18: 0.45, V19: -0.85, V20: 0.95,
      V21: 0.35, V22: 0.42, V23: -0.48, V24: -0.65, V25: 0.15,
      V26: -0.25, V27: 0.08, V28: 0.12
    },
    expectedResult: {
      risk: 'MEDIUM',
      action: 'REVIEW',
      expectedProb: '~62%',
      anomalyStatus: 'Exceeds cutoff (> +0.0369)'
    }
  },
  {
    id: 'demo-high',
    name: 'Row #4: High-Risk Sybil Pattern',
    category: 'HIGH',
    description: 'Distinctive fraud signature with severe negative shifts across V14, V17, and V12. Probability > 80% warrants automated blocking.',
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
      anomalyStatus: 'High (+0.08)'
    }
  },
  {
    id: 'demo-critical',
    name: 'Row #5: Critical Account Takeover Attack',
    category: 'CRITICAL',
    description: 'Extreme fraud vector. V14 = -7.2, V17 = -6.8, V10 = -5.8, V12 = -6.4. Model probability is near 100% (CRITICAL risk), immediate BLOCK.',
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
      anomalyStatus: 'Critical (+0.14)'
    }
  }
];

// Presets for quick-fill in Single Transaction Tab
export const QUICK_PRESETS = [
  {
    label: 'Standard Grocery ($32.40)',
    values: DEMO_TRANSACTIONS[0].features
  },
  {
    label: 'Large Electronics ($850.00)',
    values: {
      ...DEMO_TRANSACTIONS[0].features,
      Amount: 850.00,
      Time: 3600 * 14,
      V2: 0.45, V7: 0.85, V20: 0.35
    }
  },
  {
    label: 'Medium Risk Review Candidate',
    values: DEMO_TRANSACTIONS[1].features
  },
  {
    label: 'High Risk Outlier',
    values: DEMO_TRANSACTIONS[2].features
  },
  {
    label: 'Confirmed Fraud Attack (Critical)',
    values: DEMO_TRANSACTIONS[4].features
  }
];

// Generate sample batch CSV content
export function generateSampleCsvContent(): string {
  const headers = ['Time', ...Array.from({ length: 28 }, (_, i) => `V${i + 1}`), 'Amount', 'Class'];
  const rows: string[] = [headers.join(',')];

  // Include our demo transactions
  for (let i = 0; i < DEMO_TRANSACTIONS.length; i++) {
    const item = DEMO_TRANSACTIONS[i];
    const rowVals = [
      item.features.Time,
      ...Array.from({ length: 28 }, (_, k) => (item.features[`V${k + 1}`] ?? 0).toFixed(4)),
      item.features.Amount.toFixed(2),
      item.category === 'CRITICAL' || item.category === 'HIGH' ? '1' : '0'
    ];
    rows.push(rowVals.join(','));
  }

  // Add 10 additional varied transactions
  for (let j = 1; j <= 10; j++) {
    const isFraud = j === 7 || j === 9;
    const time = 10000 + j * 5400;
    const amount = isFraud ? (80 + j * 15) : (15 + (j % 4) * 22.5);
    const vVals = Array.from({ length: 28 }, (_, k) => {
      if (isFraud) {
        if (k === 13) return (-4.5 - Math.random() * 2).toFixed(4); // V14
        if (k === 16) return (-4.0 - Math.random() * 2).toFixed(4); // V17
        if (k === 11) return (-3.5 - Math.random() * 2).toFixed(4); // V12
        if (k === 9) return (-3.0 - Math.random() * 2).toFixed(4);  // V10
        if (k === 3) return (2.5 + Math.random() * 1.5).toFixed(4); // V4
      }
      return ((Math.random() - 0.5) * 1.2).toFixed(4);
    });

    rows.push([time, ...vVals, amount.toFixed(2), isFraud ? '1' : '0'].join(','));
  }

  return rows.join('\n');
}
