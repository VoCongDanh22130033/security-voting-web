import React, { useState, useEffect } from "react";
import "../../assets/css/host-dashboard.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import electionApi from "../../api/electionApi.ts";
import CreateElection from "../../components/electionComponent/CreateElection.tsx";

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

  const handleDelete = async (id: number) => {
    if (window.confirm("Bạn có chắc chắn muốn ẩn cuộc bầu cử này?")) {
      try {
        await electionApi.delete(id);
        fetchElections();
      } catch (error) {
        alert("Lỗi khi thực hiện ẩn dữ liệu!");
      }
    }
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

                        {loading ? (
                            <div className="loading-state">Đang tải dữ liệu...</div>
                        ) : (
                            <div className="table-wrapper">
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
                                  {/*  */}
                                  <tbody>
                                  {elections.map((election, index) => {
                                    // Giữ log để bạn debug, nhưng không được để text lọt ra ngoài thẻ <td>
                                    console.log(`Dòng ${index + 1}:`, election.status);

                                    return (
                                        <tr key={election.id}>
                                          <td className={"election-id"}>{index + 1}</td>
                                          <td className="election-name-cell">{election.title}</td>
                                          {/* ✅ Gọi hàm render badge */}
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
                  <h3 className="section-title">Danh sách cử tri</h3>
                  <table className="admin-table">
                    <thead>
                    <tr><th>STT</th><th>Họ và Tên</th><th>Email</th></tr>
                    </thead>
                    <tbody>
                    <tr><td colSpan={3} style={{ textAlign: 'center', padding: '40px' }}>Chưa có dữ liệu cử tri</td></tr>
                    </tbody>
                  </table>
                </div>
            )}
          </section>
        </main>
      </div>
  );
};

export default HostDashboard;