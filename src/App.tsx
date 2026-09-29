import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SingleTransactionTab } from './components/SingleTransactionTab';
import { DemoTransactionsTab } from './components/DemoTransactionsTab';
import { BatchCsvTab } from './components/BatchCsvTab';
import { ModelSummaryTab } from './components/ModelSummaryTab';
import { ArchitectureTab } from './components/ArchitectureTab';
import { SurgeAnalysisTab } from './components/SurgeAnalysisTab';
import { EdaGalleryTab } from './components/EdaGalleryTab';
import { PolicyConfig, DemoTransactionItem } from './types';
import { DEFAULT_POLICY, loadXGBoostModel } from './lib/xgboost';
import {
  Search,
  Sparkles,
  FileSpreadsheet,
  BarChart3,
  GitBranch,
  Clock,
  Images,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'single' | 'demo' | 'batch' | 'summary' | 'architecture' | 'surge' | 'eda'>('single');
  const [policy, setPolicy] = useState<PolicyConfig>(DEFAULT_POLICY);
  const [modelLoaded, setModelLoaded] = useState<boolean>(false);

  useEffect(() => {
    loadXGBoostModel().then(model => {
      if (model) {
        setModelLoaded(true);
      }
    });
  }, []);

  const navItems = [
    { id: 'single', label: 'Single Transaction', icon: Search, badge: 'Live Scoring' },
    { id: 'demo', label: 'Demo Scenarios', icon: Sparkles, badge: '5 Curated' },
    { id: 'batch', label: 'Batch CSV Analysis', icon: FileSpreadsheet, badge: 'Batch' },
    { id: 'summary', label: 'Dataset & Model Benchmark', icon: BarChart3, badge: '0.8473 AUC' },
    { id: 'architecture', label: 'Architecture & Policy', icon: GitBranch, badge: 'Two-Stage' },
    { id: 'surge', label: 'Peak-Load & Diurnal Surge', icon: Clock, badge: '48h Analysis' },
    { id: 'eda', label: 'EDA Reports Gallery', icon: Images, badge: '14 Plots' },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      <Header policy={policy} modelLoaded={modelLoaded} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto pb-1 gap-2 border-b border-slate-800 scrollbar-none">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                    isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Display */}
        <div className="transition-all duration-200">
          {activeTab === 'single' && <SingleTransactionTab policy={policy} />}
          {activeTab === 'demo' && (
            <DemoTransactionsTab
              policy={policy}
              onLoadIntoCustomForm={() => setActiveTab('single')}
            />
          )}
          {activeTab === 'batch' && <BatchCsvTab policy={policy} />}
          {activeTab === 'summary' && <ModelSummaryTab />}
          {activeTab === 'architecture' && (
            <ArchitectureTab policy={policy} onUpdatePolicy={setPolicy} />
          )}
          {activeTab === 'surge' && <SurgeAnalysisTab />}
          {activeTab === 'eda' && <EdaGalleryTab />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 text-slate-500 text-xs py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Sentinel Fraud Platform &bull; Migrated from dvshh777/sentinel-fraud-platform
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Node.js Runtime &bull; React + Vite &bull; Port 3000 &bull; DEMO / REFERENCE POLICY
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
