import { useSession as useNextAuthSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";

export { useNextAuthSession as useSession };

export async function signIn(
  credentials: { email: string; password: string },
  options?: { redirectTo?: string }
) {
  return nextAuthSignIn("credentials", {
    email: credentials.email,
    password: credentials.password,
    redirectTo: options?.redirectTo ?? "/",
  });
}

export async function signOut(options?: { redirect?: boolean }) {
  return nextAuthSignOut({
    redirect: options?.redirect ?? true,
  });
}