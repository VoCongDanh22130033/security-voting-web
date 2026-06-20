import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { electionApi } from '../../api/electionApi';
import type { Election } from '../../types/election';
import { motion } from 'framer-motion';
import './electionResults.css';

interface CandidateResult {
  id: number;
  name: string;
  voteCount: number;
  imageUrl: string;
  isAdvanced: boolean | null;
}

interface RoundResult {
  id: number;
  roundNumber: number;
  title: string;
  status: string;
  startTime?: string;
  endTime?: string;
  candidates: CandidateResult[];
}

const statusPill = (status?: string) => {
  const s = (status ?? '').toUpperCase();
  const map: Record<string, [string, string]> = {
    OPEN:     ['er-pill er-pill-open',     'Đang diễn ra'],
    CLOSED:   ['er-pill er-pill-closed',   'Đã kết thúc'],
    ENDED:    ['er-pill er-pill-ended',    'Đã kết thúc'],
    UPCOMING: ['er-pill er-pill-upcoming', 'Sắp diễn ra'],
  };
  const [cls, label] = map[s] ?? ['er-pill er-pill-upcoming', s];
  return <span className={cls}>{label}</span>;
};

const fmt = (v?: string) =>
  v ? new Date(v).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const ElectionResults: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [election, setElection] = useState<Election | null>(null);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
    if (!id) return;
    try {
      const electionRes = await electionApi.getById(id);
      setElection(electionRes.data);
    } catch (e) {
      console.error('Failed to fetch election:', e);
      setLoading(false);
      return;
    }
    try {
      const roundsRes = await electionApi.getRoundDetails(id);
      setRoundResults(roundsRes.data);
    } catch (e) {
      console.error('Failed to fetch round details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
    const t = setInterval(fetchResults, 5000);
    return () => clearInterval(t);
  }, [id]);

  useEffect(() => {
    const handler = (event: any) => {
      const n = event.detail;
      if (n.electionId?.toString() === id &&
          ['ROUND_CLOSED', 'ROUND_OPENED', 'ELECTION_CLOSED'].includes(n.type)) {
        fetchResults();
        setTimeout(fetchResults, 1500);
        setTimeout(fetchResults, 3500);
      }
    };
    window.addEventListener('election-realtime-notification', handler);
    return () => window.removeEventListener('election-realtime-notification', handler);
  }, [id]);

  if (loading && !election) return <div className="er-loading">Đang tải dữ liệu...</div>;
  if (!election)             return <div className="er-error">Không tìm thấy cuộc bầu cử.</div>;

  const electionStatus = (election.status ?? '').toUpperCase();
  const isFinished = ['CLOSED', 'ENDED'].includes(electionStatus);

  // Lấy winner từ round cuối cùng để hiển thị đúng số phiếu vòng chung kết
  const lastRound = roundResults.length > 0
    ? roundResults.reduce((a, b) => a.roundNumber > b.roundNumber ? a : b)
    : null;
  const winnerCandidate = lastRound
    ? lastRound.candidates.find((c) => c.id === election.winnerId)
    : roundResults.flatMap((r) => r.candidates).find((c) => c.id === election.winnerId);

  return (
    <div className="er-page">
      {/* ── Header ── */}
      <header className="er-header">
        <h1>{election.title}</h1>
        <div className="er-status-row">
          <span>Trạng thái:</span>
          {statusPill(election.status)}
        </div>
      </header>

      {/* ── Winner banner ── */}
      {isFinished && winnerCandidate && (
        <motion.div
          className="er-winner-banner"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <img
            className="er-winner-avatar"
            src={winnerCandidate.imageUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(winnerCandidate.name)}&background=f59e0b&color=fff`}
            alt={winnerCandidate.name}
          />
          <div className="er-winner-info">
            <div className="er-winner-label">Người chiến thắng chung cuộc</div>
            <div className="er-winner-name">{winnerCandidate.name}</div>
            <div className="er-winner-votes">{winnerCandidate.voteCount} phiếu bầu</div>
          </div>
          <div className="er-winner-crown">👑</div>
        </motion.div>
      )}

      {/* ── Rounds ── */}
      <div className="er-content">
        {roundResults.map((round, roundIdx) => {
          const isRoundDone = round.status === 'CLOSED' || round.status === 'CANCELLED';
          const isFinalRound = round.roundNumber === Math.max(...roundResults.map((r) => r.roundNumber));

          const totalVotes = isRoundDone
            ? round.candidates.reduce((s, c) => s + (c.voteCount ?? 0), 0)
            : 0;

          const sorted = isRoundDone
            ? [...round.candidates].sort((a, b) => b.voteCount - a.voteCount)
            : round.candidates;

          const finalWinnerId =
            election.winnerId ??
            (isFinalRound && isRoundDone ? sorted[0]?.id : null);

          return (
            <motion.div
              key={round.id}
              className="er-round-card"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: roundIdx * 0.15, duration: 0.4 }}
            >
              {/* round header */}
              <div className="er-round-header">
                <h2 className="er-round-title">
                  <span className="er-round-num">{round.roundNumber}</span>
                  {round.title || `Vòng ${round.roundNumber}`}
                </h2>
                {statusPill(round.status)}
              </div>

              {/* time */}
              <div className="er-round-meta">
                <span>🕐 Bắt đầu: <strong>{fmt(round.startTime)}</strong></span>
                <span>🏁 Kết thúc: <strong>{fmt(round.endTime)}</strong></span>
              </div>

              {isRoundDone && totalVotes > 0 && (
                <div className="er-total-votes">Tổng phiếu: <strong>{totalVotes}</strong></div>
              )}

              {/* candidates */}
              <div className="er-candidates">
                {sorted.map((candidate, ci) => {
                  const pct = totalVotes > 0
                    ? Math.round((candidate.voteCount / totalVotes) * 1000) / 10
                    : 0;
                  const isWinner = isFinalRound && isRoundDone && candidate.id === finalWinnerId;
                  const rankCls = ci === 0 ? 'er-rank er-rank-1'
                                : ci === 1 ? 'er-rank er-rank-2'
                                : ci === 2 ? 'er-rank er-rank-3'
                                : 'er-rank er-rank-n';

                  // result badge
                  let badge: React.ReactNode = null;
                  if (isRoundDone) {
                    if (isWinner) {
                      badge = <span className="er-result-badge er-badge-win">🏆 Thắng cuộc</span>;
                    } else if (!isFinalRound && candidate.isAdvanced) {
                      badge = <span className="er-result-badge er-badge-advanced">✨ Đi tiếp</span>;
                    } else if (!isFinalRound && candidate.isAdvanced === false) {
                      badge = <span className="er-result-badge er-badge-out">Bị Loại</span>;
                    } else if (isFinalRound && !isWinner) {
                      badge = <span className="er-result-badge er-badge-out">Bị Loại</span>;
                    }
                  } else {
                    badge = <span className="er-result-badge er-badge-pending">Đang kiểm</span>;
                  }

                  return (
                    <div
                      key={candidate.id}
                      className={`er-candidate-row ${isWinner ? 'is-winner' : ''} ${isRoundDone && !isWinner && isFinalRound ? 'is-eliminated' : ''}`}
                    >
                      {/* rank */}
                      <span className={rankCls}>{isRoundDone ? ci + 1 : '—'}</span>

                      {/* avatar */}
                      <img
                        className="er-candidate-avatar"
                        src={candidate.imageUrl ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name)}&background=random`}
                        alt={candidate.name}
                      />

                      {/* name + bar */}
                      <div className="er-candidate-info">
                        <div className="er-candidate-name">{candidate.name}</div>
                        <div className="er-bar-track">
                          <div
                            className={`er-bar-fill ${isWinner ? 'bar-winner' : ''}`}
                            style={{ width: isRoundDone ? `${pct}%` : '0%' }}
                          />
                        </div>
                      </div>

                      {/* vote count */}
                      <div className="er-vote-count">
                        {isRoundDone ? (
                          <>
                            {candidate.voteCount}
                            <div className="er-pct">{pct}%</div>
                          </>
                        ) : (
                          <span className="er-counting">—</span>
                        )}
                      </div>

                      {/* badge */}
                      <div style={{ textAlign: 'right' }}>{badge}</div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Back ── */}
      <div className="er-back">
        <Link to="/host-dashboard">&larr; Quay lại bảng điều khiển</Link>
      </div>
    </div>
  );
};

export default ElectionResults;
