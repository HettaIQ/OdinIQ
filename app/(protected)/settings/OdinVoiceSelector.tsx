"use client";

import { useState, useTransition } from "react";
import { updateOdinVoice } from "@/app/actions/updateOdinVoice";

const accents = [
  {
    id: "british-deep",
    name: "Odin",
    accent: "British",
    description: "Deep, mature and authoritative",
  },
  {
    id: "northern",
    name: "Northern",
    accent: "Northern English",
    description: "Warm, confident and direct",
  },
  {
    id: "manchester",
    name: "Manchester",
    accent: "Manchester",
    description: "Natural Northern character",
  },
  {
    id: "liverpool",
    name: "Liverpool",
    accent: "Liverpool",
    description: "Friendly and distinctive",
  },
  {
    id: "newcastle",
    name: "Newcastle",
    accent: "Geordie",
    description: "Warm North East character",
  },
  {
    id: "yorkshire",
    name: "Yorkshire",
    accent: "Yorkshire",
    description: "Grounded, warm and direct",
  },
  {
    id: "midlands",
    name: "Midlands",
    accent: "Midlands",
    description: "Natural Midlands character",
  },
  {
    id: "scottish",
    name: "Scottish",
    accent: "Scottish",
    description: "Confident and professional",
  },
  {
    id: "welsh",
    name: "Welsh",
    accent: "Welsh",
    description: "Rich, warm and authoritative",
  },
  {
    id: "irish",
    name: "Irish",
    accent: "Irish",
    description: "Warm, natural and engaging",
  },
];

type VoiceGender = "male" | "female";

type OdinVoiceSelectorProps = {
  currentVoiceId: string | null;
};

function parseVoiceId(
  voiceId: string | null
): {
  accentId: string;
  gender: VoiceGender;
} {
  if (!voiceId) {
    return {
      accentId: "british-deep",
      gender: "male",
    };
  }

  const withoutPrefix = voiceId.replace(
    /^odin-/,
    ""
  );

  if (withoutPrefix.endsWith("-female")) {
    return {
      accentId: withoutPrefix.replace(
        /-female$/,
        ""
      ),
      gender: "female",
    };
  }

  if (withoutPrefix.endsWith("-male")) {
    return {
      accentId: withoutPrefix.replace(
        /-male$/,
        ""
      ),
      gender: "male",
    };
  }

  return {
    accentId: withoutPrefix,
    gender: "male",
  };
}

function makeVoiceId(
  accentId: string,
  gender: VoiceGender
) {
  return `odin-${accentId}-${gender}`;
}

