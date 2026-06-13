import React, { useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

interface SchoolClass {
    id: number;
    treasurer: { id: number; username: string } | null;
}

const NavBar: React.FC = () => {
  const { user, isAuthenticated, isAdmin, logout, isTreasurer, setIsTreasurer } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
      const checkTreasurerStatus = async () => {
          if (isAuthenticated && user) {
              try {
                  const classesResponse = await axios.get<SchoolClass[]>('/api/school-classes');
                  const isTreas = classesResponse.data.some(c => c.treasurer && c.treasurer.username === user.username);
                  setIsTreasurer(isTreas);
              } catch (error) {
                  console.error('Failed to fetch school classes for treasurer check', error);
                  setIsTreasurer(false); // Explicitly set to false on error
              }
          }
      };
      checkTreasurerStatus();
  }, [isAuthenticated, user, setIsTreasurer]);

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
        {isAdmin && <Link to="/admin" style={{ marginRight: '15px', textDecoration: 'none', color: '#007bff' }}>Panel Admina</Link>}
        {isTreasurer && <Link to="/class-management" style={{ textDecoration: 'none', color: '#007bff' }}>Zarządzaj klasą</Link>}
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
