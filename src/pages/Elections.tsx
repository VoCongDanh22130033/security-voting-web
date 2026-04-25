import { useEffect, useState } from 'react';
import { getElections } from '../services/api';
import { useNavigate } from 'react-router-dom';
import '../assets/css/elections.css';

const Elections = () => {
    const [elections, setElections] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        getElections().then(res => setElections(res.data));
    }, []);

    return (
        <div className="elections-container">
            {/* Nút ở góc trên bên trái tương tự bên Candidate */}
            <button className="btn-top-left" onClick={() => navigate('/')}>
                ← Trang chủ
            </button>

            <main className="elections-main">
                <header className="elections-header">
                    <h1>Hệ Thống Bầu Cử</h1>
                    <p>Chọn một cuộc bầu cử để thực hiện quyền công dân của bạn</p>
                </header>

                <div className="filter-bar">
                    <button className="active">Tất cả</button>
                    <button>Đang diễn ra</button>
                    <button>Đã kết thúc</button>
                </div>

                <div className="election-grid">
                    {elections.map((election: any) => (
                        <div key={election.id} className="election-card">
                            <div className="card-image-container">
                                <div className="card-image-placeholder">
                                    <span className={`status-tag ${election.status === 'OPEN' ? 'ongoing' : 'ended'}`}>
                                        {election.status === 'OPEN' ? 'Đang diễn ra' : 'Đã kết thúc'}
                                    </span>
                                </div>
                            </div>
                            <div className="card-body">
                                <h3>{election.title}</h3>
                                <p className="election-desc">
                                    {election.description || "Cuộc bầu cử quan trọng nhằm tìm ra người đại diện ưu tú nhất."}
                                </p>
                                <div className="card-footer">
                                    <div className="date-info">
                                        <small>Hạn chót:</small>
                                        <span>{election.endDate || "31/12/2026"}</span>
                                    </div>
                                    <button
                                        className="vote-btn"
                                        disabled={election.status !== 'OPEN'}
                                        onClick={() => navigate(`/candidates?electionId=${election.id}`)}
                                    >
                                        {election.status === 'OPEN' ? 'Tham gia ngay' : 'Xem kết quả'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default Elections;