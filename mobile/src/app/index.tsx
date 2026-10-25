import { Redirect } from "expo-router";

import { useAuth } from "@/lib/auth";

/** Entry gate: signed-in users land on Home, everyone else on sign-in. */
export default function Index() {
  const { session } = useAuth();
  return <Redirect href={session ? "/(tabs)" : "/sign-in"} />;
}
