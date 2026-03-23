import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chennai Transit Router",
  description:
    "Multi-modal urban transit router with A*, BFS, and DFS pathfinding",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased overflow-hidden">{children}</body>
    </html>
  );
}
