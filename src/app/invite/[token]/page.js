import { redirect } from "next/navigation";
import { auth } from "../../../lib/auth";
import AcceptInvite from "../../../components/AcceptInvite";

export default async function InvitePage({ params }) {
  const { token } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=/invite/${token}`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 paper-texture">
      <AcceptInvite token={token} />
    </main>
  );
}
