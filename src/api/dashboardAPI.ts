import axiosClient from './axiosClient';

export const dashboardAPI = {
    getStatistics: () => {
        return axiosClient.get('/election/api/v1/dashboard/statistics');
    }
};
