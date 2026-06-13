import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import axios from 'axios';

interface EnrollmentLinkPreview {
    schoolClassName: string;
    schoolClassId: number;
    treasurerName: string;
}

interface Child {
    id: number;
    name: string;
    surname: string;
}

interface EnrollmentApplicationRequest {
    childId: number;
}

const EnrollmentPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const { user, isAuthenticated } = useAuth();
    const [preview, setPreview] = useState<EnrollmentLinkPreview | null>(null);
    const [children, setChildren] = useState<Child[]>([]);
    const [selectedChild, setSelectedChild] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchPreview = useCallback(async () => {
        if (!token) return;
        try {
            const response = await axios.get<EnrollmentLinkPreview>(`/api/enrollment-links/${token}`);
            setPreview(response.data);
        } catch (err) {
            setError('Nieprawidłowy lub wygasły link zaproszenia.');
        }
    }, [token]);

    const fetchChildren = useCallback(async () => {
        if (!user) return;
        try {
            const response = await axios.get<Child[]>('/api/users/me/children');
            setChildren(response.data);
            if (response.data.length > 0) {
                setSelectedChild(response.data[0].id.toString());
            }
        } catch (err) {
            setError('Nie udało się pobrać listy Twoich dzieci.');
        }
    }, [user]);

    useEffect(() => {
        if (!isAuthenticated) return;
        setLoading(true);
        Promise.all([fetchPreview(), fetchChildren()]).finally(() => setLoading(false));
    }, [isAuthenticated, fetchPreview, fetchChildren]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !selectedChild) {
            setError('Musisz wybrać dziecko do zapisu.');
            return;
        }
        setError(null);
        setSuccess(null);

        const request: EnrollmentApplicationRequest = {
            childId: parseInt(selectedChild, 10),
        };

        try {
            await axios.post(`/api/enrollment-links/${token}/applications`, request);
            setSuccess(`Twoja prośba o zapisanie dziecka do klasy "${preview?.schoolClassName}" została wysłana do skarbnika. Otrzymasz powiadomienie po jej rozpatrzeniu.`);
        } catch (err: any) {
            if (err.response?.data) {
                setError(`Błąd: ${err.response.data}`);
            } else {
                setError('Wystąpił nieoczekiwany błąd podczas wysyłania prośby.');
            }
        }
    };

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    if (loading) return <div>Ładowanie...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
            <h1>Zapisy do klasy</h1>
            {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
            {success ? (
                <div style={{ color: 'green' }}>{success}</div>
            ) : preview ? (
                <div>
                    <p>Jesteś w trakcie zapisywania dziecka do klasy:</p>
                    <div style={{ background: '#f0f0f0', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
                        <h2>{preview.schoolClassName}</h2>
                        <p>Skarbnik: {preview.treasurerName}</p>
                    </div>
                    {children.length > 0 ? (
                        <form onSubmit={handleSubmit}>
                            <label htmlFor="child-select" style={{ display: 'block', marginBottom: '10px' }}>Wybierz dziecko, które chcesz zapisać:</label>
                            <select
                                id="child-select"
                                value={selectedChild}
                                onChange={(e) => setSelectedChild(e.target.value)}
                                style={{ width: '100%', padding: '8px', marginBottom: '20px' }}
                            >
                                {children.map(child => (
                                    <option key={child.id} value={child.id}>
                                        {child.name} {child.surname}
                                    </option>
                                ))}
                            </select>
                            <button type="submit" style={{ padding: '10px 20px' }}>Wyślij prośbę o zapis</button>
                        </form>
                    ) : (
                        <p>Nie masz jeszcze dodanych żadnych dzieci. Dodaj je na swoim profilu, aby móc je zapisać do klasy.</p>
                    )}
                </div>
            ) : null}
        </div>
    );
};

export default EnrollmentPage;
