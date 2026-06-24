import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import NavBar from './NavBar';
import Login from './Login';
import RegistrationPage from './RegistrationPage';
import UserPage from './UserPage';
import AdminPage from './AdminPage';
import AddChildPage from './AddChildPage';
import CreateClassPage from './CreateClassPage';
import EnrollmentPage from './EnrollmentPage';
import ClassTreasurerPage from './ClassTreasurerPage';
import ChildFundraisersPage from './ChildFundraisersPage';
import FundraiserDetailsPage from './FundraiserDetailsPage';
import ChatPage from './ChatPage';
import CreateFundraiserApplicationPage from './CreateFundraiserApplicationPage';

const App: React.FC = () => {
    return (
        <AuthProvider>
            <Router>
                <NavBar />
                <div style={{ paddingTop: '60px' }}>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<RegistrationPage />} />
                        <Route path="/user" element={<UserPage />} />
                        <Route path="/admin" element={<AdminPage />} />
                        <Route path="/add-child" element={<AddChildPage />} />
                        <Route path="/create-class" element={<CreateClassPage />} />
                        <Route path="/enroll/:token" element={<EnrollmentPage />} />
                        <Route path="/class-management" element={<ClassTreasurerPage />} />
                        <Route path="/child/:childId/fundraisers" element={<ChildFundraisersPage />} />
                        <Route path="/fundraiser/:fundraiserId" element={<FundraiserDetailsPage />} />
                        <Route path="/chats" element={<ChatPage />} />
                        <Route path="/chats/:chatId" element={<ChatPage />} />
                        <Route path="/create-fundraiser-application" element={<CreateFundraiserApplicationPage />} />
                    </Routes>
                </div>
            </Router>
        </AuthProvider>
    );
};

export default App;