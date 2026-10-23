import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { DashboardKPIs, AuditLogItem } from '../types/index.js';
import {
  TrendingUp,
  Clock,
  CheckCircle,
  AlertOctagon,
  Download,
  Search,
  RefreshCw,
  Sliders,
  ShieldCheck,
  FileSpreadsheet,
  Activity,
  Layers,
  Database,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditTotal, setAuditTotal] = useState<number>(0);
  const [rulesConfig, setRulesConfig] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [exportReason, setExportReason] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [auditFilterAppId, setAuditFilterAppId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [kpiRes, auditRes, configRes] = await Promise.all([
        api.getDashboardKPIs(),
        api.getAuditLogs({ applicationId: auditFilterAppId || undefined, limit: 25 }),
        api.getConfig(),
      ]);
      setKpis(kpiRes);
      setAuditLogs(auditRes.logs || []);
      setAuditTotal(auditRes.total || 0);
      setRulesConfig(configRes.config);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [auditFilterAppId]);

  const handleExportAudit = async () => {
    if (!exportReason || exportReason.trim().length < 5) {
      alert('Mandatory justification reason (min 5 chars) is required for audit export.');
      return;
    }

    setExporting(true);
    try {
      const url = `/api/v1/admin/audit/export?reason=${encodeURIComponent(exportReason.trim())}`;
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `deccan_audit_export_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setIsExportModalOpen(false);
        setExportReason('');
        await fetchData();
      } else {
        alert('Failed to export audit logs');
      }
    } catch (e) {
      console.error(e);
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-7 py-8 space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Operational & Compliance Analytics
            </h1>
            <span className="bg-purple-500/10 text-purple-800 text-xs px-2.5 py-0.5 rounded-md font-semibold border border-purple-300/60 font-mono">
              ADMIN & COMPLIANCE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Reconciled straight-through rate, review ageing metrics, reason code distributions, and immutable audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {kpis && (
            <span className="text-[11px] text-slate-400 font-mono">
              As of: {new Date(kpis.asOf).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Straight-Through Rate */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
              <span>Straight-Through Rate</span>
              <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {kpis.metrics.straightThroughRate}%
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              Target: &gt; 60% (Auto-Approved)
            </p>
          </div>

          {/* Manual Review Rate */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
              <span>Manual Review Rate</span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {kpis.metrics.reviewRate}%
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              Target: ~30-40% under maker-checker
            </p>
          </div>

          {/* Rejection Rate */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
              <span>Rejection Rate</span>
              <AlertOctagon className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {kpis.metrics.rejectRate}%
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              Total Decided: {kpis.metrics.totalDecided} cases
            </p>
          </div>

          {/* Average Review Time */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
              <span>Avg Review Ageing</span>
              <Activity className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {kpis.metrics.averageReviewTimeHours}h
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              In-Queue: {kpis.metrics.pendingCheckerCount} pending checker
            </p>
          </div>
        </div>
      )}

      {/* Status Breakdown & Top Reason Codes */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Status Breakdown */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Application Status Distribution
            </h3>
            <div className="space-y-2">
              {Object.entries(kpis.statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                  <span className="font-mono text-slate-700 font-medium">{status}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{count}</span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      ({((count / kpis.totalApplications) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Reason Codes */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Top Triggered Rule Exceptions
            </h3>
            {kpis.topReasonCodes.length === 0 ? (
              <p className="text-xs text-slate-400">No rule exceptions recorded.</p>
            ) : (
              <div className="space-y-2">
                {kpis.topReasonCodes.map((r, i) => (
                  <div key={r.code} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 font-mono font-bold flex items-center justify-center text-[10px]">
                        {i + 1}
                      </span>
                      <span className="font-mono font-semibold text-slate-800">{r.code}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80 text-[11px]">
                      {r.count} hits
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Append-Only Compliance Audit Trail */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-700" />
              <span>Immutable Audit Trail (Section 5 / FR-9)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Append-only tamper-evident ledger of all user actions, document views, corrections, and screening outcomes.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by App ID..."
                value={auditFilterAppId}
                onChange={(e) => setAuditFilterAppId(e.target.value)}
                className="text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none w-44 font-mono"
              />
            </div>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Masked CSV Export</span>
            </button>
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto border border-slate-200/80 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Action</th>
                <th className="p-3">Actor / Role</th>
                <th className="p-3">Target App</th>
                <th className="p-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    No audit records match the query.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/60 transition">
                    <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-800 font-mono text-[11px]">{log.actorRole}</span>
                      {log.actorEmail && (
                        <span className="text-[10px] text-slate-400 block font-mono">{log.actorEmail}</span>
                      )}
                    </td>
                    <td className="p-3 font-mono font-medium text-slate-900">
                      {log.applicationId || '-'}
                    </td>
                    <td className="p-3 text-[11px] font-mono text-slate-600 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rules Configuration Inspector */}
      {rulesConfig && (
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-slate-700" />
              <span>Active KYC Rules Thresholds (v{rulesConfig.version})</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Source: case_02_rules_config_V1.0.json</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-slate-50 p-3.5 rounded-lg border border-slate-200/70">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Min Field Conf:</span>
              <strong className="text-slate-900 text-sm">{rulesConfig.min_field_confidence}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Name Match Thresh:</span>
              <strong className="text-slate-900 text-sm">{rulesConfig.name_match_threshold}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Name Reject Below:</span>
              <strong className="text-slate-900 text-sm">{rulesConfig.name_reject_below}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Address Proof Max Age:</span>
              <strong className="text-slate-900 text-sm">{rulesConfig.address_proof_max_age_days} days</strong>
            </div>
          </div>
        </div>
      )}

      {/* Export Justification Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-slate-700" />
              <span>Masked Audit Trail Export</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Exporting compliance audit data requires a mandatory justification reason. All PII values (PAN, Aadhaar, Mobile) will be masked to protect confidentiality.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Mandatory Justification (min 5 chars)
              </label>
              <input
                type="text"
                value={exportReason}
                onChange={(e) => setExportReason(e.target.value)}
                placeholder="e.g. Quarterly Compliance Regulatory Audit"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExportAudit}
                disabled={exporting || exportReason.trim().length < 5}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition"
              >
                {exporting ? 'Generating CSV...' : 'Download Export'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
