import { Inter, Fraunces } from "next/font/google";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "@/styles/globals.css";

// Self-hosted via Next.js at build time — no runtime CDN request, no CORS/font-block risk.
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

// Display face — used sparingly for hero/section headlines on the public site only.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const metadata = {
  title: "Boss Rent Pererenan — Scooter Rental Bali",
  description: "Penyewaan sepeda motor matic resmi & admin panel Boss Rent Pererenan",
  icons: {
    icon: [
      { url: '/images/logoCompany.png', type: 'image/png' },
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    shortcut: '/images/logoCompany.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${inter.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
