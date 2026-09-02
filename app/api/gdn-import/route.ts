import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";

type GdnImportRow = {
  "GDNItem.GDNNumber"?: string | number;
  "GDNItem.Date"?: string;
  "GDNItem.AccountReference"?: string;
  "CustomerRecord.AccountName"?: string;
  "GDNItem.SalesOrderNumber"?: string | number;
  "GDNItem.ItemNumber"?: string | number;
  "GDNItem.QuantityOnOrder"?: string | number;
  "GDNItem.ProductAccountReference"?: string;
  "ProductRecord.PartNumber"?: string;
  "GDNItem.Description"?: string;
  "GDNItem.QuantityDespatched"?: string | number;
};

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseSageDate(value: unknown) {
  if (!value) {
    return null;
  }

  const text = String(value).trim();

  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

  if (!match) {
    return null;
  }

  // Sage Data to Excel is currently returning dates such as 7/1/26
  // for 1 July 2026, so this export is month/day/year.
  const month = Number(match[1]);
  const day = Number(match[2]);
  let year = Number(match[3]);

  if (year < 100) {
    year += 2000;
  }

  return new Date(Date.UTC(year, month - 1, day));
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const membership = user.memberships[0];

    if (!membership) {
      return NextResponse.json(
        { error: "No active company membership found." },
        { status: 403 }
      );
    }

    const canImport =
      membership.role?.name === "Company Admin" ||
      membership.role?.name === "Accounts";

    if (!canImport) {
      return NextResponse.json(
        { error: "You do not have permission to import GDN data." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const rows = Array.isArray(body.rows)
      ? (body.rows as GdnImportRow[])
      : [];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No GDN rows were supplied." },
        { status: 400 }
      );
    }

    const groupedRows = new Map<string, GdnImportRow[]>();

    for (const row of rows) {
      const gdnNumber = String(
        row["GDNItem.GDNNumber"] ?? ""
      ).trim();

      if (!gdnNumber) {
        continue;
      }

      const existing = groupedRows.get(gdnNumber) ?? [];
      existing.push(row);
      groupedRows.set(gdnNumber, existing);
    }

    if (groupedRows.size === 0) {
      return NextResponse.json(
        { error: "No valid GDN numbers were found in the supplied rows." },
        { status: 400 }
      );
    }

    let importedGdns = 0;
    let importedLines = 0;

    for (const [gdnNumber, gdnRows] of groupedRows) {
      const firstRow = gdnRows[0];

      const salesOrderNumber = String(
        firstRow["GDNItem.SalesOrderNumber"] ?? ""
      ).trim();

      const customerAccountCode =
        String(
          firstRow["GDNItem.AccountReference"] ?? ""
        ).trim() || null;

      const customerName =
        String(
          firstRow["CustomerRecord.AccountName"] ?? ""
        ).trim() || null;

      const gdnDate = parseSageDate(
        firstRow["GDNItem.Date"]
      );

      const lineData = gdnRows.map((row) => ({
        lineNumber: toNumber(row["GDNItem.ItemNumber"]),
        stockCode:
          String(
            row["GDNItem.ProductAccountReference"] ?? ""
          ).trim() || null,
        partNumber:
          String(
            row["ProductRecord.PartNumber"] ?? ""
          ).trim() ||
          String(
            row["GDNItem.ProductAccountReference"] ?? ""
          ).trim() ||
          null,
        description:
          String(
            row["GDNItem.Description"] ?? ""
          ).trim() || null,
        quantityOrdered: toNumber(
          row["GDNItem.QuantityOnOrder"]
        ),
        quantityDespatched: toNumber(
          row["GDNItem.QuantityDespatched"]
        ),
      }));

      await prisma.goodsDespatchNote.upsert({
        where: {
          companyId_gdnNumber: {
            companyId: membership.companyId,
            gdnNumber,
          },
        },
        update: {
          salesOrderNumber,
          gdnDate,
          customerAccountCode,
          customerName,
          lines: {
            deleteMany: {},
            create: lineData,
          },
        },
        create: {
          companyId: membership.companyId,
          gdnNumber,
          salesOrderNumber,
          gdnDate,
          customerAccountCode,
          customerName,
          lines: {
            create: lineData,
          },
        },
      });

      importedGdns++;
      importedLines += lineData.length;
    }

    return NextResponse.json({
      success: true,
      gdnCount: importedGdns,
      lineCount: importedLines,
    });
  } catch (error) {
    console.error("GDN import failed:", error);

    return NextResponse.json(
      { error: "OdinIQ could not import the GDN data." },
      { status: 500 }
    );
  }
}