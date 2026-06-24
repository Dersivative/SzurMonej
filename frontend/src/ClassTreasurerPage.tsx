import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CreateFundraiser from './CreateFundraiser';
import FundraiserApplicationEditor from './FundraiserApplicationEditor';
import { getOrCreateClassChat } from './api/chatApi';

interface Child {
    id: number;
    name: string;
    surname: string;
    dateOfBirth?: string;
    membershipId: number;
    status?: string;
}

interface SchoolClass {
    id: number;
    label: string;
    treasurer: { id: number; fullName: string };
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
    parent: { id: number; fullName: string; email: string };
    requestedAt: string;
}

interface Fundraiser {
    id: number;
    title: string;
    description: string;
    goalAmount: number;
    currentAmount: number;
    participants: {
        childId: number;
        childName: string;
        totalContribution: number;
    }[];
}

interface FundraiserApplication {
    id: number;
    title: string;
    description: string;
    fundraiserType: string;
    goalAmount?: number;
    perChildAmount?: number;
    participantIds: number[];
    requestingParent: { fullName: string; };
}

const ClassTreasurerPage: React.FC = () => {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [managedClass, setManagedClass] = useState<SchoolClass | null>(null);
    const [enrollmentLink, setEnrollmentLink] = useState<EnrollmentLink | null>(null);
    const [applications, setApplications] = useState<EnrollmentApplication[]>([]);
    const [fundraiserApplications, setFundraiserApplications] = useState<FundraiserApplication[]>([]);
    const [selectedApplication, setSelectedApplication] = useState<FundraiserApplication | null>(null);
    const [fundraisers, setFundraisers] = useState<Fundraiser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateFundraiserOpen, setCreateFundraiserOpen] = useState(false);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            const classesResponse = await axios.get<SchoolClass[]>('/api/school-classes');
            const myClass = classesResponse.data.find(c => c.treasurer.id === user.id);

            if (!myClass) {
                setError('Nie znaleziono klasy przypisanej do Twojego konta jako skarbnik.');
                setLoading(false);
                return;
            }
            setManagedClass(myClass);

            const [linkResponse, appsResponse, fundraisersResponse, fundraiserAppsResponse] = await Promise.allSettled([
                axios.get<EnrollmentLink>(`/api/school-classes/${myClass.id}/enrollment-link`),
                axios.get<EnrollmentApplication[]>(`/api/school-classes/${myClass.id}/enrollment-applications?status=PENDING`),
                axios.get<Fundraiser[]>(`/api/school-classes/${myClass.id}/fundraisers`),
                axios.get<FundraiserApplication[]>(`/api/fundraiser-applications/class/${myClass.id}/pending`)
            ]);

            if (linkResponse.status === 'fulfilled') setEnrollmentLink(linkResponse.value.data);
            if (appsResponse.status === 'fulfilled') setApplications(appsResponse.value.data);
            if (fundraisersResponse.status === 'fulfilled') setFundraisers(fundraisersResponse.value.data);
            if (fundraiserAppsResponse.status === 'fulfilled') setFundraiserApplications(fundraiserAppsResponse.value.data);

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
            fetchData();
        } catch (err: any) {
            if (err.response?.data?.message) alert(`Błąd: ${err.response.data.message}`);
            else alert('Nie udało się zatwierdzić wniosku.');
        }
    };

    const handleReject = async (applicationId: number) => {
        if (!managedClass) return;
        try {
            await axios.post(`/api/school-classes/${managedClass.id}/enrollment-applications/${applicationId}/reject`);
            fetchData();
        } catch (err) { alert('Nie udało się odrzucić wniosku.'); }
    };

    const handleRemoveMember = async (membershipId: number) => {
        if (!window.confirm("Czy na pewno chcesz usunąć to dziecko z klasy?")) return;
        try {
            await axios.delete(`/api/class-memberships/${membershipId}`);
            fetchData();
        } catch (err: any) {
            if (err.response?.data?.message) {
                alert(`Błąd: ${err.response.data.message}`);
            } else {
                alert('Nie udało się usunąć dziecka z klasy.');
            }
        }
    };

    const handleOpenClassChat = async () => {
        if (!managedClass) return;
        try {
            const chat = await getOrCreateClassChat(managedClass.id);
            navigate(`/chats/${chat.id}`);
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Nie udało się otworzyć czatu klasy.';
            alert(msg);
        }
    };

    if (!isAuthenticated) return <Navigate to="/user" />;
    if (loading) return <div>Ładowanie danych klasy...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;
    if (!managedClass) return <div>Brak przypisanej klasy.</div>;

    return (
        <div style={{ padding: '20px' }}>
            {isCreateFundraiserOpen && (
                <CreateFundraiser 
                    classId={managedClass.id}
                    children={managedClass.children || []}
                    onSuccess={fetchData}
                    onClose={() => setCreateFundraiserOpen(false)}
                />
            )}
            {selectedApplication && (
                <FundraiserApplicationEditor
                    application={selectedApplication}
                    classChildren={managedClass.children || []}
                    onClose={() => setSelectedApplication(null)}
                    onSuccess={fetchData}
                />
            )}

            <h1>Zarządzanie klasą: {managedClass.label}</h1>

            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={handleOpenClassChat}
                    style={{ padding: '10px 16px', backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                >
                    Otwórz czat klasy
                </button>
            </div>

            <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px', borderRadius: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ margin: 0 }}>Zbiórki klasowe ({fundraisers.length})</h2>
                    <button onClick={() => setCreateFundraiserOpen(true)} style={{ backgroundColor: '#28a745', color: 'white', padding: '8px 16px' }}>+ Nowa zbiórka</button>
                </div>
                {fundraisers.length > 0 ? (
                    fundraisers.map(f => (
                        <Link to={`/fundraiser/${f.id}`} key={f.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div style={{ borderTop: '1px solid #eee', paddingTop: '10px', marginTop: '10px', cursor: 'pointer' }}>
                                <h4>{f.title}</h4>
                                <p>{f.description}</p>
                                <div style={{ backgroundColor: '#e9ecef', borderRadius: '5px', height: '20px', width: '100%', overflow: 'hidden', marginBottom: '5px' }}>
                                    <div style={{ backgroundColor: '#28a745', height: '100%', width: `${Math.min((f.currentAmount / f.goalAmount) * 100, 100)}%` }}></div>
                                </div>
                                <small>Zebrano: {f.currentAmount.toFixed(2)} PLN z {f.goalAmount.toFixed(2)} PLN</small>
                            </div>
                        </Link>
                    ))
                ) : (
                    <p>Brak aktywnych zbiórek.</p>
                )}
            </div>

            <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px', borderRadius: '5px' }}>
                <h2>Oczekujące wnioski o zbiórki ({fundraiserApplications.length})</h2>
                {fundraiserApplications.length > 0 ? (
                    <ul style={{ listStyleType: 'none', padding: 0 }}>
                        {fundraiserApplications.map(app => (
                            <li key={app.id} onClick={() => setSelectedApplication(app)} style={{ borderBottom: '1px solid #eee', padding: '10px', cursor: 'pointer' }}>
                                <div>
                                    <strong>Tytuł:</strong> {app.title}<br/>
                                    <strong>Wnioskujący:</strong> {app.requestingParent.fullName}<br/>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>Brak oczekujących wniosków o zbiórki.</p>
                )}
            </div>

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

            <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px', borderRadius: '5px' }}>
                <h2>Dzieci przypisane do klasy ({managedClass.children?.length || 0})</h2>
                {managedClass.children && managedClass.children.length > 0 ? (
                    <ul style={{ listStyleType: 'none', padding: 0 }}>
                        {managedClass.children.map(child => {
                            const isPendingRemoval = child.status === 'REMOVAL_PENDING';
                            return (
                                <li key={child.id} style={{ 
                                    borderBottom: '1px solid #eee', 
                                    padding: '10px 0', 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    backgroundColor: isPendingRemoval ? '#fcf8e3' : 'transparent',
                                    opacity: isPendingRemoval ? 0.7 : 1
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <img 
                                            src={`/api/children/${child.id}/avatar`} 
                                            alt={`Awatar ${child.name}`} 
                                            style={{ width: '50px', height: '50px', borderRadius: '50%', marginRight: '15px', objectFit: 'cover' }}
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.onerror = null;
                                                target.src = 'https://via.placeholder.com/50';
                                            }}
                                        />
                                        <div>
                                            <strong>{child.name} {child.surname}</strong>
                                            {child.dateOfBirth && <div style={{ color: '#666', fontSize: '0.9em' }}>(ur. {child.dateOfBirth})</div>}
                                            {isPendingRemoval && <div style={{ color: '#8a6d3b', fontWeight: 'bold', fontSize: '0.9em' }}>W trakcie usuwania...</div>}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveMember(child.membershipId)} 
                                        style={{ 
                                            backgroundColor: isPendingRemoval ? '#ccc' : 'lightcoral', 
                                            padding: '5px 10px',
                                            cursor: isPendingRemoval ? 'not-allowed' : 'pointer'
                                        }}
                                        disabled={isPendingRemoval}
                                    >
                                        {isPendingRemoval ? 'Oczekuje' : 'Usuń z klasy'}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p>Brak dzieci przypisanych do tej klasy.</p>
                )}
            </div>

            <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
                <h2>Oczekujące wnioski o zapis ({applications.length})</h2>
                {applications.length > 0 ? (
                    <ul style={{ listStyleType: 'none', padding: 0 }}>
                        {applications.map(app => (
                            <li key={app.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <strong>Dziecko:</strong> {app.child.name} {app.child.surname}<br/>
                                    <strong>Rodzic:</strong> {app.parent.fullName} ({app.parent.email})<br/>
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