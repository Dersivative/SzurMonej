import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Navigate } from 'react-router-dom';
import axios from 'axios';

interface Child {
  id: number;
  name: string;
}

const UserPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      axios.get<Child[]>('/api/users/me/children')
        .then(response => {
          setChildren(response.data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Failed to fetch children', error);
          setLoading(false);
        });
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Witaj, {user?.username}!</h1>
      <p>Twój adres email: {user?.email}</p>

      <h2>Twoje dzieci:</h2>
      {loading ? (
        <p>Ładowanie...</p>
      ) : children.length > 0 ? (
        <ul>
          {children.map(child => (
            <li key={child.id}>{child.name}</li>
          ))}
        </ul>
      ) : (
        <p>Nie masz jeszcze dodanych żadnych dzieci.</p>
      )}
    </div>
  );
};

export default UserPage;
