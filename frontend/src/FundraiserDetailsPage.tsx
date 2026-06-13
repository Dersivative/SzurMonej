import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

interface FundraiserDetails {
    id: number;
    title: string;
    description: string;
    goalAmount: number;
    currentAmount: number;
    history: {
        date: string;
        description: string;
        amount: number;
        type: string;
    }[];
}

const FundraiserDetailsPage: React.FC = () => {
    const { fundraiserId } = useParams<{ fundraiserId: string }>();
    const [fundraiser, setFundraiser] = useState<FundraiserDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionAmount, setActionAmount] = useState('');
    const [actionNote, setActionNote] = useState('');
    const [actionError, setActionError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!fundraiserId) return;
        try {
            setLoading(true);
            const response = await axios.get<FundraiserDetails>(`/api/fundraisers/${fundraiserId}`);
            setFundraiser(response.data);
        } catch (err: any) {
            setError('Nie udało się pobrać szczegółów zbiórki.');
        } finally {
            setLoading(false);
        }
    }, [fundraiserId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAction = async (type: 'deposit' | 'withdraw') => {
        if (!actionAmount || !actionNote) {
            setActionError('Kwota i powód są wymagane.');
            return;
        }
        setActionError(null);
        try {
            await axios.post(`/api/fundraisers/${fundraiserId}/${type}`, {
                amount: parseFloat(actionAmount),
                note: actionNote
            });
            setActionAmount('');
            setActionNote('');
            fetchData();
        } catch (err: any) {
            if (err.response?.data?.message) {
                setActionError(err.response.data.message);
            } else {
                setActionError('Wystąpił nieoczekiwany błąd.');
            }
        }
    };

    if (loading) return <div>Ładowanie...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;
    if (!fundraiser) return <div>Nie znaleziono zbiórki.</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
            <Link to="/class-management">&larr; Powrót do zarządzania klasą</Link>
            <h1 style={{ marginTop: '20px' }}>Szczegóły zbiórki: {fundraiser.title}</h1>
            <p>{fundraiser.description}</p>
            
            <div style={{ backgroundColor: '#e9ecef', borderRadius: '5px', height: '24px', width: '100%', overflow: 'hidden', marginBottom: '5px' }}>
                <div style={{ backgroundColor: '#28a745', height: '100%', width: `${Math.min((fundraiser.currentAmount / fundraiser.goalAmount) * 100, 100)}%`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8em' }}>
                    {((fundraiser.currentAmount / fundraiser.goalAmount) * 100).toFixed(0)}%
                </div>
            </div>
            <p>Zebrano: <strong>{fundraiser.currentAmount.toFixed(2)} PLN</strong> z {fundraiser.goalAmount.toFixed(2)} PLN</p>

            <div style={{ display: 'flex', gap: '20px', margin: '30px 0' }}>
                <div style={{ flex: 1, padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
                    <h4>Akcje Skarbnika</h4>
                    {actionError && <div style={{ color: 'red', marginBottom: '10px' }}>{actionError}</div>}
                    <input type="number" placeholder="Kwota (PLN)" value={actionAmount} onChange={e => setActionAmount(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }} />
                    <input type="text" placeholder="Opis operacji (np. zakup materiałów)" value={actionNote} onChange={e => setActionNote(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px', boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => handleAction('deposit')} style={{ flex: 1, padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>Wpłać</button>
                        <button onClick={() => handleAction('withdraw')} style={{ flex: 1, padding: '10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}>Wypłać</button>
                    </div>
                </div>
            </div>

            <div>
                <h3>Historia operacji</h3>
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                    {fundraiser.history.map((entry, index) => (
                        <li key={index} style={{ borderBottom: '1px solid #eee', padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <strong>{entry.description}</strong>
                                <div style={{ fontSize: '0.8em', color: 'gray' }}>
                                    {new Date(entry.date).toLocaleString()} - <span style={{ fontStyle: 'italic' }}>{entry.type}</span>
                                </div>
                            </div>
                            <span style={{ color: entry.amount > 0 ? 'green' : 'red', fontWeight: 'bold', fontSize: '1.1em' }}>
                                {entry.amount > 0 ? '+' : ''}{entry.amount.toFixed(2)} PLN
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default FundraiserDetailsPage;
