import React, { useEffect, useState } from 'react';
import { dashboardAPI } from '../../api/dashboardAPI';

const Dashboard = () => {
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        dashboardAPI.getStatistics().then(response => {
            setStats(response.data);
        });
    }, []);

    return (
        <div className="monitor-section">
            <h3>Giám sát hệ thống</h3>
            <div className="stats-grid">
                <div className="stat-card blue">
                    <span className="stat-label">Tổng số cử tri</span>
                    <span className="stat-value">{stats ? stats.totalVoters : '...'}</span>
                </div>
                <div className="stat-card blue">
                    <span className="stat-label">Tổng số cuộc bầu cử</span>
                    <span className="stat-value">{stats ? stats.totalElections : '...'}</span>
                </div>
                <div className="stat-card green">
                    <span className="stat-label">Cuộc bầu cử đang diễn ra</span>
                    <span className="stat-value text-green">{stats ? stats.openElections : '...'}</span>
                </div>
                <div className="stat-card orange">
                    <span className="stat-label">Cuộc bầu cử đã đóng/kết thúc</span>
                    <span className="stat-value text-orange">{stats ? stats.closedElections : '...'}</span>
                </div>
                <div className="stat-card green">
                    <span className="stat-label">Tổng số lá phiếu đã nộp</span>
                    <span className="stat-value text-green">{stats ? stats.totalSubmittedBallots : '...'}</span>
                </div>
                <div className="stat-card blue">
                    <span className="stat-label">Tổng số ứng cử viên</span>
                    <span className="stat-value">{stats ? stats.totalCandidates : '...'}</span>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;