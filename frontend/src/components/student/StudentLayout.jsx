import { Outlet } from 'react-router-dom';
import TitleBar from './TitleBar';
import Toolbar from './Toolbar';

/**
 * StudentLayout Component - Epic 01 Story 01
 * Layout wrapper for all student pages
 * Includes:
 * - Persistent TitleBar (coin balance, notifications, timer)
 * - Persistent Toolbar (emotion tracking, voice chat, homework, help)
 * - Content area for page-specific content
 */
export default function StudentLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Persistent Title Bar */}
      <TitleBar />

      {/* Persistent Toolbar */}
      <Toolbar />

      {/* Main Content Area */}
      <main className="py-8 px-6">
        <div className="w-full">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
}
