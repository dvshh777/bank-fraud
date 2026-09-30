import React, { useState } from 'react';
import { useDataContext } from '../context/DataContext';
import {
  ShieldCheck,
  X,
  Lock,
  Mail,
  Key,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { UserRole } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { userSession, loginAs } = useDataContext();
  const [selectedRole, setSelectedRole] = useState<UserRole>(userSession.role || 'admin');
  const [email, setEmail] = useState<string>(userSession.email || '');
  const [password, setPassword] = useState<string>('');
  const [customName, setCustomName] = useState<string>(userSession.name || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setErrorMsg(null);
    setIsSubmitting(true);

    const computedName = customName.trim() || email.split('@')[0] || 'User';
    const result = await loginAs(selectedRole, computedName, email.trim());

    setIsSubmitting(false);
    if (!result.success) {
      setErrorMsg(result.error || 'Login failed due to role lock restriction.');
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#0e1628] border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              SENTINEL Multi-Account Auth Portal
            </h2>
            <p className="text-xs text-slate-400">
              Sign in with your email address to access your workspace.
            </p>
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-start gap-2">
              <Lock className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-red-200">Role Lock Conflict</div>
                <div className="text-[11px] text-red-300/90 mt-0.5">{errorMsg}</div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Account Access Level
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole('admin')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                    selectedRole === 'admin'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Administrator
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('employee')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                    selectedRole === 'employee'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Employee Analyst
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Institutional Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="name@company.com"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* User Account Role Note */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Workspace Session Access:</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Your saved analysis history and session preferences are securely bound to your email address.
            </p>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 text-white shadow-md disabled:opacity-50 ${
              selectedRole === 'admin'
                ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
            }`}
          >
            <span>
              {isSubmitting
                ? 'Verifying Role & Authenticating...'
                : `Sign In to ${selectedRole === 'admin' ? 'Admin Workspace' : 'Employee Workspace'}`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
