import { cookies } from "next/headers";

import { getUserBySession } from "./db";

export function getSessionToken(): string | null {
  const token = cookies().get("pulze_session")?.value;
  return token ?? null;
}

export function getSessionUser() {
  const token = getSessionToken();
  if (!token) {
    return null;
  }
  return getUserBySession(token);
}
