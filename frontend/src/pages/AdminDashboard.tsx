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
        api.getAuditLogs({ applicationId: auditFilterAppId || undefined, limit: 20 }),
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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Operational & Compliance Analytics</h1>
            <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-purple-300">
              Admin & Compliance
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Section 5 (FR-10): Reconciled straight-through rate, review ageing, reason distribution, and append-only audit trail.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {kpis && (
            <span className="text-xs text-slate-400 font-mono">
              As of: {new Date(kpis.asOf).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Straight-through processing rate */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Straight-Through Rate</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {kpis.metrics.straightThroughRate}%
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Target: &gt; 60% (Clean auto-approved)
            </p>
          </div>

          {/* Review Rate */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Manual Review Rate</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {kpis.metrics.reviewRate}%
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Target: ~30-40% under maker-checker
            </p>
          </div>

          {/* Rejection Rate */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Rejection Rate</span>
              <AlertOctagon className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {kpis.metrics.rejectRate}%
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Total Decided: {kpis.metrics.totalDecided} applications
            </p>
          </div>

          {/* Average Review Time */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Avg Queue Ageing</span>
              <Clock className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {kpis.metrics.averageReviewTimeHours}h
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Pending in Checker: {kpis.metrics.pendingCheckerCount}
            </p>
          </div>
        </div>
      )}

      {/* Status Breakdown & Top Reason Codes */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Breakdown */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Application Status Distribution</h3>
            <div className="space-y-2">
              {Object.entries(kpis.statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-700">{status}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{count}</span>
                    <span className="text-slate-400">
                      ({((count / kpis.totalApplications) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Reason Codes */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Top 5 Triggered Rule Exceptions</h3>
            {kpis.topReasonCodes.length === 0 ? (
              <p className="text-xs text-slate-400">No rule exceptions recorded.</p>
            ) : (
              <div className="space-y-2.5">
                {kpis.topReasonCodes.map((r, i) => (
                  <div key={r.code} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                        {i + 1}
                      </span>
                      <span className="font-mono font-bold text-amber-900">{r.code}</span>
                    </div>
                    <span className="font-bold text-slate-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {r.count} hits
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Append-Only Audit Trail Viewer */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-700" /> Append-Only Compliance Audit Trail (FR-9)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Logs decisions, document views, field corrections, and watchlist hits. Updates and deletions are forbidden.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Filter by App ID..."
              value={auditFilterAppId}
              onChange={(e) => setAuditFilterAppId(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-3 py-1.5 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Masked Export (CSV)
            </button>
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Action</th>
                <th className="p-3">Actor / Role</th>
                <th className="p-3">Target Application</th>
                <th className="p-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    No audit records match the current filter.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50">
                    <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{log.actorRole}</span>
                      {log.actorEmail && (
                        <span className="text-[11px] text-slate-400 block">{log.actorEmail}</span>
                      )}
                    </td>
                    <td className="p-3 font-mono font-medium text-brand-700">
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
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-brand-700" /> Active KYC Rules Configuration (v{rulesConfig.version})
          </h3>
          <p className="text-xs text-slate-500">
            Loaded from <code className="font-mono text-slate-700">case_02_rules_config_V1.0.json</code>. Changing thresholds updates decisions dynamically.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-400 block">Min Field Conf:</span>
              <strong className="text-slate-900">{rulesConfig.min_field_confidence}</strong>
            </div>
            <div>
              <span className="text-slate-400 block">Name Match Thresh:</span>
              <strong className="text-slate-900">{rulesConfig.name_match_threshold}</strong>
            </div>
            <div>
              <span className="text-slate-400 block">Name Reject Below:</span>
              <strong className="text-slate-900">{rulesConfig.name_reject_below}</strong>
            </div>
            <div>
              <span className="text-slate-400 block">Address Proof Max Age:</span>
              <strong className="text-slate-900">{rulesConfig.address_proof_max_age_days} days</strong>
            </div>
          </div>
        </div>
      )}

      {/* Export Justification Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-brand-600" /> Masked Audit Trail Export
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              In accordance with Deccan Digital Bank data governance policies, exporting audit data requires a mandatory compliance justification reason. All PII will be masked (e.g. ZZKXXXXX4Q).
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Compliance Justification Reason (min 5 chars)
              </label>
              <input
                type="text"
                value={exportReason}
                onChange={(e) => setExportReason(e.target.value)}
                placeholder="e.g. Quarterly Regulatory Audit Review"
                className="w-full text-xs p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExportAudit}
                disabled={exporting || exportReason.trim().length < 5}
                className="px-4 py-1.5 bg-brand-700 hover:bg-brand-800 text-white rounded text-xs font-bold disabled:opacity-50"
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
