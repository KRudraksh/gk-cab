import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LoginPage from './LoginPage';
import AdminLoginPage from './AdminLoginPage';
import Dashboard from './AdminDashboard';
import UserDashboard from './UserDashboard';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route path="/adminlogin" element={<AdminLoginPage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/userdashboard" element={<UserDashboard />} />
            </Routes>
        </Router>
    );
}

export default App;
