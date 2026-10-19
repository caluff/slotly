import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { clerkLocalization } from "@/lib/clerk-localization";
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
  applicationName: "Slotly",
  title: {
    default: "Slotly · Gestiona tus citas de forma sencilla",
    template: "%s · Slotly",
  },
  description: "Gestiona tus citas de forma sencilla",
  appleWebApp: {
    capable: true,
    title: "Slotly",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#176348",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider
          localization={clerkLocalization}
          afterSignOutUrl="/"
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/dashboard"
          appearance={{
            variables: {
              colorPrimary: "#176348",
              colorForeground: "#183c30",
              colorBackground: "#ffffff",
              fontFamily: "var(--font-geist-sans), sans-serif",
              borderRadius: "0.375rem",
            },
            elements: {
              cardBox: { borderRadius: "0.375rem" },
              card: { borderRadius: "0.375rem" },
              modalContent: { borderRadius: "0.375rem" },
            },
            userButton: {
              options: {
                // Preview the production menu without the development banner.
                unsafe_disableDevelopmentModeWarnings: true,
              },
              elements: {
                userButtonTrigger: {
                  minWidth: "2.75rem",
                  minHeight: "2.75rem",
                },
                userButtonPopoverCard: {
                  width: "18rem",
                  maxWidth: "calc(100vw - 2rem)",
                  borderRadius: "0.375rem",
                },
                userButtonPopoverMain: {
                  borderRadius: "0.375rem 0.375rem 0 0",
                },
                userPreview: {
                  padding: "1rem",
                  gap: "0.75rem",
                },
                userPreviewTextContainer: {
                  minWidth: 0,
                },
                userPreviewMainIdentifier: {
                  whiteSpace: "normal",
                  overflowWrap: "anywhere",
                },
                userPreviewSecondaryIdentifier: {
                  whiteSpace: "normal",
                  overflowWrap: "anywhere",
                },
                userButtonPopoverActionButton: {
                  minHeight: "2.75rem",
                  padding: "0.625rem 1rem",
                  gap: "0.75rem",
                  borderRadius: "0.375rem",
                },
                userButtonPopoverActionButtonIconBox: {
                  width: "2.25rem",
                  flexShrink: 0,
                },
                userButtonPopoverFooter: {
                  borderRadius: "0 0 0.375rem 0.375rem",
                },
              },
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
