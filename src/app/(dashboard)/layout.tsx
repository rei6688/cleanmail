import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/lib/auth";
import {
  LayoutDashboard,
  ListFilter,
  Search,
  ScrollText,
  LogOut,
  Mail,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/rules", label: "Rules", icon: ListFilter },
  { href: "/scan", label: "Scan", icon: Search },
  { href: "/logs", label: "Logs", icon: ScrollText },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-white shadow-sm">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Mail className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-bold text-gray-900">CleanMail</span>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-blue-50 hover:text-blue-700"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t p-4">
          <div className="mb-3 flex items-center gap-3 px-1">
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name ?? "User"}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                {(session.user.name ?? "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {session.user.name}
              </p>
              <p className="truncate text-xs text-gray-500">
                {session.user.email}
              </p>
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
