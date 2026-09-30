# SENTINEL — Institutional Fraud Intelligence & Risk Decisioning Platform

**SENTINEL** is a high-performance, real-time banking fraud detection and risk decisioning platform powered by a dual-engine ensemble machine learning architecture (**XGBoost Classifier + Isolation Forest Secondary Anomaly Detector**). It provides sub-millisecond inference, dynamic risk policy calibration, full audit trail compliance, Firebase cloud persistence, and role-locked operational workflows for financial institutions.

---

## 🌟 Key Capabilities & Features

### 1. Dual Operational Role System with Strict Firebase Role Locking
- **Administrator Profile (`Admin`)**:
  * **Full Executive & Governance Access**: Manage ML model parameters, threshold policy calibration, real-time transaction streaming, model benchmark metrics, feature analytics, and rules governance.
  * **Admin CSV Analysis History Database**: Central Firebase Firestore repository storing all past CSV batch analysis runs. Supports 1-click batch restoration into active memory and CSV report exports.
- **Employee Analyst Terminal (`Employee`)**:
  * **Persistent Left Side Panel**: Integrated left sidebar displaying the **Admin CSV Analysis History Database** with search, batch stats, and 1-click batch inspection.
  * **Auto-Approved Transactions List**: Clean view of low-risk transactions cleared automatically by model policies (`P(Fraud) < 60%`).
  * **In-Review Queue & Flagged / Blocked List**: Inspect pending step-up verification alerts and blocked transactions.
  * **Transaction Inspector**: Search any transaction by Alert ID (`ALT-1001`), Transaction ID (`TX-0406`), Batch ID (`BATCH-849201`), Amount, Risk Tier, or ML Explanation.
  * **Read-Only Governance**: Decision override and block release controls are strictly restricted to Administrators.
- **Strict Cloud Role-Locking**:
  * Once an email is registered under a role (e.g., `admin@sentinel.bank`), Firebase Firestore locks that user profile (`/users/{sanitizedEmail}`).
  * Logging in with the same email under a conflicting role is automatically blocked and flagged with an authentication error.

---

## 🤖 Dual Model Artifact Architecture

The platform uses two separate model files located in `/models/` and `/public/models/`:

1. **Primary Model File — XGBoost Decision Tree Ensemble** (`/models/xgboost_fraud_model.json` & `/public/models/xgboost_fraud_model.json`):
   * Evaluates feature vectors (`Time`, `Amount`, `V1`–`V28` PCA components) across 300 gradient-boosted decision trees.
   * Generates continuous fraud probability score $P(\text{Fraud}) \in [0, 1]$.
   * Evaluates precision-recall AUC baseline of **0.8473**.

2. **Secondary Model File — Isolation Forest Anomaly Detector** (`/models/isolationforest_model.json` & `/public/models/isolationforest_model.json`):
   * Evaluates multi-dimensional point isolation distance in PCA feature space.
   * Loaded via `src/lib/isolationForest.ts` to compute secondary anomaly scores ($[-0.1553, +0.2581]$).
   * Provides supplementary anomaly context for ambiguous decision bands without overriding primary risk policies.

---

## 🏢 Core Dashboards & Modules

- **Executive Dashboard (`OverviewTab`)**: Top-level KPI metrics (Total Analyzed, Fraud Volume %, Active Alerts, Blocked Capital, Average Inference Latency).
- **Alerts & Decision Queue (`FraudAlertsTab`)**: Real-time alert feed with 2FA Step-Up OTP challenges, card freeze triggers, and compliance audit trail logging.
- **Transaction Inspector (`SingleTransactionTab`)**: Manual 30-feature vector input form with preset scenarios and top feature contribution drivers.
- **Employee Inspector Terminal (`EmployeePortalTab`)**: Responsive 2-column layout featuring a **Left Side History Panel** and **Right Side Queue Inspector**.
- **Admin CSV History Database (`AdminHistoryTab`)**: Centralized cloud repository of past CSV batch scoring runs with dataset metadata, class ratios, and historical restore capabilities.
- **Batch CSV Scoring (`BatchCsvTab`)**: Bulk file ingestion for multi-thousand transaction datasets with instant score output and report generation.
- **Real-Time Stream Engine (`DemoTransactionsTab`)**: Live stream simulation generating continuous transactions at configurable speeds.
- **Model Benchmarks & Metrics (`BenchmarkTab`)**: Stratified 5-Fold Cross-Validation, Precision-Recall AUC curves, confusion matrices, and model optimization playbooks.
- **Policy Calibration Simulator (`ThresholdSimulatorTab`)**: Interactive threshold sliders allowing risk managers to model Precision vs. Recall financial trade-offs in real time.

