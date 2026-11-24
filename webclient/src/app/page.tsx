import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Navbar } from "@/components/landing/navbar";
import { Pricing } from "@/components/landing/pricing";
import { Team } from "@/components/landing/team";

export default function Home() {
  return (
    <div className="bg-dots min-h-svh bg-ink font-ui text-foreground selection:bg-gold/30 transition-colors duration-500">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <Team />
      </main>
      <Footer />
    </div>
  );
}