export default function OdinVoiceSelector({
  currentVoiceId,
}: OdinVoiceSelectorProps) {
  const initial = parseVoiceId(
    currentVoiceId
  );

  const [selectedAccent, setSelectedAccent] =
    useState(initial.accentId);

  const [gender, setGender] =
    useState<VoiceGender>(initial.gender);

  const [savedVoice, setSavedVoice] =
    useState(currentVoiceId);

  const [isPending, startTransition] =
    useTransition();

  const [message, setMessage] =
    useState("");

  const [isPreviewing, setIsPreviewing] =
    useState(false);

  const selectedVoiceId =
    makeVoiceId(
      selectedAccent,
      gender
    );

  function chooseGender(
    nextGender: VoiceGender
  ) {
    setGender(nextGender);
    setMessage("");
  }

  function chooseAccent(
    accentId: string
  ) {
    setSelectedAccent(accentId);
    setMessage("");
  }

  async function previewVoice() {
    if (isPreviewing) {
      return;
    }

    setMessage("");
    setIsPreviewing(true);

    try {
      const response = await fetch(
        "/api/odin/voice-preview",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            voiceId:
              selectedVoiceId,
          }),
        }
      );

      if (!response.ok) {
        const result =
          await response.json();

        throw new Error(
          result.error ||
            "Preview failed"
        );
      }

      const blob =
        await response.blob();

      const audioUrl =
        URL.createObjectURL(blob);

      const audio =
        new Audio(audioUrl);

      audio.onended = () => {
        URL.revokeObjectURL(
          audioUrl
        );
      };

      await audio.play();
    } catch (error) {
      console.error(error);

      setMessage(
        "Voice preview unavailable"
      );
    } finally {
      setIsPreviewing(false);
    }
  }

  function saveVoice() {
    setMessage("");

    startTransition(async () => {
      try {
        await updateOdinVoice(
          selectedVoiceId
        );

        setSavedVoice(
          selectedVoiceId
        );

        setMessage("Voice saved");
      } catch {
        setMessage(
          "Could not save voice"
        );
      }
    });
  }

  const savedSelection =
    parseVoiceId(savedVoice);

  const hasChanges =
    selectedAccent !==
      savedSelection.accentId ||
    gender !==
      savedSelection.gender;

  return (
    <div className="mt-6 space-y-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Voice
        </p>

        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() =>
              chooseGender("male")
            }
            className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition ${
              gender === "male"
                ? "bg-slate-950 text-white shadow-sm"
                : "text-slate-600 hover:bg-white"
            }`}
          >
            Male
          </button>

          <button
            type="button"
            onClick={() =>
              chooseGender("female")
            }
            className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition ${
              gender === "female"
                ? "bg-slate-950 text-white shadow-sm"
                : "text-slate-600 hover:bg-white"
            }`}
          >
            Female
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accents.map((voice) => {
          const selected =
            selectedAccent ===
            voice.id;

          return (
            <div
              key={voice.id}
              role="button"
              tabIndex={0}
              onClick={() =>
                chooseAccent(
                  voice.id
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" ||
                  event.key === " "
                ) {
                  chooseAccent(
                    voice.id
                  );
                }
              }}
              className={`cursor-pointer rounded-xl border p-4 text-left transition ${
                selected
                  ? "border-amber-400 bg-amber-50 ring-1 ring-amber-400"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">
                    {voice.name}
                  </p>

                  <p className="mt-1 text-xs font-medium text-amber-700">
                    {voice.accent}
                  </p>
                </div>

                {selected && (
                  <span className="text-xs font-semibold text-amber-700">
                    Selected
                  </span>
                )}
              </div>

              <p className="mt-3 text-sm text-slate-500">
                {voice.description}
              </p>

              <div className="mt-4 border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();

                    if (!selected) {
                      chooseAccent(
                        voice.id
                      );
                    }

                    const previewVoiceId =
                      makeVoiceId(
                        voice.id,
                        gender
                      );

                    previewVoiceForId(
                      previewVoiceId
                    );
                  }}
                  disabled={isPreviewing}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="inline-block h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-slate-700" />
                  {isPreviewing && selected
                    ? "Loading..."
                    : `Preview ${gender}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-4">
        {message && (
          <span
            className={`text-sm font-semibold ${
              message === "Voice saved"
                ? "text-emerald-600"
                : "text-red-600"
            }`}
          >
            {message}
          </span>
        )}

        <button
          type="button"
          onClick={saveVoice}
          disabled={
            isPending ||
            !hasChanges
          }
          className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending
            ? "Saving..."
            : "Save voice"}
        </button>
      </div>
    </div>
  );

  async function previewVoiceForId(
    voiceId: string
  ) {
    if (isPreviewing) {
      return;
    }

    setMessage("");
    setIsPreviewing(true);

    try {
      const response = await fetch(
        "/api/odin/voice-preview",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            voiceId,
          }),
        }
      );

      if (!response.ok) {
        const result =
          await response.json();

        throw new Error(
          result.error ||
            "Preview failed"
        );
      }

      const blob =
        await response.blob();

      const audioUrl =
        URL.createObjectURL(blob);

      const audio =
        new Audio(audioUrl);

      audio.onended = () => {
        URL.revokeObjectURL(
          audioUrl
        );
      };

      await audio.play();
    } catch (error) {
      console.error(error);

      setMessage(
        "Voice preview unavailable"
      );
    } finally {
      setIsPreviewing(false);
    }
  }
}