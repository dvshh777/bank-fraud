import React, { useState } from 'react';
import { SurgeAnalysisTab } from './SurgeAnalysisTab';
import { ArchitectureTab } from './ArchitectureTab';
import { Sliders, Clock } from 'lucide-react';
import { PolicyConfig } from '../types';

export const ThresholdSimulatorTab: React.FC<{ policy: PolicyConfig; onUpdatePolicy: (p: PolicyConfig) => void }> = ({
  policy,
  onUpdatePolicy
}) => {
  const [subTab, setSubTab] = useState<'surge' | 'policy'>('surge');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setSubTab('surge')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
            subTab === 'surge'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>48-Hour Peak-Load & Diurnal Surge Analysis</span>
        </button>
        <button
          onClick={() => setSubTab('policy')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
            subTab === 'policy'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Threshold Sensitivity & Policy Configuration</span>
        </button>
      </div>

      {subTab === 'surge' ? (
        <SurgeAnalysisTab />
      ) : (
        <ArchitectureTab policy={policy} onUpdatePolicy={onUpdatePolicy} />
      )}
    </div>
  );
};
