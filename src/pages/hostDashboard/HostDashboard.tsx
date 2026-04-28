import React, { useState, useEffect } from "react";
import ElectionTimeline from "../../components/electionComponent/ElectionTimeline.tsx";
import CreateElection from "../../components/electionComponent/CreateElection";
import ElectionStatusManager from "../../components/electionComponent/ElectionStatusManager";
import "../../assets/css/host-dashboard.css";
import { deleteElection, getElections } from "../../services/api";
import { useAuth } from "../../context/AuthContext.tsx";

const HostDashboard: React.FC = () => {
  const { user } = useAuth(); // Lấy thông tin user hiện tại từ Context
  const [activeTab, setActiveTab] = useState<"elections" | "voters">("elections");
  const [subView, setSubView] = useState<"list" | "create" | "timeline" | "status">("list");
  const [elections, setElections] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [editingElection, setEditingElection] = useState<any | null>(null);

  useEffect(() => {
    if (activeTab === "elections" && subView === "list") {
      fetchElections();
    }
  }, [activeTab, subView]);

  const fetchElections = async () => {
    setLoading(true);
    try {
      const response = await getElections();
      setElections(response.data);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách bầu cử:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Bạn có chắc chắn muốn ẩn cuộc bầu cử này?")) {
      try {
        await deleteElection(id);
        alert("Đã ẩn cuộc bầu cử thành công!");
        fetchElections();
      } catch (error) {
        alert("Lỗi khi thực hiện ẩn dữ liệu!");
      }
    }
  };

  const handleEditClick = (election: any) => {
    setEditingElection(election);
    setSubView("create");
  };

  return (
      <div className="host-container">
        <main className="host-main">
          <div className="host-sidebar">
            <h2>Admin Panel</h2>
            <ul>
              <li className={activeTab === "elections" ? "active" : ""} onClick={() => { setActiveTab("elections"); setSubView("list"); }}>
                📊 Quản lý Bầu cử
              </li>
              <li className={activeTab === "voters" ? "active" : ""} onClick={() => setActiveTab("voters")}>
                👥 Quản lý Cử tri
              </li>
            </ul>
          </div>

          <div className="host-content">
            {activeTab === "elections" ? (
                <div className="management-section">
                  {subView === "list" && (
                      <>
                        <div className="section-header">
                          <h3>Danh sách cuộc bầu cử</h3>
                          <button className="btn-add" onClick={() => { setEditingElection(null); setSubView("create"); }}>
                            + Tạo cuộc bầu cử mới
                          </button>
                        </div>

                        {loading ? (
                            <p>Đang tải dữ liệu...</p>
                        ) : (
                            <table className="admin-table">
                              <thead>
                              <tr>
                                <th>ID</th>
                                <th>Tên cuộc bầu cử</th>
                                <th>Trạng thái</th>
                                <th>Hành động</th>
                              </tr>
                              </thead>
                              <tbody>
                              {elections.length > 0 ? (
                                  elections.map((election) => (
                                      <tr key={election.id}>
                                        <td>#{election.id}</td>
                                        <td>{election.title}</td>
                                        <td>
                                <span className={`badge ${election.status === 'OPEN' ? 'status-on' : 'status-off'}`}>
                                  {election.status}
                                </span>
                                        </td>
                                        <td>
                                          {/* Kiểm tra: Chỉ người tạo (hostId) mới thấy nút Sửa/Xóa */}
                                          {user?.id === election.hostId ? (
                                              <>
                                                <button className="btn-edit" onClick={() => handleEditClick(election)}>Sửa</button>
                                                <button className="btn-delete" onClick={() => handleDelete(election.id)}>Xóa</button>
                                              </>
                                          ) : (
                                              <span style={{fontSize: '12px', color: '#888'}}>Không có quyền</span>
                                          )}
                                        </td>
                                      </tr>
                                  ))
                              ) : (
                                  <tr><td colSpan={4} style={{ textAlign: 'center' }}>Không có cuộc bầu cử nào</td></tr>
                              )}
                              </tbody>
                            </table>
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
                  {subView === "timeline" && <ElectionTimeline />}
                  {subView === "status" && <ElectionStatusManager />}
                </div>
            ) : (
                <div className="management-section">
                  <h3>Danh sách cử tri</h3>
                  <div className="section-header">
                    <button className="btn-add">+ Thêm cử tri</button>
                  </div>
                  <table className="admin-table">
                    <thead>
                    <tr><th>STT</th><th>Họ và Tên</th><th>Email</th><th>Hành động</th></tr>
                    </thead>
                    <tbody>
                    <tr><td colSpan={4} style={{ textAlign: 'center' }}>Chưa có dữ liệu cử tri</td></tr>
                    </tbody>
                  </table>
                </div>
            )}
          </div>
        </main>
      </div>
  );
};

export default HostDashboard;