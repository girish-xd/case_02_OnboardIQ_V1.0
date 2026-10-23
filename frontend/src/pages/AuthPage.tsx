import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  Building2,
  ShieldCheck,
  Lock,
  User,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  Layers,
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Register form state
  const [regFullName, setRegFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regUsername, setRegUsername] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showRoleCredentials, setShowRoleCredentials] = useState<boolean>(true);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginUsername.trim() || !loginPassword) {
      setError('Please provide both username and password.');
      return;
    }
    setLoading(true);
    try {
      await login(loginUsername.trim(), loginPassword);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!regFullName.trim() || !regEmail.trim() || !regUsername.trim() || !regPassword) {
      setError('All registration fields are required.');
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
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        username: regUsername.toLowerCase().trim(),
        password: regPassword,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Username or email may already be registered.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to fill credentials into the form inputs for proper evaluation
  const handleAutofillCredentials = (username: string, pass = 'password123') => {
    setLoginUsername(username);
    setLoginPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Subtle modern fintech background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-slate-800/20 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 text-white shadow-md mb-3">
          <Building2 className="w-6 h-6 text-slate-100" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Deccan Digital Bank
        </h1>
        <div className="flex items-center justify-center gap-2 mt-1.5">
          <span className="font-mono text-[11px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
            OnboardIQ Enterprise KYC
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-xs text-slate-400">Production RBAC</span>
        </div>
        <p className="mt-2 text-xs text-slate-400 max-w-sm mx-auto">
          Dual-control identity verification, automated document extraction, and sanctions watchlist screening.
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white text-slate-900 py-7 px-6 sm:px-8 shadow-xl rounded-xl border border-slate-200/90">
          {/* Segmented Mode Selector */}
          <div className="flex p-1 bg-slate-100 rounded-lg mb-6 border border-slate-200/70">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              New Customer Registration
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Corporate ID or Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="e.g. applicant1, maker1, checker1"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition text-slate-900 bg-white placeholder-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition text-slate-900 bg-white placeholder-slate-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg shadow-xs transition flex items-center justify-center gap-2 text-xs disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Authenticate & Access Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
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
                    placeholder="priya.sharma@example.com"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
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
                    placeholder="e.g. priya_s"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition text-slate-900 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg shadow-xs transition flex items-center justify-center gap-2 text-xs disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Create Applicant Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Test Roles & Credentials Reference Guide (Autofills credentials into form inputs) */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                <span>Test Role Credentials</span>
              </span>
              <button
                type="button"
                onClick={() => setShowRoleCredentials(!showRoleCredentials)}
                className="text-[11px] text-slate-500 hover:text-slate-800 underline"
              >
                {showRoleCredentials ? 'Hide' : 'Show'}
              </button>
            </div>

            {showRoleCredentials && (
              <div className="space-y-1.5 text-xs">
                <p className="text-[11px] text-slate-500 mb-2">
                  Click <span className="font-medium text-slate-700">Autofill</span> to populate credentials, then click Authenticate to sign in under that role:
                </p>

                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="p-2 rounded-md bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>Applicant</span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5">user: applicant1</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAutofillCredentials('applicant1')}
                      className="mt-1.5 text-left text-[10px] font-medium text-blue-600 hover:text-blue-800 underline"
                    >
                      Autofill Creds
                    </button>
                  </div>

                  <div className="p-2 rounded-md bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        <span>KYC Maker (U1)</span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5">user: maker1</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAutofillCredentials('maker1')}
                      className="mt-1.5 text-left text-[10px] font-medium text-blue-600 hover:text-blue-800 underline"
                    >
                      Autofill Creds
                    </button>
                  </div>

                  <div className="p-2 rounded-md bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        <span>Checker (C1)</span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5">user: checker1</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAutofillCredentials('checker1')}
                      className="mt-1.5 text-left text-[10px] font-medium text-blue-600 hover:text-blue-800 underline"
                    >
                      Autofill Creds
                    </button>
                  </div>

                  <div className="p-2 rounded-md bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                        <span>Administrator</span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5">user: admin1</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAutofillCredentials('admin1')}
                      className="mt-1.5 text-left text-[10px] font-medium text-blue-600 hover:text-blue-800 underline"
                    >
                      Autofill Creds
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security & Invariant Proof */}
        <div className="mt-4 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Strict Server-Side RBAC • Anti-Self-Approval • JWT Session Guard</span>
        </div>
      </div>
    </div>
  );
};
