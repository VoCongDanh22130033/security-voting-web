import { useEffect, useState } from "react";
import { getElections } from "../services/api";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "../assets/css/elections.css";

const Elections = () => {
  const [elections, setElections] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true); // Thêm trạng thái loading
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getElections()
    .then((res) => {
      console.log(">>> [FE] Dữ liệu Election nhận được:", res.data);
      setElections(res.data);
    })
    .catch((err) => console.error("Lỗi tải danh sách bầu cử:", err))
    .finally(() => setLoading(false));
  }, []);

  const filteredElections = elections.filter((e) => {
    if (filter === "ALL") return true;
    return e.status === filter;
  });

  return (
      <div className="elections-container">
        {/* HEADER */}
        <header className="elections-header">
          <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
          >
            E-Voting
          </motion.h1>

          <div className="header-line" />

          <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
          >
            The art of collective decision
          </motion.p>
        </header>

        {/* FILTER */}
        <div className="filter-wrapper">
          <div className="filter-bar">
            {["ALL", "OPEN", "ENDED"].map((status) => (
                <button
                    key={status}
                    className={filter === status ? "active" : ""}
                    onClick={() => setFilter(status)}
                >
                  {status === "ALL"
                      ? "Archive"
                      : status === "OPEN"
                          ? "Ongoing"
                          : "Completed"}
                </button>
            ))}
          </div>
        </div>

        {/* GRID */}
        {loading ? (
            <div className="loading-spinner">Đang tải danh sách bầu cử...</div>
        ) : (
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
                        {/* IMAGE - SỬA LẠI ĐỂ HIỆN ẢNH TỪ CLOUDINARY */}
                        <div className="card-image">
                          <img
                              src={
                                  election.image || // Trình duyệt sẽ tìm thuộc tính 'image' trả về từ Backend
                                  "https://res.cloudinary.com/demo/image/upload/v1631234567/sample.jpg" // Ảnh mặc định nếu null
                              }
                              alt={election.title}
                              onError={(e) => {
                                // Xử lý nếu link ảnh Cloudinary bị lỗi hoặc die
                                (e.target as HTMLImageElement).src = "/images/default-election.jpg";
                              }}
                          />

                          <div className={`status-badge ${election.status?.toLowerCase()}`}>
                            {election.status === "OPEN" ? "Active" : "Ended"}
                          </div>
                        </div>

                        {/* BODY */}
                        <div className="card-body">
                          <h3>{election.title}</h3>
                          <p className="description-text">
                            {election.description ||
                                "Cuộc bầu cử dân chủ ứng dụng công nghệ bảo mật hiện đại."}
                          </p>
                          <div className="date-info">
                            <span>Bắt đầu: {new Date(election.startDate).toLocaleDateString("vi-VN")}</span>
                          </div>
                        </div>

                        {/* FOOTER */}
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
                  <div className="no-data">Không có cuộc bầu cử nào được tìm thấy.</div>
              )}
            </div>
        )}
      </div>
  );
};

export default Elections;