import { useEffect, useState } from "react";
import { electionApi } from "../api/electionApi";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "../assets/css/elections.css";

const Elections = () => {
  const [elections, setElections] = useState<any[]>([]);
  const [filter, setFilter] = useState("OPEN"); // Mặc định hiển thị cuộc bầu cử đang mở
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    electionApi.getAll()
    .then((res) => {
      setElections(res.data);
    })
    .catch((err) => console.error("Lỗi tải danh sách:", err))
    .finally(() => setLoading(false));
  }, []);

  // ĐÃ SỬA LOGIC LỌC: Gộp cả trạng thái 'CLOSED' và 'CLOSED' vào tab "Đã kết thúc"
  const filteredElections = elections.filter((e) => {
    const statusUpper = e.status ? e.status.toUpperCase().trim() : "";
    if (filter === "CLOSED") {
      return statusUpper === "CLOSED" || statusUpper === "CLOSED";
    }
    return statusUpper === filter;
  });

  // Hàm helper hiển thị text tiếng Việt thân thiện
  const getStatusText = (status: string) => {
    const statusUpper = status ? status.toUpperCase().trim() : "";
    switch (statusUpper) {
      case "OPEN": return "Đang diễn ra";
      case "UPCOMING": return "Sắp diễn ra";
      case "CLOSED": return "Đã kết thúc";
      default: return status;
    }
  };

  if (loading) return <div className="loading">Đang tải danh sách bầu cử...</div>;

  return (
      <div className="elections-container">
        <header className="elections-header">
          <h1>Danh Sách Bầu Cử</h1>
          <div className="header-line"></div>

          <div className="filter-bar">
            <button
                className={filter === "UPCOMING" ? "active" : ""}
                onClick={() => setFilter("UPCOMING")}
            >
              Sắp diễn ra
            </button>
            <button
                className={filter === "OPEN" ? "active" : ""}
                onClick={() => setFilter("OPEN")}
            >
              Đang diễn ra
            </button>
            <button
                className={filter === "CLOSED" ? "active" : ""}
                onClick={() => setFilter("CLOSED")}
            >
              Đã kết thúc
            </button>
          </div>
        </header>

        <div className="election-grid">
          {filteredElections.length > 0 ? (
              filteredElections.map((election) => {
                const statusUpper = election.status ? election.status.toUpperCase().trim() : "";
                const isFinished = statusUpper === "CLOSED" || statusUpper === "CLOSED";

                return (
                    <motion.div key={election.id} className="election-card" whileHover={{ scale: 1.02 }}>
                      <div className="card-image" onClick={() => navigate(`/election-detail/${election.id}`)} style={{ cursor: "pointer" }}>
                        <img src={election.image || 'https://via.placeholder.com/400x200'} alt={election.title} />
                        <span className={`status-badge badge-${statusUpper.toLowerCase()}`}>
                            {getStatusText(election.status)}
                      </span>
                      </div>
                      <div className="card-body">
                        <h3>{election.title}</h3>
                        <p>{election.description}</p>
                      </div>
                      <div className="card-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button
                            className="action-btn btn-secondary"
                            onClick={() => navigate(`/election-detail/${election.id}`)}
                            style={{ backgroundColor: '#f0f0f0', color: '#333', border: '1px solid #ccc' }}
                        >
                            Xem Chi Tiết
                        </button>
                        
                        {/* ĐÃ SỬA ĐIỀU KIỆN ĐIỀU HƯỚNG ĐA NHIỆM CHUẨN XÁC */}
                        {isFinished ? (
                            <button
                                className="action-btn"
                                style={{ backgroundColor: '#34495e' }}
                                onClick={() => navigate(`/results?electionId=${election.id}&roundId=1`)} //
                            >
                              Xem kết quả chung cuộc
                            </button>
                        ) : (
                            <button
                                className="action-btn"
                                disabled={statusUpper === "UPCOMING"}
                                onClick={() => navigate(`/candidates?electionId=${election.id}`)} //
                            >
                              {statusUpper === "UPCOMING" ? "Chưa bắt đầu" : "Tham gia bầu cử"}
                            </button>
                        )}
                      </div>
                    </motion.div>
                );
              })
          ) : (
              <div className="no-data" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                Không có cuộc bầu cử nào {getStatusText(filter).toLowerCase()}.
              </div>
          )}
          <div className="footer-actions">

          </div>

        </div>
        <button className="btn-back-home" onClick={() => navigate("/")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Quay lại trang chủ
        </button>

      </div>
  );
};

export default Elections;
