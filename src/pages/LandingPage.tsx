import { Link } from "react-router-dom";
import { useAuthStore } from "@/lib/stores";
import { Button } from "@/components/ui/button";
import {
  Leaf, Droplets, BarChart3, Map, CloudRain, ArrowRight, Sprout, Zap,
} from "lucide-react";
import LandingHero from "@/components/landing/LandingHero";
import LandingStats from "@/components/landing/LandingStats";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingCTA from "@/components/landing/LandingCTA";
import LandingFooter from "@/components/landing/LandingFooter";
import LandingHeader from "@/components/landing/LandingHeader";

export default function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const isAuth = !!user;

  return (
    <div className="min-h-screen bg-background relative noise-overlay">
      <LandingHeader isAuth={isAuth} />
      <LandingHero isAuth={isAuth} />
      <LandingStats />
      <LandingFeatures />
      <LandingCTA isAuth={isAuth} />
      <LandingFooter />
    </div>
  );
}
