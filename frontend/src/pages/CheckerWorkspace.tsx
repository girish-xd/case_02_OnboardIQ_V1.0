import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { Application, DocumentRecord } from '../types/index.js';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  RotateCcw,
  AlertTriangle,
  Clock,
  RefreshCw,
  Building2,
  Lock,
} from 'lucide-react';

export const CheckerWorkspace: React.FC = () => {
  const { user } = useAuth();
  const [queue, setQueue] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [appDocs, setAppDocs] = useState<DocumentRecord[]>([]);

  const [decisionComment, setDecisionComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const data = await api.getCheckerQueue();
      setQueue(data.queue || []);
      if (data.queue.length > 0 && !selectedApp) {
        loadCase(data.queue[0].applicationId);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch checker queue');
    } finally {
      setLoading(false);
    }
  };

  const loadCase = async (applicationId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const data = await api.getApplicationDetails(applicationId);
      setSelectedApp(data.application);
      setAppDocs(data.documents);
      setDecisionComment('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load case');
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleDecision = async (decision: 'APPROVE' | 'REJECT' | 'SEND_BACK') => {
    if (!selectedApp) return;
    if (decisionComment.trim().length < 5) {
      setErrorMsg('Please enter a decision justification comment (min 5 characters).');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.submitCheckerDecision({
        applicationId: selectedApp.applicationId,
        decision,
        comment: decisionComment,
        version: selectedApp.version,
      });

      setSuccessMsg(`Decision (${decision}) successfully recorded for ${selectedApp.applicationId}`);
      setSelectedApp(null);
      await fetchQueue();
    } catch (err: any) {
      setErrorMsg(err.message || 'Decision submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const isMakerSelfCheck =
    selectedApp?.makerRecommendation &&
    selectedApp.makerRecommendation.recommendedBy === user?.userId;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Compliance Checker Workspace</h1>
            <span className="bg-indigo-100 text-indigo-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-indigo-300">
              Checker Role (Second-Line Defence)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Section 3 & FR-7: Independent check on every reviewed or high-risk case. Maker and Checker must differ.
          </p>
        </div>
        <button
          onClick={fetchQueue}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue ({queue.length})
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Checker Queue */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-slate-800 flex items-center justify-between">
            <span>Pending Checker Decision</span>
            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {queue.length}
            </span>
          </h2>

          {queue.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No cases currently pending compliance check.
            </div>
          ) : (
            <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
              {queue.map((app) => (
                <button
                  key={app.applicationId}
                  onClick={() => loadCase(app.applicationId)}
                  className={`w-full text-left p-3 rounded-lg border transition text-xs space-y-1.5 ${
                    selectedApp?.applicationId === app.applicationId
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{app.applicationId}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        app.riskCategory === 'HIGH'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {app.riskCategory} RISK
                    </span>
                  </div>
                  <div className="font-medium text-slate-800 truncate">{app.fullName}</div>
                  {app.makerRecommendation && (
                    <div className="text-[11px] text-brand-700 bg-brand-50 p-1.5 rounded font-medium truncate">
                      Maker Rec: <strong>{app.makerRecommendation.outcome}</strong>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right 3 Columns: Checker Decision Screen */}
        <div className="lg:col-span-3 space-y-6">
          {selectedApp ? (
            <>
              {/* Maker-Checker Violation Warning Banner */}
              {isMakerSelfCheck && (
                <div className="bg-rose-50 border border-rose-300 p-4 rounded-xl text-rose-900 flex items-center gap-3">
                  <Lock className="w-6 h-6 flex-shrink-0 text-rose-600" />
                  <div className="text-xs">
                    <strong className="block text-sm font-bold">Maker-Checker Policy Violation</strong>
                    You recommended this case ({selectedApp.applicationId}) as the KYC Maker. Under banking compliance regulations, you cannot check or approve your own recommendation. Switch to an independent checker (e.g., C1) to approve.
                  </div>
                </div>
              )}

              {/* Case Summary */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-slate-900">{selectedApp.applicationId}</h2>
                      <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded font-mono">
                        Version v{selectedApp.version}
                      </span>
                      <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded font-bold">
                        {selectedApp.riskCategory} RISK
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Applicant: {selectedApp.fullName} • Re-KYC Due: {selectedApp.rekycDueDate || 'N/A'}
                    </p>
                  </div>

                  <div className="text-right text-xs">
                    <span className="text-slate-400 block mb-0.5">Name Match Score</span>
                    <span className="font-mono font-bold text-sm text-slate-800">
                      {selectedApp.nameMatchScore !== null && selectedApp.nameMatchScore !== undefined
                        ? (selectedApp.nameMatchScore * 100).toFixed(2) + '%'
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Maker's Recommendation Details */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Maker (First-Line) Findings & Recommendation
                  </div>
                  {selectedApp.makerRecommendation ? (
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Recommended Action:</span>
                        <span className="font-bold text-brand-700 uppercase">
                          {selectedApp.makerRecommendation.outcome}
                        </span>
                      </div>
                      <div className="text-slate-700 italic">
                        "{selectedApp.makerRecommendation.comment}"
                      </div>
                      <div className="text-[11px] text-slate-400 pt-1">
                        Recommended by: {selectedApp.makerRecommendation.recommendedBy} •{' '}
                        {new Date(selectedApp.makerRecommendation.recommendedAt).toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-600">
                      Direct High-Risk Application routing (Section 6.1.2: APPROVE with HIGH risk routes to Checker).
                    </div>
                  )}
                </div>

                {/* Screening & Rules Evidence */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Exceptions & Watchlist Evidence
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedApp.reasonCodes && selectedApp.reasonCodes.length > 0 ? (
                      selectedApp.reasonCodes.map((rc) => (
                        <span
                          key={rc}
                          className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-mono font-semibold px-2.5 py-1 rounded"
                        >
                          {rc}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> All KYC & Watchlist Screening rules passed cleanly.
                      </span>
                    )}
                  </div>
                </div>

                {/* Compliance Officer Decision Form */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">Compliance Decision (FR-7)</h3>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Compliance Officer Sign-Off Comment
                    </label>
                    <textarea
                      rows={3}
                      value={decisionComment}
                      onChange={(e) => setDecisionComment(e.target.value)}
                      placeholder="Enter compliance decision rationale, watchlist clearance confirmation, or return instructions..."
                      className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-3 pt-2">
                    <button
                      onClick={() => handleDecision('SEND_BACK')}
                      disabled={submitting || isMakerSelfCheck || decisionComment.trim().length < 5}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      <RotateCcw className="w-4 h-4 text-slate-500" /> Send Back to Maker
                    </button>

                    <button
                      onClick={() => handleDecision('REJECT')}
                      disabled={submitting || isMakerSelfCheck || decisionComment.trim().length < 5}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" /> Reject Application
                    </button>

                    <button
                      onClick={() => handleDecision('APPROVE')}
                      disabled={submitting || isMakerSelfCheck || decisionComment.trim().length < 5}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" /> Final Approve & Open Account
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-16 rounded-xl border border-slate-200 text-center text-slate-400">
              Select an application from the checker queue.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
