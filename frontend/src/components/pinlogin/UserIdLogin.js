import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { studentPinLogin } from '../../api';
import showToast from '../../utils/toast';
import './UserIdLogin.css'
import { Link } from 'react-router-dom';

export default function UserIdLogin({ onToggle }) {
    const macAddress = localStorage.getItem('macAddress');
    const [userId, setUserId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login: authLogin } = useAuth();

    const handleSubmit = (e) => {
        e.preventDefault();
        login();
    }

    const handleToggle = (e) => {
        e.preventDefault();
        onToggle();
    };

    const login = async () => {
        setIsLoading(true);
        setError('');

        const data = {
            userId: userId
        };

        try {
            // const response = await axios.post("https://playground.initiativesewafoundation.com/server/api/auth/login", data, { headers });

            const response = await studentPinLogin(data);



            if (response.data) {
                const { token, user } = response.data;

                if (user.status === 'inactive') {
                    const errorMessage = 'Your account is inactive. Please contact support.';
                    setError(errorMessage);
                    showToast(errorMessage, "error");
                    return; // ⛔ Stop login process here
                }

                // Format the user data to match our auth context expectations
                const userData = {
                    token,
                    user: {
                        id: user.id || user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        status: user.status,
                    },
                };

                // Call the login function from auth context
                authLogin(userData);

                // Show success message
                showToast(`Welcome back, ${user.name}!`, "success");

                // Navigate to the appropriate dashboard based on role
                if (user.role === 'student') {
                  navigate('/student/dashboard');
                } else {
                  navigate('/dashboard');
                }
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error('Login failed:', error);

            // Handle different error scenarios
            if (error.response) {
                // Server responded with an error
                const errorMessage = error.response.data.message || 'Login failed. Please check your credentials.';
                setError(errorMessage);
                showToast(errorMessage, "error");
            } else if (error.request) {
                // No response from server
                const errorMessage = 'No response from server. Please try again later.';
                setError(errorMessage);
                showToast(errorMessage, "error");
            } else {
                // Other errors
                const errorMessage = 'Login failed. Please try again.';
                setError(errorMessage);
                showToast(errorMessage, "error");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className='userId-login-container'>
            <form onSubmit={handleSubmit}>
                {error && <div className="error-message">{error}</div>}

                <div className="input-group">
                    <label htmlFor="student-user-id" className="sr-only">User ID</label>
                    <input
                        type="text"
                        id="student-user-id"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="userId"
                        disabled={isLoading}
                        aria-label="User ID"
                    />
                </div>

                 {/* Submit button */}
                 <div className="input-group">
                    <button
                        type="submit"
                        className={`login-button ${isLoading ? 'loading' : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </div>
            </form>

            {/* Toggle link for switching login methods */}
            <a href="#" onClick={handleToggle} className="toggle-link">
                Login with Face ID
            </a>

            <Link to={'/admin/login'}>
            <p className="toggle-link admin-btn">
                User Login
            </p>
            </Link>
        </div>
    )
}
