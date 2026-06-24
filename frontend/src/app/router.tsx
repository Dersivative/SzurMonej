import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { MainLayout } from "@/app/layouts/MainLayout";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";
import { DashboardPage } from "@/app/pages/DashboardPage";
import { LoginPage } from "@/app/pages/LoginPage";
import { AccountPage } from "./pages/AccountPage";
import { ClassPage } from "./pages/ClassPage";
import { FundraisingPage } from "./pages/FundraisingPage";
import { FinancesPage } from "./pages/FinancesPage";
import { EnrollmentPage } from "./pages/EnrollmentPage";

// function RegisterPage() {
//   return <h1 className="text-foreground">Rejestracja</h1>;
// }

// function ProjectsPage() {
//   return <h1 className="text-foreground">Projekty</h1>;
// }

// function ProjectDetailsPage() {
//   return <h1 className="text-foreground">Szczegóły projektu</h1>;
// }

// function SettingsPage() {
//   return <h1 className="text-foreground">Ustawienia</h1>;
// }

// function NotFoundPage() {
//   return <h1 className="text-foreground">404 — strona nie istnieje</h1>;
// }

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
        path: "/enroll/:token",
        element: <EnrollmentPage />,
      },
      // {
      //   path: "/register",
      //   element: <RegisterPage />,
      // },
    ],
  },
  {
    path: "/app",
    element: <ProtectedRoute />,
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
            path: "finances",
            element: <FinancesPage />,
          },
          // {
          //   path: "projects",
          //   element: <ProjectsPage />,
          // },
          // {
          //   path: "projects/:id",
          //   element: <ProjectDetailsPage />,
          // },
          // {
          //   path: "settings",
          //   element: <SettingsPage />,
          // },
        ],
      },
    ],
  },
  {
    path: "*",
    // element: <NotFoundPage />,
  },
]);
