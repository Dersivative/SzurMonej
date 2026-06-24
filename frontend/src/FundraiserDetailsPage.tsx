import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { getOrCreateFundraiserChat } from './api/chatApi';
import { getPendingRefundRequests, approveRefundRequest, rejectRefundRequest, createRefundRequest } from './api/refundRequestApi';
import type { RefundRequest } from './api/refundRequestApi';

axios.defaults.withCredentials = true;

interface ContributionSummary {
    paidAt: string;
    amount: number;
}

interface ParticipantDetails {
    childId: number;
    childName: string;
    childFirstName?: string;
    childSurname?: string;
    totalContribution: number;
    debt: number | null;
    credit: number | null;
    status: string;
    contributions: ContributionSummary[];
}

interface ClassChild {
    id: number;
    name: string;
    surname: string;
}

interface FundraiserDetails {
    id: number;
    title: string;
    description: string;
    goalAmount: number;
    currentAmount: number;
    startedAt?: string;
    endedAt?: string;
    status: 'ACTIVE' | 'RECONCILING' | 'FINISHED';
    fundraiserType: 'TOTAL_GOAL' | 'PER_CHILD_GOAL';
    perChildAmount?: number;
    classId?: number;
    classLabel?: string;
    treasurer?: { id: number; fullName: string };
    participants: ParticipantDetails[];
    nonParticipants: ClassChild[];
    history: {
        id: number;
        date: string;
        description: string;
        amount: number;
        type: string;
        hasAttachment: boolean;
        payerName?: string;
        payeeName?: string;
    }[];
}

const STATUS_LABELS: Record<FundraiserDetails['status'], string> = {
    ACTIVE: 'Otwarta',
    RECONCILING: 'Rozliczanie',
    FINISHED: 'Zakończona',
};

function formatDate(date?: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('pl-PL');
}

