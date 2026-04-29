import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getCandidates, castVote, getBlindSignature } from "../services/api";
import api from "../services/api";
import Swal from "sweetalert2";
import bigInt from "big-integer";
import "../assets/css/candidates.css";

const Candidates = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const electionId = searchParams.get("electionId");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (electionId) {
      setLoading(true);
      getCandidates(Number(electionId))
      .then((res) => {
        // Đồng bộ dữ liệu hiển thị với trường voteCount từ Backend
        const data = res.data.map((c: any) => ({ ...c, votes: c.voteCount || 0 }));
        setCandidates(data);
      })
      .catch((err) => {
        console.error(">>> [FE] Lỗi tải ứng viên:", err);
        Swal.fire("Lỗi", "Không thể tải danh sách ứng viên", "error");
      })
      .finally(() => setLoading(false));
    }
  }, [electionId]);

  const totalVotes = candidates.reduce((sum, c) => sum + (c.votes || 0), 0);

  const handleVote = async (candidateId: number, candidateName: string) => {
    const result = await Swal.fire({
      title: "Xác nhận bỏ phiếu",
      text: `Bạn có chắc chắn muốn bầu cho: ${candidateName}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Xác nhận",
      cancelButtonText: "Hủy",
    });

    if (result.isConfirmed) {
      setIsSubmitting(true);

      try {
        const pkRes = await api.get("/api/crypto/public-key");
        const N = bigInt(pkRes.data.modulus, 16);
        const E = bigInt(pkRes.data.exponent, 16);
        const m = bigInt(candidateId);

        let r;
        do {
          r = bigInt.randBetween(bigInt(2), N.prev());
        } while (bigInt.gcd(r, N).notEquals(1));

        const blindedMessageBI = m.multiply(r.modPow(E, N)).mod(N);
        const blindedMessageHex = blindedMessageBI.toString(16);
        const blindedMessageBase64 = btoa(blindedMessageHex);

        const signatureRes = await getBlindSignature({
          electionId: Number(electionId),
          blindedMessage: blindedMessageBase64
        });

        const sPrime = bigInt(signatureRes.data.signature, 16);
        const rInv = (r as any).modInv ? (r as any).modInv(N) : (r as any).modInverse(N);
        const s = sPrime.multiply(rInv).mod(N);
        const realSignature = s.toString(16);

        // ĐỒNG BỘ PAYLOAD: Sử dụng blindedContent để khớp với VoteRequest DTO
        const votePayload = {
          electionId: Number(electionId),
          candidateId: candidateId,
          blindedContent: candidateId.toString(),
          signature: realSignature
        };

        console.log(">>> [FE] Gửi phiếu bầu:", votePayload);
        await castVote(votePayload);

        await Swal.fire("Thành công!", "Phiếu bầu đã được ghi nhận vào database.", "success");
        navigate(`/results?electionId=${electionId}`);

      } catch (error: any) {
        console.error(">>> [FE] LỖI QUY TRÌNH CRYPTO:", error);
        Swal.fire("Thất bại", error.message || "Lỗi xử lý chữ ký", "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (loading) return <div className="loading">Đang tải...</div>;

  return (
      <div className="candidates-container">
        <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', padding: '20px' }}>
          <button className="btn-back" onClick={() => navigate(-1)}>← Quay lại</button>
          <button
              className="btn-view-results"
              onClick={() => navigate(`/results?electionId=${electionId}`)}
              style={{ padding: '10px 20px', backgroundColor: '#4ecdc4', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}
          >
            📊 Xem kết quả hiện tại
          </button>
        </div>
        <motion.h2 className="page-title">Danh Sách Ứng Viên</motion.h2>
        <div className="candidates-grid">
          {candidates.map((c, index) => {
            const percent = totalVotes > 0 ? ((c.votes / totalVotes) * 100).toFixed(1) : "0";
            return (
                <motion.div
                    key={c.id}
                    className="candidate-card"
                    initial={{ y: 40 }}
                    animate={{ y: 0 }}
                    transition={{ delay: index * 0.1 }}
                >
                  <div className="candidate-avatar">
                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random`} alt={c.name} />
                  </div>
                  <div className="candidate-details">
                    <h3>{c.name}</h3>
                    <p className="candidate-desc">{c.description || "Chưa có kinh nghiệm"}</p>
                  </div>
                  <div className="vote-stats">
                    <div className="vote-progress-container">
                      <div className="vote-progress-bar" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="vote-info"><span>{percent}% phiếu bầu ({c.votes} phiếu)</span></div>
                  </div>
                  <button
                      className="btn-vote-now"
                      disabled={isSubmitting}
                      onClick={() => handleVote(c.id, c.name)}
                  >
                    {isSubmitting ? "Đang xử lý..." : "Bình chọn ngay"}
                  </button>
                </motion.div>
            );
          })}
        </div>
      </div>
  );
};

export default Candidates;