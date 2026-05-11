import React, { useState } from "react";
import { userApi } from "../api/userApi";
import Swal from "sweetalert2";
import "../assets/css/verify.css";

const VerifyEmail = () => {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await userApi.verifyEmail(token);
      await Swal.fire("Thành công", "Tài khoản đã được kích hoạt!", "success");
      window.location.href = "/login"; // Về trang chủ/login
    } catch (err: any) {
      Swal.fire("Lỗi", err.response?.data?.message || "Mã xác thực sai", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="verify-container">
        <div className="verify-box">
          <h2>Xác thực Email</h2>
          <p>Vui lòng nhập <b>mã OTP 6 số</b> đã được gửi vào email của bạn.</p>
          <form onSubmit={handleVerify}>
            <input
                className="otp-input"
                type="text"
                value={token}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val.length <= 6) setToken(val);
                }}
                placeholder="000000"
                style={{ letterSpacing: '8px', fontSize: '24px', fontWeight: 'bold' }}
            />
            <button className="verify-btn" type="submit" disabled={loading || token.length < 6}>
              {loading ? "Đang xác thực..." : "Xác nhận kích hoạt"}
            </button>
          </form>
        </div>
      </div>
  );
};
export default VerifyEmail;