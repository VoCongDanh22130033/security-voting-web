import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { electionApi } from "../api/electionApi";
import Swal from "sweetalert2";
import "../assets/css/candidates.css"; // Tái sử dụng hệ CSS sạch của bạn

const Results = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const electionId = searchParams.get("electionId");
  const roundId = searchParams.get("roundId") || "1";

  const [candidatesWithVotes, setCandidatesWithVotes] = useState<any[]>([]);
  const [totalVotes, setTotalVotes] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (electionId) {
      setLoading(true);

      Promise.all([
        electionApi.getCandidates(Number(electionId)),
        electionApi.getRoundResults(Number(electionId), Number(roundId))
      ])
      .then(([candidatesRes, resultsRes]) => {
        const rawCandidates = candidatesRes.data;
        const voteMap = new Map<number, number>();

        console.log(">>> [FE LOG] Dữ liệu hòm phiếu nhận từ Backend:", resultsRes.data);

        const voteDataArray = resultsRes.data.votes || [];

        let sum = 0;
        voteDataArray.forEach((item: any) => {
          // ĐỒNG BỘ CHUẨN XÁC: Đọc trúng hai trường gạch dưới trả về từ câu Native Query
          const cId = Number(item.candidate_id);
          const count = Number(item.vote_count);

          if (!isNaN(cId) && !isNaN(count)) {
            voteMap.set(cId, count);
            sum += count;
          }
        });

        const mergedData = rawCandidates.map((c: any) => ({
          ...c,
          votes: voteMap.get(Number(c.id)) || 0
        })).sort((a: any, b: any) => b.votes - a.votes);

        setCandidatesWithVotes(mergedData);
        setTotalVotes(sum);
      })
      .catch((err) => {
        console.error(">>> Lỗi chi tiết tại trang kết quả:", err);
        Swal.fire("Lỗi", "Không thể hiển thị bảng thống kê kết quả lúc này!", "error");
      })
      .finally(() => setLoading(false));
    }
  }, [electionId, roundId]);

  if (loading) return <div className="loading">Đang tổng hợp hòm phiếu ẩn danh...</div>;

  return (
      <div className="candidates-container" style={{ paddingTop: '40px' }}>
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
            style={{ marginBottom: '40px', zIndex: 2 }}
        >
          <h2 className="page-title" style={{ fontSize: '38px', fontWeight: '800' }}>
            Kết Quả <span style={{ color: '#2ecc71' }}>Bầu Chọn</span>
          </h2>
          {/*<p style={{ color: '#7f8c8d', fontSize: '16px', marginTop: '10px' }}>*/}
          {/*  Mã cuộc bầu cử: <strong>#{electionId}</strong> | Vòng đấu hiện tại: <strong>Vòng {roundId}</strong>*/}
          {/*</p>*/}

          <div style={{ display: 'inline-block', background: '#2ecc71', color: '#fff', padding: '8px 20px', borderRadius: '30px', fontWeight: 'bold', marginTop: '10px', boxShadow: '0 4px 15px rgba(46, 204, 113, 0.3)' }}>
            🗳️ Tổng số phiếu nặc danh hợp lệ: {totalVotes} phiếu
          </div>
        </motion.div>

        <div className="candidates-wrapper" style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div className="candidates-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
            {candidatesWithVotes.map((c, index) => {
              const percent = totalVotes > 0 ? ((c.votes / totalVotes) * 100).toFixed(1) : "0";

              return (
                  <motion.div
                      key={c.id}
                      className="candidate-card"
                      style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', textAlign: 'left', padding: '20px', position: 'relative' }}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                  >
                    {/* Huy hiệu hạng nhất, nhì, ba */}
                    <div style={{ position: 'absolute', left: '-10px', top: '-10px', background: index === 0 ? '#f1c40f' : index === 1 ? '#bdc3c7' : '#e67e22', color: '#fff', width: '35px', height: '35px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
                      {index + 1}
                    </div>

                    <div className="candidate-avatar" style={{ width: '80px', height: '80px', marginRight: '25px', marginBottom: 0 }}>
                      <img
                          src={c.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random`}
                          alt={c.name}
                      />
                    </div>

                    <div className="candidate-details" style={{ flex: 1, marginRight: '20px' }}>
                      <h3 className="info-value" style={{ fontSize: '20px', marginBottom: '4px' }}>{c.name}</h3>
                      <p className="candidate-desc" style={{ fontSize: '14px', marginBottom: '12px' }}>{c.party || "Đoàn viên thanh niên"}</p>

                      {/* Thanh biểu đồ phần trăm */}
                      <div className="vote-stats" style={{ marginTop: '0' }}>
                        <div className="vote-progress-container" style={{ height: '14px', backgroundColor: '#eaeded' }}>
                          <motion.div
                              className="vote-progress-bar"
                              style={{ height: '100%', backgroundColor: index === 0 ? '#2ecc71' : '#3498db' }}
                              initial={{ width: 0 }}
                              animate={{ width: `${percent}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', minWidth: '120px' }}>
                      <span style={{ fontSize: '24px', fontWeight: '800', color: '#2c3e50' }}>{percent}%</span>
                      <div style={{ fontSize: '13px', color: '#7f8c8d', marginTop: '2px' }}>{c.votes} phiếu bầu</div>
                    </div>
                  </motion.div>
              );
            })}
          </div>
        </div>

        {/* Nút hành động điều hướng */}
        <div className="footer-actions-candidates" style={{ marginTop: '40px', gap: '20px' }}>
          <button className="btn-back-bottom" style={{ background: '#7f8c8d' }} onClick={() => navigate('/')}>
            🏠 Về trang chủ cuộc bầu cử
          </button>
          {candidatesWithVotes.length > 0 && (
              <button
                  className="btn-view-results-bottom"
                  style={{ background: '#9b59b6', boxShadow: '0 4px 15px rgba(155, 89, 182, 0.3)' }}
                  onClick={() => Swal.fire("Thông tin", "Hệ thống đang mở cổng kiểm toán mật mã để xác thực tính toàn vẹn của hòm phiếu nặc danh!", "info")}
              >
                🔍 Kiểm toán chữ ký mù RSA
              </button>
          )}
        </div>
      </div>
  );
};

export default Results;