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

interface SchoolClassApplication {
    id: number;
    proposedName: string;
    status: string;
    requestingParent: {
        id: number;
        username: string;
        email: string;
    };
    requestedAt: string;
}

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin;
  const [users, setUsers] = useState<UserWithChildren[]>([]);
  const [applications, setApplications] = useState<SchoolClassApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    if (isAdmin) {
      setLoading(true);
      const usersPromise = axios.get<UserWithChildren[]>('/api/users/all');
      const applicationsPromise = axios.get<SchoolClassApplication[]>('/api/school-class-applications?status=PENDING');

      Promise.all([usersPromise, applicationsPromise])
        .then(([usersResponse, applicationsResponse]) => {
          setUsers(usersResponse.data);
          setApplications(applicationsResponse.data);
        })
        .catch(error => {
          console.error('Failed to fetch admin data', error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRemoveFromClass = async (classId: number, childId: number) => {
    if (!window.confirm('Czy na pewno chcesz usunąć to dziecko z klasy?')) return;
    try {
      await axios.delete(`/api/school-classes/${classId}/members/${childId}`);
      fetchData();
    } catch (error) {
      console.error('Błąd podczas usuwania dziecka z klasy', error);
      alert('Wystąpił błąd podczas usuwania dziecka z klasy.');
    }
  };

  const handleApproveClass = async (applicationId: number) => {
      try {
          await axios.post(`/api/school-class-applications/${applicationId}/approve`);
          fetchData();
      } catch (error) {
          alert('Nie udało się zatwierdzić wniosku.');
      }
  };

  const handleRejectClass = async (applicationId: number) => {
      try {
          await axios.post(`/api/school-class-applications/${applicationId}/reject`);
          fetchData();
      } catch (error) {
          alert('Nie udało się odrzucić wniosku.');
      }
  };

  if (!isAdmin) {
    return <Navigate to="/user" />;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Panel Administratora</h1>

      {/* Sekcja wniosków o klasy */}
      <div style={{ marginBottom: '40px' }}>
        <h2>Oczekujące wnioski o utworzenie klasy ({applications.length})</h2>
        {loading ? <p>Ładowanie...</p> : applications.length > 0 ? (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
                {applications.map(app => (
                    <li key={app.id} style={{ border: '1px solid #f1c40f', padding: '15px', borderRadius: '5px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <strong>Nazwa: {app.proposedName}</strong><br/>
                            <span>Wnioskodawca: {app.requestingParent.username} ({app.requestingParent.email})</span><br/>
                            <span style={{ fontSize: '0.8em', color: 'gray' }}>Złożono: {new Date(app.requestedAt).toLocaleString()}</span>
                        </div>
                        <div>
                            <button onClick={() => handleApproveClass(app.id)} style={{ marginRight: '10px', backgroundColor: 'lightgreen' }}>Zatwierdź</button>
                            <button onClick={() => handleRejectClass(app.id)} style={{ backgroundColor: 'lightcoral' }}>Odrzuć</button>
                        </div>
                    </li>
                ))}
            </ul>
        ) : (
            <p>Brak oczekujących wniosków.</p>
        )}
      </div>

      {/* Sekcja użytkowników */}
      <div>
        <h2>Wszyscy rodzice i ich dzieci:</h2>
        {loading ? <p>Ładowanie...</p> : (
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
    </div>
  );
};

export default AdminPage;