import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { electionApi } from "../../api/electionApi";
import "../../assets/css/election-detail.css";

// Định nghĩa các ảnh mặc định khi dữ liệu trống
const DEFAULT_BANNER = "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?q=80&w=2070";
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/147/147144.png";

const ElectionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [election, setElection] = useState<any>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      try {
        const res = await electionApi.getById(id);
        setElection(res.data);
      } catch (error) {
        console.error("Lỗi khi tải chi tiết:", error);
      }
    };
    fetchDetail();
  }, [id]);

  if (!election) {
    return (
        <div className="loading-container">
          <div className="loader"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
    );
  }

  // Hàm render Badge trạng thái với màu nhạt & không viền
  const renderStatus = (status: string) => {
    const s = status?.toUpperCase();
    if (s === "OPEN") return <span className="status-badge st-open">Đang diễn ra</span>;
    if (s === "UPCOMING") return <span className="status-badge st-upcoming">Sắp diễn ra</span>;
    return <span className="status-badge st-closed">Đã kết thúc</span>;
  };

  return (
      <div className="election-detail-container">
        <button className="btn-back-fixed" onClick={() => navigate(-1)}>
          ← Quay lại
        </button>

        <div className="detail-card">
          {/* 1. Ảnh bìa cuộc bầu cử */}
          <div className="election-banner">
            <img
                src={election.image || DEFAULT_BANNER}
                alt="Banner"
                className="election-main-img"
                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_BANNER; }}
            />
          </div>

          <div className="detail-header">
            <div className="title-section">
              <h2>Cuộc Bầu Cử: {election.title}</h2>
            </div>
            <p className="description">Mô tả: {election.description || "Chưa có mô tả cho cuộc bầu cử này."}</p>
          </div>

          {/* 2. Grid thông tin thời gian */}
          <div className="info-grid">
            <div className="info-card">
              <span className={"status-title"}>Trạng thái</span>
              <div className={"status"} style={{ marginTop: '8px' }}>
                {renderStatus(election.status)}
              </div>
            </div>
            <div className="info-card">
              <span>Ngày bắt đầu</span>
              <strong>{new Date(election.startDate).toLocaleString('vi-VN')}</strong>
            </div>
            <div className="info-card">
              <span>Ngày kết thúc</span>
              <strong>{new Date(election.endDate).toLocaleString('vi-VN')}</strong>
            </div>
          </div>

          {/* 3. Danh sách ứng viên */}
          <h3 className="candidate-title">Danh sách ứng viên</h3>
          <div className="candidate-grid-display">
            {election.candidates?.map((c: any) => (
                <div className="candidate-item-card" key={c.id}>
                  <div className="candidate-img-wrapper">
                    <img
                        src={c.imageUrl || DEFAULT_AVATAR}
                        alt={c.name}
                        onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                    />
                  </div>
                  <div className="candidate-details">
                    <h4>
                      <span className="label-text">Ứng viên:</span> {c.name}
                    </h4>
                    <p>
                      <span className="label-text">Mô tả:</span> {c.description || "Chưa có mô tả chi tiết."}
                    </p>
                  </div>
                </div>
            ))}
          </div>
        </div>
      </div>
  );
};

export default ElectionDetail;