import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/ThemeProvider";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "react-hot-toast";
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Socially",
  description: "A social media platform built with Next.js, Prisma, and Clerk",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <div className="min-h-screen">
              <Navbar />
              <main className="py-8">
                {/*container to center the content*/}
                <div className="max-w-7xl mx-auto px-4">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="hidden lg:block lg:col-span-3"><Sidebar/></div>
                    <div className="lg:col-span-9">{children}</div>
                  </div>
                </div>
              </main> 
            </div> 
      <Toaster />
      </ThemeProvider>
      </body>
    </html>
    </ClerkProvider>
  );
}


// This is the root layout for the Next.js application.
// It sets up the global styles, fonts, and metadata for the application.
// The `ClerkProvider` wraps the application to provide authentication and user management features.
// The `ThemeProvider` is used to manage the theme of the application.
// The `RootLayout` component defines the structure of the application, including the navbar and main content area.
// The `geistSans` and `geistMono` fonts are imported and applied to the application.
// The `metadata` object defines the title and description of the application, which can be used for SEO purposes.
// The `children` prop is used to render the main content of the application, which is passed from the individual pages.
// The layout includes a responsive design with a sidebar for larger screens and a main content area for smaller screens.
