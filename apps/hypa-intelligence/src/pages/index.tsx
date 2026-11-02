import HeroSection from "@/components/modules/landing/hero-section";
import FeaturesSection from "@/components/modules/landing/features-section";
import StatsSection from "@/components/modules/landing/stats-section";
import StepsSection from "@/components/modules/landing/steps-section";
import QuoteSection from "@/components/modules/landing/quote-section";
import CtaSection from "@/components/modules/landing/cta-section";
import FooterSection from "@/components/modules/landing/footer-section";

const IndexPage = () => (
  <div className="overflow-x-hidden">
    <HeroSection />
    <FeaturesSection />
    <StatsSection />
    <StepsSection />
    <QuoteSection />
    <CtaSection />
    <FooterSection />
  </div>
);

export default IndexPage;
