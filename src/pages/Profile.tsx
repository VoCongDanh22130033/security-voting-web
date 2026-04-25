import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import authService from "../services/authService";
import "../assets/css/profile.css";

const Profile: React.FC = () => {
    const { logout } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // Gọi API lấy profile từ voter-service qua Gateway
                const data = await authService.getProfile();
                setProfile(data);
            } catch (error) {
                console.error("Lỗi khi tải profile:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    if (loading) return <div className="loading">Đang tải thông tin...</div>;
    if (!profile) return <div className="error">Không tìm thấy thông tin người dùng.</div>;

    return (
        <div className="profile-container">
            <main className="profile-main">
                <div className="profile-card">
                    <div className="profile-header">
                        <div className="avatar-circle">
                            {/* Dùng username để hiển thị Avatar */}
                            {profile.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-intro">
                            {/* Hiển thị Username */}
                            <h2>{profile.username}</h2>
                            {/* Hiển thị Role thực tế từ DB */}
                            <p className="role-badge">{profile.role || "Voter"}</p>
                        </div>
                    </div>

                    <div className="profile-content">
                        <div className="info-section">
                            <h3>Thông tin tài khoản</h3>
                            <div className="info-grid">
                                <div className="info-item">
                                    <label>Email liên lạc</label>
                                    <p>{profile.email}</p>
                                </div>
                                <div className="info-item">
                                    <label>Tên đăng nhập</label>
                                    <p>{profile.username}</p>
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