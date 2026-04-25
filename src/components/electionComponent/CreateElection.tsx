import React, { useState } from "react";
import "../../assets/css/create-election.css";

const CreateElection: React.FC = () => {
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    return (
        <div className="create-election-container">
            <div className="section-header">
                <h3>Tạo Cuộc Bầu Cử Mới</h3>
            </div>

            <form className="create-election-form">
                <div className="form-grid">
                    {/* Cột trái: Thông tin cơ bản */}
                    <div className="form-left">
                        <div className="form-group">
                            <label>Tên cuộc bầu cử</label>
                            <input type="text" placeholder="Ví dụ: Bầu cử Ban chấp hành nhiệm kỳ 2026-2028" />
                        </div>

                        <div className="form-group">
                            <label>Mô tả ngắn gọn</label>
                            <textarea rows={4} placeholder="Nhập nội dung mục đích và quy định của cuộc bầu cử..."></textarea>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Loại bầu cử</label>
                                <select>
                                    <option>Công khai</option>
                                    <option>Nội bộ (Cần mã mời)</option>
                                    <option>Bí mật</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Số lượng ứng viên tối đa</label>
                                <input type="number" defaultValue={10} />
                            </div>
                        </div>
                    </div>

                    {/* Cột phải: Hình ảnh đại diện */}
                    <div className="form-right">
                        <label>Hình ảnh đại diện (Banner)</label>
                        <div className="image-upload-box" onClick={() => document.getElementById('fileInput')?.click()}>
                            {previewImage ? (
                                <img src={previewImage} alt="Preview" className="preview-img" />
                            ) : (
                                <div className="upload-placeholder">
                                    <span>📸</span>
                                    <p>Nhấn để tải ảnh lên</p>
                                </div>
                            )}
                            <input
                                type="file"
                                id="fileInput"
                                hidden
                                accept="image/*"
                                onChange={handleImageChange}
                            />
                        </div>
                        <p className="help-text">Định dạng hỗ trợ: JPG, PNG. Dung lượng tối đa 2MB.</p>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" className="btn-cancel">Hủy bỏ</button>
                    <button type="submit" className="btn-submit">Khởi tạo cuộc bầu cử</button>
                </div>
            </form>
        </div>
    );
};

export default CreateElection;