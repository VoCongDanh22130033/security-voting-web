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
        <div className="detail-max-width">

          {/* THANH ĐIỀU HƯỚNG TRÊN CÙNG */}
          <div className="detail-navigation">
            <button className="btn-back-link" onClick={() => navigate(-1)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Quay lại danh sách
            </button>
          </div>

          <div className="detail-split-layout">

            {/* CỘT TRÁI: THÔNG TIN TỔNG QUAN */}
            <div className="column-overview">
              <div className="overview-sticky-card">
                <div className="election-banner-wrapper">
                  <img
                      src={election.image || DEFAULT_BANNER}
                      alt="Banner"
                      className="election-main-img"
                      onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_BANNER; }}
                  />
                  <div className="banner-status-tag">
                    {renderStatus(election.status)}
                  </div>
                </div>

                <div className="election-meta-content">
                  <h1>{election.title}</h1>
                  <p className="description">{election.description || "Chưa có mô tả cho cuộc bầu cử này."}</p>

                  <div className="timeline-block">
                    <div className="timeline-item">
                      <span className="timeline-label">Thời gian bắt đầu</span>
                      <strong className="timeline-value">{new Date(election.startDate).toLocaleString('vi-VN')}</strong>
                    </div>
                    <div className="timeline-item">
                      <span className="timeline-label">Thời gian kết thúc</span>
                      <strong className="timeline-value">{new Date(election.endDate).toLocaleString('vi-VN')}</strong>
                    </div>
                  </div>

                  <button className="btn-action-bulletin" onClick={() => navigate(`/bulletin-board/${id}`)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    Xem Bảng Tin Công Khai
                  </button>
                </div>
              </div>
            </div>

            {/* CỘT PHẢI: KHU VỰC ỨNG CỬ VIÊN / KẾT QUẢ */}
            <div className="column-content-main">

              {/* KHỐI VINH DANH NGƯỜI CHIẾN THẮNG (NẾU CÓ) */}
              {winner && (
                  <div className="winner-showcase-card">
                    <div className="winner-ribbon">🏆 Người Chiến Thắng</div>
                    <div className="winner-flex-body">
                      <div className="winner-avatar-circle">
                        <img
                            src={winner.imageUrl || DEFAULT_AVATAR}
                            alt={winner.name}
                            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                        />
                      </div>
                      <div className="winner-text-info">
                        <h3>{winner.name}</h3>
                        <p className="winner-desc">{winner.description || "Chưa có mô tả chi tiết."}</p>
                        <div className="winner-stats-badge">
                          <span>Tổng số phiếu bầu đạt được:</span>
                          <strong>{winner.voteCount} phiếu</strong>
                        </div>
                      </div>
                    </div>
                  </div>
              )}

              {/* DANH SÁCH ỨNG VIÊN */}
              <div className="candidates-section">
                <h3 className="section-title">
                  Danh sách ứng viên ({election.candidates?.length || 0})
                </h3>

                <div className="candidate-modern-grid">
                  {election.candidates?.map((c: Candidate) => (
                      <div className="candidate-profile-card" key={c.id}>
                        <div className="profile-card-header">
                          <div className="candidate-avatar-frame">
                            <img
                                src={c.imageUrl || DEFAULT_AVATAR}
                                alt={c.name}
                                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                            />
                          </div>
                          <div className="candidate-meta-name">
                            <h4>{c.name}</h4>
                            <span className="candidate-id-tag">ID: #{c.id}</span>
                          </div>
                        </div>
                        <div className="profile-card-body">
                          <p>{c.description || "Chưa có mô tả chi tiết từ ứng cử viên này."}</p>
                        </div>

                        {election.status === 'CLOSED' && (
                            <div className="profile-card-footer-votes">
                              <span className="vote-label">Phiếu bầu đạt được</span>
                              <span className="vote-number">{c.voteCount}</span>
                            </div>
                        )}
                      </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
  );
};

export default ElectionDetail;