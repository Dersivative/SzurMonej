import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { Navigate } from 'react-router-dom';

interface Child {
  id: number;
  name: string;
  surname?: string;
  schoolClassName?: string;
  schoolClassId?: number;
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

  const fetchUsers = useCallback(() => {
    if (isAdmin) {
      setLoading(true);
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

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRemoveFromClass = async (classId: number, childId: number) => {
    if (!window.confirm('Czy na pewno chcesz usunąć to dziecko z klasy?')) return;

    try {
      await axios.delete(`/api/school-classes/${classId}/members/${childId}`);
      fetchUsers(); // Odśwież listę po udanym usunięciu
    } catch (error) {
      console.error('Błąd podczas usuwania dziecka z klasy', error);
      alert('Wystąpił błąd podczas usuwania dziecka z klasy.');
    }
  };

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
          <div key={user.id} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '15px', borderRadius: '5px' }}>
            <h3>{user.username} ({user.email})</h3>
            {user.children.length > 0 ? (
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                {user.children.map(child => (
                  <li key={child.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', padding: '10px 0' }}>
                    <div>
                      <strong>{child.name} {child.surname}</strong>
                      {child.schoolClassName ? (
                        <span style={{ marginLeft: '10px', color: 'green', fontWeight: 'bold' }}>- Klasa: {child.schoolClassName}</span>
                      ) : (
                        <span style={{ marginLeft: '10px', color: 'gray' }}>- Brak klasy</span>
                      )}
                    </div>
                    {child.schoolClassId && (
                      <button 
                        onClick={() => handleRemoveFromClass(child.schoolClassId!, child.id)}
                        style={{ backgroundColor: 'lightcoral', padding: '5px 10px', marginLeft: '10px' }}
                      >
                        Usuń z klasy
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'gray' }}>Brak przypisanych dzieci.</p>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default AdminPage;