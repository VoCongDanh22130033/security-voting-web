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
  const [editingElection, setEditingElection] = useState<Election | null>(null);
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [voters, setVoters] = useState<any[]>([]);

  const filteredElections = elections.filter((election) =>
      election.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (activeTab === "elections" && subView === "list") {
      fetchElections();
    }
  }, [activeTab, subView]);

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

  useEffect(() => {
    if (activeTab === "voters") {
      fetchVoters();
    }
  }, [activeTab]);

  // --- HÀM XỬ LÝ XEM CHI TIẾT CỬ TRI ---
  const handleViewVoterDetail = async (id: number) => {
    try {
      Swal.fire({ title: "Đang tải...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

      const voterData = await userApi.getById(id);
      // Đọc trạng thái từ thuộc tính user.isLock bên trong voterData
      const isAccountLocked = voterData.user?.isLock === 1;

      Swal.fire({
        title: "<strong>Thông Tin Chi Tiết Cử Tri</strong>",
        icon: "info",
        html: `
        <div style="text-align: left; font-size: 15px; line-height: 2;">
          <p><strong>Mã ID cử tri:</strong> ${voterData.id}</p>
          <p><strong>Họ và Tên:</strong> ${voterData.fullName || "Chưa thiết lập"}</p>
          <p><strong>Địa chỉ Email:</strong> ${voterData.email}</p>
          <p><strong>Số điện thoại:</strong> ${voterData.phone || "Chưa cập nhật"}</p>
          <p><strong>Trạng thái hệ thống:</strong> ${isAccountLocked ? '<span style="color: red; font-weight: bold;">Đã bị khóa (is_lock = 1)</span>' : '<span style="color: green; font-weight: bold;">Bình thường (is_lock = 0)</span>'}</p>
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

  // --- HÀM XỬ LÝ KHÓA TÀI KHOẢN CỬ TRI ---
  const handleLockVoter = async (id: number, fullName: string) => {
    Swal.fire({
      title: "Xác nhận khóa tài khoản",
      text: `Bạn có chắc chắn muốn khóa tài khoản cử tri "${fullName}" không?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Khóa tài khoản",
      cancelButtonText: "Hủy",
      backdrop: `rgba(0,0,0,0.4) blur(4px)`
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await userApi.lockAccount(id);

          Swal.fire({
            title: "Đã khóa!",
            text: "Tài khoản cử tri đã bị khóa và hủy trạng thái xác thực hệ thống.",
            icon: "success",
            timer: 2000,
            showConfirmButton: false
          });

          // Tải lại danh sách sau khi cập nhật thành công trạng thái
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
      text: "Bạn chắc chắn muốn xóa cuộc bầu cử này!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff7a00",
      cancelButtonColor: "#d33",
      confirmButtonText: "Xác Nhận",
      cancelButtonText: "Hủy",
      backdrop: `rgba(0,0,0,0.4) blur(4px)`
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await electionApi.delete(id);
          Swal.fire({
            title: "Đã Xóa Thành Công!",
            text: "Dữ liệu đã được cập nhật thành công.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });
          fetchElections();
        } catch (error) {
          Swal.fire({
            title: "Lỗi!",
            text: "Không thể thực hiện ẩn dữ liệu. Vui lòng thử lại sau.",
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
                    onClick={() => { setActiveTab("elections"); setSubView("list"); }}>
                  📊 Quản lý Bầu cử
                </li>
                <li className={activeTab === "voters" ? "active" : ""}
                    onClick={() => setActiveTab("voters")}>
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
                        <div className="section-header">
                          <h3 className="section-title">Danh sách cuộc bầu cử</h3>
                          <button className="btn-add-new" onClick={() => { setEditingElection(null); setSubView("create"); }}>
                            + Tạo cuộc bầu cử mới
                          </button>
                        </div>
                        <div className="search-box">
                          <input
                              type="text"
                              placeholder="Tìm kiếm theo tên cuộc bầu cử..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="search-input"
                          />
                          {searchTerm && (
                              <button className="clear-search" onClick={() => setSearchTerm("")}>&times;</button>
                          )}
                        </div>
                        {loading ? (
                            <div className="loading-state">Đang tải dữ liệu...</div>
                        ) : (
                            <div className="table-wrapper">
                              <table className="admin-table">
                                <thead>
                                <tr>
                                  <th>STT</th>
                                  <th>Tên cuộc bầu cử</th>
                                  <th>Trạng thái</th>
                                  <th style={{ textAlign: "center" }}>Hành động</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredElections.map((election, index) => (
                                    <tr key={election.id}>
                                      <td className="election-id">{index + 1}</td>
                                      <td className="election-name-cell">{election.title}</td>
                                      <td className="election-status">{renderStatusBadge(election.status)}</td>
                                      <td className="action-cells">
                                        <button className="btn-action btn-view" onClick={() => navigate(`/election-detail/${election.id}`)}>
                                          Xem
                                        </button>
                                        {user?.roles?.includes("ROLE_ORGANIZER") && (
                                            <>
                                              <button className="btn-action btn-edit" onClick={() => { setEditingElection(election); setSubView("create"); }}>
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
                                </tbody>
                              </table>
                            </div>
                        )}
                      </>
                  )}

                  {subView === "create" && (
                      <CreateElection
                          editData={editingElection}
                          onComplete={() => {
                            setSubView("list");
                            setEditingElection(null);
                            fetchElections();
                          }}
                      />
                  )}
                </div>
            ) : (
                <div className="management-section">
                  {activeTab === "voters" && (
                      <div className="management-section">
                        <div className="section-header-flex">
                          <h3 className="section-title">Danh sách cử tri hệ thống</h3>
                        </div>

                        {loading ? (
                            <div className="loading-state">Đang tải dữ liệu cử tri...</div>
                        ) : (
                            <table className="elections-table">
                              <thead>
                              <tr className="table-header">
                                <th>STT</th>
                                <th>Họ và Tên</th>
                                <th>Email</th>
                                <th>Số điện thoại</th>
                                <th>Vai Trò</th>
                                <th>Thao tác</th>
                              </tr>
                              </thead>
                              <tbody>
                              {voters.map((voter, index) => {
                                // Kiểm tra biến isLock dựa theo cấu trúc đối tượng trả về từ API getAll()
                                const isLocked = voter.isLock === 1 || voter.user?.isLock === 1;

                                return (
                                    <tr key={voter.id}>
                                      <td className="election-id">{index + 1}</td>
                                      <td className="election-name-cell">{voter.fullName}</td>
                                      <td className="election-name-cell">{voter.email}</td>
                                      <td className="election-phone-cell">{voter.phone || "N/A"}</td>
                                      <td style={{ fontSize: '13px', color: '#64748b', fontWeight: '400' }}>
                                        {voter.roleName || "N/A"}
                                      </td>
                                      <td className="action-cells">
                                        <button
                                            className="btn-action btn-view"
                                            onClick={() => handleViewVoterDetail(voter.id)}
                                        >
                                          Chi tiết
                                        </button>
                                        <button
                                            className="btn-action btn-delete"
                                            onClick={() => handleLockVoter(voter.id, voter.fullName)}
                                            disabled={isLocked}
                                            style={{
                                              backgroundColor: isLocked ? "#94a3b8" : "#ef4444",
                                              opacity: isLocked ? 0.6 : 1,
                                              cursor: isLocked ? "not-allowed" : "pointer"
                                            }}
                                        >
                                          {isLocked ? "Đã khóa" : "Khóa"}
                                        </button>
                                      </td>
                                    </tr>
                                );
                              })}
                              </tbody>
                            </table>
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