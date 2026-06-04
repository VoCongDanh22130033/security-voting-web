import React, { useState } from 'react';
import verificationApi from '../api/verificationApi';
import styled from 'styled-components';

const VerifyContainer = styled.div`
    padding: 2rem;
    max-width: 700px;
    margin: 2rem auto;
    text-align: center;
`;

const Input = styled.input`
    width: 100%;
    padding: 0.8rem;
    font-size: 1rem;
    margin-bottom: 1rem;
    border-radius: 5px;
    border: 1px solid #ccc;
`;

const Button = styled.button`
    padding: 0.8rem 1.5rem;
    font-size: 1rem;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
`;

const ResultArea = styled.div`
    margin-top: 2rem;
    padding: 1rem;
    background-color: #f0f0f0;
    border-radius: 5px;
    text-align: left;
    word-break: break-all;
`;

const VerifyVote = () => {
    const [receiptCode, setReceiptCode] = useState('');
    const [voteInfo, setVoteInfo] = useState<any>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerify = () => {
        if (!receiptCode) {
            setError('Hãy nhập vào mã bỏ phiếu của bạn.');
            return;
        }
        setLoading(true);
        setError('');
        setVoteInfo(null);
        verificationApi.verifyReceipt(receiptCode)
            .then(response => {
                setVoteInfo(response.data);
                setLoading(false);
            })
            .catch(() => {
                setError('Mã không hợp lệ.');
                setLoading(false);
            });
    };

    return (
        <VerifyContainer>
            <h2>Kiểm tra phiếu bầu của bạn</h2>
            <p>Nhập mã bỏ phiếu của bạn</p>
            <Input
                type="text"
                value={receiptCode}
                onChange={(e) => setReceiptCode(e.target.value)}
                placeholder="Nhập mã ở đây"
            />
            <Button onClick={handleVerify} disabled={loading}>
                {loading ? 'Đang xác minh...' : 'Xác minh'}
            </Button>

            {error && <ResultArea style={{ color: 'red' }}>{error}</ResultArea>}

            {voteInfo && (
                <ResultArea>
                    <h3>Vote Found!</h3>
                    <p><strong>Receipt Code:</strong> {voteInfo.receiptCode}</p>
                    <p><strong>Election ID:</strong> {voteInfo.electionId}</p>
                    <p><strong>Cast Time:</strong> {new Date(voteInfo.castTime).toLocaleString()}</p>
                    <p><strong>Encrypted Choice:</strong> {voteInfo.encryptedChoice}</p>
                    <p style={{ marginTop: '1rem', color: '#555' }}>
                        Điều này xác nhận rằng phiếu bầu của bạn, với giá trị đã được mã hóa hiển thị ở trên, đã được ghi nhận thành công trên bảng thông báo công khai.
                    </p>
                </ResultArea>
            )}
        </VerifyContainer>
    );
};

export default VerifyVote;
