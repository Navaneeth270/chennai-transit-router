import { NextResponse } from "next/server";
import {
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  getUsersDb,
} from "@/lib/auth";

interface LoginBody {
  email: string;
  password: string;
}

export async function POST(request: Request) {
  const body: LoginBody = await request.json();
  const { email, password } = body;

  const usersDb = getUsersDb();
  const user = usersDb.get(email);

  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json(
      { detail: "Invalid email or password" },
      { status: 401 },
    );
  }

  const tokenData = { sub: user.id, email: user.email };
  const accessToken = await createAccessToken(tokenData);
  const refreshToken = await createRefreshToken(tokenData);

  return NextResponse.json({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
}
