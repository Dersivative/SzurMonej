import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ProtectedRoute: React.FC = () => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return <div>Ładowanie...</div>; // Or a spinner component
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
