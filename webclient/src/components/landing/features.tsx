import { FEATURES } from "./content";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-6 py-28">
      <Reveal>
        <SectionHeading eyebrow="Features">
          Built for how ideas <span className="text-gold">actually</span> move
        </SectionHeading>
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, body }, i) => (
          <Reveal key={title} delay={i * 90}>
            <article className="glass group h-full rounded-[24px] p-7 transition-colors duration-500 ease-premium hover:border-white/25">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/10 text-gold transition-transform duration-500 ease-premium group-hover:scale-110">
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">{body}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
