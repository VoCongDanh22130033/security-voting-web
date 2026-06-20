import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./header-footer.css";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navigateByRole = () => {
    if (!isAuthenticated || !user) {
      navigate("/");
      return;
    }
    const roles = user.roles || [];
    if (roles.includes("ROLE_ADMIN")) {
      navigate("/admin");
    } else if (roles.includes("ROLE_ORGANIZER")) {
      navigate("/host-dashboard");
    } else {
      navigate("/home");
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
        <div className="nav-logo" onClick={navigateByRole} style={{ cursor: 'pointer' }}>
          SecuVote
        </div>

        <ul className="nav-links">
          <li onClick={navigateByRole}>Trang chủ</li>

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
                    <img
                        src={user.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=ff6b6b&color=fff`}
                        alt="Avatar"
                        className="header-avatar-img"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=ff6b6b&color=fff`;
                        }}
                    />
                  </div>
                  <span className="user-name">Chào, {user.fullName} ▾</span>
                </div>

                {showDropdown && (
                    <div className="nav-dropdown">
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
                <button className="btn-login" onClick={() => navigate("/login")}>Đăng nhập</button>
              </div>
          )}
        </div>
      </nav>
  );
};

export default Header;
