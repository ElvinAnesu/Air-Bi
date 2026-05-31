import { AppShell } from "@/components/layout/app-shell"
import { ActiveConnectionProvider } from "@/lib/context/active-connection"
import { UIProvider } from "@/lib/context/ui-context"
import { AuthProvider } from "@/lib/context/auth-context"

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UIProvider>
        <ActiveConnectionProvider>
          <AppShell>{children}</AppShell>
        </ActiveConnectionProvider>
      </UIProvider>
    </AuthProvider>
  )
}
