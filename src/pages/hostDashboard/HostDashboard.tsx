import React, {useState} from "react";
import ElectionTimeline from "../../components/electionComponent/ElectionTimeline.tsx";
import CreateElection from "../../components/electionComponent/CreateElection";
import ElectionStatusManager from "../../components/electionComponent/ElectionStatusManager";
import "../../assets/css/host-dashboard.css";

const HostDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"elections" | "voters">("elections");

  // State để điều khiển việc hiển thị các form con trong tab Elections
  const [subView, setSubView] = useState<"list" | "create" | "timeline" | "status">("list");

  return (
      <div className="host-container">

        <main className="host-main">
          <div className="host-sidebar">
            <h2>Admin Panel</h2>
            <ul>
              <li
                  className={activeTab === "elections" ? "active" : ""}
                  onClick={() => {
                    setActiveTab("elections");
                    setSubView("list");
                  }}
              >
                📊 Quản lý Bầu cử
              </li>
              <li
                  className={activeTab === "voters" ? "active" : ""}
                  onClick={() => setActiveTab("voters")}
              >
                👥 Quản lý Cử tri
              </li>
            </ul>
          </div>

          <div className="host-content">
            {activeTab === "elections" ? (
                <div className="management-section">
                  {/* Thanh điều hướng nhanh cho các tính năng con */}
                  <div className="sub-navigation">
                    <button onClick={() => setSubView("list")}
                            className={subView === "list" ? "active-link" : ""}>Danh sách
                    </button>
                    <button onClick={() => setSubView("create")}
                            className={subView === "create" ? "active-link" : ""}>Tạo mới
                    </button>
                    <button onClick={() => setSubView("timeline")}
                            className={subView === "timeline" ? "active-link" : ""}>Lộ trình
                    </button>
                    <button onClick={() => setSubView("status")}
                            className={subView === "status" ? "active-link" : ""}>Trạng thái
                    </button>
                  </div>

                  {/* Render nội dung dựa trên subView */}
                  {subView === "list" && (
                      <>
                        <div className="section-header">
                          <h3>Danh sách cuộc bầu cử</h3>
                          <button className="btn-add" onClick={() => setSubView("create")}>+ Tạo bầu
                            cử mới
                          </button>
                        </div>
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
                          <tr>
                            <td>#001</td>
                            <td>Bầu cử Ban chấp hành 2026</td>
                            <td><span className="badge status-on">Đang chạy</span></td>
                            <td>
                              <button className="btn-edit" onClick={() => setSubView("timeline")}>Lộ
                                trình
                              </button>
                              <button className="btn-edit"
                                      onClick={() => setSubView("status")}>Đóng/Mở
                              </button>
                            </td>
                          </tr>
                          </tbody>
                        </table>
                      </>
                  )}

                  {subView === "create" && <CreateElection/>}
                  {subView === "timeline" && <ElectionTimeline/>}
                  {subView === "status" && <ElectionStatusManager/>}
                </div>
            ) : (
                <div className="management-section">
                  <div className="section-header">
                    <h3>Danh sách cử tri</h3>
                    <button className="btn-add">+ Thêm cử tri</button>
                  </div>
                  {/* Bảng cử tri giữ nguyên như cũ */}
                  <table className="admin-table">
                    <thead>
                    <tr>
                      <th>STT</th>
                      <th>Họ và Tên</th>
                      <th>Email</th>
                      <th>Trạng thái</th>
                      <th>Hành động</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr>
                      <td>1</td>
                      <td>Nguyễn Văn A</td>
                      <td>vanna@example.com</td>
                      <td><span className="badge status-voted">Đã bầu</span></td>
                      <td>
                        <button className="btn-delete">Chặn</button>
                      </td>
                    </tr>
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