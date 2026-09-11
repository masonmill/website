import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { authorize } from "@/lib/auth/authorize";
import { getOwnerGithubId, getSessionSecret } from "@/lib/auth/config";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

// This section is a signed-in editor: never statically generate or cache it.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  const result = authorize(sessionValue, {
    sessionSecret: getSessionSecret(),
    ownerGithubId: getOwnerGithubId(),
  });

  if (!result.ok && result.status === 401) {
    const headerList = await headers();
    const pathname = headerList.get("x-pathname") ?? "/climbing/edit";
    redirect(`/api/auth/login?redirect=${encodeURIComponent(pathname)}`);
  }

  return <>{children}</>;
}
