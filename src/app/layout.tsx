import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { TRPCReactProvider } from "@/trpc/client";
import { Toaster } from "sonner";
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
  title: "Yugati",
  description: "Automate your manual plugins",
  icons: { icon: '/favicon.svg' },
  verification: {
    google: 'z3iyyL2torlKDge6zjG6izidaDeTY1jUXsJLomLphEA',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = (await cookies()).get("theme")?.value === "light" ? "light" : "dark";

  return (
    <html
      lang="en"
      data-theme={theme}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TRPCReactProvider>{children}</TRPCReactProvider>
        <Toaster
          theme={theme}
          position="bottom-right"
          toastOptions={{
            style: theme === "dark"
              ? { background: "#000", color: "#fff", border: "1px solid rgba(255,255,255,0.08)" }
              : { background: "#fff", color: "#18181b", border: "1px solid #e4e4e7" },
          }}
        />
      </body>
    </html>
  );
}
