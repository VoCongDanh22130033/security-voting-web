import { useEffect, useState } from "react";
import { getElections } from "../services/api";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "../assets/css/elections.css";

const Elections = () => {
  const [elections, setElections] = useState<any[]>([]);
  // CHỈNH SỬA: Mặc định để OPEN thay vì ALL
  const [filter, setFilter] = useState("OPEN");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getElections()
    .then((res) => {
      setElections(res.data);
    })
    .catch((err) => console.error("Lỗi tải danh sách bầu cử:", err))
    .finally(() => setLoading(false));
  }, []);

  // CHỈNH SỬA: Logic lọc chỉ còn Ongoing và Completed[cite: 13]
  const filteredElections = elections.filter((e) => e.status === filter);

  return (
      <div className="elections-container">
        {/* HEADER */}
        <header className="elections-header">
          <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
          >
            Bầu Cử
          </motion.h1>
          <div className="header-line" />
          {/*<p className="subtitle">The art of collective decision</p>*/}
        </header>

        {/* FILTER: Bỏ Archive[cite: 13] */}
        <div className="filter-wrapper">
          <div className="filter-bar">
            <button
                className={filter === "OPEN" ? "active" : ""}
                onClick={() => setFilter("OPEN")}
            >
              Đang Mở
            </button>
            <button
                className={filter === "ENDED" ? "active" : ""}
                onClick={() => setFilter("ENDED")}
            >
              Đã Kết Thúc
            </button>
          </div>
        </div>

        {/* GRID */}
        {loading ? (
            <div className="loading-spinner">Đang tải danh sách...</div>
        ) : (
            <>
              <div className="election-grid">
                {filteredElections.length > 0 ? (
                    filteredElections.map((election, index) => (
                        <motion.div
                            key={election.id}
                            className="election-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                          <div className="card-image">
                            <img
                                src={election.image || "https://res.cloudinary.com/demo/image/upload/v1631234567/sample.jpg"}
                                alt={election.title}
                            />
                            <div className={`status-badge ${election.status?.toLowerCase()}`}>
                              {election.status === "OPEN" ? "Đang mở" : "Kết thúc"}
                            </div>
                          </div>

                          <div className="card-body">
                            <h3>{election.title}</h3>
                            <p className="description-text">{election.description}</p>
                            <div className="date-info">
                              <span>Bắt đầu: {new Date(election.startDate).toLocaleDateString("vi-VN")}</span>
                            </div>
                          </div>

                          <div className="card-footer">
                            <button
                                className="action-btn"
                                onClick={() => navigate(`/candidates?electionId=${election.id}`)}
                            >
                              Tham gia
                            </button>
                          </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="no-data">Không có cuộc bầu cử nào.</div>
                )}
              </div>

              {/* THÊM NÚT QUAY VỀ Ở DƯỚI CÙNG */}
              <div className="footer-actions-elections" style={{ marginTop: '50px' }}>
                <button className="btn-back-bottom" onClick={() => navigate("/")}>
                  Quay về trang chủ
                </button>
              </div>
            </>
        )}
      </div>
  );
};

export default Elections;