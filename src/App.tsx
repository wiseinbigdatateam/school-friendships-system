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
import FloatingActionButton from "./components/FloatingActionButton";

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
const NetworkAnalysisPage = lazy(() => import("./pages/NetworkAnalysisPage"));
const IndividualAnalysis = lazy(() => import("./pages/IndividualAnalysis"));
const IntegratedAnalysis = lazy(() => import("./pages/IntegratedAnalysis"));
const GradeAnalysis = lazy(() => import("./pages/GradeAnalysis"));
const SchoolWideAnalysis = lazy(() => import("./pages/SchoolWideAnalysis"));
const ClassSurvey = lazy(() => import("./pages/ClassSurvey"));
const Reports = lazy(() => import("./pages/Reports"));
const DataTransfer = lazy(() => import("./pages/DataTransfer"));
const Admin = lazy(() => import("./pages/Admin"));
const Settings = lazy(() => import("./pages/Settings"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const Notifications = lazy(() => import("./pages/Notifications"));
const GradeTeacherDashboard = lazy(() => import("./pages/GradeTeacherDashboard"));

// 보호된 레이아웃 컴포넌트
const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // 사용자 역할에 따른 네비게이션 아이템 설정
  const getNavigationItems = () => {
    const userStr = localStorage.getItem("wiseon_user");
    if (!userStr) return [];

    try {
      const user = JSON.parse(userStr);
      
      // 학급부장(grade_teacher)인 경우 제한된 네비게이션
      if (user.role === 'grade_teacher') {
        return [
          {
            id: "grade-dashboard",
            label: "학년 모니터링",
            href: "/grade-dashboard",
            isActive: true,
            icon: "home",
          },
          {
            id: "notifications",
            label: "알림",
            href: "/notifications",
            icon: "bell",
          },
        ];
      }

      // 메인 관리자(main_admin)인 경우 어드민 전용 네비게이션
      if (user.role === 'main_admin') {
        return [
          {
            id: "admin",
            label: "어드민 관리",
            href: "/admin",
            isActive: true,
            icon: "home",
          },
        ];
      }

      // 다른 역할의 경우 전체 네비게이션
      return [
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
          id: "integrated-analysis",
          label: "통합 교우관계 분석",
          href: "/integrated-analysis",
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
    } catch (error) {
      console.error("사용자 정보 파싱 오류:", error);
      return [];
    }
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        logo="학생 교우관계 분석 시스템"
        navigationItems={navigationItems}
      />
      <main className="pt-10">
        <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
      </main>
      <FloatingActionButton />
    </div>
  );
};

// Header 컴포넌트를 lazy로 로드
const Header = lazy(() => import("./components/Header"));

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* 공개 라우트 - 즉시 로드 */}
          <Route
            path="/"
            element={
              <div className="min-h-screen bg-gray-50">
                <Landing />
              </div>
            }
          />
          <Route
            path="/login"
            element={
              <div className="min-h-screen bg-gray-50">
                <Login />
              </div>
            }
          />
          <Route
            path="/signup"
            element={
              <div className="min-h-screen bg-gray-50">
                <Signup />
              </div>
            }
          />
          <Route
            path="/contact"
            element={
              <div className="min-h-screen bg-gray-50">
                <Contact />
              </div>
            }
          />
          <Route
            path="/s/:surveyId"
            element={
              <div className="min-h-screen bg-gray-50">
                <SurveyResponse />
              </div>
            }
          />

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

          {/* 학년부장 전용 대시보드 */}
          <Route
            path="/grade-dashboard"
            element={
              <ProtectedRoute requiredRole="grade_teacher">
                <ProtectedLayout>
                  <GradeTeacherDashboard />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

          {/* 메인 관리자 전용 페이지 */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="main_admin">
                <ProtectedLayout>
                  <Admin />
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

          <Route
            path="/survey/:surveyId"
            element={
              <div className="min-h-screen bg-gray-50">
                <SurveyResponse />
              </div>
            }
          />

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
            path="/network-analysis-new"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <NetworkAnalysisPage />
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
            path="/integrated-analysis"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <IntegratedAnalysis />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/grade-analysis"
            element={
              <ProtectedRoute requiredRole="grade_teacher">
                <ProtectedLayout>
                  <GradeAnalysis />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/school-wide-analysis"
            element={
              <ProtectedRoute requiredRole="school_admin">
                <ProtectedLayout>
                  <SchoolWideAnalysis />
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
