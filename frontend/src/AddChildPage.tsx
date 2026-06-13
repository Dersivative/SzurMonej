import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './AuthContext';

interface ChildResponse {
    id: number;
    name: string;
    surname: string;
}

const AddChildPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setAvatarFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            // 1. Dodaj dziecko (dane tekstowe)
            const response = await axios.post<ChildResponse>('/api/users/me/children', { name, surname, dateOfBirth });
            const newChildId = response.data.id;

            // 2. Jeśli wybrano plik, wgraj avatar
            if (avatarFile) {
                const formData = new FormData();
                formData.append('file', avatarFile);
                
                await axios.post(`/api/children/${newChildId}/avatar`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
            }

            setSuccess(`Dziecko "${name} ${surname}" zostało pomyślnie dodane!`);
            
            // Wyczyść formularz
            setName('');
            setSurname('');
            setDateOfBirth('');
            setAvatarFile(null);
            // Zresetuj input plikowy, ponieważ React nie robi tego automatycznie dla stanu
            const fileInput = document.getElementById('avatar') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

            setTimeout(() => navigate('/user'), 2000);
        } catch (err: any) {
            if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Wystąpił nieoczekiwany błąd podczas dodawania dziecka lub jego awatara.');
            }
        }
    };

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '500px', margin: 'auto' }}>
            <h1>Dodaj nowe dziecko</h1>
            {error && <div style={{ color: 'red', marginBottom: '15px', border: '1px solid red', padding: '10px', borderRadius: '5px' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '15px', border: '1px solid green', padding: '10px', borderRadius: '5px' }}>{success}</div>}
            
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="name" style={{ display: 'block', marginBottom: '5px' }}>Imię:</label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="surname" style={{ display: 'block', marginBottom: '5px' }}>Nazwisko:</label>
                    <input
                        id="surname"
                        type="text"
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="dateOfBirth" style={{ display: 'block', marginBottom: '5px' }}>Data urodzenia:</label>
                    <input
                        id="dateOfBirth"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>
                <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="avatar" style={{ display: 'block', marginBottom: '5px' }}>Zdjęcie / Awatar (opcjonalnie):</label>
                    <input
                        id="avatar"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>
                <button type="submit" style={{ padding: '10px 20px', width: '100%' }}>Dodaj dziecko</button>
            </form>
        </div>
    );
};

export default AddChildPage;
