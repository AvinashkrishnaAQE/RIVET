export function SectionHeading({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto mb-14 max-w-2xl text-center">
      <p className="text-[11px] uppercase tracking-[0.35em] text-gold">{eyebrow}</p>
      <h2 className="mt-4 font-display text-4xl italic leading-tight text-white md:text-5xl">{children}</h2>
    </div>
  );
}
