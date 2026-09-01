import { redirect } from "next/navigation";
import { auth } from "../../lib/auth";
import FamilyDashboard from "../../components/FamilyDashboard";
import Navbar from "../../components/Navbar";

export default async function FamilyPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/family");
  }

  return (
    <div className="min-h-screen paper-texture">
      <Navbar user={session.user} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <FamilyDashboard />
      </main>
    </div>
  );
}
