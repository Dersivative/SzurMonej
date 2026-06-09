import React from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const NavBar: React.FC = () => {
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post('/api/logout');
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between', // Zmieniono na space-between
      padding: '10px',
      backgroundColor: '#f0f0f0',
      borderBottom: '1px solid #ccc'
    }}>
      <div>
        {isAuthenticated && <Link to="/user" style={{ marginRight: '15px' }}>Moje konto</Link>}
        {isAdmin && <Link to="/admin">Panel Admina</Link>}
      </div>
      <div>
        {isAuthenticated && (
          <button onClick={handleLogout}>
            Wyloguj
          </button>
        )}
      </div>
    </nav>
  );
};

export default NavBar;
