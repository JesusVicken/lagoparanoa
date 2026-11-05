"use client";

import { useState } from "react";
import ReportScreen from "@/components/ReportScreen";
import VideoPreloader from "@/components/VideoPreloader";

export default function Home() {
  const [showPreloader, setShowPreloader] = useState(true);

  return (
    <>
      {showPreloader && (
        <VideoPreloader onComplete={() => setShowPreloader(false)} />
      )}
      <ReportScreen />
    </>
  );
}
