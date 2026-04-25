import {useEffect, useState} from 'react';
import {useSearchParams, useNavigate} from 'react-router-dom';
// Sửa phần import: sử dụng castVote thay vì api
import {getCandidates, castVote} from '../services/api';
import Swal from 'sweetalert2';
import '../assets/css/candidates.css';

const Candidates = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const electionId = searchParams.get('electionId');
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    if (electionId) {
      getCandidates(Number(electionId)).then(res => setCandidates(res.data));
    }
  }, [electionId]);

  const handleVote = async (candidateId: number, candidateName: string) => {
    const result = await Swal.fire({
      title: 'Xác nhận bỏ phiếu',
      text: `Bạn có chắc chắn muốn bầu cho ứng viên ${candidateName}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3498db',
      cancelButtonColor: '#95a5a6',
      confirmButtonText: 'Đồng ý',
      cancelButtonText: 'Hủy'
    });

    if (result.isConfirmed) {
      try {
        // Sử dụng hàm castVote đã import
        await castVote({
          electionId: Number(electionId),
          candidateId: candidateId
        });

        await Swal.fire('Thành công!', 'Phiếu bầu đã được ghi nhận.', 'success');
        navigate('/elections');
      } catch (error: any) {
        Swal.fire('Thất bại', 'Không thể bỏ phiếu. Vui lòng thử lại!', 'error');
      }
    }
  };

  return (
      <div className="candidates-container">
        <button className="btn-back" onClick={() => navigate('/elections')}>
          ← Quay lại
        </button>

        <main className="candidates-main">
          <div className="election-info">
            <h1>Danh Sách Ứng Viên</h1>
            <p>Mã cuộc bầu cử: #{electionId}</p>
          </div>

          <div className="candidates-grid">
            {candidates.map((candidate: any) => (
                <div key={candidate.id} className="candidate-card">
                  <div className="candidate-avatar">
                    <img
                        src={`https://ui-avatars.com/api/?name=${candidate.name}&background=random`}
                        alt={candidate.name}/>
                  </div>
                  <div className="candidate-info">
                    <h3>{candidate.name}</h3>
                    <p>{candidate.description}</p>
                    <button
                        className="btn-vote-now"
                        onClick={() => handleVote(candidate.id, candidate.name)}
                    >
                      Bỏ phiếu ngay
                    </button>
                  </div>
                </div>
            ))}
          </div>
        </main>
      </div>
  );
};

export default Candidates;