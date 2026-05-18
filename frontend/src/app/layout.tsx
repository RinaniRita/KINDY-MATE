import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
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
    <html lang="vi">
      <body className={`${nunito.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
