import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { Application, DocumentRecord, ExtractionRecord } from '../types/index.js';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Edit2,
  RefreshCw,
  Send,
  Eye,
  ShieldAlert,
} from 'lucide-react';

export const MakerWorkspace: React.FC = () => {
  const [queue, setQueue] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [appDocs, setAppDocs] = useState<DocumentRecord[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [docExtractions, setDocExtractions] = useState<ExtractionRecord[]>([]);
  const [docText, setDocText] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Field Correction Modal State
  const [correctingField, setCorrectingField] = useState<ExtractionRecord | null>(null);
  const [correctionValue, setCorrectionValue] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [isCorrecting, setIsCorrecting] = useState<boolean>(false);

  // Recommendation State
  const [recommendation, setRecommendation] = useState<'APPROVE' | 'REJECT' | 'REQUEST_RESUBMISSION'>('APPROVE');
  const [recommendationComment, setRecommendationComment] = useState<string>('');
  const [isSubmittingRec, setIsSubmittingRec] = useState<boolean>(false);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const data = await api.getMakerQueue();
      setQueue(data.queue || []);
      if (data.queue.length > 0 && !selectedApp) {
        loadCaseDetails(data.queue[0].applicationId);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load Maker review queue');
    } finally {
      setLoading(false);
    }
  };

  const loadCaseDetails = async (applicationId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const data = await api.getApplicationDetails(applicationId);
      setSelectedApp(data.application);
      setAppDocs(data.documents);

      if (data.documents.length > 0) {
        selectDocument(data.documents[0]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load case details');
    }
  };

  const selectDocument = async (doc: DocumentRecord) => {
    setSelectedDoc(doc);
    try {
      const extData = await api.getDocumentExtractions(doc.docId);
      setDocExtractions(extData.extractions || []);

      // Fetch document text via authenticated file view
      const fileRes = await fetch(api.getDocumentFileUrl(doc.docId), { credentials: 'include' });
      if (fileRes.ok) {
        const text = await fileRes.text();
        setDocText(text);
      } else {
        setDocText(doc.text || 'Unable to load document text.');
      }
    } catch (err) {
      console.error('Failed to load document content:', err);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  // Submit Field Correction
  const handleSaveCorrection = async () => {
    if (!selectedApp || !selectedDoc || !correctingField) return;
    if (correctionReason.trim().length < 5) {
      setErrorMsg('Correction reason must be at least 5 characters long.');
      return;
    }

    setIsCorrecting(true);
    setErrorMsg(null);
    try {
      const updated = await api.correctField({
        applicationId: selectedApp.applicationId,
        docId: selectedDoc.docId,
        fieldName: correctingField.fieldName,
        newValue: correctionValue,
        reason: correctionReason,
        version: selectedApp.version,
      });

      setSuccessMsg(`Field ${correctingField.fieldName} corrected. Rules re-evaluated!`);
      setCorrectingField(null);
      await loadCaseDetails(selectedApp.applicationId);
      await fetchQueue();
    } catch (err: any) {
      setErrorMsg(err.message || 'Correction failed');
    } finally {
      setIsCorrecting(false);
    }
  };

  // Submit Recommendation
  const handleSubmitRecommendation = async () => {
    if (!selectedApp) return;
    if (recommendationComment.trim().length < 10) {
      setErrorMsg('Recommendation comment must be at least 10 characters long as per Section 3.');
      return;
    }

    setIsSubmittingRec(true);
    setErrorMsg(null);
    try {
      await api.submitMakerRecommendation({
        applicationId: selectedApp.applicationId,
        recommendation,
        comment: recommendationComment,
        version: selectedApp.version,
      });

      setSuccessMsg(`Recommendation (${recommendation}) submitted. Case routed to Checker.`);
      setRecommendationComment('');
      setSelectedApp(null);
      await fetchQueue();
    } catch (err: any) {
      setErrorMsg(err.message || 'Recommendation failed');
    } finally {
      setIsSubmittingRec(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Title & Queue Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">KYC Officer Review Workbench</h1>
            <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-amber-300">
              Maker Role
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Section 5 (FR-6): Queue ordered by risk (HIGH first) then FIFO submission time. Recommending officer cannot check own case.
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
        {/* Left Col: Review Queue List */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-slate-800 flex items-center justify-between">
            <span>Pending Review</span>
            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">
              {queue.length}
            </span>
          </h2>

          {queue.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No cases currently in review queue.
            </div>
          ) : (
            <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
              {queue.map((app) => (
                <button
                  key={app.applicationId}
                  onClick={() => loadCaseDetails(app.applicationId)}
                  className={`w-full text-left p-3 rounded-lg border transition text-xs space-y-1.5 ${
                    selectedApp?.applicationId === app.applicationId
                      ? 'border-brand-600 bg-brand-50/60 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{app.applicationId}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        app.riskCategory === 'HIGH'
                          ? 'bg-rose-100 text-rose-800'
                          : app.riskCategory === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {app.riskCategory || 'LOW'} RISK
                    </span>
                  </div>
                  <div className="font-medium text-slate-700 truncate">{app.fullName}</div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>{app.applicationDate}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Waiting
                    </span>
                  </div>
                  {app.reasonCodes && app.reasonCodes.length > 0 && (
                    <div className="text-[10px] font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded truncate">
                      {app.reasonCodes.join(', ')}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right 3 Cols: Dual-Pane Review Workbench */}
        <div className="lg:col-span-3 space-y-6">
          {selectedApp ? (
            <>
              {/* Case Summary Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-slate-900">{selectedApp.applicationId}</h2>
                    <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded font-mono border border-brand-200">
                      v{selectedApp.version}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded font-bold ${
                        selectedApp.riskCategory === 'HIGH'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {selectedApp.riskCategory} RISK
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 flex gap-4">
                    <span><strong>Applicant:</strong> {selectedApp.fullName}</span>
                    <span><strong>PAN:</strong> {selectedApp.panNumber}</span>
                    <span><strong>DOB:</strong> {selectedApp.dob}</span>
                    <span><strong>Aadhaar:</strong> {selectedApp.aadhaarLast4}</span>
                  </div>
                </div>

                {/* Reason Codes Triggered */}
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-500 mb-1">Triggered Exceptions:</div>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {selectedApp.reasonCodes?.map((rc) => (
                      <span key={rc} className="bg-amber-100 text-amber-900 text-xs px-2 py-0.5 rounded font-mono border border-amber-200 font-semibold">
                        {rc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dual-Pane Layout: Document Viewer & Extracted Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Pane: Document Text Viewer */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[520px]">
                  {/* Doc Tabs */}
                  <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto p-1.5 gap-1">
                    {appDocs.map((doc) => (
                      <button
                        key={doc.docId}
                        onClick={() => selectDocument(doc)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                          selectedDoc?.docId === doc.docId
                            ? 'bg-white text-brand-700 shadow-sm font-bold border border-slate-200'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{doc.declaredDocType}</span>
                      </button>
                    ))}
                  </div>

                  {/* Document Raw OCR Text Box */}
                  <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-700 bg-slate-900 text-emerald-400 p-4 rounded-b-xl whitespace-pre-wrap leading-relaxed select-text">
                    {docText || 'Loading document text...'}
                  </div>
                </div>

                {/* Right Pane: Extracted Fields & Confidence */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col h-[520px] overflow-y-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Extracted Fields ({selectedDoc?.declaredDocType})
                    </h3>
                    <span className="text-xs font-mono text-slate-500">
                      Doc ID: {selectedDoc?.docId}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                    {docExtractions.map((field) => {
                      const isLowConfidence = field.confidence < 0.8;
                      return (
                        <div
                          key={field._id || field.fieldName}
                          className={`p-3 rounded-lg border transition ${
                            isLowConfidence
                              ? 'border-amber-300 bg-amber-50/50'
                              : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-700 uppercase">
                              {field.fieldName}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                                  isLowConfidence
                                    ? 'bg-amber-200 text-amber-900'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {(field.confidence * 100).toFixed(0)}% conf
                              </span>
                              <button
                                onClick={() => {
                                  setCorrectingField(field);
                                  setCorrectionValue(field.value);
                                  setCorrectionReason('');
                                }}
                                className="text-brand-600 hover:text-brand-800 p-1 hover:bg-brand-50 rounded"
                                title="Correct field"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="font-mono text-sm font-semibold text-slate-900 break-all">
                            {field.value || '<empty>'}
                          </div>

                          {field.source === 'OFFICER' && (
                            <div className="mt-1 text-[11px] text-purple-700 font-medium">
                              Corrected by officer: "{field.correctionReason}" (was: {field.originalValue})
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recommendation Box */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900">KYC Officer Recommendation (FR-6)</h3>

                <div className="flex flex-wrap gap-4 text-xs font-semibold">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
                    <input
                      type="radio"
                      name="rec"
                      value="APPROVE"
                      checked={recommendation === 'APPROVE'}
                      onChange={() => setRecommendation('APPROVE')}
                    />
                    <span className="text-emerald-700">Recommend APPROVE</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
                    <input
                      type="radio"
                      name="rec"
                      value="REJECT"
                      checked={recommendation === 'REJECT'}
                      onChange={() => setRecommendation('REJECT')}
                    />
                    <span className="text-rose-700">Recommend REJECT</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
                    <input
                      type="radio"
                      name="rec"
                      value="REQUEST_RESUBMISSION"
                      checked={recommendation === 'REQUEST_RESUBMISSION'}
                      onChange={() => setRecommendation('REQUEST_RESUBMISSION')}
                    />
                    <span className="text-amber-700">Request Document Resubmission</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Justification / Review Comment (min 10 characters)
                  </label>
                  <textarea
                    rows={3}
                    value={recommendationComment}
                    onChange={(e) => setRecommendationComment(e.target.value)}
                    placeholder="Enter detailed KYC review findings and reason for recommendation..."
                    className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSubmitRecommendation}
                    disabled={isSubmittingRec || recommendationComment.trim().length < 10}
                    className="px-6 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmittingRec ? 'Routing to Checker...' : 'Submit Recommendation to Checker'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-16 rounded-xl border border-slate-200 text-center text-slate-400">
              Select an application from the queue to start review.
            </div>
          )}
        </div>
      </div>

      {/* Field Correction Modal */}
      {correctingField && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Correct Extracted Field: <span className="uppercase text-brand-700">{correctingField.fieldName}</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Correct Value</label>
                <input
                  type="text"
                  value={correctionValue}
                  onChange={(e) => setCorrectionValue(e.target.value)}
                  className="w-full text-xs font-mono p-2 border border-slate-300 rounded focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reason for Correction (min 5 chars)
                </label>
                <input
                  type="text"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Corrected OCR misread 'O' to '0'"
                  className="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCorrectingField(null)}
                className="px-4 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCorrection}
                disabled={isCorrecting}
                className="px-4 py-1.5 bg-brand-700 hover:bg-brand-800 text-white rounded text-xs font-bold disabled:opacity-50"
              >
                {isCorrecting ? 'Re-evaluating...' : 'Save & Re-run Rules'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
