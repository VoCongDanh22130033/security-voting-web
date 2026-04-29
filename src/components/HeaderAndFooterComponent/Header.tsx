import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../assets/css/header-footer.css";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Hàm xử lý điều hướng thông minh dựa trên Role ID
  const navigateByRole = () => {
    if (!isAuthenticated || !user) {
      navigate("/");
      return;
    }

    // Logic điều hướng theo yêu cầu của Danh
    // Lưu ý: Kiểm tra user.roles hoặc giả định bạn đã trả về roleId từ Backend/AuthContext
    // Ở đây mình ưu tiên kiểm tra roleId nếu có, hoặc check mảng roles
    const roles = user.roles || [];

    if (roles.includes("ROLE_ADMIN")) {
      navigate("/admin"); // ID = 1
    } else if (roles.includes("ROLE_ORGANIZER")) {
      navigate("/host-dashboard"); // ID = 2
    } else {
      navigate("/home"); // ID = 3 hoặc mặc định
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowDropdown(false);
    logout();
    navigate("/");
  };

  return (
      <nav className="navbar">
        {/* Click vào Logo sẽ điều hướng theo Role */}
        <div className="nav-logo" onClick={navigateByRole} style={{ cursor: 'pointer' }}>
          SecuVote
        </div>

        <ul className="nav-links">
          {/* Trang chủ cũng điều hướng theo Role để tránh Voter vào nhầm Dashboard */}
          <li onClick={navigateByRole}>Trang chủ</li>
          <li onClick={() => navigate("/elections")}>Cuộc bầu cử</li>
          <li onClick={() => navigate("/results")}>Kết quả</li>
        </ul>

        <div className="nav-auth">
          {isAuthenticated && user ? (
              <div className="user-menu-container" ref={dropdownRef}>
                <div
                    className="user-profile-trigger"
                    onClick={() => setShowDropdown(!showDropdown)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                >
                  <div className="avatar-small">
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                  <span className="user-name">Chào, {user.username} ▾</span>
                </div>

                {showDropdown && (
                    <div className="nav-dropdown">
                      {/* Mục quản lý nhanh tùy theo Role */}
                      {user.roles?.includes("ROLE_ORGANIZER") && (
                          <div className="dropdown-item" onClick={() => { navigate("/host-dashboard"); setShowDropdown(false); }}>
                            📊 Quản lý bầu cử
                          </div>
                      )}
                      {user.roles?.includes("ROLE_ADMIN") && (
                          <div className="dropdown-item" onClick={() => { navigate("/admin"); setShowDropdown(false); }}>
                            ⚙️ Quản trị hệ thống
                          </div>
                      )}

                      <div className="dropdown-item" onClick={() => { navigate("/profile"); setShowDropdown(false); }}>
                        👤 Thông tin cá nhân
                      </div>
                      <div className="dropdown-divider"></div>
                      <div className="dropdown-item logout" onClick={handleLogout}>
                        🚪 Đăng xuất
                      </div>
                    </div>
                )}
              </div>
          ) : (
              <div className="auth-buttons">
                <button className="btn-login" onClick={() => navigate("/")}>Đăng nhập</button>
                <button className="btn-register" onClick={() => navigate("/register")}>Đăng ký</button>
              </div>
          )}
        </div>
      </nav>
  );
};

export default Header;