import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const RegistrationPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<string[]>([]);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors([]);
        try {
            await axios.post('/api/users', {
                email,
                firstName,
                lastName,
                password
            });
            alert('Rejestracja zakończona sukcesem! Możesz się teraz zalogować.');
            navigate('/login');
        } catch (err: any) {
            console.error("Registration Error Details:", err.response?.data || err);
            
            let detailedMessages: string[] = [];
            
            if (err.response?.data) {
                const { data } = err.response;
                // Handle Spring Boot's validation error structure
                if (data.errors && typeof data.errors === 'object') {
                    detailedMessages = Object.entries(data.errors).map(([field, message]) => `${field}: ${message}`);
                } else if (data.message) {
                    detailedMessages.push(data.message);
                } else {
                    detailedMessages.push(`Błąd serwera: ${err.response.status} - ${err.response.statusText}`);
                }
            } else if (err.request) {
                detailedMessages.push('Brak odpowiedzi od serwera. Sprawdź połączenie internetowe.');
            } else {
                detailedMessages.push(`Błąd w aplikacji frontendowej: ${err.message}`);
            }
            
            setErrors(detailedMessages);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Rejestracja</h2>
            <form onSubmit={handleSubmit} noValidate>
                <div style={{ marginBottom: '15px' }}>
                    <label>Email (login):</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label>Imię:</label>
                    <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label>Nazwisko:</label>
                    <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label>Hasło:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>
                {errors.length > 0 && (
                    <div style={{ color: 'red', marginBottom: '15px', border: '1px solid red', padding: '10px', borderRadius: '4px' }}>
                        <strong>Wystąpiły błędy:</strong>
                        <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
                            {errors.map((error, index) => (
                                <li key={index}>{error}</li>
                            ))}
                        </ul>
                    </div>
                )}
                <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
                    Zarejestruj się
                </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '15px' }}>
                Masz już konto? <Link to="/login">Zaloguj się</Link>
            </p>
        </div>
    );
};

export default RegistrationPage;
