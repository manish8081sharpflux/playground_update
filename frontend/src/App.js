// src/App.js
import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import TaskManagement from "./components/TaskManagement/taskmanagement";
import AccessDenied from "./components/AccessDenied";
import NotFound from "./components/NotFound";
import Layout from "./components/Layout";
import StudentLayout from "./components/student/StudentLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { RBACProvider } from "./contexts/RBACContext";
import { CoinBalanceProvider } from "./contexts/CoinBalanceContext";
import LoginCard from "./components/login/logincard";
import StudentLogin from "./components/login/StudentLogin";
import UserManagement from "./components/usermanagement/usermanagement";
import DoctorsDataBank from "./pages/medical/DoctorsDataBank";
import RBACManagement from "./components/RBAC/RBACManagement";
import MachineManagement from "./pages/MachineManagement";
import Dashboard from "./components/dashboard/dashboard";
import CourseManagement from "./components/courseManagement/CourseManagement";
import RepairManagement from "./components/repairManagement/RepairManagement";
import PurchaseManagement from "./components/purchaseManagement/PurchaseManagement";
import BalagruhaDashboard from "./components/dashboard/balagruha";
import AttendanceComponent from "./components/Attendance/attendance";
import BalagruhaManagement from "./components/balagruhaManagement/balagruhamanagement";
import WtfDashboard from "./components/wtf/WtfDashboard";
import ShopHome from "./components/shop/ShopHome";
import Cart from "./components/shop/Cart";
import Checkout from "./pages/Checkout";
import OrderHistory from "./pages/OrderHistory";
import OrderDetail from "./pages/OrderDetail";
import OrderReceipt from "./pages/OrderReceipt";
import ProductManagement from "./pages/ProductManagement";
import InventoryManagement from "./pages/InventoryManagement";
import LowStockReport from "./pages/LowStockReport";
import PMLowStock from "./pages/PMLowStock";
import OutOfStockReport from "./pages/OutOfStockReport";
import MasterInventoryReport from "./pages/MasterInventoryReport";
import VendorManagement from "./pages/VendorManagement";
import TransactionHistory from "./pages/TransactionHistory";
import ShopAnalytics from "./pages/ShopAnalytics";
import TransactionReports from "./pages/TransactionReports";
import CoachDeliveries from "./pages/CoachDeliveries";
import CoachRequestsDashboard from "./pages/CoachRequestsDashboard";
import StudentProfile from "./pages/StudentProfile";
import ProductDetail from "./pages/ProductDetail";
import AdminCourseDashboard from "./pages/admin/AdminCourseDashboard";
import CourseStructureBuilder from "./pages/admin/CourseStructureBuilder";
import ContentLibrary from "./pages/admin/ContentLibrary";
import QuizDashboard from "./pages/admin/QuizDashboard";
import QuizBuilder from "./pages/admin/QuizBuilder";
import TranslationDashboard from "./pages/admin/TranslationDashboard";
import TranslationEditor from "./pages/admin/TranslationEditor";
import TranslationQueue from "./pages/admin/TranslationQueue";
import StudentDashboardPage from "./pages/student/StudentDashboardPage";
import ComputerAppsPage from './pages/student/ComputerAppsPage';
import StudentQuizPage from './pages/student/StudentQuizPage';
import StudentQuizResults from './pages/student/StudentQuizResults';
import ArtCoursePage from "./pages/student/ArtCoursePage";
import SpokenEnglishPage from "./pages/student/SpokenEnglishPage";
import LifeSkillsCoursePage from "./pages/student/LifeSkillsCoursePage";

import LifeSkillsVoiceTaskPage from "./pages/student/LifeSkillsVoiceTaskPage";
import CoachAssignmentsPage from "./pages/coach/CoachAssignmentsPage";
import GradingDashboard from "./pages/coach/GradingDashboard";
import CoachCoursesPage from "./pages/coach/CoachCoursesPage";
import CoachCourseDetailPage from "./pages/coach/CoachCourseDetailPage";
import ErrorBoundary from "./components/ErrorBoundary";
import { UserTypes, normalizeUserRole } from "./constants/userTypes";
import { installAlertReplacement } from "./utils/dialogs";

const CoachOrAdminRoute = ({ children }) => {
  const { user } = useAuth();
  const normalizedRole = normalizeUserRole(user?.role);

  if (normalizedRole !== UserTypes.COACH && normalizedRole !== UserTypes.ADMIN) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
};

