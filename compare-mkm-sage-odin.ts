import { prisma } from "./lib/prisma";
import * as XLSX from "xlsx";

async function main() {
  // ---------- SAGE ----------
  const workbook = XLSX.readFile("MKM August.xlsx");
  const sheet = workbook.Sheets["SageReportData1"];
  const raw = XLSX.utils.sheet_to_json<any[]>(sheet, {
    header: 1,
    defval: "",
  });

  // Data starts on row 3
  const sageRows = raw.slice(2);

  const sageByDate = new Map<string, number>();

  for (const row of sageRows) {
    const account = String(row[1] ?? "").trim();
    const type = String(row[3] ?? "").trim();
    const amount = Number(row[4] ?? 0);
    const excelDate = Number(row[5]);

    if (account !== "MKMBUILD") continue;
    if (!Number.isFinite(amount)) continue;
    if (!Number.isFinite(excelDate)) continue;

    const parsed = XLSX.SSF.parse_date_code(excelDate);
    if (!parsed) continue;

    const date =
      `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;

    // Sage SC amounts may already be negative.
    // If positive, make them negative.
    const signedAmount =
      type === "SC" && amount > 0 ? -amount : amount;

    sageByDate.set(
      date,
      (sageByDate.get(date) ?? 0) + signedAmount
    );
  }

  // ---------- ODIN ----------
  const odinRows = await prisma.salesInvoice.findMany({
    where: {
      companyId: 1,
      customerAccountCode: "MKMBUILD",
      invoiceDate: {
        gte: new Date("2026-08-01T00:00:00.000Z"),
        lt: new Date("2026-09-01T00:00:00.000Z"),
      },
    },
    select: {
      invoiceNumber: true,
      invoiceDate: true,
      netValue: true,
      invoiceType: true,
    },
    orderBy: {
      invoiceDate: "asc",
    },
  });

  const odinByDate = new Map<string, number>();

  for (const row of odinRows) {
    if (!row.invoiceDate) continue;

    const date = row.invoiceDate.toISOString().slice(0, 10);

    odinByDate.set(
      date,
      (odinByDate.get(date) ?? 0) + (row.netValue ?? 0)
    );
  }

  // ---------- COMPARE ----------
  const dates = Array.from(
    new Set([...sageByDate.keys(), ...odinByDate.keys()])
  ).sort();

  console.log("\nMKM AUGUST - SAGE vs ODIN BY DATE");
  console.log("==================================");

  let sageTotal = 0;
  let odinTotal = 0;

  for (const date of dates) {
    const sage = sageByDate.get(date) ?? 0;
    const odin = odinByDate.get(date) ?? 0;
    const difference = odin - sage;

    sageTotal += sage;
    odinTotal += odin;

    console.log(
      date,
      "Sage:", sage.toFixed(2),
      "Odin:", odin.toFixed(2),
      "Difference:", difference.toFixed(2),
      Math.abs(difference) > 0.005 ? "<-- CHECK" : ""
    );
  }

  console.log("\nTOTALS");
  console.log("======");
  console.log("Sage:", sageTotal.toFixed(2));
  console.log("Odin:", odinTotal.toFixed(2));
  console.log("Difference:", (odinTotal - sageTotal).toFixed(2));

  console.log("\nODIN TRANSACTIONS ON DIFFERENT DAYS");
  console.log("===================================");

  for (const date of dates) {
    const sage = sageByDate.get(date) ?? 0;
    const odin = odinByDate.get(date) ?? 0;

    if (Math.abs(odin - sage) > 0.005) {
      console.log("\nDATE:", date);

      const transactions = odinRows.filter(
        (r) =>
          r.invoiceDate?.toISOString().slice(0, 10) === date
      );

      console.table(
        transactions.map((r) => ({
          invoice: r.invoiceNumber,
          type: r.invoiceType,
          net: r.netValue,
        }))
      );
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
