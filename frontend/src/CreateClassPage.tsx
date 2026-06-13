import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CreateClassPage: React.FC = () => {
    const navigate = useNavigate();
    const [proposedName, setProposedName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!proposedName.trim()) {
            setError("Nazwa klasy nie może być pusta.");
            return;
        }

        try {
            await axios.post('/api/school-class-applications', { proposedName });
            setSuccess(`Twój wniosek o utworzenie klasy "${proposedName}" został wysłany do administratora. Zostaniesz powiadomiony o decyzji.`);
            setProposedName('');
            setTimeout(() => navigate('/user'), 3000);
        } catch (err: any) {
            if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Wystąpił nieoczekiwany błąd podczas składania wniosku.');
            }
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '500px', margin: 'auto' }}>
            <h1>Złóż wniosek o utworzenie nowej klasy</h1>
            <p>Po zatwierdzeniu przez administratora, automatycznie zostaniesz skarbnikiem tej klasy.</p>
            
            {error && <div style={{ color: 'red', marginBottom: '15px', border: '1px solid red', padding: '10px', borderRadius: '5px' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '15px', border: '1px solid green', padding: '10px', borderRadius: '5px' }}>{success}</div>}
            
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="name" style={{ display: 'block', marginBottom: '5px' }}>Proponowana nazwa klasy:</label>
                    <input
                        id="name"
                        type="text"
                        value={proposedName}
                        onChange={(e) => setProposedName(e.target.value)}
                        placeholder="np. Klasa 1A, rocznik 2023/2024"
                        required
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>
                <button type="submit" style={{ padding: '10px 20px', width: '100%' }}>Wyślij wniosek</button>
            </form>
        </div>
    );
};

export default CreateClassPage;
