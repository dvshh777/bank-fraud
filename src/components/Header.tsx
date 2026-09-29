import React from 'react';
import { ShieldCheck, ShieldAlert, Cpu, AlertTriangle, Layers } from 'lucide-react';
import { PolicyConfig } from '../types';

interface HeaderProps {
  policy: PolicyConfig;
  modelLoaded: boolean;
}

export const Header: React.FC<HeaderProps> = ({ policy, modelLoaded }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Sentinel Fraud Platform
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Primary + Secondary Signal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Banking Fraud Detection • Primary: XGBoost (PR-AUC 0.8473) • Secondary: Isolation Forest Anomaly Context
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span>300 XGBoost Trees:</span>
              <span className={`font-mono font-medium ${modelLoaded ? 'text-emerald-400' : 'text-amber-400'}`}>
                {modelLoaded ? 'Native Active (300)' : 'Loading artifact...'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Exploratory Anomaly Ref:</span>
              <span className="font-mono text-purple-400 font-medium">Top 2%</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium">DEMO / REFERENCE POLICY</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
