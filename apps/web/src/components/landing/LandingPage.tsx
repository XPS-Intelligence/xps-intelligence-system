import { LandingNav } from "./LandingNav";
import { HeroSection } from "./HeroSection";
import { StatsBar } from "./StatsBar";
import { FeaturesSection } from "./FeaturesSection";
import { ServicesSection } from "./ServicesSection";
import { TestimonialsSection } from "./TestimonialsSection";
import { CTASection } from "./CTASection";
import { FooterSection } from "./FooterSection";

export const LandingPage = () => (
  <div className="min-h-screen bg-background">
    <LandingNav />
    <HeroSection />
    <StatsBar />
    <FeaturesSection />
    <ServicesSection />
    <TestimonialsSection />
    <CTASection />
    <FooterSection />
  </div>
);
