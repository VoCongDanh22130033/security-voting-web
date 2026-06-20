import React, { useState, useEffect } from "react";
import "./host-dashboard.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import electionApi from "../../api/electionApi.ts";
import CreateElection from "../../components/election/CreateElection.tsx";
import Swal from "sweetalert2";
import userApi from "../../api/userApi.ts";

interface Election {
  id: number;
  title: string;
  status: string;
  roleId?: number | null;
  startDate?: string;
  endDate?: string;
}


const HostDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"elections" | "voters">("elections");
  const [subView, setSubView] = useState<"list" | "create">("list");
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "UPCOMING" | "CLOSED">("ALL");
  const [voters, setVoters] = useState<any[]>([]);
  const [electionPage, setElectionPage] = useState(1);
  const [voterPage, setVoterPage] = useState(1);
  const PAGE_SIZE = 10;

  const filteredElections = elections.filter((election) => {
    const matchSearch = election.title.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchSearch) return false;
    if (statusFilter === "ALL") return true;
    const s = election.status?.toUpperCase();
    if (statusFilter === "CLOSED") return s === "CLOSED" || s === "ENDED";
    return s === statusFilter;
  });
  const totalElectionPages = Math.max(1, Math.ceil(filteredElections.length / PAGE_SIZE));
  const pagedElections = filteredElections.slice((electionPage - 1) * PAGE_SIZE, electionPage * PAGE_SIZE);

  const filteredVoters = voters.filter((voter) => {
    const roleId = voter.roleId || voter.user?.roleId;
    const roleName = (voter.roleName || voter.user?.roleName || "").toUpperCase();

    const isAdmin = roleId === 1 || roleName.includes("ADMIN");

    if (isAdmin) return false;

    return (
        voter.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voter.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  const totalVoterPages = Math.max(1, Math.ceil(filteredVoters.length / PAGE_SIZE));
  const pagedVoters = filteredVoters.slice((voterPage - 1) * PAGE_SIZE, voterPage * PAGE_SIZE);

  useEffect(() => { setElectionPage(1); }, [searchTerm, statusFilter]);
  useEffect(() => { setVoterPage(1); }, [searchTerm]);

  useEffect(() => {
    if (activeTab === "elections" && subView === "list") {
      fetchElections();
    }
  }, [activeTab, subView]);

  useEffect(() => {
    if (activeTab === "voters") {
      fetchVoters();
    }
  }, [activeTab]);

  const fetchElections = async () => {
    setLoading(true);
    try {
      const response = await electionApi.getAll();
      console.log("[HostDashboard] elections roleId check:", response.data.map((e: any) => ({ id: e.id, roleId: e.roleId })));
      setElections(response.data);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách bầu cử:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVoters = async () => {
    setLoading(true);
    try {
      const data = await userApi.getAll();
      setVoters(data);
    } catch (error) {
      console.error("Lỗi lấy danh sách cử tri:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    if (!status) return <span className="status-badge status-closed">N/A</span>;
    const s = status.toUpperCase().trim();
    switch (s) {
      case "OPEN":
        return <span className="status-badge status-open">Đang diễn ra</span>;
      case "UPCOMING":
        return <span className="status-badge status-upcoming">Sắp diễn ra</span>;
      case "ENDED":
      case "CLOSED":
        return <span className="status-badge status-closed">Đã kết thúc</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const handleViewVoterDetail = async (id: number) => {
    try {
      Swal.fire({ title: "Đang tải...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const voterData = await userApi.getById(id);
      const isAccountLocked = voterData.user?.isLock === 1;

      Swal.fire({
        title: "<strong>Thông Tin Chi Tiết Cử Tri</strong>",
        icon: "info",
        html: `
        <div style="text-align: left; font-size: 15px; line-height: 2; padding: 10px 20px;">
          <p><strong>Mã ID cử tri:</strong> ${voterData.id}</p>
          <p><strong>Họ và Tên:</strong> ${voterData.fullName || "Chưa thiết lập"}</p>
          <p><strong>Địa chỉ Email:</strong> ${voterData.email}</p>
          <p><strong>Số điện thoại:</strong> ${voterData.phone || "Chưa cập nhật"}</p>
          <p><strong>Trạng thái:</strong> ${isAccountLocked ? '<span style="color: #ef4444; font-weight: bold;">Đã bị khóa</span>' : '<span style="color: #10b981; font-weight: bold;">Hoạt động</span>'}</p>
        </div>
      `,
        confirmButtonColor: "#ff7a00",
        confirmButtonText: "Đóng"
      });
    } catch (error: any) {
      Swal.fire({
        title: "Lỗi!",
        text: error.response?.data || "Không thể lấy thông tin chi tiết cử tri.",
        icon: "error",
        confirmButtonColor: "#ff7a00"
      });
    }
  };

  const handleLockVoter = async (id: number, fullName: string) => {
    Swal.fire({
      title: "Xác nhận khóa tài khoản",
      text: `Bạn có chắc chắn muốn khóa tài khoản cử tri "${fullName}" không?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Khóa tài khoản",
      cancelButtonText: "Hủy",
      backdrop: `rgba(0,0,0,0.4) blur(4px)`
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await userApi.lockAccount(id);
          Swal.fire({
            title: "Đã khóa!",
            text: "Tài khoản cử tri đã bị khóa thành công.",
            icon: "success",
            timer: 2000,
            showConfirmButton: false
          });
          fetchVoters();
        } catch (error: any) {
          Swal.fire({
            title: "Thất bại!",
            text: error.response?.data?.message || "Không thể thực hiện xử lý khóa.",
            icon: "error",
            confirmButtonColor: "#ff7a00"
          });
        }
      }
    });
  };

  const handleDelete = async (id: number) => {
    Swal.fire({
      title: "Xác nhận xóa",
      text: "Bạn chắc chắn muốn xóa cuộc bầu cử này?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Xác Nhận",
      cancelButtonText: "Hủy",
      backdrop: `rgba(0,0,0,0.4) blur(4px)`
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await electionApi.delete(id);
          Swal.fire({
            title: "Đã Xóa Thành Công!",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });
          fetchElections();
        } catch (error) {
          Swal.fire({
            title: "Lỗi!",
            text: "Không thể xóa dữ liệu. Vui lòng thử lại sau.",
            icon: "error",
            confirmButtonColor: "#ff7a00"
          });
        }
      }
    });
  };

  const downloadReport = async (electionId: number, type: "excel" | "pdf", roleId?: number | null) => {
    const isAdmin = user?.roles?.includes("ROLE_ADMIN");
    // eslint-disable-next-line eqeqeq
    const isOwner = roleId != null && roleId == user?.id;
    console.log("[downloadReport] roleId:", roleId, typeof roleId, "user.id:", user?.id, typeof user?.id, "isOwner:", isOwner, "isAdmin:", isAdmin);
    if (!isAdmin && !isOwner) {
      Swal.fire({ icon: "error", title: "Không có quyền", text: "Chỉ người tạo cuộc bầu cử hoặc quản trị viên mới có thể xuất báo cáo.", toast: true, position: "top-end", timer: 3000, showConfirmButton: false });
      return;
    }
    const response = type === "excel"
        ? await electionApi.exportReportExcel(electionId)
        : await electionApi.exportReportPdf(electionId);
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = `election-${electionId}-report.${type === "excel" ? "xlsx" : "pdf"}`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
      <div className="host-container">
        <main className="host-main">
          <aside className="host-sidebar">
            <div className="sidebar-logo">Bảng điều khiển</div>
            <nav>
              <ul>
                <li className={activeTab === "elections" ? "active" : ""}
                    onClick={() => { setActiveTab("elections"); setSubView("list"); setSearchTerm(""); }}>
                  Quản lý Bầu cử
                </li>
              </ul>
            </nav>
          </aside>

          <section className="host-content">
            {activeTab === "elections" ? (
                <div className="management-section">
                  {subView === "list" && (
                      <>
                        <div className="section-header-flex">
                          <h3 className="section-title">Danh sách cuộc bầu cử</h3>
                          <button className="btn-add-new" onClick={() => setSubView("create")}>
                            + Tạo cuộc bầu cử mới
                          </button>
                        </div>

                        <div className="dashboard-controls">
                          <div className="search-box">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder="Tìm kiếm cuộc bầu cử..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                            {searchTerm && (
                                <button className="clear-search" onClick={() => setSearchTerm("")}>&times;</button>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {([
                              { key: "ALL",     label: "Tất cả",        color: "#6366f1", bg: "#eef2ff" },
                              { key: "OPEN",    label: "Đang diễn ra",  color: "#10b981", bg: "#d1fae5" },
                              { key: "UPCOMING",label: "Sắp diễn ra",   color: "#f59e0b", bg: "#fef3c7" },
                              { key: "CLOSED",  label: "Đã kết thúc",   color: "#64748b", bg: "#f1f5f9" },
                            ] as const).map(({ key, label, color, bg }) => (
                              <button key={key} onClick={() => setStatusFilter(key)}
                                style={{ padding: "7px 16px", borderRadius: 20, border: `2px solid ${statusFilter === key ? color : "#e2e8f0"}`, background: statusFilter === key ? bg : "#fff", color: statusFilter === key ? color : "#64748b", fontWeight: statusFilter === key ? 700 : 500, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}>
                                {label}
                                {key !== "ALL" && (
                                  <span style={{ marginLeft: 6, background: statusFilter === key ? color : "#e2e8f0", color: statusFilter === key ? "#fff" : "#64748b", borderRadius: 99, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>
                                    {elections.filter(e => {
                                      const s = e.status?.toUpperCase();
                                      if (key === "CLOSED") return s === "CLOSED" || s === "ENDED";
                                      return s === key;
                                    }).length}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        {loading ? (
                            <div className="loading-state">
                              <div className="spinner"></div> Đang tải dữ liệu...
                            </div>
                        ) : (
                            <div className="table-wrapper">
                              <table className="modern-table">
                                <thead>
                                <tr>
                                  <th style={{ width: "80px" }}>STT</th>
                                  <th>Tên cuộc bầu cử</th>
                                  <th style={{ width: "180px" }}>Trạng thái</th>
                                  <th style={{ width: "220px", textAlign: "center" }}>Hành động</th>
                                </tr>
                                </thead>
                                <tbody>
                                {pagedElections.map((election, index) => (
                                    <tr key={election.id}>
                                      <td>{(electionPage - 1) * PAGE_SIZE + index + 1}</td>
                                      <td className="font-medium text-dark">{election.title}</td>
                                      <td>{renderStatusBadge(election.status)}</td>
                                      <td className="action-cells">
                                        <button className="btn-action btn-primary" onClick={() => navigate(`/election-detail/${election.id}`)}>
                                          Xem
                                        </button>
                                        <button className="btn-action btn-view" onClick={() => navigate(`/results?electionId=${election.id}`)}>
                                          Kết quả
                                        </button>
                                        <button className="btn-action btn-edit" onClick={() => downloadReport(election.id, "excel", election.roleId)}>
                                          Excel
                                        </button>

                                        {(() => {
                                          const isAdmin = user?.roles?.includes("ROLE_ADMIN");
                                          const isOrganizer = user?.roles?.includes("ROLE_ORGANIZER");
                                          if (!isAdmin && !isOrganizer) return null;
                                          // eslint-disable-next-line eqeqeq
                                          const isOwner = election.roleId != null && election.roleId == user?.id;
                                          return (
                                            <>
                                              <button className="btn-action btn-edit" onClick={() => {
                                                if (!isAdmin && !isOwner) {
                                                  Swal.fire({ icon: "error", title: "Không có quyền", text: "Bạn không thể chỉnh sửa cuộc bầu cử do người khác tạo.", toast: true, position: "top-end", timer: 3000, showConfirmButton: false });
                                                  return;
                                                }
                                                const s = (election.status || "").toUpperCase();
                                                if (s === "OPEN" || s === "CLOSED" || s === "ENDED") {
                                                  Swal.fire({ icon: "warning", title: s === "OPEN" ? "Cuộc bầu cử đang diễn ra" : "Cuộc bầu cử đã kết thúc", text: "Không thể chỉnh sửa cuộc bầu cử trong trạng thái này.", toast: true, position: "top-end", timer: 3000, showConfirmButton: false });
                                                  return;
                                                }
                                                navigate(`/edit-election/${election.id}`);
                                              }}>
                                                Sửa
                                              </button>
                                              <button className="btn-action btn-delete" onClick={() => {
                                                if (!isAdmin && !isOwner) {
                                                  Swal.fire({ icon: "error", title: "Không có quyền", text: "Bạn không thể xóa cuộc bầu cử do người khác tạo.", toast: true, position: "top-end", timer: 3000, showConfirmButton: false });
                                                  return;
                                                }
                                                handleDelete(election.id);
                                              }}>
                                                Xóa
                                              </button>
                                            </>
                                          );
                                        })()}
                                      </td>
                                    </tr>
                                ))}
                                {pagedElections.length === 0 && (
                                    <tr>
                                      <td colSpan={4} className="empty-state">Không tìm thấy cuộc bầu cử nào</td>
                                    </tr>
                                )}
                                </tbody>
                              </table>
                              {totalElectionPages > 1 && (
                                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: "16px 0" }}>
                                  <button onClick={() => setElectionPage(p => Math.max(1, p - 1))} disabled={electionPage === 1} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: electionPage === 1 ? "#f1f5f9" : "#fff", cursor: electionPage === 1 ? "not-allowed" : "pointer", color: "#475569" }}>‹</button>
                                  {Array.from({ length: totalElectionPages }, (_, i) => i + 1).map(p => (
                                    <button key={p} onClick={() => setElectionPage(p)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: p === electionPage ? "#2ecc71" : "#fff", color: p === electionPage ? "#fff" : "#475569", fontWeight: p === electionPage ? 700 : 400, cursor: "pointer" }}>{p}</button>
                                  ))}
                                  <button onClick={() => setElectionPage(p => Math.min(totalElectionPages, p + 1))} disabled={electionPage === totalElectionPages} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: electionPage === totalElectionPages ? "#f1f5f9" : "#fff", cursor: electionPage === totalElectionPages ? "not-allowed" : "pointer", color: "#475569" }}>›</button>
                                  <span style={{ color: "#94a3b8", fontSize: 13 }}>Trang {electionPage}/{totalElectionPages} ({filteredElections.length} kết quả)</span>
                                </div>
                              )}
                            </div>
                        )}

                      </>
                  )}

                  {subView === "create" && <CreateElection onCreated={() => { setSubView("list"); fetchElections(); window.scrollTo({ top: 0, behavior: "smooth" }); }} onBack={() => { setSubView("list"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
                </div>
            ) : (
                <div className="management-section">
                  <div className="section-header-flex">
                    <h3 className="section-title">Danh sách cử tri hệ thống</h3>
                  </div>

                  <div className="dashboard-controls">
                    <div className="search-box">
                      <span className="search-icon">🔍</span>
                      <input
                          type="text"
                          placeholder="Tìm theo tên hoặc email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="search-input"
                      />
                      {searchTerm && (
                          <button className="clear-search" onClick={() => setSearchTerm("")}>&times;</button>
                      )}
                    </div>
                  </div>

                  {loading ? (
                      <div className="loading-state">
                        <div className="spinner"></div> Đang tải dữ liệu cử tri...
                      </div>
                  ) : (
                      <div className="table-wrapper">
                        <table className="modern-table">
                          <thead>
                          <tr>
                            <th style={{ width: "80px" }}>STT</th>
                            <th>Họ và Tên</th>
                            <th>Email</th>
                            <th>Số điện thoại</th>
                            <th>Vai Trò</th>
                            <th style={{ width: "200px", textAlign: "center" }}>Thao tác</th>
                          </tr>
                          </thead>
                          <tbody>
                          {pagedVoters.map((voter, index) => {
                            const isLocked = voter.isLock === 1 || voter.user?.isLock === 1;
                            return (
                                <tr key={voter.id}>
                                  <td>{(voterPage - 1) * PAGE_SIZE + index + 1}</td>
                                  <td className="font-medium text-dark">{voter.fullName}</td>
                                  <td>{voter.email}</td>
                                  <td>{voter.phone || "—"}</td>
                                  <td>
                                    <span className="role-tag">{voter.roleName || "Cử tri"}</span>
                                  </td>
                                  <td className="action-cells">
                                    <button className="btn-action btn-view" onClick={() => handleViewVoterDetail(voter.id)}>
                                      Chi tiết
                                    </button>
                                    <button
                                        className="btn-action btn-lock"
                                        onClick={() => handleLockVoter(voter.id, voter.fullName)}
                                        disabled={isLocked}
                                        style={{
                                          backgroundColor: isLocked ? "#cbd5e1" : "#fee2e2",
                                          color: isLocked ? "#94a3b8" : "#ef4444",
                                          cursor: isLocked ? "not-allowed" : "pointer"
                                        }}
                                    >
                                      {isLocked ? "Đã khóa" : "Khóa"}
                                    </button>
                                  </td>
                                </tr>
                            );
                          })}
                          {pagedVoters.length === 0 && (
                              <tr>
                                <td colSpan={6} className="empty-state">Không tìm thấy cử tri nào</td>
                              </tr>
                          )}
                          </tbody>
                        </table>
                        {totalVoterPages > 1 && (
                          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: "16px 0" }}>
                            <button onClick={() => setVoterPage(p => Math.max(1, p - 1))} disabled={voterPage === 1} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: voterPage === 1 ? "#f1f5f9" : "#fff", cursor: voterPage === 1 ? "not-allowed" : "pointer", color: "#475569" }}>‹</button>
                            {Array.from({ length: totalVoterPages }, (_, i) => i + 1).map(p => (
                              <button key={p} onClick={() => setVoterPage(p)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: p === voterPage ? "#2ecc71" : "#fff", color: p === voterPage ? "#fff" : "#475569", fontWeight: p === voterPage ? 700 : 400, cursor: "pointer" }}>{p}</button>
                            ))}
                            <button onClick={() => setVoterPage(p => Math.min(totalVoterPages, p + 1))} disabled={voterPage === totalVoterPages} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: voterPage === totalVoterPages ? "#f1f5f9" : "#fff", cursor: voterPage === totalVoterPages ? "not-allowed" : "pointer", color: "#475569" }}>›</button>
                            <span style={{ color: "#94a3b8", fontSize: 13 }}>Trang {voterPage}/{totalVoterPages} ({filteredVoters.length} kết quả)</span>
                          </div>
                        )}
                      </div>
                  )}
                </div>
            )}
          </section>
        </main>
      </div>
  );
};

export default HostDashboard;
