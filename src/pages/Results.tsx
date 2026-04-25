import React from "react";
import {useNavigate} from "react-router-dom";
import "../assets/css/results.css";

interface CandidateResult {
  id: number;
  name: string;
  votes: number;
  color: string;
}

const Results: React.FC = () => {
  const navigate = useNavigate();

  // Dữ liệu giả lập kết quả
  const results: CandidateResult[] = [
    {id: 1, name: "Trần Thị B", votes: 450, color: "#ff6b6b"},
    {id: 2, name: "Phạm Minh D", votes: 320, color: "#4ecdc4"},
    {id: 3, name: "Lê Văn C", votes: 150, color: "#ffbd9b"},
  ];

  const totalVotes = results.reduce((acc, obj) => acc + obj.votes, 0);

  return (
      <div className="results-container">

        <main className="results-main">
          <div className="results-card">
            <div className="results-header">
              <span className="live-badge">Live Results</span>
              <h1>Kết quả: Bầu cử Ban chấp hành 2026</h1>
              <p>Tổng số phiếu bầu hiện tại: <strong>{totalVotes.toLocaleString()}</strong></p>
            </div>

            <div className="results-list">
              {results.map((candidate) => {
                const percentage = ((candidate.votes / totalVotes) * 100).toFixed(1);
                return (
                    <div key={candidate.id} className="result-item">
                      <div className="result-info">
                        <span className="candidate-name">{candidate.name}</span>
                        <span className="vote-count">{candidate.votes} phiếu ({percentage}%)</span>
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
              })}
            </div>

            <div className="results-footer-actions">
              <button className="btn-back" onClick={() => navigate("/elections")}>
                Quay lại cuộc bầu cử
              </button>
              <button className="btn-share">Chia sẻ kết quả</button>
            </div>
          </div>

          <div className="notice-box">
            <p>⚠️ Kết quả này được cập nhật theo thời gian thực. Kết quả cuối cùng sẽ được công bố
              sau khi thời gian bỏ phiếu kết thúc.</p>
          </div>
        </main>
      </div>
  );
};

export default Results;