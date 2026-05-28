import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "MarketMind — AI Fintech Intelligence",
  description:
    "Live market data + regulatory intelligence, powered by LangGraph, MCP, RAG, and Groq.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0f] text-slate-100 antialiased">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
