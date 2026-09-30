import { prisma } from "./lib/prisma";
import * as XLSX from "xlsx";

const FILE = "IBC Branches July 2026.xlsx";
const OUTPUT = "IBC-OdinIQ-Sales-Check.xlsx";

// Generic merchant words should contribute little/no value to a match.
const STOP_WORDS = new Set([
  "ltd",
  "limited",
  "the",
  "and",
  "co",
  "company",
  "t",
  "a",
  "ta",
  "builders",
  "builder",
  "building",
  "merchant",
  "merchants",
  "supplies",
  "supply",
  "plumbing",
  "heating",
  "timber",
  "roofing",
  "products",
  "product",
  "trade",
  "direct",
  "branch",
]);

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function normalize(value: unknown): string {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePostcode(value: unknown): string {
  return clean(value).toUpperCase().replace(/\s+/g, "");
}

function significantWords(value: unknown): string[] {
  return normalize(value)
    .split(" ")
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word));
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function similarity(a: unknown, b: unknown): number {
  const aw = unique(significantWords(a));
  const bw = unique(significantWords(b));

  if (!aw.length || !bw.length) return 0;

  const common = aw.filter((word) => bw.includes(word));
  const union = unique([...aw, ...bw]);

  return union.length ? common.length / union.length : 0;
}

function exactNormalizedName(a: unknown, b: unknown): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  return Boolean(na && nb && na === nb);
}

function distinctiveExact(a: unknown, b: unknown): boolean {
  const aw = significantWords(a);
  const bw = significantWords(b);

  if (!aw.length || !bw.length) return false;

  return (
    aw.length === bw.length &&
    aw.every((word) => bw.includes(word)) &&
    bw.every((word) => aw.includes(word))
  );
}

function containsDistinctiveName(a: unknown, b: unknown): boolean {
  const aw = significantWords(a);
  const bw = significantWords(b);

  if (!aw.length || !bw.length) return false;

  const shorter = aw.length <= bw.length ? aw : bw;
  const longer = aw.length <= bw.length ? bw : aw;

  if (shorter.length < 2) return false;

  return shorter.every((word) => longer.includes(word));
}

function money(value: number): string {
  return value.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
  });
}

function dateText(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toLocaleDateString("en-GB");
}

type MatchLevel = "CONFIRMED" | "REVIEW" | "NO MATCH";

type Candidate = {
  customer: any;
  level: MatchLevel;
  reason: string;
  score: number;
};

