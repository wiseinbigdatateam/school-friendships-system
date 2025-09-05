import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { HeaderProps } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../hooks/useNotifications";

const Header: React.FC<HeaderProps> = ({ logo, navigationItems }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  
  // 드롭다운 메뉴 참조
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 감지하여 드롭다운 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 사용자 메뉴 외부 클릭 감지
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      
      // 알림 메뉴 외부 클릭 감지
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target as Node)) {
        setShowNotificationMenu(false);
      }
    };

    // 이벤트 리스너 추가
    document.addEventListener('mousedown', handleClickOutside);
    
    // 클린업 함수
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 사용자 역할에 따라 메뉴 접근 권한 확인
  const canAccessAdminFeatures = () => {
    if (!user) return false;
    return ["school_admin", "district_admin", "main_admin"].includes(user.role);
  };

  // 사용자 역할에 따라 필터링된 네비게이션 아이템 생성
  const getFilteredNavigationItems = () => {
    if (!user) return navigationItems;

    return navigationItems.filter((item) => {
      // 담임교사는 데이터이관, 어드민, 설정 메뉴를 볼 수 없음
      if (user.role === "homeroom_teacher") {
        return !["transfer", "admin", "settings"].includes(item.id);
      }

      // 다른 역할들은 모든 메뉴에 접근 가능
      return true;
    });
  };

  const handleLogoClick = () => {
    navigate("/dashboard");
  };

  const handleNavigationClick = (href: string) => {
    navigate(href);
    setActiveDropdown(null);
  };

  const handleDropdownToggle = (itemId: string) => {
    setActiveDropdown(activeDropdown === itemId ? null : itemId);
  };

  const isCurrentPath = (href: string) => {
    return location.pathname === href;
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    setShowUserMenu(false);
  };

  const handleUserMenuClick = (action: string) => {
    setShowUserMenu(false);
    if (action === "logout") {
      handleLogout();
    } else if (action === "profile") {
      navigate("/profile-settings");
    } else if (action === "settings") {
      navigate("/account-settings");
    }
  };

  // 알림 클릭 시 읽음 처리 및 알림 페이지로 이동
  const handleNotificationClick = async (notificationId: string) => {
    try {
      // useNotifications 훅의 markAsRead 함수 사용
      await markAsRead(notificationId);
    } catch (error) {
      console.error("알림 읽음 처리 오류:", error);
    }

    // 알림 메뉴 닫기
    setShowNotificationMenu(false);

    // 알림 페이지로 이동
    navigate("/notifications");
  };

  // useNotifications 훅으로 알림 데이터 관리

  // 필터링된 네비게이션 아이템 가져오기
  const filteredNavigationItems = getFilteredNavigationItems();

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-12 items-center justify-between">
          {/* 로고 */}
          <div className="flex items-center">
            <button
              onClick={handleLogoClick}
              className="flex items-center space-x-2 text-lg font-bold text-blue-600 transition-colors hover:text-blue-700"
            >
              <div className="flex h-36 w-36 items-center justify-center">
                <img
                  src="/logo_school.png"
                  alt="WiseOn School Logo"
                  className="h-full w-full object-contain"
                />
              </div>
            </button>
          </div>

          {/* 설문관리 네비게이션 */}
          <nav className="hidden items-center space-x-6 md:flex">
            {/* 모니터링 */}
            <div className="relative">
              <button
                onClick={() => handleNavigationClick("/dashboard")}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isCurrentPath("/dashboard")
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                }`}
              >
                모니터링
              </button>
            </div>

            {/* 교우 현황 */}
            <div className="relative">
              <button
                onClick={() => handleDropdownToggle("friendship")}
                className={`flex items-center space-x-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isCurrentPath("/survey-templates") ||
                  isCurrentPath("/survey-management")
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                }`}
              >
                <span>진단 조사관리</span>
                <svg
                  className={`h-4 w-4 transition-transform ${
                    activeDropdown === "friendship" ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* 드롭다운 메뉴 */}
              {activeDropdown === "friendship" && (
                <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-md border border-gray-200 bg-white shadow-lg">
                  <div className="py-1">
                    <button
                      onClick={() => handleNavigationClick("/survey-templates")}
                      className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                        isCurrentPath("/survey-templates")
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      설문 생성
                    </button>
                    <button
                      onClick={() =>
                        handleNavigationClick("/survey-management")
                      }
                      className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                        isCurrentPath("/survey-management")
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      설문 리스트
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 교우 현황 분석 */}
            <div className="relative">
              <button
                onClick={() => handleDropdownToggle("analysis")}
                className={`flex items-center space-x-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isCurrentPath("/network-analysis") ||
                  isCurrentPath("/individual-analysis")
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                }`}
              >
                <span>교우 관계 분석</span>
                <svg
                  className={`h-4 w-4 transition-transform ${
                    activeDropdown === "analysis" ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* 드롭다운 메뉴 */}
              {activeDropdown === "analysis" && (
                <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-md border border-gray-200 bg-white shadow-lg">
                  <div className="py-1">
                    <button
                      onClick={() => handleNavigationClick("/network-analysis")}
                      className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                        isCurrentPath("/network-analysis")
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      학급별 분석결과
                    </button>
                    <button
                      onClick={() =>
                        handleNavigationClick("/individual-analysis")
                      }
                      className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                        isCurrentPath("/individual-analysis")
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      학생별 결과분석
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 학급별 분석결과 */}
            <div className="relative">
              <button
                onClick={() => handleNavigationClick("/class-survey")}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isCurrentPath("/class-survey")
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                }`}
              >
                학급조사
              </button>
            </div>

            {/* 학생 등록/관리 */}
            <div className="relative">
              <button
                onClick={() => handleNavigationClick("/student-management")}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isCurrentPath("/student-management")
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                }`}
              >
                학생 등록/관리
              </button>
            </div>
          </nav>

          {/* 사용자 정보 및 알림 */}
          <div className="flex items-center space-x-4">
            {/* 알림 버튼 */}
            <div className="relative" ref={notificationMenuRef}>
              <button
                onClick={() => setShowNotificationMenu(!showNotificationMenu)}
                className="relative p-1.5 text-gray-600 transition-colors hover:text-gray-900"
                aria-label="알림"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* 알림 드롭다운 메뉴 */}
              {showNotificationMenu && (
                <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
                  <div className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        알림
                      </h3>
                      <button
                        onClick={() => setShowNotificationMenu(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* 알림 목록 */}
                    <div className="max-h-64 space-y-3 overflow-y-auto">
                      {notifications.filter((n) => !n.is_read).length > 0 ? (
                        notifications
                          .filter((n) => !n.is_read)
                          .slice(0, 5) // 최대 5개만 표시
                          .map((notification) => (
                            <button
                              key={notification.id}
                              onClick={() =>
                                handleNotificationClick(notification.id)
                              }
                              className="w-full rounded-lg border border-blue-200 bg-blue-50 p-3 text-left transition-colors hover:bg-blue-100"
                            >
                              <div className="flex items-start space-x-3">
                                <div className="mt-2 h-2 w-2 rounded-full bg-blue-500"></div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-blue-900">
                                    {notification.title}
                                  </p>
                                  <p className="mt-1 text-xs text-blue-700">
                                    {notification.message}
                                  </p>
                                  <p className="mt-1 text-xs text-blue-600">
                                    {notification.created_at
                                      ? new Date(
                                          notification.created_at,
                                        ).toLocaleString("ko-KR", {
                                          month: "short",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "-"}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          <svg
                            className="mx-auto mb-2 h-8 w-8 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                            />
                          </svg>
                          <p className="text-sm">새로운 알림이 없습니다</p>
                        </div>
                      )}
                    </div>

                    {/* 전체보기 버튼 */}
                    <div className="mt-4 border-t border-gray-200 pt-3">
                      <button
                        onClick={() => {
                          setShowNotificationMenu(false);
                          navigate("/notifications");
                        }}
                        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                      >
                        전체보기
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 사용자 프로필 */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 rounded-lg p-1.5 transition-colors hover:bg-gray-50"
              >
                <div className="text-right">
                  <p className="max-w-20 truncate text-sm font-medium text-gray-900">
                    {user?.name || "사용자"}
                  </p>
                  <p className="max-w-20 truncate text-xs text-gray-500">
                    {user?.role === "homeroom_teacher"
                      ? "담임교사"
                      : user?.role === "school_admin"
                        ? "학교 관리자"
                        : user?.role === "grade_teacher"
                          ? "학년 부장"
                          : user?.role === "district_admin"
                            ? "교육청 관리자"
                            : user?.role === "main_admin"
                              ? "메인 관리자"
                              : "사용자"}
                  </p>
                </div>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600">
                  <span className="text-xs font-bold text-white">
                    {user?.name ? user.name.charAt(0) : "U"}
                  </span>
                </div>
                <svg
                  className={`h-4 w-4 text-gray-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* 사용자 드롭다운 메뉴 */}
              {showUserMenu && (
                <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg">
                  <div className="py-1">
                    <div className="border-b border-gray-100 px-4 py-3">
                      <div className="mb-1 flex items-center space-x-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600">
                          <span className="text-sm font-bold text-white">
                            {user?.name ? user.name.charAt(0) : "U"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {user?.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {user?.role === "homeroom_teacher"
                              ? "담임교사"
                              : user?.role === "school_admin"
                                ? "학교 관리자"
                                : user?.role === "grade_teacher"
                                  ? "학년 부장"
                                  : user?.role === "district_admin"
                                    ? "교육청 관리자"
                                    : user?.role === "main_admin"
                                      ? "메인 관리자"
                                      : "사용자"}
                          </p>
                        </div>
                      </div>
                      <p className="truncate text-xs text-gray-400">
                        {user?.email}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUserMenuClick("profile")}
                      className="block w-full px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        <svg
                          className="mr-3 h-4 w-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        <span className="font-medium">프로필 설정</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleUserMenuClick("settings")}
                      className="block w-full px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        <svg
                          className="mr-3 h-4 w-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 00-1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span className="font-medium">계정 설정</span>
                      </div>
                    </button>
                    <div className="my-1 border-t border-gray-100"></div>
                    <button
                      onClick={() => handleUserMenuClick("logout")}
                      className="block w-full px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:bg-red-50"
                    >
                      <div className="flex items-center">
                        <svg
                          className="mr-3 h-4 w-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        <span className="font-medium">로그아웃</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
