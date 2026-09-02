"use client";

import { useRef, useState } from "react";

type CustomerVoiceRecorderProps = {
  customerId: number;
};

export default function CustomerVoiceRecorder({
  customerId,
}: CustomerVoiceRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function startRecording() {
    setMessage("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const recorder = new MediaRecorder(stream);

      chunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        setAudioBlob(blob);

        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setRecording(true);
    } catch (error) {
      console.error("Microphone access failed:", error);
      setMessage("Microphone access could not be started.");
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current) {
      return;
    }

    mediaRecorderRef.current.stop();
    setRecording(false);
  }

  function discardRecording() {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioBlob(null);
    setAudioUrl(null);
    setMessage("");
  }

  async function saveRecording() {
    if (!audioBlob) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const formData = new FormData();

      formData.append("customerId", String(customerId));
      formData.append(
        "audio",
        audioBlob,
        `voice-note-${Date.now()}.webm`
      );

      const response = await fetch("/api/customer-voice-notes", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Voice note could not be saved."
        );
      }

      setMessage("Voice note saved.");
      discardRecording();
      window.location.reload();
    } catch (error) {
      console.error("Voice note save failed:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Voice note could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <p className="text-sm font-semibold text-amber-600">
          Voice Notes
        </p>

        <h2 className="mt-1 text-xl font-bold text-slate-950">
          Record customer update
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Record a call, meeting or commercial update against this customer.
        </p>
      </div>

      <div className="px-6 py-5">
        {!recording && !audioBlob ? (
          <button
            type="button"
            onClick={startRecording}
            className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            🎙 Start recording
          </button>
        ) : null}

        {recording ? (
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-red-600">
              Recording...
            </span>

            <button
              type="button"
              onClick={stopRecording}
              className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Stop recording
            </button>
          </div>
        ) : null}

        {audioUrl && audioBlob ? (
          <div className="space-y-4">
            <audio
              controls
              src={audioUrl}
              className="w-full"
            />

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveRecording}
                disabled={saving}
                className="rounded-lg bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save voice note"}
              </button>

              <button
                type="button"
                onClick={discardRecording}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Discard
              </button>
            </div>
          </div>
        ) : null}

        {message ? (
          <p className="mt-4 text-sm text-slate-600">
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}