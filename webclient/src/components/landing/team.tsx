import Image from "next/image";
import { Art } from "./art";
import { TEAM } from "./content";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export function Team() {
  return (
    <section id="team" className="mx-auto max-w-5xl scroll-mt-20 px-6 py-28">
      <Reveal>
        <SectionHeading eyebrow="The team">
          People behind the <span className="text-gold">canvas</span>
        </SectionHeading>
      </Reveal>

      <div className="grid gap-6 md:grid-cols-2">
        {TEAM.map((member, i) => (
          <Reveal key={member.name} delay={i * 120}>
            <article className="glass group rounded-[32px] p-3 transition-colors duration-500 ease-premium hover:border-white/25">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] grayscale transition-[filter] duration-700 ease-premium group-hover:grayscale-0">
                {member.image ? (
                  <Image src={member.image} alt={member.name} fill sizes="(min-width: 768px) 480px, 100vw" className="object-cover" />
                ) : (
                  <Art variant="portrait" />
                )}
              </div>
              <div className="px-4 pb-4 pt-6">
                <h3 className="font-display text-4xl text-white">{member.name}</h3>
                <p className="mt-2 text-[10px] font-light uppercase tracking-[0.4em] text-gold">{member.role}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
