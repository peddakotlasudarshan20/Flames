import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Clipboard,
  Download,
  History,
  Loader2,
  RefreshCw,
  Share2,
  Sparkles,
  Trash2,
  Undo2
} from "lucide-react";
import { calculateFlames, clearHistory, deleteHistoryItem, getDeletedResults, getHistory, getResult, restoreHistoryItem } from "./api";
import TiltCard from "./components/TiltCard";

const ParticleField = lazy(() => import("./components/ParticleField.jsx"));
const ChatWidget = lazy(() => import("./components/ChatWidget.jsx"));
const HISTORY_LIMIT = 10;

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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function App() {
  const [form, setForm] = useState(defaultForm);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [deletedHistory, setDeletedHistory] = useState([]);
  const [showDeletedHistory, setShowDeletedHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [deletedHistoryPage, setDeletedHistoryPage] = useState(1);
  const [deletedHistoryTotalPages, setDeletedHistoryTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [deletedHistoryLoading, setDeletedHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [deletedHistoryError, setDeletedHistoryError] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const resultRef = useRef(null);
  const historyDebounceRef = useRef(null);
  const historyRequestRef = useRef(0);

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
    loadHistory(1);
  }, []);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) window.clearTimeout(historyDebounceRef.current);
    };
  }, []);

  async function loadHistory(page = historyPage) {
    const requestId = historyRequestRef.current + 1;
    historyRequestRef.current = requestId;
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const data = await getHistory({ page, limit: HISTORY_LIMIT });
      if (historyRequestRef.current !== requestId) return;
      setHistory(data.data || data.items || []);
      setHistoryPage(data.page || page);
      setHistoryTotalPages(data.totalPages || 1);
    } catch (err) {
      if (historyRequestRef.current !== requestId) return;
      setHistoryError(err.message || "Could not load results.");
    } finally {
      if (historyRequestRef.current === requestId) setHistoryLoading(false);
    }
  }

  async function loadDeletedHistory(page = deletedHistoryPage) {
    const requestId = historyRequestRef.current + 1;
    historyRequestRef.current = requestId;
    setDeletedHistoryLoading(true);
    setDeletedHistoryError("");
    try {
      const data = await getDeletedResults({ page, limit: HISTORY_LIMIT });
      if (historyRequestRef.current !== requestId) return;
      setDeletedHistory(data.data || data.items || []);
      setDeletedHistoryPage(data.page || page);
      setDeletedHistoryTotalPages(data.totalPages || 1);
    } catch (err) {
      if (historyRequestRef.current !== requestId) return;
      setDeletedHistoryError(err.message || "Could not load deleted results.");
    } finally {
      if (historyRequestRef.current === requestId) setDeletedHistoryLoading(false);
    }
  }

  async function toggleDeletedHistory() {
    const nextValue = !showDeletedHistory;
    setShowDeletedHistory(nextValue);
    if (nextValue) await loadDeletedHistory(1);
  }

  async function handleDeleteHistory(id) {
    const previous = history;
    setHistory((items) => items.filter((item) => item._id !== id));
    if (result?.shareId === id || result?._id === id) setResult(null);
    try {
      await deleteHistoryItem(id);
      if (showDeletedHistory) await loadDeletedHistory(deletedHistoryPage);
      setToast("Result deleted");
      setTimeout(() => setToast(""), 2200);
    } catch {
      setHistory(previous);
      setError("Could not delete the saved result. Please retry.");
    }
  }

  async function handleRestoreHistory(id) {
    const previousDeleted = deletedHistory;
    setDeletedHistory((items) => items.filter((item) => item._id !== id));
    try {
      await restoreHistoryItem(id);
      await loadHistory(1);
      setToast("Result restored");
      setTimeout(() => setToast(""), 2200);
    } catch {
      setDeletedHistory(previousDeleted);
      setError("Could not restore the deleted result. Please retry.");
    }
  }

  async function handleClearHistory() {
    if (history.length === 0) return;
    const previous = history;
    setHistory([]);
    setResult(null);
    try {
      await clearHistory();
      setHistoryPage(1);
      setHistoryTotalPages(1);
      if (showDeletedHistory) await loadDeletedHistory(1);
      setToast("History cleared");
      setTimeout(() => setToast(""), 2200);
    } catch {
      setHistory(previous);
      setError("Could not clear history. Please retry.");
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
      await loadHistory(1);
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
    if (!result) return;
    const report = document.createElement("section");
    report.className = "download-report";
    report.innerHTML = `
      <div class="download-report-card">
        <p class="download-report-kicker">FLAMES Compatibility Report</p>
        <h1>${escapeHtml(result.name1)} + ${escapeHtml(result.name2)}</h1>
        <div class="download-report-pill">${escapeHtml(result.relationshipType || result.result)}</div>
        <p class="download-report-copy">${escapeHtml(result.explanation)}</p>
        <div class="download-report-grid">
          <div>
            <h2>Strengths</h2>
            <ul>${(result.strengths || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </div>
          <div>
            <h2>Possible conflicts</h2>
            <ul>${(result.possibleConflicts || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </div>
        </div>
        <div class="download-report-advice">
          <h2>Advice</h2>
          <p>${escapeHtml(result.advice)}</p>
        </div>
      </div>
    `;
    document.body.appendChild(report);
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(report, {
      backgroundColor: null,
      scale: 2,
      useCORS: true
    });
    report.remove();
    const link = document.createElement("a");
    link.download = "flames-report.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  const visibleHistory = showDeletedHistory ? deletedHistory : history;
  const visiblePage = showDeletedHistory ? deletedHistoryPage : historyPage;
  const visibleTotalPages = showDeletedHistory ? deletedHistoryTotalPages : historyTotalPages;
  const visibleHistoryLoading = showDeletedHistory ? deletedHistoryLoading : historyLoading;
  const visibleHistoryError = showDeletedHistory ? deletedHistoryError : historyError;

  function loadHistoryPage(page) {
    if (historyDebounceRef.current) window.clearTimeout(historyDebounceRef.current);
    historyDebounceRef.current = window.setTimeout(() => {
      if (showDeletedHistory) {
        loadDeletedHistory(page);
      } else {
        loadHistory(page);
      }
    }, 300);
  }

  function retryVisibleHistory() {
    if (showDeletedHistory) {
      loadDeletedHistory(deletedHistoryPage);
    } else {
      loadHistory(historyPage);
    }
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
            Peddakotla Sudarshan's Flames Compatibility System
          </div>
          <h1 className="max-w-4xl text-balance text-5xl font-black tracking-normal text-white sm:text-6xl lg:text-7xl">
            Compatibility insights with a little cosmic drama.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Enter two names, watch the FLAMES elimination unfold, then get smart insights that feel playful, grounded, and shareable.
          </p>

          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
            {["Animated FLAMES", "Smart insights", "Saved history"].map((item) => (
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
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>{error}</span>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200/30 px-3 py-2 font-bold text-red-50 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <RefreshCw size={16} />
                  Retry
                </button>
              </motion.div>
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
            <div className="flex items-center gap-2">
              <button onClick={toggleDeletedHistory} className="rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/12">
                {showDeletedHistory ? "Active" : "Deleted"}
              </button>
              {history.length > 0 && (
                <button onClick={handleClearHistory} className="icon-button compact" aria-label="Clear history" title="Clear history">
                  <Trash2 size={16} />
                </button>
              )}
              {(historyLoading || deletedHistoryLoading) && <Loader2 className="animate-spin text-slate-400" size={18} />}
            </div>
          </div>
          <div className="space-y-3">
            {visibleHistoryError && (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
                <div className="flex items-center justify-between gap-3">
                  <span>{visibleHistoryError}</span>
                  <button
                    type="button"
                    onClick={retryVisibleHistory}
                    className="rounded-xl border border-red-200/30 px-3 py-2 text-xs font-bold text-red-50 transition hover:bg-white/10"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
            {visibleHistory.map((item) => (
              <button
                key={item._id}
                onClick={() => {
                  if (!showDeletedHistory) getResult(item._id).then(setResult);
                }}
                className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-cyan-200/40 hover:bg-white/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate font-semibold text-white">{item.name1} + {item.name2}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-cyan-100">{item.result}</span>
                    {!showDeletedHistory && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteHistory(item._id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            handleDeleteHistory(item._id);
                          }
                        }}
                        className="grid h-8 w-8 place-items-center rounded-xl border border-red-200/20 bg-red-400/10 text-red-100 transition hover:bg-red-400/20"
                        aria-label="Delete result"
                        title="Delete result"
                      >
                        <Trash2 size={14} />
                      </span>
                    )}
                    {showDeletedHistory && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRestoreHistory(item._id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            handleRestoreHistory(item._id);
                          }
                        }}
                        className="grid h-8 w-8 place-items-center rounded-xl border border-emerald-200/20 bg-emerald-400/10 text-emerald-100 transition hover:bg-emerald-400/20"
                        aria-label="Restore result"
                        title="Restore result"
                      >
                        <Undo2 size={14} />
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {showDeletedHistory ? "Deleted " : ""}
                  {new Date(showDeletedHistory ? item.deletedAt || item.createdAt : item.createdAt).toLocaleString()}
                </p>
              </button>
            ))}
            {visibleHistoryLoading && (
              <div className="space-y-3" aria-hidden="true">
                {Array.from({ length: visibleHistory.length > 0 ? 2 : 3 }).map((_, index) => (
                  <div key={index} className="history-skeleton rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="h-4 w-2/3 rounded-full bg-white/10" />
                    <div className="mt-4 h-3 w-1/2 rounded-full bg-white/10" />
                  </div>
                ))}
              </div>
            )}
            {!historyLoading && !deletedHistoryLoading && !visibleHistoryError && visibleHistory.length === 0 && (
              <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                {showDeletedHistory ? "No deleted results yet." : "No saved results yet."}
              </p>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => loadHistoryPage(visiblePage - 1)}
              disabled={visibleHistoryLoading || visiblePage <= 1}
              className="rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs font-semibold text-slate-400">
              Page {visiblePage} of {visibleTotalPages || 1}
            </span>
            <button
              type="button"
              onClick={() => loadHistoryPage(visiblePage + 1)}
              disabled={visibleHistoryLoading || visiblePage >= visibleTotalPages}
              className="rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
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

      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
    </main>
  );
}
