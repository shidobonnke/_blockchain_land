import { AppShell } from "../components/app-shell";
import { AuthProvider } from "../components/auth-provider";
import "./globals.css";

export const metadata = {
  title: "Anagu Land Registry",
  description: "Secure and inclusive digital land administration"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
