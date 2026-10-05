import * as XLSX from "xlsx";
import { prisma } from "./lib/prisma";

const FILE_NAME = "UFH Trade Direct All Sales.xlsx";
const COMPANY_ID = 1;

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeName(value: string): string {
  return value
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/\bLIMITED\b/g, " LTD ")
    .replace(/\bLTD\b/g, " ")
    .replace(/\bT\/A\b/g, " ")
    .replace(/\bTRADING AS\b/g, " ")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isBadHettaRecord(name: string): boolean {
  const upper = name.toUpperCase();

  return (
    upper.includes("DO NOT USE") ||
    upper.includes("USE PLUMBLINK ACC") ||
    upper.includes("USE STUARTS ACC")
  );
}

async function main() {
  console.log("");
  console.log("==============================================");
  console.log(" UFH TRADE CUSTOMER MATCHING PREVIEW");
  console.log("==============================================");
  console.log("");

  const workbook = XLSX.readFile(FILE_NAME);
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("Workbook contains no worksheets.");
  }

  const rows = XLSX.utils.sheet_to_json(
    workbook.Sheets[sheetName],
    {
      header: 1,
      defval: null,
    }
  ) as unknown[][];

  /*
   * Build one UFH account record per Sage account code.
   * Also collect total historical sales for context.
   */
  const ufhAccounts = new Map<
    string,
    {
      accountCode: string;
      names: Set<string>;
      netSales: number;
      documentNumbers: Set<string>;
    }
  >();

  for (const row of rows.slice(2)) {
    const accountCode = text(row[1]);
    const customerName = text(row[2]);
    const documentNumber = text(row[3]);

    if (!accountCode) {
      continue;
    }

    const amountNet = Number(row[8] ?? 0);
    const discount = Number(row[9] ?? 0);

    const existing =
      ufhAccounts.get(accountCode) ?? {
        accountCode,
        names: new Set<string>(),
        netSales: 0,
        documentNumbers: new Set<string>(),
      };

    if (customerName) {
      existing.names.add(customerName);
    }

    if (documentNumber) {
      existing.documentNumbers.add(documentNumber);
    }

    if (Number.isFinite(amountNet)) {
      existing.netSales +=
        amountNet -
        (Number.isFinite(discount) ? discount : 0);
    }

    ufhAccounts.set(accountCode, existing);
  }

  const hettaCustomers =
    await prisma.customer.findMany({
      where: {
        companyId: COMPANY_ID,
      },
      select: {
        id: true,
        accountCode: true,
        name: true,
      },
    });

  const usableHetta =
    hettaCustomers.filter(
      (customer) =>
        !isBadHettaRecord(customer.name)
    );

  const byExactName = new Map<
    string,
    typeof usableHetta
  >();

  const byNormalizedName = new Map<
    string,
    typeof usableHetta
  >();

  for (const customer of usableHetta) {
    const exact =
      customer.name.trim().toUpperCase();

    const normalized =
      normalizeName(customer.name);

    byExactName.set(
      exact,
      [
        ...(byExactName.get(exact) ?? []),
        customer,
      ]
    );

    if (normalized) {
      byNormalizedName.set(
        normalized,
        [
          ...(byNormalizedName.get(normalized) ?? []),
          customer,
        ]
      );
    }
  }

  const exactMatches: any[] = [];
  const normalizedMatches: any[] = [];
  const ambiguousMatches: any[] = [];
  const unmatched: any[] = [];

  for (const account of ufhAccounts.values()) {
    const names = [...account.names];

    /*
     * Normally Sage should have one name per account,
     * but retain all names so we can spot historic renames.
     */
    const primaryName =
      names[names.length - 1] ?? "";

    const exactCandidates =
      byExactName.get(
        primaryName.toUpperCase()
      ) ?? [];

    if (exactCandidates.length === 1) {
      exactMatches.push({
        ufhAccount: account.accountCode,
        ufhName: primaryName,
        hettaAccount:
          exactCandidates[0].accountCode,
        hettaName:
          exactCandidates[0].name,
        documents:
          account.documentNumbers.size,
        netSales:
          Number(account.netSales.toFixed(2)),
      });

      continue;
    }

    const normalized =
      normalizeName(primaryName);

    const normalizedCandidates =
      normalized
        ? byNormalizedName.get(normalized) ?? []
        : [];

    if (normalizedCandidates.length === 1) {
      normalizedMatches.push({
        ufhAccount: account.accountCode,
        ufhName: primaryName,
        hettaAccount:
          normalizedCandidates[0].accountCode,
        hettaName:
          normalizedCandidates[0].name,
        documents:
          account.documentNumbers.size,
        netSales:
          Number(account.netSales.toFixed(2)),
      });

      continue;
    }

    if (
      exactCandidates.length > 1 ||
      normalizedCandidates.length > 1
    ) {
      const candidates =
        exactCandidates.length > 1
          ? exactCandidates
          : normalizedCandidates;

      ambiguousMatches.push({
        ufhAccount: account.accountCode,
        ufhName: primaryName,
        possibleHetta:
          candidates
            .map(
              (customer) =>
                `${customer.accountCode}: ${customer.name}`
            )
            .join(" | "),
        documents:
          account.documentNumbers.size,
        netSales:
          Number(account.netSales.toFixed(2)),
      });

      continue;
    }

    unmatched.push({
      ufhAccount: account.accountCode,
      ufhName: primaryName,
      documents:
        account.documentNumbers.size,
      netSales:
        Number(account.netSales.toFixed(2)),
    });
  }

  exactMatches.sort(
    (a, b) => b.netSales - a.netSales
  );

  normalizedMatches.sort(
    (a, b) => b.netSales - a.netSales
  );

  ambiguousMatches.sort(
    (a, b) => b.netSales - a.netSales
  );

  unmatched.sort(
    (a, b) => b.netSales - a.netSales
  );

  console.log(`UFH accounts: ${ufhAccounts.size}`);
  console.log(`Hetta customers: ${hettaCustomers.length}`);
  console.log(
    `Usable Hetta customers: ${usableHetta.length}`
  );

  console.log("");
  console.log(
    `Exact name matches: ${exactMatches.length}`
  );
  console.log(
    `Normalized strong matches: ${normalizedMatches.length}`
  );
  console.log(
    `Ambiguous matches: ${ambiguousMatches.length}`
  );
  console.log(
    `Unmatched UFH accounts: ${unmatched.length}`
  );

  console.log("");
  console.log("TOP EXACT MATCHES");
  console.table(exactMatches.slice(0, 30));

  console.log("");
  console.log("NORMALIZED STRONG MATCHES");
  console.table(normalizedMatches.slice(0, 30));

  console.log("");
  console.log("AMBIGUOUS - DO NOT AUTO MERGE");
  console.table(ambiguousMatches.slice(0, 30));

  console.log("");
  console.log("TOP UNMATCHED UFH CUSTOMERS");
  console.table(unmatched.slice(0, 30));

  console.log("");
  console.log(
    "PREVIEW ONLY - no customer records were changed."
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
