import React, { useState, useEffect } from "react";
import "./admin.css";
import userApi from "../../api/userApi.ts";
import Swal from "sweetalert2";
import Dashboard from "./Dashboard.tsx";
import auditApi from "../../api/auditApi.ts";
import { electionApi } from "../../api/electionApi.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import { useNavigate } from "react-router-dom";

interface AccountUser {
    id: number;
    fullName: string;
    email: string;
    phone: string;
    isLock: number;
}

interface AuditLog {
    id: number;
    timestamp: string;
    serviceName: string;
    userEmail: string;
    action: string;
    details: string;
}

interface ElectionStat {
    id: number;
    title: string;
    status: string;
    startDate?: string;
    endDate?: string;
    totalInvited: number;
    totalVerified: number;
    totalVoted: number;
    totalCandidates: number;
    totalRounds?: number;
    roleId?: number | null;
}

const Admin: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeMenu, setActiveMenu] = useState<"host" | "voter" | "monitor" | "audit" | "elections">("host");
    const [hosts, setHosts] = useState<AccountUser[]>([]);   // State quản lý danh sách Host riêng (Role 3)
    const [voters, setVoters] = useState<AccountUser[]>([]); // State quản lý danh sách Cử tri riêng (Role 2)
    const [loading, setLoading] = useState<boolean>(false);
    const [searchVoter, setSearchVoter] = useState<string>("");
    const [searchHost, setSearchHost] = useState<string>("");

    // State dành cho Modal tạo tài khoản Host (Moderator)
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [hostName, setHostName] = useState("");
    const [hostEmail, setHostEmail] = useState("");
    const [hostPassword, setHostPassword] = useState("");
    const [hostPhone, setHostPhone] = useState("");
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [auditFilter, setAuditFilter] = useState({ userEmail: "", action: "", serviceName: "", keyword: "", fromDate: "", toDate: "" });
    const [auditPage, setAuditPage] = useState(1);
    const AUDIT_PAGE_SIZE = 9;
    const [electionStats, setElectionStats] = useState<ElectionStat[]>([]);
    const [electionSearch, setElectionSearch] = useState("");
    const [selectedElection, setSelectedElection] = useState<ElectionStat | null>(null);
    const [adminStats, setAdminStats] = useState<any>(null);
    const [adminStatsLoading, setAdminStatsLoading] = useState(false);
    const [detailTab, setDetailTab] = useState<"stats" | "candidates" | "results">("stats");
    const [candidatesData, setCandidatesData] = useState<any[]>([]);
    const [resultsData, setResultsData] = useState<any[]>([]); // per-round with candidates+voteCount
    const [detailExtraLoading, setDetailExtraLoading] = useState(false);
    const [voterPage, setVoterPage] = useState(1);
    const VOTER_PAGE_SIZE = 9;

    useEffect(() => {
        if (activeMenu === "host") {
            fetchHostsList();
        } else if (activeMenu === "voter") {
            fetchVotersList();
        } else if (activeMenu === "audit") {
            fetchAuditLogs();
        } else if (activeMenu === "elections") {
            fetchElectionStats();
        }
    }, [activeMenu]);
// Gọi endpoint chỉ lấy tài khoản chủ trì (Role 3)
    const fetchHostsList = async () => {
        setLoading(true);
        try {
            const data = await userApi.getAdminHosts();
            setHosts(data);
        } catch (error: any) {
            console.error("Lỗi lấy danh sách chủ trì:", error);
        } finally {
            setLoading(false);
        }
    };
