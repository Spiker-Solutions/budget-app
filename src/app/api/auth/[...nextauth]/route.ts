import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const nextAuthHandler = NextAuth(authOptions);

async function handler(req: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  try {
    return await nextAuthHandler(req, context);
  } catch (error) {
    // Surface the real error so we can debug on Netlify previews (no runtime logs).
    console.error("[NextAuth] Unhandled error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown NextAuth error";
    const stack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      {
        error: "NextAuth handler crashed",
        message,
        stack: process.env.NODE_ENV === "development" ? stack : undefined,
      },
      { status: 500 }
    );
  }
}

export { handler as GET, handler as POST };
