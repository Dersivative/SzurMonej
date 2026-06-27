import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { AdminLayout } from "@/app/layouts/AdminLayout";
import { MainLayout } from "@/app/layouts/MainLayout";
import { AdminRoute } from "@/shared/components/AdminRoute";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";
import { UserRoute } from "@/shared/components/UserRoute";
import { ApplicationsPage } from "@/app/pages/ApplicationsPage";
import { DashboardPage } from "@/app/pages/DashboardPage";
import { LoginPage } from "@/app/pages/LoginPage";
import { RegistrationPage } from "@/app/pages/RegistrationPage";
import { AccountPage } from "./pages/AccountPage";
import { AdminPage } from "./pages/AdminPage";
import { AdminClassApplicationsPage } from "./pages/admin/AdminClassApplicationsPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminClassesPage } from "./pages/admin/AdminClassesPage";
import { AdminFundraisersPage } from "./pages/admin/AdminFundraisersPage";
import { AdminChatsPage } from "./pages/admin/AdminChatsPage";
import { ClassPage } from "./pages/ClassPage";
import { FundraisingPage } from "./pages/FundraisingPage";
import { EnrollmentPage } from "./pages/EnrollmentPage";
import { ChatPage } from "./pages/ChatPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/app/dashboard" replace />,
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/register",
        element: <RegistrationPage />,
      },
      {
        path: "/enroll/:token",
        element: <EnrollmentPage />,
      },
    ],
  },
  {
    path: "/app",
    element: <ProtectedRoute />,
    children: [
      {
        element: <UserRoute />,
        children: [
          {
            element: <MainLayout />,
            children: [
              {
                index: true,
                element: <Navigate to="dashboard" replace />,
              },
              {
                path: "dashboard",
                element: <DashboardPage />,
              },
              {
                path: "applications",
                element: <ApplicationsPage />,
              },
              {
                path: "account",
                element: <AccountPage />,
              },
              {
                path: "classes",
                element: <ClassPage />,
              },
              {
                path: "fundraisers",
                element: <FundraisingPage />,
              },
              {
                path: "chats",
                element: <ChatPage />,
              },
              {
                path: "chats/:chatId",
                element: <ChatPage />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "/admin",
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminRoute />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              {
                index: true,
                element: <AdminPage />,
              },
              {
                path: "class-applications",
                element: <AdminClassApplicationsPage />,
              },
              {
                path: "users",
                element: <AdminUsersPage />,
              },
              {
                path: "classes",
                element: <AdminClassesPage />,
              },
              {
                path: "fundraisers",
                element: <AdminFundraisersPage />,
              },
              {
                path: "chats",
                element: <AdminChatsPage />,
              },
              {
                path: "chats/:chatId",
                element: <AdminChatsPage />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "*",
  },
]);
