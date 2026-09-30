import { prisma } from "./lib/prisma";
import * as XLSX from "xlsx";

async function main() {
  const workbook = XLSX.readFile("MKM August.xlsx");
  const sheet = workbook.Sheets["SageReportData1"];

  const raw = XLSX.utils.sheet_to_json<any[]>(sheet, {
    header: 1,
    defval: "",
  });

  const datesToCheck = ["2026-08-13", "2026-08-21"];

  for (const targetDate of datesToCheck) {
    console.log("\n======================================");
    console.log("CHECKING", targetDate);
    console.log("======================================");

    // SAGE LINES
    const sageLines: number[] = [];

    for (const row of raw.slice(2)) {
      if (String(row[1]).trim() !== "MKMBUILD") continue;

      const amount = Number(row[4]);
      const excelDate = Number(row[5]);

      if (!Number.isFinite(amount) || !Number.isFinite(excelDate)) continue;

      const d = XLSX.SSF.parse_date_code(excelDate);
      if (!d) continue;

      const date =
        `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;

      if (date === targetDate) {
        sageLines.push(amount);
      }
    }

    console.log("\nSAGE LINE VALUES:");
    console.log(sageLines.sort((a, b) => a - b));

    console.log(
      "SAGE TOTAL:",
      sageLines.reduce((a, b) => a + b, 0).toFixed(2)
    );

    // ODIN INVOICES + LINES
    const invoices = await prisma.salesInvoice.findMany({
      where: {
        companyId: 1,
        customerAccountCode: "MKMBUILD",
        invoiceDate: {
          gte: new Date(targetDate + "T00:00:00.000Z"),
          lt: new Date(
            new Date(targetDate + "T00:00:00.000Z").getTime() +
              24 * 60 * 60 * 1000
          ),
        },
      },
      include: {
        lines: true,
      },
      orderBy: {
        invoiceNumber: "asc",
      },
    });

    console.log("\nODIN INVOICES:");

    for (const inv of invoices) {
      const lineTotal = inv.lines.reduce(
        (sum, line) => sum + (line.netValue ?? 0),
        0
      );

      console.log(
        "\nInvoice:",
        inv.invoiceNumber,
        "Header:",
        (inv.netValue ?? 0).toFixed(2),
        "Lines:",
        lineTotal.toFixed(2),
        "Difference:",
        ((inv.netValue ?? 0) - lineTotal).toFixed(2)
      );

      console.table(
        inv.lines.map((line) => ({
          line: line.lineNumber,
          stockCode: line.stockCode,
          description: line.description,
          quantity: line.quantity,
          net: line.netValue,
        }))
      );
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
