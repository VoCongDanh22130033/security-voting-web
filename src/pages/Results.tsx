import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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

  // Lấy dữ liệu cơ bản
  useEffect(() => {
    if (electionId) {
      setLoading(true);
      Promise.all([
        electionApi.getById(electionId),
        electionApi.getElectionRounds(Number(electionId)),
      ])
        .then(([electionRes, roundsRes]) => {
          // Bảo vệ trang: Chặn truy cập nếu cuộc bầu cử chưa kết thúc
          if (electionRes.data.status !== 'CLOSED') {
            Swal.fire({
              title: "Chưa thể xem kết quả!",
              text: "Cuộc bầu cử này vẫn đang diễn ra. Bạn chỉ có thể xem kết quả sau khi thời gian bỏ phiếu kết thúc hoàn toàn.",
              icon: "warning",
              confirmButtonColor: "#3498db",
              confirmButtonText: "Quay lại"
            }).then(() => {
              navigate('/elections');
            });
            return;
          }

          setElection(electionRes.data);
          const sortedRounds = roundsRes.data.sort((a: ElectionRound, b: ElectionRound) => a.roundNumber - b.roundNumber);
          setRounds(sortedRounds);
          if (sortedRounds.length > 0) {
            if (electionRes.data.status === 'CLOSED') {
              const lastValidRound = sortedRounds.slice().reverse().find(r => r.status === 'CLOSED');
              setActiveRound(lastValidRound || sortedRounds[0]);
            } else {
              const openRound = sortedRounds.find((r: ElectionRound) => r.status === 'OPEN');
              setActiveRound(openRound || sortedRounds[0]);
            }
          }
        })
        .catch((err) => {
          console.error("Lỗi tải thông tin kết quả:", err);
          Swal.fire("Lỗi", "Không thể tải dữ liệu cuộc bầu cử.", "error");
        })
        .finally(() => setLoading(false));
    }
  }, [electionId, navigate]);

  // Lấy dữ liệu ứng viên khi chuyển tab
  useEffect(() => {
    if (activeRound) {
      setLoading(true);
      electionApi.getCandidatesByRound(activeRound.id)
        .then((res) => {
          const sortedCandidates = res.data.sort((a: CandidateResult, b: CandidateResult) => b.voteCount - a.voteCount);
          setCandidates(sortedCandidates);
        })
        .catch((err) => {
          console.error(`Lỗi tải ứng viên cho vòng ${activeRound.id}:`, err);
          setCandidates([]);
        })
        .finally(() => setLoading(false));
    }
  }, [activeRound]);

  // CHỨC NĂNG GIÁM SÁT (POLLING) & HIỂN THỊ THÔNG BÁO NỔI
  useEffect(() => {
    if (!electionId || !activeRound || activeRound.status !== 'OPEN') {
      return;
    }

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
          const roundTitle = currentRoundInPoll.title || `Vòng ${currentRoundInPoll.roundNumber}`;

          const isAbsoluteWin = latestElection.status === 'CLOSED' && latestElection.winnerId && currentRoundInPoll.roundNumber < allRounds.length;

          if (isAbsoluteWin) {
            const winnerCand = candidates.find((c: any) => c.id === latestElection.winnerId);
            const winnerName = winnerCand ? winnerCand.name : "Một ứng viên";
            Swal.fire({
              title: 'Chiến Thắng Tuyệt Đối!',
              html: `Ứng cử viên <b style="color: #2ecc71; font-size: 18px;">${winnerName}</b> đã giành được 100% số phiếu và chiến thắng tuyệt đối ngay từ ${roundTitle}!`,
              icon: 'success',
              confirmButtonText: 'Xem kết quả'
            }).then(() => {
              window.location.reload();
            });
          } else if (nextRound) {
            const startTime = new Date(nextRound.startTime).getTime();
            Swal.fire({
              title: 'Vòng đấu đã kết thúc!',
              html: `Cuộc bầu cử <b>${roundTitle}</b> đã khép lại.`,
              icon: 'info',
              confirmButtonText: 'Tiếp tục',
              allowOutsideClick: false,
              didOpen: () => {
                const content = Swal.getHtmlContainer();
                if (content) {
                  const timerInterval = setInterval(() => {
                    const now = new Date().getTime();
                    if (now >= startTime) {
                      content.innerHTML = `Cuộc bầu cử <b>${roundTitle}</b> đã kết thúc.<br/><br/>🎉 <span style="color: green; font-weight: bold; font-size: 16px;">Vòng tiếp theo đã bắt đầu!</span>`;
                      Swal.getConfirmButton()!.textContent = "Bỏ phiếu vòng tiếp theo";
                      clearInterval(timerInterval);
                    } else {
                      const diffSecs = Math.ceil((startTime - now) / 1000);
                      const mins = Math.floor(diffSecs / 60);
                      const secs = diffSecs % 60;
                      content.innerHTML = `Cuộc bầu cử <b>${roundTitle}</b> đã kết thúc.<br/><br/>⏳ Vòng tiếp theo sẽ bắt đầu sau: <br/><b style="font-size: 20px; color: #d35400;">${mins} phút ${secs} giây</b>`;
                      Swal.getConfirmButton()!.textContent = "Chờ tại trang kết quả";
                    }
                  }, 1000);
                  (Swal as any)._timerInterval = timerInterval;
                }
              },
              willClose: () => {
                clearInterval((Swal as any)._timerInterval);
              }
            }).then(() => {
              if (new Date().getTime() >= startTime) {
                navigate(`/candidates?electionId=${electionId}`);
              } else {
                window.location.reload();
              }
            });
          } else {
            Swal.fire({
              title: 'Cuộc bầu cử kết thúc!',
              html: `Cuộc bầu cử <b>${roundTitle}</b> đã kết thúc hoàn toàn. Xin chúc mừng người chiến thắng!`,
              icon: 'success',
              confirmButtonText: 'Xem kết quả chung cuộc'
            }).then(() => {
              window.location.reload();
            });
          }
        } else {
            electionApi.getCandidatesByRound(activeRound.id).then((res) => {
                const sortedCandidates = res.data.sort((a: CandidateResult, b: CandidateResult) => b.voteCount - a.voteCount);
                setCandidates(sortedCandidates);
            }).catch(() => {});
        }
      } catch (error) {
        console.error("Lỗi khi poll round status:", error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeRound, electionId, navigate, candidates]);

  const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);
  const maxVotes = candidates.length > 0 ? candidates[0].voteCount : 0;
  
  const lastActiveRound = rounds.slice().reverse().find(r => r.status === 'CLOSED');
  const isFinalRound = activeRound && lastActiveRound ? activeRound.id === lastActiveRound.id && election?.status === 'CLOSED' : false;

  if (!electionId) {
    return <div className="error-page">Không tìm thấy mã cuộc bầu cử.</div>;
  }

  if (loading && candidates.length === 0) {
    return <div className="loading">Đang tải dữ liệu kết quả...</div>;
  }
  
  let thresholdVoteCount = -1;
  if (candidates.length > 0 && activeRound && activeRound.maxAdvanceCount > 0) {
     const limitIndex = Math.min(activeRound.maxAdvanceCount - 1, candidates.length - 1);
     thresholdVoteCount = candidates[limitIndex].voteCount;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100 } }
  };

  // Chỉ hiển thị UI khi đã tải xong và xác nhận election đã CLOSED
  if (election?.status !== 'CLOSED') {
    return null; // Không render gì cả trong lúc chờ redirect
  }

  return (
    <div className="results-container">
      <motion.header 
        className="results-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <h1>Kết Quả Bầu Cử</h1>
        <h2>{election?.title}</h2>
      </motion.header>

      <motion.div 
        className="round-tabs"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        {rounds.filter(r => r.status !== 'CANCELLED').map((round) => (
          <button
            key={round.id}
            className={`tab-btn ${activeRound?.id === round.id ? "active" : ""}`}
            onClick={() => setActiveRound(round)}
          >
            {round.title || `Vòng ${round.roundNumber}`}
          </button>
        ))}
      </motion.div>

      {activeRound && (
        <motion.div 
          className="round-summary"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.4 }}
        >
          {isFinalRound ? (
            <p className="final-winner-announcement">
              🏆 Người Chiến Thắng Chung Cuộc 🏆
            </p>
          ) : (
            activeRound.status !== 'CANCELLED' &&
            <p>
              Kết quả <span className="summary-highlight">{activeRound.title || `Vòng ${activeRound.roundNumber}`}</span>:
              Có <span className="summary-highlight">{activeRound.maxAdvanceCount}</span> ứng viên được đi tiếp vào vòng sau.
            </p>
          )}
        </motion.div>
      )}

      <div className="results-content">
        {loading && candidates.length === 0 ? (
          <div className="loading">Đang tải ứng viên...</div>
        ) : (
          <motion.div 
            className="candidates-grid-results"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {candidates.length > 0 ? (
              candidates.map((c, index) => {
                const percent = totalVotes > 0 ? ((c.voteCount / totalVotes) * 100).toFixed(1) : "0";
                
                let isWinner = false;
                if (activeRound?.status === 'CLOSED') {
                    if (isFinalRound) {
                      isWinner = c.voteCount > 0 && c.voteCount === maxVotes;
                    } else {
                      isWinner = activeRound ? c.voteCount > 0 && c.voteCount >= thresholdVoteCount : false;
                    }
                }
                const isUltimateWinner = isFinalRound && isWinner;

                return (
                  <motion.div
                    key={c.id}
                    variants={itemVariants}
                    className={`candidate-card-result ${isUltimateWinner ? 'final-winner' : (isWinner ? 'winner' : '')}`}
                  >
                    {isUltimateWinner ? (
                      <motion.div 
                        className="winner-badge final"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 150, delay: index * 0.15 + 0.4 }}
                      >
                        CHUNG CUỘC
                      </motion.div>
                    ) : (
                      isWinner && (
                        <motion.div 
                          className="winner-badge"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200, delay: index * 0.15 + 0.3 }}
                        >
                          🏆
                        </motion.div>
                      )
                    )}
                    <div className="candidate-rank">#{index + 1}</div>
                    <motion.img
                      src={c.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random`}
                      alt={c.name}
                      className="candidate-avatar-result"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    />
                    <h4 className="candidate-name-result">{c.name}</h4>
                    <div className="vote-bar-container">
                      <motion.div 
                        className="vote-bar" 
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: index * 0.15 + 0.2 }}
                      ></motion.div>
                    </div>
                    <div className="vote-details">
                      <span className="vote-count">{c.voteCount} phiếu</span>
                      <motion.span 
                        className="vote-percent"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.15 + 1 }}
                      >
                        {percent}%
                      </motion.span>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="no-data">Không có dữ liệu ứng viên cho vòng này.</div>
            )}
          </motion.div>
        )}
      </div>
       <div className="footer-actions">
          <button className="btn-back" onClick={() => navigate('/elections')}>
            Quay lại danh sách
          </button>
        </div>
    </div>
  );
};

export default Results;