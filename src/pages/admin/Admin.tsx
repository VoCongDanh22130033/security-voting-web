import React, { useState } from "react";
import "../../assets/css/admin.css";

const Admin: React.FC = () => {
    const [activeMenu, setActiveMenu] = useState<"host" | "voter" | "monitor">("host");

    return (
        <div className="admin-container">
            <div className="admin-wrapper">
                {/* Sidebar trái */}
                <aside className="admin-sidebar">
                    <div className="admin-info">
                        <div className="admin-avatar">SA</div>
                        <span>Super Admin</span>
                    </div>
                    <nav>
                        <div className="menu-group">Quản lý tài khoản</div>
                        <ul>
                            <li className={activeMenu === "host" ? "active" : ""} onClick={() => setActiveMenu("host")}>
                                🔑 Tài khoản chủ trì
                            </li>
                            <li className={activeMenu === "voter" ? "active" : ""} onClick={() => setActiveMenu("voter")}>
                                👥 Tài khoản cử tri
                            </li>
                        </ul>
                        <div className="menu-group">Quản lý bầu cử</div>
                        <ul>
                            <li className={activeMenu === "monitor" ? "active" : ""} onClick={() => setActiveMenu("monitor")}>
                                🖥️ Giám sát hệ thống
                            </li>
                        </ul>
                    </nav>
                </aside>

                {/* Nội dung chính bên phải */}
                <main className="admin-content">
                    {activeMenu === "host" && (
                        <div className="table-section">
                            <div className="content-header">
                                <h3>Quản lý Tài khoản Chủ trì</h3>
                                <button className="btn-create">+ Cấp quyền Host</button>
                            </div>
                            <table className="main-table">
                                <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Tên tổ chức/Cá nhân</th>
                                    <th>Email</th>
                                    <th>Ngày tạo</th>
                                    <th>Hành động</th>
                                </tr>
                                </thead>
                                <tbody>
                                <tr>
                                    <td>#H001</td>
                                    <td>Đại học Công nghệ</td>
                                    <td>admin@ute.edu.vn</td>
                                    <td>12/03/2024</td>
                                    <td>
                                        <button className="btn-lock">Khóa</button>
                                    </td>
                                </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeMenu === "voter" && (
                        <div className="table-section">
                            <div className="content-header">
                                <h3>Quản lý Tài khoản Cử tri</h3>
                                <div className="search-bar">
                                    <input type="text" placeholder="Tìm kiếm Email/Họ tên..." />
                                </div>
                            </div>
                            <table className="main-table">
                                <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Họ Tên</th>
                                    <th>Email</th>
                                    <th>Trạng thái</th>
                                    <th>Hành động</th>
                                </tr>
                                </thead>
                                <tbody>
                                <tr>
                                    <td>1</td>
                                    <td>Trần Văn Nam</td>
                                    <td>namtv@gmail.com</td>
                                    <td><span className="status-badge online">Hoạt động</span></td>
                                    <td><button className="btn-reset">Reset PW</button></td>
                                </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeMenu === "monitor" && (
                        <div className="monitor-section">
                            <h3>Giám sát hệ thống</h3>
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <span className="stat-label">Tổng số cuộc bầu cử</span>
                                    <span className="stat-value">124</span>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-label">Phiếu bầu trong ngày</span>
                                    <span className="stat-value text-green">2,540</span>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-label">Tải hệ thống</span>
                                    <span className="stat-value text-orange">12%</span>
                                </div>
                            </div>
                            <div className="log-console">
                                <h4>Nhật ký hệ thống (System Logs)</h4>
                                <div className="log-list">
                                    <p><code>[2024-03-15 10:20:01]</code> User #293 bình chọn thành công tại cuộc bầu cử #01</p>
                                    <p><code>[2024-03-15 10:21:45]</code> Tài khoản Host #H002 vừa tạo cuộc bầu cử mới</p>
                                    <p className="text-red"><code>[2024-03-15 10:25:12]</code> Cảnh báo: Phát hiện đăng nhập bất thường từ IP 192.168.1.1</p>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Admin;