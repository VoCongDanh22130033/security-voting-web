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

  // Logic lọc dữ liệu dựa trên trạng thái
  const filteredElections = elections.filter((e) => e.status === filter);

  // Hàm helper để hiển thị text trạng thái thân thiện hơn
  const getStatusText = (status: string) => {
    switch (status) {
      case "OPEN": return "Đang mở";
      case "UPCOMING": return "Sắp diễn ra";
      case "ENDED": return "Đã đóng";
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
            {/* Thêm nút Sắp diễn ra */}
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
                className={filter === "ENDED" ? "active" : ""}
                onClick={() => setFilter("ENDED")}
            >
              Đã kết thúc
            </button>
          </div>
        </header>

        <div className="election-grid">
          {filteredElections.length > 0 ? (
              filteredElections.map((election) => (
                  <motion.div key={election.id} className="election-card" whileHover={{ scale: 1.02 }}>
                    <div className="card-image">
                      <img src={election.image || 'https://via.placeholder.com/400x200'} alt={election.title} />
                      {/* Class động cho badge để đổi màu theo trạng thái */}
                      <span className={`status-badge badge-${election.status.toLowerCase()}`}>
                            {getStatusText(election.status)}
                      </span>
                    </div>
                    <div className="card-body">
                      <h3>{election.title}</h3>
                      <p>{election.description}</p>
                    </div>
                    <div className="card-footer">
                      {/* LOGIC ĐỘNG: Nếu kết thúc thì xem kết quả, nếu không thì giữ nút bầu cử gốc */}
                      {election.status && (election.status.toUpperCase().trim() === "ENDED" || election.status.toUpperCase().trim() === "CLOSED") ? (
                          <button
                              className="action-btn"
                              onClick={() => navigate(`/results?electionId=${election.id}&roundId=1`)}
                          >
                            Xem kết quả
                          </button>
                      ) : (
                          <button
                              className="action-btn"
                              disabled={election.status !== "OPEN"} // Vô hiệu hóa nút nếu chưa đến giờ bầu
                              onClick={() => navigate(`/candidates?electionId=${election.id}`)}
                          >
                            {election.status === "UPCOMING" ? "Chưa bắt đầu" : "Tham gia bầu cử"}
                          </button>
                      )}
                    </div>
                  </motion.div>
              ))
          ) : (
              <div className="no-data" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>
                Không có cuộc bầu cử nào {getStatusText(filter).toLowerCase()}.
              </div>
          )}
        </div>
      </div>
  );
};

export default Elections;