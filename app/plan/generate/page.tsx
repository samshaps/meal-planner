// app/plan/generate/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * This page is no longer used in the main flow.
 * The API call now happens directly from /plan/days.
 * This page redirects to /plan/days if accessed directly.
 */
export default function PlanGeneratePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to days page since generation now happens there
    router.push("/plan/days");
  }, [router]);

  // Show a brief loading message while redirecting
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Redirecting...</h2>
      </div>
    </div>
  );
}

