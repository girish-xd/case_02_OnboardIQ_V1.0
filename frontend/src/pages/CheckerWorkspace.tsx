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
  Layers,
  FileCheck2,
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Compliance Checker Workspace
            </h1>
            <span className="bg-indigo-500/10 text-indigo-800 text-xs px-2.5 py-0.5 rounded-md font-semibold border border-indigo-300/60 font-mono">
              SECOND-LINE DEFENCE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Independent dual-control verification (Section 3 & FR-7). Recommending KYC Officer cannot approve their own case.
          </p>
        </div>
        <button
          onClick={fetchQueue}
          disabled={loading}
          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue ({queue.length})</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200/90 text-rose-800 rounded-lg text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200/90 text-emerald-800 rounded-lg text-xs flex items-center gap-2.5">
          <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Checker Queue */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Pending Sign-Off</span>
            </h2>
            <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-mono font-bold">
              {queue.length}
            </span>
          </div>

          {queue.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <span>No applications awaiting checker decision.</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
              {queue.map((app) => {
                const isSelected = selectedApp?.applicationId === app.applicationId;
                return (
                  <button
                    key={app.applicationId}
                    onClick={() => loadCase(app.applicationId)}
                    className={`w-full text-left p-3 rounded-lg border transition text-xs space-y-1.5 ${
                      isSelected
                        ? 'border-slate-900 bg-slate-50/80 shadow-2xs ring-1 ring-slate-900/5'
                        : 'border-slate-200/80 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">{app.applicationId}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                          app.riskCategory === 'HIGH'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                        }`}
                      >
                        {app.riskCategory} RISK
                      </span>
                    </div>
                    <div className="font-medium text-slate-800 truncate">{app.fullName}</div>
                    {app.makerRecommendation && (
                      <div className="text-[10px] text-slate-700 bg-slate-100 p-1.5 rounded font-mono truncate">
                        Maker Rec: <strong className="font-semibold text-slate-900">{app.makerRecommendation.outcome}</strong>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 3 Columns: Checker Decision Terminal */}
        <div className="lg:col-span-3 space-y-5">
          {selectedApp ? (
            <>
              {/* Maker-Checker Separation Warning */}
              {isMakerSelfCheck && (
                <div className="bg-rose-50 border border-rose-200/90 p-4 rounded-xl text-rose-900 flex items-start gap-3 shadow-2xs">
                  <Lock className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
                  <div className="text-xs">
                    <strong className="block text-sm font-bold text-rose-950 mb-0.5">
                      Maker-Checker Separation Invariant Enforced
                    </strong>
                    You recommended this case ({selectedApp.applicationId}) as the KYC Maker. Under strict banking dual-control regulations, you cannot review or sign off on your own recommendation. Please sign out and enter credentials for an independent Compliance Checker (e.g., checker1).
                  </div>
                </div>
              )}

              {/* Case Summary Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg font-bold font-mono text-slate-900">{selectedApp.applicationId}</h2>
                      <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono border border-slate-200">
                        v{selectedApp.version}
                      </span>
                      <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-mono font-bold">
                        {selectedApp.riskCategory} RISK
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Applicant: <strong className="text-slate-800">{selectedApp.fullName}</strong> • Periodic Re-KYC Cycle: <span className="font-mono text-slate-700">{selectedApp.rekycDueDate || 'Standard'}</span>
                    </p>
                  </div>

                  <div className="text-right text-xs">
                    <span className="text-slate-400 block mb-0.5 text-[11px]">Name Matching Confidence</span>
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {selectedApp.nameMatchScore !== null && selectedApp.nameMatchScore !== undefined
                        ? (selectedApp.nameMatchScore * 100).toFixed(2) + '%'
                        : '100.00%'}
                    </span>
                  </div>
                </div>

                {/* Maker's Recommendation Details */}
                <div className="bg-slate-50/70 p-4 rounded-lg border border-slate-200/80 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    First-Line (Maker) Findings & Review Recommendation
                  </div>
                  {selectedApp.makerRecommendation ? (
                    <div className="text-xs space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Recommended Action:</span>
                        <span className="font-bold text-slate-900 font-mono uppercase bg-white border border-slate-200 px-2 py-0.5 rounded">
                          {selectedApp.makerRecommendation.outcome}
                        </span>
                      </div>
                      <div className="text-slate-700 italic bg-white p-2.5 rounded border border-slate-200/60 text-xs">
                        "{selectedApp.makerRecommendation.comment}"
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 pt-0.5">
                        Officer: {selectedApp.makerRecommendation.recommendedBy} •{' '}
                        {new Date(selectedApp.makerRecommendation.recommendedAt).toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-600">
                      Direct High-Risk Case Routing (Section 6.1.2: System routed case to Compliance Checker).
                    </div>
                  )}
                </div>

                {/* Screening & Rules Evidence */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Exception Triggers & Watchlist Evidence
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedApp.reasonCodes && selectedApp.reasonCodes.length > 0 ? (
                      selectedApp.reasonCodes.map((rc) => (
                        <span
                          key={rc}
                          className="bg-amber-50 text-amber-900 border border-amber-200 text-xs font-mono font-semibold px-2.5 py-1 rounded"
                        >
                          {rc}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-emerald-700 font-medium flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>All identity verification and sanctions screening rules passed cleanly.</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Compliance Officer Decision Form */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Compliance Sign-Off & Second-Line Decision
                  </h3>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Compliance Officer Sign-Off Comment (Min 5 chars)
                    </label>
                    <textarea
                      rows={3}
                      value={decisionComment}
                      onChange={(e) => setDecisionComment(e.target.value)}
                      placeholder="Enter compliance decision rationale, sanctions clearance confirmation, or send-back instructions..."
                      className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none text-slate-900"
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-2.5 pt-2">
                    <button
                      onClick={() => handleDecision('SEND_BACK')}
                      disabled={submitting || isMakerSelfCheck || decisionComment.trim().length < 5}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Send Back to Maker</span>
                    </button>

                    <button
                      onClick={() => handleDecision('REJECT')}
                      disabled={submitting || isMakerSelfCheck || decisionComment.trim().length < 5}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject Application</span>
                    </button>

                    <button
                      onClick={() => handleDecision('APPROVE')}
                      disabled={submitting || isMakerSelfCheck || decisionComment.trim().length < 5}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
                    >
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Final Approve & Provision Core Banking Account</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-16 rounded-xl border border-slate-200/90 text-center text-slate-400 text-xs">
              Select an application from the checker queue to review evidence and record sign-off.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
