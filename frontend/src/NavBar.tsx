import React from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const NavBar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
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
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 20px',
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #dee2e6'
    }}>
      <div>
        {isAuthenticated && <Link to="/user" style={{ marginRight: '15px', textDecoration: 'none', color: '#007bff' }}>Moje konto</Link>}
        {isAuthenticated && <Link to="/chats" style={{ marginRight: '15px', textDecoration: 'none', color: '#007bff' }}>Czaty</Link>}
        {user?.isAdmin && <Link to="/admin" style={{ marginRight: '15px', textDecoration: 'none', color: '#007bff' }}>Panel Admina</Link>}
        {user?.isTreasurer && <Link to="/class-management" style={{ textDecoration: 'none', color: '#007bff' }}>Zarządzaj klasą</Link>}
      </div>
      <div>
        {isAuthenticated && user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ padding: '8px 12px', backgroundColor: '#e9ecef', borderRadius: '5px', fontWeight: 'bold' }}>
              Stan konta: {user.balance.toFixed(2)} PLN
            </div>
            <button onClick={handleLogout} style={{ padding: '8px 12px' }}>
              Wyloguj
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavBar;
