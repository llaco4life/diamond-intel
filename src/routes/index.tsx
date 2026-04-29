import { createFileRoute } from "@tanstack/react-router";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { Pillars } from "@/components/landing/Pillars";
import { WhyCoachesSwitch } from "@/components/landing/WhyCoachesSwitch";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FeatureRows } from "@/components/landing/FeatureRows";
import { Audience } from "@/components/landing/Audience";
import { FAQ } from "@/components/landing/FAQ";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Diamond Intel — Smarter softball scouting & player development",
      },
      {
        name: "description",
        content:
          "Scout opponents inning by inning, track live pitch sequences, and develop players with one platform built for competitive travel ball.",
      },
      {
        property: "og:title",
        content: "Diamond Intel — Your dugout should be smarter than the other side",
      },
      {
        property: "og:description",
        content:
          "Scout opponents inning by inning, track live pitch sequences, and develop players with one platform built for competitive travel ball.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <Hero />
        <WhyCoachesSwitch />
        <Pillars />
        <HowItWorks />
        <FeatureRows />
        <Audience />
        <FAQ />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
