import { requireAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar userRole={user.role} userName={user.name} />
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full p-6 max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
