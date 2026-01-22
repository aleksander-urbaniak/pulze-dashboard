import type { User } from "../../../lib/types";

type ProfileDraft = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  avatarUrl: string;
  password: string;
};

type NewUserDraft = {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "viewer" | "admin";
};

type UsersSectionProps = {
  isAdmin: boolean;
  profileDraft: ProfileDraft;
  setProfileDraft: React.Dispatch<React.SetStateAction<ProfileDraft>>;
  profileStatus: string | null;
  onSaveProfile: () => void;
  newUser: NewUserDraft;
  setNewUser: React.Dispatch<React.SetStateAction<NewUserDraft>>;
  onCreateUser: () => void;
  userStatus: string | null;
  users: User[];
  editingUserId: string | null;
  setEditingUserId: React.Dispatch<React.SetStateAction<string | null>>;
  userUpdateStatus: string | null;
  updateUserDraft: (id: string, updates: Partial<User>) => void;
  userPasswordDrafts: Record<string, string>;
  setUserPasswordDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSaveUserDetails: (entry: User) => void;
  onResetUser: (id: string) => void;
};

export default function UsersSection({
  isAdmin,
  profileDraft,
  setProfileDraft,
  profileStatus,
  onSaveProfile,
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
  onResetUser
}: UsersSectionProps) {
  return (
    <section className="mt-8 space-y-6">
      <div className="rounded-3xl border border-border bg-surface/90 p-4 shadow-card backdrop-blur sm:p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Profile</p>
        <h2 className="text-2xl font-semibold">Account Settings</h2>
        {profileStatus ? <p className="mt-3 text-sm text-muted">{profileStatus}</p> : null}
        <div className="mt-4 space-y-3">
          <input
            value={profileDraft.firstName}
            onChange={(event) => setProfileDraft({ ...profileDraft, firstName: event.target.value })}
            placeholder="First name"
            className="w-full rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
          />
          <input
            value={profileDraft.lastName}
            onChange={(event) => setProfileDraft({ ...profileDraft, lastName: event.target.value })}
            placeholder="Last name"
            className="w-full rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
          />
          <input
            value={profileDraft.username}
            onChange={(event) => setProfileDraft({ ...profileDraft, username: event.target.value })}
            placeholder="Username"
            className="w-full rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
          />
          <input
            value={profileDraft.email}
            onChange={(event) => setProfileDraft({ ...profileDraft, email: event.target.value })}
            placeholder="Email"
            className="w-full rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
          />
          <input
            value={profileDraft.avatarUrl}
            onChange={(event) => setProfileDraft({ ...profileDraft, avatarUrl: event.target.value })}
            placeholder="Avatar URL"
            className="w-full rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
          />
          <input
            type="password"
            value={profileDraft.password}
            onChange={(event) => setProfileDraft({ ...profileDraft, password: event.target.value })}
            placeholder="New password"
            className="w-full rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
          />
          <button
            type="button"
            onClick={onSaveProfile}
            className="w-full rounded-xl bg-accent py-2 text-sm font-semibold text-white"
          >
            Update Profile
          </button>
        </div>
      </div>

      {!isAdmin ? (
        <div className="rounded-3xl border border-border bg-surface/90 p-8 text-sm text-muted shadow-card">
          Only administrators can manage users.
        </div>
      ) : (
        <>
          <div className="rounded-3xl border border-border bg-surface/90 p-4 shadow-card backdrop-blur sm:p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Users</p>
            <h2 className="text-2xl font-semibold">Manage Accounts</h2>
            {userStatus ? <p className="mt-3 text-sm text-muted">{userStatus}</p> : null}
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <input
                value={newUser.firstName}
                onChange={(event) => setNewUser({ ...newUser, firstName: event.target.value })}
                placeholder="First name"
                className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
              />
              <input
                value={newUser.lastName}
                onChange={(event) => setNewUser({ ...newUser, lastName: event.target.value })}
                placeholder="Last name"
                className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
              />
              <input
                value={newUser.username}
                onChange={(event) => setNewUser({ ...newUser, username: event.target.value })}
                placeholder="Username"
                className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
              />
              <input
                value={newUser.email}
                onChange={(event) => setNewUser({ ...newUser, email: event.target.value })}
                placeholder="Email"
                className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
              />
              <input
                type="password"
                value={newUser.password}
                onChange={(event) => setNewUser({ ...newUser, password: event.target.value })}
                placeholder="Password"
                className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
              />
              <select
                value={newUser.role}
                onChange={(event) =>
                  setNewUser({ ...newUser, role: event.target.value as "viewer" | "admin" })
                }
                className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
              >
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="button"
              onClick={onCreateUser}
              className="mt-4 rounded-full bg-accent px-4 py-2 text-xs uppercase tracking-[0.2em] text-white"
            >
              Create User
            </button>
          </div>

          <div className="rounded-3xl border border-border bg-surface/90 p-4 shadow-card backdrop-blur sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Existing Users</h3>
              {userUpdateStatus ? <p className="text-xs text-muted">{userUpdateStatus}</p> : null}
            </div>
            <div className="mt-4 space-y-4">
              {users.map((entry) => {
                const isEditing = editingUserId === entry.id;
                return (
                  <div key={entry.id} className="rounded-2xl border border-border bg-base/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {entry.firstName} {entry.lastName}
                        </p>
                        <p className="text-xs text-muted">
                          {entry.username} - {entry.email}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border bg-base/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted">
                          {entry.role}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingUserId((prev) => (prev === entry.id ? null : entry.id))
                          }
                          className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                        >
                          {isEditing ? "Close" : "Edit"}
                        </button>
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="mt-4 space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <input
                            value={entry.firstName}
                            onChange={(event) =>
                              updateUserDraft(entry.id, { firstName: event.target.value })
                            }
                            placeholder="First name"
                            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                          />
                          <input
                            value={entry.lastName}
                            onChange={(event) =>
                              updateUserDraft(entry.id, { lastName: event.target.value })
                            }
                            placeholder="Last name"
                            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                          />
                          <input
                            value={entry.username}
                            onChange={(event) =>
                              updateUserDraft(entry.id, { username: event.target.value })
                            }
                            placeholder="Username"
                            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                          />
                          <input
                            value={entry.email}
                            onChange={(event) =>
                              updateUserDraft(entry.id, { email: event.target.value })
                            }
                            placeholder="Email"
                            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                          />
                          <input
                            value={entry.avatarUrl ?? ""}
                            onChange={(event) =>
                              updateUserDraft(entry.id, { avatarUrl: event.target.value })
                            }
                            placeholder="Avatar URL"
                            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                          />
                          <input
                            type="password"
                            value={userPasswordDrafts[entry.id] ?? ""}
                            onChange={(event) =>
                              setUserPasswordDrafts((prev) => ({
                                ...prev,
                                [entry.id]: event.target.value
                              }))
                            }
                            placeholder="New password (optional)"
                            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                          />
                          <select
                            value={entry.role}
                            onChange={(event) =>
                              updateUserDraft(entry.id, {
                                role: event.target.value as "viewer" | "admin"
                              })
                            }
                            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSaveUserDetails(entry)}
                            className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.2em]"
                          >
                            Save changes
                          </button>
                          <button
                            type="button"
                            onClick={() => onResetUser(entry.id)}
                            className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
