import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { BatchResultRow, PolicyConfig, UserRole, UserSession, CsvHistoryEntry } from '../types';
import { DEFAULT_POLICY } from '../lib/xgboost';
import { formatStandardTime } from '../lib/timeUtils';
import {
  fetchSharedCsvHistory,
  saveSharedCsvHistory,
  deleteSharedCsvHistory,
  checkAndRegisterUserRole
} from '../lib/firebase';

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
  isAutoBlocked?: boolean;
  resolutionNote?: string;
  resolvedAt?: string;
  rawRow?: BatchResultRow;
}

export interface AuditLogEntry {
  id: string;
  alertId: string;
  txId: string;
  action: 'BLOCKED' | 'APPROVED' | 'STEP_UP_PASSED' | 'STEP_UP_FAILED' | 'STEP_UP_DISPATCHED' | 'AUTO_BLOCKED';
  reason: string;
  analyst: string;
  timestamp: string;
  amount: number;
}

interface DataContextType {
  userSession: UserSession;
  loginAs: (role: UserRole, customName?: string, customEmail?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  datasetName: string | null;
  rows: BatchResultRow[];
  policy: PolicyConfig;
  setPolicy: React.Dispatch<React.SetStateAction<PolicyConfig>>;
  alerts: AlertTicket[];
  reviewAlerts: AlertTicket[];
  blockedAlerts: AlertTicket[];
  approvedAlerts: AlertTicket[];
  auditLogs: AuditLogEntry[];
  csvHistory: CsvHistoryEntry[];
  setDataset: (name: string, newRows: BatchResultRow[]) => void;
  appendSingleTransaction: (row: BatchResultRow) => void;
  clearDataset: () => void;
  updateAlertStatus: (
    alertId: string,
    status: 'BLOCKED' | 'APPROVED' | 'STEP_UP',
    details?: { reason?: string; actionType?: AuditLogEntry['action'] }
  ) => void;
  addAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
  deleteHistoryEntry: (id: string) => void;
  loadHistoryEntry: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const DEFAULT_ADMIN_USER: UserSession = {
  role: 'admin',
  name: 'Sarah Jenkins',
  email: 'admin@sentinel.bank',
  department: 'Risk Governance & Lead ML Operations',
  avatar: 'SJ'
};

const DEFAULT_EMPLOYEE_USER: UserSession = {
  role: 'employee',
  name: 'Alex Rivera',
  email: 'employee@sentinel.bank',
  department: 'Fraud Operations & Queue Analyst',
  avatar: 'AR'
};

const STORAGE_KEY_AUTH = 'sentinel_user_session_v4';
const STORAGE_KEY_SHARED_HISTORY = 'sentinel_shared_csv_history_v4';

export function getSanitizedUserId(email: string): string {
  return email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userSession, setUserSession] = useState<UserSession>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTH);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return DEFAULT_ADMIN_USER;
  });

  const [datasetName, setDatasetName] = useState<string | null>(null);
  const [rows, setRows] = useState<BatchResultRow[]>([]);
  const [policy, setPolicy] = useState<PolicyConfig>(DEFAULT_POLICY);
  const [alertStatusOverrides, setAlertStatusOverrides] = useState<
    Record<string, { status: 'BLOCKED' | 'APPROVED' | 'STEP_UP'; note?: string; resolvedAt?: string }>
  >({});
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [csvHistory, setCsvHistory] = useState<CsvHistoryEntry[]>([]);

  // Load shared institutional history on mount and session change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(userSession));
    } catch (e) {
      // ignore
    }

    // First try cached local history for immediate zero-lag rendering
    try {
      const cached = localStorage.getItem(STORAGE_KEY_SHARED_HISTORY);
      if (cached) {
        setCsvHistory(JSON.parse(cached));
      }
    } catch (e) {
      // ignore
    }

    // Fetch live shared institutional history from Firestore
    fetchSharedCsvHistory().then(items => {
      if (items && Array.isArray(items)) {
        setCsvHistory(items);
        try {
          localStorage.setItem(STORAGE_KEY_SHARED_HISTORY, JSON.stringify(items));
        } catch (e) {
          // ignore
        }
      }
    }).catch(err => {
      console.warn('Firestore fetch shared history error:', err);
    });

    // Ensure user profile & role lock is registered in Firestore
    const sanitizedId = getSanitizedUserId(userSession.email);
    checkAndRegisterUserRole(sanitizedId, userSession);
  }, [userSession.email, userSession.role, userSession.name]);

  const loginAs = async (
    role: UserRole,
    customName?: string,
    customEmail?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const targetEmail = (customEmail || (role === 'admin' ? DEFAULT_ADMIN_USER.email : DEFAULT_EMPLOYEE_USER.email)).toLowerCase().trim();
    const targetName = customName || (role === 'admin' ? DEFAULT_ADMIN_USER.name : DEFAULT_EMPLOYEE_USER.name);
    const department = role === 'admin' ? 'Risk Governance & Lead ML Operations' : 'Fraud Operations & Queue Analyst';
    const avatar = targetName.split(' ').map(n => n[0]).join('').toUpperCase() || (role === 'admin' ? 'AD' : 'EM');

    const sanitizedId = getSanitizedUserId(targetEmail);

    const proposedSession: UserSession = {
      role,
      name: targetName,
      email: targetEmail,
      department,
      avatar
    };

    // Verify role lock in Firestore
    const lockCheck = await checkAndRegisterUserRole(sanitizedId, proposedSession);
    if (!lockCheck.allowed) {
      return {
        success: false,
        error: lockCheck.error || `Email address '${targetEmail}' cannot be used for ${role.toUpperCase()} login.`
      };
    }

    setUserSession(proposedSession);
    setDatasetName(null);
    setRows([]);
    setAlertStatusOverrides({});

    return { success: true };
  };

  const logout = () => {
    loginAs('employee', DEFAULT_EMPLOYEE_USER.name, DEFAULT_EMPLOYEE_USER.email);
  };

  const setDataset = (name: string, newRows: BatchResultRow[]) => {
    setDatasetName(name);
    const sortedRows = [...newRows].sort((a, b) => a.Time - b.Time);
    setRows(sortedRows);
    setAlertStatusOverrides({});

    const totalCount = sortedRows.length;
    const fraudCount = sortedRows.filter(r => r.Class === 1 || r.xgb_probability >= policy.highThreshold).length;
    const blockedCount = sortedRows.filter(r => r.action === 'BLOCK').length;
    const reviewCount = sortedRows.filter(r => r.action === 'REVIEW').length;
    const approvedCount = sortedRows.filter(r => r.action === 'APPROVE').length;

    const now = new Date();
    const dateStr = now.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newHistoryItem: CsvHistoryEntry = {
      id: `BATCH-${Date.now().toString().slice(-6)}`,
      datasetName: name,
      timestamp: `${dateStr} at ${timeStr}`,
      createdAt: Date.now(),
      totalCount,
      fraudCount,
      approvedCount,
      reviewCount,
      blockedCount,
      policyUsed: { ...policy },
      rows: sortedRows
    };

    setCsvHistory(prev => {
      const updated = [newHistoryItem, ...prev.filter(item => item.datasetName !== name)];
      try {
        localStorage.setItem(STORAGE_KEY_SHARED_HISTORY, JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });

    const sanitizedId = getSanitizedUserId(userSession.email);
    saveSharedCsvHistory(sanitizedId, userSession.email, userSession.name, newHistoryItem);
  };

  const deleteHistoryEntry = (id: string) => {
    setCsvHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY_SHARED_HISTORY, JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });

    const sanitizedId = getSanitizedUserId(userSession.email);
    deleteSharedCsvHistory(sanitizedId, id);
  };

  const loadHistoryEntry = (id: string) => {
    const entry = csvHistory.find(item => item.id === id);
    if (entry) {
      setDatasetName(entry.datasetName);
      setRows(entry.rows);
      if (entry.policyUsed) {
        setPolicy(entry.policyUsed);
      }
      setAlertStatusOverrides({});
    }
  };

  const appendSingleTransaction = (row: BatchResultRow) => {
    setRows(prev => [...prev, row]);
  };

  const clearDataset = () => {
    setDatasetName(null);
    setRows([]);
    setAlertStatusOverrides({});
  };

  const addAuditLog = (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    const log: AuditLogEntry = {
      ...entry,
      id: `LOG-${Date.now().toString().slice(-6)}`,
      timestamp: formatStandardTime(Date.now() / 1000)
    };
    setAuditLogs(prev => [log, ...prev]);
  };

  const updateAlertStatus = (
    alertId: string,
    status: 'BLOCKED' | 'APPROVED' | 'STEP_UP',
    details?: { reason?: string; actionType?: AuditLogEntry['action'] }
  ) => {
    const resolvedAt = formatStandardTime(Date.now() / 1000);
    setAlertStatusOverrides(prev => ({
      ...prev,
      [alertId]: { status, note: details?.reason, resolvedAt }
    }));

    const alertItem = alerts.find(a => a.id === alertId);
    if (alertItem && details?.actionType) {
      addAuditLog({
        alertId: alertItem.id,
        txId: alertItem.txId,
        action: details.actionType,
        reason: details.reason || 'Manual status override',
        analyst: userSession.name,
        amount: alertItem.amount
      });
    }
  };

  const alerts: AlertTicket[] = useMemo(() => {
    if (rows.length === 0) return [];

    return rows
      .map((row, idx) => {
        const txId = `TX-${row.Time}`;
        const alertId = `ALT-${1000 + idx}`;
        const override = alertStatusOverrides[alertId];

        const prob = row.xgb_probability;
        const anomaly = row.anomaly_score;

        let risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' = 'MEDIUM';
        if (prob >= policy.criticalThreshold) {
          risk = 'CRITICAL';
        } else if (prob >= policy.highThreshold) {
          risk = 'HIGH';
        }

        const reasons: string[] = [];
        if (row.explanation) {
          reasons.push(row.explanation);
        } else {
          reasons.push(`XGBoost fraud probability (${(prob * 100).toFixed(1)}%)`);
        }

        if (anomaly > 0.5) {
          reasons.push(`Secondary Isolation Forest Anomaly (${(anomaly * 100).toFixed(1)}%)`);
        }

        let defaultStatus: AlertTicket['status'] = 'PENDING';
        if (risk === 'CRITICAL') {
          defaultStatus = 'BLOCKED';
        } else if (row.action === 'APPROVE') {
          defaultStatus = 'APPROVED';
        }

        const currentStatus = override ? override.status : defaultStatus;

        return {
          id: alertId,
          txId,
          timeSec: row.Time,
          amount: row.Amount,
          prob,
          anomaly,
          risk,
          reasons,
          status: currentStatus,
          timestamp: formatStandardTime(row.Time),
          isAutoBlocked: risk === 'CRITICAL' && !override,
          resolutionNote: override?.note,
          resolvedAt: override?.resolvedAt,
          rawRow: row
        };
      })
      .filter(a => a.prob >= policy.mediumThreshold || a.risk === 'CRITICAL' || a.status === 'BLOCKED')
      .sort((a, b) => a.timeSec - b.timeSec);
  }, [rows, policy, alertStatusOverrides]);

  const reviewAlerts = useMemo(() => {
    return alerts.filter(a => a.status === 'PENDING');
  }, [alerts]);

  const blockedAlerts = useMemo(() => {
    return alerts.filter(a => a.status === 'BLOCKED');
  }, [alerts]);

  const approvedAlerts = useMemo(() => {
    return alerts.filter(a => a.status === 'APPROVED');
  }, [alerts]);

  return (
    <DataContext.Provider
      value={{
        userSession,
        loginAs,
        logout,
        datasetName,
        rows,
        policy,
        setPolicy,
        alerts,
        reviewAlerts,
        blockedAlerts,
        approvedAlerts,
        auditLogs,
        csvHistory,
        setDataset,
        appendSingleTransaction,
        clearDataset,
        updateAlertStatus,
        addAuditLog,
        deleteHistoryEntry,
        loadHistoryEntry
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
};
