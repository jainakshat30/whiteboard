import { Kalam } from "next/font/google";

/**
 * Single Point of Truth for Global Font Configuration.
 * To change the font site-wide (UI + Canvas), change this font import/definition.
 */
export const primaryFont = Kalam({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-app",
  display: "swap",
});

/**
 * Canvas 2D context font family fallback chain.
 */
export const CANVAS_FONT_FAMILY = "var(--font-app), 'Kalam', 'Caveat', 'Comic Sans MS', cursive, sans-serif";
