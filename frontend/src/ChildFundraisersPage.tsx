import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

interface Fundraiser {
    id: number;
    title: string;
    description: string;
    goalAmount: number;
    currentAmount: number;
    suggestedContribution: number;
    participants: {
        childId: number;
        childName: string;
        totalContribution: number;
    }[];
}

const ChildFundraisersPage: React.FC = () => {
    const { childId } = useParams<{ childId: string }>();
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
                note: null
            });
            fetchData();
        } catch (err: any) {
            let errorMessage = 'Wystąpił nieoczekiwany błąd.\n';
            if (err.response) {
                // Błąd odpowiedzi z serwera (np. 4xx, 5xx)
                errorMessage += `Status: ${err.response.status}\n`;
                errorMessage += `Data: ${JSON.stringify(err.response.data)}\n`;
            } else if (err.request) {
                // Żądanie zostało wysłane, ale nie było odpowiedzi
                errorMessage += 'Brak odpowiedzi od serwera. Sprawdź połączenie sieciowe.';
            } else {
                // Błąd w konfiguracji żądania
                errorMessage += `Błąd konfiguracji żądania: ${err.message}`;
            }
            console.error(err); // Zapisz pełny obiekt błędu w konsoli deweloperskiej
            alert(errorMessage);
        }
    };

    if (loading) return <div>Ładowanie...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;

    return (
        <div style={{ padding: '20px' }}>
            <Link to="/user" style={{ marginBottom: '20px', display: 'inline-block' }}>&larr; Powrót do listy dzieci</Link>
            <h1>Zbiórki dla dziecka</h1>
            {fundraisers.length > 0 ? (
                fundraisers.map(f => {
                    const myContribution = f.participants.find(p => p.childId === parseInt(childId!, 10))?.totalContribution || 0;
                    const isPaid = myContribution >= f.suggestedContribution;

                    return (
                        <div key={f.id} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px', borderRadius: '5px' }}>
                            <h3>{f.title}</h3>
                            <p>{f.description}</p>
                            <div style={{ backgroundColor: '#e9ecef', borderRadius: '5px', height: '20px', width: '100%', overflow: 'hidden', marginBottom: '5px' }}>
                                <div style={{ backgroundColor: '#28a745', height: '100%', width: `${Math.min((f.currentAmount / f.goalAmount) * 100, 100)}%` }}></div>
                            </div>
                            <small>Zebrano: {f.currentAmount.toFixed(2)} PLN z {f.goalAmount.toFixed(2)} PLN</small>
                            
                            <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                                <p>Sugerowana składka dla Twojego dziecka: <strong>{f.suggestedContribution.toFixed(2)} PLN</strong></p>
                                <p>Już wpłacono: <strong>{myContribution.toFixed(2)} PLN</strong></p>
                                {!isPaid ? (
                                    <button onClick={() => handlePay(f.id, f.suggestedContribution - myContribution)} style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white' }}>
                                        Wpłać brakującą kwotę ({ (f.suggestedContribution - myContribution).toFixed(2) } PLN)
                                    </button>
                                ) : (
                                    <p style={{ color: 'green', fontWeight: 'bold' }}>Twoja składka na tę zbiórkę została opłacona w całości. Dziękujemy!</p>
                                )}
                            </div>
                        </div>
                    );
                })
            ) : (
                <p>To dziecko nie jest aktualnie przypisane do żadnych zbiórek.</p>
            )}
        </div>
    );
};

export default ChildFundraisersPage;
