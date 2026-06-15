import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './Login';
import RegistrationPage from './RegistrationPage';
import UserPage from './UserPage';
import AdminPage from './AdminPage';
import ClassTreasurerPage from './ClassTreasurerPage';
import EnrollmentPage from './EnrollmentPage';
import AddChildPage from './AddChildPage';
import CreateClassPage from './CreateClassPage';
import ChildFundraisersPage from './ChildFundraisersPage';
import FundraiserDetailsPage from './FundraiserDetailsPage';
import ChatPage from './ChatPage';
import NavBar from './NavBar';
import ProtectedRoute from './ProtectedRoute';

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
  const { user } = useAuth();

  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegistrationPage />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/user" element={<UserPage />} />
          <Route path="/add-child" element={<AddChildPage />} />
          <Route path="/create-class" element={<CreateClassPage />} />
          <Route path="/child/:childId/fundraisers" element={<ChildFundraisersPage />} />
          <Route path="/fundraiser/:fundraiserId" element={<FundraiserDetailsPage />} />
          <Route path="/chats" element={<ChatPage />} />
          <Route path="/chats/:chatId" element={<ChatPage />} />
          <Route path="/class-management" element={<ClassTreasurerPage />} />
          <Route path="/enroll/:token" element={<EnrollmentPage />} />
          
          <Route
            path="/admin"
            element={user?.isAdmin ? <AdminPage /> : <Navigate to="/user" />}
          />
        </Route>

        <Route
          path="/"
          element={<Navigate to="/user" />}
        />
      </Routes>
    </>
  );
};

export default App;
