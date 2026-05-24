import React, { useState, useEffect, useRef } from "react";
import { useProfile } from "../context/ProfileContext";
import { useAuth } from "../context/AuthContext";
import { userApi } from "../api/userApi"; // Đảm bảo import đúng cách khai báo userApi của bạn
import Swal from "sweetalert2";
import "../assets/css/profile.css";

const Profile: React.FC = () => {
    const { logout } = useAuth();
    const { profile, loading, refreshProfile } = useProfile();

    const [activeTab, setActiveTab] = useState<"info" | "edit" | "password">("info");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dom Ref để kích hoạt click ẩn vào input file
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State quản lý thông tin chữ
    const [formData, setFormData] = useState({
        fullName: "",
        phone: "",
        citizenId: "",
        email: ""
    });

    // --- STATE QUẢN LÝ QUY TRÌNH HÌNH ẢNH ---
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>("");

    // Đồng bộ dữ liệu từ Context vào Form
    useEffect(() => {
        if (profile) {
            setFormData({
                fullName: profile.fullName || profile.user?.fullName || "",
                phone: profile.user?.phone || "",
                citizenId: profile.citizenId || "",
                email: profile.user?.email || ""
            });
            // SỬA TẠI ĐÂY: Ưu tiên lấy image_url từ object user lồng bên trong
            setPreviewUrl(profile.user?.imageUrl || profile.user?.image_url || profile.imageUrl || profile.image_url || "");
        }
    }, [profile, activeTab]);

    if (loading) return <div className="profile-container">Đang tải...</div>;
    if (!profile) return <div className="profile-container">Không có dữ liệu</div>;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    // --- HÀM XỬ LÝ KHI NGƯỜI DÙNG CHỌN FILE ẢNH MỚI ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Kiểm tra dung lượng (Ví dụ giới hạn < 2MB)
            if (file.size > 2 * 1024 * 1024) {
                Swal.fire("Lỗi", "Kích thước ảnh không được vượt quá 2MB", "error");
                return;
            }

            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file)); // Tạo URL tạm thời chạy cục bộ để xem trước ảnh
        }
    };

    // --- HÀM GỬI LƯU THAY ĐỔI LÊN SERVER ---
    const handleUpdateProfile = async () => {
        if (!formData.fullName.trim()) {
            Swal.fire("Cảnh báo", "Họ tên không được để trống", "warning");
            return;
        }

        const result = await Swal.fire({
            title: "Xác nhận thay đổi",
            text: "Bạn có chắc chắn muốn cập nhật hồ sơ cá nhân?",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Lưu",
            cancelButtonText: "Hủy",
        });

        if (result.isConfirmed) {
            setIsSubmitting(true);
            try {
                // Khởi tạo đối tượng FormData bắt buộc khi upload file dữ liệu hỗn hợp
                const data = new FormData();
                data.append("fullName", formData.fullName);
                data.append("citizenId", formData.citizenId);
                data.append("phone", formData.phone);

                // Gắn file ảnh đại diện vào đúng Key "avatar" mà DTO Backend yêu cầu
                if (selectedFile) {
                    data.append("avatar", selectedFile);
                }

                console.log(">>> [FE] Đang gửi FormData lên Backend...");

                // Gọi API chuyển tiếp qua Gateway
                await userApi.updateProfile(data as any);

                await Swal.fire("Thành công!", "Thông tin của bạn đã được cập nhật.", "success");

                // Làm mới ProfileContext để tự động đồng bộ lại Avatar/Tên mới lên thanh Header điều hướng
                await refreshProfile();

                setActiveTab("info");
                setSelectedFile(null); // Giải phóng state file cũ
            } catch (error: any) {
                console.error(">>> [FE] Gặp lỗi khi lưu profile:", error);
                Swal.fire("Thất bại", error.response?.data?.message || "Có lỗi xảy ra", "error");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <div className="profile-container">
            <main className="profile-main">
                <div className="profile-card">

                    {/* HEADER HIỂN THỊ TRỰC TIẾP AVATAR TỪ CLOUDINARY */}
                    <div className="profile-header">
                        <div className="avatar-circle">
                            {/* SỬA TẠI ĐÂY: Kiểm tra cả user.imageUrl */}
                            {(profile.user?.imageUrl || profile.user?.image_url || profile.imageUrl || profile.image_url) ? (
                                <img
                                    src={profile.user?.imageUrl || profile.user?.image_url || profile.imageUrl || profile.image_url}
                                    alt="Avatar"
                                    className="avatar-img"
                                />
                            ) : (
                                <span>
            {(profile.fullName || "U").charAt(0).toUpperCase()}
        </span>
                            )}
                        </div>

                        <div>
                            <h2>{profile.fullName}</h2>
                            {/*<p className="role-badge">*/}
                            {/*    {profile.user?.roles?.[0]?.name?.replace("ROLE_", "")}*/}
                            {/*</p>*/}
                        </div>
                    </div>

                    {/* TABS CONTROL */}
                    <div className="profile-tabs">
                        <button className={activeTab === "info" ? "tab active" : "tab"} onClick={() => setActiveTab("info")}>Thông tin</button>
                        <button className={activeTab === "edit" ? "tab active" : "tab"} onClick={() => setActiveTab("edit")}>Chỉnh sửa</button>
                        <button className={activeTab === "password" ? "tab active" : "tab"} onClick={() => setActiveTab("password")}>Đổi mật khẩu</button>
                    </div>

                    <div className="profile-content">

                        {/* TAB HIỂN THỊ THÔNG TIN */}
                        {activeTab === "info" && (
                            <div className="info-section">
                                <h3>Thông tin tài khoản</h3>
                                <div className="info-grid">
                                    <div className="info-item"><label>Họ và tên</label><p>{profile.fullName}</p></div>
                                    <div className="info-item"><label>Email</label><p>{profile.user?.email}</p></div>
                                    <div className="info-item"><label>SĐT</label><p>{profile.user?.phone}</p></div>
                                </div>
                                <div className="action-section">
                                    <button onClick={logout} className="logout-btn">Đăng xuất</button>
                                </div>
                            </div>
                        )}

                        {/* TAB CHỈNH SỬA (Đã bổ sung khu vực chọn ảnh đại diện mới) */}
                        {activeTab === "edit" && (
                            <div className="edit-section">
                                <h3>Chỉnh sửa hồ sơ</h3>

                                <div className="edit-form">

                                    {/* KHU VỰC THAO TÁC CHỌN ẢNH ĐẠI DIỆN MỚI */}
                                    <div className="avatar-upload-container">
                                        <div
                                            className="avatar-edit-preview"
                                            onClick={() => fileInputRef.current?.click()}
                                            title="Click để thay đổi ảnh"
                                        >
                                            {previewUrl ? (
                                                <img src={previewUrl} alt="Preview" className="avatar-img" />
                                            ) : (
                                                <span className="avatar-text-placeholder">
                                                    {(formData.fullName || "U").charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                            <div className="avatar-overlay">
                                                <span>Thay đổi ảnh</span>
                                            </div>
                                        </div>

                                        {/* Input File ẩn đi để custom giao diện đẹp hơn */}
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            style={{ display: "none" }}
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    {/* CÁC TRƯỜNG NHẬP LIỆU TEXT */}
                                    <div className="form-group">
                                        <label>Email</label>
                                        <input
                                            value={formData.email || ""}
                                            disabled
                                            className="readonly-input"
                                            style={{ backgroundColor: "#e9ecef", cursor: "not-allowed" }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Họ và tên</label>
                                        <input name="fullName" value={formData.fullName} onChange={handleChange} disabled={isSubmitting} />
                                    </div>

                                    <div className="form-group">
                                        <label>Số điện thoại</label>
                                        <input name="phone" value={formData.phone} onChange={handleChange} disabled={isSubmitting} />
                                    </div>

                                    <div className="action-section">
                                        <button className="change-password-btn" onClick={handleUpdateProfile} disabled={isSubmitting}>
                                            {isSubmitting ? "Đang xử lý..." : "Lưu thay đổi"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB ĐỔI MẬT KHẨU */}
                        {activeTab === "password" && (
                            <div className="password-section">
                                <h3>Đổi mật khẩu</h3>
                                <div className="password-form">
                                    <div className="form-group"><label>Mật khẩu hiện tại</label><input type="password" /></div>
                                    <div className="form-group"><label>Mật khẩu mới</label><input type="password" /></div>
                                    <div className="form-group"><label>Xác nhận</label><input type="password" /></div>
                                    <div className="action-section"><button className="change-password-btn">Cập nhật mật khẩu</button></div>
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