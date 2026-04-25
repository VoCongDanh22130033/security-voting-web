import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCandidates } from '../services/api';

const Candidates = () => {
    const [searchParams] = useSearchParams();
    const electionId = searchParams.get('electionId');
    const [candidates, setCandidates] = useState([]);

    useEffect(() => {
        if (electionId) {
            getCandidates(Number(electionId)).then(res => setCandidates(res.data));
        }
    }, [electionId]);

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6 text-center">Danh sách ứng viên</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {candidates.map((candidate: any) => (
                    <div key={candidate.id} className="max-w-sm rounded overflow-hidden shadow-lg bg-white p-6 border-t-4 border-blue-500">
                        <div className="font-bold text-xl mb-2 text-gray-800">{candidate.name}</div>
                        <p className="text-gray-600 text-base italic mb-4">
                            "{candidate.description}"
                        </p>
                        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300">
                            Bình chọn ngay
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Candidates;