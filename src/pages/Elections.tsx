import { useEffect, useState } from "react";
import { getElections } from "../services/api";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "../assets/css/elections.css";

const Elections = () => {
  const [elections, setElections] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");
  const navigate = useNavigate();

  useEffect(() => {
    getElections().then(res => setElections(res.data));
  }, []);

  const filteredElections = elections.filter(e => {
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
        <div className="election-grid">
          {filteredElections.map((election, index) => (
              <motion.div
                  key={election.id}
                  className="election-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
              >

                {/* IMAGE */}
                <div className="card-image">
                  <img
                      src={election.image || "/images/default-election.jpg"}
                      alt={election.title}
                  />

                  <div className="status-badge">
                    {election.status === "OPEN" ? "Active" : "Ended"}
                  </div>
                </div>

                {/* BODY */}
                <div className="card-body">
                  <h3>{election.title}</h3>
                  <p>
                    {election.description ||
                        "Cuộc bầu cử dân chủ ứng dụng công nghệ bảo mật hiện đại."}
                  </p>
                </div>

                {/* FOOTER */}
                <div className="card-footer">
                  <button
                      className="action-btn"
                      onClick={() =>
                          navigate(`/candidates?electionId=${election.id}`)
                      }
                  >
                    Tham gia
                  </button>
                </div>

              </motion.div>
          ))}
        </div>
      </div>
  );
};

export default Elections;