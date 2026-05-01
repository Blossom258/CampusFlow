import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "../components/Layout";
import ProtectedRoute from "./ProtectedRoute";
import ErrorBoundary from "./ErrorBoundary";

// ===== 路由懒加载 =====
const Login = lazy(() => import("../pages/Login"));
const Approval = lazy(() => import("../pages/Approval"));
const ApplyPage = lazy(() => import("../pages/Apply"));
const ApprovalDetailPage = lazy(() => import("../pages/ApprovalDetail"));
const MyApplications = lazy(() => import("../pages/MyApplications"));
const Workspace = lazy(() => import("../pages/Workspace"));

const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <ErrorBoundary>
        <Suspense fallback={<div style={{ padding: 24 }}>页面加载中...</div>}>
          <Login />
        </Suspense>
      </ErrorBoundary>
    ),
  },
  {
    path: "/",
    // 🔒 最外层：必须登录
    element: (
      <ProtectedRoute>
        <ErrorBoundary>
          <Suspense fallback={<div style={{ padding: 24 }}>页面加载中...</div>}>
            <AppLayout />
          </Suspense>
        </ErrorBoundary>
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/",
        element: <Navigate to="/workspace" replace />,
      },
      {
        path: "workspace",
        element: <Workspace />,
      },

      // =====================
      // ✅ 审批中心（HR / Finance / Admin）
      // =====================
      {
        path: "approval",
        element: (
          <ProtectedRoute allowedRoles={["tutor", "academic_office", "admin"]}>
            <Approval />
          </ProtectedRoute>
        ),
      },
      {
        path: "approval-detail/:instanceId",
        element: (
          <ProtectedRoute>
            <ApprovalDetailPage />
          </ProtectedRoute>
        ),
      },

      // =====================
      // 🌍 普通功能（只校验登录）
      // =====================
      {
        path: "apply",
        element: (
          <ProtectedRoute allowedRoles={["student", "admin"]}>
            <ApplyPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "my-applications",
        element: (
          <ProtectedRoute allowedRoles={["student", "admin"]}>
            <MyApplications />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

export default router;
