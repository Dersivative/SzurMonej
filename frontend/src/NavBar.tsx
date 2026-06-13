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
      padding: '10px',
      backgroundColor: '#f0f0f0',
      borderBottom: '1px solid #ccc'
    }}>
      <div>
        {isAuthenticated && <Link to="/user" style={{ marginRight: '15px' }}>Moje konto</Link>}
        {isAdmin && <Link to="/admin" style={{ marginRight: '15px' }}>Panel Admina</Link>}
        {isTreasurer && <Link to="/class-management">Zarządzaj klasą</Link>}
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
