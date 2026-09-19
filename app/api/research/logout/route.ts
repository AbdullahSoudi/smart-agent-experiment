import { NextResponse } from "next/server";
import { createResearcherLogoutCookieValue } from "@/lib/server/research-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", createResearcherLogoutCookieValue());
  return response;
}
