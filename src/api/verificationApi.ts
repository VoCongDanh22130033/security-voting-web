import axiosClient from './axiosClient';

export const verificationApi = {
    // Lấy toàn bộ dữ liệu trên Bảng Tin Công Khai của một cuộc bầu cử
    getBulletinBoard: (electionId: number) => {
        return axiosClient.get(`/election/api/v1/verification/bulletin-board/${electionId}`);
    },

    // Kiểm tra mã biên nhận của cử tri
    verifyReceipt: (receiptCode: string) => {
        return axiosClient.get(`/election/api/v1/verification/receipt/${receiptCode}`);
    }
};

export default verificationApi;
