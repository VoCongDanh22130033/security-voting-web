import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../../context/ProfileContext";
import { useAuth } from "../../context/AuthContext";
import { userApi } from "../../api/userApi";
import Swal from "sweetalert2";
import "./profile.css";

const Profile: React.FC = () => {
    const navigate = useNavigate();
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
                phone: profile.phone || profile.user?.phone || "",
                citizenId: profile.citizenId || "",
                email: profile.email || profile.user?.email || ""
            });
            setPreviewUrl(profile.image_url || profile.user?.imageUrl || profile.user?.image_url || profile.imageUrl || "");
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

                    <div className="profile-header">
                        <div className="avatar-circle">
                            {(profile.image_url || profile.user?.imageUrl || profile.user?.image_url || profile.imageUrl) ? (
                                <img
                                    src={profile.image_url || profile.user?.imageUrl || profile.user?.image_url || profile.imageUrl}
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

                        </div>
                    </div>

                    <div className="profile-tabs">
                        <button className={activeTab === "info" ? "tab active" : "tab"} onClick={() => setActiveTab("info")}>Thông tin</button>
                        <button className={activeTab === "edit" ? "tab active" : "tab"} onClick={() => setActiveTab("edit")}>Chỉnh sửa</button>
                        <button className={activeTab === "password" ? "tab active" : "tab"} onClick={() => setActiveTab("password")}>Đổi mật khẩu</button>
                    </div>

                    <div className="profile-content">


                        {activeTab === "info" && (
                            <div className="info-section">
                                <h3>Thông tin tài khoản</h3>
                                <div className="info-grid">
                                    <div className="info-item"><label>Họ và tên</label><p>{profile.fullName}</p></div>
                                    <div className="info-item"><label>Email</label><p>{profile.email || profile.user?.email}</p></div>
                                    <div className="info-item"><label>SĐT</label><p>{profile.phone || profile.user?.phone}</p></div>
                                    {profile.role && (
                                        <div className="info-item">
                                            <label>Vai trò</label>
                                            <p>
                                                {profile.role === "ROLE_ADMIN" ? "Quản trị viên"
                                                    : profile.role === "ROLE_ORGANIZER" ? "Người Chủ Trì"
                                                    : "Cử tri"}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="action-section">
                                    <button className="back-btn" onClick={() => navigate(-1)}>&#8592; Quay lại</button>
                                    <button onClick={logout} className="logout-btn">Đăng xuất</button>
                                </div>
                            </div>
                        )}


                        {activeTab === "edit" && (
                            <div className="edit-section">
                                <h3>Chỉnh sửa hồ sơ</h3>

                                <div className="edit-form">

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

                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            style={{ display: "none" }}
                                            disabled={isSubmitting}
                                        />
                                    </div>


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

                        {activeTab === "password" && (
                            <div className="password-section">


                                <div className="password-form">
                                    <p style={{ fontSize: '13px', color: '#666', textAlign: 'center', marginBottom: '15px' }}>
                                    </p>


                                    <div className="action-section" style={{ marginTop: '0', marginBottom: '20px' }}>
                                        <button
                                            type="button"
                                            className="logout-btn"
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px',  }}
                                            onClick={async () => {
                                                try {
                                                    const targetEmail = profile.user?.email || profile.email;
                                                    if (!targetEmail) {
                                                        Swal.fire("Lỗi", "Không tìm thấy email tài khoản của bạn!", "error");
                                                        return;
                                                    }

                                                    // Hiển thị loading thầm lặng trong lúc đợi gửi email
                                                    Swal.fire({
                                                        title: "Đang gửi mã OTP...",
                                                        text: "Vui lòng đợi trong giây lát",
                                                        allowOutsideClick: false,
                                                        didOpen: () => {
                                                            Swal.showLoading();
                                                        }
                                                    });

                                                    console.log(">>> [FE] Yêu cầu OTP cho email:", targetEmail);
                                                    await userApi.forgotPassword(targetEmail);

                                                    // Thông báo nổi thành công
                                                    Swal.fire("Đã gửi!", "Mã OTP đã được gửi thành công vào Gmail của bạn.", "success");
                                                } catch (err: any) {
                                                    console.error(err);
                                                    Swal.fire("Thất bại", err.response?.data || "Không thể gửi OTP, vui lòng thử lại!", "error");
                                                }
                                            }}
                                        >
                                            Bấm vào đây để nhận mã OTP qua Email
                                        </button>
                                    </div>


                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const targetEmail = profile.user?.email || profile.email;
                                        const otpInput = (e.currentTarget.elements.namedItem("otpCode") as HTMLInputElement).value;
                                        const newPassInput = (e.currentTarget.elements.namedItem("newPassword") as HTMLInputElement).value;
                                        const confirmPassInput = (e.currentTarget.elements.namedItem("confirmPassword") as HTMLInputElement).value;

                                        if (newPassInput !== confirmPassInput) {
                                            Swal.fire("Cảnh báo", "Mật khẩu xác nhận không trùng khớp!", "warning");
                                            return;
                                        }

                                        // Hiển thị loading lúc xử lý lưu pass mới
                                        Swal.fire({
                                            title: "Đang xử lý...",
                                            text: "Vui lòng đợi hệ thống cập nhật",
                                            allowOutsideClick: false,
                                            didOpen: () => {
                                                Swal.showLoading();
                                            }
                                        });

                                        try {
                                            await userApi.resetPasswordWithOtp({
                                                email: targetEmail,
                                                otpCode: otpInput,
                                                newPassword: newPassInput
                                            });

                                            await Swal.fire({
                                                title: "Đổi mật khẩu thành công!",
                                                text: "Vui lòng đăng nhập lại để tiếp tục.",
                                                icon: "success",
                                                timer: 2500,
                                                timerProgressBar: true,
                                                showConfirmButton: false,
                                            });
                                            logout();
                                        } catch (err: any) {
                                            console.error(err);
                                            Swal.fire("Thất bại", err.response?.data || "Mã OTP sai hoặc đã hết hạn sử dụng!", "error");
                                        }
                                    }} className="edit-form">
                                        <div className="form-group">
                                            <label>Nhập mã OTP (6 số)</label>
                                            <input name="otpCode" type="text" required maxLength={6} placeholder="Nhập mã xác nhận từ email" />
                                        </div>

                                        <div className="form-group">
                                            <label>Mật khẩu mới</label>
                                            <input name="newPassword" type="password" required placeholder="Nhập mật khẩu mới" />
                                        </div>

                                        <div className="form-group">
                                            <label>Xác nhận mật khẩu mới</label>
                                            <input name="confirmPassword" type="password" required placeholder="Nhập lại mật khẩu mới" />
                                        </div>

                                        <div className="action-section" style={{ marginTop: '25px' }}>
                                            <button type="submit" className="change-password-btn" style={{ width: '100%', padding: '12px' }}>
                                                Xác nhận thay đổi mật khẩu
                                            </button>
                                        </div>
                                    </form>
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