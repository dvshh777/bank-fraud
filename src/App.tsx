import React, { useState, useEffect } from 'react';
import { DataProvider, useDataContext } from './context/DataContext';
import { OverviewTab } from './components/OverviewTab';
import { FraudAlertsTab } from './components/FraudAlertsTab';
import { SingleTransactionTab } from './components/SingleTransactionTab';
import { BatchCsvTab } from './components/BatchCsvTab';
import { DemoTransactionsTab } from './components/DemoTransactionsTab';
import { ThresholdSimulatorTab } from './components/ThresholdSimulatorTab';
import { DataVisualizationTab } from './components/DataVisualizationTab';
import { ArchitectureTab } from './components/ArchitectureTab';
import { loadXGBoostModel } from './lib/xgboost';
import {
  ShieldCheck,
  ShieldAlert,
  LayoutDashboard,
  Search,
  Layers,
  SlidersHorizontal,
  Clock,
  BarChart3,
  FileText,
  AlertTriangle,
  Database,
  Menu,
  X
} from 'lucide-react';

type TabId =
  | 'overview'
  | 'alerts'
  | 'investigate'
  | 'batch'
  | 'simulation'
  | 'threshold'
  | 'intelligence'
  | 'architecture';

function MainAppLayout() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [modelLoaded, setModelLoaded] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const { datasetName, rows, policy, setPolicy, alerts } = useDataContext();

  useEffect(() => {
    loadXGBoostModel().then(model => {
      if (model) {
        setModelLoaded(true);
      }
    });
  }, []);

  const totalCount = rows.length;
  const fraudCount = rows.filter(r => r.Class === 1 || r.xgb_probability >= policy.highThreshold).length;
  const fraudPct = totalCount > 0 ? ((fraudCount / totalCount) * 100).toFixed(1) : '0.0';

  const navItems: Array<{ id: TabId; label: string; icon: React.ElementType; badge?: string; badgeColor?: string }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    {
      id: 'alerts',
      label: 'Fraud Alerts',
      icon: ShieldAlert,
      badge: alerts.length > 0 ? `${alerts.length}` : undefined,
      badgeColor: 'bg-red-500 text-white animate-pulse'
    },
    { id: 'investigate', label: 'Investigate', icon: Search },
    { id: 'batch', label: 'Batch Analysis', icon: Layers },
    { id: 'simulation', label: 'Live Simulation', icon: SlidersHorizontal },
    { id: 'threshold', label: 'Threshold Simulator', icon: Clock },
    { id: 'intelligence', label: 'Data Visualization', icon: BarChart3 },
    { id: 'architecture', label: 'Architecture & Policy', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 flex flex-col md:flex-row selection:bg-blue-600 selection:text-white antialiased">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-30 w-64 h-screen bg-[#0c1222] border-r border-slate-800/90 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-5 space-y-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25 border border-blue-400/30">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-wider text-white font-sans">SENTINEL</h1>
                <p className="text-[11px] font-medium text-cyan-400/90 tracking-tight">Fraud Intelligence</p>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom System Status Widget */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </div>
            <div className="text-[11px]">
              <div className="font-semibold text-white">System Online</div>
              <div className="text-[10px] text-slate-400">
                {totalCount > 0 ? `${totalCount.toLocaleString()} TX Processed` : 'Awaiting Data Ingestion'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header / App Bar */}
        <header className="sticky top-0 z-20 bg-[#0a0f1d]/90 backdrop-blur-md border-b border-slate-800/90 px-4 sm:px-6 py-3.5">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Mobile Toggle & Page Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white md:hidden"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 via-purple-500 to-pink-500 items-center justify-center text-white shadow-md shadow-purple-500/20">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                    Banking Fraud Detection Platform
                  </h2>
                  <p className="text-[11px] text-slate-400 hidden sm:block">
                    Primary: XGBoost (PR-AUC 0.8473) &bull; Secondary: Isolation Forest (Anomaly Context)
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Badges and User Profile */}
            <div className="flex items-center gap-2.5 text-xs">
              {/* Reference Policy Tag */}
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-bold tracking-wider">REFERENCE POLICY</span>
              </div>

              {/* Dataset Info Tag */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-800/50 text-cyan-300">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px]">
                  {totalCount > 0 ? (
                    <>
                      Dataset: <span className="font-bold text-white">{datasetName || 'Uploaded Data'} ({totalCount.toLocaleString()} TX)</span> &bull; Frauds: <span className="font-bold text-red-400">{fraudCount} ({fraudPct}%)</span>
                    </>
                  ) : (
                    <>
                      Dataset: <span className="font-bold text-slate-300">None (0 TX)</span> &bull; Frauds: <span className="font-bold text-slate-400">0 (0.0%)</span>
                    </>
                  )}
                </span>
              </div>

              {/* User Avatar Circle */}
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-cyan-500/40 flex items-center justify-center font-bold text-white text-xs shadow-inner">
                D
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewTab onNavigateTab={(tab) => setActiveTab(tab as TabId)} />
          )}
          {activeTab === 'alerts' && (
            <FraudAlertsTab
              onInvestigate={() => setActiveTab('investigate')}
              onNavigateTab={(tab) => setActiveTab(tab as TabId)}
            />
          )}
          {activeTab === 'investigate' && (
            <SingleTransactionTab policy={policy} />
          )}
          {activeTab === 'batch' && (
            <BatchCsvTab policy={policy} />
          )}
          {activeTab === 'simulation' && (
            <DemoTransactionsTab
              policy={policy}
              onLoadIntoCustomForm={() => setActiveTab('investigate')}
            />
          )}
          {activeTab === 'threshold' && (
            <ThresholdSimulatorTab policy={policy} onUpdatePolicy={setPolicy} />
          )}
          {activeTab === 'intelligence' && (
            <DataVisualizationTab onNavigateTab={(tab) => setActiveTab(tab as TabId)} />
          )}
          {activeTab === 'architecture' && (
            <ArchitectureTab policy={policy} onUpdatePolicy={setPolicy} />
          )}
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <DataProvider>
      <MainAppLayout />
    </DataProvider>
  );
}

export default App;
