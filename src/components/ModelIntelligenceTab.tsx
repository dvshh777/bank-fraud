import React, { useState } from 'react';
import { EdaGalleryTab } from './EdaGalleryTab';
import { ModelSummaryTab } from './ModelSummaryTab';
import { Images, BarChart3 } from 'lucide-react';

export const ModelIntelligenceTab: React.FC = () => {
  const [subTab, setSubTab] = useState<'eda' | 'benchmark'>('eda');

  return (
    <div className="space-y-6">
      {/* Subtab navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setSubTab('eda')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
            subTab === 'eda'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Images className="w-4 h-4" />
          <span>EDA Reports Gallery (14 Plots)</span>
        </button>
        <button
          onClick={() => setSubTab('benchmark')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
            subTab === 'benchmark'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Dataset & Model Benchmark (0.8473 AUC)</span>
        </button>
      </div>

      {subTab === 'eda' ? <EdaGalleryTab /> : <ModelSummaryTab />}
    </div>
  );
};
