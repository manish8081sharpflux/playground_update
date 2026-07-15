import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CoursePage from './pages/CoursePage';
import LessonPage from './pages/LessonPage';
import QuizPage from './pages/QuizPage';
import AdminPage from './pages/AdminPage';
import Navbar from './components/Navbar';
import GamesPage from './pages/GamesPage';
import AdminGamesPage from './pages/AdminGamesPage';
import ArtWeaverPage      from './pages/ArtWeaverPage';
import AdminArtWeaverPage from './pages/AdminArtWeaverPage';

const PrivateRoute = ({ children, adminRequired = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminRequired && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/courses/:courseId" element={<PrivateRoute><CoursePage /></PrivateRoute>} />
        <Route path="/courses/:courseId/lesson/:lessonId" element={<PrivateRoute><LessonPage /></PrivateRoute>} />
        <Route path="/courses/:courseId/quiz" element={<PrivateRoute><QuizPage /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute adminRequired><AdminPage /></PrivateRoute>} />
        <Route path="/games" element={<PrivateRoute><GamesPage /></PrivateRoute>} />
        <Route path="/admin/games" element={<PrivateRoute adminRequired><AdminGamesPage /></PrivateRoute>} />
        <Route path="/artweaver" element={<PrivateRoute><ArtWeaverPage /></PrivateRoute>} />
        <Route path="/admin/artweaver" element={<PrivateRoute adminRequired><AdminArtWeaverPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
