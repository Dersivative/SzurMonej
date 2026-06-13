import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './Login';
import UserPage from './UserPage';
import AdminPage from './AdminPage';
import ClassTreasurerPage from './ClassTreasurerPage';
import EnrollmentPage from './EnrollmentPage'; // Import nowej strony
import NavBar from './NavBar';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Main />
      </Router>
    </AuthProvider>
  );
};

const Main: React.FC = () => {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/user"
          element={isAuthenticated ? <UserPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin"
          element={isAdmin ? <AdminPage /> : <Navigate to="/user" />}
        />
        <Route
          path="/class-management"
          element={isAuthenticated ? <ClassTreasurerPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/enroll/:token"
          element={isAuthenticated ? <EnrollmentPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? "/user" : "/login"} />}
        />
      </Routes>
    </>
  );
};

export default App;
