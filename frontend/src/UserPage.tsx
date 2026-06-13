import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Navigate, Link } from 'react-router-dom';
import axios from 'axios';

interface Child {
  id: number;
  name: string;
  surname?: string;
  schoolClassName?: string;
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', marginBottom: '15px' }}>
        <h2 style={{ margin: 0 }}>Twoje dzieci:</h2>
        <Link 
          to="/add-child" 
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          + Dodaj dziecko
        </Link>
      </div>

      {loading ? (
        <p>Ładowanie...</p>
      ) : children.length > 0 ? (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {children.map(child => (
            <li key={child.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
              <img 
                src={`/api/children/${child.id}/avatar`} 
                alt={`Awatar ${child.name}`} 
                style={{ width: '60px', height: '60px', borderRadius: '50%', marginRight: '15px', objectFit: 'cover' }}
                // Prosty fallback, jeśli obrazek nie istnieje
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null; // Zapobiega pętli błędów
                  target.src = 'https://via.placeholder.com/60'; // Domyślny obrazek
                }}
              />
              <div>
                <strong>{child.name} {child.surname}</strong>
                <div>
                  {child.schoolClassName ? (
                      <span style={{ color: 'green', fontWeight: 'bold' }}>Klasa: {child.schoolClassName}</span>
                  ) : (
                      <span style={{ color: 'gray' }}>Brak przypisanej klasy</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>Nie masz jeszcze dodanych żadnych dzieci.</p>
      )}
    </div>
  );
};

export default UserPage;
