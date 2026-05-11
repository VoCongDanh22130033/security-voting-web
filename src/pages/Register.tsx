import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/css/login.css";
import axios from "axios";

const Register: React.FC = () => {
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    // Các state quản lý lỗi hiển thị tại chỗ
    const [emailError, setEmailError] = useState<string | null>(null);
    const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // Xóa lỗi khi người dùng bắt đầu nhập lại
        if (e.target.name === "email") setEmailError(null);
        if (e.target.name === "confirmPassword" || e.target.name === "password") {
            setConfirmPasswordError(null);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        // Reset tất cả lỗi trước khi kiểm tra lại
        setEmailError(null);
        setPasswordError(null);
        setConfirmPasswordError(null);
        setGeneralError(null);

        // 2. Validate mật khẩu và gán vào passwordError
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(formData.password)) {
            setPasswordError("Mật khẩu phải tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt!");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setConfirmPasswordError("Mật khẩu xác nhận không khớp!");
            return;
        }

        try {
            await axios.post("http://localhost:8080/auth/register", {
                password: formData.password,
                email: formData.email,
                fullName: formData.fullName
            });
            navigate("/verifi-email");
        } catch (error: any) {
            const errorData = error.response?.data?.message || error.response?.data || "";
            const msg = typeof errorData === 'string' ? errorData : JSON.stringify(errorData);

            if (msg.toLowerCase().includes("email")) {
                setEmailError("Email này đã được sử dụng. Vui lòng chọn email khác.");
            } else {
                setGeneralError(msg || "Đăng ký thất bại!");
            }
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <div className="login-form-section">
                    <h2 className="form-title">Tạo Tài Khoản</h2>
                    <div className="title-underline"></div>

                    {generalError && (
                        <div style={{ color: "#ff4757", background: "#fff2f2", padding: "10px", borderRadius: "5px", marginBottom: "10px", fontSize: "13px" }}>
                             {generalError}
                        </div>
                    )}

                    <form onSubmit={handleRegister}>
                        <div className="form-group">
                            <label>HỌ VÀ TÊN</label>
                            <input type="text" name="fullName" placeholder="Nhập họ và tên" onChange={handleChange} required />
                        </div>

                        <div className="form-group">
                            <label>EMAIL</label>
                            <input
                                type="email"
                                name="email"
                                placeholder="Nhập email"
                                onChange={handleChange}
                                style={emailError ? { borderColor: "#ff4757" } : {}}
                                required
                            />
                            {emailError && <span style={{ color: "#ff4757", fontSize: "12px", marginTop: "4px" }}>  {emailError}</span>}
                        </div>

                        <div className="form-group">
                            <label>MẬT KHẨU</label>
                            <input
                                type="password"
                                name="password"
                                placeholder="Tạo mật khẩu"
                                value={formData.password}
                                onChange={(e) => {
                                    handleChange(e);
                                    if (passwordError) setPasswordError(null); // Xóa chữ đỏ khi người dùng gõ lại
                                }}
                                // Đổi màu viền nếu có lỗi
                                style={passwordError ? { borderColor: "#ff4757" } : {}}
                                required
                            />
                            {/* HIỂN THỊ LỖI DƯỚI PASSWORD */}
                            {passwordError && (
                                <span style={{
                                    color: "#ff4757",
                                    fontSize: "12px",
                                    marginTop: "4px",
                                    fontWeight: "500",
                                    display: "block"
                                }}>
              {passwordError}
        </span>
                            )}
                        </div>

                        <div className="form-group">
                            <label>XÁC NHẬN MẬT KHẨU</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                placeholder="Nhập lại mật khẩu"
                                onChange={handleChange}
                                style={confirmPasswordError ? { borderColor: "#ff4757" } : {}}
                                required
                            />
                            {/* HIỂN THỊ LỖI DƯỚI CONFIRM PASSWORD */}
                            {confirmPasswordError && (
                                <span style={{ color: "#ff4757", fontSize: "12px", marginTop: "4px", fontWeight: "500" }}>
                                     {confirmPasswordError}
                                </span>
                            )}
                        </div>

                        <div className="form-options">
                            <span className="remember-me" onClick={() => navigate("/")} style={{cursor: 'pointer'}}>
                                Đã có tài khoản? <b>Đăng nhập</b>
                            </span>
                            <button type="submit" className="submit-btn">Đăng Ký</button>
                        </div>
                    </form>
                </div>

                <div className="login-image-section">
                    <div className="overlay-content">
                        <h1>Tham Gia Bình Chọn</h1>
                        <div className="content-underline"></div>
                        <p>Đăng ký ngay để thực hiện quyền công dân của bạn trong môi trường số an toàn.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;