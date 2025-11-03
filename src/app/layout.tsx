import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Internet Mood - How is the world feeling today?",
  description: "Share your mood and discover how people are feeling around the world. Interactive global emotion map in real-time.",
  keywords: ["mood tracker", "emotions", "world map", "global sentiment", "how are you feeling"],
  authors: [{ name: "Internet Mood" }],
  openGraph: {
    title: "Internet Mood - Global Emotion Map",
    description: "Discover how the world is feeling today. Share your mood and explore the interactive global emotion map.",
    url: "https://internet-mood.vercel.app",
    siteName: "Internet Mood",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Internet Mood - Global Emotion Map",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Internet Mood - How is the world feeling today?",
    description: "Share your mood and discover the world's emotions in real-time",
    images: ["/og-image.png"],
    creator: "@internetmood",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code', // Sostituire dopo registrazione Google Search Console
  },
  alternates: {
    canonical: 'https://internet-mood.vercel.app',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="canonical" href="https://internet-mood.vercel.app" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
