import React, { useEffect, useState } from 'react';
import { getElections } from '../services/api';
import { useNavigate } from 'react-router-dom';

const Elections = () => {
    const [elections, setElections] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        getElections().then(res => setElections(res.data));
    }, []);

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Danh sách cuộc bầu cử</h1>
            <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full leading-normal">
                    <thead>
                    <tr className="bg-blue-600 text-white">
                        <th className="px-5 py-3 border-b-2 text-left text-sm uppercase font-semibold">Tên cuộc bầu cử</th>
                        <th className="px-5 py-3 border-b-2 text-left text-sm uppercase font-semibold">Trạng thái</th>
                        <th className="px-5 py-3 border-b-2 text-left text-sm uppercase font-semibold">Hành động</th>
                    </tr>
                    </thead>
                    <tbody>
                    {elections.map((election: any) => (
                        <tr key={election.id} className="hover:bg-gray-50">
                            <td className="px-5 py-5 border-b border-gray-200 text-sm">
                                <p className="text-gray-900 font-medium">{election.title}</p>
                            </td>
                            <td className="px-5 py-5 border-b border-gray-200 text-sm">
                                    <span className={`px-2 py-1 rounded ${election.status === 'OPEN' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                        {election.status}
                                    </span>
                            </td>
                            <td className="px-5 py-5 border-b border-gray-200 text-sm">
                                <button
                                    onClick={() => navigate(`/candidates?electionId=${election.id}`)}
                                    className="text-blue-600 hover:text-blue-900 font-semibold"
                                >
                                    Xem ứng viên
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Elections;