import React, { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoadingSpinner from "./components/LoadingSpinner";

// 즉시 로드할 컴포넌트들
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Contact from "./pages/Contact";
import SurveyResponse from "./pages/SurveyResponse";
import SurveyMonitoring from "./pages/SurveyMonitoring";

// 지연 로드할 컴포넌트들
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SurveyTemplates = lazy(() => import("./pages/SurveyTemplates"));
const SurveyManagement = lazy(() => import("./pages/SurveyManagement"));
const StudentManagement = lazy(() => import("./pages/StudentManagement"));
const NetworkAnalysis = lazy(() => import("./pages/NetworkAnalysis"));
const IndividualAnalysis = lazy(() => import("./pages/IndividualAnalysis"));
const ClassSurvey = lazy(() => import("./pages/ClassSurvey"));
const Reports = lazy(() => import("./pages/Reports"));
const DataTransfer = lazy(() => import("./pages/DataTransfer"));
const Admin = lazy(() => import("./pages/Admin"));
const Settings = lazy(() => import("./pages/Settings"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const Notifications = lazy(() => import("./pages/Notifications"));

// 보호된 레이아웃 컴포넌트
const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigationItems = [
    {
      id: "dashboard",
      label: "대시보드",
      href: "/dashboard",
      isActive: true,
      icon: "home",
    },
    {
      id: "surveys",
      label: "설문 관리",
      href: "/surveys",
      hasDropdown: true,
      icon: "clipboard",
      children: [
        {
          id: "survey-templates",
          label: "설문 템플릿",
          href: "/survey-templates",
          icon: "template",
        },
        {
          id: "survey-management",
          label: "설문 운영",
          href: "/survey-management",
          icon: "settings",
        },
      ],
    },
    {
      id: "network",
      label: "교우관계 분석",
      href: "/network",
      icon: "network",
    },
    {
      id: "network-comparison",
      label: "교우관계 비교",
      href: "/network-comparison",
      icon: "compare",
    },
    {
      id: "reports",
      label: "AI리포트",
      href: "/reports",
      icon: "document",
    },
    {
      id: "students",
      label: "학생 관리",
      href: "/students",
      icon: "users",
    },
    {
      id: "transfer",
      label: "데이터 이관",
      href: "/transfer",
      icon: "transfer",
    },
    {
      id: "admin",
      label: "어드민",
      href: "/admin",
      icon: "admin",
    },
    {
      id: "settings",
      label: "설정",
      href: "/settings",
      icon: "cog",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        logo="학생 교우관계 분석 시스템"
        navigationItems={navigationItems}
      />
      <main className="pt-10">
        <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
      </main>
    </div>
  );
};

// Header 컴포넌트를 lazy로 로드
const Header = lazy(() => import("./components/Header"));

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* 공개 라우트 - 즉시 로드 */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/s/:surveyId" element={<SurveyResponse />} />

          {/* 보호된 라우트 - 지연 로드 */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <Dashboard />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/survey-templates"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <SurveyTemplates />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/survey-management"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <SurveyManagement />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/survey-monitoring/:surveyId"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <SurveyMonitoring />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

          <Route path="/survey/:surveyId" element={<SurveyResponse />} />

          <Route
            path="/students"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <StudentManagement />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/student-management"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <StudentManagement />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/network"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <NetworkAnalysis />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/network-analysis"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <NetworkAnalysis />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/individual-analysis"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <IndividualAnalysis />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/class-survey"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <ClassSurvey />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <Reports />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/transfer"
            element={
              <ProtectedRoute requiredRole="school_admin">
                <ProtectedLayout>
                  <DataTransfer />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute
                requiredRole={["main_admin", "district_admin", "school_admin"]}
              >
                <ProtectedLayout>
                  <Admin />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <Settings />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile-settings"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <ProfileSettings />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/account-settings"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <AccountSettings />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <Notifications />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

          {/* 잘못된 경로 처리 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#363636",
              color: "#fff",
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: "#10B981",
                secondary: "#fff",
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: "#EF4444",
                secondary: "#fff",
              },
            },
          }}
        />
      </Router>
    </AuthProvider>
  );
};

export default App;
