import { AuthForm } from "@/components/auth/AuthForm";
import { AppShell } from "@/components/common/AppShell";
import { publicRoutes } from "@/lib/routes";

export default function RegisterPage() {
  return (
    <AppShell nav={publicRoutes} subtitle="Bắt đầu thiết lập phụ huynh" title="Kindy-Mate">
      <div className="mx-auto max-w-xl">
        <AuthForm mode="register" />
      </div>
    </AppShell>
  );
}
