import { AuthForm } from "@/components/auth/AuthForm";
import { AppShell } from "@/components/common/AppShell";
import { publicRoutes } from "@/lib/routes";

export default function LoginPage() {
  return (
    <AppShell nav={publicRoutes} subtitle="Đăng nhập tài khoản phụ huynh" title="Kindy-Mate">
      <div className="mx-auto max-w-xl">
        <AuthForm mode="login" />
      </div>
    </AppShell>
  );
}
