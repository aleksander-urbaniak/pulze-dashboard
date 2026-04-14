import { Fragment, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import clsx from "clsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleUser,
  faEllipsisVertical,
  faKey,
  faLock,
  faMagnifyingGlass,
  faPlus,
  faShieldHalved,
  faTrashCan,
  faUsers,
  faXmark
} from "@fortawesome/free-solid-svg-icons";

import type { User, UserRole } from "../../../lib/types";
import {
  settingsFieldClass,
  settingsLabelClass,
  settingsMutedButton,
  settingsShellCard,
  settingsPrimaryButton
} from "./theme";

type NewUserDraft = {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
};

type GroupDraft = { id: string; name: string; defaultRole: UserRole; isSystem: boolean };

type UsersSectionProps = {
  headerRight?: React.ReactNode;
  isAdmin: boolean;
  newUser: NewUserDraft;
  setNewUser: Dispatch<SetStateAction<NewUserDraft>>;
  onCreateUser: (overrides?: Partial<NewUserDraft>) => void;
  userStatus: string | null;
  users: User[];
  editingUserId: string | null;
  setEditingUserId: Dispatch<SetStateAction<string | null>>;
  userUpdateStatus: string | null;
  updateUserDraft: (id: string, updates: Partial<User>) => void;
  userPasswordDrafts: Record<string, string>;
  setUserPasswordDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  onSaveUserDetails: (entry: User) => void;
  onResetUser: (id: string) => void;
  onDeleteUser: (id: string) => void;
};

const roles: UserRole[] = ["admin", "manager", "operator", "auditor", "viewer"];
const roleLabel = (role: UserRole) => role.charAt(0).toUpperCase() + role.slice(1);
const roleGroupName = (role: UserRole) =>
  role === "admin"
    ? "Admins"
    : role === "manager"
      ? "Managers"
      : role === "operator"
        ? "Operators"
        : role === "auditor"
          ? "Auditors"
          : "Viewers";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <span className={settingsLabelClass}>{label}</span>
      {children}
    </label>
  );
}

function FooterBar({ count }: { count: number }) {
  return (
    <footer className="flex items-center justify-between border-t border-[#1d2f4c] bg-white/[0.04] px-4 py-4 md:px-6">
      <p className="text-sm font-semibold text-slate-400">Showing {count ? "1" : "0"} to {count} of {count}</p>
      <div className="flex items-center gap-2">
        <button type="button" className={clsx(settingsMutedButton, "h-10 px-5 py-0 opacity-60")} disabled>
          Previous
        </button>
        <span className="text-sm font-semibold text-slate-300">Page 1 of 1</span>
        <button type="button" className={clsx(settingsMutedButton, "h-10 px-5 py-0 opacity-60")} disabled>
          Next
        </button>
      </div>
    </footer>
  );
}

