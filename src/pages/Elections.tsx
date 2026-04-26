import { useEffect, useState } from "react";
import { getElections } from "../services/api";
import { useNavigate } from "react-router-dom";
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
        if (filter === "OPEN") return e.status === "OPEN";
        if (filter === "ENDED") return e.status !== "OPEN";
        return true;
    });

    return (
        <div className="elections-container">
            <button className="btn-top-left" onClick={() => navigate("/")}>
                ← Trang chủ
            </button>

            <header className="elections-header">
                <h1>Danh sách cuộc bầu cử</h1>
                <p>Lựa chọn cuộc bầu cử để tham gia hoặc xem kết quả</p>
            </header>

            <div className="filter-bar">
                <button
                    className={filter === "ALL" ? "active" : ""}
                    onClick={() => setFilter("ALL")}
                >
                    Tất cả
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

            <div className="election-grid">
                {filteredElections.map((election) => (
                    <div key={election.id} className="election-card">

                        <div className="card-header">
                            <strong>Mã: #{election.id}</strong>
                            <span className={`status-tag ${election.status === "OPEN" ? "ongoing" : "ended"}`}>
                                {election.status === "OPEN" ? "Đang diễn ra" : "Đã kết thúc"}
                            </span>
                        </div>

                        <div className="card-body">
                            <h3>{election.title}</h3>
                            <p className="election-desc">
                                {election.description || "Cuộc bầu cử nhằm lựa chọn đại diện phù hợp nhất."}
                            </p>
                        </div>

                        <div className="card-footer">
                            <div className="date-info">
                                <div>Bắt đầu: {election.startDate || "01/01/2026"}</div>
                                <div>Kết thúc: {election.endDate || "31/12/2026"}</div>
                            </div>

                            <button
                                className="vote-btn"
                                disabled={election.status !== "OPEN"}
                                onClick={() => navigate(`/candidates?electionId=${election.id}`)}
                            >
                                {election.status === "OPEN"
                                    ? "Tham gia bỏ phiếu"
                                    : "Xem kết quả"}
                            </button>
                        </div>

                    </div>
                ))}
            </div>
        </div>
    );
};

export default Elections;