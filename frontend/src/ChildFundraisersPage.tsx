import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './AuthContext';

axios.defaults.withCredentials = true; // Ensure cookies are sent with every request

interface Fundraiser {
    id: number;
    title: string;
    description: string;
    goalAmount: number;
    currentAmount: number;
    suggestedContribution: number;
    status: 'ACTIVE' | 'RECONCILING' | 'FINISHED';
    participants: {
        childId: number;
        childName: string;
        totalContribution: number;
    }[];
}

const ChildFundraisersPage: React.FC = () => {
    const { childId } = useParams<{ childId: string }>();
    const auth = useAuth();
    const [fundraisers, setFundraisers] = useState<Fundraiser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!childId) return;
        setLoading(true);
        try {
            const response = await axios.get<Fundraiser[]>(`/api/children/${childId}/fundraisers`);
            setFundraisers(response.data);
        } catch (err) {
            setError('Nie udało się pobrać zbiórek dla tego dziecka.');
        } finally {
            setLoading(false);
        }
    }, [childId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handlePay = async (fundraiserId: number, amount: number) => {
        if (!window.confirm(`Czy na pewno chcesz wpłacić ${amount.toFixed(2)} PLN na tę zbiórkę?`)) return;
        try {
            await axios.post('/api/account/transfer-to-fundraiser', {
                fundraiserId,
                childId: parseInt(childId!, 10),
                amount,
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
            <h1>Zbiórki dla Twojego dziecka</h1>
            <p>Twoje saldo: {auth.user?.balance?.toFixed(2) ?? '0.00'} PLN</p>
            {fundraisers.length === 0 ? (
                <p>Brak aktywnych zbiórek.</p>
            ) : (
                fundraisers.map(f => (
                    <div key={f.id} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
                        <h2>{f.title}</h2>
                        <p>{f.description}</p>
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
                                        onClick={() => handlePay(f.id, f.suggestedContribution)}
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
        </div>
    );
};

export default ChildFundraisersPage;
