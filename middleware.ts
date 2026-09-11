import { NextRequest, NextResponse } from "next/server";

// Forwards the requested pathname to the /climbing/edit layout so it can
// send signed-out visitors back to the exact page they asked for after
// GitHub sign-in.
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("x-pathname", request.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: ["/climbing/edit/:path*"],
};
