import { cookies } from "next/headers";

import { getUserBySession } from "./db";

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("pulze_session")?.value;
  return token ?? null;
}

export async function getSessionUser() {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }
  return getUserBySession(token);
}
