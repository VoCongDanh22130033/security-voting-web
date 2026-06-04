import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import verificationApi from '../api/verificationApi';
import styled from 'styled-components';

const BoardContainer = styled.div`
    padding: 2rem;
    max-width: 900px;
    margin: 2rem auto;
    background-color: #f9f9f9;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
`;

const Title = styled.h2`
    text-align: center;
    color: #333;
    margin-bottom: 2rem;
`;

const EventItem = styled.div`
    background-color: #fff;
    border: 1px solid #eee;
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 5px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.9rem;
    word-break: break-all;
`;

const EventType = styled.strong`
    color: #007bff;
`;

const BackButton = styled.button`
    padding: 10px 15px;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    margin-bottom: 20px;
`;

const PublicBulletinBoard = () => {
    const { electionId } = useParams<{ electionId: string }>();
    const navigate = useNavigate();
    const [board, setBoard] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (electionId) {
            verificationApi.getBulletinBoard(parseInt(electionId))
                .then(response => {
                    setBoard(response.data);
                    setLoading(false);
                })
                .catch(error => {
                    console.error("Failed to fetch bulletin board:", error);
                    setLoading(false);
                });
        }
    }, [electionId]);

    if (loading) {
        return <BoardContainer>Loading...</BoardContainer>;
    }

    return (
        <BoardContainer>
            <BackButton onClick={() => navigate(-1)}>← Quay lại</BackButton>
            <Title>Bảng Tin Công Khai - Cuộc bầu cử #{electionId}</Title>
            {board.length === 0 ? (
                <p style={{textAlign: 'center'}}>Chưa có sự kiện nào được ghi nhận cho cuộc bầu cử này.</p>
            ) : (
                board.map(event => (
                    <EventItem key={event.id}>
                        <p><EventType>{event.eventType}</EventType> lúc {new Date(event.timestamp).toLocaleString()}</p>
                        <p><strong>Dữ liệu mã hóa:</strong> {event.payload}</p>
                    </EventItem>
                ))
            )}
        </BoardContainer>
    );
};

export default PublicBulletinBoard;
