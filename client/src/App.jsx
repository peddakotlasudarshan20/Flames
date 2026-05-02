import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import html2canvas from "html2canvas";
import {
  ArrowRight,
  Clipboard,
  Download,
  History,
  Loader2,
  RefreshCw,
  Share2,
  Sparkles
} from "lucide-react";
import { calculateFlames, getHistory, getResult } from "./api";
import TiltCard from "./components/TiltCard";

const ParticleField = lazy(() => import("./components/ParticleField.jsx"));

const resultStyles = {
  Friends: { accent: "#70f5ff", label: "Friends", copy: "Easy rhythm, loyal energy, and a bond that feels safe." },
  Love: { accent: "#ff5fd7", label: "Love", copy: "Magnetic chemistry with enough spark to keep things interesting." },
  Affection: { accent: "#94ffb8", label: "Affection", copy: "Warm attention, soft care, and a bond that grows naturally." },
  Marriage: { accent: "#ffd166", label: "Marriage", copy: "Stable devotion with the long-game energy of partnership." },
  Enemies: { accent: "#ff6b6b", label: "Enemies", copy: "High contrast personalities that need patience and honesty." },
  Siblings: { accent: "#b69cff", label: "Siblings", copy: "Playful chaos, protective instincts, and familiar comfort." }
};

