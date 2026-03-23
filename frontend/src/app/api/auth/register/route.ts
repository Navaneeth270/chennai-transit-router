import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  hashPassword,
  createAccessToken,
  createRefreshToken,
  getUsersDb,
  type StoredUser,
} from "@/lib/auth";

interface RegisterBody {
  email: string;
  password: string;
  display_name: string;
}

export async function POST(request: Request) {
  const body: RegisterBody = await request.json();
  const { email, password, display_name } = body;

  const usersDb = getUsersDb();
  if (usersDb.has(email)) {
    return NextResponse.json(
      { detail: "Email already registered" },
      { status: 409 },
    );
  }

  const userId = uuidv4();
  const now = new Date().toISOString();

  const user: StoredUser = {
    id: userId,
    email,
    password_hash: hashPassword(password),
    display_name,
    avatar_url: null,
    is_active: true,
    created_at: now,
  };

  usersDb.set(email, user);

  return NextResponse.json(
    {
      id: userId,
      email,
      display_name,
      avatar_url: null,
      is_active: true,
      created_at: now,
    },
    { status: 201 },
  );
}