---

## 🛠️ Tech Stack & Architecture

- **Frontend Framework**: React 18 + Vite (TypeScript)
- **Styling**: Tailwind CSS (Financial dark-mode palette)
- **Icons**: Lucide React
- **ML Engines**: Client-side compiled XGBoost predictor (`src/lib/xgboost.ts`) + Isolation Forest anomaly engine (`src/lib/isolationForest.ts`)
- **Cloud Database & Auth**: Firebase Firestore & Firebase Auth (`src/lib/firebase.ts`)
- **Environment Management**: `.env` and `.env.example` with `VITE_FIREBASE_*` configuration variables

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### Installation & Development

```bash
# 1. Clone repository
git clone https://github.com/your-org/sentinel-fraud-platform.git
cd sentinel-fraud-platform

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

The application will launch on `http://localhost:3000`.

### Environment Configuration (`.env`)
Create or edit your `.env` file in the root directory:
```env
PORT=3000

# Firebase Database & Authentication Credentials
VITE_FIREBASE_PROJECT_ID="absolute-episode-kghtt"
VITE_FIREBASE_APP_ID="1:839330886716:web:a058fa2d5dd1e7f10c3f39"
VITE_FIREBASE_API_KEY="AIzaSyCI_WIeB7SRP_W3eWV9ttHuPv7oXnVD_lI"
VITE_FIREBASE_AUTH_DOMAIN="absolute-episode-kghtt.firebaseapp.com"
VITE_FIREBASE_DATABASE_ID="ai-studio-sentinelfraudpla-d75add32-f7df-4fba-a1d4-531393627860"
VITE_FIREBASE_STORAGE_BUCKET="absolute-episode-kghtt.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="839330886716"
```

### Production Build

```bash
# Run TypeScript validation & build production bundle
npm run build

# Preview production build
npm run preview
```

---

## 📊 Performance & Baseline Specifications

| Metric / Specification | Value / Description |
| :--- | :--- |
| **Training Records** | 199,364 transactions |
| **Class Imbalance** | 344 Fraud Cases (**0.1725% Fraud Rate**) |
| **Input Feature Vector** | `Time`, `Amount`, `V1`–`V28` (PCA transformed) |
| **Primary Model File** | `/models/xgboost_fraud_model.json` |
| **Secondary Model File** | `/models/isolationforest_model.json` |
| **Primary Metric** | **Precision-Recall AUC (PR-AUC)** |
| **OOF PR-AUC (XGBoost)** | **0.8473** |
| **OOF ROC-AUC (XGBoost)** | **0.9801** |
| **Inference Latency** | **< 0.85 ms / transaction** |

---

## 🔒 Security & Governance Statement

* **Role Separation & Role Locks**: Administrative controls require `Admin` authentication. User role registrations are enforced and locked via Firebase Firestore.
* **Immutable Audit Log**: Every transaction state transition (Approval, Block, Step-Up OTP Verification) is logged in compliance records.
* **Reference Policy**: Default risk policy thresholds (`LOW < 0.60`, `MEDIUM 0.60–0.80`, `HIGH 0.80–0.90`, `CRITICAL ≥ 0.90`) are configurable baselines designed for demonstration and institutional calibration.

---

*SENTINEL Fraud Intelligence Platform — Enterprise ML Security Architecture*
