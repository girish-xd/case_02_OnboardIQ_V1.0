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
  ShieldAlert,
  ChevronRight,
  User,
  Hash,
  Activity,
  Layers,
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
      await api.correctField({
        applicationId: selectedApp.applicationId,
        docId: selectedDoc.docId,
        fieldName: correctingField.fieldName,
        newValue: correctionValue,
        reason: correctionReason,
        version: selectedApp.version,
      });

      setSuccessMsg(`Field ${correctingField.fieldName} corrected. Rules re-evaluated successfully.`);
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
      setErrorMsg('Recommendation comment must be at least 10 characters long as per KYC review standards.');
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

      setSuccessMsg(`Recommendation (${recommendation}) recorded. Case forwarded to Checker queue.`);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title & Queue Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              KYC Officer Review Workbench
            </h1>
            <span className="bg-amber-500/10 text-amber-800 text-xs px-2.5 py-0.5 rounded-md font-semibold border border-amber-300/60 font-mono">
              FIRST-LINE DEFENCE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Priority review queue sorted by risk level (HIGH risk priority) followed by FIFO submission timestamp.
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
        {/* Left Column: Review Queue List */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Review Queue</span>
            </h2>
            <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-mono font-bold">
              {queue.length}
            </span>
          </div>

          {queue.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <span>All cases reviewed. Queue is empty.</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
              {queue.map((app) => {
                const isSelected = selectedApp?.applicationId === app.applicationId;
                const isHighRisk = app.riskCategory === 'HIGH';
                const isMedRisk = app.riskCategory === 'MEDIUM';

                return (
                  <button
                    key={app.applicationId}
                    onClick={() => loadCaseDetails(app.applicationId)}
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
                          isHighRisk
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                            : isMedRisk
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {app.riskCategory || 'LOW'}
                      </span>
                    </div>
                    <div className="font-medium text-slate-800 truncate">{app.fullName}</div>
                    <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between">
                      <span>{app.applicationDate}</span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3" /> In Review
                      </span>
                    </div>
                    {app.reasonCodes && app.reasonCodes.length > 0 && (
                      <div className="text-[10px] font-mono text-amber-900 bg-amber-50/80 border border-amber-200/60 px-1.5 py-0.5 rounded truncate">
                        {app.reasonCodes.join(', ')}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 3 Columns: Dual-Pane Review Terminal */}
        <div className="lg:col-span-3 space-y-5">
          {selectedApp ? (
            <>
              {/* Case Summary Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-bold font-mono text-slate-900">{selectedApp.applicationId}</h2>
                    <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono border border-slate-200">
                      v{selectedApp.version}
                    </span>
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded font-mono font-bold ${
                        selectedApp.riskCategory === 'HIGH'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {selectedApp.riskCategory} RISK
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-4 font-mono">
                    <span><strong className="text-slate-800 font-sans">Name:</strong> {selectedApp.fullName}</span>
                    <span><strong className="text-slate-800 font-sans">PAN:</strong> {selectedApp.panNumber}</span>
                    <span><strong className="text-slate-800 font-sans">DOB:</strong> {selectedApp.dob}</span>
                    <span><strong className="text-slate-800 font-sans">Aadhaar:</strong> {selectedApp.aadhaarLast4}</span>
                  </div>
                </div>

                {/* Reason Codes Triggered */}
                <div className="text-right">
                  <div className="text-[11px] font-medium text-slate-500 mb-1">Triggered Exception Flags:</div>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {selectedApp.reasonCodes && selectedApp.reasonCodes.length > 0 ? (
                      selectedApp.reasonCodes.map((rc) => (
                        <span
                          key={rc}
                          className="bg-amber-50 text-amber-900 text-[11px] px-2 py-0.5 rounded font-mono border border-amber-200 font-semibold"
                        >
                          {rc}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">None</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Dual-Pane Layout: Document Viewer & Extracted Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left Pane: Document Text Viewer */}
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col h-[520px]">
                  {/* Doc Tabs */}
                  <div className="flex border-b border-slate-200 bg-slate-50/80 p-1.5 gap-1.5 overflow-x-auto">
                    {appDocs.map((doc) => {
                      const isDocSelected = selectedDoc?.docId === doc.docId;
                      return (
                        <button
                          key={doc.docId}
                          onClick={() => selectDocument(doc)}
                          className={`text-xs px-3 py-1.5 rounded-md font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                            isDocSelected
                              ? 'bg-white text-slate-900 shadow-2xs font-semibold border border-slate-200/90'
                              : 'text-slate-600 hover:bg-slate-200/60'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>{doc.declaredDocType}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Document Raw OCR Text Box with clean legal reader styling */}
                  <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-200 bg-slate-950 p-4 rounded-b-xl whitespace-pre-wrap leading-relaxed select-text border-t border-slate-900">
                    {docText || 'Loading document text...'}
                  </div>
                </div>

                {/* Right Pane: Extracted Fields & Confidence */}
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col h-[520px]">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Extracted Fields ({selectedDoc?.declaredDocType || 'Document'})
                    </h3>
                    <span className="text-[11px] font-mono text-slate-500">
                      ID: {selectedDoc?.docId}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                    {docExtractions.map((field) => {
                      const isLowConfidence = field.confidence < 0.8;
                      return (
                        <div
                          key={field._id || field.fieldName}
                          className={`p-3 rounded-lg border transition ${
                            isLowConfidence
                              ? 'border-amber-200 bg-amber-50/40'
                              : 'border-slate-200/80 bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-slate-600 uppercase">
                              {field.fieldName}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                                  isLowConfidence
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
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
                                className="text-slate-600 hover:text-slate-900 p-1 hover:bg-slate-200/60 rounded transition"
                                title="Correct field value"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="font-mono text-xs font-semibold text-slate-900 break-all">
                            {field.value || '<empty>'}
                          </div>

                          {field.source === 'OFFICER' && (
                            <div className="mt-1.5 text-[10px] text-purple-700 font-medium">
                              Officer override: "{field.correctionReason}" (was: {field.originalValue})
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recommendation Submission Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Officer Recommendation & Verification Finding
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-medium">
                  <label
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition ${
                      recommendation === 'APPROVE'
                        ? 'border-emerald-500 bg-emerald-50/40 text-emerald-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rec"
                      value="APPROVE"
                      checked={recommendation === 'APPROVE'}
                      onChange={() => setRecommendation('APPROVE')}
                    />
                    <span className="font-semibold">Recommend APPROVE</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition ${
                      recommendation === 'REJECT'
                        ? 'border-rose-500 bg-rose-50/40 text-rose-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rec"
                      value="REJECT"
                      checked={recommendation === 'REJECT'}
                      onChange={() => setRecommendation('REJECT')}
                    />
                    <span className="font-semibold">Recommend REJECT</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition ${
                      recommendation === 'REQUEST_RESUBMISSION'
                        ? 'border-amber-500 bg-amber-50/40 text-amber-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rec"
                      value="REQUEST_RESUBMISSION"
                      checked={recommendation === 'REQUEST_RESUBMISSION'}
                      onChange={() => setRecommendation('REQUEST_RESUBMISSION')}
                    />
                    <span className="font-semibold">Request Resubmission</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Verification Finding / Justification (Min 10 chars required for audit trail)
                  </label>
                  <textarea
                    rows={3}
                    value={recommendationComment}
                    onChange={(e) => setRecommendationComment(e.target.value)}
                    placeholder="Enter detailed KYC analysis and justification for recommendation..."
                    className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleSubmitRecommendation}
                    disabled={isSubmittingRec || recommendationComment.trim().length < 10}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition flex items-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingRec ? 'Routing to Checker...' : 'Submit Finding to Checker'}</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-16 rounded-xl border border-slate-200/90 text-center text-slate-400 text-xs">
              Select an application from the review queue on the left to begin verification.
            </div>
          )}
        </div>
      </div>

      {/* Field Correction Modal */}
      {correctingField && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Audit Field Correction: <span className="uppercase text-slate-700 font-mono">{correctingField.fieldName}</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">New Corrected Value</label>
                <input
                  type="text"
                  value={correctionValue}
                  onChange={(e) => setCorrectionValue(e.target.value)}
                  className="w-full text-xs font-mono p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
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
                  placeholder="e.g. Corrected OCR misread character from original document"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCorrectingField(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCorrection}
                disabled={isCorrecting}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition"
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
