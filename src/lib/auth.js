import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { connectToDatabase } from "./mongodb";
import User from "../models/User";
import { isPlatformAdmin } from "./permissions";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Explicitly map the id to Google's stable "sub" claim. Without this,
      // user.id can come back undefined, and the JWT callback then falls
      // back to a freshly-generated random UUID on every sign-in — meaning
      // every login gets a different session.user.id and any reminders
      // saved under the previous one become invisible.
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    // Sign-in refusals (for example a blocked account) come back to the
    // login page as ?error=… so it can explain what happened.
    error: "/login",
  },
  callbacks: {
    async signIn({ account, profile }) {
      // Upsert a persistent User record every time someone signs in, keyed
      // by the exact same Google sub already used as Reminder.userId and
      // session.user.id elsewhere in the app. This is the foundation groups
      // and roles need — a stable, queryable record that outlives any one
      // session token.
      if (account?.provider === "google" && profile?.sub) {
        try {
          await connectToDatabase();

          // A blocked account can't sign in at all.
          const existing = await User.findById(profile.sub)
            .select("blocked")
            .lean();
          if (existing?.blocked) return false;

          await User.findByIdAndUpdate(
            profile.sub,
            {
              $set: {
                email: profile.email,
                name: profile.name,
                image: profile.picture,
                lastSignInAt: new Date(),
              },
            },
            { upsert: true, new: true },
          );
        } catch (err) {
          // Don't block sign-in over this — worst case the User record is
          // stale until the next successful login attempt.
          console.error("Failed to upsert User on sign-in:", err);
        }
      }
      return true;
    },
    async jwt({ token, account }) {
      // Without a database adapter, Auth.js does not use the provider
      // profile's id for `user.id` — that field is reserved for an
      // adapter-persisted record we don't have. The reliable stable id
      // is on `account`, passed into this callback only on initial sign-in.
      if (account?.providerAccountId) {
        token.id = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? token.sub;
        session.user.isPlatformAdmin = isPlatformAdmin(session.user.email);

        // Sessions are long-lived tokens, so blocking someone has to be
        // checked on every request or they'd stay signed in for weeks. A
        // blocked person gets a session with no user in it, which every
        // page and API route already treats as "not signed in".
        try {
          await connectToDatabase();
          const record = await User.findById(session.user.id)
            .select("blocked")
            .lean();
          if (record?.blocked) return { expires: session.expires };
        } catch (err) {
          // If the check itself fails, don't lock everyone out over it.
          console.error("Couldn't check whether a user is blocked:", err);
        }
      }
      return session;
    },
  },
});
