import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getApiCompanyContext } from "@/lib/auth/getApiCompanyContext";

export const runtime = "nodejs";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const context = await getApiCompanyContext();

    if (context.status === "UNAUTHENTICATED") {
      return NextResponse.json(
        { error: "Unauthenticated." },
        { status: 401 }
      );
    }

    if (context.status === "NO_COMPANY") {
      return NextResponse.json(
        { error: "No active company selected." },
        { status: 403 }
      );
    }

    const {
  user,
  membership,
  companyId,
} = context;

const canCreateVoiceNotes =
  user.platformRole === "SUPER_ADMIN" ||
  Boolean(
    membership.role?.permissions.some(
      ({ permission }) =>
        permission.key === "voice_notes.create",
    ),
  );

if (!canCreateVoiceNotes) {
  return NextResponse.json(
    {
      error:
        "You do not have permission to add customer voice notes.",
    },
    {
      status: 403,
    },
  );
}

const formData = await request.formData();

    const customerId = Number(formData.get("customerId"));
    const audio = formData.get("audio");

    if (!customerId || !(audio instanceof File)) {
      return NextResponse.json(
        {
          error: "Customer and audio recording are required.",
        },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        companyId: companyId,
      },
    });

    if (!customer) {
      return NextResponse.json(
        {
          error: "Customer could not be found.",
        },
        { status: 404 }
      );
    }

    const uploadDirectory = path.join(
      process.cwd(),
      "public",
      "uploads",
      "voice-notes"
    );

    await mkdir(uploadDirectory, {
      recursive: true,
    });

    const extension =
      audio.type.includes("mp4")
        ? "mp4"
        : audio.type.includes("ogg")
        ? "ogg"
        : "webm";

    const fileName = `${customer.id}-${Date.now()}.${extension}`;

    const filePath = path.join(uploadDirectory, fileName);

    const bytes = await audio.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(filePath, buffer);

let transcript: string | null = null;

try {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: "gpt-4o-mini-transcribe",
  });

  transcript = transcription.text;
} catch (error) {
  console.error("Voice note transcription failed:", error);
}
let summary: string | null = null;
let suggestedTaskTitle: string | null = null;
let suggestedTaskDescription: string | null = null;
let suggestedTaskPriority: string | null = null;
let suggestedTaskDueDate: Date | null = null;
let opportunitySummary: string | null = null;
let sentiment: string | null = null;

if (transcript) {
  try {
    const response = await openai.responses.create({
      model: "gpt-5-mini",
      input: [
        {
          role: "system",
          content:
            "You are OdinIQ, a commercial intelligence assistant. Analyse customer voice-note transcripts. Extract only information supported by the transcript. Do not invent commercial facts, tasks, dates or opportunities.",
        },
        {
          role: "user",
          content: transcript,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "commercial_voice_note_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: {
                type: ["string", "null"],
              },
              suggestedTaskTitle: {
                type: ["string", "null"],
              },
              suggestedTaskDescription: {
                type: ["string", "null"],
              },
              suggestedTaskPriority: {
                type: ["string", "null"],
                enum: ["LOW", "MEDIUM", "HIGH", null],
              },
              suggestedTaskDueDate: {
                type: ["string", "null"],
                description:
                  "ISO date in YYYY-MM-DD format if a follow-up date is clearly stated or directly inferable from the transcript.",
              },
              opportunitySummary: {
                type: ["string", "null"],
              },
              sentiment: {
                type: ["string", "null"],
                enum: ["POSITIVE", "NEUTRAL", "NEGATIVE", null],
              },
            },
            required: [
              "summary",
              "suggestedTaskTitle",
              "suggestedTaskDescription",
              "suggestedTaskPriority",
              "suggestedTaskDueDate",
              "opportunitySummary",
              "sentiment",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const analysis = JSON.parse(response.output_text);

    summary = analysis.summary;
    suggestedTaskTitle = analysis.suggestedTaskTitle;
    suggestedTaskDescription = analysis.suggestedTaskDescription;
    suggestedTaskPriority = analysis.suggestedTaskPriority;
    opportunitySummary = analysis.opportunitySummary;
    sentiment = analysis.sentiment;

    suggestedTaskDueDate = analysis.suggestedTaskDueDate
      ? new Date(`${analysis.suggestedTaskDueDate}T12:00:00`)
      : null;
  } catch (error) {
    console.error("Voice note intelligence failed:", error);
  }
}
const audioUrl = `/uploads/voice-notes/${fileName}`;

const voiceNote = await prisma.customerVoiceNote.create({
  data: {
  companyId: companyId,
  customerId: customer.id,
  createdByMembershipId: membership.id,
  audioUrl,
  mimeType: audio.type || null,
  transcript,
  summary,
  suggestedTaskTitle,
  suggestedTaskDescription,
  suggestedTaskPriority,
  suggestedTaskDueDate,
  opportunitySummary,
  sentiment,
},
});

    await prisma.customerTimelineEntry.create({
      data: {
        customerId: customer.id,
        type: "VOICE_NOTE",
        title: "Voice note added",
        description: "Customer voice note recorded.",
        reference: `VOICE-${voiceNote.id}`,
        createdBy: user.name ?? user.email,
      },
    });

    return NextResponse.json({
      success: true,
      voiceNoteId: voiceNote.id,
      audioUrl: voiceNote.audioUrl,
    });
  } catch (error) {
    console.error("Voice note upload failed:", error);

    return NextResponse.json(
      {
        error: "Voice note could not be saved.",
      },
      { status: 500 }
    );
  }
}


