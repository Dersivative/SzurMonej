import React from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const NavBar: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
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
      justifyContent: 'flex-end',
      padding: '10px',
      backgroundColor: '#f0f0f0',
      borderBottom: '1px solid #ccc'
    }}>
      {isAuthenticated && (
        <button onClick={handleLogout}>
          Wyloguj
        </button>
      )}
    </nav>
  );
};

export default NavBar;