const defaultForm = {
  name1: "",
  name2: "",
  personalityTraits: "",
  interests: "",
  communicationStyle: ""
};

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function App() {
  const [form, setForm] = useState(defaultForm);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const resultRef = useRef(null);

  const resultTheme = useMemo(() => {
    if (!result?.result) return resultStyles.Friends;
    return resultStyles[result.result] || resultStyles.Friends;
  }, [result]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedId = params.get("share");
    if (sharedId) {
      getResult(sharedId)
        .then(setResult)
        .catch(() => setError("Shared result could not be loaded."));
    }
    loadHistory();
  }, []);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const data = await getHistory();
      setHistory(data.items || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await calculateFlames(form);
      setResult(data);
      setForm(defaultForm);
      await loadHistory();
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
    } catch (err) {
      setError(err.message || "Unable to calculate compatibility.");
    } finally {
      setLoading(false);
    }
  }

  async function copyShareLink() {
    if (!result?.shareId) return;
    const url = `${window.location.origin}${window.location.pathname}?share=${result.shareId}`;
    await navigator.clipboard.writeText(url);
    setToast("Share link copied");
    setTimeout(() => setToast(""), 2200);
  }

  async function copySummary() {
    if (!result) return;
    await navigator.clipboard.writeText(
      `${result.name1} + ${result.name2}: ${result.relationshipType || result.result}\n${result.explanation}\n\nStrengths:\n${(result.strengths || []).join("\n")}\n\nAdvice:\n${result.advice || ""}`
    );
    setToast("Result copied");
    setTimeout(() => setToast(""), 2200);
  }

  async function downloadResult() {
    if (!resultRef.current) return;
    const canvas = await html2canvas(resultRef.current, {
      backgroundColor: "#070814",
      scale: 2
    });
    const link = document.createElement("a");
    link.download = `flames-relationship-report-${result.name1}-${result.name2}.png`.replace(/\s+/g, "-").toLowerCase();
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060713] text-white">
      <Suspense fallback={<div className="absolute inset-0 -z-10 bg-[#060713]" />}>
        <ParticleField />
      </Suspense>

      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(255,95,215,0.18),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(112,245,255,0.14),transparent_30%),linear-gradient(180deg,rgba(6,7,19,0.45),#060713_78%)]" />

      <section className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_460px] lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="pt-12 lg:pt-0"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm text-cyan-100 shadow-[0_0_40px_rgba(112,245,255,0.12)] backdrop-blur-xl">
            <Sparkles size={16} />
            FLAMES AI Compatibility System
          </div>
          <h1 className="max-w-4xl text-balance text-5xl font-black tracking-normal text-white sm:text-6xl lg:text-7xl">
            Compatibility, calculated with a little cosmic drama.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Enter two names, watch the FLAMES elimination unfold, then get an AI-written compatibility reading that is playful, grounded, and shareable.
          </p>

          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
            {["Animated FLAMES", "Groq AI insights", "Saved history"].map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/7 px-3 py-3 text-center text-sm text-slate-200 backdrop-blur-xl">
                {item}
              </div>
            ))}
          </div>
        </motion.div>

        <TiltCard className="rounded-[28px] border border-white/14 bg-white/10 p-5 shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200">Start match</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Build the relationship report</h2>
            </div>

            <label className="block">
              <span className="text-sm text-slate-300">First name</span>
              <input
                value={form.name1}
                onChange={(event) => setForm((current) => ({ ...current, name1: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-base text-white outline-none transition focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(112,245,255,0.12)]"
                placeholder="Aarav"
                maxLength={60}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-300">Second name</span>
              <input
                value={form.name2}
                onChange={(event) => setForm((current) => ({ ...current, name2: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-base text-white outline-none transition focus:border-pink-300 focus:shadow-[0_0_0_4px_rgba(255,95,215,0.12)]"
                placeholder="Meera"
                maxLength={60}
                required
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm text-slate-300">Personality traits</span>
                <input
                  value={form.personalityTraits}
                  onChange={(event) => setForm((current) => ({ ...current, personalityTraits: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(112,245,255,0.12)]"
                  placeholder="Calm, ambitious"
                  maxLength={220}
                />
              </label>

              <label className="block">
                <span className="text-sm text-slate-300">Communication style</span>
                <input
                  value={form.communicationStyle}
                  onChange={(event) => setForm((current) => ({ ...current, communicationStyle: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition focus:border-pink-300 focus:shadow-[0_0_0_4px_rgba(255,95,215,0.12)]"
                  placeholder="Direct, expressive"
                  maxLength={160}
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm text-slate-300">Shared interests</span>
              <textarea
                value={form.interests}
                onChange={(event) => setForm((current) => ({ ...current, interests: event.target.value }))}
                className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300 focus:shadow-[0_0_0_4px_rgba(148,255,184,0.12)]"
                placeholder="Music, travel, startups, movies"
                maxLength={220}
              />
            </label>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-4 font-bold text-slate-950 shadow-[0_0_40px_rgba(112,245,255,0.28)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
              {loading ? "Reading the signal" : "Calculate Compatibility"}
            </button>
          </form>
        </TiltCard>
      </section>

      <section className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key={result.shareId || result.result}
              ref={resultRef}
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.6 }}
              className="relative overflow-hidden rounded-[30px] border border-white/12 bg-white/10 p-5 shadow-2xl backdrop-blur-2xl sm:p-7"
            >
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ background: `linear-gradient(90deg, transparent, ${resultTheme.accent}, transparent)` }}
              />
              <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-xl font-black">{initials(result.name1)}</div>
                    <div className="text-2xl text-slate-400">+</div>
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-xl font-black">{initials(result.name2)}</div>
                  </div>
                  <motion.div
                    initial={{ rotate: -8, scale: 0.82 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 160, damping: 14 }}
                    className="mt-8 grid h-40 w-40 place-items-center rounded-full border text-3xl font-black"
                    style={{
                      borderColor: `${resultTheme.accent}88`,
                      boxShadow: `0 0 70px ${resultTheme.accent}44`,
                      color: resultTheme.accent
                    }}
                  >
                    {result.result[0]}
                  </motion.div>
                  <p className="mt-5 text-center text-sm text-slate-300">{resultTheme.copy}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">Result</p>
                  <h2 className="mt-2 text-4xl font-black" style={{ color: resultTheme.accent }}>{result.relationshipType || resultTheme.label}</h2>
                  <p className="mt-2 text-sm uppercase tracking-[0.24em] text-slate-500">FLAMES base: {resultTheme.label}</p>
                  <p className="mt-4 text-lg leading-8 text-slate-200">{result.explanation}</p>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-bold text-white">Compatibility reasoning</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{result.compatibilityReasoning}</p>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {(result.insights || []).map((insight) => (
                      <div key={insight.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-sm font-bold text-white">{insight.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{insight.detail}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/8 p-4">
                      <p className="text-sm font-bold text-emerald-100">Strengths</p>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                        {(result.strengths || []).map((item) => <li key={item}>- {item}</li>)}
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/8 p-4">
                      <p className="text-sm font-bold text-amber-100">Possible conflicts</p>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                        {(result.possibleConflicts || []).map((item) => <li key={item}>- {item}</li>)}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/8 p-4">
                    <p className="text-sm font-bold text-cyan-100">Advice</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{result.advice}</p>
                  </div>

                  <div className="mt-6">
                    <p className="mb-3 text-sm text-slate-400">Animated elimination path</p>
                    <div className="flex flex-wrap gap-2">
                      {(result.eliminationSteps || []).map((step, index) => (
                        <motion.span
                          key={`${step.removed}-${index}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.08 }}
                          className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-sm text-slate-200"
                        >
                          {step.before.join("")} - {step.removed}
                        </motion.span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <button onClick={copyShareLink} className="icon-button" aria-label="Copy share link" title="Copy share link">
                      <Share2 size={18} />
                    </button>
                    <button onClick={copySummary} className="icon-button" aria-label="Copy result" title="Copy result">
                      <Clipboard size={18} />
                    </button>
                    <button onClick={downloadResult} className="report-button" aria-label="Download relationship report" title="Download report">
                      <Download size={18} />
                      Download Report
                    </button>
                    <button onClick={() => setResult(null)} className="icon-button" aria-label="New result" title="New result">
                      <RefreshCw size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-[30px] border border-dashed border-white/14 bg-white/6 p-8 text-slate-300 backdrop-blur-xl"
            >
              Your compatibility reading appears here after the calculation.
            </motion.div>
          )}
        </AnimatePresence>

        <aside className="rounded-[30px] border border-white/12 bg-white/8 p-5 backdrop-blur-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={18} className="text-cyan-200" />
              <h2 className="text-lg font-bold">Previous results</h2>
            </div>
            {historyLoading && <Loader2 className="animate-spin text-slate-400" size={18} />}
          </div>
          <div className="space-y-3">
            {history.map((item) => (
              <button
                key={item._id}
                onClick={() => getResult(item._id).then(setResult)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-cyan-200/40 hover:bg-white/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate font-semibold text-white">{item.name1} + {item.name2}</p>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-cyan-100">{item.result}</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
              </button>
            ))}
            {!historyLoading && history.length === 0 && (
              <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">No saved results yet.</p>
            )}
          </div>
        </aside>
      </section>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/12 bg-slate-950/90 px-5 py-3 text-sm text-white shadow-2xl backdrop-blur-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
