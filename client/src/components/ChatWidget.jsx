import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import { sendChatMessage } from "../api";

const starterMessages = [
  {
    role: "assistant",
    content:
      "Hi, I am the project assistant. Ask me about the architecture, Groq integration, MongoDB soft delete, caching, APIs, or deployment."
  }
];

function cleanInput(value) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 700);
}

function formatMessage(content) {
  return content.split(/\n+/).filter(Boolean);
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(starterMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const remaining = useMemo(() => 700 - input.length, [input]);

  async function submitMessage(event) {
    event.preventDefault();
    if (loading) return;

    const message = cleanInput(input);
    if (!message) {
      setError("Please type a question first.");
      return;
    }

    setError("");
    setInput("");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", content: message }]);

    try {
      const response = await sendChatMessage(message);
      setMessages((current) => [...current, { role: "assistant", content: response.answer || "I could not generate a response right now." }]);
    } catch (err) {
      setError(err.message || "The assistant is unavailable. Please retry.");
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "I hit a temporary issue. Please retry your question in a moment." }
      ]);
    } finally {
      setLoading(false);
      window.setTimeout(() => inputRef.current?.focus(), 80);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full border border-cyan-200/40 bg-cyan-300 text-slate-950 shadow-[0_0_44px_rgba(112,245,255,0.42)] transition hover:bg-white"
        aria-label="Open AI assistant"
        title="Open AI assistant"
      >
        <MessageCircle size={24} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-3 py-4 backdrop-blur-sm sm:items-center"
          >
            <motion.section
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              className="flex h-[min(680px,86vh)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/14 bg-[#080a18]/95 shadow-2xl"
            >
              <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-300 text-slate-950">
                    <Bot size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Portfolio AI Assistant</h2>
                    <p className="text-xs text-slate-400">RAG-backed project explainer</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="icon-button compact"
                  aria-label="Close assistant"
                  title="Close assistant"
                >
                  <X size={16} />
                </button>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`chat-bubble ${message.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}`}>
                      {formatMessage(message.content).map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="chat-bubble chat-bubble-assistant">
                      <p className="typing-indicator">AI is typing...</p>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={submitMessage} className="border-t border-white/10 p-4">
                {error && (
                  <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                    <span>{error}</span>
                    <button type="button" onClick={() => setError("")} className="font-bold text-red-50">
                      Dismiss
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">Ask about the project</span>
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(event) => setInput(event.target.value.slice(0, 700))}
                      className="max-h-32 min-h-12 w-full resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300"
                      placeholder="Ask how the RAG flow works..."
                      disabled={loading}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={loading || cleanInput(input).length === 0}
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-300 text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Send message"
                    title="Send message"
                  >
                    <Send size={18} />
                  </button>
                </div>
                <p className="mt-2 text-right text-[11px] text-slate-500">{remaining} characters left</p>
              </form>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
