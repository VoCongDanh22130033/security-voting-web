import React, { useState } from "react";
import { useProfile } from "../context/ProfileContext";
import { useAuth } from "../context/AuthContext";
import "../assets/css/profile.css";

const Profile: React.FC = () => {
    const { logout } = useAuth();
    const { profile, loading } = useProfile();

    const [activeTab, setActiveTab] = useState<"info" | "edit" | "password">("info");

    // state cho form edit
    const [formData, setFormData] = useState({
        fullName: profile?.fullName || "",
        phone: profile?.user?.phone || "",
        citizenId: profile?.citizenId || "",
        email: profile?.email || ""
    });

    if (loading) {
        return <div className="profile-container">Đang tải...</div>;
    }

    if (!profile) {
        return <div className="profile-container">Không có dữ liệu</div>;
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleUpdateProfile = () => {
        console.log("Update profile:", formData);
        // 👉 call API ở đây
    };

    return (
        <div className="profile-container">
            <main className="profile-main">
                <div className="profile-card">

                    {/* HEADER */}
                    <div className="profile-header">
                        <div className="avatar-circle">
                            {(profile.fullName || profile.user?.username || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                            <h2>{profile.fullName || profile.user?.username}</h2>
                            <p className="role-badge">
                                {profile.user?.roles?.[0]?.name?.replace("ROLE_", "")}
                            </p>
                        </div>


                    </div>

                    {/* TAB */}
                    <div className="profile-tabs">
                        <button
                            className={activeTab === "info" ? "tab active" : "tab"}
                            onClick={() => setActiveTab("info")}
                        >
                            Thông tin
                        </button>

                        <button
                            className={activeTab === "edit" ? "tab active" : "tab"}
                            onClick={() => setActiveTab("edit")}
                        >
                            Chỉnh sửa
                        </button>

                        <button
                            className={activeTab === "password" ? "tab active" : "tab"}
                            onClick={() => setActiveTab("password")}
                        >
                            Đổi mật khẩu
                        </button>
                    </div>

                    <div className="profile-content">

                        {/* TAB INFO */}
                        {activeTab === "info" && (
                            <div className="info-section">
                                <h3>Thông tin tài khoản</h3>

                                <div className="info-grid">
                                    <div className="info-item">
                                        <label>Họ và tên</label>
                                        <p>{profile.fullName}</p>
                                    </div>

                                    <div className="info-item">
                                        <label>Email</label>
                                        <p>{profile.user?.email}</p>
                                    </div>

                                    <div className="info-item">
                                        <label>Username</label>
                                        <p>{profile.user?.username}</p>
                                    </div>

                                    <div className="info-item">
                                        <label>SĐT</label>
                                        <p>{profile.user?.phone}</p>
                                    </div>

                                    <div className="info-item">
                                        <label>CCCD</label>
                                        <p>{profile.citizenId}</p>
                                    </div>
                                </div>

                                <div className="action-section">

                                    <button onClick={logout} className="logout-btn">
                                        Đăng xuất
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TAB EDIT */}
                        {activeTab === "edit" && (
                            <div className="edit-section">
                                <h3>Chỉnh sửa hồ sơ</h3>

                                <div className="edit-form">

                                    {/* EMAIL (readonly) */}
                                    <div className="form-group">
                                        <label>Email</label>
                                        <input
                                            value={profile.user?.email || ""}
                                            disabled
                                            className="readonly-input"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Họ và tên</label>
                                        <input
                                            name="fullName"
                                            value={formData.fullName}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Số điện thoại</label>
                                        <input
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>CCCD</label>
                                        <input
                                            name="citizenId"
                                            value={formData.citizenId}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="action-section">
                                        <button
                                            className="change-password-btn"
                                            onClick={handleUpdateProfile}
                                        >
                                            Lưu thay đổi
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB PASSWORD */}
                        {activeTab === "password" && (
                            <div className="password-section">
                                <h3>Đổi mật khẩu</h3>

                                <div className="password-form">
                                    <div className="form-group">
                                        <label>Mật khẩu hiện tại</label>
                                        <input type="password" />
                                    </div>

                                    <div className="form-group">
                                        <label>Mật khẩu mới</label>
                                        <input type="password" />
                                    </div>

                                    <div className="form-group">
                                        <label>Xác nhận</label>
                                        <input type="password" />
                                    </div>

                                    <div className="action-section">
                                        <button className="change-password-btn">
                                            Cập nhật mật khẩu
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </main>
        </div>
    );
};

export default Profile;