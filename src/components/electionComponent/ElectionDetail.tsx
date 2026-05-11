import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { electionApi } from "../../api/electionApi";
import "../../assets/css/election-detail.css";

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

  return (
      <div className="election-detail-container">
        <button className="btn-back-fixed" onClick={() => navigate(-1)}>
          ← Quay lại
        </button>

        <div className="detail-card">
          {/* 1. Ảnh bìa cuộc bầu cử (Banner) */}
          <div className="election-banner">
            {election.image ? (
                <img src={election.image} alt="Banner" />
            ) : (
                <div className="banner-placeholder">No Image</div>
            )}
            <div className={`status-overlay ${election.status?.toLowerCase()}`}>
              {election.status === "OPEN" ? "● Đang diễn ra" : "Đã kết thúc"}
            </div>
          </div>

          <div className="detail-content">
            <div className="detail-header">
              <h2>{election.title}</h2>
              <p className="description">{election.description}</p>
            </div>

            {/* 2. Lưới thông tin thời gian */}
            <div className="info-grid">
              <div className="info-card">
                <div className="info-text">
                  <span>Ngày bắt đầu</span>
                  <strong>{new Date(election.startDate).toLocaleString('vi-VN')}</strong>
                </div>
              </div>

              <div className="info-card">
                <div className="info-text">
                  <span>Ngày kết thúc</span>
                  <strong>{new Date(election.endDate).toLocaleString('vi-VN')}</strong>
                </div>
              </div>
            </div>

            {/* 3. Danh sách ứng viên (Dạng Card hiện đại) */}
            <h3 className="candidate-title">Danh sách ứng viên </h3>
            <div className="candidate-grid-display">
              {election.candidates?.map((c: any) => (
                  <div className="candidate-item-card" key={c.id}>
                    <div className="candidate-img-wrapper">
                      {c.imageUrl ? (
                          <img src={c.imageUrl} alt={c.name} />
                      ) : (
                          <div className="avatar-placeholder">{c.name?.charAt(0)}</div>
                      )}
                    </div>
                    <div className="candidate-details">
                      <h4>
                        <span className="label-text">Ứng viên:</span> {c.name}
                      </h4>
                      <p>
                        <span className="label-text">Mô tả:</span> {c.description || "Chưa có mô tả chi tiết cho ứng viên này."}
                      </p>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        </div>
      </div>
  );
};

export default ElectionDetail;