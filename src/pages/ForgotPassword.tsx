import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { userApi } from "../api/userApi";
import Swal from "sweetalert2";
import "../assets/css/profile.css"; // Dùng chung form layout sạch sẽ của bạn

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<1 | 2>(1); // Bước 1: Xin mã, Bước 2: Nhập mã đổi pass
    const [email, setEmail] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    // Xử lý gửi yêu cầu tạo OTP
    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setLoading(true);
        try {
            await userApi.forgotPassword(email);
            await Swal.fire("Đã gửi!", "Mã OTP xác thực gồm 6 số đã gửi về Gmail của bạn.", "success");
            setStep(2); // Chuyển sang form nhập OTP
        } catch (error: any) {
            Swal.fire("Lỗi", error.response?.data || "Email không tồn tại trong hệ thống!", "error");
        } finally {
            setLoading(false);
        }
    };

    // Xử lý xác nhận mã OTP để thay đổi mật khẩu
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            Swal.fire("Cảnh báo", "Mật khẩu xác nhận không trùng khớp!", "warning");
            return;
        }

        setLoading(true);
        try {
            await userApi.resetPasswordWithOtp({
                email,
                otpCode,
                newPassword
            });
            await Swal.fire("Thành công!", "Mật khẩu mới đã được cập nhật. Hãy đăng nhập lại.", "success");
            navigate("/login"); // Trả về trang đăng nhập
        } catch (error: any) {
            Swal.fire("Thất bại", error.response?.data || "Mã OTP sai hoặc đã hết hạn!", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="profile-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <div className="profile-card" style={{ width: '450px', padding: '30px', marginTop: '50px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>
                    Quên <span style={{ color: '#ff6b6b' }}>Mật Khẩu</span>
                </h2>

                {step === 1 ? (
                    /* BIỂU MẪU BƯỚC 1: NHẬP EMAIL */
                    <form onSubmit={handleRequestOtp} className="edit-form">
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px', textAlign: 'center' }}>
                            Vui lòng nhập Email tài khoản cử tri của bạn để nhận mã xác thực OTP.
                        </p>
                        <div className="form-group">
                            <label>Địa chỉ Email</label>
                            <input
                                type="email"
                                required
                                placeholder="example@st.hcmuaf.edu.vn"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <div className="action-section" style={{ marginTop: '20px' }}>
                            <button type="submit" className="change-password-btn" style={{ width: '100%' }} disabled={loading}>
                                {loading ? "Đang xử lý..." : "Gửi mã OTP về Email"}
                            </button>
                        </div>
                    </form>
                ) : (
                    /* BIỂU MẪU BƯỚC 2: NHẬP MÃ OTP VÀ PASS MỚI */
                    <form onSubmit={handleResetPassword} className="edit-form">
                        <div className="form-group">
                            <label>Mã xác thực OTP (6 chữ số)</label>
                            <input
                                type="text"
                                required
                                maxLength={6}
                                placeholder="Nhập mã 6 số trong email"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <div className="form-group">
                            <label>Mật khẩu mới</label>
                            <input
                                type="password"
                                required
                                placeholder="Nhập mật khẩu mới"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <div className="form-group">
                            <label>Xác nhận mật khẩu mới</label>
                            <input
                                type="password"
                                required
                                placeholder="Nhập lại mật khẩu mới"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <div className="action-section" style={{ marginTop: '20px', gap: '10px', display: 'flex' }}>
                            <button type="button" className="logout-btn" style={{ background: '#aaa' }} onClick={() => setStep(1)} disabled={loading}>
                                Quay lại
                            </button>
                            <button type="submit" className="change-password-btn" style={{ flex: 1 }} disabled={loading}>
                                {loading ? "Đang lưu..." : "Xác nhận đổi mật khẩu"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;