export default function UsersSection({
  headerRight,
  isAdmin,
  newUser,
  setNewUser,
  onCreateUser,
  userStatus,
  users,
  editingUserId,
  setEditingUserId,
  userUpdateStatus,
  updateUserDraft,
  userPasswordDrafts,
  setUserPasswordDrafts,
  onSaveUserDetails,
  onResetUser,
  onDeleteUser
}: UsersSectionProps) {
  const [searchUserTerm, setSearchUserTerm] = useState("");
  const [searchGroupTerm, setSearchGroupTerm] = useState("");
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [groupIdForNewUser, setGroupIdForNewUser] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupRole, setNewGroupRole] = useState<UserRole>("viewer");
  const [customGroups, setCustomGroups] = useState<GroupDraft[]>([]);
  const [hiddenSystemIds, setHiddenSystemIds] = useState<string[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupDrafts, setGroupDrafts] = useState<Record<string, { name: string; defaultRole: UserRole }>>({});

  const filteredUsers = useMemo(() => {
    const q = searchUserTerm.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  }, [searchUserTerm, users]);

  const systemGroups = useMemo(() => {
    const seen = new Set<string>();
    return users.reduce<GroupDraft[]>((acc, u) => {
      const id = `system:${u.role}`;
      if (!seen.has(id)) {
        seen.add(id);
        acc.push({ id, name: roleGroupName(u.role), defaultRole: u.role, isSystem: true });
      }
      return acc;
    }, []);
  }, [users]);

  const groups = useMemo(() => {
    const visibleSystem = systemGroups
      .filter((g) => !hiddenSystemIds.includes(g.id))
      .map((g) => ({ ...g, ...(groupDrafts[g.id] ?? {}) }));
    return [...visibleSystem, ...customGroups].sort((a, b) => a.name.localeCompare(b.name));
  }, [systemGroups, hiddenSystemIds, groupDrafts, customGroups]);

  const filteredGroups = useMemo(() => {
    const q = searchGroupTerm.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q) || g.defaultRole.toLowerCase().includes(q));
  }, [groups, searchGroupTerm]);

  const groupMembers = useMemo(() => {
    const count = new Map<string, number>();
    groups.forEach((g) => count.set(g.id, users.filter((u) => u.role === g.defaultRole).length));
    return count;
  }, [groups, users]);

  useEffect(() => {
    if (!groupIdForNewUser && groups.length > 0) setGroupIdForNewUser(groups[0].id);
  }, [groupIdForNewUser, groups]);

  if (!isAdmin) {
    return (
      <section className="space-y-6 p-2 lg:p-0">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FontAwesomeIcon icon={faUsers} className="h-5 w-5 shrink-0 text-accent" />
              <h2 className="text-[2.2rem] font-semibold leading-none text-text">Users & Groups</h2>
            </div>
            {headerRight}
          </div>
          <p className="mt-2 text-sm text-slate-500">Manage users, groups, and access roles.</p>
        </div>
        <p className="text-sm text-slate-500">Your role does not include user management.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6 p-2 lg:p-0">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faUsers} className="h-5 w-5 shrink-0 text-accent" />
            <h2 className="text-[2.2rem] font-semibold leading-none text-text">Users & Groups</h2>
          </div>
          {headerRight}
        </div>
        <p className="mt-2 text-sm text-slate-500">Manage users, groups, and access roles.</p>
      </div>
      {userStatus ? <p className="text-xs text-slate-400">{userStatus}</p> : null}
      {userUpdateStatus ? <p className="text-xs text-slate-400">{userUpdateStatus}</p> : null}

      <article className={clsx(settingsShellCard, "overflow-hidden")}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1d2f4c] px-5 py-4 md:px-6">
          <h3 className="text-[2.1rem] font-semibold text-text">{filteredUsers.length} user</h3>
          <div className="flex w-full flex-wrap justify-end gap-2 md:w-auto">
            <label className="relative min-w-[220px] flex-1 md:flex-none">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input value={searchUserTerm} onChange={(e) => setSearchUserTerm(e.target.value)} placeholder="Search users..." className={clsx(settingsFieldClass, "h-11 pl-11")} />
            </label>
            <button type="button" className={clsx(settingsPrimaryButton, "h-11 px-5 text-xs")} onClick={() => setIsCreateUserModalOpen(true)}>
              <FontAwesomeIcon icon={faPlus} className="mr-2 h-3.5 w-3.5" />
              Create new user
            </button>
          </div>
        </header>
        <div className="grid grid-cols-[minmax(320px,1fr)_170px_210px_220px] border-b border-[#1d2f4c] bg-white/[0.04] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.26em] text-slate-400 md:px-6">
          <span>User</span>
          <span className="border-l border-[#1d2f4c] text-center">Role</span>
          <span className="border-l border-[#1d2f4c] text-center">2FA</span>
          <span className="border-l border-[#1d2f4c] text-center">Actions</span>
        </div>
        <div className="divide-y divide-[#1d2f4c]">
          {filteredUsers.map((u) => {
            const editing = editingUserId === u.id;
            return (
              <div key={u.id} className="grid grid-cols-[minmax(320px,1fr)_170px_210px_220px] items-center px-5 py-4 md:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1f3b84]/65 text-accent"><FontAwesomeIcon icon={faShieldHalved} className="h-3.5 w-3.5" /></div>
                  <div className="min-w-0"><p className="truncate text-lg font-semibold text-text leading-tight">{u.firstName} {u.lastName}</p><p className="truncate text-sm text-muted">@{u.username}</p></div>
                </div>
                <div className="flex items-center justify-center border-l border-[#1d2f4c]">
                  <span className="inline-flex w-fit rounded-lg bg-[#17316e] px-3 py-1 text-sm font-semibold text-[#E8EFFB]">{u.role}</span>
                </div>
                <div className="flex items-center justify-center border-l border-[#1d2f4c]">
                  <span className={clsx("inline-flex w-fit items-center gap-2 rounded-lg px-3 py-1 text-sm font-semibold", u.twoFactorEnabled ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300")}>
                    <FontAwesomeIcon icon={faLock} className="h-3 w-3" />{u.twoFactorEnabled ? "2FA enabled" : "2FA disabled"}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1.5 border-l border-[#1d2f4c]">
                  {editing ? (
                    <Fragment>
                      <button type="button" onClick={() => onSaveUserDetails(u)} className={clsx(settingsPrimaryButton, "h-9 px-3 py-0 text-[10px]")}>Save</button>
                      <button type="button" onClick={() => { onResetUser(u.id); setEditingUserId(null); }} className={clsx(settingsMutedButton, "h-9 px-3 py-0")}>Cancel</button>
                    </Fragment>
                  ) : (
                    <Fragment>
                      <button type="button" onClick={() => onDeleteUser(u.id)} className={clsx(settingsMutedButton, "inline-flex h-9 w-9 items-center justify-center px-0 py-0 leading-none text-slate-400 hover:text-rose-300")} title="Delete user"><FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => setEditingUserId(u.id)} className={clsx(settingsMutedButton, "inline-flex h-9 w-9 items-center justify-center px-0 py-0 leading-none text-slate-400")} title="Edit user"><FontAwesomeIcon icon={faEllipsisVertical} className="h-3.5 w-3.5" /></button>
                    </Fragment>
                  )}
                </div>
                <div
                  className={clsx(
                    "col-span-4 grid overflow-hidden transition-all duration-300 [transition-timing-function:linear]",
                    editing ? "mt-4 max-h-[520px] border-t border-[#1d2f4c] pt-4 opacity-100" : "max-h-0 border-t border-transparent pt-0 opacity-0"
                  )}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="First Name"><input value={u.firstName} onChange={(e) => updateUserDraft(u.id, { firstName: e.target.value })} className={settingsFieldClass} /></Field>
                    <Field label="Last Name"><input value={u.lastName} onChange={(e) => updateUserDraft(u.id, { lastName: e.target.value })} className={settingsFieldClass} /></Field>
                    <Field label="Username"><input value={u.username} onChange={(e) => updateUserDraft(u.id, { username: e.target.value })} className={settingsFieldClass} /></Field>
                    <Field label="Email"><input value={u.email} onChange={(e) => updateUserDraft(u.id, { email: e.target.value })} className={settingsFieldClass} /></Field>
                    <Field label="Reset Password">
                      <div className="relative">
                        <FontAwesomeIcon icon={faKey} className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                        <input type="password" value={userPasswordDrafts[u.id] ?? ""} onChange={(e) => setUserPasswordDrafts((p) => ({ ...p, [u.id]: e.target.value }))} className={clsx(settingsFieldClass, "pl-11")} placeholder="Leave empty to keep current password" />
                      </div>
                    </Field>
                    <Field label="Role">
                      <select
                        value={u.role}
                        onChange={(e) => updateUserDraft(u.id, { role: e.target.value as UserRole })}
                        className={clsx(settingsFieldClass, "h-10 py-0")}
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {roleLabel(r)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredUsers.length === 0 ? <div className="px-5 py-8 text-sm text-slate-500 md:px-6">No users found.</div> : null}
        </div>
        <FooterBar count={filteredUsers.length} />
      </article>

      <article className={clsx(settingsShellCard, "overflow-hidden")}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1d2f4c] px-5 py-4 md:px-6">
          <h3 className="text-[2.1rem] font-semibold text-text">{filteredGroups.length} groups</h3>
          <div className="flex w-full flex-wrap justify-end gap-2 md:w-auto">
            <label className="relative min-w-[220px] flex-1 md:flex-none">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input value={searchGroupTerm} onChange={(e) => setSearchGroupTerm(e.target.value)} placeholder="Search groups..." className={clsx(settingsFieldClass, "h-11 pl-11")} />
            </label>
            <button type="button" className={clsx(settingsPrimaryButton, "h-11 px-5 text-xs")} onClick={() => setIsCreateGroupModalOpen(true)}>
              <FontAwesomeIcon icon={faPlus} className="mr-2 h-3.5 w-3.5" />
              Create new group
            </button>
          </div>
        </header>
        <div className="grid grid-cols-[minmax(280px,1fr)_120px_180px_220px] border-b border-[#1d2f4c] bg-white/[0.04] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.26em] text-slate-400 md:px-6">
          <span>Group</span>
          <span className="border-l border-[#1d2f4c] text-center">Members</span>
          <span className="border-l border-[#1d2f4c] text-center">Default role</span>
          <span className="border-l border-[#1d2f4c] text-center">Actions</span>
        </div>
        <div className="divide-y divide-[#1d2f4c]">
          {filteredGroups.map((g) => {
            const editing = editingGroupId === g.id;
            const draft = groupDrafts[g.id] ?? { name: g.name, defaultRole: g.defaultRole };
            return (
              <div key={g.id} className="grid grid-cols-[minmax(280px,1fr)_120px_180px_220px] items-center px-5 py-4 md:px-6">
                <div className="flex items-center gap-2.5">
                  <FontAwesomeIcon icon={faUsers} className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-xl font-semibold text-text">{g.name}</span>
                </div>
                <div className="flex items-center justify-center border-l border-[#1d2f4c]">
                  <span className="text-lg text-slate-200">{groupMembers.get(g.id) ?? 0}</span>
                </div>
                <div className="flex items-center justify-center border-l border-[#1d2f4c]">
                  <span className="text-lg text-slate-300">{g.defaultRole}</span>
                </div>
                <div className="flex items-center justify-center gap-2 border-l border-[#1d2f4c]">
                  {editing ? (
                    <button type="button" onClick={() => setEditingGroupId(null)} className={clsx(settingsMutedButton, "h-9 px-3 py-0")}>Cancel</button>
                  ) : (
                    <Fragment>
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm(`Delete group "${g.name}"? This action cannot be undone.`)) return;
                          setCustomGroups((p) => p.filter((x) => x.id !== g.id));
                          if (g.isSystem) setHiddenSystemIds((p) => [...p, g.id]);
                        }}
                        className={clsx(settingsMutedButton, "inline-flex h-9 w-9 items-center justify-center px-0 py-0 leading-none text-slate-400 hover:text-rose-300")}
                        title="Delete group"
                      >
                        <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => { setEditingGroupId(g.id); setGroupDrafts((p) => ({ ...p, [g.id]: { name: g.name, defaultRole: g.defaultRole } })); }} className={clsx(settingsMutedButton, "inline-flex h-9 w-9 items-center justify-center px-0 py-0 leading-none text-slate-400")} title="Edit group">
                        <FontAwesomeIcon icon={faEllipsisVertical} className="h-3.5 w-3.5" />
                      </button>
                    </Fragment>
                  )}
                </div>
                <div
                  className={clsx(
                    "col-span-4 grid overflow-hidden transition-all duration-300 [transition-timing-function:linear]",
                    editing ? "mt-4 max-h-[360px] border-t border-[#1d2f4c] pt-4 opacity-100" : "max-h-0 border-t border-transparent pt-0 opacity-0"
                  )}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Group Name">
                      <input
                        value={draft.name}
                        onChange={(e) =>
                          setGroupDrafts((p) => ({ ...p, [g.id]: { ...draft, name: e.target.value } }))
                        }
                        className={settingsFieldClass}
                      />
                    </Field>
                    <Field label="Default Role">
                      <select
                        value={draft.defaultRole}
                        onChange={(e) =>
                          setGroupDrafts((p) => ({
                            ...p,
                            [g.id]: { ...draft, defaultRole: e.target.value as UserRole }
                          }))
                        }
                        className={settingsFieldClass}
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {roleLabel(r)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="col-span-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingGroupId(null)}
                        className={clsx(settingsMutedButton, "h-9 px-3 py-0")}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!draft.name.trim()) return;
                          setCustomGroups((p) =>
                            p.map((x) =>
                              x.id === g.id
                                ? { ...x, name: draft.name.trim(), defaultRole: draft.defaultRole }
                                : x
                            )
                          );
                          setGroupDrafts((p) => ({
                            ...p,
                            [g.id]: { name: draft.name.trim(), defaultRole: draft.defaultRole }
                          }));
                          setEditingGroupId(null);
                        }}
                        className={clsx(settingsPrimaryButton, "h-9 px-3 py-0 text-[10px]")}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredGroups.length === 0 ? <div className="px-5 py-8 text-sm text-slate-500 md:px-6">No groups found.</div> : null}
        </div>
        <FooterBar count={filteredGroups.length} />
      </article>

      {isCreateUserModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#030814]/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[20px] border border-[#1b2f4d] bg-[#061224] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-4xl font-semibold text-text">Create new user</h3>
              <button type="button" onClick={() => setIsCreateUserModalOpen(false)} className={clsx(settingsMutedButton, "inline-flex h-9 w-9 items-center justify-center px-0 py-0 leading-none")}><FontAwesomeIcon icon={faXmark} className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="First Name"><div className="relative"><FontAwesomeIcon icon={faCircleUser} className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={newUser.firstName} onChange={(e) => setNewUser((p) => ({ ...p, firstName: e.target.value }))} className={clsx(settingsFieldClass, "pl-11")} placeholder="First name" /></div></Field>
              <Field label="Last Name"><div className="relative"><FontAwesomeIcon icon={faCircleUser} className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={newUser.lastName} onChange={(e) => setNewUser((p) => ({ ...p, lastName: e.target.value }))} className={clsx(settingsFieldClass, "pl-11")} placeholder="Last name" /></div></Field>
              <Field label="Username"><div className="relative"><FontAwesomeIcon icon={faCircleUser} className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={newUser.username} onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value }))} className={clsx(settingsFieldClass, "pl-11")} placeholder="Username" /></div></Field>
              <Field label="Email"><input value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} className={settingsFieldClass} placeholder="email@example.com" /></Field>
              <Field label="Existing Group"><select value={groupIdForNewUser} onChange={(e) => setGroupIdForNewUser(e.target.value)} className={settingsFieldClass}>{groups.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.defaultRole})</option>)}</select></Field>
              <Field label="Password"><div className="relative"><FontAwesomeIcon icon={faKey} className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input type="password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} className={clsx(settingsFieldClass, "pl-11")} placeholder="Password" /></div></Field>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => { const group = groups.find((g) => g.id === groupIdForNewUser); onCreateUser({ role: group?.defaultRole ?? newUser.role }); setIsCreateUserModalOpen(false); }} className={clsx(settingsPrimaryButton, "h-11 px-6 text-xs")}>Create</button>
            </div>
          </div>
        </div>
      ) : null}

      {isCreateGroupModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#030814]/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[20px] border border-[#1b2f4d] bg-[#061224] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-4xl font-semibold text-text">Create new group</h3>
              <button type="button" onClick={() => setIsCreateGroupModalOpen(false)} className={clsx(settingsMutedButton, "inline-flex h-9 w-9 items-center justify-center px-0 py-0 leading-none")}><FontAwesomeIcon icon={faXmark} className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-3">
              <Field label="Group Name"><input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className={settingsFieldClass} placeholder="SRE Team" /></Field>
              <Field label="Default Role">
                <select value={newGroupRole} onChange={(e) => setNewGroupRole(e.target.value as UserRole)} className={settingsFieldClass}>
                  {roles.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </select>
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => { const name = newGroupName.trim(); if (!name) return; const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `group_${Math.random().toString(36).slice(2)}`; setCustomGroups((p) => [...p, { id, name, defaultRole: newGroupRole, isSystem: false }]); setNewGroupName(""); setNewGroupRole("viewer"); setIsCreateGroupModalOpen(false); }} className={clsx(settingsPrimaryButton, "h-11 px-6 text-xs")}>Create</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
