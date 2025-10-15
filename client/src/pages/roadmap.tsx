import { motion } from "framer-motion";
import { ArrowRight, Flame, Globe2, Image as ImageIcon, Rocket, ShoppingBag, Users, Wallet, Wand2, Briefcase, Coins, Star, Trophy, ChevronRight } from "lucide-react";
import { useEffect } from "react";

const phases = [
  {
    id: 1,
    quarter: "Q4 2025",
    title: "Launch & Foundation",
    icon: Rocket,
    bullets: [
      "Launch of the 5Best Contest Platform — upload & vote for the best AI images.",
      "Glory Token deployed on Pump.fun (Solana) as the native utility & reward.",
      "Contest participation requires holding Glory Tokens.",
      "Community building on Twitter (X), Telegram & Discord.",
      "Transparent prize distribution handled inside the 5Best platform.",
    ],
    accent: "from-fuchsia-500 via-purple-500 to-indigo-500",
  },
  {
    id: 2,
    quarter: "Q1 2026",
    title: "Marketplace & Utility Expansion",
    icon: ShoppingBag,
    bullets: [
      "Launch of the 5Best Marketplace — creators sell AI artworks and earn.",
      "5% of all marketplace profits allocated to Glory Token buybacks.",
      "DAO Governance (suggest & vote for next contest topics).",
      "Fiat withdrawal integration.",
      "Weekly sponsored contests with brand partnerships.",
    ],
    accent: "from-cyan-500 via-sky-500 to-blue-500",
  },
  {
    id: 3,
    quarter: "Q2 2026",
    title: "AI Tools Integration",
    icon: Wand2,
    bullets: [
      "Built-in AI Image Generator (create inside 5Best).",
      "Create, upload & sell in a single flow.",
      "Subscription tiers — pay or hold Glory for discounts & credits.",
      "Expanded token utility across the platform.",
    ],
    accent: "from-emerald-500 via-teal-500 to-cyan-500",
  },
  {
    id: 4,
    quarter: "Q3 2026",
    title: "'Hire Me' & Creator Economy",
    icon: Briefcase,
    bullets: [
      "Launch the 'Hire Me' module for brands & individuals.",
      "Verified creator profiles, portfolios, ratings & reviews.",
      "Partnerships with digital agencies, NFT & AI communities.",
    ],
    accent: "from-amber-500 via-orange-500 to-rose-500",
  },
  {
    id: 5,
    quarter: "Q4 2026+",
    title: "Full Ecosystem & Expansion",
    icon: Globe2,
    bullets: [
      "Glory utility across all 5Best apps (AI video, POD, NFT minting).",
      "Global marketing, influencer collaborations & media coverage.",
    ],
    accent: "from-violet-500 via-fuchsia-500 to-pink-500",
  },
];

function SectionTitle({ label, eyebrow = "Roadmap", icon: Icon = Flame }: { label: string; eyebrow?: string; icon?: typeof Flame }) {
  return (
    <div className="text-center max-w-3xl mx-auto">
      <div className="inline-flex items-center gap-2 text-sm font-medium tracking-wide text-fuchsia-300/90">
        <Icon className="h-4 w-4" aria-hidden />
        <span>{eyebrow}</span>
      </div>
      <h1 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold text-white dark:text-white">
        5Best & Glory Token Roadmap
      </h1>
      <p className="mt-4 text-base sm:text-lg text-white/70 dark:text-white/70">
        <em>"Where Prompts Become Glory."</em>
      </p>
    </div>
  );
}

