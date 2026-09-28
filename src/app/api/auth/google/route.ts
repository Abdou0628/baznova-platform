import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") || `${baseUrl}/`;

  const signInUrl = new URL(`${baseUrl}/api/auth/signin/google`, request.url);
  signInUrl.searchParams.set("callbackUrl", callbackUrl);

  return NextResponse.redirect(signInUrl);
}
