import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav className="navbar">
      <Link to="/dashboard" className="navbar-brand">📚 EduPOC</Link>
      <div className="navbar-links">
        <NavLink to="/games">Games</NavLink>
        <NavLink to="/artweaver">🎨 Art</NavLink>
        <NavLink to="/dashboard">Dashboard</NavLink>
        {/* {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>} */}
        {user?.role === 'admin' && <NavLink to="/admin/games">Admin Games</NavLink>}
        {user?.role === 'admin' && <NavLink to="/admin/artweaver">Admin Art</NavLink>}
        <span className="nav-user">Hi, {user?.name?.split(' ')[0]}</span>
        <button className="btn btn-outline btn-sm" onClick={logout}>Logout</button>
      </div>
    </nav>
  );
}
