import type { SignIn } from "@clerk/nextjs";
import type { ComponentProps } from "react";

type AuthAppearance = NonNullable<ComponentProps<typeof SignIn>["appearance"]>;

const compactControl = { minHeight: "2.25rem", paddingBlock: "0.375rem" };

export const compactControlAppearance = {
  formFieldInput: compactControl,
  formButtonPrimary: compactControl,
  socialButtonsBlockButton: compactControl,
} satisfies NonNullable<AuthAppearance["elements"]>;

export const authAppearance = {
  options: {
    socialButtonsPlacement: "bottom",
    socialButtonsVariant: "blockButton",
  },
  variables: {
    colorBackground: "var(--background)",
    colorMutedForeground: "var(--muted)",
    borderRadius: "0.375rem",
  },
  elements: {
    rootBox: { width: "100%" },
    cardBox: {
      width: "100%",
      boxShadow: "none",
      border: "none",
      borderRadius: 0,
      overflow: "visible",
    },
    card: {
      padding: 0,
      gap: "2rem",
      background: "transparent",
      boxShadow: "none",
      border: "none",
      borderRadius: 0,
    },
    header: { alignItems: "flex-start", textAlign: "left" },
    headerTitle: {
      fontSize: "1.875rem",
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: "-0.025em",
    },
    headerSubtitle: { fontSize: "0.875rem", lineHeight: 1.7 },
    formFieldLabel: { fontSize: "0.875rem", fontWeight: 500 },
    formFieldInput: {
      ...compactControl,
      background: "var(--card)",
      color: "var(--foreground)",
      borderColor: "var(--line)",
      boxShadow: "none",
    },
    formButtonPrimary: {
      ...compactControl,
      background: "var(--accent)",
      color: "var(--primary-foreground)",
      boxShadow: "none",
      fontSize: "0.875rem",
      fontWeight: 600,
      "&:hover": { background: "var(--accent-hover)" },
    },
    socialButtonsBlockButton: {
      ...compactControl,
      background: "var(--card)",
      borderColor: "var(--line)",
      boxShadow: "none",
      "&:hover": { background: "var(--surface)" },
    },
    footer: {
      background: "transparent",
      border: "none",
    },
    footerAction: { padding: "1.5rem 0" },
  },
} satisfies AuthAppearance;
