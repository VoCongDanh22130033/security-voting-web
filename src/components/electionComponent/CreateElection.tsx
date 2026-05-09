import React, { useState, useEffect } from "react";
import "../../assets/css/create-election.css";
// ✅ Đã sửa: Import đúng đối tượng electionApi
import { electionApi } from "../../api/electionApi";
import { useAuth } from "../../context/AuthContext";
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
    useAuth();
    const [title, setTitle] = useState(editData?.title || "");
    const [description, setDescription] = useState(editData?.description || "");
    const [startTime, setStartTime] = useState(editData?.startDate?.substring(0, 16) || "");
    const [endTime, setEndTime] = useState(editData?.endDate?.substring(0, 16) || "");
    const [candidates, setCandidates] = useState<CandidateInput[]>([{ name: "", description: "" }]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(editData?.image || null);

    // ✅ Tự động lấy danh sách ứng viên nếu là chế độ chỉnh sửa
    useEffect(() => {
        if (editData?.id) {
            electionApi.getCandidates(editData.id)
            .then(res => {
                if (res.data && res.data.length > 0) {
                    setCandidates(res.data.map((c: any) => ({
                        name: c.name,
                        description: c.description
                    })));
                }
            })
            .catch(err => console.error("Lỗi tải ứng viên:", err));
        }
    }, [editData]);

    // ✅ Sửa lỗi TS2304: Định nghĩa hàm thêm ứng viên
    const addCandidate = () => {
        setCandidates([...candidates, { name: "", description: "" }]);
    };

    // ✅ Sửa lỗi TS2304: Định nghĩa hàm xóa ứng viên
    const removeCandidate = (index: number) => {
        const newCandidates = candidates.filter((_, i) => i !== index);
        setCandidates(newCandidates);
    };

    // ✅ Sửa lỗi TS2304: Định nghĩa hàm thay đổi thông tin ứng viên
    const handleCandidateChange = (index: number, field: keyof CandidateInput, value: string) => {
        const newCandidates = [...candidates];
        newCandidates[index][field] = value;
        setCandidates(newCandidates);
    };

    // ✅ Xử lý chọn file ảnh và tạo preview
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!editData && !selectedFile) {
            Swal.fire("Thông báo", "Vui lòng chọn ảnh đại diện cho cuộc bầu cử", "warning");
            return;
        }

        setIsLoading(true);

        const electionPayload = {
            title,
            description,
            startDate: startTime,
            endDate: endTime,
            candidates
        };

        try {
            if (editData?.id) {
                // ✅ Sửa lỗi TS2339: Gọi hàm update đã được thêm vào api
                await electionApi.update(editData.id, electionPayload);
                Swal.fire("Thành công", "Đã cập nhật thông tin bầu cử", "success");
            } else {
                // Tạo mới kèm file
                await electionApi.create(electionPayload, selectedFile!);
                Swal.fire("Thành công", "Đã khởi tạo cuộc bầu cử mới", "success");
            }

            if (onComplete) onComplete();
        } catch (error: any) {
            console.error(error);
            Swal.fire("Lỗi", error.response?.data?.message || "Không thể lưu dữ liệu vào Database", "error");
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
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        disabled={isLoading}
                        placeholder="Nhập tên cuộc bầu cử..."
                    />
                </div>

                <div className="form-group">
                    <label>Ảnh đại diện cuộc bầu cử:</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={isLoading}
                    />
                    {previewUrl && (
                        <div className="image-preview" style={{ marginTop: '10px' }}>
                            <img
                                src={previewUrl}
                                alt="Preview"
                                style={{ width: '150px', borderRadius: '8px', border: '1px solid #ddd', height: '100px', objectFit: 'cover' }}
                            />
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label>Mô tả:</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={isLoading}
                        placeholder="Mô tả ngắn gọn về mục đích cuộc bầu cử..."
                        rows={3}
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Thời gian bắt đầu:</label>
                        <input
                            type="datetime-local"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="form-group">
                        <label>Thời gian kết thúc:</label>
                        <input
                            type="datetime-local"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="candidates-management">
                    <h4>Danh sách ứng viên</h4>
                    <p className="helper-text">Vui lòng nhập ít nhất 1 ứng viên tham gia.</p>

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
                                    title="Xóa ứng viên này"
                                >
                                    Xóa
                                </button>
                            )}
                        </div>
                    ))}

                    <button
                        type="button"
                        className="btn-add-candidate"
                        onClick={addCandidate}
                        disabled={isLoading}
                    >
                        <span>+</span> Thêm ứng viên mới
                    </button>
                </div>

                <div className="form-actions" style={{marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'flex-end'}}>
                    <button
                        type="button"
                        onClick={onComplete}
                        className="btn-cancel"
                        disabled={isLoading}
                    >
                        Hủy bỏ
                    </button>
                    <button type="submit" className="btn-submit" disabled={isLoading}>
                        {isLoading ? "Đang xử lý..." : (editData ? "Cập nhật cuộc bầu cử" : "Khởi tạo & Lưu Database")}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateElection;
