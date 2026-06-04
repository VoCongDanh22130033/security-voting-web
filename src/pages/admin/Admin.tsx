import React, { useState, useEffect } from "react";
import "../../assets/css/admin.css";
import userApi from "../../api/userApi.ts";
import Swal from "sweetalert2";
import Dashboard from "./Dashboard.tsx";

interface AccountUser {
    id: number;
    fullName: string;
    email: string;
    phone: string;
    isLock: number;
}

const Admin: React.FC = () => {
    const [activeMenu, setActiveMenu] = useState<"host" | "voter" | "monitor">("host");
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

    useEffect(() => {
        if (activeMenu === "host") {
            fetchHostsList();
        } else if (activeMenu === "voter") {
            fetchVotersList();
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


    const filteredHosts = hosts.filter(h =>
        h.fullName?.toLowerCase().includes(searchHost.toLowerCase()) ||
        h.email?.toLowerCase().includes(searchHost.toLowerCase())
    );

    const filteredVoters = voters.filter(v =>
        v.fullName?.toLowerCase().includes(searchVoter.toLowerCase()) ||
        v.email?.toLowerCase().includes(searchVoter.toLowerCase())
    );

    return (
        <div className="admin-container">
            <div className="admin-wrapper">
                {/* Sidebar trái */}
                <aside className="admin-sidebar">
                    <div className="admin-info">

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
                                <div style={{ display: "flex", gap: "10px" }}>
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm chủ trì..."
                                        value={searchHost}
                                        onChange={(e) => setSearchHost(e.target.value)}
                                        style={{ padding: "6px 12px", borderRadius: "4px", border: "1px solid #ccc" }}
                                    />
                                    <button className="btn-create" onClick={() => setIsModalOpen(true)}>+ Cấp quyền Host</button>
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
                                            onChange={(e) => setSearchVoter(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            {loading ? (
                                <div style={{ textAlign: "center", padding: "20px" }}>Đang tải dữ liệu cử tri...</div>
                            ) : (
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
                                    {filteredVoters.map((voter, index) => {
                                        const isLocked = voter.isLock === 1;
                                        return (
                                            <tr key={voter.id}>
                                                <td>{index + 1}</td>
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
                            )}
                        </div>
                    )}

                    {activeMenu === "monitor" && (
                        <Dashboard />
                    )}
                </main>
            </div>

            {isModalOpen && (
                <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999 }}>
                    <div className="modal-content" style={{ backgroundColor: "white", padding: "25px", borderRadius: "8px", width: "450px", boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }}>
                        <h3 style={{ marginBottom: "15px", textAlign: "center" }}>Cấp tài khoản Moderator (Host)</h3>
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
