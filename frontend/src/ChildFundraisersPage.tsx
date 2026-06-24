import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './AuthContext';

axios.defaults.withCredentials = true;

interface Fundraiser {
    id: number;
    title: string;
    description: string;
    goalAmount: number;
    currentAmount: number;
    suggestedContribution: number;
    status: 'ACTIVE' | 'RECONCILING' | 'FINISHED';
    fundraiserType: 'TOTAL_GOAL' | 'PER_CHILD_GOAL';
    perChildAmount?: number;
    classId?: number;
}

interface FundraiserApplication {
    id: number;
    title: string;
    description: string;
    goalAmount: number;
    perChildAmount: number;
    fundraiserType: 'TOTAL_GOAL' | 'PER_CHILD_GOAL';
    participantIds: number[];
    requestingParent: { fullName: string; };
}

interface ChildFundraisersView {
    activeFundraisers: Fundraiser[];
    pendingApplications: FundraiserApplication[];
}

const ChildFundraisersPage: React.FC = () => {
    const { childId } = useParams<{ childId: string }>();
    const navigate = useNavigate();
    const auth = useAuth();
    const [view, setView] = useState<ChildFundraisersView>({ activeFundraisers: [], pendingApplications: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [childClassId, setChildClassId] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        if (!childId) return;
        setLoading(true);
        try {
            const response = await axios.get<ChildFundraisersView>(`/api/users/me/children/${childId}/fundraisers`);
            setView(response.data);
            if (response.data.activeFundraisers.length > 0) {
                setChildClassId(response.data.activeFundraisers[0].classId || null);
            }
        } catch (err) {
            setError('Nie udało się pobrać zbiórek dla tego dziecka.');
        } finally {
            setLoading(false);
        }
    }, [childId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handlePay = async (fundraiserId: number) => {
        if (!window.confirm(`Czy na pewno chcesz wpłacić na tę zbiórkę?`)) return;
        try {
            await axios.post('/api/account/transfer-to-fundraiser', {
                fundraiserId,
                childId: parseInt(childId!, 10),
                note: 'Wpłata na zbiórkę'
            });
            alert('Wpłata zakończona sukcesem!');
            fetchData();
        } catch (err: any) {
            console.error("Payment Error Details:", err);
            
            let detailedMessage = "Wystąpił krytyczny błąd.\n\n";
            
            if (err.response) {
                detailedMessage += `Endpoint: ${err.config.method?.toUpperCase()} ${err.config.url}\n`;
                detailedMessage += `Status: ${err.response.status} - ${err.response.statusText}\n\n`;
                detailedMessage += "Odpowiedź serwera:\n";
                detailedMessage += JSON.stringify(err.response.data, null, 2);
            } else if (err.request) {
                detailedMessage += "Brak odpowiedzi od serwera.\n";
                detailedMessage += "Sprawdź połączenie z internetem oraz czy serwer backendu jest uruchomiony.\n";
                detailedMessage += `Endpoint: ${err.config.method?.toUpperCase()} ${err.config.url}`;
            } else {
                detailedMessage += `Błąd w aplikacji frontendowej: ${err.message}`;
            }
            
            alert(detailedMessage);
        }
    };

    if (loading) return <div>Ładowanie...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Zbiórki dla Twojego dziecka</h1>
                {childClassId && (
                    <button onClick={() => navigate('/create-fundraiser-application', { state: { classId: childClassId, childId: childId } })}>
                        + Zaproponuj nową zbiórkę
                    </button>
                )}
            </div>
            <p>Twoje saldo: {auth.user?.balance?.toFixed(2) ?? '0.00'} PLN</p>
            
            <h2>Aktywne zbiórki</h2>
            {view.activeFundraisers.length === 0 ? (
                <p>Brak aktywnych zbiórek.</p>
            ) : (
                view.activeFundraisers.map(f => (
                    <div key={f.id} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
                        <h2>{f.title}</h2>
                        <p>{f.description}</p>
                        <p>
                            <strong>Typ zbiórki:</strong> {f.fundraiserType === 'TOTAL_GOAL' ? 'Cel całościowy' : 'Na dziecko'}
                        </p>
                        {f.fundraiserType === 'PER_CHILD_GOAL' && (
                            <p><strong>Kwota na dziecko:</strong> {f.perChildAmount?.toFixed(2)} PLN</p>
                        )}
                        <p>Status: <strong>{f.status}</strong></p>
                        <div style={{ backgroundColor: '#e9ecef', borderRadius: '5px', height: '24px', width: '100%', overflow: 'hidden', marginBottom: '5px' }}>
                            <div style={{ backgroundColor: '#28a745', height: '100%', width: `${Math.min((f.currentAmount / f.goalAmount) * 100, 100)}%` }}></div>
                        </div>
                        <p>Zebrano: {f.currentAmount.toFixed(2)} PLN z {f.goalAmount.toFixed(2)} PLN</p>
                        
                        {f.status === 'RECONCILING' ? (
                            <div>
                                <p style={{ color: 'orange', fontWeight: 'bold' }}>Zbiórka jest w trakcie rozliczania.</p>
                                <p>Sugerowana wpłata (dług): <strong>{f.suggestedContribution.toFixed(2)} PLN</strong></p>
                                <Link to={`/fundraiser/${f.id}`} style={{ textDecoration: 'none', color: 'blue', fontWeight: 'bold' }}>
                                    Przejdź do rozliczenia &rarr;
                                </Link>
                            </div>
                        ) : f.status === 'ACTIVE' ? (
                            f.suggestedContribution > 0 ? (
                                <div>
                                    <p>Sugerowana składka: <strong>{f.suggestedContribution.toFixed(2)} PLN</strong></p>
                                    <button 
                                        onClick={() => handlePay(f.id)}
                                        style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
                                    >
                                        Wpłać sugerowaną kwotę
                                    </button>
                                </div>
                            ) : (
                                <p style={{ color: 'green', fontWeight: 'bold' }}>Twoja składka na tę zbiórkę jest opłacona.</p>
                            )
                        ) : (
                             <p style={{ color: 'green', fontWeight: 'bold' }}>Zbiórka zakończona.</p>
                        )}

                        <div style={{ marginTop: '12px' }}>
                            <Link
                                to={`/fundraiser/${f.id}`}
                                style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}
                            >
                                Zobacz szczegóły zbiórki &rarr;
                            </Link>
                        </div>
                    </div>
                ))
            )}

            <h2 style={{ marginTop: '40px' }}>Proponowane zbiórki</h2>
            {view.pendingApplications.length === 0 ? (
                <p>Brak proponowanych zbiórek.</p>
            ) : (
                view.pendingApplications.map(app => (
                    <div key={app.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '20px', marginBottom: '20px', backgroundColor: '#fffbe6' }}>
                        <h3>{app.title}</h3>
                        <p>{app.description}</p>
                        <p><strong>Typ zbiórki:</strong> {app.fundraiserType === 'TOTAL_GOAL' ? 'Cel całościowy' : 'Na dziecko'}</p>
                        {app.fundraiserType === 'TOTAL_GOAL' && (
                            <p><strong>Cel:</strong> {app.goalAmount.toFixed(2)} PLN</p>
                        )}
                        {app.fundraiserType === 'PER_CHILD_GOAL' && (
                            <p><strong>Składka na dziecko:</strong> {app.perChildAmount.toFixed(2)} PLN</p>
                        )}
                        <p><strong>Liczba uczestników:</strong> {app.participantIds.length}</p>
                        <p><strong>Zaproponowane przez:</strong> {app.requestingParent.fullName}</p>
                    </div>
                ))
            )}
        </div>
    );
};

export default ChildFundraisersPage;