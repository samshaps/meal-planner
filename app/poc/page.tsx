// app/poc/page.tsx
"use client";

import { useState } from "react";

interface ApiResponse {
  success?: boolean;
  totalRecipes?: number;
  sample?: { uid: string | null; name: string | null; categories: string[] }[];
  error?: string;
}

export default function PaprikaPOCPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);

  async function runTest() {
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch("/api/paprika/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json()) as ApiResponse;
      setResponse(data);
    } catch (e) {
      setResponse({
        error: e instanceof Error ? e.message : "Unknown client error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Paprika API POC</h1>
      <p className="text-sm text-gray-600">
        Enter your Paprika account credentials to test login and recipe sync.
        This will call a Next.js API route, which then talks to Paprika from
        the server.
      </p>

      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Email
          <input
            className="mt-1 block w-full border rounded-md px-3 py-2 text-sm"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>

        <label className="block text-sm font-medium">
          Password
          <input
            className="mt-1 block w-full border rounded-md px-3 py-2 text-sm"
            type="password"
            placeholder="Paprika password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={runTest}
        disabled={loading}
        className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white disabled:opacity-50"
      >
        {loading ? "Testing..." : "Test Paprika Login & Fetch Recipes"}
      </button>

      <div className="mt-4">
        <h2 className="text-sm font-semibold mb-1">Response</h2>
        <pre className="bg-black text-green-200 text-xs p-3 rounded-md overflow-auto min-h-[120px]">
          {response ? JSON.stringify(response, null, 2) : "// No response yet"}
        </pre>
      </div>
    </div>
  );
}

