import { prisma } from "./lib/prisma";
import * as XLSX from "xlsx";

function money(n: number) {
  return Math.round(n * 100);
}

async function main() {
  const workbook = XLSX.readFile("MKM August.xlsx");
  const sheet = workbook.Sheets["SageReportData1"];
  const raw = XLSX.utils.sheet_to_json<any[]>(sheet, {
    header: 1,
    defval: "",
  });

  const dates = ["2026-08-13", "2026-08-21"];

  for (const targetDate of dates) {
    const sage: number[] = [];

    for (const row of raw.slice(2)) {
      if (String(row[1]).trim() !== "MKMBUILD") continue;

      const amount = Number(row[4]);
      const serial = Number(row[5]);

      if (!Number.isFinite(amount) || !Number.isFinite(serial)) continue;

      const d = XLSX.SSF.parse_date_code(serial);
      if (!d) continue;

      const date =
        `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;

      if (date === targetDate) sage.push(money(amount));
    }

    const invoices = await prisma.salesInvoice.findMany({
      where: {
        companyId: 1,
        customerAccountCode: "MKMBUILD",
        invoiceDate: {
          gte: new Date(targetDate + "T00:00:00.000Z"),
          lt: new Date(
            new Date(targetDate + "T00:00:00.000Z").getTime() + 86400000
          ),
        },
      },
      include: { lines: true },
    });

    const odin = invoices.flatMap(inv =>
      inv.lines.map(line => ({
        invoice: inv.invoiceNumber,
        stockCode: line.stockCode,
        description: line.description,
        value: money(line.netValue ?? 0),
      }))
    );

    const sagePool = [...sage];

    const extraOdin: typeof odin = [];

    for (const line of odin) {
      const index = sagePool.indexOf(line.value);

      if (index >= 0) {
        sagePool.splice(index, 1);
      } else if (line.value !== 0) {
        extraOdin.push(line);
      }
    }

    console.log("\n================================");
    console.log(targetDate);
    console.log("================================");

    console.log("\nLINES IN ODIN NOT MATCHED IN SAGE:");
    console.table(
      extraOdin.map(x => ({
        invoice: x.invoice,
        stockCode: x.stockCode,
        description: x.description,
        value: (x.value / 100).toFixed(2),
      }))
    );

    console.log("\nLINES IN SAGE NOT MATCHED IN ODIN:");
    console.log(sagePool.map(x => (x / 100).toFixed(2)));

    const extraOdinTotal =
      extraOdin.reduce((s, x) => s + x.value, 0) / 100;

    const extraSageTotal =
      sagePool.reduce((s, x) => s + x, 0) / 100;

    console.log("\nUnmatched Odin total:", extraOdinTotal.toFixed(2));
    console.log("Unmatched Sage total:", extraSageTotal.toFixed(2));
    console.log(
      "Net difference:",
      (extraOdinTotal - extraSageTotal).toFixed(2)
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
