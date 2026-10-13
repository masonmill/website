export function SignOutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button
        type="submit"
        className="h-8 cursor-pointer rounded-full border border-[#e5e5e5] bg-white px-3 text-[13px] font-medium hover:border-[#a3a3a3]"
      >
        Sign out
      </button>
    </form>
  );
}
