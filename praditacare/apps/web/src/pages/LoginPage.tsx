import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { LoginSchema } from "@praditacare/shared";
import { ApiError } from "../api/Client";
import { HomePathFor, UseAuth } from "../auth/AuthContext";
import { Alert, FieldError } from "../components/Ui";

const DemoAccounts = [
  { Label: "Mahasiswa", Email: "budi@student.pradita.ac.id" },
  { Label: "Staf IT", Email: "staf.it@pradita.ac.id" },
  { Label: "Admin", Email: "admin@pradita.ac.id" }
];

export function LoginPage() {
  const { User, Login } = UseAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>();
  const [busy, setBusy] = useState(false);

  if (User) return <Navigate to={HomePathFor(User)} replace />;

  async function Submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = LoginSchema.safeParse({ Email: email, Password: password });
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }
    setErrors(undefined);
    setBusy(true);
    try {
      const user = await Login(parsed.data);
      navigate(HomePathFor(user), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login gagal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold">PC</div>
          <h1 className="text-2xl font-semibold">PraditaCare</h1>
          <p className="mt-1 text-sm text-brand-100">Layanan bantuan dan pengaduan mahasiswa Universitas Pradita</p>
        </div>
        <form onSubmit={Submit} className="card space-y-4 p-6" noValidate>
          <h2 className="text-lg font-semibold text-slate-900">Masuk ke akun Anda</h2>
          {error && <Alert>{error}</Alert>}
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@pradita.ac.id" />
            <FieldError Errors={errors} Name="Email" />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
            <FieldError Errors={errors} Name="Password" />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Memproses..." : "Masuk"}
          </button>
          <div className="border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs text-slate-500">Akun demo (password: Pradita123!)</p>
            <div className="flex flex-wrap gap-2">
              {DemoAccounts.map((account) => (
                <button
                  key={account.Email}
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    setEmail(account.Email);
                    setPassword("Pradita123!");
                  }}
                >
                  {account.Label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
