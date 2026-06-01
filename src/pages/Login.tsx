import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../assets/css/login.css";
import userApi from "../api/userApi.ts";

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [localError, setLocalError] = useState<string>("");
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    try {
      // Thay vì gọi qua hàm login của Context, gọi trực tiếp API để lấy trọn vẹn lỗi từ Server
      const savedUser = await userApi.login({ email, password });

      // Lưu vào localStorage thủ công giống như Context đang làm[cite: 9]
      localStorage.setItem("user", JSON.stringify(savedUser));

      // Điều hướng phân quyền như cũ[cite: 9]
      if (savedUser.roles && savedUser.roles.includes("ROLE_ORGANIZER")) {
        navigate("/host-dashboard");
      } else if (savedUser.roles && savedUser.roles.includes("ROLE_ADMIN")) {
        navigate("/admin");
      } else {
        navigate("/home");
      }
    } catch (err: any) {
      // Tại đây, bạn chắc chắn sẽ lấy được chuỗi "Tài khoản của bạn đã bị khóa..." từ Backend
      const errorMessage = err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : "") || "Email hoặc mật khẩu không chính xác";
      setLocalError(errorMessage);
    }
  };
  return (
      <div className="login-container">
        <div className="login-box">
          <div className="login-form-section">
            <h2 className="form-title">Đăng nhập hệ thống</h2>
            <div className="title-underline"></div>

            {(localError || error) && (
                <div
                    className="error-message"
                    style={{
                      color: "#dc3545",
                      backgroundColor: "#f8d7da",
                      border: "1px solid #f5c6cb",
                      borderRadius: "4px",
                      padding: "12px",
                      marginBottom: "15px",
                      textAlign: "center",
                    }}
                >
                  {localError || error}
                </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email</label>
                <input
                    type="text"
                    placeholder="Nhập địa chỉ email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label>Mật khẩu</label>
                <input
                    type="password"
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                />
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input type="checkbox" disabled={isLoading} /> Ghi nhớ đăng nhập
                </label>
                <button
                    type="submit"
                    className="submit-btn"
                    disabled={isLoading}
                >
                  {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
                </button>
              </div>
            </form>

            <div className="login-footer">
            <span
                onClick={() => !isLoading && navigate("/forgot-password")}
                style={{ cursor: isLoading ? "default" : "pointer" }}
            >
              Quên mật khẩu?
            </span>
              <p>
                Chưa có tài khoản?{" "}
                <b
                    onClick={() => !isLoading && navigate("/register")}
                    style={{ cursor: isLoading ? "default" : "pointer" }}
                >
                  Đăng ký ngay
                </b>
              </p>
            </div>
          </div>

          <div className="login-image-section">
            <div className="overlay-content">
              <h1>Cổng Bầu Cử Điện Tử</h1>
              <div className="content-underline"></div>
              <p>
                Hệ thống bỏ phiếu trực tuyến hiện đại, bảo mật cao, đảm bảo tính
                minh bạch, công bằng và chính xác trong mọi cuộc bầu cử.
              </p>
            </div>
          </div>
        </div>
      </div>
  );
};

export default Login;