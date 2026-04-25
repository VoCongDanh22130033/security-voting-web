import React, {useState} from "react";
import "../../assets/css/election-timeline.css"

interface TimelineStep {
  id: number;
  label: string;
  date: string;
  description: string;
}

const ElectionTimeline: React.FC = () => {
  const [steps] = useState<TimelineStep[]>([
    {
      id: 1,
      label: "Đăng ký ứng viên",
      date: "2026-04-01",
      description: "Mở cổng đăng ký cho các ứng viên tham gia."
    },
    {
      id: 2,
      label: "Bắt đầu bỏ phiếu",
      date: "2026-04-15",
      description: "Cử tri bắt đầu thực hiện quyền bầu cử."
    },
    {
      id: 3,
      label: "Kết thúc bỏ phiếu",
      date: "2026-04-20",
      description: "Đóng hệ thống và bắt đầu kiểm phiếu."
    },
    {
      id: 4,
      label: "Công bố kết quả",
      date: "2026-04-22",
      description: "Xác nhận và công khai kết quả cuối cùng."
    },
  ]);

  return (
      <div className="timeline-setup">
        <div className="section-header">
          <h3>Thiết lập lộ trình bầu cử</h3>
          <button className="btn-save">Lưu lộ trình</button>
        </div>

        <div className="timeline-container">
          {steps.map((step, index) => (
              <div key={step.id} className="timeline-item">
                <div className="timeline-number">{index + 1}</div>
                <div className="timeline-inputs">
                  <div className="input-row">
                    <div className="input-group">
                      <label>Giai đoạn</label>
                      <input type="text" defaultValue={step.label}/>
                    </div>
                    <div className="input-group">
                      <label>Ngày thực hiện</label>
                      <input type="date" defaultValue={step.date}/>
                    </div>
                  </div>
                  <div className="input-group full-width">
                    <label>Mô tả ngắn</label>
                    <input type="text" defaultValue={step.description}
                           placeholder="Ghi chú cho giai đoạn này..."/>
                  </div>
                </div>
                {index !== steps.length - 1 && <div className="timeline-connector"></div>}
              </div>
          ))}
        </div>

        <button className="btn-add-step">+ Thêm giai đoạn mới</button>
      </div>
  );
};

export default ElectionTimeline;