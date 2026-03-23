import { NextResponse } from "next/server";
import { getCurrentUser, getUsersDb } from "@/lib/auth";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const currentUser = await getCurrentUser(authHeader);

  if (!currentUser) {
    return NextResponse.json(
      { detail: "Invalid or expired token" },
      { status: 401 },
    );
  }

  const usersDb = getUsersDb();
  let found = null;
  for (const stored of usersDb.values()) {
    if (stored.id === currentUser.id) {
      found = stored;
      break;
    }
  }

  if (!found) {
    return NextResponse.json(
      { detail: "User not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    id: found.id,
    email: found.email,
    display_name: found.display_name,
    avatar_url: found.avatar_url,
    is_active: found.is_active,
    created_at: found.created_at,
  });
}
