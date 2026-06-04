import React, { useState, useEffect } from "react";
import "../../assets/css/host-dashboard.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import electionApi from "../../api/electionApi.ts";
import CreateElection from "../../components/electionComponent/CreateElection.tsx";
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
  const [voters, setVoters] = useState<any[]>([]);

  const filteredElections = elections.filter((election) =>
      election.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
      <div className="host-container">
        <main className="host-main">
          <aside className="host-sidebar">
            <div className="sidebar-logo">🗳️ Admin Panel</div>
            <nav>
              <ul>
                <li className={activeTab === "elections" ? "active" : ""}
                    onClick={() => { setActiveTab("elections"); setSubView("list"); setSearchTerm(""); }}>
                  📊 Quản lý Bầu cử
                </li>
                <li className={activeTab === "voters" ? "active" : ""}
                    onClick={() => { setActiveTab("voters"); setSearchTerm(""); }}>
                  👥 Quản lý Cử tri
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
                                {filteredElections.map((election, index) => (
                                    <tr key={election.id}>
                                      <td>{index + 1}</td>
                                      <td className="font-medium text-dark">{election.title}</td>
                                      <td>{renderStatusBadge(election.status)}</td>
                                      <td className="action-cells">
                                        <button className="btn-action btn-view" onClick={() => navigate(`/election-detail/${election.id}`)}>
                                          Xem
                                        </button>
                                        {user?.roles?.includes("ROLE_ORGANIZER") && (
                                            <>
                                              <button className="btn-action btn-edit" onClick={() => navigate(`/edit-election/${election.id}`)}>
                                                Sửa
                                              </button>
                                              <button className="btn-action btn-delete" onClick={() => handleDelete(election.id)}>
                                                Xóa
                                              </button>
                                            </>
                                        )}
                                      </td>
                                    </tr>
                                ))}
                                {filteredElections.length === 0 && (
                                    <tr>
                                      <td colSpan={4} className="empty-state">Không tìm thấy cuộc bầu cử nào</td>
                                    </tr>
                                )}
                                </tbody>
                              </table>
                            </div>
                        )}
                      </>
                  )}

                  {subView === "create" && <CreateElection />}
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
                          {filteredVoters.map((voter, index) => {
                            const isLocked = voter.isLock === 1 || voter.user?.isLock === 1;
                            return (
                                <tr key={voter.id}>
                                  <td>{index + 1}</td>
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
                          {filteredVoters.length === 0 && (
                              <tr>
                                <td colSpan={6} className="empty-state">Không tìm thấy cử tri nào</td>
                              </tr>
                          )}
                          </tbody>
                        </table>
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