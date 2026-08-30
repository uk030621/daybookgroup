import { redirect } from "next/navigation";
import { auth } from "../../lib/auth";
import SignInCard from "../../components/SignInCard";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 paper-texture">
      <SignInCard />
    </main>
  );
}
