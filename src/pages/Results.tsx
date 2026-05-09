import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
// ✅ SỬA: Import đúng đối tượng electionApi (Sửa lỗi import trống)
import { electionApi } from "../api/electionApi";
import "../assets/css/results.css";

interface CandidateResult {
  id: number;
  name: string;
  votes: number;
  color: string;
  imageUrl?: string;
}

const COLORS = ["#ff6b6b", "#4ecdc4", "#ffbd9b", "#1a535c", "#74b9ff"];

const Results: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const electionId = searchParams.get("electionId");

  const [results, setResults] = useState<CandidateResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResults = useCallback(async (id: number) => {
    try {
      // ✅ SỬA: Gọi electionApi.getCandidates(id) thay vì gọi hàm lẻ
      const res = await electionApi.getCandidates(id);

      const data = res.data.map((c: any, index: number) => ({
        id: c.id,
        name: c.name,
        imageUrl: c.imageUrl,
        votes: c.voteCount || 0,
        color: COLORS[index % COLORS.length]
      }));
      setResults(data);
    } catch (err) {
      console.error(">>> [FE] Lỗi tải kết quả:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (electionId) {
      fetchResults(Number(electionId));
    }
  }, [electionId, fetchResults]);

  const totalVotes = results.reduce((acc, obj) => acc + obj.votes, 0);

  if (loading) return <div className="loading">Đang cập nhật kết quả...</div>;

  return (
      <div className="results-container">
        <main className="results-main">
          <div className="results-card">
            <header className="results-header">
              <span className="live-badge">Báo cáo trực tiếp</span>
              <h1>Kết quả <span>Bầu cử</span></h1>
              <p>Tổng số phiếu ghi nhận: <strong>{totalVotes.toLocaleString()}</strong></p>
            </header>

            <div className="results-list">
              {results.length > 0 ? (
                  results.map((candidate) => {
                    const percentage = totalVotes > 0
                        ? ((candidate.votes / totalVotes) * 100).toFixed(1)
                        : "0";

                    return (
                        <div key={candidate.id} className="result-item">
                          <div className="result-info">
                            <div className="candidate-meta">
                              <img
                                  src={candidate.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name)}&background=random`}
                                  alt={candidate.name}
                                  className="candidate-avatar-res"
                              />
                              <span className="candidate-name-res">{candidate.name}</span>
                            </div>
                            <div className="vote-stats-res">
                              <span className="vote-percent-res">{percentage}%</span>
                              <small>{candidate.votes} phiếu</small>
                            </div>
                          </div>
                          <div className="progress-bar-container">
                            <div
                                className="progress-fill"
                                style={{ width: `${percentage}%`, backgroundColor: candidate.color }}
                            ></div>
                          </div>
                        </div>
                    );
                  })
              ) : (
                  <p className="no-data">Chưa có dữ liệu bầu cử.</p>
              )}
            </div>

            <div className="results-footer-actions">
              <button className="btn-res-secondary" onClick={() => navigate(-1)}>Quay lại</button>
              <button className="btn-res-primary" onClick={() => window.print()}>Xuất báo cáo PDF</button>
            </div>
          </div>
        </main>
      </div>
  );
};

export default Results;