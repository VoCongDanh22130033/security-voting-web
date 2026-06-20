import axiosClient from "./axiosClient";

export type AuditFilter = {
  userEmail?: string;
  action?: string;
  serviceName?: string;
  keyword?: string;
  from?: string;
  to?: string;
};

export const auditApi = {
  getLogs: (filters: AuditFilter = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
      }
    });
    const query = params.toString();
    return axiosClient.get(`/api/audit/logs${query ? `?${query}` : ""}`);
  },
};

export default auditApi;
