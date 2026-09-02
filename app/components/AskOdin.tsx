"use client";

import { useState } from "react";

type AskOdinProps = {
  customerId?: number;
  customerName?: string;
};

export default function AskOdin({
  customerId,
  customerName,
}: AskOdinProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [thinking, setThinking] = useState(false);

  async function handleAsk() {
    if (!question.trim()) {
      setAnswer("Please enter a commercial question.");
      return;
    }

    setThinking(true);
    setAnswer("");

    try {
      const response = await fetch("/api/ask-odin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          customerId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAnswer(
          data.answer || "Odin could not answer that question."
        );
        return;
      }

      setAnswer(data.answer);
    } catch (error) {
      console.error("Ask Odin failed:", error);

      setAnswer(
        "Odin could not connect to the commercial database."
      );
    } finally {
      setThinking(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter" && !thinking) {
      handleAsk();
    }
  }

  return (
    <div className="rounded-2xl border border-amber-400/20 bg-slate-950 p-6 text-white shadow-sm">
      <p className="text-sm font-semibold text-amber-400">
        Ask Odin
      </p>

      <h3 className="mt-2 text-xl font-bold">
        {customerName
          ? `Ask about ${customerName}`
          : "Commercial Intelligence"}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-400">
        {customerName
          ? "Ask Odin about this customer's credit position, recent activity, agreements and recommended next actions."
          : "Ask a commercial question about your customers and agreements."}
      </p>

      <div className="mt-5 flex gap-3">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            customerName
              ? "What should I do with this customer next?"
              : "Ask Odin a commercial question..."
          }
          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400"
        />

        <button
          type="button"
          onClick={handleAsk}
          disabled={thinking}
          className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {thinking ? "Thinking..." : "Ask Odin"}
        </button>
      </div>

      {thinking ? (
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm font-semibold text-amber-400">
            Odin is analysing the commercial record...
          </p>
        </div>
      ) : null}

      {answer ? (
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm leading-7 text-slate-200">
            {answer}
          </p>
        </div>
      ) : null}
    </div>
  );
}