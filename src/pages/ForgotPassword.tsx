import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/css/login.css";

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState<string>("");
    const [isSent, setIsSent] = useState<boolean>(false);
    const navigate = useNavigate();

    const handleResetPassword = (e: React.FormEvent) => {
        e.preventDefault();
        // Giả lập gửi email thành công
        console.log("Gửi yêu cầu khôi phục cho email:", email);
        setIsSent(true);
    };

    return (
        <div className="login-container">
            <div className="login-box">
                {/* Phần bên trái: Form xử lý */}
                <div className="login-form-section">
                    <h2 className="form-title">Forgot Password?</h2>
                    <div className="title-underline"></div>

                    {!isSent ? (
                        <>
                            <form onSubmit={handleResetPassword}>
                                <div className="form-group">
                                    <label>EMAIL ADDRESS</label>
                                    <input
                                        type="email"
                                        placeholder="example@gmail.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-options">
                                    <span className="remember-me" onClick={() => navigate("/")} style={{ cursor: 'pointer' }}>
                                        Back to <b>Login</b>
                                    </span>
                                    <button type="submit" className="submit-btn">Send Link</button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="success-message" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '50px', marginBottom: '20px' }}>📧</div>
                            <h3 style={{ color: '#ff6b6b', marginBottom: '10px' }}>Email đã được gửi!</h3>
                            <p style={{ color: '#666', marginBottom: '30px' }}>
                                Vui lòng kiểm tra hộp thư đến (và cả hòm thư rác) để tiếp tục các bước đổi mật khẩu.
                            </p>
                            <button
                                className="submit-btn"
                                style={{ width: '100%' }}
                                onClick={() => navigate("/")}
                            >
                                Quay lại Đăng nhập
                            </button>
                        </div>
                    )}
                </div>

                {/* Phần bên phải: Hình ảnh */}
                <div className="login-image-section">
                    <div className="overlay-content">
                        <h1>Security First</h1>
                        <div className="content-underline"></div>
                        <p>Chúng tôi giúp bạn bảo vệ tài khoản và dữ liệu bầu cử của mình một cách an toàn nhất.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;