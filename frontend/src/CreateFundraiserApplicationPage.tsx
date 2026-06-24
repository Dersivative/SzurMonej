import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const CreateFundraiserApplicationPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { classId, childId } = location.state || {};

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [fundraiserType, setFundraiserType] = useState('TOTAL_GOAL');
    const [goalAmount, setGoalAmount] = useState('');
    const [perChildAmount, setPerChildAmount] = useState('');
    const [children, setChildren] = useState<any[]>([]);
    const [selectedChildren, setSelectedChildren] = useState<number[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (classId) {
            axios.get(`/api/school-classes/${classId}`)
                .then(response => {
                    setChildren(response.data.children || []);
                })
                .catch(() => setError('Nie udało się pobrać listy dzieci.'));
        }
    }, [classId]);

    const handleChildSelection = (childId: number) => {
        setSelectedChildren(prev =>
            prev.includes(childId) ? prev.filter(id => id !== childId) : [...prev, childId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const request = {
            classId,
            title,
            description,
            fundraiserType,
            goalAmount: fundraiserType === 'TOTAL_GOAL' ? goalAmount : null,
            perChildAmount: fundraiserType === 'PER_CHILD_GOAL' ? perChildAmount : null,
            participantIds: selectedChildren,
        };

        try {
            await axios.post('/api/fundraiser-applications', request);
            alert('Wniosek o utworzenie zbiórki został pomyślnie złożony!');
            navigate(`/child/${childId}/fundraisers`); // Correct navigation
        } catch (err: any) {
            setError(err.response?.data?.message || 'Wystąpił błąd podczas składania wniosku.');
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>Zaproponuj nową zbiórkę</h1>
            <form onSubmit={handleSubmit}>
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
                        {children.map(child => (
                            <div key={child.id}>
                                <input
                                    type="checkbox"
                                    id={`child-${child.id}`}
                                    checked={selectedChildren.includes(child.id)}
                                    onChange={() => handleChildSelection(child.id)}
                                />
                                <label htmlFor={`child-${child.id}`}>{child.name} {child.surname}</label>
                            </div>
                        ))}
                    </div>
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button type="submit">Złóż wniosek</button>
            </form>
        </div>
    );
};

export default CreateFundraiserApplicationPage;