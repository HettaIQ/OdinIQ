import { prisma } from "./lib/prisma";

const stockCodes = [
  "AAV",
  "HSACTPIN",
  "HSMC15",
  "HSMFSC16",
  "HSPE16",
  "HSPS16",
  "HSWSP01",
  "HSWSP01-20MM",
  "KIT30HP",
  "KIT40HP",
];

function normalise(
  value: string | null | undefined
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

async function main() {
  console.log(
    "\nChecking missing profitability codes after Xero import...\n"
  );

  for (const code of stockCodes) {
    console.log(
      "\n========================================"
    );
    console.log(`CHECKING: ${code}`);
    console.log(
      "========================================"
    );

    const exactProduct =
      await prisma.product.findUnique({
        where: {
          productCode: code,
        },
        select: {
          id: true,
          productCode: true,
          description: true,
          costPrice: true,
          listPrice: true,
          active: true,
        },
      });

    if (exactProduct) {
      console.log("\nEXACT PRODUCT MATCH");
      console.log(
        `Code: ${exactProduct.productCode}`
      );
      console.log(
        `Description: ${exactProduct.description}`
      );
      console.log(
        `Cost: ${
          exactProduct.costPrice ??
          "NO COST"
        }`
      );
      console.log(
        `List: ${
          exactProduct.listPrice ??
          "NO LIST"
        }`
      );
      console.log(
        `Active: ${exactProduct.active}`
      );
    } else {
      console.log(
        "\nEXACT PRODUCT MATCH: NONE"
      );
    }

    const gdnLines =
      await prisma.goodsDespatchLine.findMany({
        where: {
          OR: [
            {
              stockCode: code,
            },
            {
              partNumber: code,
            },
          ],
        },

        select: {
          stockCode: true,
          partNumber: true,
          description: true,
          quantityDespatched: true,

          goodsDespatchNote: {
            select: {
              gdnNumber: true,
              gdnDate: true,
              customerName: true,
            },
          },
        },

        take: 10,

        orderBy: {
          id: "desc",
        },
      });

    console.log(
      `\nRecent GDN lines: ${gdnLines.length}`
    );

    const descriptions = new Set<string>();

    for (const line of gdnLines) {
      const description =
        line.description ?? "";

      if (description.trim()) {
        descriptions.add(
          description.trim()
        );
      }

      console.log(
        [
          `GDN ${line.goodsDespatchNote.gdnNumber}`,
          line.goodsDespatchNote.customerName ??
            "",
          `Stock ${
            line.stockCode ?? ""
          }`,
          `Part ${
            line.partNumber ?? ""
          }`,
          description,
          `Qty ${
            line.quantityDespatched ??
            0
          }`,
        ].join(" | ")
      );
    }

    /*
     * Search for products with similar codes.
     * Useful for Sage/Xero aliases such as
     * KIT30HP versus HSKIT30.
     */
    const codeSearchTerms = new Set<string>();

    codeSearchTerms.add(code);

    const withoutHS =
      normalise(code).replace(/^HS/, "");

    const withoutHP =
      normalise(code).replace(/HP$/, "");

    const withoutBoth =
      withoutHS.replace(/HP$/, "");

    if (withoutHS.length >= 3) {
      codeSearchTerms.add(withoutHS);
    }

    if (withoutHP.length >= 3) {
      codeSearchTerms.add(withoutHP);
    }

    if (withoutBoth.length >= 3) {
      codeSearchTerms.add(withoutBoth);
    }

    const possibleCodeMatches =
      await prisma.product.findMany({
        where: {
          OR: Array.from(
            codeSearchTerms
          ).flatMap((term) => [
            {
              productCode: {
                contains: term,
              },
            },
            {
              description: {
                contains: term,
              },
            },
          ]),
        },

        select: {
          productCode: true,
          description: true,
          costPrice: true,
          listPrice: true,
          active: true,
        },

        take: 20,
      });

    console.log(
      `\nPossible code matches: ${possibleCodeMatches.length}`
    );

    for (
      const product of possibleCodeMatches
    ) {
      console.log(
        [
          product.productCode,
          product.description,
          `Cost ${
            product.costPrice ??
            "NO COST"
          }`,
          `List ${
            product.listPrice ??
            "NO LIST"
          }`,
          product.active
            ? "ACTIVE"
            : "INACTIVE",
        ].join(" | ")
      );
    }

    /*
     * Search products using the actual GDN
     * descriptions too. This helps where the
     * Sage code and Xero code are completely
     * different.
     */
    const possibleDescriptionMatches: Array<{
  productCode: string;
  description: string;
  costPrice: number | null;
  listPrice: number | null;
  active: boolean;
}> = [];
      [];

    for (const description of descriptions) {
      const words = description
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .map((word) =>
          word.trim()
        )
        .filter(
          (word) => word.length >= 4
        )
        .slice(0, 4);

      if (words.length === 0) {
        continue;
      }

      const matches =
        await prisma.product.findMany({
          where: {
            AND: words.map((word) => ({
              description: {
                contains: word,
              },
            })),
          },

          select: {
            productCode: true,
            description: true,
            costPrice: true,
            listPrice: true,
            active: true,
          },

          take: 10,
        });

      for (const match of matches) {
        if (
          !possibleDescriptionMatches.some(
            (existing) =>
              existing.productCode ===
              match.productCode
          )
        ) {
          possibleDescriptionMatches.push(
            match
          );
        }
      }
    }

    console.log(
      `\nPossible description matches: ${possibleDescriptionMatches.length}`
    );

    for (
      const product of possibleDescriptionMatches
    ) {
      console.log(
        [
          product.productCode,
          product.description,
          `Cost ${
            product.costPrice ??
            "NO COST"
          }`,
          `List ${
            product.listPrice ??
            "NO LIST"
          }`,
          product.active
            ? "ACTIVE"
            : "INACTIVE",
        ].join(" | ")
      );
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });