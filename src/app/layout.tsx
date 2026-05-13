import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CortesFlow",
  description: "App local para gerar cortes verticais a partir de videos longos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
