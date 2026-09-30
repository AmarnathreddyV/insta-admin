import { NextResponse } from "next/server";
import { createSession, COOKIE_NAME } from "../../../../../lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const expectedEmail = process.env.ADMIN_EMAIL;
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (!expectedEmail || !expectedPassword) {
      return NextResponse.json(
        { success: false, message: "Admin credentials are not configured." },
        { status: 500 }
      );
    }

    if (email !== expectedEmail || password !== expectedPassword) {
      return NextResponse.json(
        { success: false, message: "Invalid admin credentials." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      email,
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: createSession(email),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request." },
      { status: 400 }
    );
  }
}
