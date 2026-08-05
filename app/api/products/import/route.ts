import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

type SpreadsheetRow = unknown[];
type MappedRow = Record<string, unknown>;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "No file uploaded." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const workbook = XLSX.read(buffer, {
      type: "buffer",
    });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return NextResponse.json(
        { message: "OdinIQ could not find a worksheet in this file." },
        { status: 400 }
      );
    }

    const rawRows = XLSX.utils.sheet_to_json<SpreadsheetRow>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    });

    const headerRowIndex = rawRows.findIndex((row) => {
      const cells = row.map((cell) =>
        String(cell).trim().toLowerCase()
      );

      return (
        cells.includes("product code") &&
        cells.includes("description")
      );
    });

    if (headerRowIndex === -1) {
      return NextResponse.json(
        {
          message:
            'OdinIQ could not find a row containing "Product Code" and "Description".',
        },
        { status: 400 }
      );
    }

    const originalHeaders = rawRows[headerRowIndex];
    const usedHeaders = new Map<string, number>();

    const headers = originalHeaders.map((value, index) => {
      const basicHeader =
        String(value).trim() || `Unused Column ${index + 1}`;

      const existingCount = usedHeaders.get(basicHeader) ?? 0;
      usedHeaders.set(basicHeader, existingCount + 1);

      return existingCount === 0
        ? basicHeader
        : `${basicHeader} ${existingCount + 1}`;
    });

    const allDataRows = rawRows
      .slice(headerRowIndex + 1)
      .filter((row) =>
        row.some((cell) => String(cell).trim() !== "")
      );

    const mappedRows: MappedRow[] = allDataRows.map((row) =>
      Object.fromEntries(
        headers.map((header, index) => [
          header,
          row[index] ?? "",
        ])
      )
    );

    const productCodeHeader = headers.find(
      (header) => header.trim().toLowerCase() === "product code"
    );

    const descriptionHeader = headers.find(
      (header) => header.trim().toLowerCase() === "description"
    );

    if (!productCodeHeader || !descriptionHeader) {
      return NextResponse.json(
        {
          message:
            'OdinIQ could not identify the "Product Code" and "Description" columns.',
        },
        { status: 400 }
      );
    }

    const firstProductIndex = mappedRows.findIndex((row) => {
      const productCode = String(
        row[productCodeHeader] ?? ""
      ).trim();

      const description = String(
        row[descriptionHeader] ?? ""
      ).trim();

      return productCode !== "" && description !== "";
    });

    if (firstProductIndex === -1) {
      return NextResponse.json(
        {
          message:
            "OdinIQ found the headings but could not find any product rows.",
        },
        { status: 400 }
      );
    }

    const rowsBeforeProducts = mappedRows.slice(
      0,
      firstProductIndex
    );

    const coreProductHeaders = new Set([
      "product code",
      "description",
      "supplier",
      "cost to us",
      "may 26 price",
      "% increase",
      "our addon",
      "new price",
    ]);

    const merchantDiscounts = headers
      .filter((header) => {
        const normalisedHeader = header.trim().toLowerCase();

        return (
          !coreProductHeaders.has(normalisedHeader) &&
          !normalisedHeader.startsWith("unused column")
        );
      })
      .map((header) => {
        const matchedRow = rowsBeforeProducts.find((row) => {
          const value = String(row[header] ?? "").trim();

          return /^\d+(\.\d+)?%$/.test(value);
        });

        return {
          merchant: header,
          discount: matchedRow
            ? String(matchedRow[header]).trim()
            : "",
        };
      })
      .filter((item) => item.discount !== "");

    const products = mappedRows
      .slice(firstProductIndex)
      .filter((row) => {
        const productCode = String(
          row[productCodeHeader] ?? ""
        ).trim();

        const description = String(
          row[descriptionHeader] ?? ""
        ).trim();

        return productCode !== "" || description !== "";
      });

    return NextResponse.json({
      message: "Commercial file analysed successfully.",
      fileName: file.name,
      sheetName,
      detectedHeaderRow: headerRowIndex + 1,
      merchantDiscountCount: merchantDiscounts.length,
      merchantDiscounts,
      productCount: products.length,
      headers,
      products,
      preview: products.slice(0, 10),
    });
  } catch (error) {
    console.error("OdinIQ import error:", error);

    return NextResponse.json(
      {
        message: "Import failed.",
        error:
          error instanceof Error
            ? error.message
            : "Unknown import error",
      },
      { status: 500 }
    );
  }
}
