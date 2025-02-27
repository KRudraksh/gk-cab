import React, { useState } from 'react';
import './AdminLoginPage.css'; // Importing the CSS file for styles

// Get the admin password from environment variable
const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD;

const AdminLoginPage = () => {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        // Using environment variable for password with fallback
        console.log('Checking password:', password);
        console.log('Against password:', ADMIN_PASSWORD);
        
        if (userId === 'gkmicro' && password === ADMIN_PASSWORD) {
            // Redirect to the dashboard
            window.location.href = '/dashboard';
        } else {
            setError('Invalid User ID or Password');
        }
    };

    return (
        <div className="login-container">
            <h1 className="heading">GK-CAB</h1>
            <h2 className="sub-sub-heading">ADMIN PORTAL</h2>
            <form className="login-form" onSubmit={handleLogin}>
                <input
                    type="text"
                    placeholder="User ID"
                    className="input-field"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    className="input-field"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit" className="submit-button">Login</button>
                {error && <p className="error-message">{error}</p>}
            </form>
        </div>
    );
};

export default AdminLoginPage; 