import { useEffect, useState } from "react";
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
  const roundId = searchParams.get("roundId") || "1";

  const [candidates, setCandidates] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const GATEWAY_URL = 'http://localhost:8080';

  useEffect(() => {
    if (electionId) {
      setLoading(true);
      electionApi.getCandidates(Number(electionId))
      .then((res) => {
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
        console.log("=== [LOG CHẨN ĐOÁN] BẮT ĐẦU QUY TRÌNH KÝ MÙ ===");

        // BƯỚC 1: Lấy khóa công khai RSA hệ thống thông qua API Gateway
        const pkRes = await axiosClient.get(`${GATEWAY_URL}/api/crypto/public-key`);
        const N = bigInt(pkRes.data.modulus, 16);
        const E = bigInt(pkRes.data.exponent, 16);

        // BƯỚC 2: Khởi tạo nội dung thông điệp gốc M
        // Tạo chuỗi Nonce ngẫu nhiên siêu dài bọc kèm ID ứng viên để tránh chuỗi token ngắn gây sập hàm băm Backend
        // BƯỚC 2: Khởi tạo nội dung thông điệp gốc M
        // Tạo chuỗi Nonce ngẫu nhiên siêu dài bọc kèm ID ứng viên để tránh trùng lặp
        const randomNonce = Math.floor(Math.random() * 1000000).toString();
        const rawMessageStr = `candidateId=${candidateId}&nonce=${randomNonce}`;

        // CHỈNH SỬA TẠI ĐÂY: Thay thế Buffer lỗi bằng TextEncoder thuần trình duyệt
        const encoder = new TextEncoder();
        const view = encoder.encode(rawMessageStr);
        const messageHexStr = Array.from(view)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

        const M = bigInt(messageHexStr, 16);

        // Sinh số ngẫu nhiên r làm mù thỏa mãn điều kiện gcd(r, N) = 1
        let r;
        do {
          r = bigInt.randBetween(bigInt(2), N.prev());
        } while (bigInt.gcd(r, N).notEquals(1));

        // Thực hiện công thức làm mù mật mã học: M' = (M * r^E) mod N
        const blindedMessageBI = M.multiply(r.modPow(E, N)).mod(N);
        const blindedMessageHex = blindedMessageBI.toString(16).trim().toLowerCase();

        // Ép kiểu dữ liệu an toàn trước khi đẩy qua API Gateway
        const cleanElectionId = parseInt(String(electionId), 10);
        const cleanRoundId = parseInt(String(roundId), 10);

        if (isNaN(cleanElectionId) || isNaN(cleanRoundId)) {
          throw new Error("Thông tin định danh cuộc bầu cử hoặc vòng đấu từ URL không hợp lệ!");
        }

        const signPayload = {
          electionId: cleanElectionId,
          roundId: cleanRoundId,
          blindedMessage: blindedMessageHex
        };

        // BƯỚC 3: Gửi payload xin chữ ký mù từ crypto-service
        const signatureRes = await cryptoApi.getBlindSignature(signPayload);
        console.log("  > Đã nhận Chữ ký mù S' thành công từ Backend Crypto.");

        const sPrime = bigInt(signatureRes.data.signature, 16);

        // BƯỚC 4: GIẢI MÙ CHUẨN XÁC (Khử hoàn toàn lỗi suy biến lũy thừa)
        const rInv = r.modInv(N); // Tìm số nghịch đảo số dư thừa chuẩn (r^-1 mod N)
        const s = sPrime.multiply(rInv).mod(N); // Công thức giải mù: S = (S' * rInv) mod N

        const realSignature = s.toString(16).trim().toLowerCase();
        const unblindedContentHex = M.toString(16).trim().toLowerCase(); // Chuỗi mã Token sạch hệ Hex chiều dài chuẩn

        console.log("  > [MẬT MÃ] Tính toán toán học giải mù thành công!");
        console.log("  > Giải mù thành công! Chữ ký số S xịn (Hex dài):", realSignature.substring(0, 25) + "...");
        console.log("  > Mã Token nặc danh (Hex dài):", unblindedContentHex.substring(0, 25) + "...");

        // BƯỚC 5: Đóng gói Payload đẩy lá phiếu nặc danh lên hòm phiếu công khai
        const votePayload = {
          electionId: cleanElectionId,
          roundId: cleanRoundId,
          candidateId: candidateId,
          messageToken: unblindedContentHex, // ĐỔI TÊN THÀNH messageToken ĐỂ KHỚP KHÍT 100% VỚI BACKEND DTO
          signature: realSignature
        };

        console.log(">>> [FE SUCCESS] Đẩy lá phiếu ẩn danh lên hòm phiếu công khai:", votePayload);

        // Thực hiện đẩy phiếu thông qua lớp API tập trung
        await cryptoApi.castVote(votePayload);

        console.log("=== LUỒNG BIỂU QUYẾT HOÀN THÀNH THÀNH CÔNG THÔNG SUỐT ===");
        await Swal.fire("Thành công!", "Bỏ phiếu thành công! Lá phiếu nặc danh của bạn đã lọt vào hòm phiếu an toàn.", "success");

        // Tải lại danh sách ứng cử viên để làm mới tiến trình giao diện
        const reloadRes = await electionApi.getCandidates(cleanElectionId);
        const reloadData = reloadRes.data.map((c: any) => ({ ...c, votes: c.voteCount || 0 }));
        setCandidates(reloadData);

        navigate(`/results?electionId=${cleanElectionId}`);

      } catch (error: any) {
        console.error("❌ XẢY RA LỖI TẠI QUY TRÌNH CHẨN ĐOÁN FE:", error);

        let errorMessage = "Đường dẫn hòm phiếu lỗi hoặc bạn đã bỏ phiếu ở vòng này rồi.";
        if (error.response && error.response.data) {
          if (typeof error.response.data === 'string') errorMessage = error.response.data;
          else if (error.response.data.message) errorMessage = error.response.data.message;
        } else {
          errorMessage = error.message;
        }

        Swal.fire({
          title: "Bỏ phiếu thất bại",
          text: errorMessage,
          icon: "error",
          confirmButtonColor: "#e74c3c"
        });
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
          Danh Sách <span style={{ color: '#ff6b6b' }}>Ứng Viên</span>
        </motion.h2>

        <div className="candidates-wrapper">
          <div className="candidates-grid">
            {candidates.map((c, index) => {
              const percent = totalVotes > 0 ? ((c.votes / totalVotes) * 100).toFixed(1) : "0";
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
                    <div className="vote-stats">
                      <div className="vote-progress-container">
                        <div className="vote-progress-bar" style={{ width: `${percent}%` }} />
                      </div>
                      <div className="vote-info">
                        <span>{percent}% phiếu bầu ({c.votes} phiếu)</span>
                      </div>
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

        <div className="footer-actions-candidates">
          <button className="btn-back-bottom" onClick={() => navigate(-1)}>
            Quay lại trang trước
          </button>
          <button
              className="btn-view-results-bottom"
              onClick={() => navigate(`/results?electionId=${electionId}`)}
          >
            📊 Xem kết quả hiện tại
          </button>
        </div>
      </div>
  );
};

export default Candidates;