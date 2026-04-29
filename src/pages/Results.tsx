import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCandidates } from "../services/api";
import "../assets/css/results.css";


interface CandidateResult {
  id: number;
  name: string;
  votes: number;
  color: string;
}
const COLORS = ["#ff6b6b", "#4ecdc4", "#ffbd9b", "#1a535c", "#f7fff7"];
const Results: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const electionId = searchParams.get("electionId");

  const [results, setResults] = useState<CandidateResult[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchResults = useCallback(async (id: number) => {
    try {
      const res = await getCandidates(id);
      console.log(">>> Data từ API:", res.data);
      const data = res.data.map((c: any, index: number) => ({
        id: c.id,
        name: c.name,
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
    } else {
      console.warn(">>> [FE] Thiếu tham số electionId trên URL!");
      setLoading(false);
    }
  }, [electionId, fetchResults]);

  // Tính tổng số phiếu để tính phần trăm hiển thị
  const totalVotes = results.reduce((acc, obj) => acc + obj.votes, 0);

  if (loading) return <div className="loading">Đang cập nhật kết quả...</div>;

  return (
      <div className="results-container">
        <main className="results-main">
          <div className="results-card">
            <div className="results-header">
              <span className="live-badge">Live Results</span>
              <h1>Kết quả bầu cử thực tế</h1>
              <p>Tổng số phiếu bầu hiện tại: <strong>{totalVotes.toLocaleString()}</strong></p>
            </div>

            <div className="results-list">
              {results.length > 0 ? (
                  results.map((candidate) => {
                    const percentage = totalVotes > 0
                        ? ((candidate.votes / totalVotes) * 100).toFixed(1)
                        : "0";

                    return (
                        <div key={candidate.id} className="result-item">
                          <div className="result-info">
                            <span className="candidate-name">{candidate.name}</span>
                            <span className="vote-count">
                        <strong>{candidate.votes}</strong> phiếu ({percentage}%)
                      </span>
                          </div>
                          <div className="progress-bar-container">
                            <div
                                className="progress-fill"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: candidate.color
                                }}
                            ></div>
                          </div>
                        </div>
                    );
                  })
              ) : (
                  <p className="no-data">Chưa có dữ liệu bầu cử cho cuộc này.</p>
              )}
            </div>

            <div className="results-footer-actions">
              <button className="btn-back" onClick={() => navigate(-1)}>Quay lại</button>
              <button className="btn-share" onClick={() => window.print()}>Xuất báo cáo (PDF)</button>
            </div>
          </div>
        </main>
      </div>
  );
};

export default Results;