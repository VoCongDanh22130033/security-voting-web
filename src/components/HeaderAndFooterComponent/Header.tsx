import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../assets/css/header-footer.css";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click bên ngoài
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
        <div className="nav-logo" onClick={() => navigate("/home")} style={{ cursor: 'pointer' }}>
          SecuVote
        </div>

        <ul className="nav-links">
          <li onClick={() => navigate("/home")}>Trang chủ</li>
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

                {/* Khung Dropdown sử dụng class trong header-footer.css */}
                {showDropdown && (
                    <div className="nav-dropdown">
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