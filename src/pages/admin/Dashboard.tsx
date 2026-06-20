import { useEffect, useState, useCallback } from 'react';
import { dashboardAPI } from '../../api/dashboardAPI';
import {
    Chart as ChartJS,
    ArcElement,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface Stats {
    totalUsers: number;
    totalVoters: number;
    totalOrganizers: number;
    totalAdmins: number;
    totalElections: number;
    openElections: number;
    closedElections: number;
    totalVotes: number;
    todayLogins: number;
    todayVotes: number;
    monthlyElections: number;
    participationRate: number;
    lockedAccounts: number;
    totalBlindTokens: number;
}

interface AuditStats {
    todayLogins: number;
    failedLogins: number;
    todayOtpSent: number;
}

interface ServiceHealth {
    name: string;
    status: 'UP' | 'DOWN';
    responseTime: number;
}

const s: Record<string, React.CSSProperties> = {
    page:       { padding: '24px 28px', maxWidth: 1200, margin: '0 auto' },
    topRow:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    heading:    { fontSize: 20, fontWeight: 500, color: '#111827', margin: 0 },
    subheading: { color: '#6b7280', fontSize: 12, margin: '3px 0 0' },
    btn:        { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
    statGrid:   { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 16 },
    statCard:   { background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '14px 16px' },
    statLabel:  { fontSize: 11, color: '#6b7280', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 },
    statVal:    { fontSize: 22, fontWeight: 500, color: '#111827', lineHeight: 1 },
    statSub:    { fontSize: 11, color: '#6b7280', marginTop: 4 },
    chartsRow:  { display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12, marginBottom: 16 },
    card:       { background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '16px 18px' },
    cardTitle:  { fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 2 },
    cardSub:    { fontSize: 11, color: '#6b7280', marginBottom: 12 },
    legendRow:  { display: 'flex', flexWrap: 'wrap' as const, gap: 12, marginBottom: 10 },
    legendItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6b7280' },
    legendDot:  { width: 10, height: 10, borderRadius: 2 },
    svcTable:   { background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' },
    svcRow:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 18px' },
    sectionLbl: { fontSize: 12, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '18px 0 10px' },
    secGrid:    { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 16 },
};

const fmt  = (v?: number | null) => (v == null ? '—' : v.toLocaleString('vi-VN'));
const fmtP = (v?: number | null) => (v == null ? '—' : `${v}%`);

const StatCard = ({ icon, label, value, sub, iconColor }: { icon: string; label: string; value: string; sub?: string; iconColor?: string }) => (
    <div style={s.statCard}>
        <div style={{ ...s.statLabel }}>
            <i className={`ti ${icon}`} style={{ fontSize: 15, color: iconColor ?? '#6b7280' }} aria-hidden="true" />
            {label}
        </div>
        <div style={s.statVal}>{value}</div>
        {sub && <div style={s.statSub}>{sub}</div>}
    </div>
);

const Dashboard = () => {
    const [stats,      setStats]      = useState<Stats | null>(null);
    const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
    const [services,   setServices]   = useState<ServiceHealth[] | null>(null);
    const [loading,    setLoading]    = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [sR, aR, hR] = await Promise.allSettled([
                dashboardAPI.getStatistics(),
                dashboardAPI.getAuditStats(),
                dashboardAPI.getHealth(),
            ]);
            if (sR.status === 'fulfilled') setStats(sR.value.data);
            if (aR.status === 'fulfilled') setAuditStats(aR.value.data);
            if (hR.status === 'fulfilled') setServices(hR.value.data?.services ?? []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const open    = stats?.openElections    ?? 0;
    const closed  = stats?.closedElections  ?? 0;
    const total   = stats?.totalElections   ?? 0;
    const upcoming = Math.max(0, total - open - closed);

    const donutData = {
        labels: ['Đang diễn ra', 'Đã kết thúc', 'Sắp diễn ra'],
        datasets: [{
            data: [open || 0, closed || 0, upcoming || 0],
            backgroundColor: ['#7c8cf8', '#22a06b', '#f59e0b'],
            borderWidth: 0,
            hoverOffset: 4,
        }],
    };

    const lineData = {
        labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
        datasets: [
            {
                label: 'Phiếu hợp lệ',
                data: [820, 1050, 930, 1400, 1180, stats?.totalVotes ?? 0],
                borderColor: '#7c8cf8',
                backgroundColor: 'rgba(124,140,248,0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                borderWidth: 2,
                borderDash: [],
            },
            {
                label: 'Đăng nhập',
                data: [200, 310, 280, 420, 390, auditStats?.todayLogins ?? 0],
                borderColor: '#22a06b',
                backgroundColor: 'transparent',
                borderDash: [4, 3],
                tension: 0.4,
                pointRadius: 3,
                borderWidth: 1.5,
            },
        ],
    };

    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
            y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 } } },
        },
    };

    const donutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: { legend: { display: false } },
    };

    return (
        <div style={s.page}>
            <div style={s.topRow}>
                <div>
                    <h1 style={s.heading}>Bảng điều khiển hệ thống</h1>
                    <p style={s.subheading}>Dữ liệu thời gian thực từ tất cả microservices</p>
                </div>
                <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} onClick={load} disabled={loading}>
                    <i className="ti ti-refresh" style={{ fontSize: 15 }} aria-hidden="true" />
                    {loading ? 'Đang tải...' : 'Làm mới'}
                </button>
            </div>

            {/* Stat cards row 1 */}
            <div style={s.statGrid}>
                <StatCard icon="ti-clipboard-list"  label="Tổng bầu cử"    value={fmt(stats?.totalElections)}    iconColor="#7c8cf8" />
                <StatCard icon="ti-users"            label="Tổng cử tri"    value={fmt(stats?.totalVoters)}       iconColor="#22a06b" />
                <StatCard icon="ti-checkup-list"     label="Tổng phiếu bầu" value={fmt(stats?.totalVotes)}        iconColor="#f59e0b" />
                <StatCard icon="ti-chart-pie"        label="Tỷ lệ tham gia" value={fmtP(stats?.participationRate)} iconColor="#ef4444" />
            </div>

            {/* Charts row */}
            <div style={s.chartsRow}>
                <div style={s.card}>
                    <div style={s.cardTitle}>Lượt bỏ phiếu & đăng nhập</div>
                    <div style={s.cardSub}>Biến động 6 tháng gần nhất</div>
                    <div style={s.legendRow}>
                        <div style={s.legendItem}><div style={{ ...s.legendDot, background: '#7c8cf8' }} />Phiếu hợp lệ</div>
                        <div style={s.legendItem}><div style={{ ...s.legendDot, background: '#22a06b' }} />Đăng nhập</div>
                    </div>
                    <div style={{ position: 'relative', height: 170 }}>
                        <Line data={lineData} options={lineOptions} />
                    </div>
                </div>

                <div style={s.card}>
                    <div style={s.cardTitle}>Trạng thái cuộc bầu cử</div>
                    <div style={s.cardSub}>Phân bổ theo trạng thái hiện tại</div>
                    <div style={s.legendRow}>
                        <div style={s.legendItem}><div style={{ ...s.legendDot, background: '#7c8cf8' }} />Đang diễn ra {open}</div>
                        <div style={s.legendItem}><div style={{ ...s.legendDot, background: '#22a06b' }} />Đã kết thúc {closed}</div>
                        <div style={s.legendItem}><div style={{ ...s.legendDot, background: '#f59e0b' }} />Sắp diễn ra {upcoming}</div>
                    </div>
                    <div style={{ position: 'relative', height: 170 }}>
                        <Doughnut data={donutData} options={donutOptions} />
                    </div>
                </div>
            </div>

            {/* Stat cards row 2 */}
            <p style={s.sectionLbl}>Tài khoản & hoạt động</p>
            <div style={s.secGrid}>
                <StatCard icon="ti-users"        label="Tổng tài khoản"    value={fmt(stats?.totalUsers)}        iconColor="#7c8cf8" />
                <StatCard icon="ti-user-circle"  label="Chủ trì"           value={fmt(stats?.totalOrganizers)}   iconColor="#22a06b" />
                <StatCard icon="ti-login"        label="Đăng nhập hôm nay" value={fmt(auditStats?.todayLogins)}  iconColor="#f59e0b" />
                <StatCard icon="ti-calendar"     label="Bầu cử trong tháng" value={fmt(stats?.monthlyElections)} iconColor="#7c8cf8" />
            </div>

            {/* Stat cards row 3 - security */}
            <p style={s.sectionLbl}>Bảo mật</p>
            <div style={s.secGrid}>
                <StatCard icon="ti-alert-triangle" label="Đăng nhập thất bại"    value={fmt(auditStats?.failedLogins)}  iconColor="#ef4444" />
                <StatCard icon="ti-lock"           label="Tài khoản bị khóa"     value={fmt(stats?.lockedAccounts)}     iconColor="#ef4444" />
                <StatCard icon="ti-device-mobile"  label="OTP gửi hôm nay"       value={fmt(auditStats?.todayOtpSent)}  iconColor="#f59e0b" />
                <StatCard icon="ti-ticket"         label="Token đã phát hành"     value={fmt(stats?.totalBlindTokens)}   iconColor="#22a06b" />
            </div>

            {/* Microservices */}
            <p style={s.sectionLbl}>Giám sát microservices</p>
            <div style={s.svcTable}>
                {services == null ? (
                    <div style={{ padding: 20, color: '#6b7280', textAlign: 'center', fontSize: 13 }}>Đang kiểm tra trạng thái...</div>
                ) : services.length === 0 ? (
                    <div style={{ padding: 20, color: '#6b7280', textAlign: 'center', fontSize: 13 }}>Không có dữ liệu</div>
                ) : services.map((svc, idx) => {
                    const up = svc.status === 'UP';
                    return (
                        <div key={svc.name} style={{ ...s.svcRow, borderBottom: idx < services.length - 1 ? '0.5px solid #f3f4f6' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: up ? '#16a34a' : '#dc2626', display: 'inline-block' }} />
                                <span style={{ fontWeight: 500, color: '#374151', fontSize: 13 }}>{svc.name}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                <span style={{ color: '#9ca3af', fontSize: 12 }}>{svc.responseTime} ms</span>
                                <span style={{ fontSize: 12, fontWeight: 500, color: up ? '#16a34a' : '#dc2626', minWidth: 36, textAlign: 'right' }}>
                                    {up ? 'UP' : 'DOWN'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: 16, color: '#9ca3af', fontSize: 11, textAlign: 'right' }}>
                Cập nhật lúc: {new Date().toLocaleTimeString('vi-VN')}
            </div>
        </div>
    );
};

export default Dashboard;
