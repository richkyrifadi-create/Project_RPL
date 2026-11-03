import { useState, type FormEvent } from "react";
import { ChangePasswordSchema, UserRoleLabels } from "@praditacare/shared";
import { Api, ApiError } from "../api/Client";
import { UseAuth } from "../auth/AuthContext";
import { Alert, FieldError } from "../components/Ui";

export function AccountPage() {
  const { User } = UseAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function Submit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    const parsed = ChangePasswordSchema.safeParse({ CurrentPassword: current, NewPassword: next });
    if (!parsed.success) return setErrors(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    setErrors(undefined);
    setBusy(true);
    try {
      await Api.Send("PUT", "/auth/password", parsed.data);
      setMessage("Password berhasil diubah.");
      setCurrent("");
      setNext("");
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.Errors ?? { CurrentPassword: [err.message] });
    } finally {
      setBusy(false);
    }
  }

  if (!User) return null;
  return (
    <div className="mx-auto max-w-lg space-y-5">
      <h1 className="page-title">Akun Saya</h1>
      <div className="card space-y-1 p-5 text-sm">
        <p className="text-base font-semibold text-slate-900">{User.Name}</p>
        <p className="text-slate-500">{User.Email}</p>
        <p className="text-slate-500">
          {UserRoleLabels[User.Role]}
          {User.UnitName ? ` · ${User.UnitName}` : ""}
          {User.StudentNumber ? ` · NIM ${User.StudentNumber}` : ""}
        </p>
      </div>
      <form onSubmit={Submit} className="card space-y-4 p-5" noValidate>
        <h2 className="font-semibold text-slate-900">Ganti Password</h2>
        {message && <Alert Kind="success">{message}</Alert>}
        <div>
          <label className="label">Password lama</label>
          <input type="password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} />
          <FieldError Errors={errors} Name="CurrentPassword" />
        </div>
        <div>
          <label className="label">Password baru</label>
          <input type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} />
          <FieldError Errors={errors} Name="NewPassword" />
        </div>
        <button className="btn-primary" disabled={busy}>
          Simpan
        </button>
      </form>
    </div>
  );
}
