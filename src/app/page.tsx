"use client";

import { AppProviders } from "@/components/providers/AppProviders";
import { HomeShowcase } from "@/components/showcase/HomeShowcase";
import { useHomeShowcaseState } from "@/features/home/useHomeShowcaseState";

export default function HomePage() {
  const state = useHomeShowcaseState();

  return (
    <AppProviders>
      <HomeShowcase state={state} />
    </AppProviders>
  );
}
