import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import axios from 'axios';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Wysłanie zapytania z danymi logowania w formacie application/x-www-form-urlencoded
      // co jest domyślne dla Spring Security formLogin
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await axios.post('/api/login', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      // Jeśli logowanie się powiodło, pobieramy dane zalogowanego użytkownika
      if (response.status === 200) {
        // Tymczasowe rozwiazanie, zakładamy że backend zwraca zalogowanego użytkownika na ten endpoint
        // Trzeba będzie to dostosować do faktycznego API Spring Boota
        try {
          const userResponse = await axios.get('/api/users/me');
          login({ username: userResponse.data.username, email: userResponse.data.email });
        } catch (err) {
          // Fallback na wypadek gdyby endpoint /me nie istniał
          console.warn("Could not fetch user details, using defaults");
          login({ username: username, email: "user@example.com" });
        }
        
        navigate('/user');
      }
    } catch (err: any) {
      setError('Błędne dane logowania');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '300px', margin: '0 auto' }}>
      <h2>Logowanie</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="username">Nazwa użytkownika:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: '100%', padding: '5px' }}
            required
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="password">Hasło:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '5px' }}
            required
          />
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px' }}>
          Zaloguj
        </button>
      </form>
    </div>
  );
};

export default Login;
