import { useEffect, useState } from "react";
import {
  CreateUserSchema,
  FormatDateTime,
  ResetPasswordSchema,
  UpdateUserSchema,
  UserRoleLabels,
  UserRoleValues,
  type Unit,
  type User,
  type UserRole
} from "@praditacare/shared";
import { Api, ApiError } from "../api/Client";
import { Alert, ConfirmDialog, EmptyState, ErrorMessage, ErrorState, FieldError, Modal, Spinner } from "../components/Ui";
import { ActiveBadge } from "./AdminUnitsPage";

interface FormState {
  Name: string;
  Email: string;
  Role: UserRole;
  StudentNumber: string;
  StudyProgram: string;
  UnitId: string;
  Password: string;
}

const Empty: FormState = { Name: "", Email: "", Role: "STUDENT", StudentNumber: "", StudyProgram: "", UnitId: "", Password: "" };

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [editing, setEditing] = useState<User | null | "new">(null);
  const [form, setForm] = useState<FormState>(Empty);
  const [errors, setErrors] = useState<Record<string, string[]>>();
  const [toggle, setToggle] = useState<User | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);

  const Load = () => {
    setLoadError(null);
    return Api.Get<User[]>("/users", { Role: roleFilter, UnitId: unitFilter })
      .then(setUsers)
      .catch((err) => setLoadError(ErrorMessage(err, "Gagal memuat user")));
  };
  useEffect(() => {
    setUsers(null);
    Load();
  }, [roleFilter, unitFilter]);
  useEffect(() => {
    Api.Get<Unit[]>("/units").then(setUnits).catch(() => setUnits([]));
  }, []);

  function Open(user: User | "new") {
    setForm(
      user === "new"
        ? Empty
        : {
            Name: user.Name,
            Email: user.Email,
            Role: user.Role,
            StudentNumber: user.StudentNumber ?? "",
            StudyProgram: user.StudyProgram ?? "",
            UnitId: user.UnitId ? String(user.UnitId) : "",
            Password: ""
          }
    );
    setErrors(undefined);
    setEditing(user);
  }

  function ToPayload(user?: User) {
    return {
      Name: form.Name,
      Email: form.Email,
      Role: form.Role,
      StudentNumber: form.StudentNumber || null,
      StudyProgram: form.StudyProgram || null,
      UnitId: form.UnitId ? Number(form.UnitId) : null,
      ...(user ? { IsActive: user.IsActive } : { Password: form.Password })
    };
  }

  async function Save() {
    const isNew = editing === "new";
    const parsed = (isNew ? CreateUserSchema : UpdateUserSchema).safeParse(ToPayload(isNew ? undefined : (editing as User)));
    if (!parsed.success) return setErrors(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    setBusy(true);
    try {
      if (isNew) await Api.Send("POST", "/users", parsed.data);
      else if (editing) await Api.Send("PUT", `/users/${editing.Id}`, parsed.data);
      setEditing(null);
      setMessage("User berhasil disimpan.");
      await Load();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.Errors ?? { Email: [err.message] });
    } finally {
      setBusy(false);
    }
  }

  async function ToggleActive() {
    if (!toggle) return;
    setBusy(true);
    try {
      const { Name, Email, Role, StudentNumber, StudyProgram, UnitId } = toggle;
      await Api.Send("PUT", `/users/${toggle.Id}`, { Name, Email, Role, StudentNumber, StudyProgram, UnitId, IsActive: !toggle.IsActive });
      setToggle(null);
      await Load();
    } catch (err) {
      setToggle(null);
      setError(err instanceof ApiError ? err.message : "Gagal mengubah status user");
    } finally {
      setBusy(false);
    }
  }

  async function ResetPassword() {
    if (!resetting) return;
    const parsed = ResetPasswordSchema.safeParse({ NewPassword: newPassword });
    if (!parsed.success) return setErrors(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    setBusy(true);
    try {
      await Api.Send("POST", `/users/${resetting.Id}/reset-password`, parsed.data);
      setMessage(`Password ${resetting.Name} berhasil direset.`);
      setResetting(null);
    } catch (err) {
      if (err instanceof ApiError && err.Errors) setErrors(err.Errors);
      else setErrors({ NewPassword: [ErrorMessage(err, "Gagal mereset password")] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Manajemen User</h1>
        <div className="flex flex-wrap gap-2">
          <select className="input w-auto" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">Semua peran</option>
            {UserRoleValues.map((r) => (
              <option key={r} value={r}>
                {UserRoleLabels[r]}
              </option>
            ))}
          </select>
          <select className="input w-auto" value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
            <option value="">Semua unit</option>
            {units.map((u) => (
              <option key={u.Id} value={u.Id}>
                {u.Name}
              </option>
            ))}
          </select>
          <button className="btn-primary" onClick={() => Open("new")}>
            + Tambah User
          </button>
        </div>
      </div>
      {message && <Alert Kind="success">{message}</Alert>}
      {error && <Alert>{error}</Alert>}
      <div className="card overflow-x-auto">
        {loadError ? (
          <ErrorState Message={loadError} OnRetry={Load} />
        ) : !users ? (
          <Spinner />
        ) : users.length === 0 ? (
          <EmptyState Title="Tidak ada user" Description="Tidak ada user yang cocok dengan filter peran dan unit." />
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Peran</th>
                <th>Unit / NIM</th>
                <th>Login terakhir</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.Id}>
                  <td>
                    <p className="font-medium text-slate-900">{u.Name}</p>
                    <p className="text-xs text-slate-500">{u.Email}</p>
                  </td>
                  <td>{UserRoleLabels[u.Role]}</td>
                  <td className="whitespace-nowrap">{u.UnitName ?? (u.StudentNumber ? `${u.StudentNumber} · ${u.StudyProgram ?? ""}` : "-")}</td>
                  <td className="whitespace-nowrap text-xs">{FormatDateTime(u.LastLoginAt)}</td>
                  <td>
                    <ActiveBadge Active={u.IsActive} />
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <button className="btn-secondary btn-sm mr-2" onClick={() => Open(u)}>
                      Edit
                    </button>
                    <button
                      className="btn-secondary btn-sm mr-2"
                      onClick={() => {
                        setNewPassword("");
                        setErrors(undefined);
                        setResetting(u);
                      }}
                    >
                      Reset Password
                    </button>
                    <button className="btn-secondary btn-sm" onClick={() => setToggle(u)}>
                      {u.IsActive ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal
        Open={editing !== null}
        Title={editing === "new" ? "Tambah User" : "Edit User"}
        OnClose={() => setEditing(null)}
        Footer={
          <>
            <button className="btn-secondary" onClick={() => setEditing(null)}>
              Batal
            </button>
            <button className="btn-primary" onClick={Save} disabled={busy}>
              Simpan
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nama</label>
            <input className="input" value={form.Name} onChange={(e) => setForm({ ...form, Name: e.target.value })} />
            <FieldError Errors={errors} Name="Name" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={form.Email} onChange={(e) => setForm({ ...form, Email: e.target.value })} />
            <FieldError Errors={errors} Name="Email" />
          </div>
          <div>
            <label className="label">Peran</label>
            <select className="input" value={form.Role} onChange={(e) => setForm({ ...form, Role: e.target.value as UserRole })}>
              {UserRoleValues.map((r) => (
                <option key={r} value={r}>
                  {UserRoleLabels[r]}
                </option>
              ))}
            </select>
          </div>
          {form.Role === "STUDENT" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">NIM</label>
                <input className="input" value={form.StudentNumber} onChange={(e) => setForm({ ...form, StudentNumber: e.target.value })} />
                <FieldError Errors={errors} Name="StudentNumber" />
              </div>
              <div>
                <label className="label">Program studi</label>
                <input className="input" value={form.StudyProgram} onChange={(e) => setForm({ ...form, StudyProgram: e.target.value })} />
              </div>
            </div>
          )}
          {form.Role === "STAFF" && (
            <div>
              <label className="label">Unit</label>
              <select className="input" value={form.UnitId} onChange={(e) => setForm({ ...form, UnitId: e.target.value })}>
                <option value="">Pilih unit...</option>
                {units.map((u) => (
                  <option key={u.Id} value={u.Id}>
                    {u.Name}
                  </option>
                ))}
              </select>
              <FieldError Errors={errors} Name="UnitId" />
            </div>
          )}
          {editing === "new" && (
            <div>
              <label className="label">Password awal</label>
              <input type="password" className="input" value={form.Password} onChange={(e) => setForm({ ...form, Password: e.target.value })} />
              <FieldError Errors={errors} Name="Password" />
            </div>
          )}
        </div>
      </Modal>
      <ConfirmDialog
        Open={!!resetting}
        Title={`Reset password ${resetting?.Name ?? ""}?`}
        Message="Sampaikan password baru kepada user secara langsung."
        ConfirmLabel="Reset"
        Busy={busy}
        OnCancel={() => setResetting(null)}
        OnConfirm={ResetPassword}
      >
        <div>
          <label className="label">Password baru</label>
          <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <FieldError Errors={errors} Name="NewPassword" />
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        Open={!!toggle}
        Title={toggle?.IsActive ? "Nonaktifkan user?" : "Aktifkan user?"}
        Message={toggle?.IsActive ? "User tidak akan bisa login. Data tiketnya tetap tersimpan." : "User dapat login kembali."}
        Danger={toggle?.IsActive}
        Busy={busy}
        OnCancel={() => setToggle(null)}
        OnConfirm={ToggleActive}
      />
    </div>
  );
}
