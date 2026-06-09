import React from 'react';
import { useAuth } from './AuthContext';
import { Navigate } from 'react-router-dom';

const UserPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Witaj, {user?.username}!</h1>
      <p>Twój adres email: {user?.email}</p>
    </div>
  );
};

export default UserPage;
