export type AuditLogEntry = {
  id: string;
  userId: string | null;
  action: string;
  details: string;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
};

export type TestState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
  sampleLine?: string | null;
};
