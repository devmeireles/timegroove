import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { auth0 } from "@/lib/auth0";
import { syncAuth0UserToDatabase } from "@/services/auth/userSync";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Time Groove — A Music Time Capsule Explorer",
  description:
    "Explore the world's music releases by country, year, genre and style. Powered by Discogs.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth0.getSession();
  if (session?.user) {
    try {
      await syncAuth0UserToDatabase(session.user);
    } catch (error) {
      console.error("Failed to sync authenticated user", error);
    }
  }

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="h-screen w-screen overflow-hidden antialiased">
        {children}
      </body>
    </html>
  );
}
