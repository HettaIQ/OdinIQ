"use client";

import { useState } from "react";

export default function AskOdin() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [displayAnswer, setDisplayAnswer] = useState("");
  const [thinking, setThinking] = useState(false);
async function handleAsk() {
  if (!question.trim()) {
    setAnswer("Please enter a commercial question.");
    setDisplayAnswer("Please enter a commercial question.");
    return;
  }

  setThinking(true);
  setAnswer("");
  setDisplayAnswer("");

  try {
    const response = await fetch("/api/ask-odin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorAnswer =
        data.answer || "Odin could not answer that question.";

      setAnswer(errorAnswer);
      setDisplayAnswer(errorAnswer);
      return;
    }

    setAnswer(data.answer);
    setDisplayAnswer(data.answer);
  } catch (error) {
    console.error("Ask Odin failed:", error);

    const errorAnswer =
      "Odin could not connect to the commercial database.";

    setAnswer(errorAnswer);
    setDisplayAnswer(errorAnswer);
  } finally {
    setThinking(false);
  }
}
  return (
    <div
      style={{
        background: "rgba(212,175,55,0.08)",
        border: "1px solid rgba(212,175,55,0.25)",
        borderRadius: "22px",
        padding: "28px",
      }}
    >
      <h3 style={{ fontSize: "24px", marginBottom: "20px" }}>Ask Odin</h3>

      <p style={{ color: "#B8B8B8", marginBottom: "16px" }}>
        Ask a commercial question.
      </p>

      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Which customers should I contact today?"
        style={{
          width: "100%",
          padding: "16px",
          background: "#080808",
          color: "white",
          border: "1px solid #333",
          borderRadius: "12px",
          fontSize: "16px",
          marginBottom: "16px",
        }}
      />

      <button
  onClick={handleAsk}
  disabled={thinking}
          
        style={{
          background: "#D4AF37",
          color: "#080808",
          border: "none",
          padding: "14px 24px",
          borderRadius: "12px",
          fontWeight: "bold",
          cursor: "pointer",
          marginBottom: "20px",
        }}
      >
        Ask Odin
      </button>

      {thinking && (
        <div
          style={{
            background: "#080808",
            borderRadius: "16px",
            padding: "20px",
            lineHeight: "1.7",
            marginTop: "20px",
            color: "#D4AF37",
            fontWeight: "bold",
          }}
        >
          🧠 Odin is thinking...
        </div>
      )}

      {answer && (
        <div
          style={{
            background: "#080808",
            borderRadius: "16px",
            padding: "20px",
            lineHeight: "1.7",
          }}
        >
          {displayAnswer}
        </div>
      )}
    </div>
  );
}