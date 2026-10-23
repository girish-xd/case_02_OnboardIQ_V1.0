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
  Building2,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
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
  const [addressProofDocType, setAddressProofDocType] = useState<DeclaredDocType>('ELECTRICITY_BILL');

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

      setSuccessMsg(`Application ${targetAppId} submitted successfully. Current Status: ${submitRes.application.status}`);
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

      setSuccessMsg('New document uploaded. Application re-evaluated.');
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
        return (
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1 font-mono">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            <span>APPROVED</span>
          </span>
        );
      case 'AUTO_REJECTED':
      case 'REJECTED':
        return (
          <span className="bg-rose-50 text-rose-800 border border-rose-300 px-2.5 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1 font-mono">
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            <span>REJECTED</span>
          </span>
        );
      case 'RESUBMISSION_REQUESTED':
        return (
          <span className="bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1 font-mono">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            <span>ACTION REQUIRED</span>
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>IN VERIFICATION</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Customer Onboarding & Account Portal
            </h1>
            <span className="bg-slate-100 text-slate-700 font-mono text-[11px] px-2 py-0.5 rounded font-semibold border border-slate-200">
              SAVINGS ACC
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Instant identity verification, automated OCR document extraction, and dual-control compliance screening.
          </p>
        </div>
        <button
          onClick={() => {
            setIsCreatingNew(true);
            setActiveApp(null);
          }}
          className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-lg text-xs transition flex items-center gap-2 shadow-xs"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New Account Application</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200/90 text-rose-800 rounded-lg text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200/90 text-emerald-800 rounded-lg text-xs flex items-center gap-2.5">
          <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: My Applications List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                My Submitted Cases
              </h2>
              <button
                onClick={fetchMyApplications}
                disabled={loading}
                className="text-slate-400 hover:text-slate-700 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {applications.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No applications submitted yet. Click above to apply.
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {applications.map((app) => {
                  const isSelected = activeApp?.applicationId === app.applicationId;
                  return (
                    <button
                      key={app.applicationId}
                      onClick={() => selectApplication(app.applicationId)}
                      className={`w-full text-left p-3 rounded-lg border transition text-xs space-y-1.5 ${
                        isSelected
                          ? 'border-slate-900 bg-slate-50/80 shadow-2xs ring-1 ring-slate-900/5'
                          : 'border-slate-200/80 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900">{app.applicationId}</span>
                        <div>{getStatusBadge(app.status)}</div>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        Date: {app.applicationDate}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: New Application Form or Selected Application Details */}
        <div className="lg:col-span-2">
          {isCreatingNew ? (
            /* New Application Form */
            <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Savings Account Application</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your KYC credentials and upload identity proofs for automated verification.
                </p>
              </div>

              <form onSubmit={handleSubmitApplication} className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                    1. Identity Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Full Legal Name (as on PAN)
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        required
                        className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                        className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Gender</label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                        className="w-full text-xs uppercase px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
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
                        className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Only last 4 digits accepted. 12-digit Aadhaar values are strictly rejected for privacy protection.
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
                        className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
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
                        className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Address & Employment */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                    2. Address & Occupation
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Residential Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                        className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                        className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                        className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                        className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Occupation</label>
                      <select
                        name="occupationCode"
                        value={formData.occupationCode}
                        onChange={handleInputChange}
                        className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                        className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Mandatory Documents Upload */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                    3. Required Document Proofs (Min 3: PAN, Aadhaar, Address Proof)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* PAN Card */}
                    <div className="border border-slate-200/90 rounded-xl p-3.5 bg-slate-50/60 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-slate-800">1. PAN Card</span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">PDF/Image</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-2">Mandatory proof of tax identity</p>
                      </div>
                      <div>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.txt"
                          onChange={(e) => handleDocumentFileSelect('PAN_CARD', e)}
                          className="text-[11px] block w-full text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-medium file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                        />
                        {draftDocs.find((d) => d.declaredDocType === 'PAN_CARD') && (
                          <div className="mt-2 text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">{draftDocs.find((d) => d.declaredDocType === 'PAN_CARD')?.fileName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Aadhaar Card */}
                    <div className="border border-slate-200/90 rounded-xl p-3.5 bg-slate-50/60 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-slate-800">2. Aadhaar Card</span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">PDF/Image</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-2">Masked or standard e-Aadhaar</p>
                      </div>
                      <div>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.txt"
                          onChange={(e) => handleDocumentFileSelect('AADHAAR_CARD', e)}
                          className="text-[11px] block w-full text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-medium file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                        />
                        {draftDocs.find((d) => d.declaredDocType === 'AADHAAR_CARD') && (
                          <div className="mt-2 text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">{draftDocs.find((d) => d.declaredDocType === 'AADHAAR_CARD')?.fileName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Address Proof */}
                    <div className="border border-slate-200/90 rounded-xl p-3.5 bg-slate-50/60 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-slate-800">3. Address Proof</span>
                          <select
                            value={addressProofDocType}
                            onChange={(e) => setAddressProofDocType(e.target.value as DeclaredDocType)}
                            className="text-[10px] font-medium border border-slate-200 rounded px-1.5 py-0.5 bg-white text-slate-800 focus:outline-none"
                          >
                            <option value="ELECTRICITY_BILL">Electricity Bill</option>
                            <option value="BANK_STATEMENT">Bank Statement</option>
                            <option value="DRIVING_LICENCE">Driving Licence</option>
                          </select>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-2">Utility bill, bank statement, or DL</p>
                      </div>
                      <div>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.txt"
                          onChange={(e) => handleDocumentFileSelect(addressProofDocType, e)}
                          className="text-[11px] block w-full text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-medium file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                        />
                        {draftDocs.find((d) => d.declaredDocType === addressProofDocType) && (
                          <div className="mt-2 text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">{draftDocs.find((d) => d.declaredDocType === addressProofDocType)?.fileName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Consent */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      name="consentKyc"
                      checked={formData.consentKyc}
                      onChange={handleInputChange}
                      className="mt-0.5 h-4 w-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900"
                    />
                    <span className="text-[11px] text-slate-600 leading-relaxed">
                      I voluntarily give consent to Deccan Digital Bank to verify my identity and address details, validate my PAN with tax authority records, and perform regulatory AML/PEP screening under RBI guidelines.
                    </span>
                  </label>
                </div>

                {/* Submit Actions */}
                <div className="flex justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
                  >
                    {submitting ? 'Submitting Application...' : 'Submit KYC Application'}
                  </button>
                </div>
              </form>
            </div>
          ) : activeApp ? (
            /* Selected Application Tracker */
            <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold font-mono text-slate-900">{activeApp.applicationId}</h2>
                    {getStatusBadge(activeApp.status)}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Application Date: <span className="font-mono">{activeApp.applicationDate}</span> • Ref Version: v{activeApp.version}
                  </p>
                </div>

                {/* Core Banking Opened Account Banner */}
                {activeApp.coreBankingAccount && (
                  <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-lg text-emerald-900 text-xs">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Savings Account Active</span>
                    </div>
                    <div className="font-mono mt-1 text-[11px]">Acc No: {activeApp.coreBankingAccount.accountNumber}</div>
                    <div className="font-mono text-[10px] text-emerald-700">Cust ID: {activeApp.coreBankingAccount.customerId}</div>
                  </div>
                )}
              </div>

              {/* Status Explanation Card */}
              {activeApp.reasons && activeApp.reasons.length > 0 && (
                <div className="bg-slate-50/80 p-4 rounded-lg border border-slate-200 space-y-2">
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
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-900 space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Document Resubmission Requested</span>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-800">
                    Our compliance verification officer has requested a clearer or updated proof. Please upload the requested document below:
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <select
                      value={resubmittingDocType}
                      onChange={(e) => setResubmittingDocType(e.target.value as DeclaredDocType)}
                      className="text-xs border border-amber-300 rounded px-2.5 py-1.5 bg-white text-slate-800"
                    >
                      <option value="ELECTRICITY_BILL">Electricity Bill</option>
                      <option value="BANK_STATEMENT">Bank Statement</option>
                      <option value="DRIVING_LICENCE">Driving Licence</option>
                      <option value="PAN_CARD">PAN Card</option>
                      <option value="AADHAAR_CARD">Aadhaar Card</option>
                    </select>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.txt"
                      onChange={(e) => setResubmittingFile(e.target.files?.[0] || null)}
                      className="text-xs text-amber-900 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-amber-200 file:text-amber-900"
                    />
                    <button
                      onClick={handleResubmitDocument}
                      disabled={!resubmittingFile}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold disabled:opacity-50 transition"
                    >
                      Upload & Re-submit
                    </button>
                  </div>
                </div>
              )}

              {/* Applicant Profile (Masked) */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
                  Customer Profile & Masked PII
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 font-mono">
                  <div>
                    <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-sans">Full Name</span>
                    <span className="font-semibold text-slate-900 font-sans">{activeApp.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-sans">PAN</span>
                    <span className="font-semibold text-slate-900">{activeApp.panNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-sans">Aadhaar (Last 4)</span>
                    <span className="font-semibold text-slate-900">{activeApp.aadhaarLast4}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-sans">Date of Birth</span>
                    <span className="font-semibold text-slate-900">{activeApp.dob}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-sans">Mobile</span>
                    <span className="font-semibold text-slate-900">{activeApp.mobile}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-sans">Location</span>
                    <span className="font-semibold text-slate-900 font-sans">{activeApp.city}, {activeApp.state}</span>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents List */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
                  Uploaded Identity Documents
                </h3>
                <div className="space-y-2">
                  {activeDocs.map((doc) => (
                    <div
                      key={doc.docId}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200/80 bg-white text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <div>
                          <div className="font-semibold text-slate-800">{doc.fileName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Type: {doc.declaredDocType} • ID: {doc.docId}
                          </div>
                        </div>
                      </div>
                      <a
                        href={api.getDocumentFileUrl(doc.docId)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-medium flex items-center gap-1 transition"
                      >
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                        <span>View Document</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-xl border border-slate-200/90 text-center text-slate-400 text-xs">
              Select an application from the left panel or click "New Account Application" to begin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
