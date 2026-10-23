import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { Application, DocumentRecord, DeclaredDocType } from '../types/index.js';
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';

export const ApplicantPortal: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [activeApp, setActiveApp] = useState<Application | null>(null);
  const [activeDocs, setActiveDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [formData, setFormData] = useState({
    applicationId: '',
    fullName: 'Ravi Kumar Sharma',
    dob: '1990-05-15',
    gender: 'MALE',
    panNumber: 'ZZKPS1234Q',
    aadhaarLast4: '4821',
    mobile: '9876543210',
    email: 'ravi.sharma@example.com',
    address: 'Flat 12, Lotus Residency, MG Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    occupationCode: 'SALARIED_PRIVATE',
    annualIncome: 900000,
    consentKyc: true,
  });

  // Uploaded docs in draft mode
  const [draftDocs, setDraftDocs] = useState<
    Array<{ declaredDocType: DeclaredDocType; fileName: string; docId?: string; fileObj?: File }>
  >([]);

  // Resubmission modal state
  const [resubmittingDocType, setResubmittingDocType] = useState<DeclaredDocType>('ELECTRICITY_BILL');
  const [resubmittingFile, setResubmittingFile] = useState<File | null>(null);

  const fetchMyApplications = async () => {
    setLoading(true);
    try {
      const data = await api.getMyApplications();
      setApplications(data.applications || []);
      if (data.applications && data.applications.length > 0 && !activeApp) {
        selectApplication(data.applications[0].applicationId);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const selectApplication = async (applicationId: string) => {
    try {
      const data = await api.getApplicationDetails(applicationId);
      setActiveApp(data.application);
      setActiveDocs(data.documents);
      setIsCreatingNew(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch application details');
    }
  };

  useEffect(() => {
    fetchMyApplications();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleDocumentFileSelect = (
    docType: DeclaredDocType,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDraftDocs((prev) => [
        ...prev.filter((d) => d.declaredDocType !== docType),
        { declaredDocType: docType, fileName: file.name, fileObj: file },
      ]);
    }
  };

  // Submit new application
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      // 1. Create or save draft
      const draftRes = await api.saveDraft(formData);
      const targetAppId = draftRes.application.applicationId;

      // 2. Upload mandatory documents if selected
      for (const d of draftDocs) {
        if (d.fileObj) {
          const form = new FormData();
          form.append('applicationId', targetAppId);
          form.append('declaredDocType', d.declaredDocType);
          form.append('file', d.fileObj);
          await api.uploadDocument(form);
        }
      }

      // 3. Submit application
      const submitRes = await api.submitApplication({
        ...formData,
        applicationId: targetAppId,
      });

      setSuccessMsg(`Application ${targetAppId} submitted successfully! Outcome: ${submitRes.application.status}`);
      await fetchMyApplications();
      await selectApplication(targetAppId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Resubmission upload handler
  const handleResubmitDocument = async () => {
    if (!activeApp || !resubmittingFile) return;
    try {
      const form = new FormData();
      form.append('applicationId', activeApp.applicationId);
      form.append('declaredDocType', resubmittingDocType);
      form.append('file', resubmittingFile);
      await api.uploadDocument(form);

      // Re-trigger submit to re-run rules
      await api.submitApplication({
        ...activeApp,
        applicationId: activeApp.applicationId,
      });

      setSuccessMsg('New document uploaded. Application re-evaluated!');
      setResubmittingFile(null);
      await selectApplication(activeApp.applicationId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Resubmission failed');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AUTO_APPROVED':
      case 'APPROVED':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Approved</span>;
      case 'AUTO_REJECTED':
      case 'REJECTED':
        return <span className="bg-rose-50 text-rose-700 border border-rose-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Rejected</span>;
      case 'RESUBMISSION_REQUESTED':
        return <span className="bg-amber-50 text-amber-700 border border-amber-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Resubmission Required</span>;
      default:
        return <span className="bg-blue-50 text-blue-700 border border-blue-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Under Verification</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-brand-900 to-brand-700 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Deccan Digital Savings Account</h1>
          <p className="text-brand-100 text-sm mt-1">
            Apply online in minutes. Instant document verification, automated KYC checks, and secure onboarding.
          </p>
        </div>
        <button
          onClick={() => {
            setIsCreatingNew(true);
            setActiveApp(null);
          }}
          className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm transition flex items-center gap-2 shadow-sm"
        >
          <PlusCircle className="w-4 h-4" /> Start New Application
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: My Applications list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-3 flex items-center justify-between">
              <span>My Applications</span>
              <button onClick={fetchMyApplications} className="text-slate-400 hover:text-slate-600">
                <RefreshCw className="w-4 h-4" />
              </button>
            </h2>

            {applications.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">
                No applications submitted yet.
              </div>
            ) : (
              <div className="space-y-2">
                {applications.map((app) => (
                  <button
                    key={app.applicationId}
                    onClick={() => selectApplication(app.applicationId)}
                    className={`w-full text-left p-3 rounded-lg border transition flex items-center justify-between ${
                      activeApp?.applicationId === app.applicationId
                        ? 'border-brand-600 bg-brand-50/50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{app.applicationId}</div>
                      <div className="text-xs text-slate-500">{app.applicationDate}</div>
                    </div>
                    <div>{getStatusBadge(app.status)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: New Application Form or Selected Application Details */}
        <div className="lg:col-span-2">
          {isCreatingNew ? (
            /* New Application Form */
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <h2 className="text-lg font-bold text-slate-900">Savings Account Application Form</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Provide personal details and upload identity documents for automatic KYC verification.
                </p>
              </div>

              <form onSubmit={handleSubmitApplication} className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">1. Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Full Name (as on PAN)</label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        required
                        className="w-full text-sm px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        name="dob"
                        value={formData.dob}
                        onChange={handleInputChange}
                        required
                        className="w-full text-sm px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Gender</label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="w-full text-sm px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">PAN Number</label>
                      <input
                        type="text"
                        name="panNumber"
                        value={formData.panNumber}
                        onChange={handleInputChange}
                        placeholder="e.g. ZZKPS1234Q"
                        required
                        maxLength={10}
                        className="w-full text-sm uppercase px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Aadhaar Last 4 Digits <span className="text-slate-400 font-normal">(Privacy Protected)</span>
                      </label>
                      <input
                        type="text"
                        name="aadhaarLast4"
                        value={formData.aadhaarLast4}
                        onChange={handleInputChange}
                        placeholder="4 digits only"
                        required
                        maxLength={4}
                        className="w-full text-sm px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Only last 4 digits accepted. 12-digit numbers are strictly rejected for privacy protection.
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Mobile Number</label>
                      <input
                        type="tel"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleInputChange}
                        required
                        maxLength={10}
                        className="w-full text-sm px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full text-sm px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Address & Employment */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">2. Address & Employment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Permanent Residential Address</label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                        className="w-full text-sm px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        className="w-full text-sm px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">State</label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        required
                        className="w-full text-sm px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Pincode</label>
                      <input
                        type="text"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        required
                        maxLength={6}
                        className="w-full text-sm px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Occupation</label>
                      <select
                        name="occupationCode"
                        value={formData.occupationCode}
                        onChange={handleInputChange}
                        className="w-full text-sm px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="SALARIED_PRIVATE">Salaried (Private Sector)</option>
                        <option value="SALARIED_PUBLIC">Salaried (Public Sector)</option>
                        <option value="SELF_EMPLOYED">Self-Employed Professional</option>
                        <option value="BUSINESS_OWNER">Business Owner / Trader</option>
                        <option value="RETIRED">Retired</option>
                        <option value="STUDENT">Student</option>
                        <option value="JEWELLER_BULLION_DEALER">Jeweller / Bullion Dealer</option>
                        <option value="MONEY_LENDER">Money Lender</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Annual Income (₹)</label>
                      <input
                        type="number"
                        name="annualIncome"
                        value={formData.annualIncome}
                        onChange={handleInputChange}
                        required
                        className="w-full text-sm px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Mandatory Documents Upload */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">
                    3. Upload KYC Documents (Min 3: PAN Card, Aadhaar Card, Address Proof)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* PAN Card */}
                    <div className="border border-dashed border-slate-300 rounded-lg p-3 text-center bg-slate-50">
                      <FileText className="w-6 h-6 mx-auto text-brand-600 mb-1" />
                      <span className="text-xs font-semibold block text-slate-800">1. PAN Card</span>
                      <input
                        type="file"
                        accept=".txt,.pdf,.png,.jpg"
                        onChange={(e) => handleDocumentFileSelect('PAN_CARD', e)}
                        className="text-[11px] mt-2 block w-full text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-brand-50 file:text-brand-700"
                      />
                    </div>

                    {/* Aadhaar Card */}
                    <div className="border border-dashed border-slate-300 rounded-lg p-3 text-center bg-slate-50">
                      <FileText className="w-6 h-6 mx-auto text-brand-600 mb-1" />
                      <span className="text-xs font-semibold block text-slate-800">2. Aadhaar Card</span>
                      <input
                        type="file"
                        accept=".txt,.pdf,.png,.jpg"
                        onChange={(e) => handleDocumentFileSelect('AADHAAR_CARD', e)}
                        className="text-[11px] mt-2 block w-full text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-brand-50 file:text-brand-700"
                      />
                    </div>

                    {/* Address Proof */}
                    <div className="border border-dashed border-slate-300 rounded-lg p-3 text-center bg-slate-50">
                      <FileText className="w-6 h-6 mx-auto text-brand-600 mb-1" />
                      <span className="text-xs font-semibold block text-slate-800">3. Address Proof</span>
                      <input
                        type="file"
                        accept=".txt,.pdf,.png,.jpg"
                        onChange={(e) => handleDocumentFileSelect('ELECTRICITY_BILL', e)}
                        className="text-[11px] mt-2 block w-full text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-brand-50 file:text-brand-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Mandatory Consent Checkbox */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="consentKyc"
                      checked={formData.consentKyc}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                    />
                    <span className="text-xs text-slate-700 leading-relaxed">
                      I hereby give voluntary consent to Deccan Digital Bank to verify my identity and address details, validate my PAN with tax records, and perform regulatory screening in accordance with Reserve Bank of India (RBI) KYC guidelines.
                    </span>
                  </label>
                </div>

                {/* Submit Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-50"
                  >
                    {submitting ? 'Submitting Application...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </div>
          ) : activeApp ? (
            /* Selected Application Tracker */
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{activeApp.applicationId}</h2>
                    {getStatusBadge(activeApp.status)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Submitted on {activeApp.applicationDate} • Ref Version: v{activeApp.version}
                  </p>
                </div>

                {/* If approved, show opened account banner */}
                {activeApp.coreBankingAccount && (
                  <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-lg text-emerald-800 text-xs">
                    <div className="font-bold flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-emerald-600" /> Account Active
                    </div>
                    <div className="font-mono mt-1">Acc No: {activeApp.coreBankingAccount.accountNumber}</div>
                    <div className="font-mono text-[11px] text-emerald-700">Cust ID: {activeApp.coreBankingAccount.customerId}</div>
                  </div>
                )}
              </div>

              {/* Status Explanation Card */}
              {activeApp.reasons && activeApp.reasons.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                  <h3 className="text-xs font-semibold text-slate-700">Application Status Notes</h3>
                  <div className="space-y-1.5">
                    {activeApp.reasons.map((r, i) => (
                      <div key={i} className="text-xs text-slate-600 flex items-start gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5"></span>
                        <span>{r.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resubmission Action Banner if Requested */}
              {activeApp.status === 'RESUBMISSION_REQUESTED' && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-900 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertCircle className="w-5 h-5 text-amber-600" /> Document Resubmission Requested
                  </div>
                  <p className="text-xs leading-relaxed text-amber-800">
                    Our KYC verification officer has requested an updated or clearer document. Please upload a replacement document within 7 days.
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <select
                      value={resubmittingDocType}
                      onChange={(e) => setResubmittingDocType(e.target.value as DeclaredDocType)}
                      className="text-xs border border-amber-300 rounded px-2 py-1.5 bg-white text-slate-800"
                    >
                      <option value="ELECTRICITY_BILL">Electricity Bill</option>
                      <option value="BANK_STATEMENT">Bank Statement</option>
                      <option value="DRIVING_LICENCE">Driving Licence</option>
                      <option value="PAN_CARD">PAN Card</option>
                      <option value="AADHAAR_CARD">Aadhaar Card</option>
                    </select>
                    <input
                      type="file"
                      accept=".txt,.pdf,.png,.jpg"
                      onChange={(e) => setResubmittingFile(e.target.files?.[0] || null)}
                      className="text-xs text-amber-900 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-amber-200 file:text-amber-900"
                    />
                    <button
                      onClick={handleResubmitDocument}
                      disabled={!resubmittingFile}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold disabled:opacity-50"
                    >
                      Upload & Re-submit
                    </button>
                  </div>
                </div>
              )}

              {/* Personal Details Snapshot (Masked) */}
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Applicant Profile</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Full Name</span>
                    <span className="font-semibold text-slate-800">{activeApp.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">PAN Number</span>
                    <span className="font-mono font-semibold text-slate-800">{activeApp.panNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Aadhaar</span>
                    <span className="font-mono font-semibold text-slate-800">{activeApp.aadhaarLast4}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Date of Birth</span>
                    <span className="font-semibold text-slate-800">{activeApp.dob}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Mobile</span>
                    <span className="font-semibold text-slate-800">{activeApp.mobile}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">City / State</span>
                    <span className="font-semibold text-slate-800">{activeApp.city}, {activeApp.state}</span>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents List */}
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Uploaded Documents</h3>
                <div className="space-y-2">
                  {activeDocs.map((doc) => (
                    <div
                      key={doc.docId}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-brand-600" />
                        <div>
                          <div className="font-semibold text-slate-800">{doc.fileName}</div>
                          <div className="text-[11px] text-slate-400">
                            Declared Type: {doc.declaredDocType} • ID: {doc.docId}
                          </div>
                        </div>
                      </div>
                      <a
                        href={api.getDocumentFileUrl(doc.docId)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View File
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400">
              Select an application or click "Start New Application".
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
