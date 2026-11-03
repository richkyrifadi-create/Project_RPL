import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import type { UserRole } from "@praditacare/shared";
import { HomePathFor, UseAuth } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import { Spinner } from "./components/Ui";
import { AccountPage } from "./pages/AccountPage";
import { AdminCategoriesPage } from "./pages/AdminCategoriesPage";
import { AdminUnitsPage } from "./pages/AdminUnitsPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { CreateTicketPage } from "./pages/CreateTicketPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { MyTicketsPage } from "./pages/MyTicketsPage";
import { StaffQueuePage } from "./pages/StaffQueuePage";
import { TicketDetailPage } from "./pages/TicketDetailPage";

function RequireRole({ Roles, children }: { Roles?: UserRole[]; children: ReactNode }) {
  const { User } = UseAuth();
  if (!User) return <Navigate to="/login" replace />;
  if (Roles && !Roles.includes(User.Role)) return <Navigate to={HomePathFor(User)} replace />;
  return <>{children}</>;
}

function Home() {
  const { User } = UseAuth();
  return <Navigate to={User ? HomePathFor(User) : "/login"} replace />;
}

export function App() {
  const { IsLoading } = UseAuth();
  if (IsLoading) return <Spinner />;
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireRole>
            <Layout />
          </RequireRole>
        }
      >
        <Route index element={<Home />} />
        <Route path="tiket-saya" element={<RequireRole Roles={["STUDENT"]}><MyTicketsPage /></RequireRole>} />
        <Route path="tiket-baru" element={<RequireRole Roles={["STUDENT"]}><CreateTicketPage /></RequireRole>} />
        <Route path="tiket/:Id" element={<TicketDetailPage />} />
        <Route path="antrian" element={<RequireRole Roles={["STAFF", "ADMIN"]}><StaffQueuePage /></RequireRole>} />
        <Route path="dashboard" element={<RequireRole Roles={["STAFF", "ADMIN"]}><DashboardPage /></RequireRole>} />
        <Route path="admin/unit" element={<RequireRole Roles={["ADMIN"]}><AdminUnitsPage /></RequireRole>} />
        <Route path="admin/kategori" element={<RequireRole Roles={["ADMIN"]}><AdminCategoriesPage /></RequireRole>} />
        <Route path="admin/user" element={<RequireRole Roles={["ADMIN"]}><AdminUsersPage /></RequireRole>} />
        <Route path="akun" element={<AccountPage />} />
      </Route>
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
