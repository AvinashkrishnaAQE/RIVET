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
                  annual === option.value
                    ? "bg-zinc-950 text-white shadow-sm dark:bg-white dark:text-black"
                    : "text-foreground/70 hover:text-foreground dark:text-white/60 dark:hover:text-white"
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
                  plan.highlighted ? "border-gold/50 shadow-[0_0_100px_rgba(167,139,113,0.2)] md:-my-3 md:py-11" : ""
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold px-4 py-1 text-[9px] font-bold uppercase tracking-[0.25em] text-white dark:text-black shadow-sm">
                    Most Popular
                  </span>
                )}

                <h3 className="font-display text-2xl italic text-foreground">{plan.name}</h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-gray-400">{plan.blurb}</p>

                <div className="my-8 flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-foreground">${price}</span>
                  <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-gray-400">/ month</span>
                </div>

                <ul className="space-y-3 pb-8 text-sm text-zinc-700 dark:text-gray-300">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className="h-4 w-4 shrink-0 text-gold" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-4">
                  <Link
                    href="/register"
                    className={`block w-full rounded-full py-3 text-center text-sm font-semibold transition-colors duration-300 ease-premium ${
                      plan.highlighted
                        ? "bg-zinc-950 text-white shadow-sm hover:bg-gold dark:bg-white dark:text-black dark:hover:bg-gold-hover"
                        : "border border-black/15 text-foreground hover:border-gold hover:text-gold dark:border-white/25 dark:text-white dark:hover:border-gold-hover dark:hover:text-gold-hover"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
