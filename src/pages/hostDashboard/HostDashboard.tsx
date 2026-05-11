import React, { useState, useEffect } from "react";


import "../../assets/css/host-dashboard.css";

import { useNavigate } from "react-router-dom";
import {useAuth} from "../../context/AuthContext.tsx";
import electionApi from "../../api/electionApi.ts";
import CreateElection from "../../components/electionComponent/CreateElection.tsx";
interface Election {
  id: number;
  title: string;
  status: string;
  roleId: number;
}

const HostDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"elections" | "voters">("elections");
  const [subView, setSubView] = useState<"list" | "create">("list");
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [editingElection, setEditingElection] = useState<Election | null>(null);
  const navigate = useNavigate();

  const handleViewElection = (id: number) => {
    navigate(`/election-detail/${id}`);
  };

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

  const handleDelete = async (id: number) => {
    if (window.confirm("Bạn có chắc chắn muốn ẩn cuộc bầu cử này?")) {
      try {
        await electionApi.delete(id);
        alert("Đã ẩn cuộc bầu cử thành công!");
        fetchElections();
      } catch (error) {
        alert("Lỗi khi thực hiện ẩn dữ liệu!");
      }
    }
  };

  const handleEditClick = (election: Election) => {
    setEditingElection(election);
    setSubView("create");
  };

  return (
      <div className="host-container">
        <main className="host-main">
          <div className="host-sidebar">
            <h2>Quản Lý</h2>
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
                                <th>STT</th>
                                <th>Tên cuộc bầu cử</th>
                                <th>Trạng thái</th>
                                <th>Hành động</th>
                              </tr>
                              </thead>
                              <tbody>
                              {elections.map((election, index) => (
                                  <tr key={election.id}>
                                    <td>{index + 1}</td>
                                    <td>{election.title}</td>
                                    <td>{election.status}</td>
                                    <td>
                                      <button
                                          className="btn-view"
                                          style={{ backgroundColor: '#2196F3', color: 'white', marginRight: '5px', padding: '5px 10px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                          onClick={() => handleViewElection(election.id)}
                                      >
                                        Xem
                                      </button>

                                      {user?.roles?.includes("ROLE_ORGANIZER") && (
                                          <>
                                            <button className="btn-edit" onClick={() => handleEditClick(election)}>Sửa</button>
                                            <button className="btn-delete" onClick={() => handleDelete(election.id)}>Xóa</button>
                                          </>
                                      )}
                                    </td>
                                  </tr>
                              ))}
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