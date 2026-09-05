import { Inter, Oswald } from "next/font/google";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "@/styles/globals.css";

// Self-hosted via Next.js at build time — no runtime CDN request, no CORS/font-block risk.
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

// Display face — bold condensed, used for hero/section headlines on the
// public site only (automotive-poster feel for the fleet page).
const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata = {
  title: "Demo Rental Preview — Scooter Rental Bali",
  description: "Official scooter & motorbike rental with admin panel — Demo Rental Preview",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${inter.variable} ${oswald.variable}`}>
      <body>{children}</body>
    </html>
  );
}
