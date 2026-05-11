import React, { useState, useEffect } from "react";
import "../../assets/css/create-election.css";
import { electionApi } from "../../api/electionApi";
import { useAuth } from "../../context/AuthContext";
import Swal from "sweetalert2";

interface CandidateInput {
    id?: number;
    name: string;
    description: string;
    imageFile?: File;
    imageUrl?: string;
    preview?: string;
}

interface CreateElectionProps {
    editData?: any;
    onComplete?: () => void;
}

const CreateElection: React.FC<CreateElectionProps> = ({ editData, onComplete }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [candidates, setCandidates] = useState<CandidateInput[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (editData) {
            setTitle(editData.title || "");
            setDescription(editData.description || "");
            setStartTime(editData.startDate?.substring(0, 16) || "");
            setEndTime(editData.endDate?.substring(0, 16) || "");
            setPreviewUrl(editData.image || null);

            if (editData.candidates && editData.candidates.length > 0) {
                setCandidates(editData.candidates.map((c: any) => ({
                    id: c.id,
                    name: c.name || "",
                    description: c.description || "",
                    imageUrl: c.imageUrl || "",
                    preview: c.imageUrl || ""
                })));
            } else {
                setCandidates([{ name: "", description: "" }]);
            }
        } else {
            setCandidates([{ name: "", description: "" }]);
        }
    }, [editData]);

    const handleCandidateChange = (index: number, field: keyof CandidateInput, value: string) => {
        const newCandidates = [...candidates];
        newCandidates[index] = { ...newCandidates[index], [field]: value };
        setCandidates(newCandidates);
    };

    const handleCandidateImage = (index: number, file: File) => {
        const newCandidates = [...candidates];
        if (newCandidates[index].preview && newCandidates[index].preview?.startsWith('blob:')) {
            URL.revokeObjectURL(newCandidates[index].preview!);
        }
        newCandidates[index].imageFile = file;
        newCandidates[index].preview = URL.createObjectURL(file);
        setCandidates(newCandidates);
    };
    const addCandidate = () => setCandidates([...candidates, { name: "", description: "" }]);
    const removeCandidate = (index: number) => {
        if (candidates.length > 1) {
            const candidateToRemove = candidates[index];
            if (candidateToRemove.preview?.startsWith('blob:')) {
                URL.revokeObjectURL(candidateToRemove.preview);
            }
            setCandidates(candidates.filter((_, i) => i !== index));
        }
    };


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };
    // xác định thời gian đóng mở ,sắp mở của cuộc bầu cử
    const getLiveStatus = (start: string, end: string) => {
        if (!start || !end) return "N/A";
        const now = new Date();
        const startDate = new Date(start);
        const endDate = new Date(end);
        if (now < startDate) return "SẮP DIỄN RA";
        if (now > endDate) return "ĐÃ KẾT THÚC";
        return "ĐANG DIỄN RA";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        let finalRoleId = 1;
        try {
            // 1. Upload ảnh bìa cuộc bầu cử
            let finalElectionImageUrl = editData?.image || "";
            if (selectedFile) {
                const res = await electionApi.uploadSingleFile(selectedFile);
                // Kiểm tra xem Backend trả về res.data là chuỗi hay object
                finalElectionImageUrl = typeof res.data === 'string' ? res.data : res.data.url;
            }

            // 2. Upload ảnh cho từng ứng viên
            const updatedCandidates = await Promise.all(candidates.map(async (c) => {
                let currentImageUrl = c.imageUrl || "";
                if (c.imageFile) {
                    const res = await electionApi.uploadSingleFile(c.imageFile);
                    currentImageUrl = typeof res.data === 'string' ? res.data : res.data.url;
                }
                return {
                    id: c.id,
                    name: c.name,
                    description: c.description,
                    imageUrl: currentImageUrl
                };
            }));

            if (editData?.roleId) {
                finalRoleId = editData.roleId;
            } else if (user?.roles) {
                if (user.roles.includes("ROLE_ORGANIZER") || user.roleId === 3) {
                    finalRoleId = 3;
                } else {
                    finalRoleId = 1;
                }
            }
            // 3. Chuẩn bị payload chuẩn DTO Backend
            const payload = {
                title,
                description,
                startTime: startTime.length === 16 ? `${startTime}:00` : startTime,
                endTime: endTime.length === 16 ? `${endTime}:00` : endTime,
                roleId: finalRoleId,
                imageUrl: finalElectionImageUrl,
                candidates: updatedCandidates,
                status: editData?.status || "OPEN"
            };

            console.log("Dữ liệu gửi đi:", payload);

            if (editData?.id) {
                // Gọi hàm update
                await electionApi.update(editData.id, payload);
                Swal.fire("Thành công", "Cập nhật cuộc bầu cử thành công!", "success");
            } else {
                // Gọi hàm tạo mới
                await electionApi.createPureJson(payload);
                Swal.fire("Thành công", "Tạo mới cuộc bầu cử thành công!", "success");
            }

            if (onComplete) onComplete();
        } catch (error: any) {
            console.error("Lỗi chi tiết:", error.response?.data || error.message);
            Swal.fire("Lỗi", "Không thể lưu dữ liệu. Hãy kiểm tra format ngày tháng!", "error");
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div className="create-election-container">
            <h2 className="form-title">{editData ? "Cập nhật cuộc bầu cử" : "Tạo cuộc bầu cử mới"}</h2>
            <form onSubmit={handleSubmit} className="create-election-form">
                <div className="form-grid">
                    <div className="left-column">
                        <div className="form-group">
                            <label>Tiêu đề cuộc bầu cử</label>
                            <input type="text" placeholder="Nhập tên cuộc bầu cử..." value={title} onChange={(e) => setTitle(e.target.value)} required />
                        </div>
                        <div className="form-row">
                            <div className="form-group" style={{flex:1}}>
                                <label>Ngày bắt đầu</label>
                                <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                            </div>
                            <div className="form-group" style={{flex:1}}>
                                <label>Ngày kết thúc</label>
                                <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Dự kiến trạng thái:</label>
                            <div className={`status-preview-badge ${getLiveStatus(startTime, endTime).replace(/\s+/g, '-').toLowerCase()}`}>
                                {getLiveStatus(startTime, endTime)}
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Mô tả tổng quan</label>
                            <textarea rows={4} placeholder="Nhập mô tả chi tiết..." value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                    </div>

                    <div className="right-column">
                        <div className="form-group">
                            <label>Ảnh bìa cuộc bầu cử</label>
                            <div className="image-upload-box" onClick={() => document.getElementById('main-file')?.click()}>
                                {previewUrl ? <img src={previewUrl} alt="Preview" /> : <div className="upload-placeholder"><span>+</span><p>Tải ảnh lên</p></div>}
                                <input id="main-file" type="file" hidden onChange={handleFileChange} accept="image/*" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="candidates-management">
                    <div className="section-header">
                        <h3>Danh sách ứng viên</h3>
                        <button type="button" className="btn-add-candidate" onClick={addCandidate}>
                            + Thêm ứng viên mới
                        </button>
                    </div>

                    <div className="candidates-vertical-list">
                        {candidates.map((c, index) => (
                            <div key={index} className="candidate-row-card">
                                <div className="candidate-index">#{index + 1}</div>

                                <div className="candidate-main-content">
                                    <div className="candidate-photo-section">
                                        <div className="photo-preview-circle">
                                            {/* Hiển thị ảnh cũ hoặc ảnh mới xem trước */}
                                            {(c.preview || c.imageUrl) ? (
                                                <img src={c.preview || c.imageUrl} alt="Avatar" />
                                            ) : (
                                                <span style={{ fontSize: '24px' }}></span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            className="btn-select-photo"
                                            onClick={() => document.getElementById(`c-file-${index}`)?.click()}
                                        >
                                            Chọn ảnh
                                        </button>
                                        <input
                                            id={`c-file-${index}`}
                                            type="file"
                                            hidden
                                            onChange={(e) => e.target.files && handleCandidateImage(index, e.target.files[0])}
                                            accept="image/*"
                                        />
                                    </div>

                                    <div className="candidate-fields">
                                        <div className="input-group inline-group">
                                            <label>Ứng viên:</label>
                                            <input
                                                placeholder="Họ và tên ứng viên"
                                                value={c.name}
                                                onChange={(e) => handleCandidateChange(index, "name", e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="input-group inline-group">
                                            <label>Mô tả:</label>
                                            <textarea
                                                rows={2}
                                                placeholder="Nhập tóm tắt tiểu sử ứng viên..."
                                                value={c.description}
                                                onChange={(e) => handleCandidateChange(index, "description", e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className="btn-delete-candidate"
                                        onClick={() => removeCandidate(index)}
                                        title="Xóa ứng viên"
                                    >
                                        &times;
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={onComplete}>Hủy</button>
                    <button type="submit" className="btn-submit" disabled={isLoading}>
                        {isLoading ? "Đang lưu..." : (editData ? "Cập nhật Database" : "Tạo mới bầu cử")}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateElection;