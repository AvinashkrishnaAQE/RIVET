"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { PLANS } from "./content";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export function Pricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-28">
      <Reveal>
        <SectionHeading eyebrow="Pricing">
          Simple plans, <span className="text-gold">room</span> to grow
        </SectionHeading>

        <div className="mb-14 flex items-center justify-center gap-3">
          <div role="group" aria-label="Billing period" className="glass inline-flex rounded-full p-1">
            {[
              { label: "Monthly", value: false },
              { label: "Annual", value: true },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                aria-pressed={annual === option.value}
                onClick={() => setAnnual(option.value)}
                className={`rounded-full px-5 py-2 text-xs font-semibold transition-colors duration-300 ease-premium ${
                  annual === option.value ? "bg-white text-black" : "text-white/60 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span className="hidden text-[10px] uppercase tracking-[0.25em] text-gold sm:inline">Save ~20%</span>
        </div>
      </Reveal>

      <div className="grid items-stretch gap-6 md:grid-cols-3">
        {PLANS.map((plan, i) => {
          const price = annual ? plan.annual : plan.monthly;
          return (
            <Reveal key={plan.name} delay={i * 100}>
              <article
                className={`glass relative flex h-full flex-col rounded-[32px] p-8 ${
                  plan.highlighted ? "border-gold/40 shadow-[0_0_100px_rgba(167,139,113,0.2)] md:-my-3 md:py-11" : ""
                }`}
                style={plan.highlighted ? { borderColor: "rgba(167,139,113,0.4)" } : undefined}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold px-4 py-1 text-[9px] font-bold uppercase tracking-[0.25em] text-black">
                    Most Popular
                  </span>
                )}

                <h3 className="font-display text-2xl italic text-white">{plan.name}</h3>
                <p className="mt-1 text-sm text-gray-400">{plan.blurb}</p>

                <p className="mt-8 flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-white">${price}</span>
                  <span className="text-sm text-gray-400">/mo</span>
                </p>
                <p className="mt-1 h-4 text-[10px] uppercase tracking-[0.2em] text-gray-500">
                  {price > 0 ? (annual ? "Billed yearly" : "Billed monthly") : "Free forever"}
                </p>

                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-gray-300">
                      <Check className="h-4 w-4 shrink-0 text-gold" strokeWidth={2} />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={`mt-10 block rounded-full py-3 text-center text-sm font-semibold transition-colors duration-300 ease-premium ${
                    plan.highlighted
                      ? "bg-white text-black hover:bg-gold-hover"
                      : "border border-white/25 text-white hover:border-gold-hover hover:text-gold-hover"
                  }`}
                >
                  {plan.cta}
                </Link>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
