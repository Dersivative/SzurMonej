import React, { useState } from 'react';
import axios from 'axios';

interface CreateFundraiserProps {
    classId: number;
    onSuccess: () => void; // Callback to refresh parent component
    onClose: () => void;
}

const CreateFundraiser: React.FC<CreateFundraiserProps> = ({ classId, onSuccess, onClose }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [goalAmount, setGoalAmount] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            await axios.post(`/api/school-classes/${classId}/fundraisers`, {
                title,
                description,
                goalAmount: parseFloat(goalAmount)
            });
            onSuccess(); // Wywołaj callback, aby odświeżyć listę zbiórek
            onClose();   // Zamknij modal
        } catch (err: any) {
            if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Wystąpił nieoczekiwany błąd podczas tworzenia zbiórki.');
            }
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: 'white', padding: '25px', borderRadius: '8px', width: '90%', maxWidth: '500px' }}>
                <h2>Nowa zbiórka</h2>
                {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '15px' }}>
                        <label htmlFor="title">Tytuł zbiórki:</label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                        <label htmlFor="description">Opis (opcjonalnie):</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            style={{ width: '100%', padding: '8px', marginTop: '5px', minHeight: '80px' }}
                        />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="goalAmount">Kwota docelowa (PLN):</label>
                        <input
                            id="goalAmount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={goalAmount}
                            onChange={(e) => setGoalAmount(e.target.value)}
                            required
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button type="button" onClick={onClose} style={{ padding: '10px 20px', backgroundColor: '#ccc' }}>Anuluj</button>
                        <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white' }}>Utwórz zbiórkę</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateFundraiser;
