import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ReactQueryProvider } from "@/providers/query-provider";
import { AIDevtools } from "@ai-sdk-tools/devtools";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Student OS",
    template: "%s | Student OS",
  },
  description:
    "The all-in-one workspace for students. Track assignments, manage study debt, and visualize your semester progress.",
  openGraph: {
    title: "Student OS - Your Academic Life, Organized",
    description:
      "The all-in-one workspace for students. Track assignments, manage study debt, and visualize your semester progress.",
    url: "https://studentos.vhaan.me", // Assuming a placeholder URL, can be updated later
    siteName: "Student OS",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Student OS - Your Academic Life, Organized",
    description:
      "The all-in-one workspace for students. Track assignments, manage study debt, and visualize your semester progress.",
    creator: "@vihaansharma", // Placeholder
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ReactQueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            {process.env.NODE_ENV === "development" && <AIDevtools />}
            <Toaster />
          </ThemeProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