const App = () => {
  useEffect(() => installAlertReplacement(), []);

  return (
    <>
      <Router>
        <AuthProvider>
          <RBACProvider>
            <CoinBalanceProvider>
              <ErrorBoundary>
              <Toaster position="top-right" />
              <Cart />
              <Routes>
                {/* Public route for login */}
                <Route path="/login" element={<StudentLogin />} />
                <Route path="/admin/login" element={<LoginCard />} />

                {/* Student LMS Routes - Epic 01 (Uses StudentLayout with TitleBar) */}
                <Route element={<StudentLayout />}>
                  <Route
                    path="/student/dashboard"
                    element={
                      <ProtectedRoute>
                        <StudentDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/computer-apps"
                    element={
                      <ProtectedRoute>
                        <ComputerAppsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/computer-apps/quiz/results"
                    element={
                      <ProtectedRoute>
                        <StudentQuizResults />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/computer-apps/quiz/:quizId"
                    element={
                      <ProtectedRoute>
                        <StudentQuizPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/computer-apps/:courseId"
                    element={
                      <ProtectedRoute>
                        <ComputerAppsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/art"
                    element={
                      <ProtectedRoute>
                        <ArtCoursePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/spoken-english"
                    element={
                      <ProtectedRoute>
                        <SpokenEnglishPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/spoken-english/:taskId"
                    element={
                      <ProtectedRoute>
                        <SpokenEnglishPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/life-skills"
                    element={
                      <ProtectedRoute>
                        <LifeSkillsCoursePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/life-skills/quiz/results"
                    element={
                      <ProtectedRoute>
                        <StudentQuizResults />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/life-skills/quiz/:quizId"
                    element={
                      <ProtectedRoute>
                        <StudentQuizPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/life-skills/voice/:taskId"
                    element={
                      <ProtectedRoute>
                        <LifeSkillsVoiceTaskPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/homework"
                    element={
                      <ProtectedRoute>
                        {/* Placeholder - Epic 05 */}
                        <div className="flex items-center justify-center min-h-screen">
                          <h1 className="text-2xl">Homework - Coming Soon</h1>
                        </div>
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* Routes inside the layout */}
                <Route element={<Layout />}>
                  {/* Redirect root to dashboard */}
                  <Route
                    path="/"
                    element={<Navigate to="/dashboard" replace />}
                  />

                  {/* Dashboard - accessible to all authenticated users */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Protected routes with specific permissions */}
                  <Route
                    path="/users"
                    element={
                      <ProtectedRoute module="User Management" action="Read">
                        <UserManagement />
                      </ProtectedRoute>
                    }
                  />

                  {/* Medical: Doctors Data Bank — shared directory of doctors */}
                  <Route
                    path="/medical/doctors"
                    element={
                      <ProtectedRoute module="Medical Check-in" action="Read">
                        <DoctorsDataBank />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/rbac"
                    element={
                      <ProtectedRoute module="Role Management" action="Read">
                        <RBACManagement />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/task"
                    element={
                      <ProtectedRoute module="Task Management" action="Read">
                        <TaskManagement />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/machines"
                    element={
                      <ProtectedRoute module="Machine Management" action="Read">
                        <MachineManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/balagruha"
                    element={
                      <ProtectedRoute requiredRoles={['admin']}>
                        <BalagruhaManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/attendance"
                    element={
                      <ProtectedRoute requiredRoles={['admin', 'coach', 'balagruha-incharge']}>
                        <AttendanceComponent />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/course"
                    element={
                      <ProtectedRoute requiredRoles={['admin', 'coach', 'student']}>
                        <CourseManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/repair"
                    element={
                      <ProtectedRoute requiredRoles={['admin', 'purchase-manager', 'coach', 'medical-incharge', 'balagruha-incharge', 'sports-coach', 'music-coach', 'amma']}>
                        <RepairManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/purchase"
                    element={
                      <ProtectedRoute requiredRoles={['admin', 'purchase-manager', 'coach', 'medical-incharge', 'balagruha-incharge', 'sports-coach', 'music-coach', 'amma']}>
                        <PurchaseManagement />
                      </ProtectedRoute>
                    }
                  />

                  {/* WTF (Wall of Fame) Route */}
                  <Route
                    path="/wtf"
                    element={
                      <ProtectedRoute>
                        <WtfDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Shop Routes */}
                  <Route
                    path="/shop"
                    element={
                      <ProtectedRoute>
                        <ShopHome />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/shop/products/:id"
                    element={
                      <ProtectedRoute>
                        <ProductDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/shop/checkout"
                    element={
                      <ProtectedRoute>
                        <Checkout />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/shop/orders"
                    element={
                      <ProtectedRoute>
                        <OrderHistory />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/shop/orders/:orderNumber"
                    element={
                      <ProtectedRoute>
                        <OrderDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/shop/orders/:orderNumber/receipt"
                    element={
                      <ProtectedRoute>
                        <OrderReceipt />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/coins/history"
                    element={
                      <ProtectedRoute>
                        <TransactionHistory />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin Shop Routes */}
                  <Route
                    path="/shop/admin/products"
                    element={
                      <ProtectedRoute module="Shop Management" action="Manage">
                        <ProductManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/shop/admin/vendors"
                    element={
                      <ProtectedRoute module="Shop Management" action="Manage">
                        <VendorManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/shop/admin/inventory"
                    element={
                      <ProtectedRoute module="Shop Management" action="Manage">
                        <InventoryManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/shop/admin/inventory/low-stock"
                    element={
                      <ProtectedRoute module="Shop Management" action="Manage">
                        <LowStockReport />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/shop/admin/inventory/out-of-stock"
                    element={
                      <ProtectedRoute module="Shop Management" action="Manage">
                        <OutOfStockReport />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/shop/admin/inventory/master-report"
                    element={
                      <ProtectedRoute module="Shop Management" action="Manage">
                        <MasterInventoryReport />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/shop/admin/analytics"
                    element={
                      <ProtectedRoute module="Shop Management" action="Manage">
                        <ShopAnalytics />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/shop/admin/reports"
                    element={
                      <ProtectedRoute module="Shop Management" action="Manage">
                        <TransactionReports />
                      </ProtectedRoute>
                    }
                  />

                  {/* Purchase Manager Low Stock Route */}
                  <Route
                    path="/purchase-manager/low-stock"
                    element={
                      <ProtectedRoute>
                        <PMLowStock />
                      </ProtectedRoute>
                    }
                  />

                  {/* Coach Delivery Routes - Sprint5-Story-13 */}
                  <Route
                    path="/coach/deliveries"
                    element={
                      <ProtectedRoute>
                        <CoachDeliveries />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/coach/requests"
                    element={
                      <ProtectedRoute>
                        <CoachOrAdminRoute>
                          <CoachRequestsDashboard />
                        </CoachOrAdminRoute>
                      </ProtectedRoute>
                    }
                  />

                  {/* Student Profile Routes - Sprint5-Story-16 */}
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <StudentProfile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/students/:userId"
                    element={
                      <ProtectedRoute requiredRoles={['admin']}>
                        <StudentProfile />
                      </ProtectedRoute>
                    }
                  />

                  {/* LMS Admin Routes - Sprint 2 Epic 02 */}
                  <Route
                    path="/admin/courses"
                    element={
                      <ProtectedRoute module="LMS Management" action="Manage">
                        <AdminCourseDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/courses/:courseId/structure"
                    element={
                      <ProtectedRoute module="LMS Management" action="Manage">
                        <CourseStructureBuilder />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/content"
                    element={
                      <ProtectedRoute module="LMS Management" action="Manage">
                        <ContentLibrary />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/quizzes"
                    element={
                      <ProtectedRoute module="LMS Management" action="Manage">
                        <QuizDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/quizzes/create"
                    element={
                      <ProtectedRoute module="LMS Management" action="Manage">
                        <QuizBuilder />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/quizzes/:quizId/edit"
                    element={
                      <ProtectedRoute module="LMS Management" action="Manage">
                        <QuizBuilder />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/courses/:courseId/quizzes/create"
                    element={
                      <ProtectedRoute module="LMS Management" action="Manage">
                        <QuizBuilder />
                      </ProtectedRoute>
                    }
                  />

                  {/* Translation Management - Sprint 2 Epic 02 Story 04 */}
                  <Route
                    path="/admin/translations"
                    element={
                      <ProtectedRoute module="LMS Management" action="Manage">
                        <TranslationDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin Course Assignments */}
                  <Route
                    path="/admin/courses/assignments"
                    element={
                      <ProtectedRoute module="LMS Management" action="Manage">
                        <CoachAssignmentsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Coach Course Assignments - Sprint 2 Epic 03 Story 01 */}
                  <Route
                    path="/coach/assignments"
                    element={
                      <ProtectedRoute requiredRoles={['coach', 'admin']}>
                        <CoachAssignmentsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Coach Grading Dashboard - Sprint 2 Epic 03 Story 02 */}
                  <Route
                    path="/coach/grading"
                    element={
                      <ProtectedRoute requiredRoles={['coach', 'admin']}>
                        <GradingDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Coach Course Content Browser (read-only) - Sprint 2 Epic 03 Story 05 */}
                  <Route
                    path="/coach/courses"
                    element={
                      <ProtectedRoute requiredRoles={['coach', 'admin']}>
                        <CoachCoursesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/coach/courses/:courseId"
                    element={
                      <ProtectedRoute requiredRoles={['coach', 'admin']}>
                        <CoachCourseDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/translations/:courseId/queue"
                    element={
                      <ProtectedRoute module="LMS Management" action="Manage">
                        <TranslationQueue />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/translations/:courseId/editor"
                    element={
                      <ProtectedRoute module="LMS Management" action="Manage">
                        <TranslationEditor />
                      </ProtectedRoute>
                    }
                  />

                  {/* Error pages */}
                  <Route path="/access-denied" element={<AccessDenied />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
              </ErrorBoundary>
            </CoinBalanceProvider>
          </RBACProvider>
        </AuthProvider>
      </Router>
    </>
  );
};

export default App;


