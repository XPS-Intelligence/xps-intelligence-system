import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/index.css";

export const metadata: Metadata = {
  title: "XPS Intelligence",
  description: "AI-powered sales command center for Xtreme Polishing Systems",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
