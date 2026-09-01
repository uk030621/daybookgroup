import { redirect } from "next/navigation";
import { auth } from "../../lib/auth";
import Navbar from "../../components/Navbar";
import AdminDashboard from "../../components/AdminDashboard";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }
  if (!session.user.isPlatformAdmin) {
    redirect("/");
  }

  return (
    <div className="min-h-screen paper-texture">
      <Navbar user={session.user} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <AdminDashboard />
      </main>
    </div>
  );
}
