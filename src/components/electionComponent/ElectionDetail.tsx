import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import "../../assets/css/election-detail.css";

const ElectionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [election, setElection] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await api.get(`/api/elections/${id}`);
        setElection(res.data);

        const candRes = await api.get(`/api/elections/${id}/candidates`);
        setCandidates(candRes.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchDetail();
  }, [id]);

  if (!election) {
    return <div style={{ padding: 40 }}>Đang tải...</div>;
  }

  return (
      <div className="election-detail-container">

        {/* BACK BUTTON */}
        <button className="btn-back-fixed" onClick={() => navigate(-1)}>
          ← Quay lại
        </button>

        <div className="detail-card">

          {/* HEADER */}
          <div className="detail-header">
            <h2>{election.title}</h2>
            <p>{election.description}</p>
          </div>

          {/* INFO GRID */}
          <div className="info-grid">

            <div className="info-card">
              <span>Trạng thái</span>
              <div className={`status-badge ${election.status.toLowerCase()}`}>
                {election.status === "OPEN" && "Đang diễn ra"}
                {election.status === "ENDED" && "Đã kết thúc"}
                {election.status === "UPCOMING" && "Sắp diễn ra"}
              </div>
            </div>

            <div className="info-card">
              <span>Bắt đầu</span>
              <strong>{new Date(election.startDate).toLocaleString()}</strong>
            </div>

            <div className="info-card">
              <span>Kết thúc</span>
              <strong>{new Date(election.endDate).toLocaleString()}</strong>
            </div>

          </div>

          {/* UPCOMING NOTICE */}
          {election.status === "UPCOMING" && (
              <div className="coming-badge">
                Chưa đến thời gian bình chọn
              </div>
          )}

          {/* CANDIDATES */}
          <h3 className="candidate-title">Danh sách ứng viên</h3>

          <div className="candidate-list">
            {candidates.map((c) => (
                <div className="candidate-row" key={c.id}>

                  <div className="candidate-avatar">
                    {c.name?.charAt(0)}
                  </div>

                  <div className="candidate-info">
                    <strong>{c.name}</strong>
                    <span>Kinh nghiệm: {c.description }</span>
                  </div>
                </div>
            ))}
          </div>

        </div>
      </div>
  );
};

export default ElectionDetail;