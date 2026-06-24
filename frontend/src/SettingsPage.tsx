import React, { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

axios.defaults.withCredentials = true;

const getErrorMessage = (error: unknown): string => {
    if (axios.isAxiosError(error)) {
        if (error.response) {
            // The server should be sending a JSON object with a 'message' property.
            if (error.response.data && error.response.data.message) {
                return error.response.data.message;
            }
            // If the server sends a response without a specific message, show the status.
            return `Błąd serwera: Otrzymano kod statusu ${error.response.status} bez dodatkowych informacji.`;
        } else if (error.request) {
            // The request was made but no response was received.
            return 'Błąd sieci: Nie otrzymano odpowiedzi od serwera. Sprawdź połączenie i czy serwer jest uruchomiony.';
        }
    }
    // Fallback for non-axios errors or other unexpected issues.
    return 'Wystąpił nieoczekiwany błąd. Skontaktuj się z administratorem.';
};


const SettingsPage: React.FC = () => {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState(user?.email || '');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [avatar, setAvatar] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            setEmail(user.email);
        }
    }, [user]);

    const handleEmailChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        try {
            const response = await axios.patch('/api/users/me/email', { email });
            setUser(response.data);
            setSuccess('Email został pomyślnie zaktualizowany.');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        try {
            await axios.patch('/api/users/me/password', { oldPassword: password, newPassword });
            setSuccess('Hasło zostało pomyślnie zaktualizowane.');
            setPassword('');
            setNewPassword('');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleAvatarChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        if (!avatar) {
            setError('Wybierz plik avatara.');
            return;
        }
        const formData = new FormData();
        formData.append('avatar', avatar);
        try {
            const response = await axios.post('/api/users/me/avatar', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setUser(response.data);
            setSuccess('Avatar został pomyślnie zaktualizowany.');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleDeleteAccount = async () => {
        if (window.confirm('Czy na pewno chcesz usunąć swoje konto? Ta operacja jest nieodwracalna.')) {
            setError(null);
            setSuccess(null);
            try {
                await axios.delete('/api/users/me');
                setUser(null);
                navigate('/login');
            } catch (err) {
                setError(getErrorMessage(err));
            }
        }
    };

    if (!user) {
        return <div>Ładowanie...</div>;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
            <h1>Ustawienia konta</h1>

            {error && <div style={{ color: 'red', marginBottom: '20px', padding: '10px', border: '1px solid red', borderRadius: '5px', whiteSpace: 'pre-wrap' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '20px', padding: '10px', border: '1px solid green', borderRadius: '5px' }}>{success}</div>}

            <div style={{ marginBottom: '30px' }}>
                <h2>Zmień adres email</h2>
                <form onSubmit={handleEmailChange}>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
                    />
                    <button type="submit" style={{ padding: '10px 20px' }}>Zapisz email</button>
                </form>
            </div>

            <div style={{ marginBottom: '30px' }}>
                <h2>Zmień hasło</h2>
                <form onSubmit={handlePasswordChange}>
                    <input
                        type="password"
                        placeholder="Aktualne hasło"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
                    />
                    <input
                        type="password"
                        placeholder="Nowe hasło"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
                    />
                    <button type="submit" style={{ padding: '10px 20px' }}>Zmień hasło</button>
                </form>
            </div>

            <div style={{ marginBottom: '30px' }}>
                <h2>Zmień avatar</h2>
                <form onSubmit={handleAvatarChange}>
                    <input
                        type="file"
                        onChange={(e) => setAvatar(e.target.files ? e.target.files[0] : null)}
                        accept="image/*"
                        style={{ display: 'block', marginBottom: '10px' }}
                    />
                    <button type="submit" style={{ padding: '10px 20px' }}>Zmień avatar</button>
                </form>
            </div>

            <div style={{ marginTop: '50px', borderTop: '1px solid #ccc', paddingTop: '20px' }}>
                <h2>Usuń konto</h2>
                <p>Usunięcie konta jest operacją nieodwracalną. Wszystkie Twoje dane zostaną trwale usunięte.</p>
                <button onClick={handleDeleteAccount} style={{ padding: '10px 20px', backgroundColor: 'red', color: 'white', border: 'none' }}>
                    Usuń konto
                </button>
            </div>
        </div>
    );
};

export default SettingsPage;