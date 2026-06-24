import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Navigate, Link } from 'react-router-dom';
import axios from 'axios';

interface Child {
  id: number;
  name: string;
  surname?: string;
  schoolClassName?: string;
  membershipId?: number;
  isArchived: boolean;
}

interface SchoolClass {
    id: number;
    label: string;
}

interface SchoolClassApplication {
    id: number;
    proposedName: string;
    status: string;
}

const UserPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [managedClasses, setManagedClasses] = useState<SchoolClass[]>([]);
  const [application, setApplication] = useState<SchoolClassApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = async () => {
      if (!isAuthenticated) return;
      setLoading(true);
      try {
          const childrenPromise = axios.get<Child[]>('/api/users/me/children');
          const applicationPromise = axios.get<SchoolClassApplication>('/api/school-class-applications/me/pending');
          const managedClassesPromise = axios.get<SchoolClass[]>('/api/school-classes/my-classes');
          
          const [childrenResponse, applicationResponse, managedClassesResponse] = await Promise.allSettled([
              childrenPromise,
              applicationPromise,
              managedClassesPromise
          ]);

          if (childrenResponse.status === 'fulfilled') {
              setChildren(childrenResponse.value.data);
          }
          if (managedClassesResponse.status === 'fulfilled') {
              setManagedClasses(managedClassesResponse.value.data);
          }
          if (applicationResponse.status === 'fulfilled') {
              setApplication(applicationResponse.value.data);
          }

      } catch (error) {
          console.error('Failed to fetch user data', error);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    fetchAllData();
  }, [isAuthenticated]);

  const handleLeaveClass = async (membershipId: number) => {
    if (!window.confirm("Czy na pewno chcesz, aby to dziecko opuściło klasę? Tej akcji nie można cofnąć.")) return;
    setError(null);
    try {
        await axios.delete(`/api/class-memberships/${membershipId}`);
        fetchAllData();
    } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Nie udało się opuścić klasy. Spróbuj ponownie.';
        setError(errorMessage);
        console.error('Failed to leave class', err);
    }
  };

  const handleArchiveChild = async (childId: number) => {
    if (!window.confirm("Czy na pewno chcesz zarchiwizować to dziecko? Nie będzie ono już widoczne w Twoim panelu, ale historia jego wpłat zostanie zachowana.")) return;
    setError(null);
    try {
        await axios.post(`/api/children/${childId}/archive`);
        fetchAllData();
    } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Nie udało się zarchiwizować dziecka. Upewnij się, że nie jest zapisane do żadnej klasy.';
        setError(errorMessage);
        console.error('Failed to archive child', err);
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const activeChildren = children.filter(child => !child.isArchived);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Witaj, {user?.fullName}!</h1>
      <p>Twój adres email: {user?.email}</p>

      {error && (
        <div style={{ backgroundColor: 'lightcoral', color: 'white', padding: '10px', borderRadius: '5px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>&times;</button>
        </div>
      )}

      <div style={{ marginTop: '30px', marginBottom: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        <Link to="/chats" style={{ textDecoration: 'none' }}>
            <div style={{ padding: '15px', backgroundColor: '#f3e8ff', border: '1px solid #9b59b6', borderRadius: '5px', textAlign: 'center', cursor: 'pointer' }}>
                <h3 style={{ margin: 0, color: '#6f42c1' }}>Czaty</h3>
                <p style={{ margin: '5px 0 0', color: '#6f42c1' }}>Wiadomości z rodzicami, skarbnikiem i grupami</p>
            </div>
        </Link>
        
        {managedClasses.length > 0 && (
            <div>
                <h3>Zarządzasz klasami:</h3>
                {managedClasses.map(cls => (
                    <Link key={cls.id} to={`/class-management`} style={{ textDecoration: 'none' }}>
                         <div style={{ padding: '15px', backgroundColor: '#e9f7ef', border: '1px solid #1abc9c', borderRadius: '5px', textAlign: 'center', cursor: 'pointer', marginBottom: '10px' }}>
                            <h4 style={{ margin: 0, color: '#16a085' }}>{cls.label}</h4>
                            <p style={{ margin: '5px 0 0', color: '#16a085' }}>Przejdź do panelu zarządzania</p>
                        </div>
                    </Link>
                ))}
            </div>
        )}

        {application && (
            <div style={{ padding: '15px', backgroundColor: '#fef9e7', border: '1px solid #f1c40f', borderRadius: '5px', textAlign: 'center' }}>
                <h3 style={{ margin: 0, color: '#f39c12' }}>Wniosek w trakcie weryfikacji</h3>
                <p style={{ margin: '5px 0 0', color: '#f39c12' }}>Twój wniosek o utworzenie klasy "{application.proposedName}" czeka na zatwierdzenie przez administratora.</p>
            </div>
        )}

        <Link to="/create-class" style={{ textDecoration: 'none' }}>
            <div style={{ padding: '15px', backgroundColor: '#eaf2f8', border: '1px solid #3498db', borderRadius: '5px', textAlign: 'center', cursor: 'pointer' }}>
                <h3 style={{ margin: 0, color: '#2980b9' }}>+ Złóż wniosek o nową klasę</h3>
            </div>
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
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
      ) : activeChildren.length > 0 ? (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {activeChildren.map(child => (
            <li key={child.id} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Link to={`/child/${child.id}/fundraisers`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                        <img 
                            src={`/api/children/${child.id}/avatar`} 
                            alt={`Awatar ${child.name}`} 
                            style={{ width: '60px', height: '60px', borderRadius: '50%', marginRight: '15px', objectFit: 'cover' }}
                            onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = 'https://via.placeholder.com/60';
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
                    </Link>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {child.membershipId ? (
                            <button 
                                onClick={() => handleLeaveClass(child.membershipId!)}
                                style={{ backgroundColor: '#ffc107', color: 'black', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Opuść klasę
                            </button>
                        ) : (
                            <button 
                                onClick={() => handleArchiveChild(child.id)}
                                style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Archiwizuj
                            </button>
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