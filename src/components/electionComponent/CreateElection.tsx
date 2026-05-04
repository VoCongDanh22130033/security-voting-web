import React, { useState, useEffect } from "react";
import "../../assets/css/create-election.css";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext.tsx";
import Swal from "sweetalert2";

interface CandidateInput {
    name: string;
    description: string;
}

interface CreateElectionProps {
    editData?: any;
    onComplete?: () => void;
}

const CreateElection: React.FC<CreateElectionProps> = ({ editData, onComplete }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState(editData?.title || "");
    const [description, setDescription] = useState(editData?.description || "");
    const [startTime, setStartTime] = useState(editData?.startDate?.substring(0, 16) || "");
    const [endTime, setEndTime] = useState(editData?.endDate?.substring(0, 16) || "");
    const [candidates, setCandidates] = useState<CandidateInput[]>([{ name: "", description: "" }]);
    const [isLoading, setIsLoading] = useState(false);

    // 1. Thêm State để lưu trữ file ảnh đã chọn
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(editData?.image || null);

    useEffect(() => {
        if (editData?.id) {
            fetchCandidates(editData.id);
        }
    }, [editData]);

    const fetchCandidates = async (id: number) => {
        try {
            const res = await api.get(`/api/elections/${id}/candidates`);
            setCandidates(res.data.map((c: any) => ({ name: c.name, description: c.description })));
        } catch (error) {
            console.error("Lỗi lấy danh sách ứng viên:", error);
        }
    };

    // 2. Hàm xử lý khi người dùng chọn file
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file)); // Tạo link xem trước ảnh
        }
    };

    const addCandidate = () => setCandidates([...candidates, { name: "", description: "" }]);
    const removeCandidate = (index: number) => setCandidates(candidates.filter((_, i) => i !== index));

    const handleCandidateChange = (index: number, field: keyof CandidateInput, value: string) => {
        const newCandidates = [...candidates];
        newCandidates[index][field] = value;
        setCandidates(newCandidates);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Kiểm tra nếu chưa chọn ảnh khi tạo mới
        if (!editData && !selectedFile) {
            Swal.fire("Thông báo", "Vui lòng chọn ảnh cho cuộc bầu cử", "warning");
            return;
        }

        setIsLoading(true);
        const isOrganizer = user?.roles?.includes("ROLE_ORGANIZER");

        // 3. Tạo Object chứa thông tin Election
        const electionPayload = {
            title,
            description,
            startTime: startTime.includes(":") && startTime.split(":").length === 2 ? `${startTime}:00` : startTime,
            endTime: endTime.includes(":") && endTime.split(":").length === 2 ? `${endTime}:00` : endTime,
            candidates,
            roleId: isOrganizer ? 2 : 3
        };

        try {
            // 4. SỬ DỤNG FORMDATA ĐỂ GỬI CẢ JSON VÀ FILE (Tránh lỗi 415)
            const formData = new FormData();

            // Chuyển JSON thành Blob
            const jsonBlob = new Blob([JSON.stringify(electionPayload)], { type: "application/json" });
            formData.append("election", jsonBlob);

            if (selectedFile) {
                formData.append("file", selectedFile);
            }

            if (editData) {
                // Nếu là Update, bạn cũng nên dùng multipart nếu backend yêu cầu hoặc giữ nguyên tùy cấu hình API[cite: 13]
                await api.put(`/api/elections/${editData.id}`, electionPayload);
            } else {
                // Tạo mới qua Gateway tới Election Service[cite: 13]
                await api.post("/api/elections/create", formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
            }

            Swal.fire("Thành công", "Dữ liệu đã được lưu và ảnh đã upload lên Cloudinary", "success");
            if (onComplete) onComplete();
        } catch (error: any) {
            console.error("Lỗi API:", error);
            Swal.fire("Lỗi", error.response?.data || "Không thể thực hiện thao tác", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="create-election-container">
            <h3>{editData ? "Chỉnh sửa cuộc bầu cử" : "Tạo cuộc bầu cử mới"}</h3>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Tiêu đề:</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isLoading} />
                </div>

                {/* 5. GIAO DIỆN CHỌN ẢNH */}
                <div className="form-group">
                    <label>Ảnh đại diện cuộc bầu cử:</label>
                    <input type="file" accept="image/*" onChange={handleFileChange} disabled={isLoading} />
                    {previewUrl && (
                        <div className="image-preview" style={{ marginTop: '10px' }}>
                            <img src={previewUrl} alt="Preview" style={{ width: '150px', borderRadius: '8px', border: '1px solid #ddd' }} />
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label>Mô tả:</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={isLoading} />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Thời gian bắt đầu:</label>
                        <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required disabled={isLoading} />
                    </div>
                    <div className="form-group">
                        <label>Thời gian kết thúc:</label>
                        <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required disabled={isLoading} />
                    </div>
                </div>

                <div className="candidates-management">
                    <h4>Danh sách ứng viên</h4>
                    {candidates.map((cand, index) => (
                        <div key={index} className="candidate-row">
                            <input
                                type="text"
                                className="candidate-input"
                                placeholder="Họ và tên ứng viên..."
                                value={cand.name}
                                onChange={(e) => handleCandidateChange(index, "name", e.target.value)}
                                required
                                disabled={isLoading}
                            />
                            <input
                                type="text"
                                className="candidate-input"
                                placeholder="Mô tả kinh nghiệm, chức vụ..."
                                value={cand.description}
                                onChange={(e) => handleCandidateChange(index, "description", e.target.value)}
                                disabled={isLoading}
                            />
                            {candidates.length > 1 && (
                                <button
                                    type="button"
                                    className="btn-remove-candidate"
                                    onClick={() => removeCandidate(index)}
                                >
                                    Xóa
                                </button>
                            )}
                        </div>
                    ))}
                    <button type="button" className="btn-add-candidate" onClick={addCandidate} disabled={isLoading}>
                        <span>+</span> Thêm ứng viên mới
                    </button>
                </div>

                <div className="form-actions" style={{marginTop: '20px', display: 'flex', gap: '10px'}}>
                    <button type="button" onClick={onComplete} className="btn-cancel" disabled={isLoading}>Hủy bỏ</button>
                    <button type="submit" className="btn-submit" disabled={isLoading}>
                        {isLoading ? "Đang xử lý..." : (editData ? "Cập nhật " : "Khởi tạo & Lưu Database")}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateElection;