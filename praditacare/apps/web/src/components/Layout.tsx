import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { UserRoleLabels, type ActionCountResponse, type UserRole } from "@praditacare/shared";
import { Api } from "../api/Client";
import { UseAuth } from "../auth/AuthContext";

const Menu: { To: string; Label: string; Roles: UserRole[] }[] = [
  { To: "/tiket-saya", Label: "Tiket Saya", Roles: ["STUDENT"] },
  { To: "/tiket-baru", Label: "Buat Tiket", Roles: ["STUDENT"] },
  { To: "/antrian", Label: "Antrian Tiket", Roles: ["STAFF", "ADMIN"] },
  { To: "/dashboard", Label: "Dashboard", Roles: ["STAFF", "ADMIN"] },
  { To: "/admin/unit", Label: "Unit", Roles: ["ADMIN"] },
  { To: "/admin/kategori", Label: "Kategori", Roles: ["ADMIN"] },
  { To: "/admin/user", Label: "User", Roles: ["ADMIN"] }
];

export function Layout() {
  const { User, Logout } = UseAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [actionCount, setActionCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    Api.Get<ActionCountResponse>("/dashboard/action-count")
      .then((r) => setActionCount(r.Count))
      .catch(() => setActionCount(0));
  }, [location.pathname]);

  if (!User) return null;
  const items = Menu.filter((m) => m.Roles.includes(User.Role));
  const actionTarget = User.Role === "STUDENT" ? "/tiket-saya" : "/antrian";
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"}`;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
            ☰
          </button>
          <NavLink to="/" className="flex items-center gap-2 font-semibold text-brand-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">PC</span>
            <span className="hidden sm:inline">PraditaCare</span>
          </NavLink>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {items.map((item) => (
              <NavLink key={item.To} to={item.To} className={linkClass}>
                {item.Label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => navigate(actionTarget)}
              className="relative rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
              title="Tiket yang butuh tindakan"
            >
              Perlu tindakan
              <span className={`ml-2 rounded-full px-2 py-0.5 text-white ${actionCount ? "bg-red-600" : "bg-slate-400"}`}>{actionCount}</span>
            </button>
            <NavLink to="/akun" className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-slate-800">{User.Name}</p>
              <p className="text-xs leading-tight text-slate-500">
                {UserRoleLabels[User.Role]}
                {User.UnitName ? ` · ${User.UnitName}` : ""}
              </p>
            </NavLink>
            <button className="btn-secondary btn-sm" onClick={Logout}>
              Keluar
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="flex flex-col gap-1 border-t border-slate-100 px-4 py-3 md:hidden">
            {items.map((item) => (
              <NavLink key={item.To} to={item.To} className={linkClass}>
                {item.Label}
              </NavLink>
            ))}
            <NavLink to="/akun" className={linkClass}>
              Akun Saya
            </NavLink>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
