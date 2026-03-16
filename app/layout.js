import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata = {
  title: {
    default: "OPENBRIDGE",
    template: "%s | OPENBRIDGE",
  },
  description: "OPENBRIDGE es una consola visual para operar OpenClaw en VPS, gestionar agentes, tareas y configuracion remota desde un solo lugar.",
  icons: {
    icon: "/openbridge.png",
    shortcut: "/openbridge.png",
    apple: "/openbridge.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${GeistSans.variable} ${GeistMono.variable} overflow-y-scroll`}>{children}</body>
    </html>
  );
}