// Gọi endpoint chỉ lấy tài khoản cử tri (Role 2)
    const fetchVotersList = async () => {
        setLoading(true);
        try {
            const data = await userApi.getAdminVoters();
            setVoters(data);
        } catch (error: any) {
            console.error("Lỗi lấy danh sách cử tri:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAuditLogs = async () => {
        setLoading(true);
        try {
            const response = await auditApi.getLogs(auditFilter);
            setAuditLogs(response.data);
        } catch (error: any) {
            Swal.fire("Lỗi", error.response?.data || "Không thể tải nhật ký hệ thống.", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchElectionStats = async () => {
        setLoading(true);
        try {
            const res = await electionApi.getAll();
            const elections = res.data as any[];
            const stats = await Promise.all(elections.map(async (e: any) => {
                try {
                    const [db, inv] = await Promise.all([
                        electionApi.getParticipantDashboard(e.id).catch(() => ({ data: null })),
                        electionApi.getParticipantInvites(e.id).catch(() => ({ data: [] })),
                    ]);
                    const invites = inv.data || [];
                    const totalInvited  = db.data?.invitedCount  ?? invites.length;
                    const totalVerified = db.data?.verifiedCount ?? invites.filter((i: any) => i.verifiedAt || i.status === "VERIFIED" || i.status === "USED").length;
                    const totalVoted    = db.data?.votedCount    ?? invites.filter((i: any) => i.voted).length;
                    return { id: e.id, title: e.title, status: e.status, startDate: e.startDate, endDate: e.endDate,
                        totalInvited, totalVerified, totalVoted, totalCandidates: e.candidates?.length ?? 0, totalRounds: e.totalRounds, roleId: e.roleId ?? null };
                } catch { return { id: e.id, title: e.title, status: e.status, totalInvited: 0, totalVerified: 0, totalVoted: 0, totalCandidates: 0 }; }
            }));
            setElectionStats(stats);
        } catch (err: any) {
            Swal.fire("Lỗi", "Không thể tải danh sách cuộc bầu cử.", "error");
        } finally { setLoading(false); }
    };

    const downloadExcel = async (electionId: number, title: string) => {
        try {
            Swal.fire({ title: "Đang xuất file...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const response = await electionApi.exportReportExcel(electionId);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.download = `${title.replace(/\s+/g, "_")}_${electionId}.xlsx`;
            link.click();
            window.URL.revokeObjectURL(url);
            Swal.close();
        } catch {
            Swal.fire({ icon: "error", title: "Lỗi", text: "Không thể xuất file Excel.", toast: true, position: "top-end", timer: 3000, showConfirmButton: false });
        }
    };

    const handleCreateHost = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            Swal.fire({ title: "Đang xử lý...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            await userApi.createModerator({
                fullName: hostName,
                email: hostEmail,
                password: hostPassword,
                phone: hostPhone
            });

            Swal.fire({ title: "Thành công!", text: "Đã cấp quyền Host thành công!", icon: "success", timer: 2000, showConfirmButton: false });

            setIsModalOpen(false);
            setHostName("");
            setHostEmail("");
            setHostPassword("");
            setHostPhone("");
            fetchHostsList();
        } catch (error: any) {
            const msg = error.response?.data?.error || error.response?.data || "Không thể cấp quyền tài khoản.";
            Swal.fire({ title: "Lỗi!", text: msg, icon: "error", confirmButtonColor: "#ff7a00" });
        }
    };

    const handleViewDetail = async (id: number) => {
        try {
            Swal.fire({ title: "Đang tải...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const accountData = await userApi.getById(id);

            // Hỗ trợ kiểm tra linh hoạt cả cấu trúc phẳng lẫn object lồng Voter/User cũ
            const checkLock = accountData.isLock === 1 || accountData.user?.isLock === 1;
            const name = accountData.fullName || accountData.user?.fullName || "Chưa cập nhật";
            const email = accountData.email || accountData.user?.email;
            const phone = accountData.phone || accountData.user?.phone || "N/A";

            Swal.fire({
                title: "<strong>Chi Tiết Tài Khoản</strong>",
                icon: "info",
                html: `
                  <div style="text-align: left; font-size: 14px; line-height: 2;">
                    <p><strong>Mã ID người dùng:</strong> ${accountData.id}</p>
                    <p><strong>Họ và Tên:</strong> ${name}</p>
                    <p><strong>Địa chỉ Email:</strong> ${email}</p>
                    <p><strong>Số điện thoại:</strong> ${phone}</p>
                    <p><strong>Trạng thái hoạt động:</strong> ${checkLock ? '<span style="color: red; font-weight: bold;">Đã bị khóa</span>' : '<span style="color: green; font-weight: bold;">Đang hoạt động</span>'}</p>
                  </div>
                `,
                confirmButtonColor: "#ff7a00",
                confirmButtonText: "Đóng"
            });
        } catch (error: any) {
            Swal.fire({ title: "Lỗi!", text: "Không thể tải chi tiết thông tin.", icon: "error" });
        }
    };

    const handleToggleLockAccount = async (id: number, currentLockState: boolean, name: string) => {
        const actionText = currentLockState ? "MỞ KHÓA" : "KHÓA";

        Swal.fire({
            title: `Xác nhận ${actionText}`,
            text: `Bạn có chắc muốn thực hiện hành động ${actionText.toLowerCase()} tài khoản [ ${name} ]?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: currentLockState ? "#28a745" : "#dc3545",
            cancelButtonColor: "#6c757d",
            confirmButtonText: "Xác nhận",
            cancelButtonText: "Hủy"
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    if (currentLockState) {
                        await userApi.unlockVoter(id);
                    } else {
                        await userApi.lockVoter(id);
                    }

                    Swal.fire({ title: "Thành công!", text: `Đã ${actionText.toLowerCase()} tài khoản người dùng!`, icon: "success", timer: 1500, showConfirmButton: false });

                    // Làm mới đúng Tab hiện tại để cập nhật UI phản hồi tức thì
                    if (activeMenu === "host") fetchHostsList();
                    if (activeMenu === "voter") fetchVotersList();
                } catch (error: any) {
                    Swal.fire({ title: "Thất bại!", text: error.response?.data?.message || "Thao tác không thành công.", icon: "error" });
                }
            }
        });
    };


    const handleDeleteHost = async (id: number, name: string) => {
        Swal.fire({
            title: "Xác nhận xóa tài khoản",
            html: `Bạn có chắc muốn <strong>xóa vĩnh viễn</strong> tài khoản chủ trì <strong>${name}</strong>?<br/><span style="color:#ef4444;font-size:13px;">Hành động này không thể hoàn tác.</span>`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#6c757d",
            confirmButtonText: "Xóa",
            cancelButtonText: "Hủy"
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await userApi.deleteUser(id);
                    Swal.fire({ title: "Đã xóa!", text: `Tài khoản ${name} đã được xóa.`, icon: "success", timer: 1500, showConfirmButton: false });
                    fetchHostsList();
                } catch (error: any) {
                    Swal.fire({ title: "Thất bại!", text: error.response?.data?.message || error.response?.data || "Không thể xóa tài khoản.", icon: "error" });
                }
            }
        });
    };

    const filteredHosts = hosts.filter(h =>
        h.fullName?.toLowerCase().includes(searchHost.toLowerCase()) ||
        h.email?.toLowerCase().includes(searchHost.toLowerCase())
    );

    const filteredVoters = voters.filter(v =>
        v.fullName?.toLowerCase().includes(searchVoter.toLowerCase()) ||
        v.email?.toLowerCase().includes(searchVoter.toLowerCase())
    );
    const voterTotalPages = Math.max(1, Math.ceil(filteredVoters.length / VOTER_PAGE_SIZE));
    const pagedVoters = filteredVoters.slice((voterPage - 1) * VOTER_PAGE_SIZE, voterPage * VOTER_PAGE_SIZE);

    return (
        <div className="admin-container">
            <div className="admin-wrapper">
                {/* Sidebar trái */}
                <aside className="admin-sidebar">
                    <div className="admin-info">
                        <div className="admin-avatar">A</div>
                        <div>
                            <span style={{ display: "block" }}>{user?.fullName || "Admin"}</span>
                            <span style={{ fontSize: 11, color: "#94a3b8" }}>{user?.email || ""}</span>
                        </div>
                    </div>
                    <nav>
                        <ul>
                            <li className={activeMenu === "monitor" ? "active" : ""} onClick={() => setActiveMenu("monitor")}>
                                <i className="ti ti-layout-dashboard" />Tổng quan
                            </li>
                            <li className={activeMenu === "host" ? "active" : ""} onClick={() => setActiveMenu("host")}>
                                <i className="ti ti-shield-check" />Tài khoản chủ trì
                            </li>
                            <li className={activeMenu === "voter" ? "active" : ""} onClick={() => setActiveMenu("voter")}>
                                <i className="ti ti-users" />Tài khoản cử tri
                            </li>
                            <li className={activeMenu === "audit" ? "active" : ""} onClick={() => setActiveMenu("audit")}>
                                <i className="ti ti-file-text" />Nhật ký hệ thống
                            </li>
                            <li className={activeMenu === "elections" ? "active" : ""} onClick={() => setActiveMenu("elections")}>
                                <i className="ti ti-chart-bar" />Thống kê bầu cử
                            </li>
                        </ul>
                    </nav>
                    <div style={{ marginTop: "auto", padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                        <button
                            onClick={() => { logout(); navigate("/"); }}
                            style={{ width: "100%", background: "rgba(239,68,68,0.12)", color: "#f87171", border: "none", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                        >
                            <i className="ti ti-logout" style={{ fontSize: 16 }} />
                            Đăng xuất
                        </button>
                    </div>
                </aside>

                {/* Nội dung chính bên phải */}
                <main className="admin-content">
                    {activeMenu === "host" && (
                        <div className="table-section">
                            <div className="content-header">
                                <h3>Quản lý Tài khoản Chủ trì</h3>
                                <div style={{ display: "flex", gap: "10px" }}>
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm chủ trì..."
                                        value={searchHost}
                                        onChange={(e) => setSearchHost(e.target.value)}
                                        style={{ padding: "6px 12px", borderRadius: "4px", border: "1px solid #ccc" }}
                                    />
                                    <button className="btn-create" onClick={() => setIsModalOpen(true)}>+ Cấp quyền </button>
                                </div>
                            </div>
                            {loading ? (
                                <div style={{ textAlign: "center", padding: "20px" }}>Đang tải dữ liệu...</div>
                            ) : (
                                <table className="main-table">
                                    <thead>
                                    <tr>
                                        <th>STT</th>
                                        <th>Tên tổ chức/Cá nhân</th>
                                        <th>Email</th>
                                        <th>Số điện thoại</th>
                                        <th style={{ textAlign: "center" }}>Hành động</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {filteredHosts.map((host, index) => {
                                        const isLocked = host.isLock === 1;
                                        return (
                                            <tr key={host.id}>
                                                <td>{index + 1}</td>
                                                <td>{host.fullName || "N/A"}</td>
                                                <td>{host.email}</td>
                                                <td>{host.phone || "N/A"}</td>
                                                <td style={{ textAlign: "center", display: "flex", gap: "8px", justifyContent: "center" }}>
                                                    <button className="btn-view" style={{ backgroundColor: "#0ea5e9", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer" }} onClick={() => handleViewDetail(host.id)}>
                                                        Chi tiết
                                                    </button>
                                                    <button
                                                        className="btn-lock"
                                                        style={{
                                                            backgroundColor: isLocked ? "#22c55e" : "#ef4444",
                                                            color: "white", border: "none", padding: "4px 12px", borderRadius: "4px", cursor: "pointer"
                                                        }}
                                                        onClick={() => handleToggleLockAccount(host.id, isLocked, host.fullName || "N/A")}
                                                    >
                                                        {isLocked ? "Mở khóa" : "Khóa"}
                                                    </button>
                                                    <button
                                                        style={{ backgroundColor: "#6b7280", color: "white", border: "none", padding: "4px 10px", borderRadius: "4px", cursor: "pointer" }}
                                                        onClick={() => handleDeleteHost(host.id, host.fullName || "N/A")}
                                                    >
                                                        Xóa
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredHosts.length === 0 && (
                                        <tr><td colSpan={5} style={{ textAlign: "center" }}>Không có tài khoản chủ trì nào.</td></tr>
                                    )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {activeMenu === "voter" && (
                        <div className="table-section">
                            <div className="content-header">
                                <h3>Quản lý Tài khoản Cử tri</h3>
                                <div className="header-controls">
                                    {/* Đã bọc class wrapper để hiển thị icon kính lúp và border mượt */}
                                    <div className="search-input-wrapper">
                                        <input
                                            type="text"
                                            placeholder="Tìm kiếm Email/Họ tên..."
                                            value={searchVoter}
                                            onChange={(e) => { setSearchVoter(e.target.value); setVoterPage(1); }}
                                        />
                                    </div>
                                </div>
                            </div>
                            {loading ? (
                                <div style={{ textAlign: "center", padding: "20px" }}>Đang tải dữ liệu cử tri...</div>
                            ) : (
                                <>
                                <table className="main-table">
                                    <thead>
                                    <tr>
                                        <th>STT</th>
                                        <th>Họ Tên</th>
                                        <th>Email</th>
                                        <th>Trạng thái</th>
                                        <th style={{ textAlign: "center" }}>Hành động</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {pagedVoters.map((voter, index) => {
                                        const isLocked = voter.isLock === 1;
                                        return (
                                            <tr key={voter.id}>
                                                <td>{(voterPage - 1) * VOTER_PAGE_SIZE + index + 1}</td>
                                                <td>{voter.fullName || "N/A"}</td>
                                                <td>{voter.email}</td>
                                                <td>
                                                    {isLocked ? (
                                                        <span className="status-badge offline" style={{ backgroundColor: "#f8d7da", color: "#842029" }}>Bị khóa</span>
                                                    ) : (
                                                        <span className="status-badge online">Hoạt động</span>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: "center", display: "flex", gap: "8px", justifyContent: "center" }}>
                                                    <button className="btn-view" style={{ backgroundColor: "#0ea5e9", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer" }} onClick={() => handleViewDetail(voter.id)}>
                                                        Chi tiết
                                                    </button>
                                                    <button
                                                        className="btn-lock"
                                                        style={{
                                                            backgroundColor: isLocked ? "#22c55e" : "#ef4444",
                                                            color: "white", border: "none", padding: "4px 12px", borderRadius: "4px", cursor: "pointer"
                                                        }}
                                                        onClick={() => handleToggleLockAccount(voter.id, isLocked, voter.fullName || "N/A")}
                                                    >
                                                        {isLocked ? "Mở khóa" : "Khóa"}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredVoters.length === 0 && (
                                        <tr><td colSpan={5} style={{ textAlign: "center" }}>Không tìm thấy dữ liệu cử tri phù hợp.</td></tr>
                                    )}
                                    </tbody>
                                </table>
                                {voterTotalPages > 1 && (
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, padding: "0 4px" }}>
                                        <span style={{ fontSize: 13, color: "#64748b" }}>
                                            Hiển thị {(voterPage - 1) * VOTER_PAGE_SIZE + 1}–{Math.min(voterPage * VOTER_PAGE_SIZE, filteredVoters.length)} / {filteredVoters.length} cử tri
                                        </span>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button onClick={() => setVoterPage(p => Math.max(1, p - 1))} disabled={voterPage === 1}
                                                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: voterPage === 1 ? "#f8fafc" : "#fff", color: voterPage === 1 ? "#cbd5e1" : "#334155", cursor: voterPage === 1 ? "default" : "pointer", fontWeight: 600, fontSize: 13 }}>
                                                ‹ Trước
                                            </button>
                                            {Array.from({ length: voterTotalPages }, (_, i) => i + 1)
                                                .filter(p => p === 1 || p === voterTotalPages || Math.abs(p - voterPage) <= 2)
                                                .reduce<(number | "...")[]>((acc, p, i, arr) => {
                                                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                                                    acc.push(p);
                                                    return acc;
                                                }, [])
                                                .map((p, i) => p === "..." ? (
                                                    <span key={`e${i}`} style={{ padding: "6px 4px", color: "#94a3b8", fontSize: 13 }}>…</span>
                                                ) : (
                                                    <button key={p} onClick={() => setVoterPage(p as number)}
                                                        style={{ padding: "6px 11px", borderRadius: 8, border: "1px solid", borderColor: voterPage === p ? "#6366f1" : "#e2e8f0", background: voterPage === p ? "#6366f1" : "#fff", color: voterPage === p ? "#fff" : "#334155", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                                                        {p}
                                                    </button>
                                                ))
                                            }
                                            <button onClick={() => setVoterPage(p => Math.min(voterTotalPages, p + 1))} disabled={voterPage === voterTotalPages}
                                                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: voterPage === voterTotalPages ? "#f8fafc" : "#fff", color: voterPage === voterTotalPages ? "#cbd5e1" : "#334155", cursor: voterPage === voterTotalPages ? "default" : "pointer", fontWeight: 600, fontSize: 13 }}>
                                                Sau ›
                                            </button>
                                        </div>
                                    </div>
                                )}
                                </>
                            )}
                        </div>
                    )}

                    {activeMenu === "elections" && (() => {
                        const filtered = electionStats.filter(e => e.title.toLowerCase().includes(electionSearch.toLowerCase()));
                        const statusColor: Record<string, string> = { OPEN: "#10b981", UPCOMING: "#f59e0b", CLOSED: "#64748b", ENDED: "#64748b" };
                        const statusLabel: Record<string, string> = { OPEN: "Đang diễn ra", UPCOMING: "Sắp diễn ra", CLOSED: "Đã kết thúc", ENDED: "Đã kết thúc" };
                        const fmt = (v?: string) => v ? new Date(v).toLocaleDateString("vi-VN") : "—";
                        const pct = (a: number, b: number) => b > 0 ? `${Math.round(a / b * 100)}%` : "0%";
                        return (
                        <div className="table-section">
                            {/* Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>🗳️ Thống kê cuộc bầu cử</h3>
                                    <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>{electionStats.length} cuộc bầu cử</p>
                                </div>
                                <button className="btn-create" onClick={fetchElectionStats}>🔄 Làm mới</button>
                            </div>

                            {/* Tóm tắt tổng */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
                                {[
                                    { label: "Tổng cuộc bầu cử", value: electionStats.length,                                         icon: "🗳️", color: "#6366f1" },
                                    { label: "Đang diễn ra",      value: electionStats.filter(e => e.status?.toUpperCase() === "OPEN").length, icon: "🟢", color: "#10b981" },
                                    { label: "Tổng cử tri mời",   value: electionStats.reduce((s, e) => s + e.totalInvited, 0),       icon: "✉️", color: "#f59e0b" },
                                    { label: "Tổng phiếu bầu",    value: electionStats.reduce((s, e) => s + e.totalVoted, 0),         icon: "✅", color: "#ec4899" },
                                ].map(card => (
                                    <div key={card.label} style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 14 }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 11, background: card.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{card.icon}</div>
                                        <div>
                                            <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{card.value}</div>
                                            <div style={{ fontSize: 12, color: "#64748b" }}>{card.label}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Search */}
                            <div style={{ marginBottom: 16 }}>
                                <input placeholder="🔍 Tìm kiếm cuộc bầu cử..." value={electionSearch}
                                    onChange={e => setElectionSearch(e.target.value)}
                                    style={{ width: "100%", maxWidth: 360, padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, background: "#f8fafc", boxSizing: "border-box" }} />
                            </div>

                            {/* Table */}
                            {loading ? (
                                <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>⏳ Đang tải...</div>
                            ) : selectedElection ? (
                                /* Chi tiết 1 cuộc bầu cử */
                                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                                    {/* Header */}
                                    <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12 }}>
                                        <button onClick={() => { setSelectedElection(null); setAdminStats(null); }}
                                            style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#475569", flexShrink: 0 }}>
                                            ← Quay lại
                                        </button>
                                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a", flex: 1 }}>{selectedElection.title}</h3>
                                        <span style={{ background: (statusColor[selectedElection.status?.toUpperCase()] || "#64748b") + "18", color: statusColor[selectedElection.status?.toUpperCase()] || "#64748b", padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                                            {statusLabel[selectedElection.status?.toUpperCase()] || selectedElection.status}
                                        </span>
                                        <button
                                            onClick={() => downloadExcel(selectedElection.id, selectedElection.title)}
                                            style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
                                        >
                                            <i className="ti ti-file-spreadsheet" style={{ fontSize: 15 }} />
                                            Xuất Excel
                                        </button>
                                        {(() => {
                                            const isUpcoming = (selectedElection.status || "").toUpperCase() === "UPCOMING";
                                            const isOwner = !selectedElection.roleId || selectedElection.roleId === user?.id;
                                            const isAdmin = user?.roles?.includes("ROLE_ADMIN");
                                            if (!isUpcoming || (!isAdmin && !isOwner)) return null;
                                            return (
                                                <button
                                                    onClick={() => navigate(`/edit-election/${selectedElection.id}`)}
                                                    style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
                                                >
                                                    <i className="ti ti-edit" style={{ fontSize: 15 }} />
                                                    Sửa
                                                </button>
                                            );
                                        })()}
                                    </div>

                                    {/* Tab bar */}
                                    <div style={{ background: "#fff", borderRadius: 12, padding: "6px 8px", border: "1px solid #e2e8f0", display: "flex", gap: 4 }}>
                                        {([
                                            { key: "stats",      label: "📊 Thống kê" },
                                            { key: "candidates", label: "👤 Ứng viên" },
                                            { key: "results",    label: "🏆 Kết quả" },
                                        ] as const).map(t => (
                                            <button key={t.key} onClick={() => setDetailTab(t.key)}
                                                style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                                                    background: detailTab === t.key ? "#1e40af" : "transparent",
                                                    color: detailTab === t.key ? "#fff" : "#64748b",
                                                    transition: "all 0.15s" }}>
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tab: Thống kê */}
                                    {detailTab === "stats" && (adminStatsLoading ? (
                                        <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>⏳ Đang tải thống kê...</div>
                                    ) : adminStats ? (() => {
                                        const { info, voterStats, ballotStats, rounds } = adminStats;
                                        const fmtDt = (s: string | null) => s ? new Date(s).toLocaleString("vi-VN") : "—";
                                        const sectionTitle = (t: string) => (
                                            <div style={{ fontSize: 13, fontWeight: 800, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14, paddingBottom: 8, borderBottom: "2px solid #e2e8f0" }}>{t}</div>
                                        );
                                        const infoRow = (label: string, value: any) => (
                                            <div key={label} style={{ display: "flex", gap: 12, padding: "7px 0", borderBottom: "1px solid #f1f5f9" }}>
                                                <span style={{ fontSize: 13, color: "#64748b", minWidth: 160 }}>{label}</span>
                                                <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{value ?? "—"}</span>
                                            </div>
                                        );
                                        const statCard = (icon: string, label: string, value: any, color: string) => (
                                            <div key={label} style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 20px", border: "1px solid #e2e8f0" }}>
                                                <div style={{ fontSize: 22 }}>{icon}</div>
                                                <div style={{ fontSize: 26, fontWeight: 800, color, marginTop: 6 }}>{value ?? 0}</div>
                                                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{label}</div>
                                            </div>
                                        );
                                        const progressRow = (label: string, value: number, max: number, color: string) => {
                                            const p = max > 0 ? Math.round(value / max * 100) : 0;
                                            return (
                                                <div key={label}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                                        <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{label}</span>
                                                        <span style={{ fontSize: 13, fontWeight: 700, color }}>{p}%</span>
                                                    </div>
                                                    <div style={{ height: 8, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                                                        <div style={{ width: `${p}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.6s" }} />
                                                    </div>
                                                </div>
                                            );
                                        };
                                        const totalRounds = info.totalRounds || 1;
                                        // Normalize: totalInvited/totalVerified có thể bị nhân theo số vòng nếu backend chưa dùng DISTINCT
                                        // Dùng totalVoted (luôn distinct) làm chuẩn để detect
                                        const rawInvited = voterStats.totalInvited;
                                        const rawVerified = voterStats.totalVerified;
                                        const totalVoted = voterStats.totalVoted;
                                        // Nếu rawInvited = totalVoted × totalRounds thì backend đang đếm trùng → chia lại
                                        const likelyInflated = totalRounds > 1 && rawInvited > 0 && rawInvited === rawVerified && rawInvited > totalVoted;
                                        const uniqueInvited  = likelyInflated ? Math.round(rawInvited  / totalRounds) : rawInvited;
                                        const uniqueVerified = likelyInflated ? Math.round(rawVerified / totalRounds) : rawVerified;
                                        const notVoted = Math.max(0, uniqueInvited - totalVoted);
                                        const verifiedRate = uniqueInvited > 0 ? Math.round(uniqueVerified / uniqueInvited * 100) : 0;
                                        const voteRate = uniqueInvited > 0 ? Math.round(totalVoted / uniqueInvited * 100) : 0;
                                        return (<>
                                            <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0" }}>
                                                {sectionTitle("Thông tin chung")}
                                                {infoRow("Tên cuộc bầu cử", info.title)}
                                                {infoRow("Mô tả", info.description)}
                                                {infoRow("Ban tổ chức", info.organizer)}
                                                {infoRow("Trạng thái", statusLabel[info.status?.toUpperCase()] || info.status)}
                                                {infoRow("Ngày tạo", fmtDt(info.createdAt))}
                                                {infoRow("Thời gian bắt đầu", fmtDt(info.startTime))}
                                                {infoRow("Thời gian kết thúc", fmtDt(info.endTime))}
                                                {infoRow("Số vòng bầu cử", info.totalRounds)}
                                            </div>
                                            <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0" }}>
                                                {sectionTitle("Thống kê cử tri")}
                                                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
                                                    {statCard("✉️", "Cử tri được mời", uniqueInvited, "#6366f1")}
                                                    {statCard("✅", "Đã xác thực CCCD", uniqueVerified, "#10b981")}
                                                    {statCard("🗳️", "Đã bỏ phiếu", totalVoted, "#f59e0b")}
                                                    {statCard("❌", "Chưa bỏ phiếu", notVoted, "#ef4444")}
                                                </div>
                                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                                    {progressRow("Tỷ lệ xác thực CCCD", uniqueVerified, uniqueInvited, "#10b981")}
                                                    {progressRow(`Tỷ lệ tham gia bỏ phiếu — ${voteRate}%`, totalVoted, uniqueInvited, "#6366f1")}
                                                </div>
                                            </div>
                                            <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0" }}>
                                                {sectionTitle("Thống kê phiếu bầu")}
                                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 12 }}>
                                                    {statCard("📋", "Tổng phiếu (cộng dồn)", ballotStats.totalRecorded, "#0ea5e9")}
                                                    {statCard("✔️", "Phiếu hợp lệ", ballotStats.totalValid, "#10b981")}
                                                    {statCard("✖️", "Phiếu không hợp lệ", ballotStats.totalInvalid, "#ef4444")}
                                                </div>
                                                {info.totalRounds > 1 && (
                                                    <div style={{ marginBottom: 14, padding: "8px 14px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, fontSize: 12, color: "#0369a1" }}>
                                                        ℹ️ Cuộc bầu cử có <strong>{info.totalRounds} vòng</strong> — tổng phiếu là cộng dồn qua tất cả các vòng.
                                                        Mỗi vòng có khoảng <strong>{rounds.length > 0 ? Math.round(ballotStats.totalRecorded / info.totalRounds) : "—"}</strong> phiếu.
                                                    </div>
                                                )}
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                                    {infoRow("Thời gian bỏ phiếu đầu tiên", fmtDt(ballotStats.firstVoteTime))}
                                                    {infoRow("Thời gian bỏ phiếu cuối cùng", fmtDt(ballotStats.lastVoteTime))}
                                                </div>
                                            </div>
                                            <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0" }}>
                                                {sectionTitle("Thống kê theo vòng")}
                                                {rounds.length === 0 ? (
                                                    <div style={{ textAlign: "center", color: "#94a3b8", padding: 20 }}>Chưa có vòng bầu cử.</div>
                                                ) : (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                                        {rounds.map((r: any) => (
                                                            <div key={r.roundId} style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 20px", border: "1px solid #e2e8f0" }}>
                                                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                                                    <span style={{ background: "#1e40af", color: "#fff", borderRadius: 99, fontSize: 11, fontWeight: 800, padding: "3px 10px" }}>Vòng {r.roundNumber}</span>
                                                                    <span style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{r.title}</span>
                                                                    <span style={{ marginLeft: "auto", background: (statusColor[r.status?.toUpperCase()] || "#64748b") + "18", color: statusColor[r.status?.toUpperCase()] || "#64748b", padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                                                                        {statusLabel[r.status?.toUpperCase()] || r.status}
                                                                    </span>
                                                                </div>
                                                                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, fontSize: 12 }}>
                                                                    <div><span style={{ color: "#64748b" }}>Bắt đầu: </span><span style={{ fontWeight: 600 }}>{fmtDt(r.startTime)}</span></div>
                                                                    <div><span style={{ color: "#64748b" }}>Kết thúc: </span><span style={{ fontWeight: 600 }}>{fmtDt(r.endTime)}</span></div>
                                                                    <div><span style={{ color: "#64748b" }}>Số phiếu: </span><span style={{ fontWeight: 700, color: "#f59e0b" }}>{r.totalVotes}</span></div>
                                                                    <div><span style={{ color: "#64748b" }}>Ứng viên: </span><span style={{ fontWeight: 700, color: "#6366f1" }}>{r.totalCandidates}</span></div>
                                                                </div>
                                                                {r.maxAdvanceCount > 0 && (
                                                                    <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>Số người vào vòng tiếp: <strong style={{ color: "#1e40af" }}>{r.maxAdvanceCount}</strong></div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </>);
                                    })() : (
                                        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Không thể tải thống kê chi tiết.</div>
                                    ))}

                                    {/* Tab: Ứng viên */}
                                    {detailTab === "candidates" && (
                                        detailExtraLoading ? (
                                            <div style={{ textAlign: "center", padding: 40, color: "#64748b", background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0" }}>⏳ Đang tải...</div>
                                        ) : resultsData.length === 0 ? (
                                            <div style={{ textAlign: "center", color: "#94a3b8", padding: 32, background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0" }}>Chưa có ứng viên.</div>
                                        ) : (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                                                {resultsData.map((round: any) => {
                                                    const candidates: any[] = round.candidates || [];
                                                    return (
                                                        <div key={round.id} style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0" }}>
                                                            <div style={{ fontSize: 13, fontWeight: 800, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16, paddingBottom: 8, borderBottom: "2px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
                                                                <span style={{ background: "#1e40af", color: "#fff", borderRadius: 99, fontSize: 11, fontWeight: 800, padding: "3px 10px" }}>Vòng {round.roundNumber}</span>
                                                                <span>{round.title || `Vòng ${round.roundNumber}`}</span>
                                                                <span style={{ marginLeft: "auto", fontWeight: 600, color: "#475569", fontSize: 12 }}>{candidates.length} ứng viên</span>
                                                            </div>
                                                            {candidates.length === 0 ? (
                                                                <div style={{ textAlign: "center", color: "#94a3b8", padding: 16 }}>Chưa có ứng viên trong vòng này.</div>
                                                            ) : (
                                                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
                                                                    {candidates.map((c: any, idx: number) => (
                                                                        <div key={c.id} style={{ background: "#f8fafc", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                                                                            {c.imageUrl ? (
                                                                                <img src={c.imageUrl} alt={c.name} style={{ width: "100%", height: 120, objectFit: "cover", objectPosition: "top" }} />
                                                                            ) : (
                                                                                <div style={{ width: "100%", height: 120, background: `hsl(${(idx * 47) % 360},60%,88%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 800, color: `hsl(${(idx * 47) % 360},60%,40%)` }}>
                                                                                    {c.name?.charAt(0)?.toUpperCase()}
                                                                                </div>
                                                                            )}
                                                                            <div style={{ padding: "10px 12px", flex: 1 }}>
                                                                                <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b", marginBottom: 4 }}>{c.name}</div>
                                                                                {c.description && <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.description}</div>}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )
                                    )}

                                    {/* Tab: Kết quả */}
                                    {detailTab === "results" && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                            {detailExtraLoading ? (
                                                <div style={{ textAlign: "center", padding: 40, color: "#64748b", background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0" }}>⏳ Đang tải kết quả...</div>
                                            ) : resultsData.length === 0 ? (
                                                <div style={{ textAlign: "center", color: "#94a3b8", padding: 32, background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0" }}>Chưa có dữ liệu kết quả.</div>
                                            ) : resultsData.map((round: any, roundIdx: number) => {
                                                const sorted = [...(round.candidates || [])].sort((a: any, b: any) => (b.voteCount ?? b.votes ?? 0) - (a.voteCount ?? a.votes ?? 0));
                                                const total = sorted.reduce((s: number, c: any) => s + (c.voteCount ?? c.votes ?? 0), 0);
                                                const isClosed = round.status === "CLOSED" || round.status === "ENDED";
                                                const advanceCount = round.maxAdvanceCount ?? 0;
                                                const isFinalRound = roundIdx === resultsData.length - 1;
                                                return (
                                                    <div key={round.id} style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                                                            <span style={{ background: "#1e40af", color: "#fff", borderRadius: 99, fontSize: 12, fontWeight: 800, padding: "4px 12px" }}>Vòng {round.roundNumber}</span>
                                                            <span style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{round.title || `Vòng ${round.roundNumber}`}</span>
                                                            <span style={{ marginLeft: "auto", background: (statusColor[round.status?.toUpperCase()] || "#64748b") + "18", color: statusColor[round.status?.toUpperCase()] || "#64748b", padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                                                                {statusLabel[round.status?.toUpperCase()] || round.status}
                                                            </span>
                                                            <span style={{ fontSize: 12, color: "#64748b" }}>Tổng phiếu: <strong style={{ color: "#f59e0b" }}>{total}</strong></span>
                                                        </div>
                                                        {sorted.length === 0 ? (
                                                            <div style={{ textAlign: "center", color: "#94a3b8", padding: 16 }}>Chưa có ứng viên trong vòng này.</div>
                                                        ) : (
                                                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                                                {sorted.map((c: any, idx: number) => {
                                                                    const votes = c.voteCount ?? c.votes ?? 0;
                                                                    const pct = total > 0 ? Math.round(votes / total * 100) : 0;
                                                                    const isWinner = isFinalRound && idx === 0 && isClosed && total > 0;
                                                                    const passes = advanceCount > 0 && idx < advanceCount;
                                                                    const barColor = isWinner ? "#f59e0b" : passes ? "#10b981" : "#6366f1";
                                                                    return (
                                                                        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", background: isWinner ? "#fef9ec" : passes ? "#f0fdf4" : "#f8fafc", borderRadius: 10, border: `1px solid ${isWinner ? "#fcd34d" : passes ? "#bbf7d0" : "#e2e8f0"}` }}>
                                                                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `hsl(${(idx * 47) % 360},60%,88%)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: `hsl(${(idx * 47) % 360},60%,40%)`, flexShrink: 0, overflow: "hidden" }}>
                                                                                {c.imageUrl ? <img src={c.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : (idx + 1)}
                                                                            </div>
                                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                                                                    <span style={{ fontWeight: 700, fontSize: 13, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                                                                                        {isWinner && <span style={{ fontSize: 16 }}>🏆</span>}
                                                                                        {c.name}
                                                                                        {passes && !isWinner && !isFinalRound && <span style={{ fontSize: 10, background: "#10b981", color: "#fff", borderRadius: 99, padding: "1px 7px", fontWeight: 700 }}>⏭ Đi tiếp</span>}
                                                                                        {passes && !isWinner && isFinalRound && <span style={{ fontSize: 10, background: "#10b981", color: "#fff", borderRadius: 99, padding: "1px 7px", fontWeight: 700 }}>Đạt</span>}
                                                                                        {!passes && advanceCount > 0 && isClosed && <span style={{ fontSize: 10, background: "#ef4444", color: "#fff", borderRadius: 99, padding: "1px 7px", fontWeight: 700 }}>Loại</span>}
                                                                                    </span>
                                                                                    <span style={{ fontSize: 13, fontWeight: 800, color: barColor, flexShrink: 0, marginLeft: 8 }}>{votes} phiếu &nbsp;<span style={{ fontWeight: 500, color: "#94a3b8" }}>({pct}%)</span></span>
                                                                                </div>
                                                                                <div style={{ height: 7, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
                                                                                    <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 99, transition: "width 0.7s ease" }} />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                                    <table className="main-table" style={{ margin: 0 }}>
                                        <thead><tr style={{ background: "#f8fafc" }}>
                                            {["#", "Tên cuộc bầu cử", "Trạng thái", "Thời gian", "Mời", "Xác thực", "Bỏ phiếu", "Tỷ lệ", ""].map(h => (
                                                <th key={h} style={{ padding: "12px 14px", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{h}</th>
                                            ))}
                                        </tr></thead>
                                        <tbody>
                                        {filtered.length === 0 ? (
                                            <tr><td colSpan={9} style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>Không có dữ liệu.</td></tr>
                                        ) : filtered.map((e, i) => {
                                            const sc = statusColor[e.status?.toUpperCase()] || "#64748b";
                                            const p = e.totalInvited > 0 ? Math.round(e.totalVoted / e.totalInvited * 100) : 0;
                                            return (
                                            <tr key={e.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                <td style={{ padding: "12px 14px", color: "#94a3b8", fontSize: 12 }}>{i + 1}</td>
                                                <td style={{ padding: "12px 14px", fontWeight: 600, color: "#334155", maxWidth: 220 }}>{e.title}</td>
                                                <td style={{ padding: "12px 14px" }}>
                                                    <span style={{ background: sc + "18", color: sc, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                                                        {statusLabel[e.status?.toUpperCase()] || e.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>{fmt(e.startDate)} → {fmt(e.endDate)}</td>
                                                <td style={{ padding: "12px 14px", fontWeight: 600, color: "#6366f1", textAlign: "center" }}>{e.totalInvited}</td>
                                                <td style={{ padding: "12px 14px", fontWeight: 600, color: "#10b981", textAlign: "center" }}>{e.totalVerified}</td>
                                                <td style={{ padding: "12px 14px", fontWeight: 600, color: "#f59e0b", textAlign: "center" }}>{e.totalVoted}</td>
                                                <td style={{ padding: "12px 14px", minWidth: 120 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                                                            <div style={{ width: `${p}%`, height: "100%", background: p >= 70 ? "#10b981" : p >= 40 ? "#f59e0b" : "#ef4444", borderRadius: 99 }} />
                                                        </div>
                                                        <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", minWidth: 32 }}>{p}%</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: "12px 14px" }}>
                                                    <button onClick={() => {
                                                        setSelectedElection(e);
                                                        setAdminStats(null);
                                                        setCandidatesData([]);
                                                        setResultsData([]);
                                                        setDetailTab("stats");
                                                        setAdminStatsLoading(true);
                                                        setDetailExtraLoading(true);
                                                        electionApi.getAdminStats(e.id).then(r => setAdminStats(r.data)).catch(() => {}).finally(() => setAdminStatsLoading(false));
                                                        Promise.allSettled([
                                                            electionApi.getCandidates(e.id),
                                                            electionApi.getElectionRounds(e.id),
                                                        ]).then(async ([cRes, rRes]) => {
                                                            const candidates = cRes.status === "fulfilled" ? (cRes.value.data || []) : [];
                                                            setCandidatesData(candidates);
                                                            const rounds = rRes.status === "fulfilled" ? (rRes.value.data || []) : [];
                                                            const roundResults = await Promise.all(
                                                                rounds.map(async (round: any) => {
                                                                    try {
                                                                        const rc = await electionApi.getCandidatesByRound(round.id);
                                                                        return { ...round, candidates: rc.data || [] };
                                                                    } catch { return { ...round, candidates: [] }; }
                                                                })
                                                            );
                                                            setResultsData(roundResults);
                                                        }).finally(() => setDetailExtraLoading(false));
                                                    }}
                                                        style={{ background: "#6366f118", color: "#6366f1", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                                                        Chi tiết
                                                    </button>
                                                </td>
                                            </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        );
                    })()}

                    {activeMenu === "monitor" && (
                        <Dashboard />
                    )}

                    {activeMenu === "audit" && (() => {
                        const HIDDEN_ACTIONS: string[] = [];
                        const ACTION_LABEL: Record<string, string> = {
                            "USER_LOGIN_SUCCESS":            "Đăng nhập thành công",
                            "USER_LOGIN_FAILED":             "Đăng nhập thất bại",
                            "USER_LOGOUT":                   "Đăng xuất",
                            "EMAIL_VERIFIED":                "Xác thực email",
                            "VOTER_REGISTER_DISABLED":       "Đăng ký bị vô hiệu",
                            "MODERATOR_CREATED":             "Tạo tài khoản chủ trì",
                            "MODERATOR_CREATE_FAILED":       "Tạo tài khoản chủ trì thất bại",
                            "PROFILE_UPDATED":               "Cập nhật hồ sơ",
                            "PASSWORD_RESET_OTP_REQUESTED":  "Yêu cầu đặt lại mật khẩu",
                            "PASSWORD_RESET_SUCCESS":        "Đặt lại mật khẩu thành công",
                            "ACCOUNT_LOCKED":                "Khóa tài khoản",
                            "ACCOUNT_UNLOCKED":              "Mở khóa tài khoản",
                            "ACCOUNT_ROLE_CHANGED":          "Đổi vai trò tài khoản",
                            "ELECTION_CREATED":              "Tạo cuộc bầu cử",
                            "ELECTION_UPDATED":              "Cập nhật cuộc bầu cử",
                            "ELECTION_DELETED":              "Xóa cuộc bầu cử",
                            "ELECTION_PARTICIPANTS_IMPORTED":"Nhập danh sách người tham gia",
                            "ELECTION_INVITE_RESENT":        "Gửi lại lời mời",
                            "ELECTION_ROUND_PROCESSED":      "Chốt kết quả vòng",
                            "ELECTION_COMPLETED":            "Hoàn tất cuộc bầu cử",
                        };
                        const fromTs = auditFilter.fromDate ? new Date(auditFilter.fromDate).getTime() : null;
                        const toTs   = auditFilter.toDate   ? new Date(auditFilter.toDate + "T23:59:59").getTime() : null;
                        const visibleLogs = auditLogs.filter(log => {
                            const t = new Date(log.timestamp).getTime();
                            return (
                                !HIDDEN_ACTIONS.includes(log.action) &&
                                (!auditFilter.action      || log.action      === auditFilter.action) &&
                                (!auditFilter.serviceName || log.serviceName === auditFilter.serviceName) &&
                                (!auditFilter.userEmail   || log.userEmail?.toLowerCase().includes(auditFilter.userEmail.toLowerCase())) &&
                                (!auditFilter.keyword     || log.details?.toLowerCase().includes(auditFilter.keyword.toLowerCase())) &&
                                (!fromTs || t >= fromTs) &&
                                (!toTs   || t <= toTs)
                            );
                        });
                        const totalPages = Math.max(1, Math.ceil(visibleLogs.length / AUDIT_PAGE_SIZE));
                        const pagedLogs = visibleLogs.slice((auditPage - 1) * AUDIT_PAGE_SIZE, auditPage * AUDIT_PAGE_SIZE);
                        const serviceColors: Record<string, string> = {
                            "election-service":     "#6366f1",
                            "auth-service":         "#0ea5e9",
                            "voter-service":        "#10b981",
                            "crypto-service":       "#f59e0b",
                            "notification-service": "#ec4899",
                            "audit-service":        "#8b5cf6",
                        };
                        return (
                        <div className="table-section">
                            {/* Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Nhật ký hệ thống</h3>
                                    <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>{visibleLogs.length} bản ghi</p>
                                </div>
                                <button className="btn-create" onClick={fetchAuditLogs} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    🔄 Làm mới
                                </button>
                            </div>

                            {/* Filter bar */}
                            {(() => {
                                const selectStyle: React.CSSProperties = { padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, background: "#f8fafc", outline: "none", cursor: "pointer", color: auditFilter.action ? "#0f172a" : "#94a3b8" };
                                const uniqueActions   = Array.from(new Set(auditLogs.map(l => l.action).filter(Boolean))).filter(a => !HIDDEN_ACTIONS.includes(a)).sort();
                                const uniqueServices  = Array.from(new Set(auditLogs.map(l => l.serviceName).filter(Boolean))).sort();
                                return (
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr) auto", gap: 10, marginBottom: 20 }}>
                                    <input
                                        placeholder="🔍 Tìm theo email..."
                                        value={auditFilter.userEmail}
                                        onChange={(e) => { setAuditFilter({ ...auditFilter, userEmail: e.target.value }); setAuditPage(1); }}
                                        style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, background: "#f8fafc", outline: "none" }}
                                    />
                                    <select
                                        value={auditFilter.action}
                                        onChange={(e) => { setAuditFilter({ ...auditFilter, action: e.target.value }); setAuditPage(1); }}
                                        style={{ ...selectStyle, color: auditFilter.action ? "#0f172a" : "#94a3b8" }}
                                    >
                                        <option value="">⚡ Tất cả hành động</option>
                                        {uniqueActions.map(a => <option key={a} value={a}>{ACTION_LABEL[a] || a}</option>)}
                                    </select>
                                    <select
                                        value={auditFilter.serviceName}
                                        onChange={(e) => { setAuditFilter({ ...auditFilter, serviceName: e.target.value }); setAuditPage(1); }}
                                        style={{ ...selectStyle, color: auditFilter.serviceName ? "#0f172a" : "#94a3b8" }}
                                    >
                                        <option value="">🛠 Tất cả service</option>
                                        {uniqueServices.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <input
                                        placeholder="📝 Từ khóa..."
                                        value={auditFilter.keyword}
                                        onChange={(e) => { setAuditFilter({ ...auditFilter, keyword: e.target.value }); setAuditPage(1); }}
                                        style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, background: "#f8fafc", outline: "none" }}
                                    />
                                    <button className="btn-create" onClick={() => { fetchAuditLogs(); setAuditPage(1); }}>Lọc</button>
                                    <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, alignItems: "center" }}>
                                        <span style={{ fontSize: 13, color: "#64748b", whiteSpace: "nowrap" }}>📅 Từ ngày:</span>
                                        <input
                                            type="date"
                                            value={auditFilter.fromDate}
                                            onChange={(e) => { setAuditFilter({ ...auditFilter, fromDate: e.target.value }); setAuditPage(1); }}
                                            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, background: "#f8fafc", outline: "none", cursor: "pointer" }}
                                        />
                                        <span style={{ fontSize: 13, color: "#64748b", whiteSpace: "nowrap" }}>đến ngày:</span>
                                        <input
                                            type="date"
                                            value={auditFilter.toDate}
                                            min={auditFilter.fromDate || undefined}
                                            onChange={(e) => { setAuditFilter({ ...auditFilter, toDate: e.target.value }); setAuditPage(1); }}
                                            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, background: "#f8fafc", outline: "none", cursor: "pointer" }}
                                        />
                                        {(auditFilter.fromDate || auditFilter.toDate) && (
                                            <button onClick={() => { setAuditFilter({ ...auditFilter, fromDate: "", toDate: "" }); setAuditPage(1); }}
                                                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, color: "#64748b", cursor: "pointer" }}>
                                                ✕ Xóa ngày
                                            </button>
                                        )}
                                    </div>
                                </div>
                                );
                            })()}

                            {/* Table */}
                            {loading ? (
                                <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>⏳ Đang tải nhật ký...</div>
                            ) : (
                                <>
                                <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                    <table className="main-table" style={{ margin: 0, tableLayout: "fixed", width: "100%" }}>
                                        <thead>
                                        <tr style={{ background: "#f8fafc" }}>
                                            <th style={{ width: 40, textAlign: "center" }}>#</th>
                                            <th style={{ width: 145, whiteSpace: "nowrap" }}>Thời gian</th>
                                            <th style={{ width: 140, whiteSpace: "nowrap" }}>Service</th>
                                            <th style={{ width: 180 }}>Email</th>
                                            <th style={{ width: 200, whiteSpace: "nowrap" }}>Hành động</th>
                                            <th>Chi tiết</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {pagedLogs.length === 0 ? (
                                            <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>Không có nhật ký phù hợp.</td></tr>
                                        ) : pagedLogs.map((log, i) => {
                                            const svcColor = serviceColors[log.serviceName] || "#64748b";
                                            return (
                                            <tr key={log.id} style={{ transition: "background 0.15s" }}
                                                onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                                                onMouseLeave={e => (e.currentTarget.style.background = "")}>
                                                <td style={{ textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                                                    {(auditPage - 1) * AUDIT_PAGE_SIZE + i + 1}
                                                </td>
                                                <td style={{ fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>
                                                    {new Date(log.timestamp).toLocaleString("vi-VN")}
                                                </td>
                                                <td>
                                                    <span style={{ background: svcColor + "18", color: svcColor, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                                                        {log.serviceName}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: 13, color: "#334155" }}>{log.userEmail || "—"}</td>
                                                <td style={{ whiteSpace: "nowrap" }}>
                                                    <span style={{ background: "#f1f5f9", color: "#475569", padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", display: "inline-block" }}
                                                        title={log.action}>
                                                        {ACTION_LABEL[log.action] || log.action}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: 12, color: "#64748b", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                                    title={log.details}>
                                                    {log.details}
                                                </td>
                                            </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                                    <span style={{ fontSize: 13, color: "#64748b" }}>
                                        Trang {auditPage}/{totalPages} — {visibleLogs.length} bản ghi
                                    </span>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button onClick={() => setAuditPage(1)} disabled={auditPage === 1}
                                            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: auditPage === 1 ? "#f1f5f9" : "#fff", cursor: auditPage === 1 ? "default" : "pointer", fontSize: 13 }}>«</button>
                                        <button onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditPage === 1}
                                            style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: auditPage === 1 ? "#f1f5f9" : "#fff", cursor: auditPage === 1 ? "default" : "pointer", fontSize: 13 }}>‹</button>
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            const start = Math.max(1, Math.min(auditPage - 2, totalPages - 4));
                                            const p = start + i;
                                            return (
                                                <button key={p} onClick={() => setAuditPage(p)}
                                                    style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontWeight: p === auditPage ? 700 : 400, background: p === auditPage ? "#6366f1" : "#fff", color: p === auditPage ? "#fff" : "#334155", cursor: "pointer", fontSize: 13 }}>
                                                    {p}
                                                </button>
                                            );
                                        })}
                                        <button onClick={() => setAuditPage(p => Math.min(totalPages, p + 1))} disabled={auditPage === totalPages}
                                            style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: auditPage === totalPages ? "#f1f5f9" : "#fff", cursor: auditPage === totalPages ? "default" : "pointer", fontSize: 13 }}>›</button>
                                        <button onClick={() => setAuditPage(totalPages)} disabled={auditPage === totalPages}
                                            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: auditPage === totalPages ? "#f1f5f9" : "#fff", cursor: auditPage === totalPages ? "default" : "pointer", fontSize: 13 }}>»</button>
                                    </div>
                                </div>
                                </>
                            )}
                        </div>
                        );
                    })()}
                </main>
            </div>

            {isModalOpen && (
                <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999 }}>
                    <div className="modal-content" style={{ backgroundColor: "white", padding: "25px", borderRadius: "8px", width: "450px", boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }}>
                        <h3 style={{ marginBottom: "15px", textAlign: "center" }}>Cấp tài khoản </h3>
                        <form onSubmit={handleCreateHost}>
                            <div style={{ marginBottom: "12px" }}>
                                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Họ và tên tên tổ chức/Cá nhân:</label>
                                <input style={{ width: "100%", padding: "8px", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc" }} type="text" value={hostName} onChange={(e) => setHostName(e.target.value)} required />
                            </div>
                            <div style={{ marginBottom: "12px" }}>
                                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Email đăng nhập:</label>
                                <input style={{ width: "100%", padding: "8px", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc" }} type="email" value={hostEmail} onChange={(e) => setHostEmail(e.target.value)} required />
                            </div>
                            <div style={{ marginBottom: "12px" }}>
                                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Mật khẩu ban đầu:</label>
                                <input style={{ width: "100%", padding: "8px", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc" }} type="password" value={hostPassword} onChange={(e) => setHostPassword(e.target.value)} required />
                            </div>
                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Số điện thoại:</label>
                                <input style={{ width: "100%", padding: "8px", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc" }} type="text" value={hostPhone} onChange={(e) => setHostPhone(e.target.value)} required />
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                                <button type="button" style={{ padding: "8px 15px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }} onClick={() => setIsModalOpen(false)}>Hủy</button>
                                <button type="submit" style={{ padding: "8px 15px", backgroundColor: "#ff7a00", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Cấp quyền tài khoản</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;
