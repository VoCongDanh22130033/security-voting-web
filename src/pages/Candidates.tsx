import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { electionApi } from "../api/electionApi";
import { cryptoApi } from "../api/cryptoApi";
import axiosClient from "../api/axiosClient";
import Swal from "sweetalert2";
import bigInt from "big-integer";
import "../assets/css/candidates.css";

const Candidates = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const electionId = searchParams.get("electionId");

  const [election, setElection] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [currentRound, setCurrentRound] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Dùng useRef để tránh re-render không cần thiết khi check interval
  const electionStatusRef = useRef<string | null>(null);

  const GATEWAY_URL = 'http://localhost:8080';

  const fetchElectionData = async () => {
    if (electionId) {
      setLoading(true);
      try {
        const res = await electionApi.getById(electionId);
        const electionData = res.data;
        
        // Cơ chế phòng thủ: Nếu Backend chưa cập nhật trường rounds, tự động gọi API lấy rounds
        let allRounds = electionData.rounds || [];
        if (allRounds.length === 0) {
            const roundsRes = await electionApi.getElectionRounds(Number(electionId));
            allRounds = roundsRes.data;
        }

        setElection(electionData);
        electionStatusRef.current = electionData.status;

        if (electionData.status === 'CLOSED') {
          const resultsRes = await electionApi.getResults(electionId);
          // An toàn lấy dữ liệu ứng viên
          const candidatesData = resultsRes.data || [];
          setCandidates(candidatesData.map((c: any) => ({ ...c, votes: c.voteCount || 0 })));
        } else {
          const currentRoundFromServer = allRounds.find((r: any) => r.id === electionData.currentRoundId);
          setCurrentRound(currentRoundFromServer);
          
          // An toàn lấy dữ liệu ứng viên
          const candidatesFromElection = electionData.candidates || [];
          setCandidates(candidatesFromElection.map((c: any) => ({ ...c, votes: c.voteCount || 0 })));
        }
      } catch (err) {
        console.error(">>> [FE] Lỗi tải dữ liệu bầu cử:", err);
        Swal.fire("Lỗi", "Không thể tải dữ liệu.", "error");
      } finally {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    fetchElectionData();
  }, [electionId]);

  // Polling để kiểm tra trạng thái vòng đấu
  useEffect(() => {
    if (!electionId || election?.status !== 'OPEN' || !currentRound) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const [electionRes, roundsRes] = await Promise.all([
          electionApi.getById(electionId),
          electionApi.getElectionRounds(Number(electionId))
        ]);
        
        const latestElection = electionRes.data;
        const allRounds = roundsRes.data.sort((a: any, b: any) => a.roundNumber - b.roundNumber);
        const currentRoundInPoll = allRounds.find((r: any) => r.id === currentRound.id);

        if (currentRoundInPoll && currentRoundInPoll.status === 'CLOSED') {
          clearInterval(interval);
          const nextRound = allRounds.find((r: any) => r.roundNumber === currentRoundInPoll.roundNumber + 1 && r.status !== 'CANCELLED');
          const roundTitle = currentRoundInPoll.title || `Vòng ${currentRoundInPoll.roundNumber}`;

          // Kiểm tra xem có người chiến thắng tuyệt đối không (khi election status là CLOSED và vòng hiện tại không phải vòng cuối cùng)
          const isAbsoluteWin = latestElection.status === 'CLOSED' && latestElection.winnerId && currentRoundInPoll.roundNumber < allRounds.length;

          if (isAbsoluteWin) {
            const winnerCand = latestElection.candidates?.find((c: any) => c.id === latestElection.winnerId);
            const winnerName = winnerCand ? winnerCand.name : "Một ứng viên";
            Swal.fire({
              title: 'Chiến Thắng Tuyệt Đối!',
              html: `Ứng cử viên <b style="color: #2ecc71; font-size: 18px;">${winnerName}</b> đã giành được 100% số phiếu và chiến thắng tuyệt đối ngay từ ${roundTitle}!`,
              icon: 'success',
              confirmButtonText: 'Xem kết quả'
            }).then(() => {
              navigate(`/results?electionId=${electionId}`);
            });
          } else if (nextRound) {
            const startTime = new Date(nextRound.startTime).getTime();
            Swal.fire({
              title: 'Vòng đấu đã kết thúc!',
              html: `Cuộc bầu cử <b>${roundTitle}</b> đã khép lại.`,
              icon: 'info',
              confirmButtonText: 'Xác nhận',
              didOpen: () => {
                const content = Swal.getHtmlContainer();
                if (content) {
                  const timerInterval = setInterval(() => {
                    const now = new Date().getTime();
                    if (now >= startTime) {
                      content.innerHTML = `Cuộc bầu cử <b>${roundTitle}</b> đã kết thúc.<br/><span style="color: green; font-weight: bold;">Vòng tiếp theo đã bắt đầu!</span>`;
                      clearInterval(timerInterval);
                    } else {
                      const diffSecs = Math.ceil((startTime - now) / 1000);
                      const mins = Math.floor(diffSecs / 60);
                      const secs = diffSecs % 60;
                      content.innerHTML = `Cuộc bầu cử <b>${roundTitle}</b> đã kết thúc.<br/>Vòng tiếp theo sẽ bắt đầu sau: <b>${mins} phút ${secs} giây</b>`;
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
                window.location.reload();
              } else {
                navigate(`/results?electionId=${electionId}`);
              }
            });
          } else {
            const winnerCand = latestElection.candidates?.find((c: any) => c.id === latestElection.winnerId);
            const winnerName = winnerCand ? winnerCand.name : "";
            Swal.fire({
              title: 'Cuộc bầu cử kết thúc!',
              html: `Cuộc bầu cử <b>${roundTitle}</b> đã kết thúc hoàn toàn. ${winnerName ? `<br/>Người chiến thắng: <b>${winnerName}</b>` : ''}`,
              icon: 'success',
              confirmButtonText: 'Xem kết quả'
            }).then(() => {
              navigate(`/results?electionId=${electionId}`);
            });
          }
        }
      } catch (error) {
        console.error("Lỗi khi poll round status:", error);
      }
    }, 5000); // Kiểm tra mỗi 5 giây

    return () => clearInterval(interval);
  }, [election, currentRound, electionId, navigate]);


  const totalVotes = candidates.reduce((sum, c) => sum + (c.votes || 0), 0);

  const handleVote = async (candidateId: number, candidateName: string) => {
    const result = await Swal.fire({
      title: "Xác nhận bỏ phiếu",
      text: `Bạn có chắc chắn muốn bầu cho: ${candidateName}? Lá phiếu của bạn sẽ được làm mù nặc danh hoàn toàn!`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Xác nhận",
      cancelButtonText: "Hủy",
    });

    if (result.isConfirmed) {
      setIsSubmitting(true);
      Swal.fire({
        title: 'Đang xử lý mật mã...',
        text: 'Hệ thống đang tiến hành làm mù dữ liệu và xin chữ ký số bảo mật...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      try {
        if (!currentRound?.id) {
          throw new Error("Không thể xác định vòng bầu cử hiện tại!");
        }

        const pkRes = await axiosClient.get(`${GATEWAY_URL}/api/crypto/public-key`);
        const N = bigInt(pkRes.data.modulus, 16);
        const E = bigInt(pkRes.data.exponent, 16);

        const randomNonce = Math.floor(Math.random() * 1000000).toString();
        const rawMessageStr = `candidateId=${candidateId}&nonce=${randomNonce}`;

        const encoder = new TextEncoder();
        const view = encoder.encode(rawMessageStr);
        const messageHexStr = Array.from(view)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

        const M = bigInt(messageHexStr, 16);

        let r;
        do {
          r = bigInt.randBetween(bigInt(2), N.prev());
        } while (bigInt.gcd(r, N).notEquals(1));

        const blindedMessageBI = M.multiply(r.modPow(E, N)).mod(N);
        const blindedMessageHex = blindedMessageBI.toString(16).trim().toLowerCase();

        const cleanElectionId = parseInt(String(electionId), 10);

        const signPayload = {
          electionId: cleanElectionId,
          roundId: currentRound.id,
          blindedMessage: blindedMessageHex
        };

        const signatureRes = await cryptoApi.getBlindSignature(signPayload);
        const sPrime = bigInt(signatureRes.data.signature, 16);
        const rInv = r.modInv(N);
        const s = sPrime.multiply(rInv).mod(N);

        const realSignature = s.toString(16).trim().toLowerCase();
        const unblindedContentHex = M.toString(16).trim().toLowerCase();

        const votePayload = {
          electionId: cleanElectionId,
          roundId: currentRound.id,
          candidateId: candidateId,
          messageToken: unblindedContentHex,
          signature: realSignature
        };

        await cryptoApi.castVote(votePayload);

        await Swal.fire("Thành công!", "Bỏ phiếu thành công! Lá phiếu nặc danh của bạn đã lọt vào hòm phiếu an toàn.", "success");

        navigate(`/results?electionId=${cleanElectionId}`);

      } catch (error: any) {
        console.error("❌ XẢY RA LỖI TẠI QUY TRÌNH CHẨN ĐOÁN FE:", error);
        let errorMessage = "Đường dẫn hòm phiếu lỗi hoặc bạn đã bỏ phiếu ở vòng này rồi.";
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (typeof error.response?.data === 'string') {
          errorMessage = error.response.data;
        } else {
          errorMessage = error.message;
        }
        Swal.fire("Bỏ phiếu thất bại", errorMessage, "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (loading) return <div className="loading">Đang tải...</div>;

  return (
      <div className="candidates-container">
        <motion.h2
            className="page-title"
            style={{ fontSize: '40px', fontWeight: '800', color: '#333', marginBottom: '20px', zIndex: 2 }}
        >
          {election?.title || "Danh Sách Ứng Viên"}
        </motion.h2>
        {currentRound && election?.status === 'OPEN' && (
          <motion.h3 className="round-title">
            {currentRound.title || `Vòng ${currentRound.roundNumber}`}
          </motion.h3>
        )}

        <div className="candidates-wrapper">
          <div className="candidates-grid">
            {candidates.map((c, index) => {
              const percent = totalVotes > 0 && election?.status === 'CLOSED' ? ((c.votes / totalVotes) * 100).toFixed(1) : "0";
              return (
                  <motion.div
                      key={c.id}
                      className="candidate-card"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                  >
                    <div className="candidate-avatar">
                      <img
                          src={c.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random`}
                          alt={c.name}
                      />
                    </div>
                    <div className="candidate-details">
                      <h3 className="info-value">{c.name}</h3>
                      <p className="candidate-desc">{c.description || "Chưa có kinh nghiệm"}</p>
                    </div>
                    {election?.status === 'CLOSED' && (
                      <div className="vote-stats">
                        <div className="vote-progress-container">
                          <div className="vote-progress-bar" style={{ width: `${percent}%` }} />
                        </div>
                        <div className="vote-info">
                          <span>{percent}% phiếu bầu ({c.votes} phiếu)</span>
                        </div>
                      </div>
                    )}
                    {election?.status !== 'CLOSED' && (
                      <button
                          className="btn-vote-now"
                          disabled={isSubmitting}
                          onClick={() => handleVote(c.id, c.name)}
                      >
                        {isSubmitting ? "Đang xử lý..." : "Bình chọn ngay"}
                      </button>
                    )}
                  </motion.div>
              );
            })}
          </div>
        </div>

        <div className="footer-actions-candidates">
          <button className="btn-back-bottom" onClick={() => navigate(-1)}>
            Quay lại trang trước
          </button>
          <button
              className="btn-view-results-bottom"
              onClick={() => {
                if (election?.status !== 'CLOSED') {
                  Swal.fire({
                    title: "Chưa thể xem kết quả!",
                    text: "Cuộc bầu cử vẫn đang diễn ra. Bạn chỉ có thể xem kết quả sau khi cuộc bầu cử kết thúc hoàn toàn.",
                    icon: "warning",
                    confirmButtonColor: "#3498db",
                    confirmButtonText: "Đã hiểu"
                  });
                } else {
                  navigate(`/results?electionId=${electionId}`);
                }
              }}
          >
            📊 Xem kết quả
          </button>
        </div>
      </div>
  );
};

export default Candidates;