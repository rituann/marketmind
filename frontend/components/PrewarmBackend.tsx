"use client";
import { useEffect } from "react";

const BACKEND = "https://marketmind-f8zl.onrender.com";

// Fires a silent health-check on page load to wake Render before the user
// navigates to /demo. Render free tier cold-starts in ~30s; this races
// against the user's homepage attention span.
export default function PrewarmBackend() {
  useEffect(() => {
    fetch(`${BACKEND}/health`).catch(() => {});
  }, []);
  return null;
}
