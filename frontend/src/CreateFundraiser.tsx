import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Child {
    id: number;
    name: string;
    surname: string;
}

interface CreateFundraiserProps {
    classId: number;
    children: Child[];
    onSuccess: () => void;
    onClose: () => void;
}

const CreateFundraiser: React.FC<CreateFundraiserProps> = ({ classId, children, onSuccess, onClose }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [fundraiserType, setFundraiserType] = useState<'TOTAL_GOAL' | 'PER_CHILD_GOAL'>('TOTAL_GOAL');
    const [amount, setAmount] = useState('');
    const [selectedChildIds, setSelectedChildIds] = useState<number[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Initially select all children
        setSelectedChildIds(children.map(c => c.id));
    }, [children]);

    const handleChildSelection = (childId: number) => {
        setSelectedChildIds(prevSelected =>
            prevSelected.includes(childId)
                ? prevSelected.filter(id => id !== childId)
                : [...prevSelected, childId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (selectedChildIds.length === 0) {
            setError("Musisz wybrać co najmniej jednego uczestnika zbiórki.");
            return;
        }

        const payload: any = {
            title,
            description,
            fundraiserType,
            participantIds: selectedChildIds
        };

        if (fundraiserType === 'TOTAL_GOAL') {
            payload.goalAmount = parseFloat(amount);
        } else {
            payload.perChildAmount = parseFloat(amount);
        }

        try {
            await axios.post(`/api/school-classes/${classId}/fundraisers`, payload);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Create Fundraiser Error:", err.response?.data || err);
            let errorMessage = 'Wystąpił nieoczekiwany błąd podczas tworzenia zbiórki.';
            if (err.response?.data) {
                const data = err.response.data;
                errorMessage = data.message || data.error || (typeof data === 'string' ? data : JSON.stringify(data));
            } else if (err.message) {
                errorMessage = err.message;
            }
            setError(errorMessage);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '25px', borderRadius: '8px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                <h2>Nowa zbiórka</h2>
                {error && <div style={{ color: 'red', marginBottom: '15px', whiteSpace: 'pre-wrap' }}>{error}</div>}
                <form onSubmit={handleSubmit}>
                    {/* Title, Description, Type, Amount fields remain the same */}
                    <div style={{ marginBottom: '15px' }}>
                        <label htmlFor="title">Tytuł zbiórki:</label>
                        <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                        <label htmlFor="description">Opis (opcjonalnie):</label>
                        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px', minHeight: '80px' }} />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                        <label>Typ zbiórki:</label>
                        <div style={{ marginTop: '5px' }}>
                            <label style={{ marginRight: '15px' }}>
                                <input type="radio" value="TOTAL_GOAL" checked={fundraiserType === 'TOTAL_GOAL'} onChange={() => { setFundraiserType('TOTAL_GOAL'); setAmount(''); }} />
                                Kwota łączna
                            </label>
                            <label>
                                <input type="radio" value="PER_CHILD_GOAL" checked={fundraiserType === 'PER_CHILD_GOAL'} onChange={() => { setFundraiserType('PER_CHILD_GOAL'); setAmount(''); }} />
                                Składka na ucznia
                            </label>
                        </div>
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="amount">{fundraiserType === 'TOTAL_GOAL' ? 'Kwota docelowa (PLN):' : 'Kwota na ucznia (PLN):'}</label>
                        <input id="amount" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label>Wybierz uczestników:</label>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px', marginTop: '5px' }}>
                            {children.map(child => (
                                <div key={child.id}>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={selectedChildIds.includes(child.id)}
                                            onChange={() => handleChildSelection(child.id)}
                                        />
                                        {child.name} {child.surname}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button type="button" onClick={onClose} style={{ padding: '10px 20px', backgroundColor: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Anuluj</button>
                        <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Utwórz zbiórkę</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateFundraiser;