async function main() {
  console.log("");
  console.log("IBC MEMBER SALES CHECK - VERSION 2");
  console.log("==================================");
  console.log("");

  const workbook = XLSX.readFile(FILE);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // Row 1 is the IBC title. Row 2 contains the actual headings.
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    range: 1,
  });

  console.log(`IBC spreadsheet rows: ${rows.length}`);

  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      accountCode: true,
      name: true,
      buyingGroup: true,
      addressLine: true,
      town: true,
      postcode: true,
    },
  });

  console.log(`OdinIQ customers: ${customers.length}`);

  const invoices = await prisma.salesInvoice.findMany({
    select: {
      id: true,
      invoiceNumber: true,
      invoiceDate: true,
      invoiceType: true,
      customerAccountCode: true,
      customerName: true,
      netValue: true,
    },
  });

  const invoicesByAccount = new Map<string, typeof invoices>();

  for (const invoice of invoices) {
    const code = normalize(invoice.customerAccountCode);
    if (!code) continue;

    if (!invoicesByAccount.has(code)) {
      invoicesByAccount.set(code, []);
    }

    invoicesByAccount.get(code)!.push(invoice);
  }

  function evaluateCandidate(
    member: string,
    branch: string,
    city: string,
    postcode: string,
    customer: any
  ): Candidate {
    const customerPostcode = normalizePostcode(customer.postcode);
    const ibcPostcode = normalizePostcode(postcode);

    const memberExact = exactNormalizedName(member, customer.name);
    const branchExact = exactNormalizedName(branch, customer.name);

    const memberDistinctiveExact = distinctiveExact(member, customer.name);
    const branchDistinctiveExact = distinctiveExact(branch, customer.name);

    const memberContains = containsDistinctiveName(member, customer.name);
    const branchContains = containsDistinctiveName(branch, customer.name);

    const memberSimilarity = similarity(member, customer.name);
    const branchSimilarity = similarity(branch, customer.name);

    const bestSimilarity = Math.max(memberSimilarity, branchSimilarity);

    const postcodeExact =
      Boolean(ibcPostcode) &&
      Boolean(customerPostcode) &&
      ibcPostcode === customerPostcode;

    const cityNorm = normalize(city);
    const townNorm = normalize(customer.town);

    const townMatch =
      Boolean(cityNorm) &&
      Boolean(townNorm) &&
      (cityNorm === townNorm ||
        cityNorm.includes(townNorm) ||
        townNorm.includes(cityNorm));

    // Highest confidence: same postcode plus credible name evidence.
    if (
      postcodeExact &&
      (memberExact ||
        branchExact ||
        memberDistinctiveExact ||
        branchDistinctiveExact ||
        bestSimilarity >= 0.5)
    ) {
      return {
        customer,
        level: "CONFIRMED",
        reason: "POSTCODE + NAME",
        score: 100 + Math.round(bestSimilarity * 20),
      };
    }

    // Exact full normalized company/branch name.
    if (memberExact || branchExact) {
      return {
        customer,
        level: "CONFIRMED",
        reason: "EXACT NAME",
        score: 95,
      };
    }

    // Same distinctive words after stripping Ltd, Builders, Merchants etc.
    if (memberDistinctiveExact || branchDistinctiveExact) {
      return {
        customer,
        level: "CONFIRMED",
        reason: "DISTINCTIVE NAME",
        score: 90,
      };
    }

    // Very close name plus same town.
    if (townMatch && bestSimilarity >= 0.67) {
      return {
        customer,
        level: "CONFIRMED",
        reason: "NAME + TOWN",
        score: 85 + Math.round(bestSimilarity * 10),
      };
    }

    // Exact postcode alone is useful, but not enough to auto-confirm.
    if (postcodeExact) {
      return {
        customer,
        level: "REVIEW",
        reason: "POSTCODE ONLY",
        score: 75,
      };
    }

    // Strong distinctive-name resemblance is review only.
    if (bestSimilarity >= 0.67) {
      return {
        customer,
        level: "REVIEW",
        reason: "SIMILAR NAME",
        score: 65 + Math.round(bestSimilarity * 10),
      };
    }

    // Containment can catch trading-name variations but must be reviewed.
    if (memberContains || branchContains) {
      return {
        customer,
        level: "REVIEW",
        reason: "PARTIAL DISTINCTIVE NAME",
        score: 60,
      };
    }

    return {
      customer,
      level: "NO MATCH",
      reason: "",
      score: 0,
    };
  }

  const confirmedRows: any[] = [];
  const reviewRows: any[] = [];
  const noMatchRows: any[] = [];

  const confirmedAccountCodes = new Set<string>();

  let processed = 0;

  for (const row of rows) {
    const member = clean(row["Member"]);
    const branch = clean(row["Branch"]);
    const street = clean(row["Street"]);
    const city = clean(row["City"]);
    const county = clean(row["County"]);
    const postcode = clean(row["Post Code"]);

    if (!member && !branch) continue;

    processed++;

    const candidates = customers
      .map((customer) =>
        evaluateCandidate(member, branch, city, postcode, customer)
      )
      .filter((candidate) => candidate.level !== "NO MATCH")
      .sort((a, b) => {
        const levelRank = (level: MatchLevel) =>
          level === "CONFIRMED" ? 2 : level === "REVIEW" ? 1 : 0;

        const levelDifference =
          levelRank(b.level) - levelRank(a.level);

        if (levelDifference !== 0) return levelDifference;

        return b.score - a.score;
      });

    const best = candidates[0];

    if (!best) {
      noMatchRows.push({
        Member: member,
        Branch: branch,
        Street: street,
        City: city,
        County: county,
        Postcode: postcode,
        Status: "NO MATCH",
      });

      continue;
    }

    const customer = best.customer;
    const accountCode = clean(customer.accountCode);
    const accountInvoices =
      invoicesByAccount.get(normalize(accountCode)) ?? [];

    const invoiceCount = accountInvoices.length;

    const netSales = accountInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.netValue ?? 0),
      0
    );

    const invoiceDates = accountInvoices
      .map((invoice) => invoice.invoiceDate)
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => a.getTime() - b.getTime());

    const firstSale = invoiceDates.length ? invoiceDates[0] : null;
    const lastSale = invoiceDates.length
      ? invoiceDates[invoiceDates.length - 1]
      : null;

    const outputRow = {
      "IBC Member": member,
      "IBC Branch": branch,
      "IBC Street": street,
      "IBC City": city,
      "IBC County": county,
      "IBC Postcode": postcode,
      "Odin Account": accountCode,
      "Odin Customer": customer.name,
      "Odin Postcode": clean(customer.postcode),
      "Odin Town": clean(customer.town),
      "Current Buying Group": clean(customer.buyingGroup),
      "Match Status": best.level,
      "Match Reason": best.reason,
      "Match Score": best.score,
      "Invoice Count": invoiceCount,
      "Net Sales": netSales,
      "First Sale": dateText(firstSale),
      "Last Sale": dateText(lastSale),
    };

    if (best.level === "CONFIRMED") {
      confirmedRows.push(outputRow);

      if (accountCode) {
        confirmedAccountCodes.add(normalize(accountCode));
      }
    } else {
      reviewRows.push(outputRow);
    }
  }

  // Calculate sales once per confirmed Odin account.
  // This prevents an account being counted repeatedly if IBC lists
  // several branches that all resolve to the same Odin customer.
  let uniqueConfirmedSales = 0;
  let uniqueConfirmedInvoices = 0;
  let confirmedAccountsWithSales = 0;

  for (const accountCode of confirmedAccountCodes) {
    const accountInvoices = invoicesByAccount.get(accountCode) ?? [];

    if (accountInvoices.length > 0) {
      confirmedAccountsWithSales++;
    }

    uniqueConfirmedInvoices += accountInvoices.length;

    uniqueConfirmedSales += accountInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.netValue ?? 0),
      0
    );
  }

  confirmedRows.sort(
    (a, b) => Number(b["Net Sales"]) - Number(a["Net Sales"])
  );

  reviewRows.sort(
    (a, b) => Number(b["Match Score"]) - Number(a["Match Score"])
  );

  console.log("");
  console.log("SUMMARY");
  console.log("-------");
  console.log(`IBC rows checked:             ${processed}`);
  console.log(`Confirmed IBC rows:           ${confirmedRows.length}`);
  console.log(`Possible matches for review:  ${reviewRows.length}`);
  console.log(`No match / prospects:         ${noMatchRows.length}`);
  console.log(
    `Unique confirmed Odin accounts: ${confirmedAccountCodes.size}`
  );
  console.log(
    `Confirmed accounts with sales: ${confirmedAccountsWithSales}`
  );
  console.log(`Confirmed invoice count:      ${uniqueConfirmedInvoices}`);
  console.log(`Confirmed net sales:          ${money(uniqueConfirmedSales)}`);

  console.log("");
  console.log("CONFIRMED IBC CUSTOMERS WITH SALES");
  console.log("----------------------------------");

  const confirmedWithSales = confirmedRows.filter(
    (row) => Number(row["Invoice Count"]) > 0
  );

  if (!confirmedWithSales.length) {
    console.log("None");
  } else {
    for (const row of confirmedWithSales) {
      console.log(
        `${row["IBC Member"]} - ${row["IBC Branch"]}`
      );
      console.log(
        `  -> ${row["Odin Account"]} | ${row["Odin Customer"]}`
      );
      console.log(
        `  Match: ${row["Match Reason"]} | Invoices: ${row["Invoice Count"]} | Net sales: ${money(
          Number(row["Net Sales"])
        )}`
      );
      console.log(
        `  First: ${row["First Sale"] || "-"} | Last: ${
          row["Last Sale"] || "-"
        } | Current group: ${row["Current Buying Group"] || "-"}`
      );
      console.log("");
    }
  }

  const outputWorkbook = XLSX.utils.book_new();

  const confirmedSheet = XLSX.utils.json_to_sheet(confirmedRows);
  const reviewSheet = XLSX.utils.json_to_sheet(reviewRows);
  const noMatchSheet = XLSX.utils.json_to_sheet(noMatchRows);

  confirmedSheet["!cols"] = [
    { wch: 35 },
    { wch: 35 },
    { wch: 35 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 15 },
    { wch: 38 },
    { wch: 12 },
    { wch: 18 },
    { wch: 20 },
    { wch: 16 },
    { wch: 24 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];

  reviewSheet["!cols"] = confirmedSheet["!cols"];
  noMatchSheet["!cols"] = [
    { wch: 35 },
    { wch: 35 },
    { wch: 35 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(
    outputWorkbook,
    confirmedSheet,
    "Confirmed IBC Customers"
  );

  XLSX.utils.book_append_sheet(
    outputWorkbook,
    reviewSheet,
    "Possible Matches - Review"
  );

  XLSX.utils.book_append_sheet(
    outputWorkbook,
    noMatchSheet,
    "No Match - Prospects"
  );

  XLSX.writeFile(outputWorkbook, OUTPUT);

  console.log(`Created: ${OUTPUT}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });