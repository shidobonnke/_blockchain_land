import Link from "next/link";
import "./globals.css";

export const metadata = { title: "Anagu Land Registry", description: "Secure and inclusive digital land administration" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><div className="shell">
    <aside className="sidebar">
      <div className="brand">ANA<span>GU</span></div>
      <nav className="nav">
        <Link href="/">Overview</Link>
        <Link href="/applications">Applications</Link>
        <Link href="/parcels">Land parcels</Link>
        <Link href="/verify">Verify a title</Link>
      </nav>
    </aside>
    <main className="main">{children}</main>
  </div></body></html>;
}
