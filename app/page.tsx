import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { LandingBackground } from "@/components/landing/landing-background";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col relative">
      <LandingBackground />
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
      </main>
      <Footer />
    </div>
  );
}