function PhaseCard({ phase, index }: { phase: typeof phases[number]; index: number }) {
  const Icon = phase.icon;
  return (
    <motion.li
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: 0.05 * index }}
      className="relative"
    >
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 md:gap-8 items-start">
        <div className="md:text-right">
          <div className="inline-flex md:inline-block px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/90 border border-white/10">
            {phase.quarter}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-4 top-0 bottom-0 hidden md:block border-l border-white/10" aria-hidden />
          <div className="absolute -left-4 -translate-x-1/2 mt-1 hidden md:block" aria-hidden>
            <div className={`h-3 w-3 rounded-full bg-gradient-to-r ${phase.accent} shadow-[0_0_24px_rgba(255,255,255,0.35)]`} />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 dark:bg-white/5 backdrop-blur-md p-5 md:p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-gradient-to-r ${phase.accent} text-white shadow-lg`}> 
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white dark:text-white">{phase.title}</h3>
            </div>

            <ul className="mt-4 space-y-2.5">
              {phase.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-white/80 dark:text-white/80">
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.li>
  );
}

function CTASection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6 }}
      className="mt-14 md:mt-20"
    >
      <div className="rounded-3xl border border-white/10 bg-white/5 dark:bg-white/5 backdrop-blur-md p-6 md:p-10 text-center shadow-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold">
          <Coins className="h-4 w-4" aria-hidden />
          <span>Utility, Buybacks & Growth</span>
        </div>
        <h3 className="mt-4 text-2xl md:text-3xl font-extrabold text-white dark:text-white">
          Hold $GLORY. Create. Vote. Earn.
        </h3>
        <p className="mt-3 text-white/70 dark:text-white/70 max-w-2xl mx-auto">
          5% of marketplace profits are allocated to token buybacks. Your creativity powers the economy — and holders share the momentum.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="https://t.me/ComunityGloryToken"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold bg-white text-gray-900 hover:opacity-90 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white"
            data-testid="button-telegram"
          >
            Join Telegram
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
          <a
            href="https://twitter.com/GloryToken5best"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold border border-white/20 text-white hover:bg-white/10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white"
            data-testid="button-twitter"
          >
            Follow on X
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

function VisionBlock() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto text-center mt-16 md:mt-24"
    >
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold">
        <Star className="h-4 w-4" aria-hidden />
        <span>Our Vision</span>
      </div>
      <p className="mt-4 text-lg md:text-xl leading-relaxed text-white/80 dark:text-white/80">
        5Best is more than a contest platform — it's a growing ecosystem where creativity,
        technology and blockchain meet, rewarding every artist, creator and dreamer with Glory.
      </p>
    </motion.section>
  );
}

function GradientBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-56 -left-40 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-indigo-500/20 blur-3xl" />
    </div>
  );
}

export default function RoadmapPage() {
  useEffect(() => {
    document.title = "Roadmap - 5Best";
  }, []);

  return (
    <main className="relative min-h-screen w-full bg-gradient-to-b from-[#0b0b12] via-[#0b0b12] to-[#0a0a0f] dark:from-[#0b0b12] dark:via-[#0b0b12] dark:to-[#0a0a0f] text-white">
      <GradientBackdrop />

      {/* Header */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-16 md:pt-24">
        <SectionTitle label="5Best & Glory Token Roadmap" eyebrow="Roadmap" />

        {/* Hero pills */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80">
            <Trophy className="h-4 w-4" /> Contest-first platform
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80">
            <Wallet className="h-4 w-4" /> Glory utility
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80">
            <ImageIcon className="h-4 w-4" /> AI generator
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80">
            <Users className="h-4 w-4" /> Hire Me economy
          </span>
        </div>
      </section>

      {/* Timeline */}
      <section className="relative px-4 sm:px-6 lg:px-8 mt-12 md:mt-16">
        <ol className="max-w-5xl mx-auto space-y-8 md:space-y-12">
          {phases.map((p, i) => (
            <PhaseCard key={p.id} phase={p} index={i} />
          ))}
        </ol>

        <CTASection />
        <VisionBlock />

        <footer className="max-w-5xl mx-auto text-center py-16 md:py-20">
          <p className="text-xs text-white/50 dark:text-white/50">
            © {new Date().getFullYear()} 5Best / Glory Token. All rights reserved.
          </p>
        </footer>
      </section>
    </main>
  );
}
