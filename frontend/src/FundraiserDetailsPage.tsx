import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './AuthContext';

axios.defaults.withCredentials = true; // Ensure cookies are sent with every request

interface FundraiserDetails {
    id: number;
    title: string;
    description: string;
    goalAmount: number;
    currentAmount: number;
    status: 'ACTIVE' | 'RECONCILING' | 'FINISHED';
    participants: {
        childId: number;
        childName: string;
        totalContribution: number;
        debt: number | null;
        credit: number | null;
    }[];
    history: {
        date: string;
        description: string;
        amount: number;
        type: string;
    }[];
}

const FundraiserDetailsPage: React.FC = () => {
    const { fundraiserId } = useParams<{ fundraiserId: string }>();
    const { user } = useAuth();
    const [fundraiser, setFundraiser] = useState<FundraiserDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionAmount, setActionAmount] = useState('');
    const [actionNote, setActionNote] = useState('');
    const [newGoalAmount, setNewGoalAmount] = useState('');
    const [actionError, setActionError] = useState<string | null>(null);
    const [showFinishConfirmation, setShowFinishConfirmation] = useState(false);

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

    const handleUpdateGoal = async () => {
        if (!newGoalAmount) {
            setActionError('Nowa kwota jest wymagana.');
            return;
        }
        setActionError(null);
        try {
            await axios.patch(`/api/fundraisers/${fundraiserId}/goal`, {
                newGoalAmount: parseFloat(newGoalAmount)
            });
            setNewGoalAmount('');
            fetchData();
        } catch (err: any) {
            console.error("Update Goal Error:", err.response || err);
            let errorMessage = 'Wystąpił nieoczekiwany błąd.';
            if (err.response) {
                errorMessage = `Błąd serwera: ${err.response.status} - ${err.response.data.message || err.response.statusText}`;
            } else if (err.request) {
                errorMessage = 'Brak odpowiedzi od serwera. Sprawdź połączenie internetowe.';
            } else {
                errorMessage = `Błąd aplikacji: ${err.message}`;
            }
            setActionError(errorMessage);
            alert(errorMessage);
        }
    };

    const handleWithdrawAll = async () => {
        try {
            await axios.post(`/api/fundraisers/${fundraiserId}/withdraw-all`);
            fetchData();
        } catch (err) {
            setActionError('Wystąpił błąd podczas wypłacania środków.');
        } finally {
            setShowFinishConfirmation(false);
        }
    };
    
    const handleReconcile = async () => {
        try {
            await axios.post(`/api/fundraisers/${fundraiserId}/reconcile`, { note: 'Rozliczenie zbiórki' });
            fetchData();
        } catch (err) {
            setActionError('Wystąpił błąd podczas rozliczania zbiórki.');
        } finally {
            setShowFinishConfirmation(false);
        }
    };

    const handlePayDebt = async (childId: number) => {
        console.log(`Attempting to pay debt for childId: ${childId} for fundraiserId: ${fundraiserId}`);
        setActionError(null);
        try {
            const response = await axios.post(`/api/fundraisers/${fundraiserId}/children/${childId}/pay-debt`);
            console.log('Server response:', response);
            alert('Spłata długu zakończona sukcesem!');
            fetchData();
        } catch (err: any) {
            console.error("Detailed Payment Error:", err);
            let detailedMessage = "Wystąpił krytyczny błąd podczas spłaty długu.\n\n";
            if (err.response) {
                detailedMessage += `Endpoint: ${err.config.method?.toUpperCase()} ${err.config.url}\n`;
                detailedMessage += `Status: ${err.response.status} - ${err.response.statusText}\n\n`;
                detailedMessage += "Szczegóły błędu od serwera:\n";
                detailedMessage += JSON.stringify(err.response.data, null, 2);
            } else if (err.request) {
                detailedMessage += "Brak odpowiedzi od serwera.\n";
                detailedMessage += "Sprawdź połączenie z internetem oraz czy serwer backendu jest uruchomiony.\n";
                detailedMessage += `Endpoint: ${err.config.method?.toUpperCase()} ${err.config.url}`;
            } else {
                detailedMessage += `Błąd w aplikacji frontendowej: ${err.message}`;
            }
            setActionError(detailedMessage); // Display the detailed error in the UI
            alert(detailedMessage); // Also show it in an alert for immediate visibility
        }
    };

    const handleSettle = async () => {
        try {
            await axios.post(`/api/fundraisers/${fundraiserId}/settle`);
            alert('Rozliczanie zakończone sukcesem!');
            fetchData();
        } catch (err: any) {
            console.error("Settlement Error:", err.response || err);
            let errorMessage = 'Wystąpił nieoczekiwany błąd.';
            if (err.response) {
                errorMessage = `Błąd serwera: ${err.response.status} - ${err.response.data.message || err.response.statusText}`;
            } else if (err.request) {
                errorMessage = 'Brak odpowiedzi od serwera. Sprawdź połączenie internetowe.';
            } else {
                errorMessage = `Błąd aplikacji: ${err.message}`;
            }
            alert(errorMessage);
        }
    };

    if (loading) return <div>Ładowanie...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;
    if (!fundraiser) return <div>Nie znaleziono zbiórki.</div>;

    const isCurrentUserChild = (childId: number) => {
        return user?.children.some(child => child.id === childId);
    };

    const allDebtsPaid = fundraiser.participants.every(p => !p.debt || p.debt === 0);

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
            <p>Status: <strong>{fundraiser.status}</strong></p>

            {actionError && <div style={{ color: 'red', marginTop: '10px', padding: '10px', border: '1px solid red', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>{actionError}</div>}

            {fundraiser.status === 'ACTIVE' && user?.isTreasurer && (
                <div style={{ display: 'flex', gap: '20px', margin: '30px 0' }}>
                    <div style={{ flex: 1, padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
                        <h4>Akcje Skarbnika</h4>
                        <input type="number" placeholder="Kwota (PLN)" value={actionAmount} onChange={e => setActionAmount(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }} />
                        <input type="text" placeholder="Opis operacji (np. zakup materiałów)" value={actionNote} onChange={e => setActionNote(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px', boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => handleAction('deposit')} style={{ flex: 1, padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>Wpłać</button>
                            <button onClick={() => handleAction('withdraw')} style={{ flex: 1, padding: '10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}>Wypłać</button>
                        </div>
                        <div style={{ marginTop: '20px' }}>
                            <input type="number" placeholder="Nowa kwota docelowa" value={newGoalAmount} onChange={e => setNewGoalAmount(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }} />
                            <button onClick={handleUpdateGoal} style={{ width: '100%', padding: '10px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px' }}>
                                Zaktualizuj kwotę docelową
                            </button>
                        </div>
                        <button onClick={() => setShowFinishConfirmation(true)} style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', marginTop: '10px' }}>
                            Zakończ zbiórkę
                        </button>
                    </div>
                </div>
            )}

            {showFinishConfirmation && (
                <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '20px', border: '1px solid #ccc', zIndex: 1000, borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                    <h4 style={{ marginTop: 0 }}>Zakończ zbiórkę</h4>
                    <p>Czy chcesz wypłacić zebrane środki czy je rozliczyć?</p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                        <button onClick={() => setShowFinishConfirmation(false)} style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px' }}>Anuluj</button>
                        <button onClick={handleReconcile} style={{ padding: '8px 16px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px' }}>Rozlicz</button>
                        <button onClick={handleWithdrawAll} style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>Wypłać</button>
                    </div>
                </div>
            )}

            {fundraiser.status === 'RECONCILING' && (
                <div>
                    <h3>Uczestnicy do rozliczenia</h3>
                    <ul>
                        {fundraiser.participants.map(p => (
                            <li key={p.childId}>
                                {p.childName} - 
                                {p.debt && p.debt > 0 && <span style={{ color: 'red' }}> Dług: {p.debt.toFixed(2)} PLN</span>}
                                {p.credit && p.credit > 0 && <span style={{ color: 'green' }}> Nadpłata: {p.credit.toFixed(2)} PLN</span>}
                                {(!p.debt || p.debt === 0) && (!p.credit || p.credit === 0) && <span> Rozliczono</span>}
                                {p.debt && p.debt > 0 && isCurrentUserChild(p.childId) && (
                                    <button onClick={() => handlePayDebt(p.childId)} style={{ marginLeft: '10px' }}>Spłać dług</button>
                                )}
                            </li>
                        ))}
                    </ul>
                    {user?.isTreasurer && allDebtsPaid && (
                        <button onClick={handleSettle} style={{ marginTop: '20px', padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>
                            Zakończ rozliczanie i zwróć nadpłaty
                        </button>
                    )}
                </div>
            )}

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
