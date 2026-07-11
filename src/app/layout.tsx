import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Locks Studio — Gestion de rendez-vous",
  description:
    "Application frontend, backend et PostgreSQL pour gérer les rendez-vous d’une tresseuse de locks.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-[#fbf7f1] text-stone-950 antialiased">{children}</body>
    </html>
  );
}
