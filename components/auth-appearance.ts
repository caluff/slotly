import type { SignIn } from "@clerk/nextjs";
import type { ComponentProps } from "react";

type AuthAppearance = NonNullable<ComponentProps<typeof SignIn>["appearance"]>;

export const authAppearance = {
  options: {
    socialButtonsPlacement: "bottom",
    socialButtonsVariant: "blockButton",
  },
  variables: {
    colorBackground: "#fcfdfb",
    colorMutedForeground: "#52665b",
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
      minHeight: "2.25rem",
      paddingBlock: "0.375rem",
      background: "#ffffff",
      color: "#183c30",
      borderColor: "#d9e4da",
      boxShadow: "none",
    },
    formButtonPrimary: {
      minHeight: "2.25rem",
      paddingBlock: "0.375rem",
      background: "#176348",
      boxShadow: "none",
      fontSize: "0.875rem",
      fontWeight: 600,
      "&:hover": { background: "#104b36" },
    },
    socialButtonsBlockButton: {
      minHeight: "2.25rem",
      paddingBlock: "0.375rem",
      background: "#ffffff",
      borderColor: "#d9e4da",
      boxShadow: "none",
      "&:hover": { background: "#eaf3e9" },
    },
    footer: {
      background: "transparent",
      border: "none",
    },
    footerAction: { padding: "1.5rem 0" },
  },
} satisfies AuthAppearance;
