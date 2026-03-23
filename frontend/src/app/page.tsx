"use client";

import dynamic from "next/dynamic";

const TransitApp = dynamic(() => import("@/components/TransitApp"), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-screen flex items-center justify-center bg-bg-primary">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
        <p className="text-text-secondary text-sm tracking-wide">
          Loading transit map...
        </p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <TransitApp />;
}
