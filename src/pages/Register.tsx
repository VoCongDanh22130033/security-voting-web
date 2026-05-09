import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/css/login.css"; // Tái sử dụng CSS chung của Login
import axios from "axios";
const Register: React.FC = () => {
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            alert("Mật khẩu xác nhận không khớp!");
            return;
        }

        try {
            const response = await axios.post("http://localhost:8080/api/auth/register", {
                password: formData.password,
                email: formData.email,
                fullName: formData.fullName
            });

            if (response.status === 200) {
                alert("Đăng ký thành công! Đang chuyển hướng đến trang Đăng nhập...");
                navigate("/"); // Quay lại trang Login
            }
        } catch (error: any) {
            alert(error.response?.data || "Đăng ký thất bại, vui lòng thử lại!");
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                {/* Phần bên trái: Form Đăng ký */}
                <div className="login-form-section">
                    <h2 className="form-title">Create Account</h2>
                    <div className="title-underline"></div>

                    <form onSubmit={handleRegister}>
                        <div className="form-group">
                            <label>FULL NAME</label>
                            <input
                                type="text"
                                name="fullName"
                                placeholder="Enter your full name"
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>EMAIL</label>
                            <input
                                type="email"
                                name="email"
                                placeholder="Enter your email"
                                onChange={handleChange}
                                required
                            />
                        </div>



                        <div className="form-group">
                            <label>PASSWORD</label>
                            <input
                                type="password"
                                name="password"
                                placeholder="Create a password"
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>CONFIRM PASSWORD</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                placeholder="Repeat your password"
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-options">
                            <span className="remember-me" onClick={() => navigate("/")} style={{cursor: 'pointer'}}>
                                Already have an account? <b>Login</b>
                            </span>
                            <button type="submit" className="submit-btn">Register</button>
                        </div>
                    </form>
                </div>

                {/* Phần bên phải: Ảnh background (giống Login) */}
                <div className="login-image-section">
                    <div className="overlay-content">
                        <h1>Join the Voice</h1>
                        <div className="content-underline"></div>
                        <p>Đăng ký ngay để thực hiện quyền công dân của bạn trong môi trường số an toàn.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;