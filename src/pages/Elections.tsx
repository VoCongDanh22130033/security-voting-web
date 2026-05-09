import { useEffect, useState } from "react";
import { electionApi } from "../api/electionApi"; // ✅ Import đúng đối tượng
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "../assets/css/elections.css";

const Elections = () => {
  const [elections, setElections] = useState<any[]>([]);
  const [filter, setFilter] = useState("OPEN");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    electionApi.getAll() // ✅ Gọi đúng hàm getAll()
    .then((res) => {
      setElections(res.data);
    })
    .catch((err) => console.error("Lỗi tải danh sách:", err))
    .finally(() => setLoading(false));
  }, []);

  const filteredElections = elections.filter((e) => e.status === filter);

  if (loading) return <div className="loading">Đang tải danh sách bầu cử...</div>;

  return (
      <div className="elections-container">
        <header className="elections-header">
          <h1>Danh Sách Bầu Cử</h1>
          <div className="filter-tabs">
            <button className={filter === "OPEN" ? "active" : ""} onClick={() => setFilter("OPEN")}>Đang diễn ra</button>
            <button className={filter === "CLOSED" ? "active" : ""} onClick={() => setFilter("CLOSED")}>Đã kết thúc</button>
          </div>
        </header>

        <div className="elections-grid">
          {filteredElections.length > 0 ? (
              filteredElections.map((election) => (
                  <motion.div key={election.id} className="election-card" whileHover={{ scale: 1.02 }}>
                    <div className="card-body">
                      <h3>{election.title}</h3>
                      <p>{election.description}</p>
                      <button onClick={() => navigate(`/candidates?electionId=${election.id}`)}>Tham gia</button>
                    </div>
                  </motion.div>
              ))
          ) : (
              <div className="no-data">Không có cuộc bầu cử nào phù hợp.</div>
          )}
        </div>
      </div>
  );
};

export default Elections;