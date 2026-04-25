import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../assets/css/login.css";

const Login: React.FC = () => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [localError, setLocalError] = useState<string>("");
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    // Validate input
    if (!username.trim() || !password.trim()) {
      setLocalError("Vui lòng nhập username và password");
      return;
    }

    try {
      await login(username, password);
      // Đăng nhập thành công - navigate sẽ được gọi tự động
      navigate("/home");
    } catch (err: any) {
      setLocalError(err?.message || "Đăng nhập thất bại. Vui lòng kiểm tra thông tin đăng nhập.");
      console.error("Login error:", err);
    }
  };
  return (

      <div className="login-container">
        <div className="login-box">
          <div className="login-form-section">
            <h2 className="form-title">Login Now</h2>
            <div className="title-underline"></div>

            {/* Hiển thị lỗi nếu có */}
            {(localError || error) && (
              <div className="error-message" style={{
                color: '#dc3545',
                backgroundColor: '#f8d7da',
                border: '1px solid #f5c6cb',
                borderRadius: '4px',
                padding: '12px',
                marginBottom: '15px',
                textAlign: 'center'
              }}>
                {localError || error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>USERNAME</label>
                <input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label>PASSWORD</label>
                <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                />
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input type="checkbox" disabled={isLoading}/> Remember Me
                </label>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Submit"}
                </button>
              </div>

            </form>
            <div className="login-footer">
                    <span onClick={() => !isLoading && navigate("/forgot-password")} style={{cursor: isLoading ? 'default' : 'pointer'}}>
                        Forgot password?
                    </span>
              <p>
                Don't have an account? <b onClick={() => !isLoading && navigate("/register")}
                                          style={{cursor: isLoading ? 'default' : 'pointer'}}>Register</b>
              </p>
            </div>
          </div>

          <div className="login-image-section">
            <div className="overlay-content">
              <h1>This is Heaven</h1>
              <div className="content-underline"></div>
              <p>Hệ thống bỏ phiếu trực tuyến an toàn và minh bạch.</p>
            </div>
          </div>
        </div>
      </div>
  );
};

export default Login;