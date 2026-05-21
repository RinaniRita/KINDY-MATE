import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
});

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kindy-Mate | Chuyển đổi thời gian màn hình",
  description:
    "Ứng dụng giúp phụ huynh chuyển thời gian màn hình thụ động thành học tập, đọc, vận động và giải trí lành mạnh có giới hạn.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${nunito.variable} ${baloo.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
