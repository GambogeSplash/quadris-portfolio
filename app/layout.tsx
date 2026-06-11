import type { Metadata } from "next";
import "./signature.css";

export const metadata: Metadata = {
  title: "Quadri Agboulaje, Product Designer",
  description: "Portfolio of Quadri Agboulaje, product designer.",
  openGraph: {
    type: "website",
    title: "Quadri Agboulaje, Product Designer",
    description: "Portfolio of Quadri Agboulaje, product designer.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quadri Agboulaje, Product Designer",
    description: "Portfolio of Quadri Agboulaje, product designer.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="min-h-svh">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <link
          rel="preload"
          href="/assets/ABCCameraPlainVariable-DEtYw8jE.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/assets/ABCCameraVariable-BxXh_2nS.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="icon"
          type="image/png"
          href="/favicon-light.png"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="icon"
          type="image/png"
          href="/favicon-dark.png"
          media="(prefers-color-scheme: dark)"
        />
        <link rel="stylesheet" href="/assets/styles-CVflq05Y.css" />
      </head>
      <body className="min-h-svh w-full antialiased cursor-default bg-white text-black font-sans text-base/5 relative">
        {children}
      </body>
    </html>
  );
}
