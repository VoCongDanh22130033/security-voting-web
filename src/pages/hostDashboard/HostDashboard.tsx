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
// Thêm state này vào đầu Component HostDashboard
  const [searchTerm, setSearchTerm] = useState("");
  const [voters, setVoters] = useState<any[]>([]);
// Hàm xử lý lọc dữ liệu
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
      // const sortedData = response.data.sort((a: any, b: any) => b.id - a.id);
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
      console.log("Dữ liệu cử tri nhận được:", data);
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
  const handleDelete = async (id: number) => {
    // 1. Hiển thị thông báo xác nhận nổi
    Swal.fire({
      title: "Xác nhận xóa",
      text: "Bạn chắc chắn muốn xóa cuộc bầu cử này!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff7a00",
      cancelButtonColor: "#d33",
      confirmButtonText: "Xác Nhận",
      cancelButtonText: "Hủy",
      background: "rgba(255, 255, 255, 0.9)",
      backdrop: `rgba(0,0,0,0.4) blur(4px)`
    }).then(async (result) => {
      // 2. Nếu người dùng nhấn nút "Đồng ý ẩn"
      if (result.isConfirmed) {
        try {
          await electionApi.delete(id);

          // 3. Thông báo thành công tự tắt sau 1.5 giây
          Swal.fire({
            title: "Đã Xóa Thành Công!",
            text: "Dữ liệu đã được cập nhật thành công.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
            background: "rgba(255, 255, 255, 0.9)",
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
                          <i className="fas fa-search"></i> {/* Thêm icon nếu có font-awesome */}
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
                              <div className="table-wrapper">
                                <table className="admin-table">
                                  <thead>
                                  <tr>
                                    <th >STT</th>
                                    <th>Tên cuộc bầu cử</th>
                                    <th>Trạng thái</th>
                                    <th style={{ textAlign: "center" }}>Hành động</th>
                                  </tr>
                                  </thead>
                                  {/*  */}
                                  <tbody>
                                  {filteredElections.map((election, index) => {
                                    return (
                                        <tr key={election.id}>
                                          <td className={"election-id"}>{index + 1}</td>
                                          <td className="election-name-cell">{election.title}</td>
                                          <td className={"election-status"}>{renderStatusBadge(election.status)} </td>

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

                                    );
                                  })}
                                  </tbody>
                                </table>
                              </div>
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
                          {/* Có thể thêm ô tìm kiếm cử tri ở đây */}
                        </div>

                        <table className="elections-table">
                          <thead>
                          <tr className={"table-header"}>
                            <th>STT</th>
                            <th>Họ và Tên</th>
                            <th>Email</th>
                            <th>Số điện thoại</th>
                            <th>Vai Trò</th>
                            <th>Thao tác</th>
                          </tr>
                          </thead>
                          <tbody>
                          {voters.map((voter, index) => (
                              <tr key={voter.id}>
                                <td className="election-id">{index + 1}</td>
                                <td className="election-name-cell">{voter.fullName}</td>
                                <td className="election-name-cell">{voter.email}</td>
                                <td  className="election-phone-cell" >{voter.phone || "N/A"}</td>
                                <td style={{ fontSize: '13px', color: '#64748b', fontWeight: '400' }}>
                                  {voter.roleName || "N/A"}
                                </td>
                                <td className="action-cells">
                                  <button className="btn-action btn-view">Chi tiết</button>
                                  <button className="btn-action btn-delete">Khóa</button>
                                </td>
                              </tr>
                          ))}
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