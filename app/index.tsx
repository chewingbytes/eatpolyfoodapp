import { Redirect } from "expo-router";
import { useAuthStore } from "../store/auth";

export default function Index() {
  const session = useAuthStore((s) => s.session);
  // Always go to tabs; auth is optional (users browse without login, need login for checkout)
  return <Redirect href="/(tabs)" />;
}
