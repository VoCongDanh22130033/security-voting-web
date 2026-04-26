import React from "react";
import "../../assets/css/header-footer.css";

const Footer: React.FC = () => {
  return (
      <footer className="footer-container">
        <div className="footer-content">

          {/* Giới thiệu */}
          <div className="footer-column">
            <h3>Cổng Bầu Cử Điện Tử</h3>
            <p>
              Hệ thống bỏ phiếu trực tuyến hiện đại, đảm bảo tính
              minh bạch, công bằng và bảo mật trong mọi cuộc bầu cử.
            </p>
          </div>

          {/* Liên kết nhanh */}
          <div className="footer-column">
            <h3>Liên kết nhanh</h3>
            <ul>
              <li>Trang chủ</li>
              <li>Cuộc bầu cử</li>
              <li>Ứng viên</li>
              <li>Hướng dẫn tham gia</li>
            </ul>
          </div>

          {/* Chính sách */}
          <div className="footer-column">
            <h3>Chính sách</h3>
            <ul>
              <li>Chính sách bảo mật</li>
              <li>Điều khoản sử dụng</li>
              <li>Quy chế bầu cử</li>
            </ul>
          </div>

          {/* Liên hệ */}
          <div className="footer-column">
            <h3>Liên hệ</h3>
            <ul>
              <li>Email: support@voting.vn</li>
              <li>Hotline: 1900 1234</li>
              <li>Địa chỉ: TP. Hồ Chí Minh</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          © 2026 <span className="footer-highlight">E-Voting System</span>.
          Mọi quyền được bảo lưu.
        </div>
      </footer>
  );
};

export default Footer;