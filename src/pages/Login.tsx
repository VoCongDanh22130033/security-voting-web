import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../assets/css/login.css";

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [localError, setLocalError] = useState<string>("");
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!email.trim() || !password.trim()) {
      setLocalError("Vui lòng nhập email và mật khẩu");
      return;
    }

    try {
      await login(email, password);
      navigate("/home");
    } catch (err: any) {
      setLocalError(err?.message || "Thông tin đăng nhập không chính xác");
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