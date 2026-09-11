export function SignOutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button
        type="submit"
        className="rounded border border-neutral-400 px-3 py-1.5 text-sm hover:bg-neutral-100"
      >
        Sign out
      </button>
    </form>
  );
}
