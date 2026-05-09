import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
// ✅ Sửa: Import đúng tên đối tượng electionApi
import { electionApi } from "../../api/electionApi";
import "../../assets/css/election-detail.css";

const ElectionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [election, setElection] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      try {
        // ✅ Sửa: Dùng electionApi.getById thay vì api.get
        const res = await electionApi.getById(id);
        setElection(res.data);

        // ✅ Sửa: Dùng electionApi.getCandidates thay vì api.get
        const candRes = await electionApi.getCandidates(id);
        setCandidates(candRes.data);
      } catch (error) {
        console.error("Lỗi khi tải chi tiết:", error);
      }
    };
    fetchDetail();
  }, [id]);

  if (!election) {
    return <div style={{ padding: 40 }}>Đang tải...</div>;
  }

  return (
      <div className="election-detail-container">
        <button className="btn-back-fixed" onClick={() => navigate(-1)}>
          ← Quay lại
        </button>

        <div className="detail-card">
          <div className="detail-header">
            <h2>{election.title}</h2>
            <p>{election.description}</p>
          </div>

          <div className="info-grid">
            <div className="info-card">
              <span>Trạng thái</span>
              <div className={`status-badge ${election.status?.toLowerCase()}`}>
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

          {election.status === "UPCOMING" && (
              <div className="coming-badge">Chưa đến thời gian bình chọn</div>
          )}

          <h3 className="candidate-title">Danh sách ứng viên</h3>
          <div className="candidate-list">
            {candidates.map((c) => (
                <div className="candidate-row" key={c.id}>
                  <div className="candidate-avatar">{c.name?.charAt(0)}</div>
                  <div className="candidate-info">
                    <strong>{c.name}</strong>
                    <span>Kinh nghiệm: {c.description}</span>
                  </div>
                </div>
            ))}
          </div>
        </div>
      </div>
  );
};

export default ElectionDetail;