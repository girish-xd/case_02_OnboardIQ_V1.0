import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Building2, ShieldCheck, Lock, User, Mail, ArrowRight, UserCheck, BarChart3, AlertCircle } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Register form state
  const [regFullName, setRegFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regUsername, setRegUsername] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginUsername || !loginPassword) {
      setError('Please provide both username and password.');
      return;
    }
    setLoading(true);
    try {
      await login(loginUsername, loginPassword);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!regFullName || !regEmail || !regUsername || !regPassword) {
      setError('Please fill in all required registration fields.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await register({
        fullName: regFullName,
        email: regEmail,
        username: regUsername.toLowerCase().trim(),
        password: regPassword,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Username or email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (username: string) => {
    setError(null);
    setLoading(true);
    try {
      await login(username, 'password123');
    } catch (err: any) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-brand-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-xl shadow-brand-500/20 mb-4">
          <Building2 className="w-9 h-9" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Deccan Digital Bank
        </h1>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30">
            OnboardIQ Enterprise KYC
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Intelligent Document Verification & Dual-Control Screening Platform
        </p>
      </div>

      {/* Main Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition ${
                mode === 'login'
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition ${
                mode === 'register'
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Customer Registration
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username or Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="e.g. applicant1 or maker1"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-sm transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Sign In to Personal Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Desired Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. rahul_s"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm
                  </label>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repeat"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-sm transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Create Applicant Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* DEMO / EVALUATION QUICK-LOGIN SECTION */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Hackathon Demo Quick-Access
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-mono">
                PW: password123
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Click any role to log directly into that persona's private dashboard:
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('applicant1')}
                className="p-2 border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-800 rounded-lg font-semibold flex items-center gap-2 transition text-left"
              >
                <User className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <div>
                  <div className="font-bold">Applicant</div>
                  <div className="text-[10px] text-emerald-600 font-normal">applicant1</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('maker1')}
                className="p-2 border border-amber-200 bg-amber-50/60 hover:bg-amber-100/80 text-amber-800 rounded-lg font-semibold flex items-center gap-2 transition text-left"
              >
                <UserCheck className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <div>
                  <div className="font-bold">KYC Maker 1</div>
                  <div className="text-[10px] text-amber-600 font-normal">maker1</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('checker1')}
                className="p-2 border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/80 text-indigo-800 rounded-lg font-semibold flex items-center gap-2 transition text-left"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                <div>
                  <div className="font-bold">Checker</div>
                  <div className="text-[10px] text-indigo-600 font-normal">checker1</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin1')}
                className="p-2 border border-purple-200 bg-purple-50/60 hover:bg-purple-100/80 text-purple-800 rounded-lg font-semibold flex items-center gap-2 transition text-left"
              >
                <BarChart3 className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                <div>
                  <div className="font-bold">Administrator</div>
                  <div className="text-[10px] text-purple-600 font-normal">admin1</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-4 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-brand-400" />
          <span>Strict Server-Side RBAC & Anti-Self-Approval Enforced</span>
        </div>
      </div>
    </div>
  );
};
