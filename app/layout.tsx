import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import FloatingBackground from "./FloatingBackground";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nikolaus Nofels — Anmeldung",
  description:
    "Die Nikolaus-Anmeldung für die Gemeinde Nofels. Hier können Sie Ihren Wunschtermin angeben und weitere Informationen zu Ihrer Anmeldung hinterlegen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${geistSans.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <FloatingBackground />
        {children}
      </body>
    </html>
  );
}
