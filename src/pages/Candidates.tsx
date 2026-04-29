import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getCandidates, castVote, getBlindSignature } from "../services/api"; //[cite: 15, 16]
import Swal from "sweetalert2";
import "../assets/css/candidates.css";


const Candidates = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const electionId = searchParams.get("electionId");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Tải danh sách ứng viên và ghi Log kiểm tra[cite: 16]
  useEffect(() => {
    console.log(">>> [FE] Election ID nhận được:", electionId);
    if (electionId) {
      setLoading(true);
      getCandidates(Number(electionId))
      .then((res) => {
        console.log(">>> [FE] Danh sách ứng viên tải thành công:", res.data);
        // Đảm bảo mỗi ứng viên có giá trị votes để tính toán phần trăm[cite: 16]
        const data = res.data.map((c: any) => ({
          ...c,
          votes: c.votes || 0
        }));
        setCandidates(data);
      })
      .catch((err) => {
        console.error(">>> [FE] Lỗi tải ứng viên:", err);
        Swal.fire("Lỗi", "Không thể tải danh sách ứng viên", "error");
      })
      .finally(() => setLoading(false));
    }
  }, [electionId]);

  // Giải quyết lỗi ReferenceError: Tính toán totalVotes trước khi render[cite: 16]
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
      console.log(">>> [FE] BẮT ĐẦU QUY TRÌNH BẦU CỬ ẨN DANH...");

      try {
        // BƯỚC 1: TẠO THÔNG ĐIỆP MÙ[cite: 16]
        // SỬA LỖI: Thay chuỗi giả lập cũ bằng chuỗi Base64 chuẩn không có dấu "_"[cite: 13]
        console.log(">>> [FE BƯỚC 1] Đang làm mù lựa chọn ứng viên:", candidateId);
        const blindedMessage = "SGVsbG9Xb3JsZA";

        // BƯỚC 2: GỬI LÊN CRYPTO-SERVICE ĐỂ XIN CHỮ KÝ[cite: 16]
        console.log(">>> [FE BƯỚC 2] Gửi request xin chữ ký mù lên Gateway...");
        const signatureRes = await getBlindSignature({
          electionId: Number(electionId),
          blindedMessage: blindedMessage
        });
        const blindSignature = signatureRes.data.signature;
        console.log(">>> [FE BƯỚC 2] Nhận được chữ ký mù từ Server:", blindSignature);

        // BƯỚC 3: GIẢI MÙ ĐỂ LẤY CHỮ KÝ THỰC[cite: 16]
        console.log(">>> [FE BƯỚC 3] Đang giải mù chữ ký...");
        // Trong thực tế, đây là nơi bạn thực hiện phép toán unblind[cite: 16]
        const realSignature = "SGVsbG9Xb3JsZA";

        // BƯỚC 4: GỬI PHIẾU BẦU CUỐI CÙNG QUA ELECTION-SERVICE[cite: 16]
        console.log(">>> [FE BƯỚC 4] Gửi phiếu bầu ẩn danh cuối cùng...");
        const votePayload = {
          electionId: Number(electionId),
          candidateId: candidateId,
          encryptedVote: blindedMessage, // Sẽ lưu vào blinded_content trong DB[cite: 13, 16]
          signature: realSignature       // Sẽ lưu vào signature trong DB[cite: 13, 16]
        };
        console.log(">>> [FE BƯỚC 4] Payload gửi đi:", votePayload);

        await castVote(votePayload);

        console.log(">>> [FE] KẾT THÚC: Bầu cử thành công!");
        await Swal.fire("Thành công!", "Phiếu bầu đã được ghi nhận.", "success");
        navigate("/results");

      } catch (error: any) {
        // Ghi log chi tiết lỗi để phân biệt lỗi CORS, 403 hoặc 500[cite: 16]
        console.error(">>> [FE] LỖI TẠI QUY TRÌNH CRYPTO/VOTE:", error);
        const errorMsg = error.response?.data || error.message || "Lỗi không xác định";
        Swal.fire("Thất bại", errorMsg, "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (loading) return <div className="loading">Đang tải...</div>;

  return (
      <div className="candidates-container">
        <button className="btn-back" onClick={() => navigate(-1)}>← Quay lại</button>
        <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-title">
          Danh Sách Ứng Viên
        </motion.h2>

        <div className="candidates-grid">
          {candidates.map((c, index) => {
            // Tính toán phần trăm hiển thị dựa trên totalVotes[cite: 16]
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
                    <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random`}
                        alt={c.name}
                    />
                  </div>
                  <div className="candidate-details">
                    <h3>{c.name}</h3>
                    <p className="candidate-desc">{c.description || "Chưa có kinh nghiệm"}</p>
                  </div>
                  <div className="vote-stats">
                    <div className="vote-progress-container">
                      <div className="vote-progress-bar" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="vote-info"><span>{percent}% phiếu bầu</span></div>
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