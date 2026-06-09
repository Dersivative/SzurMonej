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
      // Zmieniono na wysyłanie danych w formacie application/x-www-form-urlencoded
      // aby dopasować do konfiguracji Spring Security formLogin
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await axios.post('/api/login', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        withCredentials: true
      });
      
      if (response.status === 200) {
        try {
          // Zmieniono endpoint na /api/users/me, który zwraca UserResponse z polem admin
          const userResponse = await axios.get('/api/users/me', {
            withCredentials: true
          });
          // Poprawka: Dodano pole 'admin' do obiektu przekazywanego do funkcji login
          login({ 
            username: userResponse.data.username, 
            email: userResponse.data.email, 
            admin: userResponse.data.admin 
          });
        } catch (err) {
          console.warn("Could not fetch user details, using defaults");
          // Poprawka: Dodano pole 'admin' w przypadku awaryjnym
          login({ username: username, email: "user@example.com", admin: false });
        }
        
        navigate('/user');
      }
    } catch (err: any) {
      console.error(err);
      if (err.response) {
        setError(`Błędne dane logowania. Status: ${err.response.status}`);
      } else {
        setError(`Błędne dane logowania. Błąd sieci lub serwera.`);
      }
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
