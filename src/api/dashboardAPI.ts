import axiosClient from './axiosClient';

export const dashboardAPI = {
    getStatistics: () => axiosClient.get('/election/api/v1/dashboard/statistics'),
    getHealth: () => axiosClient.get('/election/api/v1/dashboard/health'),
    getAuditStats: () => axiosClient.get('/api/audit/stats'),
};
