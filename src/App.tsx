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
import { BenchmarkTab } from './components/BenchmarkTab';
import { AdminHistoryTab } from './components/AdminHistoryTab';
import { EmployeePortalTab } from './components/EmployeePortalTab';
import { LoginModal } from './components/LoginModal';
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
  Database,
  Menu,
  X,
  Award,
  UserCheck,
  Lock,
  LogOut,
  User
} from 'lucide-react';

type TabId =
  | 'overview'
  | 'alerts'
  | 'investigate'
  | 'history'
  | 'batch'
  | 'simulation'
  | 'benchmark'
  | 'threshold'
  | 'intelligence'
  | 'architecture'
  | 'employee_portal';

function MainAppLayout() {
  const { userSession, logout, datasetName, rows, policy, setPolicy, alerts, reviewAlerts, blockedAlerts, approvedAlerts } = useDataContext();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [modelLoaded, setModelLoaded] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);

  const isAdmin = userSession.role === 'admin';
  const isEmployee = userSession.role === 'employee';

  useEffect(() => {
    loadXGBoostModel().then(model => {
      if (model) {
        setModelLoaded(true);
      }
    });
  }, []);

  // When role changes to employee, switch activeTab to employee_portal if on admin-only tab
  useEffect(() => {
    if (isEmployee) {
      if (activeTab !== 'employee_portal' && activeTab !== 'investigate') {
        setActiveTab('employee_portal');
      }
    } else if (isAdmin && activeTab === 'employee_portal') {
      setActiveTab('overview');
    }
  }, [userSession.role]);

  // Automatically scroll to top whenever the user switches page/tab
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const mainContainer = document.querySelector('main');
    if (mainContainer) {
      mainContainer.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [activeTab]);

  const totalCount = rows.length;
  const fraudCount = rows.filter(r => r.Class === 1 || r.xgb_probability >= policy.highThreshold).length;
  const fraudPct = totalCount > 0 ? ((fraudCount / totalCount) * 100).toFixed(1) : '0.0';

  // Navigation Items defined per role
  const adminNavItems: Array<{ id: TabId; label: string; icon: React.ElementType; badge?: string; badgeColor?: string }> = [
    { id: 'overview', label: 'Executive Dashboard', icon: LayoutDashboard },
    {
      id: 'alerts',
      label: 'Alerts & Decision Queue',
      icon: ShieldAlert,
      badge: alerts.length > 0 ? `${alerts.length}` : undefined,
      badgeColor: 'bg-red-500 text-white font-mono'
    },
    { id: 'investigate', label: 'Transaction Inspector', icon: Search },
    { id: 'history', label: 'CSV History Database', icon: Database },
    { id: 'batch', label: 'Batch Processing', icon: Layers },
    { id: 'simulation', label: 'Real-Time Stream Engine', icon: SlidersHorizontal },
    { id: 'benchmark', label: 'Model Benchmarks & Metrics', icon: Award },
    { id: 'threshold', label: 'Policy Calibration Simulator', icon: Clock },
    { id: 'intelligence', label: 'Data & Feature Analytics', icon: BarChart3 },
    { id: 'architecture', label: 'Decision Rules & Governance', icon: FileText },
  ];

  const employeeNavItems: Array<{ id: TabId; label: string; icon: React.ElementType; badge?: string; badgeColor?: string }> = [
    {
      id: 'employee_portal',
      label: 'Queue & Decision Terminal',
      icon: UserCheck,
      badge: reviewAlerts.length > 0 ? `${reviewAlerts.length}` : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold'
    },
    { id: 'investigate', label: 'Transaction Inspector', icon: Search }
  ];

  const navItems = isAdmin ? adminNavItems : employeeNavItems;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col md:flex-row selection:bg-blue-600 selection:text-white antialiased">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-30 w-64 h-screen bg-[#0d1322] border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-5">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-extrabold tracking-wider text-white font-sans">SENTINEL</h1>
                <p className="text-[10px] font-medium text-slate-400 tracking-tight">Fraud Intelligence Hub</p>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Role Indicator Badge */}
          <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-blue-400' : 'bg-emerald-400'}`} />
              <span className="font-bold text-white font-mono uppercase tracking-wider text-[11px]">
                {isAdmin ? 'ADMIN' : 'EMPLOYEE'}
              </span>
            </div>
            <button
              onClick={() => setLoginModalOpen(true)}
              className="text-[10px] text-blue-400 hover:underline font-semibold"
            >
              Switch Role
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? isAdmin ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'bg-emerald-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Info & Login Action */}
        <div className="p-3.5 border-t border-slate-800/80 space-y-2">
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className={`w-8 h-8 rounded-lg ${isAdmin ? 'bg-blue-600' : 'bg-emerald-600'} text-white font-bold text-xs flex items-center justify-center shrink-0`}>
                {userSession.avatar}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">{userSession.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{userSession.department}</div>
              </div>
            </div>

            <button
              onClick={() => setLoginModalOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Change Account / Role"
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header / App Bar */}
        <header className="sticky top-0 z-20 bg-[#090d16]/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Mobile Toggle & Page Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white md:hidden"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                  Sentinel Fraud Platform
                </h2>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>Role: <strong className="text-white uppercase font-mono">{userSession.role}</strong></span>
                  <span aria-hidden="true">&bull;</span>
                  <span>Engine: XGBoost + Isolation Forest</span>
                  <span aria-hidden="true">&bull;</span>
                  <span>Latency: 0.84ms</span>
                </div>
              </div>
            </div>

            {/* Right: Role Switcher Login Button & Dataset Status */}
            <div className="flex items-center gap-3 text-xs">
              {/* Login / Role Selector Button */}
              <button
                onClick={() => setLoginModalOpen(true)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 border shadow-sm ${
                  isAdmin
                    ? 'bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-800'
                    : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Login: {userSession.role === 'admin' ? 'Admin Profile' : 'Employee Analyst'}</span>
              </button>

              {/* Dataset Status */}
              <div className="hidden sm:flex items-center gap-2 text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px]">
                  {totalCount > 0 ? (
                    <>
                      <span className="font-semibold text-white">{datasetName || 'Session Data'}</span> · <span className="font-mono text-slate-300">{totalCount.toLocaleString()} TX</span> · <span className="font-mono text-red-400 font-semibold">{fraudCount} Frauds ({fraudPct}%)</span>
                    </>
                  ) : (
                    <span>No Batch Loaded (0 TX)</span>
                  )}
                </span>
              </div>

              {/* User Avatar Circle */}
              <div
                onClick={() => setLoginModalOpen(true)}
                className={`w-7 h-7 rounded-lg ${isAdmin ? 'bg-blue-600' : 'bg-emerald-600'} text-white font-bold text-xs flex items-center justify-center shadow-sm cursor-pointer`}
                title="Click to switch account"
              >
                {userSession.avatar}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-7xl w-full mx-auto">
          {/* Employee Portal Tab View */}
          {isEmployee ? (
            <EmployeePortalTab />
          ) : (
            <>
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
              {activeTab === 'history' && (
                <AdminHistoryTab />
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
              {activeTab === 'benchmark' && (
                <BenchmarkTab />
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
            </>
          )}
        </main>
      </div>

      {/* Login & Role Selection Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
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
