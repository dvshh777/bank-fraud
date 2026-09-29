import React, { createContext, useContext, useState, useMemo } from 'react';
import { BatchResultRow, PolicyConfig } from '../types';
import { DEFAULT_POLICY } from '../lib/xgboost';

export interface AlertTicket {
  id: string;
  txId: string;
  timeSec: number;
  amount: number;
  prob: number;
  anomaly: number;
  risk: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  reasons: string[];
  status: 'PENDING' | 'BLOCKED' | 'APPROVED' | 'STEP_UP';
  timestamp: string;
  resolutionNote?: string;
  resolvedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  alertId: string;
  txId: string;
  action: 'BLOCKED' | 'APPROVED' | 'STEP_UP_PASSED' | 'STEP_UP_FAILED' | 'STEP_UP_DISPATCHED';
  reason: string;
  analyst: string;
  timestamp: string;
  amount: number;
}

interface DataContextType {
  datasetName: string | null;
  rows: BatchResultRow[];
  policy: PolicyConfig;
  setPolicy: React.Dispatch<React.SetStateAction<PolicyConfig>>;
  alerts: AlertTicket[];
  auditLogs: AuditLogEntry[];
  setDataset: (name: string, newRows: BatchResultRow[]) => void;
  appendSingleTransaction: (row: BatchResultRow) => void;
  clearDataset: () => void;
  updateAlertStatus: (
    alertId: string,
    status: 'BLOCKED' | 'APPROVED' | 'STEP_UP',
    details?: { reason?: string; actionType?: AuditLogEntry['action'] }
  ) => void;
  addAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [datasetName, setDatasetName] = useState<string | null>(null);
  const [rows, setRows] = useState<BatchResultRow[]>([]);
  const [policy, setPolicy] = useState<PolicyConfig>(DEFAULT_POLICY);
  const [alertStatusOverrides, setAlertStatusOverrides] = useState<
    Record<string, { status: 'BLOCKED' | 'APPROVED' | 'STEP_UP'; note?: string; resolvedAt?: string }>
  >({});
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const setDataset = (name: string, newRows: BatchResultRow[]) => {
    setDatasetName(name);
    setRows(newRows);
    setAlertStatusOverrides({});
  };

  const appendSingleTransaction = (row: BatchResultRow) => {
    setRows(prev => [row, ...prev]);
    if (!datasetName) {
      setDatasetName('Live Single Transaction Session');
    }
  };

  const clearDataset = () => {
    setDatasetName(null);
    setRows([]);
    setAlertStatusOverrides({});
    setAuditLogs([]);
  };

  const addAuditLog = (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newLog: AuditLogEntry = {
      ...entry,
      id: `LOG-${Date.now().toString().slice(-5)}`,
      timestamp: timeStr
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const updateAlertStatus = (
    alertId: string,
    status: 'BLOCKED' | 'APPROVED' | 'STEP_UP',
    details?: { reason?: string; actionType?: AuditLogEntry['action'] }
  ) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setAlertStatusOverrides(prev => ({
      ...prev,
      [alertId]: {
        status,
        note: details?.reason,
        resolvedAt: timeStr
      }
    }));

    // Find alert details for audit log
    const targetRow = rows.find((_, idx) => `ALT-${(1000 + idx).toString()}` === alertId);
    const txId = targetRow ? `TX-${targetRow.Time}` : alertId;
    const amount = targetRow ? targetRow.Amount : 0;

    addAuditLog({
      alertId,
      txId,
      action: details?.actionType || (status === 'BLOCKED' ? 'BLOCKED' : status === 'APPROVED' ? 'APPROVED' : 'STEP_UP_DISPATCHED'),
      reason: details?.reason || `Manual analyst override to ${status}`,
      analyst: 'Divesh (Senior Fraud Specialist)',
      amount
    });
  };

  // Derive alert tickets from analyzed dataset
  const alerts = useMemo(() => {
    if (rows.length === 0) return [];

    return rows
      .map((row, index) => {
        const isHighProb = row.xgb_probability >= policy.mediumThreshold;
        const isBlock = row.action === 'BLOCK';
        const isReview = row.action === 'REVIEW';

        if (!isHighProb && !isBlock && !isReview) return null;

        const ticketId = `ALT-${(1000 + index).toString()}`;
        const reasons: string[] = [];
        
        if (row.xgb_probability >= policy.criticalThreshold) {
          reasons.push(`Critical fraud probability (${(row.xgb_probability * 100).toFixed(1)}%) exceeds ${policy.criticalThreshold * 100}% threshold`);
        } else if (row.xgb_probability >= policy.highThreshold) {
          reasons.push(`High fraud probability (${(row.xgb_probability * 100).toFixed(1)}%) in automated block band`);
        } else {
          reasons.push(`Moderate risk score (${(row.xgb_probability * 100).toFixed(1)}%) routed for compliance review`);
        }

        if (row.anomaly_score > policy.anomalyCutoff) {
          reasons.push(`Elevated Isolation Forest anomaly score (+${row.anomaly_score.toFixed(3)})`);
        }
        if (row.Amount > 500) {
          reasons.push(`High transaction amount ($${row.Amount.toFixed(2)})`);
        }

        const risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' =
          row.risk_level === 'CRITICAL' ? 'CRITICAL' :
          row.risk_level === 'HIGH' ? 'HIGH' : 'MEDIUM';

        const override = alertStatusOverrides[ticketId];

        return {
          id: ticketId,
          txId: `TX-${row.Time}`,
          timeSec: row.Time,
          amount: row.Amount,
          prob: row.xgb_probability,
          anomaly: row.anomaly_score,
          risk,
          reasons,
          status: override ? override.status : 'PENDING',
          resolutionNote: override?.note,
          resolvedAt: override?.resolvedAt,
          timestamp: `T+${row.Time}s`
        } as AlertTicket;
      })
      .filter((ticket): ticket is AlertTicket => ticket !== null);
  }, [rows, policy, alertStatusOverrides]);

  return (
    <DataContext.Provider
      value={{
        datasetName,
        rows,
        policy,
        setPolicy,
        alerts,
        auditLogs,
        setDataset,
        appendSingleTransaction,
        clearDataset,
        updateAlertStatus,
        addAuditLog
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useDataContext = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
};
