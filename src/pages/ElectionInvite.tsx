import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import electionApi from "../api/electionApi";
import "../assets/css/login.css";

const ElectionInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [citizenId, setCitizenId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      Swal.fire("Không hợp lệ", "Link mời không có mã xác thực.", "error");
      return;
    }

    setIsLoading(true);
    try {
      const response = await electionApi.verifyInvite({ token, citizenId });
      const data = response.data;
      sessionStorage.setItem("electionInviteToken", data.inviteToken);
      sessionStorage.setItem("electionInviteEmail", data.email);
      sessionStorage.setItem("electionInviteRoundId", data.roundId ? String(data.roundId) : "");
      navigate(`/candidates?electionId=${data.electionId}&inviteToken=${data.inviteToken}&roundId=${data.roundId || ""}`);
    } catch (error: any) {
      Swal.fire("Xác thực thất bại", error.response?.data || "Mã CCCD không đúng.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box" style={{ maxWidth: 760 }}>
        <div className="login-form-section">
          <h2 className="form-title">Xác thực tham gia bầu cử</h2>
          <div className="title-underline"></div>
          <form onSubmit={handleVerify}>
            <div className="form-group">
              <label>Mã CCCD</label>
              <input
                type="text"
                value={citizenId}
                onChange={(e) => setCitizenId(e.target.value)}
                placeholder="Nhập đúng mã CCCD trong danh sách mời"
                required
                disabled={isLoading}
              />
            </div>
            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? "Đang xác thực..." : "Vào trang bầu cử"}
            </button>
          </form>
        </div>
        <div className="login-image-section">
          <div className="overlay-content">
            <h1>Thư mời bầu cử</h1>
            <div className="content-underline"></div>
            <p>Quét QR hoặc mở link trong email, sau đó nhập CCCD để xác nhận đúng người tham gia.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElectionInvite;
