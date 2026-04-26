import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getCandidates, castVote } from "../services/api";
import Swal from "sweetalert2";
import "../assets/css/candidates.css";

const Candidates = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const electionId = searchParams.get("electionId");

  const [candidates, setCandidates] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (electionId) {
      getCandidates(Number(electionId)).then(res => {
        // giả lập vote count
        const data = res.data.map((c: any) => ({
          ...c,
          votes: Math.floor(Math.random() * 100)
        }));
        setCandidates(data);
      });
    }
  }, [electionId]);

  // tính tổng vote
  const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);

  const handleVote = async (id: number, name: string) => {
    const result = await Swal.fire({
      title: "Xác nhận bỏ phiếu",
      text: `Bạn chọn ${name}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Đồng ý",
      cancelButtonText: "Hủy",
      reverseButtons: true // (optional: đảo vị trí cho giống UI VN)
    });

    if (result.isConfirmed) {
      setIsSubmitting(true);

      try {
        await castVote({
          electionId: Number(electionId),
          candidateId: id
        });

        // cập nhật realtime UI
        setCandidates(prev =>
            prev.map(c =>
                c.id === id ? { ...c, votes: c.votes + 1 } : c
            )
        );

        Swal.fire({
          title: "Thành công",
          text: "Đã ghi nhận phiếu",
          icon: "success",
          confirmButtonText: "OK"
        });

      } catch (e: any) {
        Swal.fire("Lỗi", "Không thể bỏ phiếu", "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
      <div className="candidates-container">

        <button className="btn-back" onClick={() => navigate("/elections")}>
          ← Quay lại
        </button>

        <div className="election-info">
          <h1>Danh sách ứng viên</h1>
          <p>Cuộc bầu cử #{electionId}</p>
        </div>

        <div className="candidates-grid">
          {candidates.map((c, index) => {
            const percent = totalVotes
                ? ((c.votes / totalVotes) * 100).toFixed(1)
                : 0;

            return (
                <motion.div
                    key={c.id}
                    className="candidate-card"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                >
                  <div className="candidate-avatar">
                    <img src={`https://ui-avatars.com/api/?name=${c.name}`} />
                  </div>

                  <h3>{c.name}</h3>

                  <p>{c.description || "Ứng viên tranh cử"}</p>

                  {/* PROGRESS */}
                  <div className="vote-progress">
                    <div
                        className="vote-progress-bar"
                        style={{ width: `${percent}%` }}
                    />
                  </div>

                  <small>{percent}% phiếu bầu</small>

                  <button
                      className="btn-vote-now"
                      disabled={isSubmitting}
                      onClick={() => handleVote(c.id, c.name)}
                  >
                    {isSubmitting ? "Đang xử lý..." : "Bỏ phiếu"}
                  </button>
                </motion.div>
            );
          })}
        </div>
      </div>
  );
};

export default Candidates;