const FundraiserDetailsPage: React.FC = () => {
    const { fundraiserId } = useParams<{ fundraiserId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [fundraiser, setFundraiser] = useState<FundraiserDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionAmount, setActionAmount] = useState('');
    const [actionNote, setActionNote] = useState('');
    const [newGoalAmount, setNewGoalAmount] = useState('');
    const [actionError, setActionError] = useState<string | null>(null);
    const [refundError, setRefundError] = useState<string | null>(null);
    const [showFinishConfirmation, setShowFinishConfirmation] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
    const [selectedChildToAdd, setSelectedChildToAdd] = useState<number | null>(null);
    const [pendingRefunds, setPendingRefunds] = useState<RefundRequest[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    const [editedDescription, setEditedDescription] = useState('');

    const fetchData = useCallback(async () => {
        if (!fundraiserId) return;
        try {
            setLoading(true);
            const response = await axios.get<FundraiserDetails>(`/api/fundraisers/${fundraiserId}`);
            setFundraiser(response.data);
            setEditedTitle(response.data.title);
            setEditedDescription(response.data.description);

            if (response.data.id && user?.isTreasurer) {
                const refundRequests = await getPendingRefundRequests(response.data.id);
                setPendingRefunds(refundRequests);
            }
        } catch {
            setError('Nie udało się pobrać szczegółów zbiórki.');
        } finally {
            setLoading(false);
        }
    }, [fundraiserId, user?.isTreasurer]);

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
            setActionError(err.response?.data?.error || err.response?.data?.message || 'Wystąpił nieoczekiwany błąd.');
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
            const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Wystąpił nieoczekiwany błąd.';
            setActionError(errorMessage);
            alert(errorMessage);
        }
    };

    const handleUpdateDetails = async () => {
        setActionError(null);
        try {
            await axios.patch(`/api/fundraisers/${fundraiserId}/details`, {
                title: editedTitle,
                description: editedDescription
            });
            setIsEditing(false);
            fetchData();
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Wystąpił nieoczekiwany błąd.';
            setActionError(errorMessage);
            alert(errorMessage);
        }
    };

    const handleAddParticipant = async () => {
        if (!selectedChildToAdd) {
            setActionError('Wybierz dziecko do dodania.');
            return;
        }
        setActionError(null);
        try {
            await axios.post(`/api/fundraisers/${fundraiserId}/participants`, {
                childId: selectedChildToAdd
            });
            alert('Dziecko zostało dodane do zbiórki.');
            setSelectedChildToAdd(null);
            fetchData();
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Wystąpił nieoczekiwany błąd podczas dodawania uczestnika.';
            setActionError(errorMessage);
            alert(errorMessage);
        }
    };

    const handlePayForOther = async (childId: number) => {
        const isOwnChild = user?.children.some(c => c.id === childId);
        if (!isOwnChild) {
            if (!window.confirm(`Czy na pewno chcesz wpłacić za to dziecko?`)) {
                return;
            }
        }

        try {
            await axios.post('/api/account/transfer-to-fundraiser', {
                fundraiserId: fundraiser?.id,
                childId,
                note: `Wpłata za ${isOwnChild ? 'swoje' : 'inne'} dziecko przez ${user?.fullName}`
            });
            alert('Wpłata zakończona sukcesem!');
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || err.response?.data?.message || 'Wystąpił błąd podczas wpłaty.');
        }
    };

    const handleRemoveParticipant = async (childId: number) => {
        if (!window.confirm("Czy na pewno chcesz usunąć to dziecko ze zbiórki? Spowoduje to utworzenie prośby o zwrot wpłaconych środków.")) return;
        try {
            await axios.delete(`/api/fundraisers/${fundraiserId}/participants/${childId}`);
            alert("Dziecko usunięte, prośba o zwrot środków została utworzona.");
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || err.response?.data?.message || 'Wystąpił błąd.');
        }
    };

    const handleRequestRefund = async (childId: number) => {
        if (!window.confirm("Czy na pewno chcesz poprosić o zwrot środków dla tego dziecka?")) return;
        try {
            await createRefundRequest(Number(fundraiserId), childId);
            alert("Prośba o zwrot została wysłana do skarbnika.");
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || err.response?.data?.message || 'Wystąpił błąd.');
        }
    };

    const handleApproveRefund = async (requestId: number) => {
        setRefundError(null);
        try {
            await approveRefundRequest(requestId);
            alert("Prośba o zwrot została zatwierdzona.");
            fetchData();
        } catch (err: any) {
            const errorMessage = err.response?.data || 'Wystąpił błąd podczas zatwierdzania zwrotu.';
            setRefundError(errorMessage);
        }
    };

    const handleRejectRefund = async (requestId: number) => {
        setRefundError(null);
        try {
            await rejectRefundRequest(requestId);
            alert("Prośba o zwrot została odrzucona.");
            fetchData();
        } catch (err: any) {
            const errorMessage = err.response?.data || 'Wystąpił błąd podczas odrzucania zwrotu.';
            setRefundError(errorMessage);
        }
    };

    const handleWithdrawAll = async () => {
        try {
            await axios.post(`/api/fundraisers/${fundraiserId}/withdraw-all`);
            fetchData();
        } catch {
            setActionError('Wystąpił błąd podczas wypłacania środków.');
        } finally {
            setShowFinishConfirmation(false);
        }
    };

    const handleReopen = async () => {
        try {
            await axios.post(`/api/fundraisers/${fundraiserId}/reopen`);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || err.response?.data?.message || 'Wystąpił błąd.');
        }
    };

    const handleReconcile = async () => {
        try {
            await axios.post(`/api/fundraisers/${fundraiserId}/reconcile`, { note: 'Rozliczenie zbiórki' });
            fetchData();
        } catch {
            setActionError('Wystąpił błąd podczas rozliczania zbiórki.');
        } finally {
            setShowFinishConfirmation(false);
        }
    };

    const handleSettle = async () => {
        try {
            await axios.post(`/api/fundraisers/${fundraiserId}/settle`);
            alert('Rozliczanie zakończone sukcesem!');
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || err.response?.data?.message || 'Wystąpił błąd.');
        }
    };

    const handleUploadClick = (historyId: number) => {
        setSelectedHistoryId(historyId);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedHistoryId) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            await axios.post(`/api/attachments/upload/${selectedHistoryId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Dowód został pomyślnie wgrany.');
            fetchData();
        } catch (err: any) {
            alert(`Błąd podczas wgrywania pliku: ${err.response?.data?.message || 'Nieznany błąd'}`);
        }
    };

    const handleOpenFundraiserChat = async () => {
        if (!fundraiserId) return;
        try {
            const chat = await getOrCreateFundraiserChat(Number(fundraiserId));
            navigate(`/chats/${chat.id}`);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Nie udało się otworzyć czatu zbiórki.');
        }
    };

    if (loading) return <div>Ładowanie...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;
    if (!fundraiser) return <div>Nie znaleziono zbiórki.</div>;

    const isTreasurer = user?.isTreasurer;
    const allDebtsPaid = fundraiser.participants.every(p => !p.debt || p.debt === 0);
    const backLink = isTreasurer ? '/class-management' : '/user';
    const backLabel = isTreasurer ? 'Powrót do zarządzania klasą' : 'Powrót do konta';

    const renderGeneralInfo = () => (
        <div style={{ border: '1px solid #dee2e6', borderRadius: '8px', padding: '16px', marginBottom: '20px', backgroundColor: '#f8f9fa' }}>
            {isEditing ? (
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="edit-title" style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Tytuł zbiórki</label>
                    <input id="edit-title" type="text" value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} style={{ width: '100%', padding: '8px', fontSize: '1.2em' }} />
                </div>
            ) : (
                <h1 style={{ marginTop: '0', marginBottom: '20px' }}>{fundraiser.title}</h1>
            )}
            
            <p><strong>Typ zbiórki:</strong> {fundraiser.fundraiserType === 'TOTAL_GOAL' ? 'Cel całościowy' : 'Składka na ucznia'}</p>
            {fundraiser.fundraiserType === 'PER_CHILD_GOAL' && <p><strong>Kwota na dziecko:</strong> {fundraiser.perChildAmount?.toFixed(2)} PLN</p>}
            <p><strong>Klasa:</strong> {fundraiser.classLabel || '—'}</p>
            <p><strong>Skarbnik:</strong> {fundraiser.treasurer?.fullName || '—'}</p>
            <p><strong>Cel zbiórki:</strong> {fundraiser.goalAmount.toFixed(2)} PLN</p>
            <p><strong>Zebrano łącznie:</strong> {fundraiser.currentAmount.toFixed(2)} PLN</p>
            <p><strong>Status:</strong> {STATUS_LABELS[fundraiser.status]}</p>
            <p><strong>Rozpoczęcie:</strong> {formatDate(fundraiser.startedAt)}</p>
            <p><strong>Zakończenie:</strong> {fundraiser.endedAt ? formatDate(fundraiser.endedAt) : (fundraiser.status === 'ACTIVE' ? 'Trwa' : '—')}</p>
            
            {isEditing ? (
                <div style={{ marginTop: '15px' }}>
                    <label htmlFor="edit-description" style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Opis</label>
                    <textarea id="edit-description" value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} style={{ width: '100%', minHeight: '100px', padding: '8px' }} />
                </div>
            ) : (
                fundraiser.description && <p><strong>Opis:</strong> {fundraiser.description}</p>
            )}

            {isTreasurer && fundraiser.status === 'ACTIVE' && (
                <div style={{ marginTop: '20px', borderTop: '1px solid #dee2e6', paddingTop: '15px' }}>
                    {isEditing ? (
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={handleUpdateDetails} style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>Zapisz zmiany</button>
                            <button onClick={() => setIsEditing(false)} style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px' }}>Anuluj</button>
                        </div>
                    ) : (
                        <button onClick={() => setIsEditing(true)} style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>Edytuj Tytuł/Opis</button>
                    )}
                </div>
            )}
        </div>
    );

    const renderAllParticipants = () => {
        const expectedPerChild = fundraiser.fundraiserType === 'PER_CHILD_GOAL' && fundraiser.perChildAmount 
            ? fundraiser.perChildAmount 
            : (fundraiser.participants.length > 0 ? fundraiser.goalAmount / fundraiser.participants.length : 0);

        return (
            <div style={{ marginTop: '20px', marginBottom: '30px' }}>
                <h3>Lista uczestników zbiórki</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#e9ecef', textAlign: 'left' }}>
                                <th style={{ padding: '10px', border: '1px solid #dee2e6' }}>Uczeń</th>
                                <th style={{ padding: '10px', border: '1px solid #dee2e6' }}>Wpłacono</th>
                                <th style={{ padding: '10px', border: '1px solid #dee2e6' }}>Status</th>
                                {fundraiser.status === 'RECONCILING' && (
                                    <>
                                        <th style={{ padding: '10px', border: '1px solid #dee2e6' }}>Dług</th>
                                        <th style={{ padding: '10px', border: '1px solid #dee2e6' }}>Nadpłata</th>
                                    </>
                                )}
                                <th style={{ padding: '10px', border: '1px solid #dee2e6' }}>Akcje</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fundraiser.participants.map(p => {
                                const isPaid = p.totalContribution >= (expectedPerChild - 0.01);
                                const isOwnChild = user?.children.some(c => c.id === p.childId);
                                const isPendingRemoval = p.status === 'REMOVAL_PENDING';
                                return (
                                    <tr key={p.childId} style={{ backgroundColor: isPendingRemoval ? '#fcf8e3' : 'transparent' }}>
                                        <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                                            {p.childFirstName || p.childName.split(' ')[0]} {p.childSurname || p.childName.split(' ').slice(1).join(' ')}
                                        </td>
                                        <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                                            {p.totalContribution.toFixed(2)} / {expectedPerChild.toFixed(2)} PLN
                                        </td>
                                        <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                                            {isPendingRemoval ? (
                                                <span style={{ color: '#8a6d3b', fontWeight: 'bold' }}>Oczekuje na zwrot</span>
                                            ) : isPaid ? (
                                                <span style={{ color: '#27ae60', fontWeight: 'bold' }}>Opłacone</span>
                                            ) : (
                                                <span style={{ color: '#c0392b', fontWeight: 'bold' }}>Do wpłaty</span>
                                            )}
                                        </td>
                                        {fundraiser.status === 'RECONCILING' && (
                                            <>
                                                <td style={{ padding: '10px', border: '1px solid #dee2e6', color: '#c0392b', fontWeight: 'bold' }}>
                                                    {p.debt && p.debt > 0 ? p.debt.toFixed(2) + ' PLN' : '—'}
                                                </td>
                                                <td style={{ padding: '10px', border: '1px solid #dee2e6', color: '#27ae60', fontWeight: 'bold' }}>
                                                    {p.credit && p.credit > 0 ? p.credit.toFixed(2) + ' PLN' : '—'}
                                                </td>
                                            </>
                                        )}
                                        <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                                            {(isTreasurer || isOwnChild) && !isPendingRemoval && <button onClick={() => handleRemoveParticipant(p.childId)}>Usuń</button>}
                                            {isOwnChild && p.totalContribution > 0 && fundraiser.fundraiserType === 'PER_CHILD_GOAL' && !isPendingRemoval && <button onClick={() => handleRequestRefund(p.childId)}>Zwróć</button>}
                                            {!isPaid && fundraiser.status === 'ACTIVE' && !isPendingRemoval && <button onClick={() => handlePayForOther(p.childId)}>Wpłać</button>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderRefundRequests = () => (
        <div style={{ marginTop: '20px', marginBottom: '30px' }}>
            <h3>Oczekujące prośby o zwrot</h3>
            {refundError && (
                <div style={{ backgroundColor: 'lightcoral', color: 'white', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
                    <strong>Błąd:</strong> {refundError}
                </div>
            )}
            {pendingRefunds.length === 0 ? (
                <p>Brak oczekujących próśb.</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#e9ecef', textAlign: 'left' }}>
                            <th style={{ padding: '10px', border: '1px solid #dee2e6' }}>Dziecko</th>
                            <th style={{ padding: '10px', border: '1px solid #dee2e6' }}>Wnioskujący</th>
                            <th style={{ padding: '10px', border: '1px solid #dee2e6' }}>Kwota</th>
                            <th style={{ padding: '10px', border: '1px solid #dee2e6' }}>Akcje</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingRefunds.map(req => (
                            <tr key={req.id}>
                                <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{req.participant.child.name} {req.participant.child.surname}</td>
                                <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{req.requester.fullName}</td>
                                <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{req.amount.toFixed(2)} PLN</td>
                                <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                                    <button onClick={() => handleApproveRefund(req.id)} style={{ marginRight: '10px' }}>Zatwierdź</button>
                                    <button onClick={() => handleRejectRefund(req.id)}>Odrzuć</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto', textAlign: 'left' }}>
            <Link to={backLink}>&larr; {backLabel}</Link>
            
            {renderGeneralInfo()}

            <div style={{ backgroundColor: '#e9ecef', borderRadius: '5px', height: '24px', width: '100%', overflow: 'hidden', marginBottom: '15px' }}>
                <div style={{ backgroundColor: '#28a745', height: '100%', width: `${Math.min((fundraiser.currentAmount / fundraiser.goalAmount) * 100, 100)}%`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8em' }}>
                    {((fundraiser.currentAmount / fundraiser.goalAmount) * 100).toFixed(0)}%
                </div>
            </div>

            <button
                onClick={handleOpenFundraiserChat}
                style={{ marginBottom: '20px', padding: '10px 16px', backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
                Otwórz czat zbiórki
            </button>

            {renderAllParticipants()}
            {isTreasurer && renderRefundRequests()}

            {actionError && <div style={{ color: 'red', marginTop: '10px', padding: '10px', border: '1px solid red', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>{actionError}</div>}

            {isTreasurer && (
                <>
                    {fundraiser.status === 'ACTIVE' && (
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
                                <div style={{ marginTop: '20px' }}>
                                    <label htmlFor="childToAdd">Dodaj dziecko do zbiórki:</label>
                                    <select
                                        id="childToAdd"
                                        value={selectedChildToAdd || ''}
                                        onChange={(e) => setSelectedChildToAdd(Number(e.target.value))}
                                        style={{ width: '100%', padding: '8px', marginTop: '5px', marginBottom: '10px' }}
                                    >
                                        <option value="">-- Wybierz dziecko --</option>
                                        {fundraiser.nonParticipants.map(child => (
                                            <option key={child.id} value={child.id}>
                                                {child.name} {child.surname}
                                            </option>
                                        ))}
                                    </select>
                                    <button onClick={handleAddParticipant} disabled={!selectedChildToAdd} style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
                                        Dodaj uczestnika
                                    </button>
                                </div>
                                <button onClick={() => setShowFinishConfirmation(true)} style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', marginTop: '10px' }}>
                                    Zakończ zbiórkę
                                </button>
                            </div>
                        </div>
                    )}

                    {fundraiser.status === 'FINISHED' && (
                        <button onClick={handleReopen} style={{ marginTop: '20px', padding: '10px 15px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px' }}>
                            Wznów zbiórkę
                        </button>
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
                        <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '20px', marginBottom: '30px', backgroundColor: '#fff3cd' }}>
                            <h3 style={{ marginTop: 0 }}>Rozliczanie</h3>
                            <p>Po opłaceniu wszystkich należności przez rodziców, skarbnik może zrealizować ewentualne zwroty i ostatecznie zamknąć zbiórkę.</p>
                            {allDebtsPaid ? (
                                <button onClick={handleSettle} style={{ marginTop: '10px', padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>
                                    Zakończ rozliczanie i zwróć nadpłaty
                                </button>
                            ) : (
                                <p style={{ color: '#856404', fontWeight: 'bold' }}>
                                    Nie można jeszcze zamknąć zbiórki. Wszyscy uczestnicy muszą spłacić swoje długi!
                                </p>
                            )}
                        </div>
                    )}
                </>
            )}

            <div>
                <h3>Historia operacji</h3>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                    {fundraiser.history.map((entry) => (
                        <li key={entry.id} style={{ borderBottom: '1px solid #eee', padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <strong>{entry.description}</strong>
                                <div style={{ fontSize: '0.8em', color: 'gray' }}>
                                    {new Date(entry.date).toLocaleString()} - <span style={{ fontStyle: 'italic' }}>{entry.type}</span>
                                    {entry.payerName && <span> - Wpłacający: {entry.payerName}</span>}
                                    {entry.payeeName && <span> - Odbiorca: {entry.payeeName}</span>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ color: entry.amount > 0 ? 'green' : 'red', fontWeight: 'bold', fontSize: '1.1em', marginRight: '20px' }}>
                                    {entry.amount > 0 ? '+' : ''}{entry.amount.toFixed(2)} PLN
                                </span>
                                {isTreasurer && (entry.type === 'Wpłata skarbnika' || entry.type === 'Wypłata skarbnika') && (
                                    entry.hasAttachment ? (
                                        <a href={`/api/attachments/download/${entry.id}`} target="_blank" rel="noopener noreferrer">Pobierz dowód</a>
                                    ) : (
                                        <button onClick={() => handleUploadClick(entry.id)}>Wgraj dowód</button>
                                    )
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default FundraiserDetailsPage;