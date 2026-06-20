import React, { useEffect, useMemo, useState } from "react";
import DateTimePicker24h from "../common/DateTimePicker24h";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { electionApi } from "../../api/electionApi";
import "./edit-election.css";

const fmtDT = (iso: string) => {
  if (!iso) return iso;
  const [date, time] = iso.replace("T", " ").split(" ");
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y} ${time}`;
};

interface Candidate {
  id?: number;
  name: string;
  party?: string;
  avatarUrl?: string;
  imageUrl?: string;
  base64Image?: string;
  description?: string;
}

interface RoundTimeConfig {
  id?: number;
  roundNumber: number;
  title?: string;
  description?: string;
  startTime: string;
  endTime: string;
  maxAdvanceCount: number;
}

const EditElection: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalRounds, setTotalRounds] = useState(1);
  const [electionImageBase64, setElectionImageBase64] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [participantFile, setParticipantFile] = useState<File | null>(null);
  const [roundsConfig, setRoundsConfig] = useState<RoundTimeConfig[]>([]);

  const [currentCandidates, setCurrentCandidates] = useState<Candidate[]>([]);
  const [localCandidates, setLocalCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<number[]>([]);

  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [manualFullName, setManualFullName] = useState("");
  const [manualCitizenId, setManualCitizenId] = useState("");
  const [addingParticipant, setAddingParticipant] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newParty, setNewParty] = useState("");
  const [newBio, setNewBio] = useState("");
  const [newImageBase64, setNewImageBase64] = useState("");

  const totalSelectedCount = selectedCandidateIds.length + localCandidates.length;

  const allTimeErrors = useMemo(() => {
    const errors: string[] = [];
    for (const round of roundsConfig) {
      if (round.startTime && round.endTime && new Date(round.startTime) >= new Date(round.endTime))
        errors.push(`Vòng ${round.roundNumber}: thời gian kết thúc phải sau thời gian bắt đầu.`);
      const prev = roundsConfig.find(r => r.roundNumber === round.roundNumber - 1);
      if (prev?.endTime && round.startTime && new Date(round.startTime) < new Date(prev.endTime))
        errors.push(`Vòng ${round.roundNumber} phải bắt đầu sau khi vòng ${prev.roundNumber} kết thúc (${fmtDT(prev.endTime)}).`);
    }
    return errors;
  }, [roundsConfig]);

  const maxCandidatesByRound = useMemo(() => {
    const limits: Record<number, number> = {};
    let available = totalSelectedCount;
    for (const round of roundsConfig) {
      limits[round.roundNumber] = available;
      if (round.roundNumber < totalRounds) {
        available = Number(round.maxAdvanceCount || 0);
      }
    }
    return limits;
  }, [roundsConfig, totalRounds, totalSelectedCount]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        return;
      }

      try {
        const [electionRes, roundsRes] = await Promise.all([
          electionApi.getById(id),
          electionApi.getElectionRounds(Number(id)),
        ]);

        const electionData = electionRes.data;
        const status = (electionData.status || "").toUpperCase();
        if (status === "OPEN" || status === "CLOSED") {
          await Swal.fire({
            icon: "warning",
            title: status === "OPEN" ? "Cuộc bầu cử đang diễn ra" : "Cuộc bầu cử đã kết thúc",
            text: "Không thể chỉnh sửa cuộc bầu cử trong trạng thái này.",
            confirmButtonColor: "#f59e0b",
          });
          navigate(-1);
          return;
        }
        setTitle(electionData.title || "");
        setDescription(electionData.description || "");
        setTotalRounds(electionData.totalRounds || 1);
        setPreviewImageUrl(electionData.image || electionData.imageUrl || "");

        const roundsData = [...(roundsRes.data || [])].sort((a: RoundTimeConfig, b: RoundTimeConfig) => a.roundNumber - b.roundNumber);
        setRoundsConfig(roundsData.map((round: any) => ({
          ...round,
          title: round.title || `Vòng ${round.roundNumber}`,
          description: round.description || "",
          startTime: round.startTime ? round.startTime.substring(0, 16) : "",
          endTime: round.endTime ? round.endTime.substring(0, 16) : "",
        })));

        const candidates = (electionData.candidates || []).map((candidate: any) => ({
          ...candidate,
          avatarUrl: candidate.avatarUrl || candidate.imageUrl,
        }));
        setCurrentCandidates(candidates);
        setSelectedCandidateIds(candidates.map((candidate: Candidate) => candidate.id).filter(Boolean) as number[]);
      } catch (error) {
        console.error("Lỗi tải dữ liệu cuộc bầu cử:", error);
        Swal.fire("Lỗi", "Không thể tải dữ liệu để chỉnh sửa.", "error");
      }
    };

    fetchData();
  }, [id]);

  const readImageFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string>>,
    afterRead?: (base64: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string) || "";
      setter(base64);
      afterRead?.(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleParticipantFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (rows.length === 0) {
          Swal.fire("File trống", "File Excel không có dữ liệu.", "warning");
          return;
        }
        const headers = Object.keys(rows[0]).map(h => h.trim().toLowerCase());
        const required = ["email", "full_name", "citizen_id"];
        const missing = required.filter(col => !headers.includes(col));
        if (missing.length > 0) {
          Swal.fire("File không đúng định dạng", `Thiếu cột: <b>${missing.join(", ")}</b><br/>File cần có đúng 3 cột: <b>email, full_name, citizen_id</b>`, "error");
          return;
        }
        setParticipantFile(file);
      } catch {
        Swal.fire("Lỗi", "Không đọc được file. Vui lòng dùng đúng định dạng .xlsx/.xls", "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleAddParticipantManual = async () => {
    if (!manualEmail.trim() || !manualFullName.trim() || !manualCitizenId.trim()) {
      Swal.fire("Thiếu thông tin", "Vui lòng điền đầy đủ email, họ tên và CCCD.", "warning");
      return;
    }
    if (!id) return;
    setAddingParticipant(true);
    try {
      const ws = XLSX.utils.aoa_to_sheet([
        ["email", "full_name", "citizen_id"],
        [manualEmail.trim(), manualFullName.trim(), manualCitizenId.trim()],
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const wbArrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const file = new File([wbArrayBuffer], "participant.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      await electionApi.importParticipants(id, file);
      Swal.fire("Thành công!", `Đã thêm người tham gia: ${manualFullName.trim()}`, "success");
      setShowAddParticipantModal(false);
      setManualEmail("");
      setManualFullName("");
      setManualCitizenId("");
    } catch (err: any) {
      Swal.fire("Thất bại", err.response?.data?.message || err.response?.data || "Không thể thêm người tham gia.", "error");
    } finally {
      setAddingParticipant(false);
    }
  };

  const handleTotalRoundsChange = (rounds: number) => {
    const minRequired = rounds + 1;
    if (totalSelectedCount > 0 && totalSelectedCount < minRequired) {
      Swal.fire("Không đủ ứng viên", `${rounds} vòng bầu cử cần ít nhất <b>${minRequired} ứng viên</b> (hiện có ${totalSelectedCount}).`, "warning");
      return;
    }
    setTotalRounds(rounds);
    setRoundsConfig(previous => {
      const next: RoundTimeConfig[] = [];
      for (let i = 1; i <= rounds; i += 1) {
        const existing = previous.find(round => round.roundNumber === i);
        next.push(existing || {
          roundNumber: i,
          title: `Vòng ${i}`,
          description: "",
          startTime: "",
          endTime: "",
          maxAdvanceCount: i === rounds ? 1 : (rounds - i + 1),
        });
      }
      return next.map(round => ({
        ...round,
        maxAdvanceCount: round.roundNumber === rounds ? 1 : Math.max(round.maxAdvanceCount || 0, rounds - round.roundNumber + 1),
      }));
    });
  };

  const handleRoundConfigChange = (roundNum: number, field: keyof RoundTimeConfig, value: any) => {
    setRoundsConfig(previous =>
      previous.map(round => round.roundNumber === roundNum ? { ...round, [field]: value } : round)
    );
  };

  const handleCandidateChange = (candidateId: number, field: keyof Candidate, value: string) => {
    setCurrentCandidates(previous =>
      previous.map(candidate => candidate.id === candidateId ? { ...candidate, [field]: value } : candidate)
    );
  };

  const handleCandidateImageChange = (candidateId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    readImageFile(e, () => undefined as any, base64 => {
      setCurrentCandidates(previous =>
        previous.map(candidate => candidate.id === candidateId ? { ...candidate, base64Image: base64, avatarUrl: base64 } : candidate)
      );
    });
  };

  const handleToggleCandidate = (candidateId: number) => {
    setSelectedCandidateIds(previous =>
      previous.includes(candidateId)
        ? previous.filter(id => id !== candidateId)
        : [...previous, candidateId]
    );
  };

  const handleAddCandidateToLocalList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      Swal.fire("Cảnh báo", "Vui lòng nhập tên ứng viên.", "warning");
      return;
    }
    setLocalCandidates(previous => [
      ...previous,
      {
        name: newName.trim(),
        party: newParty.trim(),
        description: newBio.trim(),
        base64Image: newImageBase64,
      },
    ]);
    setNewName("");
    setNewParty("");
    setNewBio("");
    setNewImageBase64("");
  };

  const validateRounds = () => {
    for (const round of roundsConfig) {
      if (!round.startTime || !round.endTime) {
        Swal.fire("Cảnh báo", `Vui lòng nhập đủ thời gian cho vòng ${round.roundNumber}.`, "warning");
        return false;
      }
      if (new Date(round.startTime) >= new Date(round.endTime)) {
        Swal.fire("Cảnh báo", `Thời gian kết thúc vòng ${round.roundNumber} phải sau thời gian bắt đầu.`, "warning");
        return false;
      }
      if (round.roundNumber < totalRounds) {
        const nextRound = roundsConfig.find(r => r.roundNumber === round.roundNumber + 1);
        if (nextRound && nextRound.startTime) {
          const currentEnd = new Date(round.endTime);
          const nextStart = new Date(nextRound.startTime);
          if (nextStart < currentEnd) {
            Swal.fire(
              "Thời gian bị trùng",
              `Vòng ${nextRound.roundNumber} bắt đầu lúc <b>${fmtDT(nextRound.startTime)}</b> nhưng vòng ${round.roundNumber} chưa kết thúc đến <b>${fmtDT(round.endTime)}</b>.<br/><br/>Vòng ${nextRound.roundNumber} phải bắt đầu sau khi vòng ${round.roundNumber} kết thúc.`,
              "warning"
            );
            return false;
          }
        }
        const minAdvance = totalRounds - round.roundNumber + 1;
        if (round.maxAdvanceCount < minAdvance) {
          Swal.fire(
            "Cảnh báo",
            `Vòng ${round.roundNumber} phải chuyển ít nhất <b>${minAdvance} ứng viên</b> lên vòng tiếp theo để đảm bảo mỗi vòng có đủ 2 người tranh cử.`,
            "warning"
          );
          return false;
        }
        const available = maxCandidatesByRound[round.roundNumber] || 0;
        if (round.maxAdvanceCount >= available) {
          Swal.fire(
            "Cảnh báo",
            `Số ứng viên vào vòng ${round.roundNumber + 1} phải nhỏ hơn ${available} ứng viên đang có ở vòng ${round.roundNumber}.`,
            "warning"
          );
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmitElection = async (e: React.FormEvent) => {
    e.preventDefault();

    const minCandidatesRequired = totalRounds + 1;
    if (totalSelectedCount < minCandidatesRequired) {
      Swal.fire("Không đủ ứng viên", `${totalRounds} vòng bầu cử cần ít nhất <b>${minCandidatesRequired} ứng viên</b> (hiện có ${totalSelectedCount}).`, "warning");
      return;
    }
    if (!validateRounds()) {
      return;
    }

    Swal.fire({
      title: "Đang cập nhật...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const selectedCurrentCandidates = currentCandidates.filter(candidate => candidate.id && selectedCandidateIds.includes(candidate.id));
      const payload = {
        title,
        description,
        totalRounds,
        base64Image: electionImageBase64,
        roundsTimeSettings: roundsConfig.map(round => ({
          ...round,
          title: round.title?.trim() || `Vòng ${round.roundNumber}`,
          maxAdvanceCount: round.roundNumber === totalRounds ? 1 : round.maxAdvanceCount,
          startTime: round.startTime.length === 16 ? `${round.startTime}:00` : round.startTime,
          endTime: round.endTime.length === 16 ? `${round.endTime}:00` : round.endTime,
        })),
        candidateIds: selectedCandidateIds,
        newCandidates: localCandidates,
        updatedCandidates: selectedCurrentCandidates.map(candidate => ({
          id: candidate.id,
          name: candidate.name,
          party: candidate.party,
          description: candidate.description,
          base64Image: candidate.base64Image,
        })),
      };

      await electionApi.update(Number(id), payload);
      if (participantFile && id) {
        await electionApi.importParticipants(id, participantFile);
      }
      await Swal.fire("Thành công", "Cuộc bầu cử đã được cập nhật.", "success");
      navigate("/host-dashboard");
    } catch (err: any) {
      const message = typeof err.response?.data === "string"
        ? err.response.data
        : err.response?.data?.message || "Có lỗi xảy ra khi cập nhật.";
      Swal.fire("Thất bại", message, "error");
    }
  };

  return (
    <>
    {allTimeErrors.length > 0 && (
      <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 20px", boxShadow: "0 4px 20px rgba(220,38,38,0.15)", maxWidth: 520, width: "90%" }}>
        <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 6, fontSize: 13 }}>⚠ Lỗi thời gian</div>
        {allTimeErrors.map((err, i) => (
          <div key={i} style={{ color: "#dc2626", fontSize: 12, lineHeight: 1.6 }}>• {err}</div>
        ))}
      </div>
    )}
    <div className="profile-container" style={{ maxWidth: 920, margin: "30px auto", padding: 25, background: "#fff", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
      <div className="info-section">
        <div style={{ position: "relative", marginBottom: 24, textAlign: "center" }}>
          <button type="button" onClick={() => navigate(-1)} style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, color: "#475569", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
            ← Quay lại
          </button>
          <h2 style={{ margin: 0, color: "#2c3e50", fontWeight: 700 }}>Chỉnh sửa cuộc bầu cử</h2>
        </div>
        <form onSubmit={handleSubmitElection} className="edit-form">
          <div style={{ marginBottom: 25, paddingBottom: 15, borderBottom: "1px solid #eaedf1" }}>
            <div className="form-group">
              <label>Tên cuộc bầu cử <span style={{ color: "red" }}>*</span></label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            <div className="form-group" style={{ marginTop: 15 }}>
              <label>Mô tả</label>
              <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #ccc" }} />
            </div>

            <div className="form-group" style={{ marginTop: 15 }}>
              <label>Ảnh đại diện</label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 6, padding: "9px 18px", background: "linear-gradient(135deg,#0ea5e9,#2563eb)", color: "#fff", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 8px rgba(37,99,235,0.25)", transition: "opacity 0.2s" }}
                onMouseOver={e => (e.currentTarget.style.opacity = "0.85")} onMouseOut={e => (e.currentTarget.style.opacity = "1")}>
                🖼️ Chọn ảnh đại diện
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => readImageFile(e, setElectionImageBase64, setPreviewImageUrl)} />
              </label>
              {previewImageUrl && (
                <div style={{ marginTop: 12 }}>
                  <img src={previewImageUrl} alt="Preview" style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 8 }} />
                </div>
              )}
            </div>

            <div className="form-group edit-election-file-panel" style={{ marginTop: 15 }}>
              <label>File Excel danh sách người tham gia</label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 6, padding: "9px 18px", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 8px rgba(16,185,129,0.25)", transition: "opacity 0.2s" }}
                onMouseOver={e => (e.currentTarget.style.opacity = "0.85")} onMouseOut={e => (e.currentTarget.style.opacity = "1")}>
                📊 Chọn file Excel (.xlsx)
                <input type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleParticipantFileChange} />
              </label>
              {participantFile && (
                <p className="edit-election-file-name" style={{ marginTop: 8, color: "#059669", fontWeight: 600, fontSize: 13 }}>✅ Đã chọn: {participantFile.name}</p>
              )}
              <p className="edit-election-file-hint">
                File cần có các cột: email, full_name, citizen_id. Chỉ chọn file khi muốn import thêm danh sách người tham gia.
              </p>
              <button
                type="button"
                onClick={() => setShowAddParticipantModal(true)}
                style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                ➕ Thêm thủ công
              </button>
            </div>

            {/* Modal thêm người tham gia thủ công */}
            {showAddParticipantModal && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: 420, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
                  <h3 style={{ margin: "0 0 20px", color: "#166534", fontWeight: 700, fontSize: 16 }}>Thêm người tham gia thủ công</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Email <span style={{ color: "red" }}>*</span></label>
                      <input
                        type="email"
                        value={manualEmail}
                        onChange={e => setManualEmail(e.target.value)}
                        placeholder="example@email.com"
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Họ và tên <span style={{ color: "red" }}>*</span></label>
                      <input
                        type="text"
                        value={manualFullName}
                        onChange={e => setManualFullName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Số CCCD / CMND <span style={{ color: "red" }}>*</span></label>
                      <input
                        type="text"
                        value={manualCitizenId}
                        onChange={e => setManualCitizenId(e.target.value)}
                        placeholder="079123456789"
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => { setShowAddParticipantModal(false); setManualEmail(""); setManualFullName(""); setManualCitizenId(""); }}
                      style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid #d1d5db", background: "#f9fafb", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleAddParticipantManual}
                      disabled={addingParticipant}
                      style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: addingParticipant ? "#86efac" : "#16a34a", color: "#fff", fontSize: 13, fontWeight: 600, cursor: addingParticipant ? "not-allowed" : "pointer" }}
                    >
                      {addingParticipant ? "Đang thêm..." : "Xác nhận thêm"}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

          <div style={{ marginBottom: 25, padding: 15, borderRadius: 8, background: "#f0fdf4", border: "1px dashed #2ecc71" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h4 style={{ color: "#166534", fontSize: 14, margin: 0, fontWeight: 600 }}>Thêm ứng viên mới</h4>
              <button type="button" onClick={() => setShowAddForm(!showAddForm)} style={{ padding: "6px 10px", background: showAddForm ? "#dc2626" : "#16a34a", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>
                {showAddForm ? "Đóng khung nhập" : "Mở khung nhập"}
              </button>
            </div>

            {showAddForm && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label style={{ fontSize: 12 }}>Họ và tên ứng viên <span style={{ color: "red" }}>*</span></label>
                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nhập tên..." style={{ padding: 8 }} />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: 12 }}>Tổ chức / đơn vị</label>
                    <input type="text" value={newParty} onChange={e => setNewParty(e.target.value)} placeholder="Ví dụ: Khoa CNTT" style={{ padding: 8 }} />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 12 }}>Mô tả ngắn</label>
                  <input type="text" value={newBio} onChange={e => setNewBio(e.target.value)} placeholder="Thành tích, chương trình hành động..." style={{ padding: 8 }} />
                </div>
                <div className="form-group" style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 12 }}>Ảnh đại diện ứng viên</label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 6, padding: "8px 16px", background: "linear-gradient(135deg,#0ea5e9,#2563eb)", color: "#fff", borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: "pointer", boxShadow: "0 2px 8px rgba(37,99,235,0.25)", transition: "opacity 0.2s" }}
                    onMouseOver={e => (e.currentTarget.style.opacity = "0.85")} onMouseOut={e => (e.currentTarget.style.opacity = "1")}>
                    🖼️ Chọn ảnh ứng viên
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => readImageFile(e, setNewImageBase64)} />
                  </label>
                </div>
                <button type="button" onClick={handleAddCandidateToLocalList} style={{ marginTop: 10, width: "100%", padding: 9, background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Lưu tạm ứng viên mới
                </button>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 30 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
              <h4 style={{ color: "#2c3e50", fontSize: 15, margin: 0 }}>
                Danh sách ứng viên của cuộc bầu cử: <strong style={{ color: "#2ecc71" }}>{totalSelectedCount}</strong>
              </h4>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 16px", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 8px rgba(245,158,11,0.3)", transition: "opacity 0.2s" }}
                onMouseOver={e => (e.currentTarget.style.opacity = "0.85")} onMouseOut={e => (e.currentTarget.style.opacity = "1")}>
                📥 Import ứng viên từ Excel
                <input type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={async e => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file || !id) return;
                  Swal.fire({ title: "Đang import...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                  try {
                    const res = await electionApi.importCandidates(id, file);
                    const count = res.data?.count ?? 0;
                    const electionRes = await electionApi.getById(id);
                    const candidates = (electionRes.data.candidates || []).map((c: any) => ({ ...c, avatarUrl: c.avatarUrl || c.imageUrl }));
                    setCurrentCandidates(candidates);
                    setSelectedCandidateIds(prev => [...new Set([...prev, ...candidates.map((c: any) => c.id).filter(Boolean)])]);
                    Swal.fire("Thành công!", `Đã import ${count} ứng viên.`, "success");
                  } catch (err: any) {
                    Swal.fire("Thất bại", err.response?.data || "Lỗi khi import file Excel.", "error");
                  }
                }} />
              </label>
            </div>
            <div style={{ maxHeight: 520, overflowY: "auto", border: "1px solid #e2e8f0", padding: 15, borderRadius: 10, background: "#f8fafc" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 15 }}>
                {currentCandidates.map(candidate => (
                  <EditableCandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    selected={candidate.id ? selectedCandidateIds.includes(candidate.id) : false}
                    onToggle={() => candidate.id && handleToggleCandidate(candidate.id)}
                    onChange={(field, value) => candidate.id && handleCandidateChange(candidate.id, field, value)}
                    onImageChange={event => candidate.id && handleCandidateImageChange(candidate.id, event)}
                  />
                ))}

                {localCandidates.map((candidate, index) => (
                  <CandidatePreviewCard
                    key={`local-${index}`}
                    candidate={candidate}
                    onRemove={() => setLocalCandidates(previous => previous.filter((_, i) => i !== index))}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>Số vòng <span style={{ color: "red" }}>*</span></label>
            <select value={totalRounds} onChange={e => handleTotalRoundsChange(Number(e.target.value))} style={{ width: "100%", padding: 11, borderRadius: 6 }}>
              {[...Array(10)].map((_, index) => (
                <option key={index + 1} value={index + 1}>{index + 1} vòng</option>
              ))}
            </select>
            {totalSelectedCount > 0 && totalSelectedCount < totalRounds + 1 && (
              <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 6, background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", fontSize: 13, fontWeight: 500 }}>
                Không đủ ứng viên: {totalRounds} vòng cần tối thiểu {totalRounds + 1} ứng viên, hiện chỉ có {totalSelectedCount}.
              </div>
            )}
          </div>

          <div style={{ marginBottom: 25 }}>
            {roundsConfig.map(round => {
              const available = maxCandidatesByRound[round.roundNumber] || 0;
              const prevRound = roundsConfig.find(r => r.roundNumber === round.roundNumber - 1);
              const timeErrors: string[] = [];
              if (round.startTime && round.endTime && new Date(round.startTime) >= new Date(round.endTime))
                timeErrors.push(`Thời gian kết thúc phải sau thời gian bắt đầu.`);
              if (prevRound?.endTime && round.startTime && new Date(round.startTime) < new Date(prevRound.endTime))
                timeErrors.push(`Vòng ${round.roundNumber} phải bắt đầu sau khi vòng ${prevRound.roundNumber} kết thúc (${fmtDT(prevRound.endTime)}).`);
              return (
                <div key={round.roundNumber} style={{ padding: 15, background: "#f8fafc", borderRadius: 8, marginBottom: 15, border: `1px solid ${timeErrors.length ? "#fca5a5" : "#e2e8f0"}` }}>
                  <h5 style={{ margin: "0 0 10px 0", color: "#1e293b" }}>Vòng {round.roundNumber}</h5>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                    <div className="form-group">
                      <label>Tên vòng</label>
                      <input type="text" value={round.title || ""} onChange={e => handleRoundConfigChange(round.roundNumber, "title", e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Mô tả vòng</label>
                      <input type="text" value={round.description || ""} onChange={e => handleRoundConfigChange(round.roundNumber, "description", e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Bắt đầu</label>
                      <DateTimePicker24h required value={round.startTime} onChange={v => handleRoundConfigChange(round.roundNumber, "startTime", v)} />
                    </div>
                    <div className="form-group">
                      <label>Kết thúc</label>
                      <DateTimePicker24h required value={round.endTime} onChange={v => handleRoundConfigChange(round.roundNumber, "endTime", v)} />
                    </div>
                  </div>
                  {timeErrors.length > 0 && (
                    <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 6, background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", fontSize: 12, fontWeight: 500, display: "flex", flexDirection: "column", gap: 4 }}>
                      {timeErrors.map((err, i) => <span key={i}>⚠ {err}</span>)}
                    </div>
                  )}
                  {round.roundNumber < totalRounds && (() => {
                    const nextR = roundsConfig.find(r => r.roundNumber === round.roundNumber + 1);
                    const minAdv = totalRounds - round.roundNumber + 1;
                    const maxAdv = Math.max(minAdv, available - 1);
                    return (
                      <div className="form-group" style={{ marginTop: 12 }}>
                        <label style={{ fontSize: 12, color: "#166534", fontWeight: 600 }}>
                          Số ứng viên vào vòng {round.roundNumber + 1} (tối thiểu {minAdv}, tối đa {available - 1})
                        </label>
                        <input type="number" min={minAdv} max={maxAdv} required value={round.maxAdvanceCount} onChange={e => handleRoundConfigChange(round.roundNumber, "maxAdvanceCount", Math.max(minAdv, Number(e.target.value)))} style={{ width: "100%", maxWidth: 200 }} />
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          <div className="action-section">
            <button type="submit" className="change-password-btn" style={{ width: "100%", padding: 14, background: "#3498db", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
};

const EditableCandidateCard: React.FC<{
  candidate: Candidate;
  selected: boolean;
  onToggle: () => void;
  onChange: (field: keyof Candidate, value: string) => void;
  onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ candidate, selected, onToggle, onChange, onImageChange }) => {
  const imgInputRef = React.useRef<HTMLInputElement>(null);
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const image = candidate.base64Image || candidate.avatarUrl || candidate.imageUrl;
  return (
    <div className={`edit-candidate-card ${selected ? "is-selected" : ""}`}>
      {/* Avatar */}
      <div className="edit-candidate-avatar">
        {image ? <img src={image} alt={candidate.name} /> : <span>{candidate.name.charAt(0).toUpperCase()}</span>}
      </div>

      {/* Info + actions */}
      <div className="edit-candidate-body">
        <div className="edit-candidate-info">
          <input
            ref={nameInputRef}
            className="ec-input ec-input-name"
            type="text"
            value={candidate.name}
            onChange={e => onChange("name", e.target.value)}
            placeholder="Tên ứng viên"
          />
          <input
            className="ec-input ec-input-party"
            type="text"
            value={candidate.party || ""}
            onChange={e => onChange("party", e.target.value)}
            placeholder="Tổ chức / đơn vị"
          />
          <input
            className="ec-input ec-input-desc"
            type="text"
            value={candidate.description || ""}
            onChange={e => onChange("description", e.target.value)}
            placeholder="Mô tả ứng viên"
          />
        </div>

        <div className="edit-candidate-footer">
          <div className="edit-candidate-actions">
            <button type="button" className="ec-action-btn ec-btn-photo" title="Đổi ảnh" onClick={() => imgInputRef.current?.click()}>
              <i className="ti ti-camera" />
              <input ref={imgInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onImageChange} />
            </button>
            <button type="button" className="ec-action-btn ec-btn-edit" title="Chỉnh sửa" onClick={() => nameInputRef.current?.focus()}>
              <i className="ti ti-pencil" />
            </button>
            <button type="button" className="ec-action-btn ec-btn-delete" title="Xóa ứng viên" onClick={onToggle}>
              <i className="ti ti-trash" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CandidatePreviewCard: React.FC<{ candidate: Candidate; onRemove: () => void }> = ({ candidate, onRemove }) => {
  const image = candidate.base64Image || candidate.avatarUrl || candidate.imageUrl;
  return (
    <div className="edit-candidate-preview-card">
      <button type="button" onClick={onRemove} className="edit-candidate-remove">x</button>
      <div className="edit-candidate-preview-avatar">
        {image ? <img src={image} alt={candidate.name} /> : <span>{candidate.name.charAt(0).toUpperCase()}</span>}
      </div>
      <div>
        <h5 style={{ margin: "0 0 3px 0", fontSize: 14, color: "#166534" }}>{candidate.name}</h5>
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{candidate.description || "Ứng viên mới"}</p>
      </div>
    </div>
  );
};

export default EditElection;
