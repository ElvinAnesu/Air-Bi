import { AppShell } from "@/components/layout/app-shell"
import { ActiveConnectionProvider } from "@/lib/context/active-connection"
import { ActiveDataSourceProvider } from "@/lib/context/active-data-source"
import { UIProvider } from "@/lib/context/ui-context"
import { AuthProvider } from "@/lib/context/auth-context"

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UIProvider>
        <ActiveConnectionProvider>
          <ActiveDataSourceProvider>
            <AppShell>{children}</AppShell>
          </ActiveDataSourceProvider>
        </ActiveConnectionProvider>
      </UIProvider>
    </AuthProvider>
  )
}
