import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { userApi } from "../../api/userApi";
import Swal from "sweetalert2";
import "../profile/profile.css";

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [email, setEmail] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    // Bước 1: Gửi OTP về email
    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true);
        try {
            await userApi.forgotPassword(email);
            await Swal.fire("Đã gửi!", "Mã OTP 6 số đã được gửi về Gmail của bạn.", "success");
            setStep(2);
        } catch (error: any) {
            const msg = typeof error.response?.data === "string" ? error.response.data : error.response?.data?.message || "Email không tồn tại trong hệ thống!";
            Swal.fire("Lỗi", msg, "error");
        } finally {
            setLoading(false);
        }
    };

    // Bước 2: Xác thực OTP
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otpCode.length !== 6) {
            Swal.fire("Cảnh báo", "Mã OTP phải gồm đúng 6 chữ số!", "warning");
            return;
        }
        setLoading(true);
        try {
            await userApi.verifyOtp(email, otpCode);
            await Swal.fire({
                icon: "success",
                title: "Xác thực thành công!",
                text: "Mã OTP hợp lệ. Hãy đặt mật khẩu mới.",
                timer: 1800,
                showConfirmButton: false,
            });
            setStep(3);
        } catch (error: any) {
            const msg = typeof error.response?.data === "string" ? error.response.data : error.response?.data?.message || "Mã OTP sai hoặc đã hết hạn!";
            Swal.fire("Lỗi", msg, "error");
        } finally {
            setLoading(false);
        }
    };

    // Bước 3: Đặt mật khẩu mới
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            Swal.fire("Cảnh báo", "Mật khẩu xác nhận không trùng khớp!", "warning");
            return;
        }
        setLoading(true);
        try {
            await userApi.resetPasswordWithOtp({ email, otpCode, newPassword });
            await Swal.fire("Thành công!", "Mật khẩu mới đã được cập nhật. Hãy đăng nhập lại.", "success");
            navigate("/login");
        } catch (error: any) {
            const msg = typeof error.response?.data === "string" ? error.response.data : error.response?.data?.message || "Đã xảy ra lỗi, vui lòng thử lại!";
            Swal.fire("Thất bại", msg, "error");
        } finally {
            setLoading(false);
        }
    };

    const stepLabels = ["Nhập Email", "Xác thực OTP", "Mật khẩu mới"];

    return (
        <div className="profile-container" style={{ justifyContent: "center", alignItems: "center" }}>
            <div className="profile-card" style={{ width: "460px", padding: "32px", marginTop: "50px" }}>
                <h2 style={{ textAlign: "center", marginBottom: "8px", color: "#333" }}>
                    Quên <span style={{ color: "#ff6b6b" }}>Mật Khẩu</span>
                </h2>

                {/* Thanh tiến trình 3 bước */}
                <div style={{ display: "flex", alignItems: "center", margin: "20px 0 28px" }}>
                    {stepLabels.map((label, i) => {
                        const idx = i + 1;
                        const active = step === idx;
                        const done = step > idx;
                        return (
                            <React.Fragment key={idx}>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: "50%",
                                        background: done ? "#28a745" : active ? "#ff6b6b" : "#ddd",
                                        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                                        fontWeight: 700, fontSize: 14, transition: "background 0.3s"
                                    }}>
                                        {done ? "✓" : idx}
                                    </div>
                                    <span style={{ fontSize: 11, marginTop: 4, color: active ? "#ff6b6b" : done ? "#28a745" : "#999", fontWeight: active ? 600 : 400 }}>
                                        {label}
                                    </span>
                                </div>
                                {i < stepLabels.length - 1 && (
                                    <div style={{ flex: 2, height: 2, background: step > idx ? "#28a745" : "#ddd", margin: "0 4px", marginBottom: 18, transition: "background 0.3s" }} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* BƯỚC 1: Nhập email */}
                {step === 1 && (
                    <form onSubmit={handleRequestOtp} className="edit-form">
                        <p style={{ fontSize: 13, color: "#666", marginBottom: 16, textAlign: "center" }}>
                            Nhập email tài khoản để nhận mã xác thực OTP.
                        </p>
                        <div className="form-group">
                            <label>Địa chỉ Email</label>
                            <input
                                type="email"
                                required
                                placeholder="example@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <div className="action-section" style={{ marginTop: 20, gap: 10, display: "flex" }}>
                            <button type="button" className="logout-btn"
                                style={{ background: "#6c8ebf", color: "#fff", border: "none" }}
                                onClick={() => navigate("/login")} disabled={loading}>
                                Quay lại
                            </button>
                            <button type="submit" className="change-password-btn" style={{ flex: 1 }} disabled={loading}>
                                {loading ? "Đang gửi..." : "Gửi mã OTP"}
                            </button>
                        </div>
                    </form>
                )}

                {/* BƯỚC 2: Nhập OTP */}
                {step === 2 && (
                    <form onSubmit={handleVerifyOtp} className="edit-form">
                        <p style={{ fontSize: 13, color: "#666", marginBottom: 16, textAlign: "center" }}>
                            Mã OTP đã được gửi đến <strong>{email}</strong>.<br />
                            Mã có hiệu lực trong <strong>5 phút</strong>.
                        </p>
                        <div className="form-group">
                            <label>Mã OTP (6 chữ số)</label>
                            <input
                                type="text"
                                required
                                maxLength={6}
                                placeholder="Nhập mã 6 số"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                                disabled={loading}
                                style={{ letterSpacing: 6, fontSize: 20, textAlign: "center" }}
                                autoFocus
                            />
                        </div>
                        <div className="action-section" style={{ marginTop: 20, gap: 10, display: "flex" }}>
                            <button type="button" className="logout-btn"
                                style={{ background: "#6c8ebf", color: "#fff", border: "none" }}
                                onClick={() => { setStep(1); setOtpCode(""); }} disabled={loading}>
                                Quay lại
                            </button>
                            <button type="submit" className="change-password-btn" style={{ flex: 1 }} disabled={loading}>
                                {loading ? "Đang xác thực..." : "Xác nhận OTP"}
                            </button>
                        </div>
                        <p style={{ fontSize: 12, color: "#999", textAlign: "center", marginTop: 12 }}>
                            Không nhận được mã?{" "}
                            <span style={{ color: "#ff6b6b", cursor: "pointer", textDecoration: "underline" }}
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        await userApi.forgotPassword(email);
                                        Swal.fire("Đã gửi lại!", "Mã OTP mới đã được gửi.", "success");
                                        setOtpCode("");
                                    } catch {
                                        Swal.fire("Lỗi", "Không thể gửi lại OTP.", "error");
                                    } finally { setLoading(false); }
                                }}>
                                Gửi lại
                            </span>
                        </p>
                    </form>
                )}

                {/* BƯỚC 3: Nhập mật khẩu mới */}
                {step === 3 && (
                    <form onSubmit={handleResetPassword} className="edit-form">
                        <p style={{ fontSize: 13, color: "#666", marginBottom: 16, textAlign: "center" }}>
                            OTP hợp lệ. Hãy đặt mật khẩu mới cho tài khoản.
                        </p>
                        <div className="form-group">
                            <label>Mật khẩu mới</label>
                            <input
                                type="password"
                                required
                                placeholder="Nhập mật khẩu mới"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={loading}
                                autoFocus
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
                        <div className="action-section" style={{ marginTop: 20, gap: 10, display: "flex" }}>
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
