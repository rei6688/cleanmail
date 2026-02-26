import { signIn } from "@/lib/auth";
import { Mail } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white">
            <Mail className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CleanMail</h1>
          <p className="text-center text-sm text-gray-500">
            Organize your Outlook inbox with smart rules
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#0078d4] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#106ebe] focus:outline-none focus:ring-2 focus:ring-[#0078d4] focus:ring-offset-2"
          >
            <svg viewBox="0 0 23 23" className="h-5 w-5" fill="none">
              <path fill="#f3f3f3" d="M0 0h23v23H0z" />
              <path fill="#f35325" d="M1 1h10v10H1z" />
              <path fill="#81bc06" d="M12 1h10v10H12z" />
              <path fill="#05a6f0" d="M1 12h10v10H1z" />
              <path fill="#ffba08" d="M12 12h10v10H12z" />
            </svg>
            Sign in with Microsoft
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          By signing in, you agree to allow CleanMail to read and organize your
          Outlook email on your behalf.
        </p>
      </div>
    </div>
  );
}
