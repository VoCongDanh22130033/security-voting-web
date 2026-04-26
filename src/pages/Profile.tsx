import React from "react";
import { useProfile } from "../context/ProfileContext";
import { useAuth } from "../context/AuthContext";
import "../assets/css/profile.css";

const Profile: React.FC = () => {
    const { logout } = useAuth();
    const { profile, loading, refreshProfile } = useProfile();

    if (loading) {
        return (
            <div className="profile-container">
                <div className="loading-spinner">Đang tải thông tin...</div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="profile-container">
                <div className="error-message">
                    <p>Không tìm thấy thông tin người dùng.</p>
                    <button onClick={refreshProfile} className="retry-btn">Thử lại</button>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-container">
            <main className="profile-main">
                <div className="profile-card">
                    <div className="profile-header">
                        <div className="avatar-circle">
                            {/* Ưu tiên hiển thị chữ cái đầu của full_name, nếu không có thì dùng username */}
                            {(profile.full_name || profile.username || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="user-intro">
                            <h2>{profile.full_name || profile.username}</h2>
                            <p className="role-badge">{profile.role || "Voter"}</p>
                        </div>
                    </div>

                    <div className="profile-content">
                        <div className="info-section">
                            <h3>Thông tin tài khoản</h3>
                            <div className="info-grid">
                                <div className="info-item">
                                    <label>Họ và tên</label>
                                    <p>{profile.full_name || "Chưa cập nhật"}</p>
                                </div>
                                <div className="info-item">
                                    <label>Email liên lạc</label>
                                    <p>{profile.email}</p>
                                </div>
                                <div className="info-item">
                                    <label>Tên đăng nhập</label>
                                    <p>{profile.username}</p>
                                </div>
                                <div className="info-item">
                                    <label>Số điện thoại</label>
                                    <p>{profile.phone || "Chưa cập nhật"}</p>
                                </div>
                                <div className="info-item">
                                    <label>Số CCCD/ID</label>
                                    <p>{profile.id_card || "Chưa cập nhật"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="action-section">
                            <button className="edit-btn">Chỉnh sửa hồ sơ</button>
                            <button className="logout-btn" onClick={logout}>Đăng xuất</button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Profile;