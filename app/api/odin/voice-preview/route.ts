import { NextResponse } from "next/server";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";

const VOICES: Record<string, string> = {
  // Main Odin voice - Brian
  "odin-british-deep-male":
    "nPczCjzI2devNBz1zQrb",

// Main Odin female - Anaya
"odin-british-deep-female":
  "3vbrfmIQGJrswxh7ife4",

// Liverpool male - Matthew Paul
"odin-liverpool-male":
  "m3ERpbBFjTAqD5PJozID",

  // Manchester male - Jay
  "odin-manchester-male":
    "c8MZcZcr0JnMAwkwnTIu",

  // Manchester female - Lady Mancunian
  "odin-manchester-female":
    "ebvB1SoOkqLO7LaJh30d",

  // Yorkshire male - David
  "odin-yorkshire-male":
    "8KgifH3usc0tJtr7QzP4",

  // Yorkshire female - Kirsty
  "odin-yorkshire-female":
    "3HCsOhirtjbPmdcSOPBt",

  // Irish male - Bren
  "odin-irish-male":
    "RlSVB64yXMZJjq67jbB1",

  // Irish female - Louise
  "odin-irish-female":
    "UwtFVYnvYG6hxAbc4I6T",

  // Newcastle / Geordie male - Andy
  "odin-newcastle-male":
    "lfPTQbwnu1oXQ9g6V0r4",

  // Newcastle / Geordie female - Penelope
  "odin-newcastle-female":
    "b6T2IrWoTx7ZIb3BHJSg",
  // Midlands male - Adam Coley
  "odin-midlands-male":
    "jy0kdeDmzKIg50nzOwh5",

  // Midlands female - Kay
  "odin-midlands-female":
    "vBRU4ztAu1MfP8arDoB3",

  // Scottish male - Mark
  "odin-scottish-male":
    "pp4ihOlfDr2MgdTALvoR",

  // Scottish female - Isla Skye
  "odin-scottish-female":
    "TVmbglAk3F1GkiCoOq47",

  // Welsh male - Sam
  "odin-welsh-male":
    "DikmR0aoFXAp1A3NcovW",

  // Welsh female - Hannah
  "odin-welsh-female":
    "73fZMjboCm1aBVyxTbBp",

  // Northern male - Mike
  "odin-northern-male":
    "S1GxattMxHrXozy2QM7J",

  // Northern female - Kerry
  "odin-northern-female":
    "Q7iNt6VsGSsBbtyUto9N",

};

export async function POST(
  request: Request
) {
  await requireCompanyContext();

  const body = await request.json();

  const voiceId =
    typeof body.voiceId === "string"
      ? body.voiceId
      : "";

  const elevenLabsVoiceId =
    VOICES[voiceId];

  if (!elevenLabsVoiceId) {
    return NextResponse.json(
      {
        error:
          "This Odin voice does not have an ElevenLabs voice assigned yet.",
      },
      {
        status: 400,
      }
    );
  }

  const apiKey =
    process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "ElevenLabs API key is not configured.",
      },
      {
        status: 500,
      }
    );
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        text:
          "Hello. I'm Odin. Your commercial intelligence is ready.",
        model_id:
          "eleven_multilingual_v2",
      }),
    }
  );

  if (!response.ok) {
    const error =
      await response.text();

    console.error(
      "ElevenLabs error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Odin could not generate the voice preview.",
      },
      {
        status: 502,
      }
    );
  }

  const audio =
    await response.arrayBuffer();

  return new Response(audio, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}