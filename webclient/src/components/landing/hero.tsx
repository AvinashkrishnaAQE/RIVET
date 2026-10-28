import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NeuralHero } from "./hero-neural";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-36 md:pt-40">
      <div className="mx-auto max-w-5xl text-center">
        <p className="motion-safe:animate-reveal text-[11px] uppercase tracking-[0.35em] text-gold">An AI workspace for creative teams</p>

        <h1
          className="motion-safe:animate-reveal mt-6 font-display text-[clamp(2.5rem,8vw,6rem)] font-normal italic leading-[1.05] tracking-tight text-white"
          style={{ animationDelay: "0.1s" }}
        >
          Intelligence, <span className="text-gold">connected</span> to everything you <span className="text-gold">create</span>
        </h1>

        <p className="motion-safe:animate-reveal mx-auto mt-6 max-w-xl text-base font-light leading-relaxed text-gray-400 md:text-lg" style={{ animationDelay: "0.2s" }}>
          Agents, sources and creative tools share one living canvas, so ideas move from spark to finished work without leaving the room.
        </p>

        <div className="motion-safe:animate-reveal mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: "0.3s" }}>
          <a href="#features" className="rounded-full border border-white/25 px-7 py-3 text-sm font-medium text-white transition-colors duration-300 ease-premium hover:border-gold-hover hover:text-gold-hover">
            See how it works
          </a>
          <Link href="/login" className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition-colors duration-300 ease-premium hover:bg-gold-hover">
            Get Started
            <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-premium group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      <div className="motion-safe:animate-reveal mt-20" style={{ animationDelay: "0.45s" }}>
        <NeuralHero />
      </div>
    </section>
  );
}
