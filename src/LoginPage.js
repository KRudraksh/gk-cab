import React, { useState } from 'react';
import './LoginPage.css'; // Importing the CSS file for styles

const LoginPage = () => {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        const userData = { username: userId, password };

        try {
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            if (response.ok) {
                const data = await response.json(); // Get the response data
                // Store username and name in local storage
                localStorage.setItem('username', userId);
                localStorage.setItem('name', data.name); // Store the user's name
                // Redirect to user dashboard
                window.location.href = '/userdashboard';
            } else {
                const errorMessage = await response.text();
                setError(`Login failed: ${errorMessage}`);
            }
        } catch (error) {
            console.error('Error:', error);
            setError('An error occurred. Please try again.');
        }
    };

    return (
        <div className="login-container">
            <h1 className="heading">GK-CAB</h1>
            <h2 className="sub-sub-heading">DATA PORTAL</h2>
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
                <div className="button-container">
                    <button type="button" className="link-button">New User</button>
                    <button type="button" className="link-button">Forgot Password</button>
                </div>
            </form>
        </div>
    );
};

export default LoginPage;
