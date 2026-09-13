import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { authorize } from "@/lib/auth/authorize";
import { getOwnerGithubId, getSessionSecret } from "@/lib/auth/config";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { SignOutButton } from "./SignOutButton";

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

  if (!result.ok) {
    if (result.status === 401) {
      const headerList = await headers();
      const pathname = headerList.get("x-pathname") ?? "/climbing/edit";
      redirect(`/api/auth/login?redirect=${encodeURIComponent(pathname)}`);
    }

    // A valid session for a signed-in, non-owner GitHub account (403).
    // Deny here, at the layout, so every nested editor route (the list,
    // climb detail, etc.) is gated the same way instead of relying on each
    // page to repeat this check and risk missing one.
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-neutral-500">
          This GitHub account does not have access to the climbing log
          editor.
        </p>
        <SignOutButton />
      </main>
    );
  }

  return <>{children}</>;
}
