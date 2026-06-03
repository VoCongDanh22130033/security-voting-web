import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { electionApi } from "../../api/electionApi";
import "../../assets/css/election-detail.css";

const DEFAULT_BANNER = "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?q=80&w=2070";
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/147/147144.png";

interface Candidate {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  voteCount?: number;
}

interface Election {
  id: number;
  title: string;
  description: string;
  image: string;
  status: string;
  startDate: string;
  endDate: string;
  winnerId: number;
  candidates: Candidate[];
}

const ElectionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [election, setElection] = useState<Election | null>(null);
  const [winner, setWinner] = useState<Candidate | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      try {
        const res = await electionApi.getById(id);
        const electionData = res.data;

        if (electionData.status === 'CLOSED') {
          const resultsRes = await electionApi.getResults(id);
          electionData.candidates = resultsRes.data;
          if (resultsRes.data.length > 0) {
            setWinner(resultsRes.data[0]);
          }
        }
        
        setElection(electionData);

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
            <p className="description">{election.description || "Chưa có mô tả cho cuộc bầu cử này."}</p>
          </div>

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

          {winner && (
              <div className="winner-section">
                <h3>Người chiến thắng</h3>
                <div className="candidate-item-card winner">
                  <div className="candidate-img-wrapper">
                    <img
                        src={winner.imageUrl || DEFAULT_AVATAR}
                        alt={winner.name}
                        onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                    />
                  </div>
                  <div className="candidate-details">
                    <h4>
                      <span className="label-text">Ứng viên:</span> {winner.name}
                    </h4>
                    <p>
                      <span className="label-text">Mô tả:</span> {winner.description || "Chưa có mô tả chi tiết."}
                    </p>
                    <p className="vote-count">
                      <span className="label-text">Số phiếu:</span> {winner.voteCount}
                    </p>
                  </div>
                </div>
              </div>
          )}

          <h3 className="candidate-title">Danh sách ứng viên</h3>
          <div className="candidate-grid-display">
            {election.candidates?.map((c: Candidate) => (
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
                    {election.status === 'CLOSED' && (
                      <p className="vote-count">
                        <span className="label-text">Số phiếu:</span> {c.voteCount}
                      </p>
                    )}
                  </div>
                </div>
            ))}
          </div>
        </div>
      </div>
  );
};

export default ElectionDetail;