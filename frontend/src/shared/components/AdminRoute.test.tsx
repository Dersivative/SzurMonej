import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AdminRoute } from "@/shared/components/AdminRoute";
import { useAuthStore } from "@/features/auth/store/authStore";

function AdminPanel() {
  return <div>Panel administratora</div>;
}

function Dashboard() {
  return <div>Pulpit</div>;
}

describe("AdminRoute", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: null,
    });
  });

  it("renders admin content for ADMIN users", () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: 1,
        email: "admin@example.com",
        fullName: "Admin User",
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN",
        balance: 500,
      },
    });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/app/dashboard" element={<Dashboard />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPanel />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Panel administratora")).toBeInTheDocument();
  });

  it("redirects non-admin users to dashboard", () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: 2,
        email: "rodzic1@example.com",
        fullName: "Rodzic",
        firstName: "Rodzic",
        lastName: "Test",
        role: "USER",
        balance: 100,
      },
    });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/app/dashboard" element={<Dashboard />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPanel />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Pulpit")).toBeInTheDocument();
    expect(screen.queryByText("Panel administratora")).not.toBeInTheDocument();
  });
});
