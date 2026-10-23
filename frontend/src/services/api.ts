import {
  User,
  Application,
  DocumentRecord,
  ExtractionRecord,
  NotificationItem,
  AuditLogItem,
  DashboardKPIs,
} from '../types/index.js';

const BASE_URL = '/api/v1';

class ApiService {
  private csrfToken: string | null = null;
  private jwtToken: string | null = null;

  constructor() {
    // Restore JWT from localStorage if available
    try {
      this.jwtToken = localStorage.getItem('onboardiq_jwt_token');
    } catch (_) {
      this.jwtToken = null;
    }
  }

  public setCsrfToken(token: string | null) {
    this.csrfToken = token;
  }

  public setJwtToken(token: string | null) {
    this.jwtToken = token;
    try {
      if (token) {
        localStorage.setItem('onboardiq_jwt_token', token);
      } else {
        localStorage.removeItem('onboardiq_jwt_token');
      }
    } catch (_) {}
  }

  public getJwtToken(): string | null {
    return this.jwtToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    // Attach JWT Bearer token
    if (this.jwtToken) {
      headers['Authorization'] = `Bearer ${this.jwtToken}`;
    }

    if (this.csrfToken) {
      headers['x-csrf-token'] = this.csrfToken;
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Include HttpOnly cookies as dual-protection
    });

    if (!res.ok) {
      let errData: any = {};
      try {
        errData = await res.json();
      } catch (_) {
        errData = { message: res.statusText };
      }

      // If token is invalid or expired, clear local credentials
      if (res.status === 401) {
        this.setJwtToken(null);
      }

      const error: any = new Error(errData.message || 'Request failed');
      error.status = res.status;
      error.code = errData.code;
      error.errors = errData.errors;
      throw error;
    }

    return res.json();
  }

  // Auth APIs
  public async login(username: string, password: string) {
    const data = await this.request<{ user: User; csrfToken: string; token?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (data.token) {
      this.setJwtToken(data.token);
    }
    if (data.csrfToken) {
      this.csrfToken = data.csrfToken;
    }
    return data;
  }

  public async register(payload: { username: string; password: string; fullName: string; email: string }) {
    return this.request<{ message: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getMe() {
    const data = await this.request<{ user: User; csrfToken: string }>('/auth/me');
    if (data.csrfToken) {
      this.csrfToken = data.csrfToken;
    }
    return data;
  }

  public async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setJwtToken(null);
      this.csrfToken = null;
    }
  }

  // Application APIs
  public async saveDraft(applicationData: any) {
    return this.request<{ message: string; application: Application }>('/applications/draft', {
      method: 'POST',
      body: JSON.stringify(applicationData),
    });
  }

  public async submitApplication(applicationData: any) {
    return this.request<{ message: string; application: Application }>('/applications/submit', {
      method: 'POST',
      body: JSON.stringify(applicationData),
    });
  }

  public async getMyApplications() {
    return this.request<{ applications: Application[] }>('/applications/my');
  }

  public async getApplicationDetails(applicationId: string) {
    return this.request<{ application: Application; documents: DocumentRecord[] }>(
      `/applications/${applicationId}`
    );
  }

  // Document APIs
  public async uploadDocument(formData: FormData) {
    return this.request<{ message: string; document: DocumentRecord; extraction: any }>('/documents/upload', {
      method: 'POST',
      body: formData,
    });
  }

  public async getDocumentExtractions(docId: string) {
    return this.request<{ extractions: ExtractionRecord[] }>(`/documents/${docId}/extractions`);
  }

  public getDocumentFileUrl(docId: string) {
    const token = this.getJwtToken();
    return token
      ? `${BASE_URL}/documents/${docId}/file?token=${encodeURIComponent(token)}`
      : `${BASE_URL}/documents/${docId}/file`;
  }

  // Maker APIs
  public async getMakerQueue() {
    return this.request<{ queue: Application[] }>('/maker/queue');
  }

  public async claimMakerCase(applicationId: string, version: number) {
    return this.request<{ message: string; application: Application }>('/maker/claim', {
      method: 'POST',
      body: JSON.stringify({ applicationId, version }),
    });
  }

  public async correctField(payload: {
    applicationId: string;
    docId: string;
    fieldName: string;
    newValue: string;
    reason: string;
    version: number;
  }) {
    return this.request<{ message: string; application: Application }>('/maker/correct-field', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async submitMakerRecommendation(payload: {
    applicationId: string;
    recommendation: 'APPROVE' | 'REJECT' | 'REQUEST_RESUBMISSION';
    comment: string;
    version: number;
  }) {
    return this.request<{ message: string; application: Application }>('/maker/recommend', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Checker APIs
  public async getCheckerQueue() {
    return this.request<{ queue: Application[] }>('/checker/queue');
  }

  public async claimCheckerCase(applicationId: string, version: number) {
    return this.request<{ message: string; application: Application }>('/checker/claim', {
      method: 'POST',
      body: JSON.stringify({ applicationId, version }),
    });
  }

  public async submitCheckerDecision(payload: {
    applicationId: string;
    decision: 'APPROVE' | 'REJECT' | 'SEND_BACK';
    comment: string;
    version: number;
  }) {
    return this.request<{ message: string; application: Application }>('/checker/decision', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Admin APIs
  public async getDashboardKPIs() {
    return this.request<DashboardKPIs>('/admin/kpis');
  }

  public async getAuditLogs(params: { limit?: number; skip?: number; action?: string; applicationId?: string } = {}) {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.skip) query.append('skip', params.skip.toString());
    if (params.action) query.append('action', params.action);
    if (params.applicationId) query.append('applicationId', params.applicationId);

    return this.request<{ logs: AuditLogItem[]; total: number }>(`/admin/audit?${query.toString()}`);
  }

  public async getConfig() {
    return this.request<{ config: any }>('/admin/config');
  }

  // Notifications
  public async getNotifications() {
    return this.request<{ notifications: NotificationItem[] }>('/notifications');
  }

  public async markNotificationRead(id: string) {
    return this.request(`/notifications/${id}/read`, { method: 'PATCH' });
  }
}

export const api = new ApiService();
