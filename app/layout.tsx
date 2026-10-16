
import type { Metadata } from "next";
import AuthenticatedActivityTracker from "@/app/components/AuthenticatedActivityTracker";
import "./globals.css";

export const metadata: Metadata = {
  title: "OdinIQ",
  description: "Commercial Intelligence Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthenticatedActivityTracker />
        {children}
      </body>
    </html>
  );
}
