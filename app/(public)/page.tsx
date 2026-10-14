// path: app/(public)/page.tsx
import { en } from '@/lib/i18n/strings/en';

export default function HomePage() {
  const { landing } = en;
  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 py-24 text-center">
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          {landing.heroTitle}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
          {landing.heroBody}
        </p>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-24 sm:grid-cols-3">
        {landing.pillars.map((p) => (
          <article
            key={p.title}
            className="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm"
          >
            <h2 className="text-lg font-semibold">{p.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{p.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
