import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";

import { requireAuth } from "@/lib/auth/requireAuth";

export const runtime = "nodejs";

function moneyToNumber(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value.replace(/,/g, "").trim());

  return Number.isFinite(parsed) ? parsed : null;
}

function textMatch(text: string, pattern: RegExp) {
  const match = text.match(pattern);

  return match?.[1]?.trim() ?? null;
}

function parseGrundfosInvoice(text: string) {
  const invoiceNumber = textMatch(
    text,
    /Invoice\s+(\d+)/i,
  );

  const invoiceDate = textMatch(
    text,
    /^Date\s+(\d{2}\.\d{2}\.\d{4})/im,
  );

  const customerReference = textMatch(
    text,
    /Customer Reference\s+([^\r\n]+)/i,
  );

  const deliveryNoteMatch = text.match(
    /Delivery note\s+(\S+)\s*\/\s*(\d{2}\.\d{2}\.\d{4})/i,
  );

  const orderMatch = text.match(
    /^Order\s+(\S+)\s*\/\s*(\d{2}\.\d{2}\.\d{4})/im,
  );

  const itemMatch = text.match(
    /^(\d+)\s+(\d+)\s+(\d{2}\.\d{2}\.\d{4})\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)\s*$/m,
  );

  let description: string | null = null;

  if (itemMatch) {
    const itemLineEnd =
      (itemMatch.index ?? 0) + itemMatch[0].length;

    description =
      text
        .slice(itemLineEnd)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.length > 0) ?? null;
  }

  const vatMatch = text.match(
    /Output Tax\s+([\d.]+)\s*%\s+([\d,.]+)/i,
  );

  return {
    supplierName: "Grundfos Pumps Ltd",
    supplierAccountCode: "GRUND",

    invoiceNumber,
    invoiceDate,
    customerReference,

    deliveryNoteNumber:
      deliveryNoteMatch?.[1] ?? null,

    deliveryDate:
      deliveryNoteMatch?.[2] ?? null,

    supplierOrderNumber:
      orderMatch?.[1] ?? null,

    supplierOrderDate:
      orderMatch?.[2] ?? null,

    line: itemMatch
      ? {
          lineNumber: Number(itemMatch[1]),
          productCode: itemMatch[2],
          itemDate: itemMatch[3],
          quantity: moneyToNumber(itemMatch[4]),
          unitPrice: moneyToNumber(itemMatch[5]),
          netValue: moneyToNumber(itemMatch[6]),
          description,
        }
      : null,

    itemsTotal: moneyToNumber(
      textMatch(
        text,
        /Items total\s+([\d,.]+)/i,
      ) ?? undefined,
    ),

    vatRate: vatMatch
      ? moneyToNumber(vatMatch[1])
      : null,

    vatValue: vatMatch
      ? moneyToNumber(vatMatch[2])
      : null,

    totalNet: moneyToNumber(
      textMatch(
        text,
        /Total Net Amount\s+([\d,.]+)/i,
      ) ?? undefined,
    ),

    finalAmount: moneyToNumber(
      textMatch(
        text,
        /Final amount\s+GBP\s+([\d,.]+)/i,
      ) ?? undefined,
    ),

    currency: "GBP",
  };
}

async function readInvoice(file: File) {
  const arrayBuffer = await file.arrayBuffer();

  const parser = new PDFParse({
    data: Buffer.from(arrayBuffer),
  });

  try {
    const result = await parser.getText();

    const invoice = parseGrundfosInvoice(
      result.text,
    );

    if (
      !invoice.invoiceNumber ||
      !invoice.invoiceDate ||
      !invoice.line
    ) {
      return {
        success: false as const,
        fileName: file.name,
        error:
          "Odin could read the PDF but could not identify the expected Grundfos invoice fields.",
      };
    }

    return {
      success: true as const,
      fileName: file.name,
      invoice,
    };
  } finally {
    await parser.destroy();
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();

    const membership = user.memberships[0];

    if (!membership) {
      return NextResponse.json(
        {
          error: "No company membership found.",
        },
        { status: 403 },
      );
    }

    const canImport =
      user.platformRole === "SUPER_ADMIN" ||
      Boolean(
        membership.role?.permissions.some(
          ({ permission }) =>
            permission.key === "imports.manage",
        ),
      );

    if (!canImport) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to import supplier bills.",
        },
        { status: 403 },
      );
    }

    const formData = await request.formData();

    const files = formData
      .getAll("files")
      .filter(
        (entry): entry is File =>
          entry instanceof File,
      );

    if (files.length === 0) {
      const singleFile = formData.get("file");

      if (singleFile instanceof File) {
        files.push(singleFile);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        {
          error: "No PDF files were supplied.",
        },
        { status: 400 },
      );
    }

    const invalidFile = files.find(
      (file) =>
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf"),
    );

    if (invalidFile) {
      return NextResponse.json(
        {
          error: `${invalidFile.name} is not a PDF.`,
        },
        { status: 400 },
      );
    }

    const results = [];

    for (const file of files) {
      try {
        results.push(
          await readInvoice(file),
        );
      } catch (error) {
        console.error(
          `Supplier bill PDF preview failed for ${file.name}:`,
          error,
        );

        results.push({
          success: false as const,
          fileName: file.name,
          error:
            "Odin could not read this supplier invoice.",
        });
      }
    }

    const successful = results.filter(
      (result) => result.success,
    );

    const failed = results.filter(
      (result) => !result.success,
    );

    return NextResponse.json({
      success: failed.length === 0,
      filesReceived: files.length,
      filesParsed: successful.length,
      filesFailed: failed.length,
      results,
    });
  } catch (error) {
    console.error(
      "Supplier bill batch preview failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Odin could not process the supplier invoices.",
      },
      { status: 500 },
    );
  }
}