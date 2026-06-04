import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { electionApi } from "../api/electionApi";
import Swal from "sweetalert2";
import "../assets/css/results.css";

interface ElectionRound {
  id: number;
  roundNumber: number;
  title: string;
  status: string;
  maxAdvanceCount: number;
  startTime: string;
  endTime: string;
}

interface CandidateResult {
  id: number;
  name: string;
  imageUrl: string;
  description: string;
  voteCount: number;
}

const Results = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const electionId = searchParams.get("electionId");

  const [election, setElection] = useState<any>(null);
  const [rounds, setRounds] = useState<ElectionRound[]>([]);
  const [activeRound, setActiveRound] = useState<ElectionRound | null>(null);
  const [candidates, setCandidates] = useState<CandidateResult[]>([]);
  const [loading, setLoading] = useState(true);

  // UX cải tiến: Trạng thái thông báo realtime dạng Banner thay vì Swal ép buộc
  const [liveNotification, setLiveNotification] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Khởi tạo dữ liệu ban đầu
  useEffect(() => {
    if (!electionId) return;

    setLoading(true);
    Promise.all([
      electionApi.getById(electionId),
      electionApi.getElectionRounds(Number(electionId)),
    ])
    .then(([electionRes, roundsRes]) => {
      if (electionRes.data.status !== 'CLOSED') {
        Swal.fire({
          title: "Chưa thể xem kết quả!",
          text: "Cuộc bầu cử này vẫn đang diễn ra. Hệ thống sẽ tự động hiển thị kết quả sau khi thời gian bỏ phiếu kết thúc.",
          icon: "info",
          confirmButtonColor: "#4f46e5",
          confirmButtonText: "Quay lại trang chủ"
        }).then(() => {
          navigate('/elections');
        });
        return;
      }

      setElection(electionRes.data);
      const sortedRounds = roundsRes.data.sort((a: ElectionRound, b: ElectionRound) => a.roundNumber - b.roundNumber);
      setRounds(sortedRounds);

      if (sortedRounds.length > 0) {
        const lastValidRound = sortedRounds.slice().reverse().find(r => r.status === 'CLOSED');
        setActiveRound(lastValidRound || sortedRounds[0]);
      }
    })
    .catch((err) => {
      console.error("Lỗi tải thông tin kết quả:", err);
      Swal.fire("Lỗi kết nối", "Không thể cập nhật dữ liệu bầu cử mới nhất.", "error");
    })
    .finally(() => setLoading(false));
  }, [electionId, navigate]);

  // Lấy danh sách ứng viên khi đổi Tab vòng bầu cử
  useEffect(() => {
    if (!activeRound) return;

    setLoading(true);
    electionApi.getCandidatesByRound(activeRound.id)
    .then((res) => {
      const sortedCandidates = res.data.sort((a: CandidateResult, b: CandidateResult) => b.voteCount - a.voteCount);
      setCandidates(sortedCandidates);
    })
    .catch((err) => {
      console.error("Lỗi tải ứng viên:", err);
      setCandidates([]);
    })
    .finally(() => setLoading(false));
  }, [activeRound]);

  // Real-time Polling: Cập nhật dữ liệu ngầm mượt mà, không gây gián đoạn (No-intrusive UX)
  useEffect(() => {
    if (!electionId || !activeRound || activeRound.status !== 'OPEN') return;

    const interval = setInterval(async () => {
      try {
        const [electionRes, roundsRes] = await Promise.all([
          electionApi.getById(electionId),
          electionApi.getElectionRounds(Number(electionId))
        ]);

        const latestElection = electionRes.data;
        const allRounds = roundsRes.data.sort((a: ElectionRound, b: ElectionRound) => a.roundNumber - b.roundNumber);
        const currentRoundInPoll = allRounds.find((r: ElectionRound) => r.id === activeRound.id);

        if (currentRoundInPoll && currentRoundInPoll.status === 'CLOSED') {
          clearInterval(interval);
          setRounds(allRounds);
          setActiveRound(currentRoundInPoll);

          const nextRound = allRounds.find((r: ElectionRound) => r.roundNumber === currentRoundInPoll.roundNumber + 1 && r.status !== 'CANCELLED');

          if (latestElection.status === 'CLOSED' && latestElection.winnerId) {
            setLiveNotification("🎉 Đã tìm ra nhà chiến thắng tuyệt đối cho cuộc bầu cử này!");
          } else if (nextRound) {
            setLiveNotification(`📢 Vòng hiện tại đã đóng. Vòng tiếp theo chuẩn bị bắt đầu.`);
          } else {
            setLiveNotification("🏁 Cuộc bầu cử đã chính thức khép lại hoàn toàn.");
          }
        } else {
          // Cập nhật ngầm số phiếu mà không làm bật loading màn hình
          const res = await electionApi.getCandidatesByRound(activeRound.id);
          const sortedCandidates = res.data.sort((a: CandidateResult, b: CandidateResult) => b.voteCount - a.voteCount);
          setCandidates(sortedCandidates);
        }
      } catch (error) {
        console.error("Lỗi cập nhật dữ liệu tự động:", error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeRound, electionId, candidates]);

  const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);
  const maxVotes = candidates.length > 0 ? candidates[0].voteCount : 0;
  const lastActiveRound = rounds.slice().reverse().find(r => r.status === 'CLOSED');
  const isFinalRound = activeRound && lastActiveRound ? activeRound.id === lastActiveRound.id && election?.status === 'CLOSED' : false;

  if (!electionId) return <div className="error-page">⚠️ Không tìm thấy mã cuộc bầu cử hợp lệ.</div>;
  if (loading && candidates.length === 0) return <div className="loading-container"><div className="spinner"></div><p>Đang đồng bộ kết quả trực tiếp...</p></div>;
  if (election?.status !== 'CLOSED') return null;

  // Tính toán điểm sàn đi tiếp
  let thresholdVoteCount = -1;
  if (candidates.length > 0 && activeRound && activeRound.maxAdvanceCount > 0) {
    const limitIndex = Math.min(activeRound.maxAdvanceCount - 1, candidates.length - 1);
    thresholdVoteCount = candidates[limitIndex].voteCount;
  }

  // Lấy ký tự Icon đại diện thứ hạng Top 3
  const getRankBadge = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  return (
      <div className="results-container">
        {/* Banner thông báo Realtime mượt mà, không chặn tương tác người dùng */}
        <AnimatePresence>
          {liveNotification && (
              <motion.div
                  className="live-notification-toast"
                  initial={{ opacity: 0, y: -50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
              >
                <span>{liveNotification}</span>
                <button onClick={() => window.location.reload()} className="toast-action-btn">Tải lại trang</button>
              </motion.div>
          )}
        </AnimatePresence>

        <motion.header
            className="results-header"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
          <span className="badge-live">Báo cáo kết quả</span>
          {/*<h1>{election?.title}</h1>*/}
        </motion.header>

        {/* Thanh điều hướng Tabs thiết kế dạng "Pill Capsule" tối giản siêu đẹp */}
        <nav className="round-tabs-container">
          <div className="round-tabs">
            {rounds.filter(r => r.status !== 'CANCELLED').map((round) => (
                <button
                    key={round.id}
                    className={`tab-btn ${activeRound?.id === round.id ? "active" : ""}`}
                    onClick={() => setActiveRound(round)}
                >
                  {round.title || `Vòng ${round.roundNumber}`}
                </button>
            ))}
          </div>
        </nav>

        {activeRound && (
            <div className="round-summary-card">
              {isFinalRound ? (
                  <p className="final-winner-announcement">
                    🏆 Kết quả chung cuộc của toàn bộ chiến dịch bầu cử
                  </p>
              ) : (
                  <p>
                    Chế độ lấy: <span className="summary-highlight">Top {activeRound.maxAdvanceCount}</span> ứng cử viên cao phiếu nhất để đi tiếp.
                  </p>
              )}
            </div>
        )}

        <main className="results-content">
          <motion.div
              className="candidates-grid-results"
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.08 } }
              }}
          >
            {candidates.length > 0 ? (
                candidates.map((c, index) => {
                  const percent = totalVotes > 0 ? ((c.voteCount / totalVotes) * 100).toFixed(1) : "0";

                  let isWinner = false;
                  if (activeRound?.status === 'CLOSED') {
                    isWinner = isFinalRound ? (c.voteCount > 0 && c.voteCount === maxVotes) : (c.voteCount > 0 && c.voteCount >= thresholdVoteCount);
                  }
                  const isUltimateWinner = isFinalRound && isWinner;

                  return (
                      <motion.div
                          key={c.id}
                          className={`candidate-card-result ${isUltimateWinner ? 'final-winner' : isWinner ? 'qualified' : ''}`}
                          variants={{
                            hidden: { opacity: 0, y: 20 },
                            show: { opacity: 1, y: 0 }
                          }}
                          whileHover={{ y: -6, transition: { duration: 0.2 } }}
                      >
                        <div className={`candidate-rank-badge rank-${index + 1}`}>
                          {getRankBadge(index)}
                        </div>

                        <div className="avatar-wrapper">
                          <img
                              src={c.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=f1f5f9&color=1e293b&bold=true`}
                              alt={c.name}
                              className="candidate-avatar-result"
                          />
                          {isWinner && <div className="success-pulse-dot"></div>}
                        </div>

                        <div className="candidate-info">
                          <h4 className="candidate-name-result">{c.name}</h4>
                          <p className="candidate-status-text">
                            {isUltimateWinner ? "Người chiến thắng" : isWinner ? "Đạt điều kiện đi tiếp" : "Dừng chân"}
                          </p>
                        </div>

                        <div className="vote-analytics-section">
                          <div className="vote-details">
                            <span className="vote-count">{c.voteCount.toLocaleString()} phiếu</span>
                            <span className="vote-percent">{percent}%</span>
                          </div>
                          <div className="vote-bar-container">
                            <motion.div
                                className="vote-bar"
                                initial={{ width: 0 }}
                                animate={{ width: `${percent}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            ></motion.div>
                          </div>
                        </div>
                      </motion.div>
                  );
                })
            ) : (
                <div className="no-data">Hiện tại chưa có dữ liệu ứng viên được cập nhật cho vòng này.</div>
            )}
          </motion.div>
        </main>

        <footer className="footer-actions">
          <button className="btn-back-top" onClick={() => navigate('/elections')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Quay lại danh sách
          </button>
        </footer>
      </div>
  );
};

export default Results;