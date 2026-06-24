import React, { useState, useEffect } from 'react';
import axios from 'axios';

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

interface Child {
    id: number;
    name: string;
    surname: string;
}

interface Props {
    application: FundraiserApplication;
    classChildren: Child[];
    onClose: () => void;
    onSuccess: () => void;
}

const FundraiserApplicationEditor: React.FC<Props> = ({ application, classChildren, onClose, onSuccess }) => {
    const [title, setTitle] = useState(application.title);
    const [description, setDescription] = useState(application.description);
    const [fundraiserType, setFundraiserType] = useState(application.fundraiserType);
    const [goalAmount, setGoalAmount] = useState(application.goalAmount?.toString() || '');
    const [perChildAmount, setPerChildAmount] = useState(application.perChildAmount?.toString() || '');
    const [selectedChildren, setSelectedChildren] = useState<number[]>(application.participantIds || []);
    const [error, setError] = useState<string | null>(null);

    const handleChildSelection = (childId: number) => {
        setSelectedChildren(prev =>
            prev.includes(childId) ? prev.filter(id => id !== childId) : [...prev, childId]
        );
    };

    const handleApprove = async () => {
        setError(null);
        const request = {
            title,
            description,
            fundraiserType,
            goalAmount: fundraiserType === 'TOTAL_GOAL' ? goalAmount : null,
            perChildAmount: fundraiserType === 'PER_CHILD_GOAL' ? perChildAmount : null,
            participantIds: selectedChildren,
        };

        try {
            await axios.post(`/api/fundraiser-applications/${application.id}/approve`, request);
            alert('Wniosek został zatwierdzony, a zbiórka utworzona.');
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Wystąpił błąd podczas zatwierdzania wniosku.');
        }
    };

    const handleReject = async () => {
        try {
            await axios.post(`/api/fundraiser-applications/${application.id}/reject`);
            alert('Wniosek został odrzucony.');
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Wystąpił błąd podczas odrzucania wniosku.');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Wniosek o zbiórkę od: {application.requestingParent.fullName}</h2>
                <div style={{ marginBottom: '15px' }}>
                    <label>Tytuł:</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label>Opis:</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label>Typ zbiórki:</label>
                    <select value={fundraiserType} onChange={e => setFundraiserType(e.target.value)}>
                        <option value="TOTAL_GOAL">Cel całościowy</option>
                        <option value="PER_CHILD_GOAL">Składka na ucznia</option>
                    </select>
                </div>
                {fundraiserType === 'TOTAL_GOAL' ? (
                    <div style={{ marginBottom: '15px' }}>
                        <label>Kwota docelowa (PLN):</label>
                        <input type="number" value={goalAmount} onChange={e => setGoalAmount(e.target.value)} required />
                    </div>
                ) : (
                    <div style={{ marginBottom: '15px' }}>
                        <label>Kwota na dziecko (PLN):</label>
                        <input type="number" value={perChildAmount} onChange={e => setPerChildAmount(e.target.value)} required />
                    </div>
                )}
                <div style={{ marginBottom: '15px' }}>
                    <label>Wybierz uczestników (zostaw puste, aby wybrać wszystkich):</label>
                    <div>
                        {classChildren.map(child => (
                            <div key={child.id}>
                                <input
                                    type="checkbox"
                                    id={`editor-child-${child.id}`}
                                    checked={selectedChildren.includes(child.id)}
                                    onChange={() => handleChildSelection(child.id)}
                                />
                                <label htmlFor={`editor-child-${child.id}`}>{child.name} {child.surname}</label>
                            </div>
                        ))}
                    </div>
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <div className="modal-actions">
                    <button onClick={onClose}>Anuluj</button>
                    <button onClick={handleReject} style={{ backgroundColor: 'lightcoral' }}>Odrzuć</button>
                    <button onClick={handleApprove} style={{ backgroundColor: 'lightgreen' }}>Zatwierdź i utwórz</button>
                </div>
            </div>
        </div>
    );
};

export default FundraiserApplicationEditor;