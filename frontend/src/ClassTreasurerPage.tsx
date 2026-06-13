import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { Navigate } from 'react-router-dom';
import axios from 'axios';

interface Child {
    id: number;
    name: string;
    surname: string;
    dateOfBirth?: string;
}

interface SchoolClass {
    id: number;
    label: string;
    treasurer: { id: number; username: string };
    children?: Child[];
}

interface EnrollmentLink {
    token: string;
    url: string;
    active: boolean;
    createdAt: string;
}

interface EnrollmentApplication {
    id: number;
    status: string;
    child: { id: number; name: string; surname: string };
    parent: { id: number; username: string; email: string };
    requestedAt: string;
}

const ClassTreasurerPage: React.FC = () => {
    const { user, isAuthenticated } = useAuth();
    const [managedClass, setManagedClass] = useState<SchoolClass | null>(null);
    const [enrollmentLink, setEnrollmentLink] = useState<EnrollmentLink | null>(null);
    const [applications, setApplications] = useState<EnrollmentApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            // 1. Find the class managed by the user
            const classesResponse = await axios.get<SchoolClass[]>('/api/school-classes');
            // Assuming we check by username since id might not be in the user object from AuthContext
            const myClass = classesResponse.data.find(c => c.treasurer.username === user.username);

            if (!myClass) {
                setError('Nie znaleziono klasy przypisanej do Twojego konta jako skarbnik.');
                setLoading(false);
                return;
            }

            setManagedClass(myClass);

            // 2. Fetch enrollment link
            try {
                const linkResponse = await axios.get<EnrollmentLink>(`/api/school-classes/${myClass.id}/enrollment-link`);
                setEnrollmentLink(linkResponse.data);
            } catch (err: any) {
                // Ignore 404 if no active link exists
                if (err.response?.status !== 404) {
                    console.error('Błąd pobierania linku', err);
                }
            }

            // 3. Fetch pending applications
            const appsResponse = await axios.get<EnrollmentApplication[]>(`/api/school-classes/${myClass.id}/enrollment-applications?status=PENDING`);
            setApplications(appsResponse.data);

        } catch (err) {
            console.error('Błąd podczas pobierania danych klasy', err);
            setError('Wystąpił błąd podczas ładowania danych.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated, fetchData]);

    const handleGenerateLink = async () => {
        if (!managedClass) return;
        try {
            const response = await axios.post<EnrollmentLink>(`/api/school-classes/${managedClass.id}/enrollment-link`);
            setEnrollmentLink(response.data);
        } catch (err) {
            console.error('Błąd podczas generowania linku', err);
            alert('Nie udało się wygenerować linku.');
        }
    };

    const handleDeactivateLink = async () => {
        if (!managedClass) return;
        try {
            await axios.delete(`/api/school-classes/${managedClass.id}/enrollment-link`);
            setEnrollmentLink(null);
        } catch (err) {
            console.error('Błąd podczas dezaktywacji linku', err);
            alert('Nie udało się dezaktywować linku.');
        }
    };

    const handleApprove = async (applicationId: number) => {
        if (!managedClass) return;
        try {
            await axios.post(`/api/school-classes/${managedClass.id}/enrollment-applications/${applicationId}/approve`);
            fetchData(); // Refresh list
        } catch (err) {
            console.error('Błąd podczas zatwierdzania wniosku', err);
            alert('Nie udało się zatwierdzić wniosku.');
        }
    };

    const handleReject = async (applicationId: number) => {
        if (!managedClass) return;
        try {
            await axios.post(`/api/school-classes/${managedClass.id}/enrollment-applications/${applicationId}/reject`);
            fetchData(); // Refresh list
        } catch (err) {
            console.error('Błąd podczas odrzucania wniosku', err);
            alert('Nie udało się odrzucić wniosku.');
        }
    };

    if (!isAuthenticated) {
        return <Navigate to="/user" />;
    }

    if (loading) return <div>Ładowanie danych klasy...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;
    if (!managedClass) return <div>Brak przypisanej klasy.</div>;

    return (
        <div style={{ padding: '20px' }}>
            <h1>Zarządzanie klasą: {managedClass.label}</h1>

            {/* Section for Enrollment Link */}
            <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px', borderRadius: '5px' }}>
                <h2>Link do zapisu</h2>
                {enrollmentLink ? (
                    <div>
                        <p><strong>Aktywny link:</strong> <a href={enrollmentLink.url} target="_blank" rel="noopener noreferrer">{enrollmentLink.url}</a></p>
                        <button onClick={() => navigator.clipboard.writeText(enrollmentLink.url)} style={{ marginRight: '10px' }}>Skopiuj link</button>
                        <button onClick={handleDeactivateLink} style={{ marginRight: '10px', backgroundColor: 'lightcoral' }}>Dezaktywuj link</button>
                        <button onClick={handleGenerateLink}>Wygeneruj nowy link</button>
                        <p style={{ fontSize: '0.8em', color: 'gray' }}>Wygenerowanie nowego linku dezaktywuje stary.</p>
                    </div>
                ) : (
                    <div>
                        <p>Obecnie nie masz aktywnego linku do zapisów.</p>
                        <button onClick={handleGenerateLink}>Generuj link</button>
                    </div>
                )}
            </div>

            {/* Section for Class Members */}
            <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px', borderRadius: '5px' }}>
                <h2>Dzieci przypisane do klasy ({managedClass.children?.length || 0})</h2>
                {managedClass.children && managedClass.children.length > 0 ? (
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px' }}>
                        {managedClass.children.map(child => (
                            <li key={child.id} style={{ padding: '5px 0' }}>
                                <strong>{child.name} {child.surname}</strong>
                                {child.dateOfBirth && <span style={{ marginLeft: '10px', color: '#666', fontSize: '0.9em' }}>(ur. {child.dateOfBirth})</span>}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>Brak dzieci przypisanych do tej klasy.</p>
                )}
            </div>

            {/* Section for Enrollment Applications */}
            <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
                <h2>Oczekujące wnioski o zapis ({applications.length})</h2>
                {applications.length > 0 ? (
                    <ul style={{ listStyleType: 'none', padding: 0 }}>
                        {applications.map(app => (
                            <li key={app.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <strong>Dziecko:</strong> {app.child.name} {app.child.surname}<br/>
                                    <strong>Rodzic:</strong> {app.parent.username} ({app.parent.email})<br/>
                                    <span style={{ fontSize: '0.8em', color: 'gray' }}>Złożono: {new Date(app.requestedAt).toLocaleString()}</span>
                                </div>
                                <div>
                                    <button onClick={() => handleApprove(app.id)} style={{ marginRight: '10px', backgroundColor: 'lightgreen' }}>Zatwierdź</button>
                                    <button onClick={() => handleReject(app.id)} style={{ backgroundColor: 'lightcoral' }}>Odrzuć</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>Brak oczekujących wniosków.</p>
                )}
            </div>
        </div>
    );
};

export default ClassTreasurerPage;
