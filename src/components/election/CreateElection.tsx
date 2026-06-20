import React, { useEffect, useMemo, useState } from "react";
import DateTimePicker24h from "../common/DateTimePicker24h";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { electionApi } from "../../api/electionApi";
import * as XLSX from "xlsx";

const fmtDT = (iso: string) => {
  if (!iso) return iso;
  const [date, time] = iso.replace("T", " ").split(" ");
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y} ${time}`;
};

interface Candidate {
  id?: number;
  _uid?: string;
  name: string;
  party?: string;
  avatarUrl?: string;
  imageUrl?: string;
  base64Image?: string;
  description?: string;
  isNew?: boolean;
}

interface RoundTimeConfig {
  roundNumber: number;
  startTime: string;
  endTime: string;
  maxAdvanceCount: number;
  title?: string;
  description?: string;
}

const emptyRound = (roundNumber: number): RoundTimeConfig => ({
  roundNumber,
  startTime: "",
  endTime: "",
  maxAdvanceCount: 2,
  title: `Vòng ${roundNumber}`,
  description: "",
});

interface CreateElectionProps {
  onCreated?: () => void;
  onBack?: () => void;
}

export const CreateElection: React.FC<CreateElectionProps> = ({ onCreated, onBack }) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalRounds, setTotalRounds] = useState(1);
  const [electionImageBase64, setElectionImageBase64] = useState("");
  const [participantFile, setParticipantFile] = useState<File | null>(null);
  const [roundsConfig, setRoundsConfig] = useState<RoundTimeConfig[]>([emptyRound(1)]);

  const [localCandidates, setLocalCandidates] = useState<Candidate[]>([]);
  // useRef: không bị stale-closure/batching, mutation trực tiếp không mất dữ liệu
  const candidateImagesRef = React.useRef<Record<string, string>>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Candidate>({ name: "", party: "", description: "" });
  const [editPreviewImage, setEditPreviewImage] = useState<string>("");

  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [manualFullName, setManualFullName] = useState("");
  const [manualCitizenId, setManualCitizenId] = useState("");
  const [manualParticipants, setManualParticipants] = useState<{ email: string; full_name: string; citizen_id: string }[]>([]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newParty, setNewParty] = useState("");
  const [newBio, setNewBio] = useState("");
  const [newImageBase64, setNewImageBase64] = useState("");

  const totalSelectedCount = localCandidates.length;

  const downloadSampleExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["email", "full_name", "citizen_id"],
      ["nguyenvana@example.com", "Nguyễn Văn A", "079123456789"],
      ["tranthib@example.com", "Trần Thị B", "079987654321"],
      ["lehongc@example.com", "Lê Hồng C", "079111222333"],
    ]);
    ws["!cols"] = [{ wch: 30 }, { wch: 25 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh sách");
    XLSX.writeFile(wb, "mau_danh_sach_tham_gia.xlsx");
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
          const detected = Object.keys(rows[0]).join(", ") || "(không đọc được)";
          Swal.fire({
            title: "Thiếu cột bắt buộc",
            html: `
              <div style="text-align:left;font-size:14px;line-height:1.8">
                <p>File của bạn thiếu <b style="color:#dc2626">${missing.length}</b> cột bắt buộc:</p>
                <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 12px;margin:8px 0">
                  ${missing.map(c => `<code style="color:#dc2626">${c}</code>`).join("<br/>")}
                </div>
                <p style="color:#6b7280;font-size:13px">Các cột hệ thống đọc được từ file:</p>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;font-size:12px;color:#475569">${detected}</div>
                <p style="margin-top:10px">👉 Tải <b>file mẫu</b> để xem đúng định dạng cần dùng.</p>
              </div>`,
            icon: "error",
            confirmButtonText: "Tải file mẫu",
            showCancelButton: true,
            cancelButtonText: "Đóng",
            confirmButtonColor: "#16a34a",
          }).then(r => { if (r.isConfirmed) downloadSampleExcel(); });
          return;
        }
        setParticipantFile(file);
      } catch {
        Swal.fire("Lỗi", "Không đọc được file. Vui lòng dùng đúng định dạng .xlsx/.xls/.csv", "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleAddParticipantManual = () => {
    if (!manualEmail.trim() || !manualFullName.trim() || !manualCitizenId.trim()) {
      Swal.fire("Thiếu thông tin", "Vui lòng điền đầy đủ email, họ tên và CCCD.", "warning");
      return;
    }
    const duplicate = manualParticipants.some(p => p.email.toLowerCase() === manualEmail.trim().toLowerCase());
    if (duplicate) {
      Swal.fire("Trùng email", "Email này đã có trong danh sách.", "warning");
      return;
    }
    setManualParticipants(prev => [...prev, { email: manualEmail.trim(), full_name: manualFullName.trim(), citizen_id: manualCitizenId.trim() }]);
    setManualEmail("");
    setManualFullName("");
    setManualCitizenId("");
  };

  const downloadCandidateSample = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["name", "party", "description", "image_url"],
      ["Nguyễn Văn A", "Khoa CNTT", "Cựu sinh viên xuất sắc năm 2024", "https://example.com/avatar1.jpg"],
      ["Trần Thị B", "Khoa Kinh tế", "Đại diện hội sinh viên khoa", "https://example.com/avatar2.jpg"],
      ["Lê Hồng C", "Khoa Cơ khí", "Thành tích học tập xuất sắc", ""],
    ]);
    ws["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 40 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ứng viên");
    XLSX.writeFile(wb, "mau_ung_vien.xlsx");
  };

  const handleImportCandidates = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
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
        const required = ["name"];
        const missing = required.filter(col => !headers.includes(col));
        if (missing.length > 0) {
          const detected = Object.keys(rows[0]).join(", ") || "(không đọc được)";
          Swal.fire({
            title: "Thiếu cột bắt buộc",
            html: `
              <div style="text-align:left;font-size:14px;line-height:1.8">
                <p>File của bạn thiếu <b style="color:#dc2626">${missing.length}</b> cột bắt buộc:</p>
                <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 12px;margin:8px 0">
                  ${missing.map(c => `<code style="color:#dc2626">${c}</code>`).join("<br/>")}
                </div>
                <p style="color:#6b7280;font-size:13px">Các cột hệ thống đọc được từ file:</p>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;font-size:12px;color:#475569">${detected}</div>
                <p style="margin-top:10px">👉 Tải <b>file mẫu</b> để xem đúng định dạng cần dùng.</p>
              </div>`,
            icon: "error",
            confirmButtonText: "Tải file mẫu",
            showCancelButton: true,
            cancelButtonText: "Đóng",
            confirmButtonColor: "#16a34a",
          }).then(r => { if (r.isConfirmed) downloadCandidateSample(); });
          return;
        }
        const imported: Candidate[] = rows
          .map(r => {
            const uid = `c-${Date.now()}-${Math.random()}`;
            const imgUrl = String(r.image_url || r["Hình ảnh"] || "").trim();
            return {
              _uid: uid,
              name: String(r.name || r.Name || r["Họ và tên"] || "").trim(),
              party: String(r.party || r.Party || r["Tổ chức"] || "").trim(),
              description: String(r.description || r.Description || r["Mô tả"] || "").trim(),
              avatarUrl: imgUrl || undefined,
            };
          })
          .filter(c => c.name);
        if (imported.length === 0) {
          Swal.fire("Không có dữ liệu hợp lệ", "File không có dòng nào có tên ứng viên.", "warning");
          return;
        }
        setLocalCandidates(prev => [...prev, ...imported]);
        Swal.fire("Thành công", `Đã thêm ${imported.length} ứng viên từ file`, "success");
      } catch {
        Swal.fire("Lỗi", "Không đọc được file. Vui lòng dùng đúng định dạng .xlsx/.xls", "error");
      }
    };
    reader.readAsBinaryString(file);
  };

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


  const readImageFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setter((reader.result as string) || "");
    reader.readAsDataURL(file);
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
        const existing = previous.find(r => r.roundNumber === i);
        next.push({
          ...(existing || emptyRound(i)),
          maxAdvanceCount: i === rounds ? 1 : Math.max(existing?.maxAdvanceCount || 0, rounds - i + 1),
        });
      }
      return next;
    });
  };

  const handleRoundConfigChange = (roundNum: number, field: keyof RoundTimeConfig, value: any) => {
    setRoundsConfig(previous =>
      previous.map(round => round.roundNumber === roundNum ? { ...round, [field]: value } : round)
    );
  };

  const handleAddCandidateToLocalList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      Swal.fire("Cảnh báo", "Vui lòng nhập họ và tên ứng viên.", "warning");
      return;
    }

    const uid = `c-${Date.now()}-${Math.random()}`;
    if (newImageBase64) {
      candidateImagesRef.current[uid] = newImageBase64;
    }
    setLocalCandidates(previous => [
      ...previous,
      {
        _uid: uid,
        name: newName.trim(),
        party: newParty.trim(),
        description: newBio.trim(),
        isNew: true,
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
      // Kiểm tra vòng sau không được nằm trong khoảng thời gian vòng trước
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
    if (!participantFile && manualParticipants.length === 0) {
      Swal.fire("Cảnh báo", "Vui lòng chọn file Excel hoặc thêm ít nhất 1 người tham gia thủ công.", "warning");
      return;
    }
    if (!validateRounds()) {
      return;
    }

    Swal.fire({
      title: "Đang tạo cuộc bầu cử...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    // Gộp file Excel + danh sách thủ công thành 1 file
    let finalFile = participantFile;
    if (manualParticipants.length > 0) {
      let rows: { email: string; full_name: string; citizen_id: string }[] = [...manualParticipants];
      if (participantFile) {
        const buf = await participantFile.arrayBuffer();
        const wb0 = XLSX.read(buf, { type: "array" });
        const ws0 = wb0.Sheets[wb0.SheetNames[0]];
        const existing: any[] = XLSX.utils.sheet_to_json(ws0, { defval: "" });
        rows = [...existing.map(r => ({ email: String(r.email || ""), full_name: String(r.full_name || ""), citizen_id: String(r.citizen_id || "") })), ...manualParticipants];
      }
      const ws = XLSX.utils.json_to_sheet(rows, { header: ["email", "full_name", "citizen_id"] });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const arr = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      finalFile = new File([arr], "participants.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    }

    try {
      const payload = {
        title,
        description,
        totalRounds,
        base64Image: electionImageBase64,
        roundsTimeSettings: roundsConfig.map(round => ({
          ...round,
          title: round.title?.trim() || (totalRounds > 1 ? `${title} - Vòng ${round.roundNumber}` : title),
          maxAdvanceCount: round.roundNumber === totalRounds ? 1 : round.maxAdvanceCount,
          startTime: round.startTime.length === 16 ? `${round.startTime}:00` : round.startTime,
          endTime: round.endTime.length === 16 ? `${round.endTime}:00` : round.endTime,
        })),
        candidateIds: [],
        newCandidates: localCandidates.map(c => {
          const refImg = c._uid ? candidateImagesRef.current[c._uid] : undefined;
          const hasBase64 = refImg && refImg.startsWith("data:");
          return {
            name: c.name,
            party: c.party,
            description: c.description,
            base64Image: hasBase64 ? refImg : undefined,
            imageUrl: !hasBase64 && c.avatarUrl ? c.avatarUrl : undefined,
          };
        }),
      };

      await electionApi.createWithParticipants(payload, finalFile!);
      await Swal.fire("Thành công", "Đã tạo cuộc bầu cử và import danh sách người tham gia.", "success");

      setTitle("");
      setDescription("");
      setElectionImageBase64("");
      setParticipantFile(null);
      setManualParticipants([]);
      setLocalCandidates([]);
      candidateImagesRef.current = {};
      handleTotalRoundsChange(1);
      onCreated?.();
    } catch (err: any) {
      const message = typeof err.response?.data === "string"
        ? err.response.data
        : err.response?.data?.message || "Không thể tạo cuộc bầu cử.";
      Swal.fire("Thất bại", message, "error");
    }
  };

  return (
    <>
    <div className="profile-container" style={{ maxWidth: 920, margin: "30px auto", padding: 25, background: "#fff", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
      <div className="info-section">
        <h2 style={{ textAlign: "center", marginBottom: 6, color: "#2c3e50", fontWeight: 700 }}>Thiết lập cuộc bầu cử</h2>
        <p style={{ textAlign: "center", color: "#64748b", fontSize: 13, marginBottom: 28 }}>
          Nhập thông tin, ứng viên, danh sách người tham gia và cấu hình từng vòng.
        </p>

        <form onSubmit={handleSubmitElection} className="edit-form">
          <div style={{ marginBottom: 25, paddingBottom: 15, borderBottom: "1px solid #eaedf1" }}>
            <div className="form-group">
              <label>Tên cuộc bầu cử <span style={{ color: "red" }}>*</span></label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="Ví dụ: Bầu chọn đại diện Hội đồng sinh viên Khoa CNTT 2026" />
            </div>

            <div className="form-group" style={{ marginTop: 15 }}>
              <label>Mô tả / thể lệ</label>
              <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Nhập thể lệ cuộc bầu cử..." style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #ccc", fontFamily: "inherit", fontSize: 14 }} />
            </div>

            <div className="form-group" style={{ marginTop: 15 }}>
              <label>Ảnh đại diện / banner</label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#16a34a", color: "#fff", border: "none", borderRadius: 7, padding: "8px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, marginTop: 6 }}>
                🖼️ Chọn ảnh
                <input type="file" accept="image/*" onChange={e => readImageFile(e, setElectionImageBase64)} style={{ display: "none" }} />
              </label>
              {electionImageBase64 && (
                <div style={{ marginTop: 12 }}>
                  <img src={electionImageBase64} alt="Election banner preview" style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 8, border: "1px solid #e2e8f0", objectFit: "cover" }} />
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginTop: 15 }}>
              <label>File Excel danh sách người tham gia <span style={{ color: "red" }}>*</span></label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#16a34a", color: "#fff", border: "1px solid transparent", borderRadius: 7, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, height: 36, boxSizing: "border-box" }}>
                  📂 Chọn tệp Excel
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleParticipantFileChange} style={{ display: "none" }} />
                </label>
                <button
                  type="button"
                  onClick={downloadSampleExcel}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 7, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", height: 36, boxSizing: "border-box" }}
                >
                  ⬇️ Tải file mẫu
                </button>
              </div>
              {participantFile && <p style={{ marginTop: 8, fontSize: 12, color: "#166534" }}>✅ Đã chọn: {participantFile.name}</p>}
              <p style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>File cần có các cột: email, full_name, citizen_id.</p>
              <button
                type="button"
                onClick={() => setShowAddParticipantModal(true)}
                style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                ➕ Thêm thủ công
              </button>

              {/* Danh sách người tham gia đã thêm thủ công */}
              {manualParticipants.length > 0 && (
                <div style={{ marginTop: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#166534", margin: "0 0 8px" }}>Đã thêm thủ công ({manualParticipants.length} người):</p>
                  {manualParticipants.map((p, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: i < manualParticipants.length - 1 ? "1px solid #dcfce7" : "none" }}>
                      <span style={{ color: "#374151" }}>{p.full_name} — <span style={{ color: "#6b7280" }}>{p.email}</span></span>
                      <button
                        type="button"
                        onClick={() => setManualParticipants(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 14, fontWeight: 700, padding: "0 4px" }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
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
                      onClick={() => { handleAddParticipantManual(); }}
                      style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: "#16a34a", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      Thêm vào danh sách
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

          <div style={{ marginBottom: 25, padding: 15, borderRadius: 8, background: "#f0fdf4", border: "1px dashed #2ecc71" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
              <h4 style={{ color: "#166534", fontSize: 14, margin: 0, fontWeight: 600 }}>Ứng viên tham gia vòng 1</h4>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#16a34a", color: "#fff", border: "none", borderRadius: 4, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, height: 32, boxSizing: "border-box" }}>
                  📂 Import từ Excel
                  <input type="file" accept=".xlsx,.xls" onChange={handleImportCandidates} style={{ display: "none" }} />
                </label>
                <button type="button" onClick={downloadCandidateSample} style={{ padding: "6px 10px", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", height: 32, boxSizing: "border-box" }}>
                  ⬇️ File mẫu
                </button>
                <button type="button" onClick={() => setShowAddForm(!showAddForm)} style={{ padding: "6px 10px", background: showAddForm ? "#dc2626" : "#16a34a", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer", height: 32, boxSizing: "border-box" }}>
                  {showAddForm ? "Đóng khung nhập" : "Thêm thủ công"}
                </button>
              </div>
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
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#16a34a", color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, marginTop: 4 }}>
                    🖼️ Chọn ảnh
                    <input type="file" accept="image/*" onChange={e => readImageFile(e, setNewImageBase64)} style={{ display: "none" }} />
                  </label>
                  {newImageBase64 && <p style={{ marginTop: 4, fontSize: 11, color: "#166534" }}>✅ Đã chọn ảnh</p>}
                </div>
                <button type="button" onClick={handleAddCandidateToLocalList} style={{ marginTop: 10, width: "100%", padding: 9, background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Lưu tạm ứng viên vào danh sách
                </button>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 30 }}>
            <h4 style={{ color: "#2c3e50", fontSize: 15, marginBottom: 10 }}>
              Tổng số ứng viên vòng 1: <strong style={{ color: "#2ecc71" }}>{totalSelectedCount}</strong>
            </h4>
            <div style={{ maxHeight: 350, overflowY: "auto", border: "1px solid #e2e8f0", padding: 15, borderRadius: 10, background: "#f8fafc" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                {localCandidates.map((candidate, index) => (
                  <CandidateCard
                    key={candidate._uid || `local-${index}`}
                    candidate={candidate}
                    imageOverride={candidate._uid ? (candidateImagesRef.current[candidate._uid] || undefined) : undefined}
                    selected
                    dashed
                    onEdit={() => {
                      const currentImage = (candidate._uid ? candidateImagesRef.current[candidate._uid] : undefined) || candidate.avatarUrl || "";
                      setEditingIndex(index);
                      setEditForm({ ...candidate });
                      setEditPreviewImage(currentImage);
                    }}
                    onRemove={() => {
                      if (candidate._uid) delete candidateImagesRef.current[candidate._uid];
                      setLocalCandidates(previous => previous.filter((_, i) => i !== index));
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>Số vòng bầu cử <span style={{ color: "red" }}>*</span></label>
            <select value={totalRounds} onChange={e => handleTotalRoundsChange(Number(e.target.value))} style={{ width: "100%", padding: 11, borderRadius: 6, border: "1px solid #ccc", background: "#fff", fontWeight: 600 }}>
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

          <div style={{ marginBottom: 25, padding: 18, borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <h4 style={{ color: "#2563eb", fontSize: 14, margin: "0 0 15px 0", fontWeight: 700 }}>Thiết lập từng vòng</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {roundsConfig.map(round => {
                const available = maxCandidatesByRound[round.roundNumber] || 0;
                const prevRound = roundsConfig.find(r => r.roundNumber === round.roundNumber - 1);
                const timeErrors: string[] = [];
                if (round.startTime && round.endTime && new Date(round.startTime) >= new Date(round.endTime))
                  timeErrors.push(`Thời gian kết thúc phải sau thời gian bắt đầu.`);
                if (prevRound?.endTime && round.startTime && new Date(round.startTime) < new Date(prevRound.endTime))
                  timeErrors.push(`Vòng ${round.roundNumber} phải bắt đầu sau khi vòng ${prevRound.roundNumber} kết thúc (${prevRound.endTime.replace("T", " ")}).`);
                return (
                  <div key={round.roundNumber} style={{ padding: 15, background: "#fff", borderRadius: 6, border: `1px solid ${timeErrors.length ? "#fca5a5" : "#cbd5e1"}` }}>
                    <h5 style={{ margin: "0 0 12px 0", color: "#1e293b", fontSize: 13, fontWeight: 600 }}>Vòng {round.roundNumber}</h5>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                      <div className="form-group">
                        <label style={{ fontSize: 12 }}>Tên vòng</label>
                        <input type="text" value={round.title || ""} onChange={e => handleRoundConfigChange(round.roundNumber, "title", e.target.value)} placeholder={`Vòng ${round.roundNumber}`} />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: 12 }}>Mô tả vòng</label>
                        <input type="text" value={round.description || ""} onChange={e => handleRoundConfigChange(round.roundNumber, "description", e.target.value)} placeholder="Mô tả ngắn nếu cần" />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: 12 }}>Thời gian bắt đầu <span style={{ color: "red" }}>*</span></label>
                        <DateTimePicker24h required value={round.startTime} onChange={v => handleRoundConfigChange(round.roundNumber, "startTime", v)} />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: 12 }}>Thời gian kết thúc <span style={{ color: "red" }}>*</span></label>
                        <DateTimePicker24h required value={round.endTime} onChange={v => handleRoundConfigChange(round.roundNumber, "endTime", v)} />
                      </div>
                    </div>
                    {timeErrors.length > 0 && (
                      <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 6, background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", fontSize: 12, fontWeight: 500, display: "flex", flexDirection: "column", gap: 4 }}>
                        {timeErrors.map((err, i) => <span key={i}>⚠ {err}</span>)}
                      </div>
                    )}
                    {round.roundNumber < totalRounds ? (
                      <div className="form-group" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed #e2e8f0" }}>
                        {(() => {
                          const nextR = roundsConfig.find(r => r.roundNumber === round.roundNumber + 1);
                          const minAdv = totalRounds - round.roundNumber + 1;
                          const maxAdv = Math.max(minAdv, available - 1);
                          return (
                            <>
                              <label style={{ fontSize: 12, color: "#166534", fontWeight: 600 }}>
                                Số ứng viên vào vòng {round.roundNumber + 1} (tối thiểu {minAdv}, tối đa {available - 1})
                              </label>
                              <input
                                type="number"
                                min={minAdv}
                                max={maxAdv}
                                required
                                value={round.maxAdvanceCount}
                                onChange={e => handleRoundConfigChange(round.roundNumber, "maxAdvanceCount", Math.max(minAdv, Number(e.target.value)))}
                                style={{ marginTop: 5, padding: 8, width: "100%", maxWidth: 200 }}
                              />
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div style={{ marginTop: 12, paddingTop: 8, borderTop: "1px dashed #e2e8f0", color: "#b45309", fontSize: 12, fontWeight: 500 }}>
                        Đây là vòng cuối cùng. Người cao phiếu nhất sẽ là người chiến thắng.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="action-section" style={{ display: "flex", gap: 12 }}>
            <button type="button" onClick={() => onBack ? onBack() : navigate("/host-dashboard")} style={{ flex: 1, padding: 14, borderRadius: 8, background: "#6c8ebf", color: "#fff", fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer" }}>
              Quay lại
            </button>
            <button type="submit" className="change-password-btn" style={{ flex: 2, padding: 14, borderRadius: 8, background: "#2ecc71", color: "#fff", fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer" }}>
              Xác nhận tạo cuộc bầu cử
            </button>
          </div>
        </form>
      </div>

      {/* Modal chỉnh sửa ứng viên */}
      {editingIndex !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Chỉnh sửa ứng viên</h3>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Họ và tên <span style={{ color: "red" }}>*</span></label>
              <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Nhập tên..." />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Tổ chức / đơn vị</label>
              <input type="text" value={editForm.party || ""} onChange={e => setEditForm(f => ({ ...f, party: e.target.value }))} placeholder="Ví dụ: Khoa CNTT" />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Mô tả</label>
              <input type="text" value={editForm.description || ""} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Thành tích, chương trình hành động..." />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Ảnh đại diện</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#16a34a", color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  🖼️ Chọn ảnh
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = () => setEditPreviewImage(reader.result as string);
                    reader.readAsDataURL(file);
                  }} />
                </label>
                {editPreviewImage && (
                  <img src={editPreviewImage} alt="preview" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0" }} />
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => { setEditingIndex(null); setEditPreviewImage(""); }} style={{ flex: 1, padding: 10, background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
                Hủy
              </button>
              <button type="button" onClick={() => {
                if (!editForm.name.trim()) { Swal.fire("Cảnh báo", "Vui lòng nhập tên ứng viên.", "warning"); return; }
                const saved: Candidate = { ...editForm };
                delete saved.base64Image;
                if (editPreviewImage && editPreviewImage.startsWith("data:") && saved._uid) {
                  // base64 lớn → lưu vào ref, không để trong candidate object
                  candidateImagesRef.current[saved._uid] = editPreviewImage;
                  delete saved.avatarUrl; // xóa URL cũ nếu có
                }
                setLocalCandidates(prev => prev.map((c, i) => i === editingIndex ? saved : c));
                setEditingIndex(null);
                setEditPreviewImage("");
              }} style={{ flex: 2, padding: 10, background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </>
  );
};

const CandidateCard: React.FC<{
  candidate: Candidate;
  imageOverride?: string;
  selected?: boolean;
  dashed?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
}> = ({ candidate, imageOverride, selected, dashed, onClick, onEdit, onRemove }) => {
  const image = imageOverride || candidate.base64Image || candidate.avatarUrl || candidate.imageUrl;
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "flex-start", padding: 12, borderRadius: 8, background: "#fff", border: dashed ? "2px dashed #2ecc71" : selected ? "2px solid #3498db" : "1px solid #e2e8f0", cursor: onClick ? "pointer" : "default", position: "relative" }}>
      {onRemove && (
        <button type="button" onClick={event => { event.stopPropagation(); onRemove(); }} style={{ position: "absolute", top: 8, right: 8, border: "none", background: "#ef4444", color: "#fff", borderRadius: "50%", width: 20, height: 20, fontSize: 11, cursor: "pointer" }}>x</button>
      )}
      {onEdit && (
        <button type="button" onClick={event => { event.stopPropagation(); onEdit(); }} style={{ position: "absolute", top: 8, right: 34, border: "none", background: "#2563eb", color: "#fff", borderRadius: "50%", width: 22, height: 22, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>✏️</button>
      )}
      {onClick && (
        <input type="checkbox" checked={Boolean(selected)} readOnly style={{ width: 16, height: 16, position: "absolute", top: 12, right: 12 }} />
      )}
      <div style={{ width: 55, height: 55, borderRadius: "50%", background: "#e2e8f0", marginRight: 12, display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden", flexShrink: 0 }}>
        {image ? <img src={image} alt={candidate.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 16, color: "#64748b", fontWeight: 700 }}>{candidate.name.charAt(0).toUpperCase()}</span>}
      </div>
      <div style={{ paddingRight: 24, flex: 1 }}>
        <h5 style={{ margin: "0 0 3px 0", fontSize: 14, color: "#1e293b", fontWeight: 600 }}>{candidate.name}</h5>
        {candidate.party && <span style={{ display: "inline-block", padding: "1px 5px", background: "#f1f5f9", color: "#475569", borderRadius: 4, fontSize: 10, marginBottom: 5 }}>{candidate.party}</span>}
        <p style={{ margin: 0, fontSize: 12, color: "#64748b", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{candidate.description || "Chưa có mô tả."}</p>
      </div>
    </div>
  );
};

export default CreateElection;
