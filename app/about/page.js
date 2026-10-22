import Link from "next/link";
import Image from "next/image";
import Nav from "../components/Nav";
import Reveal from "../components/Reveal";
import CrestRC from "../components/CrestRC";
import AnnouncementBanner from "../components/AnnouncementBanner";
import { getAboutPublic, hasPhoto } from "@/lib/aboutData";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "About — Ralf's Chops",
  description: "Meet Ralf, see how house-call haircuts work, and read the latest news and FAQs.",
};

function prettyDate(s) {
  if (!s) return "";
  return new Date(s + "T12:00:00").toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

function Eyebrow({ children }) {
  return <p className="font-inter text-xs tracking-[0.3em] text-gold-400 uppercase mb-3">{children}</p>;
}

export default async function AboutPage() {
  let data = { about: null, steps: [], faqs: [], announcements: [] };
  let photo = null;
  try {
    [data, photo] = await Promise.all([getAboutPublic(), hasPhoto()]);
  } catch (err) {
    console.error("About page failed to load content:", err);
  }
  const { about, steps, faqs, announcements } = data;
  const heading = about?.heading || "About Ralf";
  const intro = about?.intro || "";

  return (
    <>
      <div className="grain-overlay" />
      <Nav variant="customer" />
      <AnnouncementBanner />

      <main className="bg-near-black text-paper relative isolate overflow-hidden">
        {/* ---------- HERO ---------- */}
        <section className="relative overflow-hidden px-6 pt-16 md:pt-24 pb-14 md:pb-20 text-center">
          <div
            className="absolute inset-0 -z-30 bg-cover bg-center"
            style={{ backgroundImage: "url('/images/hero.jpg')" }}
          />
          <div className="absolute inset-0 -z-20 bg-gradient-to-b from-near-black/70 via-near-black/85 to-near-black" />
          <Reveal className="flex justify-center mb-5">
            <CrestRC className="w-14 h-14 text-gold-500" />
          </Reveal>
          <Reveal delay={80}>
            <Eyebrow>Ralf&rsquo;s Chops</Eyebrow>
            <h1 className="font-fraunces italic font-medium text-5xl md:text-7xl leading-[1.02] [text-shadow:0_2px_40px_rgba(0,0,0,0.6)]">
              {heading}
            </h1>
          </Reveal>
        </section>

        <div className="divider-fade" />

        {/* ---------- NEWS ---------- */}
        {announcements.length > 0 && (
          <>
            <section id="news" className="max-w-3xl mx-auto px-6 md:px-10 py-16 md:py-20 scroll-mt-20">
              <Reveal className="text-center mb-10">
                <Eyebrow>News &amp; Updates</Eyebrow>
                <h2 className="font-fraunces italic text-3xl md:text-4xl">What&rsquo;s new</h2>
              </Reveal>
              <div className="space-y-4">
                {announcements.map((a, i) => (
                  <Reveal key={a.id} delay={i * 60}>
                    <article className="border border-hairline rounded-lg px-6 py-5 bg-charcoal/60">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                        {a.pinned && (
                          <span className="font-inter text-[10px] tracking-[0.2em] uppercase text-gold-400 border border-gold-500/40 rounded-full px-2 py-0.5">
                            Pinned
                          </span>
                        )}
                        <time className="font-inter text-xs text-paper/40">{prettyDate(a.postedOn)}</time>
                      </div>
                      <h3 className="font-fraunces text-xl mb-2">{a.title}</h3>
                      {a.body && <p className="font-inter text-sm text-paper/65 leading-relaxed whitespace-pre-line">{a.body}</p>}
                    </article>
                  </Reveal>
                ))}
              </div>
            </section>
            <div className="divider-fade" />
          </>
        )}

        {/* ---------- ABOUT RALF ---------- */}
        {intro && (
          <section className="max-w-4xl mx-auto px-6 md:px-10 py-16 md:py-24">
            <div className={photo ? "grid md:grid-cols-5 gap-10 items-center" : "max-w-2xl mx-auto text-center"}>
              {photo && (
                <Reveal className="md:col-span-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/about/photo?v=${photo.version}`}
                    alt="Ralf"
                    className="w-full max-w-xs mx-auto aspect-[4/5] object-cover rounded-lg border border-hairline shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                  />
                </Reveal>
              )}
              <Reveal delay={80} className={photo ? "md:col-span-3" : ""}>
                <Eyebrow>The Barber</Eyebrow>
                <p className="font-fraunces text-lg md:text-xl text-paper/80 leading-relaxed whitespace-pre-line">{intro}</p>
              </Reveal>
            </div>
          </section>
        )}

        {/* ---------- HOW IT WORKS ---------- */}
        {steps.length > 0 && (
          <>
            <Reveal
              className="h-24 md:h-32 bg-cover bg-center"
              style={{ backgroundImage: "url('/images/tools-banner.jpg')" }}
            />
            <section className="max-w-3xl mx-auto px-6 md:px-10 py-16 md:py-24">
              <Reveal className="text-center mb-12">
                <Eyebrow>The Process</Eyebrow>
                <h2 className="font-fraunces italic text-3xl md:text-5xl">How it works</h2>
              </Reveal>
              <ol className="space-y-6">
                {steps.map((s, i) => (
                  <Reveal as="li" key={s.id} delay={i * 70} className="flex gap-5">
                    <div className="shrink-0 w-11 h-11 rounded-full border border-gold-500/50 text-gold-400 font-fraunces text-lg flex items-center justify-center">
                      {i + 1}
                    </div>
                    <div className="pt-1">
                      <h3 className="font-fraunces text-xl mb-1">{s.title}</h3>
                      {s.description && (
                        <p className="font-inter text-sm text-paper/60 leading-relaxed whitespace-pre-line">{s.description}</p>
                      )}
                    </div>
                  </Reveal>
                ))}
              </ol>
            </section>
            <div className="divider-fade" />
          </>
        )}

        {/* ---------- FAQ ---------- */}
        {faqs.length > 0 && (
          <>
            <section className="bg-charcoal">
              <div className="max-w-3xl mx-auto px-6 md:px-10 py-16 md:py-24">
                <Reveal className="text-center mb-10">
                  <Eyebrow>Good to Know</Eyebrow>
                  <h2 className="font-fraunces italic text-3xl md:text-5xl">Questions, answered</h2>
                </Reveal>
                <div className="divide-y divide-hairline border-y border-hairline">
                  {faqs.map((f) => (
                    <details key={f.id} className="group py-1">
                      <summary className="flex items-center justify-between gap-4 cursor-pointer list-none py-4 font-fraunces text-lg [&::-webkit-details-marker]:hidden">
                        <span>{f.question}</span>
                        <span aria-hidden className="shrink-0 text-gold-400 text-2xl leading-none transition-transform group-open:rotate-45">
                          +
                        </span>
                      </summary>
                      <p className="font-inter text-sm text-paper/60 leading-relaxed whitespace-pre-line pb-5 pr-8">{f.answer}</p>
                    </details>
                  ))}
                </div>
              </div>
            </section>
            <div className="divider-fade" />
          </>
        )}

        {/* ---------- CTA ---------- */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 -z-20 bg-cover"
            style={{ backgroundImage: "url('/images/testimonial.jpg')", backgroundPosition: "center 30%" }}
          />
          <div className="absolute inset-0 -z-10 bg-near-black/80" />
          <div className="max-w-2xl mx-auto px-6 py-20 md:py-28 text-center">
            <Reveal>
              <h2 className="font-fraunces italic text-3xl md:text-5xl mb-6">Ready for your chair?</h2>
              <Link
                href="/book"
                className="inline-block bg-gold-500 hover:bg-gold-600 text-near-black font-inter font-semibold text-sm tracking-wide px-8 py-4 rounded-sm transition shadow-[0_8px_30px_rgba(207,155,66,0.25)] hover:shadow-[0_8px_36px_rgba(207,155,66,0.4)] hover:-translate-y-0.5"
              >
                Book Your Visit
              </Link>
            </Reveal>
          </div>
        </section>

        <div className="divider-fade" />

        {/* ---------- FOOTER ---------- */}
        <footer className="max-w-5xl mx-auto px-6 md:px-10 py-12 flex flex-col items-center text-center gap-4">
          <CrestRC className="w-12 h-12 text-gold-500" />
          <Image src="/images/ralfs-chops-wordmark.svg" alt="Ralf's Chops" width={411} height={33} className="h-auto w-[200px]" />
          <div className="flex gap-6 font-inter text-xs tracking-widest uppercase text-paper/50">
            <Link href="/" className="hover:text-gold-400">Home</Link>
            <Link href="/book" className="hover:text-gold-400">Book</Link>
            <Link href="/my-bookings" className="hover:text-gold-400">My Bookings</Link>
          </div>
          <p className="font-inter text-[11px] text-paper/25 mt-2">© {new Date().getFullYear()} Ralf&rsquo;s Chops</p>
        </footer>
      </main>
    </>
  );
}
