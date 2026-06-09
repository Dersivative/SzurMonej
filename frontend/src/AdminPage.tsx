import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { Navigate } from 'react-router-dom';

interface Child {
  id: number;
  name: string;
}

interface UserWithChildren {
  id: number;
  username: string;
  email: string;
  children: Child[];
}

const AdminPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserWithChildren[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      axios.get<UserWithChildren[]>('/api/users/all')
        .then(response => {
          setUsers(response.data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Failed to fetch users', error);
          setLoading(false);
        });
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/user" />;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Panel Administratora</h1>
      <h2>Wszyscy rodzice i ich dzieci:</h2>
      {loading ? (
        <p>Ładowanie...</p>
      ) : (
        users.map(user => (
          <div key={user.id} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
            <h3>{user.username} ({user.email})</h3>
            {user.children.length > 0 ? (
              <ul>
                {user.children.map(child => (
                  <li key={child.id}>{child.name}</li>
                ))}
              </ul>
            ) : (
              <p>Brak przypisanych dzieci.</p>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default AdminPage;
