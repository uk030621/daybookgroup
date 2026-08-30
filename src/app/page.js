import { redirect } from "next/navigation";
import { auth } from "../lib/auth";
import Dashboard from "../components/Dashboard";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <Dashboard user={session.user} />;
}
