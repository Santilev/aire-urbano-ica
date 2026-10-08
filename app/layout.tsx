import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aire Urbano · Simulación del ICA",
  description: "Simulador interactivo de la calidad del aire en cuatro zonas urbanas durante 24 horas.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
