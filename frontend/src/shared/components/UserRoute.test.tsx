import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { UserRoute } from "@/shared/components/UserRoute";
import { useAuthStore } from "@/features/auth/store/authStore";

function UserDashboard() {
  return <div>Pulpit użytkownika</div>;
}

function AdminHome() {
  return <div>Panel administratora</div>;
}

describe("UserRoute", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: null,
    });
  });

  it("redirects admin users away from user routes", () => {
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
      <MemoryRouter initialEntries={["/app/dashboard"]}>
        <Routes>
          <Route path="/admin" element={<AdminHome />} />
          <Route element={<UserRoute />}>
            <Route path="/app/dashboard" element={<UserDashboard />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Panel administratora")).toBeInTheDocument();
    expect(screen.queryByText("Pulpit użytkownika")).not.toBeInTheDocument();
  });
});
