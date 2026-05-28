import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { GitFork } from "lucide-react";

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
        <footer className="border-t border-white/8 py-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
            <p className="text-xs text-slate-500">Built by Ritu George</p>
            <a
              href="https://github.com/rituann/marketmind"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
            >
              <GitFork className="h-3.5 w-3.5" />
              rituann/marketmind
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
