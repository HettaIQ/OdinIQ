import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";
import {
  calculatePipeMetres,
  getPipeProduct,
  PIPE_PRODUCTS,
} from "@/lib/purchase-intelligence/pipe";

function calculatePurchaseLineMetres(
  purchaseOrderNumber: string,
  productCode: string | null,
  quantity: number
) {
  // Historical Sage exception: PO 13306 stored pipe quantity in metres, not coils.
  if (purchaseOrderNumber === "13306" && getPipeProduct(productCode)) {
    return quantity;
  }

  return calculatePipeMetres(productCode, quantity) ?? 0;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function money(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function number(value: number) {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 0,
  }).format(value);
}

function percentage(value: number | null) {
  if (value === null) return "-";

  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(1)}%`;
}

function ordinal(day: number) {
  if (day >= 11 && day <= 13) return `${day}th`;

  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

type ProductGroup =
  | "PIPE"
  | "FITTINGS"
  | "MLCP"
  | "MANIFOLDS"
  | "CONTROLS"
  | "PUMPS"
  | "TOOLS"
  | "ACCESSORIES"
  | "OTHER";

const PRODUCT_GROUPS: {
  value: ProductGroup;
  label: string;
}[] = [
  { value: "PIPE", label: "Pipe" },
  { value: "FITTINGS", label: "Fittings" },
  { value: "MLCP", label: "MLCP" },
  { value: "MANIFOLDS", label: "Manifolds" },
  { value: "CONTROLS", label: "Controls" },
  { value: "PUMPS", label: "Pumps" },
  { value: "TOOLS", label: "Tools" },
  { value: "ACCESSORIES", label: "Accessories" },
  { value: "OTHER", label: "Other" },
];

function classifyProduct(
  code: string,
  description: string
): ProductGroup {
  const normalisedCode = code.trim().toUpperCase();
  const text = `${normalisedCode} ${description}`.toUpperCase();

  // Tools must be identified before pipe or MLCP.
  if (
    text.includes("TOOL") ||
    text.includes("JAW") ||
    text.includes("PRESS GUN") ||
    text.includes("CALIBRATOR") ||
    text.includes("DECOILER")
  ) {
    return "TOOLS";
  }

  // Accessories must be identified before generic pipe wording.
  if (
    text.includes("CLIP") ||
    text.includes("RAIL") ||
    text.includes("STAPLE") ||
    text.includes("EDGE") ||
    text.includes("CONDUIT") ||
    text.includes("BEND") ||
    text.includes("SLEEVE")
  ) {
    return "ACCESSORIES";
  }

  if (text.includes("MANIFOLD")) {
    return "MANIFOLDS";
  }

  if (
    text.includes("PUMP") ||
    text.includes("GRUNDFOS")
  ) {
    return "PUMPS";
  }

  if (
    text.includes("THERMOSTAT") ||
    text.includes("ACTUATOR") ||
    text.includes("WIRING CENTRE") ||
    text.includes("WIRING CENTER") ||
    text.includes("CONTROL")
  ) {
    return "CONTROLS";
  }

  // MLCP includes HSINS pre-insulated pipe and MLCP/multilayer products.
  // PERT-AL-PERT HSPAP pipe remains in the PIPE family.
  if (
    normalisedCode.includes("HSINS") ||
    text.includes("MLCP") ||
    text.includes("MULTILAYER")
  ) {
    return "MLCP";
  }

  if (
    text.includes("ELBOW") ||
    text.includes("REDUCER") ||
    text.includes("TEE") ||
    text.includes("COUPLER") ||
    text.includes("COUPLING") ||
    text.includes("ADAPTOR") ||
    text.includes("ADAPTER") ||
    text.includes("CONNECTOR") ||
    text.includes("FITTING")
  ) {
    return "MLCP";
  }

  // Known EVOH and PERT-AL-PERT pipe codes.
  if (
    normalisedCode.startsWith("HSPAP") ||
    normalisedCode.startsWith("HSEVOH")
  ) {
    return "PIPE";
  }

  return "OTHER";
}
type MonthlyValue = {
  month: string;
  monthIndex: number;
  previous: number;
  current: number;
  difference: number;
  change: number | null;
};

function calculateChange(previous: number, current: number) {
  const difference = current - previous;

  const change =
    previous !== 0
      ? (difference / previous) * 100
      : current !== 0
        ? null
        : 0;

  return {
    difference,
    change,
  };
}

const PIPE_FAMILIES = {
  EVOH_12MM: {
    label: "EVOH 12mm",
    products: ["HSEVOH80-12MM", "HSEVOH160-12MM"],
  },
  EVOH_16MM: {
    label: "EVOH 16mm",
    products: ["HSEVOH100", "HSEVOH150", "HSEVOH200", "HSEVOH500"],
  },
  PAP_12MM: {
    label: "Pert-Al-Pert 12mm",
    products: ["HSPAP80.", "HSPAP160"],
  },
  PAP_16MM: {
    label: "Pert-Al-Pert 16mm",
    products: ["HSPAP50", "HSPAP100", "HSPAP150", "HSPAP200", "HSPAP500"],
  },
} as const;

function supplierDisplayName(accountCode: string | null | undefined) {
  const code = accountCode?.trim().toUpperCase() ?? "";

  const supplierNames: Record<string, string> = {
  BLUSKY: "Blu-Sky UK Ltd",
  CAPRICOR: "Capricorn",
  E4STRUC: "E4 Structures Ltd",
  ESSCO: "Essco Controls",
  GRUND: "Grundfos",
  HEATMISE: "Heatmiser",
  MGB: "MGB Pressbrake",
  MOULDED: "Moulded Foams Ltd",
  NATURAL: "Natural Green Heat Ltd",
  NAYLOR: "Naylor Specialist Plastics",
  TWEETOP: "Tweetop",
  YUHUAN: "Zhongliang",
};

  return supplierNames[code] ?? accountCode?.trim() ?? "Unknown";
}

type PurchasePageProps = {
  searchParams?: Promise<{
    supplier?: string;
    group?: string;
    family?: string;
    product?: string | string[];
    measure?: string;
    year?: string;
    fittings?: string;
  }>;
};

export default async function PurchaseIntelligencePage({
  searchParams,
}: PurchasePageProps) {
  const params = (await searchParams) ?? {};

  const selectedSupplier = params.supplier ?? "ALL";
  const selectedGroup = params.group ?? "ALL";
  const fittingsView =
    params.fittings === "declines"
      ? "declines"
      : params.fittings === "all"
        ? "all"
        : "increases";

  function buildFittingsHref(
    view: "increases" | "declines" | "all"
  ) {
    const query = new URLSearchParams();

    if (params.supplier) {
      query.set("supplier", params.supplier);
    }

    if (params.group) {
      query.set("group", params.group);
    }

    if (params.family) {
      query.set("family", params.family);
    }

    if (params.measure) {
      query.set("measure", params.measure);
    }

    if (params.year) {
      query.set("year", params.year);
    }

    if (params.product) {
      const products = Array.isArray(params.product)
        ? params.product
        : [params.product];

      for (const product of products) {
        query.append("product", product);
      }
    }

    if (view !== "increases") {
      query.set("fittings", view);
    }

    const queryString = query.toString();

    return queryString
      ? `/commercial/purchases?${queryString}`
      : "/commercial/purchases";
  }

  const fittingsIncreasesHref =
    buildFittingsHref("increases");

  const fittingsDeclinesHref =
    buildFittingsHref("declines");

  const fittingsAllHref =
    buildFittingsHref("all");
  const selectedFamily = params.family ?? "ALL";

  const manuallySelectedProducts = Array.isArray(params.product)
    ? params.product
    : params.product
      ? [params.product]
      : [];

  const familyProducts =
    selectedFamily !== "ALL" &&
    selectedFamily in PIPE_FAMILIES
      ? PIPE_FAMILIES[
          selectedFamily as keyof typeof PIPE_FAMILIES
        ].products
      : [];

  const selectedProducts =
    familyProducts.length > 0
      ? [...familyProducts]
      : manuallySelectedProducts;

  const selectedProduct = selectedProducts[0] ?? "ALL";

  const selectedFamilyLabel =
    selectedFamily !== "ALL" &&
    selectedFamily in PIPE_FAMILIES
      ? PIPE_FAMILIES[
          selectedFamily as keyof typeof PIPE_FAMILIES
        ].label
      : null;
  const selectedMeasure = params.measure ?? "SPEND";

const selectedReportLabel =
  selectedFamilyLabel ??
  (selectedGroup !== "ALL"
    ? selectedGroup
    : selectedProducts.filter(
        (product) => product !== "ALL"
      ).length > 0
      ? "Selected Products"
      : "All Purchases");
  const allYearsSelected = params.year === "ALL";
  const requestedYear = Number(params.year);
  const { companyId } = await requireCompanyContext();

  const latestOrder = await prisma.purchaseOrder.findFirst({
    where: {
      companyId,
      orderDate: {
        not: null,
      },
    },
    orderBy: {
      orderDate: "desc",
    },
    select: {
          purchaseOrderNumber: true,
          orderDate: true,
    },
  });

  const latestBill = await prisma.supplierBill.findFirst({
    where: {
      companyId,
      invoiceDate: {
        not: null,
      },
    },
    orderBy: {
      invoiceDate: "desc",
    },
    select: {
      invoiceNumber: true,
      invoiceDate: true,
    },
  });

  const latestOrderDate = latestOrder?.orderDate ?? null;
  const latestBillDate = latestBill?.invoiceDate ?? null;

  const latestDate =
    latestOrderDate && latestBillDate
      ? latestOrderDate > latestBillDate
        ? latestOrderDate
        : latestBillDate
      : latestOrderDate ??
        latestBillDate ??
        new Date();

  const latestImportedYear = latestDate.getUTCFullYear();

  const currentYear =
    Number.isInteger(requestedYear) &&
    requestedYear >= 2000 &&
    requestedYear <= latestImportedYear
      ? requestedYear
      : latestImportedYear;

  const previousYear = currentYear - 1;

  const supplierRows = await prisma.purchaseOrder.findMany({
    where: {
      companyId,
      supplierAccountCode: {
        not: null,
      },
    },
    select: {
      supplierAccountCode: true,
    },
    distinct: ["supplierAccountCode"],
    orderBy: {
      supplierAccountCode: "asc",
    },
  });

  const suppliers = supplierRows
    .map((row) => row.supplierAccountCode?.trim())
    .filter((value): value is string => Boolean(value));

  const latestMonth = latestDate.getUTCMonth();
  const latestDay = latestDate.getUTCDate();

  const purchaseOrderLines = await prisma.purchaseOrderLine.findMany({
    where: {
      purchaseOrder: {
        companyId,
        orderDate: allYearsSelected
          ? {
              lte: new Date(
                Date.UTC(
                  currentYear,
                  latestMonth,
                  latestDay,
                  23,
                  59,
                  59
                )
              ),
            }
          : {
              gte: new Date(
                Date.UTC(previousYear, 0, 1)
              ),
              lte: new Date(
                Date.UTC(
                  currentYear,
                  latestMonth,
                  latestDay,
                  23,
                  59,
                  59
                )
              ),
            },
      },
    },
    select: {
      productCode: true,
      description: true,
      quantity: true,
      quantityDelivered: true,
      netValue: true,
      purchaseOrder: {
        select: {
          purchaseOrderNumber: true,
          orderDate: true,
          supplierAccountCode: true,
        },
      },
    },
  });

  const supplierBillLines = await prisma.supplierBillLine.findMany({
    where: {
      supplierBill: {
        companyId,
        invoiceDate: allYearsSelected
          ? {
              lte: new Date(
                Date.UTC(
                  currentYear,
                  latestMonth,
                  latestDay,
                  23,
                  59,
                  59
                )
              ),
            }
          : {
              gte: new Date(
                Date.UTC(previousYear, 0, 1)
              ),
              lte: new Date(
                Date.UTC(
                  currentYear,
                  latestMonth,
                  latestDay,
                  23,
                  59,
                  59
                )
              ),
            },
      },
    },
    select: {
      productCode: true,
      description: true,
      quantity: true,
      netValue: true,
      supplierBill: {
        select: {
          invoiceNumber: true,
          invoiceDate: true,
          supplierAccountCode: true,
        },
      },
    },
  });

  /*
   * Supplier bills are actual purchases.
   * If bills exist for a supplier/year, use those instead
   * of Purchase Orders for that supplier/year.
   */
  const billedSupplierYears = new Set(
    supplierBillLines
      .filter((line) => line.supplierBill.invoiceDate)
      .map((line) => {
        const supplier =
          line.supplierBill.supplierAccountCode?.trim() ?? "";

        const year =
          line.supplierBill.invoiceDate!.getUTCFullYear();

        return `${supplier}|${year}`;
      })
  );

  const purchaseOrderReportingLines =
    purchaseOrderLines.filter((line) => {
      const date = line.purchaseOrder.orderDate;

      if (!date) {
        return true;
      }

      const supplier =
        line.purchaseOrder.supplierAccountCode?.trim() ?? "";

      const key =
        `${supplier}|${date.getUTCFullYear()}`;

      return !billedSupplierYears.has(key);
    });

  const billReportingLines = supplierBillLines.map((line) => {
    const rawCode =
      line.productCode?.trim() ?? "";

    /*
     * Keep the original Grundfos material number in the
     * Supplier Bill database. This alias is only used
     * inside Purchase Intelligence.
     */
    const reportingCode =
      line.supplierBill.supplierAccountCode === "GRUND" &&
      rawCode === "99561357"
        ? "GRUNDFOSPUMP"
        : rawCode;

    return {
      productCode: reportingCode,
      description: line.description,
      quantity: line.quantity,
      quantityDelivered: line.quantity,
      netValue: line.netValue,
      purchaseOrder: {
        purchaseOrderNumber:
          `BILL-${line.supplierBill.invoiceNumber}`,
        orderDate:
          line.supplierBill.invoiceDate,
        supplierAccountCode:
          line.supplierBill.supplierAccountCode,
      },
    };
  });

  const lines = [
    ...purchaseOrderReportingLines,
    ...billReportingLines,
  ];

  // Keep raw PO history available for prior-year comparisons.
  // This does not change the reported annual totals.
  const comparisonLines = [
    ...purchaseOrderLines,
    ...billReportingLines,
  ];
  const productMap = new Map<
    string,
    { code: string; description: string; group: ProductGroup }
  >();

  for (const line of lines) {
    const code = line.productCode?.trim();

    if (!code) continue;

    const supplier =
      line.purchaseOrder.supplierAccountCode?.trim();

    if (
      selectedSupplier !== "ALL" &&
      supplier !== selectedSupplier
    ) {
      continue;
    }

    if (!productMap.has(code)) {
      const description =
        line.description?.trim() || "No description";

      productMap.set(code, {
        code,
        description,
        group: classifyProduct(code, description),
      });
    }
  }

  const allProducts = Array.from(productMap.values());

  const products =
    selectedGroup === "ALL"
      ? allProducts
      : allProducts.filter(
          (product) => product.group === selectedGroup
        );

  products.sort(
    (a, b) =>
      `${a.description} ${a.code}`.localeCompare(
        `${b.description} ${b.code}`
      )
  );

  /*
   * FILTERED PURCHASE DATA
   */

  const filteredLines = lines.filter((line) => {
    const code =
      line.productCode?.trim().toUpperCase() ?? "";

    const description =
      line.description?.trim() ?? "";

    const supplier =
      line.purchaseOrder.supplierAccountCode?.trim() ?? "";

    if (
      selectedSupplier !== "ALL" &&
      supplier !== selectedSupplier
    ) {
      return false;
    }

    const selectedProductCodes = selectedProducts
      .filter((product) => product !== "ALL")
      .map((product) => product.toUpperCase());

    if (
      selectedProductCodes.length > 0 &&
      !selectedProductCodes.includes(code)
    ) {
      return false;
    }

    if (selectedGroup !== "ALL" && selectedFamily === "ALL") {
      const group = classifyProduct(code, description);

      if (group !== selectedGroup) {
        return false;
      }
    }

    return true;
  });

  /*
   * SELECTED PRODUCT COMPARISON
   */

  const annualPurchaseHistory = Array.from(
    filteredLines.reduce((years, line) => {
      const date = line.purchaseOrder.orderDate;

      if (!date) {
        return years;
      }

      const year = date.getUTCFullYear();

      const existing = years.get(year) ?? {
        year,
        units: 0,
        metres: 0,
        spend: 0,
      };

      const quantity =
        line.quantityDelivered ??
        line.quantity ??
        0;

      const metres =
        calculatePurchaseLineMetres(line.purchaseOrder.purchaseOrderNumber, line.productCode, quantity);

      existing.units += quantity;
      existing.metres += metres;
      existing.spend += line.netValue ?? 0;

      years.set(year, existing);

      return years;
    }, new Map<number, {
      year: number;
      units: number;
      metres: number;
      spend: number;
    }>())
  )
    .map(([, value]) => value)
    .sort((a, b) => a.year - b.year)
    .map((row, index, rows) => {
      const previous = rows[index - 1];

      let comparisonUnits =
        previous?.units ?? 0;

      let comparisonMetres =
        previous?.metres ?? 0;

      let comparisonSpend =
        previous?.spend ?? 0;

      // For the current YTD year, compare against the same period
      // in the previous year rather than the previous full year.
      if (
        row.year === latestImportedYear &&
        previous?.year === latestImportedYear - 1
      ) {
        comparisonUnits = 0;
        comparisonMetres = 0;
        comparisonSpend = 0;

        for (const line of comparisonLines) {
          const date = line.purchaseOrder.orderDate;

          if (!date) continue;

          const comparisonCode =
            line.productCode?.trim().toUpperCase() ?? "";

          const comparisonDescription =
            line.description?.trim() ?? "";

          const comparisonSupplier =
            line.purchaseOrder.supplierAccountCode?.trim() ?? "";

          if (
            selectedSupplier !== "ALL" &&
            comparisonSupplier !== selectedSupplier
          ) {
            continue;
          }

          const comparisonProductCodes = selectedProducts
            .filter((product) => product !== "ALL")
            .map((product) => product.toUpperCase());

          if (
            comparisonProductCodes.length > 0 &&
            !comparisonProductCodes.includes(comparisonCode)
          ) {
            continue;
          }

          if (
            selectedGroup !== "ALL" &&
            selectedFamily === "ALL"
          ) {
            const comparisonGroup = classifyProduct(
              comparisonCode,
              comparisonDescription
            );

            if (comparisonGroup !== selectedGroup) {
              continue;
            }
          }

          if (
            date.getUTCFullYear() !==
            latestImportedYear - 1
          ) {
            continue;
          }

          const month = date.getUTCMonth();
          const day = date.getUTCDate();

          if (
            month > latestMonth ||
            (month === latestMonth &&
              day > latestDay)
          ) {
            continue;
          }

          const quantity =
            line.quantityDelivered ??
            line.quantity ??
            0;

          comparisonUnits += quantity;

          comparisonMetres +=
            calculatePurchaseLineMetres(
              line.purchaseOrder.purchaseOrderNumber,
              line.productCode,
              quantity
            );

          comparisonSpend +=
            line.netValue ?? 0;
        }
      }

      const unitsChange =
        comparisonUnits !== 0
          ? ((row.units - comparisonUnits) /
              comparisonUnits) *
            100
          : null;

      const metresChange =
        comparisonMetres !== 0
          ? ((row.metres - comparisonMetres) /
              comparisonMetres) *
            100
          : null;

      const spendChange =
        comparisonSpend !== 0
          ? ((row.spend - comparisonSpend) /
              comparisonSpend) *
            100
          : null;

      return {
        ...row,
        costPerUnit:
          row.units > 0
            ? row.spend / row.units
            : null,
        costPerMetre:
          row.metres > 0
            ? row.spend / row.metres
            : null,
        unitsChange,
        metresChange,
        spendChange,
      };
    });

  const selectedProductComparison = selectedProducts
    .filter((product) => product !== "ALL")
    .map((productCode) => {
      const code = productCode.toUpperCase();

      const product = allProducts.find(
        (item) => item.code.toUpperCase() === code
      );

      let previous = 0;
      let current = 0;

      let previousMetres = 0;
      let currentMetres = 0;

      for (const line of lines) {
        const lineCode =
          line.productCode?.trim().toUpperCase() ?? "";

        if (lineCode !== code) continue;

        const supplier =
          line.purchaseOrder.supplierAccountCode?.trim() ?? "";

        if (
          selectedSupplier !== "ALL" &&
          supplier !== selectedSupplier
        ) {
          continue;
        }

        const date = line.purchaseOrder.orderDate;

        if (!date) continue;

        const year = date.getUTCFullYear();
        const month = date.getUTCMonth();
        const day = date.getUTCDate();

        if (
          month > latestMonth ||
          (
            month === latestMonth &&
            year === previousYear &&
            day > latestDay
          )
        ) {
          continue;
        }

        const value = line.netValue ?? 0;

        const quantity =
          line.quantityDelivered ??
          line.quantity ??
          0;

        const metres =
          calculatePurchaseLineMetres(line.purchaseOrder.purchaseOrderNumber, lineCode, quantity);

        if (year === previousYear) {
          previous += value;
          previousMetres += metres;
        }

        if (year === currentYear) {
          current += value;
          currentMetres += metres;
        }
      }

      const comparison =
        calculateChange(previous, current);

      return {
        code,
        description:
          product?.description ?? "Unknown product",
        previous,
        current,
        previousMetres,
        currentMetres,
        difference: comparison.difference,
        change: comparison.change,
      };
    });
  /*
   * FILTERED PURCHASE SPEND
   */
  /*
   * MLCP BREAKDOWN
   */
  const mlcpBreakdown = {
    previousPipeSpend: 0,
    currentPipeSpend: 0,
    previousFittingsSpend: 0,
    currentFittingsSpend: 0,
    previousPipeMetres: 0,
    currentPipeMetres: 0,
  };

  if (selectedGroup === "MLCP") {
    for (const line of filteredLines) {
      const date = line.purchaseOrder.orderDate;

      if (!date) continue;

      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();

      if (
        month > latestMonth ||
        (
          month === latestMonth &&
          year === previousYear &&
          day > latestDay
        )
      ) {
        continue;
      }

      if (
        year !== previousYear &&
        year !== currentYear
      ) {
        continue;
      }

      const code =
        line.productCode?.trim().toUpperCase() ?? "";

      const value = line.netValue ?? 0;

      const quantity =
        line.quantityDelivered ??
        line.quantity ??
        0;

      const isPreInsulatedPipe =
        code.startsWith("HSINS");

      if (year === previousYear) {
        if (isPreInsulatedPipe) {
          mlcpBreakdown.previousPipeSpend += value;

          mlcpBreakdown.previousPipeMetres +=
            calculatePurchaseLineMetres(
              line.purchaseOrder.purchaseOrderNumber,
              code,
              quantity
            );
        } else {
          mlcpBreakdown.previousFittingsSpend += value;
        }
      }

      if (year === currentYear) {
        if (isPreInsulatedPipe) {
          mlcpBreakdown.currentPipeSpend += value;

          mlcpBreakdown.currentPipeMetres +=
            calculatePurchaseLineMetres(
              line.purchaseOrder.purchaseOrderNumber,
              code,
              quantity
            );
        } else {
          mlcpBreakdown.currentFittingsSpend += value;
        }
      }
    }
  }

  /*
   * MLCP FITTINGS SPEND BREAKDOWN
   */
  const mlcpFittingsMap = new Map<
    string,
    {
      productCode: string;
      description: string;
      previousSpend: number;
      currentSpend: number;
    }
  >();

  if (selectedGroup === "MLCP") {
    for (const line of filteredLines) {
      const date = line.purchaseOrder.orderDate;

      if (!date) continue;

      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();

      if (
        month > latestMonth ||
        (
          month === latestMonth &&
          year === previousYear &&
          day > latestDay
        )
      ) {
        continue;
      }

      if (
        year !== previousYear &&
        year !== currentYear
      ) {
        continue;
      }

      const code =
        line.productCode?.trim().toUpperCase() ?? "";

      if (
        !code ||
        code.startsWith("HSINS")
      ) {
        continue;
      }

      const existing =
        mlcpFittingsMap.get(code) ?? {
          productCode: code,
          description:
            line.description?.trim() || code,
          previousSpend: 0,
          currentSpend: 0,
        };

      if (year === previousYear) {
        existing.previousSpend +=
          line.netValue ?? 0;
      }

      if (year === currentYear) {
        existing.currentSpend +=
          line.netValue ?? 0;
      }

      mlcpFittingsMap.set(
        code,
        existing
      );
    }
  }

  const mlcpFittingsBreakdown =
    Array.from(
      mlcpFittingsMap.values()
    )
      .map((row) => {
        const comparison =
          calculateChange(
            row.previousSpend,
            row.currentSpend
          );

        return {
          ...row,
          difference:
            row.currentSpend -
            row.previousSpend,
          change: comparison.change,
        };
      })
      .sort(
        (a, b) =>
          b.difference -
          a.difference
      );

  const mlcpTopFittings =
    mlcpFittingsBreakdown
      .filter((row) => row.difference > 0)
      .slice(0, 10);

  const mlcpDecliningFittings =
    [...mlcpFittingsBreakdown]
      .filter((row) => row.difference < 0)
      .sort(
        (a, b) =>
          a.difference - b.difference
      )
      .slice(0, 10);

  const mlcpTopFittingsIncrease =
    mlcpTopFittings.reduce(
      (total, row) =>
        total + row.difference,
      0
    );

  const mlcpTotalFittingsIncrease =
    mlcpFittingsBreakdown
      .filter((row) => row.difference > 0)
      .reduce(
        (total, row) =>
          total + row.difference,
        0
      );

  const mlcpTopFittingsContribution =
    mlcpTotalFittingsIncrease > 0
      ? (mlcpTopFittingsIncrease /
          mlcpTotalFittingsIncrease) *
        100
      : 0;

  const mlcpTopFittingsDecline =
    mlcpDecliningFittings.reduce(
      (total, row) =>
        total + Math.abs(row.difference),
      0
    );

  const mlcpTotalFittingsDecline =
    mlcpFittingsBreakdown
      .filter((row) => row.difference < 0)
      .reduce(
        (total, row) =>
          total + Math.abs(row.difference),
        0
      );

  const mlcpTopFittingsDeclineContribution =
    mlcpTotalFittingsDecline > 0
      ? (mlcpTopFittingsDecline /
          mlcpTotalFittingsDecline) *
        100
      : 0;

  const monthlySpend: MonthlyValue[] = MONTHS.map(
    (month, monthIndex) => {
      let previous = 0;
      let current = 0;

      for (const line of filteredLines) {
        const date = line.purchaseOrder.orderDate;

        if (!date) continue;

        const year = date.getUTCFullYear();
        const lineMonth = date.getUTCMonth();
        const day = date.getUTCDate();

        if (lineMonth !== monthIndex) continue;

        if (
          monthIndex === latestMonth &&
          year === previousYear &&
          day > latestDay
        ) {
          continue;
        }

        const value = line.netValue ?? 0;

        if (year === previousYear) {
          previous += value;
        }

        if (year === currentYear) {
          current += value;
        }
      }

      const { difference, change } =
        calculateChange(previous, current);

      return {
        month,
        monthIndex,
        previous,
        current,
        difference,
        change,
      };
    }
  );

  /*
   * 16MM PERT-AL-PERT PIPE
   *
   * HSPAP100 = 100m
   * HSPAP150 = 150m
   * HSPAP200 = 200m
   * HSPAP500 = 500m
   */
  const pipeCodes = new Set(
    Object.keys(PIPE_PRODUCTS)
  );

  const monthlyPipe = MONTHS.map(
    (month, monthIndex) => {
      let previousCoils = 0;
      let currentCoils = 0;

      let previousMetres = 0;
      let currentMetres = 0;

      let previousSpend = 0;
      let currentSpend = 0;

      for (const line of lines) {
        const date = line.purchaseOrder.orderDate;

        if (!date) continue;

        const year = date.getUTCFullYear();
        const lineMonth = date.getUTCMonth();
        const day = date.getUTCDate();

        if (lineMonth !== monthIndex) continue;

        if (
          monthIndex === latestMonth &&
          year === previousYear &&
          day > latestDay
        ) {
          continue;
        }

        const code =
          line.productCode?.trim().toUpperCase();

        if (!code || !pipeCodes.has(code)) {
          continue;
        }

        const pipe = getPipeProduct(code);

        if (!pipe) continue;

        const quantity =
          line.quantityDelivered ??
          line.quantity ??
          0;

        const metres =
          calculatePurchaseLineMetres(line.purchaseOrder.purchaseOrderNumber, code, quantity);

        const spend = line.netValue ?? 0;

        if (year === previousYear) {
          previousCoils += quantity;
          previousMetres += metres;
          previousSpend += spend;
        }

        if (year === currentYear) {
          currentCoils += quantity;
          currentMetres += metres;
          currentSpend += spend;
        }
      }

      const metreComparison =
        calculateChange(
          previousMetres,
          currentMetres
        );

      return {
        month,
        monthIndex,

        previousCoils,
        currentCoils,

        previousMetres,
        currentMetres,

        previousSpend,
        currentSpend,

        differenceMetres:
          metreComparison.difference,

        changeMetres:
          metreComparison.change,
      };
    }
  );

  const spendYtdRows = monthlySpend.filter(
    (row) => row.monthIndex <= latestMonth
  );

  const previousYtd = spendYtdRows.reduce(
    (total, row) => total + row.previous,
    0
  );

  const currentYtd = spendYtdRows.reduce(
    (total, row) => total + row.current,
    0
  );

  const spendComparison =
    calculateChange(previousYtd, currentYtd);

  const pipeYtdRows = monthlyPipe.filter(
    (row) => row.monthIndex <= latestMonth
  );

  const previousPipeCoils =
    pipeYtdRows.reduce(
      (total, row) =>
        total + row.previousCoils,
      0
    );

  const currentPipeCoils =
    pipeYtdRows.reduce(
      (total, row) =>
        total + row.currentCoils,
      0
    );

  const previousPipeMetres =
    pipeYtdRows.reduce(
      (total, row) =>
        total + row.previousMetres,
      0
    );

  const currentPipeMetres =
    pipeYtdRows.reduce(
      (total, row) =>
        total + row.currentMetres,
      0
    );

  const previousPipeSpend =
    pipeYtdRows.reduce(
      (total, row) =>
        total + row.previousSpend,
      0
    );

  const currentPipeSpend =
    pipeYtdRows.reduce(
      (total, row) =>
        total + row.currentSpend,
      0
    );

  const pipeMetreComparison =
    calculateChange(
      previousPipeMetres,
      currentPipeMetres
    );

  const pipeCoilComparison =
    calculateChange(
      previousPipeCoils,
      currentPipeCoils
    );

  const pipeSpendComparison =
    calculateChange(
      previousPipeSpend,
      currentPipeSpend
    );

  const purchaseOrderCount =
    await prisma.purchaseOrder.count({
      where: { companyId },
    });

  const purchaseLineCount =
    await prisma.purchaseOrderLine.count({
      where: {
        purchaseOrder: {
          companyId,
        },
      },
    });

  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-slate-500">
          Commercial Intelligence
        </p>

        <h1 className="text-3xl font-bold tracking-tight">
          Purchase Intelligence
        </h1>

        <p className="mt-2 text-slate-600">
          Monthly purchase performance comparing{" "}
          {currentYear} with {previousYear}.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              Comparison period
            </p>

            <p className="text-sm text-slate-500">
              January to {MONTHS[latestMonth]}{" "}
              {latestDay}
            </p>
          </div>

          <div className="text-right text-sm text-slate-500">
            Latest purchase data
            <div className="font-semibold text-slate-900">
              {latestDay} {MONTHS[latestMonth]}{" "}
              {currentYear}
            </div>
          </div>
        </div>
      </div>

      <form
        method="get"
        className="rounded-xl border bg-white p-5 shadow-sm"
      >
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            Report Filters
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose the purchase data you want Odin to compare.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">
              Year
            </span>
            <select
              name="year"
              defaultValue={
                allYearsSelected ? "ALL" : String(currentYear)
              }
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="ALL">All Years</option>
              {Array.from(
                { length: latestImportedYear - 2020 + 1 },
                (_, index) => latestImportedYear - index
              ).map((year) => (
                <option key={year} value={year}>
                  {year} vs {year - 1}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">
              Supplier
            </span>
            <select
              name="supplier"
              defaultValue={selectedSupplier}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="ALL">All Suppliers</option>
              {suppliers.map((supplier) => (
  <option key={supplier} value={supplier}>
    {supplierDisplayName(supplier)}
  </option>
))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">
              Product Group
            </span>
            <select
              name="group"
              defaultValue={selectedGroup}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="ALL">All Product Groups</option>
              {PRODUCT_GROUPS.map((group) => (
                <option key={group.value} value={group.value}>
                  {group.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">
              Pipe Family
            </span>
            <select
              name="family"
              defaultValue={selectedFamily}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="ALL">Custom / All Products</option>
              {Object.entries(PIPE_FAMILIES).map(([value, family]) => (
                <option key={value} value={value}>
                  {family.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">
              Choose a pipe family or select individual products below.
            </p>
          </label>

          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-700">
              Products to Compare
            </span>

            <div className="max-h-56 overflow-y-auto rounded-lg border bg-white p-3">
              <label className="mb-2 flex items-start gap-2 border-b pb-2">
                <input
                  type="checkbox"
                  name="product"
                  value="ALL"
                  defaultChecked={selectedProducts.length === 0}
                  className="mt-1"
                />
                <span className="text-sm font-medium">
                  All Products
                </span>
              </label>

              <div className="space-y-2">
                {products.map((product) => (
                  <label
                    key={product.code}
                    className="flex items-start gap-2"
                  >
                    <input
                      type="checkbox"
                      name="product"
                      value={product.code}
                      defaultChecked={selectedProducts.includes(
                        product.code
                      )}
                      className="mt-1"
                    />

                    <span className="text-sm leading-5">
                      <span className="font-medium">
                        {product.code}
                      </span>
                      <span className="text-slate-500">
                        {" - "}
                        {product.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Tick multiple products to compare them together.
            </p>
          </div>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">
              Measure
            </span>
            <select
              name="measure"
              defaultValue={selectedMeasure}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="SPEND">Spend</option>
              <option value="METRES">Metres</option>
              <option value="COILS">Coils</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Apply Filters
          </button>

          <a
            href="/commercial/purchases"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Reset
          </a>
        </div>
      </form>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">
            {selectedReportLabel}
          </h2>

          <p className="text-sm text-slate-500">
            {selectedReportLabel === "All Purchases" ? "Total purchase order spend across all imported products." : `Total purchase order spend for ${selectedReportLabel}.`}

          </p>
        </div>

        {!allYearsSelected && (
  <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              {currentYear} YTD Spend
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {money(currentYtd)}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              {previousYear} Same Period
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {money(previousYtd)}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Spend Difference
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {money(
                spendComparison.difference
              )}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              YTD Change
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {percentage(
                spendComparison.change
              )}
            </p>
          </div>
        </div>
        )}
      </section>

      {selectedGroup === "MLCP" && (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="text-lg font-semibold">
              MLCP Breakdown
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Pre-insulated pipe compared with MLCP fittings for the same YTD period.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">
                    Metric
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    {previousYear}
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    {currentYear} YTD
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    Change
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                <tr>
                  <td className="px-5 py-3 font-medium">
                    Pre-insulated Pipe Spend
                  </td>

                  <td className="px-5 py-3 text-right">
                    {money(mlcpBreakdown.previousPipeSpend)}
                  </td>

                  <td className="px-5 py-3 text-right">
                    {money(mlcpBreakdown.currentPipeSpend)}
                  </td>

                  <td className="px-5 py-3 text-right">
                    {percentage(
                      calculateChange(
                        mlcpBreakdown.previousPipeSpend,
                        mlcpBreakdown.currentPipeSpend
                      ).change
                    )}
                  </td>
                </tr>

                <tr>
                  <td className="px-5 py-3 font-medium">
                    MLCP Fittings Spend
                  </td>

                  <td className="px-5 py-3 text-right">
                    {money(mlcpBreakdown.previousFittingsSpend)}
                  </td>

                  <td className="px-5 py-3 text-right">
                    {money(mlcpBreakdown.currentFittingsSpend)}
                  </td>

                  <td className="px-5 py-3 text-right">
                    {percentage(
                      calculateChange(
                        mlcpBreakdown.previousFittingsSpend,
                        mlcpBreakdown.currentFittingsSpend
                      ).change
                    )}
                  </td>
                </tr>

                <tr>
                  <td className="px-5 py-3 font-medium">
                    Pipe Spend / Metre
                  </td>
                  <td className="px-5 py-3 text-right">
                    {mlcpBreakdown.previousPipeMetres > 0
                      ? (mlcpBreakdown.previousPipeSpend /
                          mlcpBreakdown.previousPipeMetres
                        ).toLocaleString("en-GB", {
                          style: "currency",
                          currency: "GBP",
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }) + "/m"
                      : "-"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {mlcpBreakdown.currentPipeMetres > 0
                      ? (mlcpBreakdown.currentPipeSpend /
                          mlcpBreakdown.currentPipeMetres
                        ).toLocaleString("en-GB", {
                          style: "currency",
                          currency: "GBP",
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }) + "/m"
                      : "-"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {mlcpBreakdown.previousPipeMetres > 0 &&
                    mlcpBreakdown.currentPipeMetres > 0
                      ? percentage(
                          calculateChange(
                            mlcpBreakdown.previousPipeSpend /
                              mlcpBreakdown.previousPipeMetres,
                            mlcpBreakdown.currentPipeSpend /
                              mlcpBreakdown.currentPipeMetres
                          ).change
                        )
                      : "-"}
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-3 font-medium">
                    Pre-insulated Pipe Metres
                  </td>

                  <td className="px-5 py-3 text-right">
                    {mlcpBreakdown.previousPipeMetres.toLocaleString("en-GB")}m
                  </td>

                  <td className="px-5 py-3 text-right">
                    {mlcpBreakdown.currentPipeMetres.toLocaleString("en-GB")}m
                  </td>

                  <td className="px-5 py-3 text-right">
                    {percentage(
                      calculateChange(
                        mlcpBreakdown.previousPipeMetres,
                        mlcpBreakdown.currentPipeMetres
                      ).change
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedGroup === "MLCP" && mlcpFittingsBreakdown.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="text-lg font-semibold">
              MLCP Fittings Spend Breakdown
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {fittingsView === "declines"
                ? "Fittings ranked by the largest decline in spend for the same YTD period."
                : fittingsView === "all"
                  ? "All MLCP fittings for the same YTD period."
                  : "Fittings ranked by the largest increase in spend for the same YTD period."}
            </p>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {fittingsView === "declines" ? (
                <>
                  <span>
                    <span className="font-semibold">
                      Top 10 declines:
                    </span>{" "}
                    {money(mlcpTopFittingsDecline)}
                  </span>

                  <span>
                    <span className="font-semibold">
                      Share of total fittings decline:
                    </span>{" "}
                    {mlcpTopFittingsDeclineContribution.toFixed(1)}%
                  </span>

                  <span>
                    <span className="font-semibold">
                      Total fittings decline:
                    </span>{" "}
                    {money(mlcpTotalFittingsDecline)}
                  </span>
                </>
              ) : fittingsView === "all" ? (
                <>
                  <span>
                    <span className="font-semibold">
                      Previous period fittings spend:
                    </span>{" "}
                    {money(mlcpBreakdown.previousFittingsSpend)}
                  </span>

                  <span>
                    <span className="font-semibold">
                      Current YTD fittings spend:
                    </span>{" "}
                    {money(mlcpBreakdown.currentFittingsSpend)}
                  </span>

                  <span>
                    <span className="font-semibold">
                      Overall change:
                    </span>{" "}
                    {percentage(
                      calculateChange(
                        mlcpBreakdown.previousFittingsSpend,
                        mlcpBreakdown.currentFittingsSpend
                      ).change
                    )}
                  </span>
                </>
              ) : (
                <>
                  <span>
                    <span className="font-semibold">
                      Top 10 increases:
                    </span>{" "}
                    {money(mlcpTopFittingsIncrease)}
                  </span>

                  <span>
                    <span className="font-semibold">
                      Share of total fittings increase:
                    </span>{" "}
                    {mlcpTopFittingsContribution.toFixed(1)}%
                  </span>

                  <span>
                    <span className="font-semibold">
                      Total fittings increase:
                    </span>{" "}
                    {money(mlcpTotalFittingsIncrease)}
                  </span>
                </>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={fittingsIncreasesHref}
                className={
                  fittingsView === "increases"
                    ? "rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                    : "rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                }
              >
                Top 10 Increases
              </a>

              <a
                href={fittingsDeclinesHref}
                className={
                  fittingsView === "declines"
                    ? "rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                    : "rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                }
              >
                Top 10 Declines
              </a>

              <a
                href={fittingsAllHref}
                className={
                  fittingsView === "all"
                    ? "rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                    : "rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                }
              >
                Show All
              </a>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">
                    Product
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    {previousYear}
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    {currentYear} YTD
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    Difference
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    Change
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {(fittingsView === "declines"
                  ? mlcpDecliningFittings
                  : fittingsView === "all"
                    ? mlcpFittingsBreakdown
                    : mlcpTopFittings
                ).map((row) => (
                  <tr key={row.productCode}>
                    <td className="px-5 py-3">
                      <div className="font-medium">
                        {row.productCode}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {row.description}
                      </div>
                    </td>

                    <td className="px-5 py-3 text-right">
                      {money(row.previousSpend)}
                    </td>

                    <td className="px-5 py-3 text-right">
                      {money(row.currentSpend)}
                    </td>

                    <td className="px-5 py-3 text-right">
                      {row.difference > 0 ? "+" : ""}
                      {money(row.difference)}
                    </td>

                    <td className="px-5 py-3 text-right">
                      {percentage(row.change)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {allYearsSelected && annualPurchaseHistory.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="text-lg font-semibold">
              Annual Purchase History
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {selectedReportLabel === "All Purchases" ? "Full trading history for the current purchase filters." : `Full trading history for ${selectedReportLabel}.`}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">
                    Year
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    {selectedGroup === "PUMPS" || selectedProducts.includes("GRUNDFOSPUMP") ? "Units" : "Metres"}
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    Spend
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    {selectedGroup === "PUMPS" || selectedProducts.includes("GRUNDFOSPUMP") ? "Cost / Unit" : selectedGroup === "MLCP" ? "System Spend / Pipe Metre" : "Cost / Metre"}
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    {selectedGroup === "PUMPS" || selectedProducts.includes("GRUNDFOSPUMP") ? "Units" : "Metres"} Change
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    Spend Change
                  </th>
                </tr>
              </thead>

              <tbody>
                {annualPurchaseHistory.map((row, index) => (
                  <tr
                    key={row.year}
                    className="border-t"
                  >
                    <td className="px-5 py-3 font-medium">
                      {row.year}
                      {index === 0 && row.year > 2020
                        ? ""
                        : row.year === 2020
                          ? " Partial"
                          : ""}
                      {row.year === latestImportedYear
                        ? " YTD"
                        : ""}
                    </td>

                    <td className="px-5 py-3 text-right">
                      {selectedGroup === "PUMPS" || selectedProducts.includes("GRUNDFOSPUMP")
                        ? row.units.toLocaleString("en-GB")
                        : `${row.metres.toLocaleString("en-GB")}m`}
                    </td>

                    <td className="px-5 py-3 text-right">
                      {money(row.spend)}
                    </td>

                    <td className="px-5 py-3 text-right">
                      {selectedGroup === "PUMPS" || selectedProducts.includes("GRUNDFOSPUMP")
                        ? row.costPerUnit !== null
                          ? `${String.fromCharCode(163)}${row.costPerUnit.toFixed(2)}`
                          : "-"
                        : row.costPerMetre !== null
                          ? `${String.fromCharCode(163)}${row.costPerMetre.toFixed(3)}/m`
                          : "-"}
                    </td>

                    <td className="px-5 py-3 text-right">
                      {selectedGroup === "PUMPS" || selectedProducts.includes("GRUNDFOSPUMP")
                        ? row.unitsChange !== null
                          ? `${row.unitsChange > 0 ? "+" : ""}${row.unitsChange.toFixed(1)}%`
                          : "-"
                        : row.metresChange !== null
                          ? `${row.metresChange > 0 ? "+" : ""}${row.metresChange.toFixed(1)}%`
                          : "-"}
                    </td>

                    <td className="px-5 py-3 text-right">
                      {row.spendChange !== null
                        ? `${row.spendChange > 0 ? "+" : ""}${row.spendChange.toFixed(1)}%`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!allYearsSelected && selectedProductComparison.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="text-lg font-semibold">
              Selected Product Comparison
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Compare each selected product for {currentYear} against the equivalent period in {previousYear}.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-5 py-3 font-semibold">
                    Product
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    {previousYear} Metres
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    {currentYear} Metres
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    {previousYear} Spend
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    {currentYear} Spend
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    {previousYear} £/m
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    {currentYear} £/m
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    Spend Difference
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    Spend Change
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {selectedProductComparison.map((row) => (
                  <tr key={row.code}>
                    <td className="px-5 py-3">
                      <div className="font-semibold">
                        {row.code}
                      </div>

                      <div className="text-xs text-slate-500">
                        {row.description}
                      </div>
                    </td>

                    <td className="px-5 py-3 text-right">
                      {row.previousMetres.toLocaleString("en-GB")}m
                    </td>

                    <td className="px-5 py-3 text-right">
                      {row.currentMetres.toLocaleString("en-GB")}m
                    </td>

                    <td className="px-5 py-3 text-right">
                      {money(row.previous)}
                    </td>

                    <td className="px-5 py-3 text-right">
                      {money(row.current)}
                    </td>

                    <td className="px-5 py-3 text-right">
                      {row.previousMetres > 0
                        ? `£${(
                            row.previous /
                            row.previousMetres
                          ).toFixed(3)}/m`
                        : "-"}

                    </td>

                    <td className="px-5 py-3 text-right">
                      {row.currentMetres > 0
                        ? `£${(
                            row.current /
                            row.currentMetres
                          ).toFixed(3)}/m`
                        : "-"}

                    </td>

                    <td className="px-5 py-3 text-right">
                      {money(row.difference)}
                    </td>

                    <td className="px-5 py-3 text-right font-medium">
                      {percentage(row.change)}
                    </td>
                  </tr>
                ))}
              </tbody>

              {selectedProductComparison.length > 1 && (
                <tfoot className="border-t bg-slate-50 font-semibold">
                  <tr>
                    <td className="px-5 py-4">
                      Combined Total
                    </td>

                    <td className="px-5 py-4 text-right">
                      {selectedProductComparison
                        .reduce(
                          (total, row) =>
                            total + row.previousMetres,
                          0
                        )
                        .toLocaleString("en-GB")}m
                    </td>

                    <td className="px-5 py-4 text-right">
                      {selectedProductComparison
                        .reduce(
                          (total, row) =>
                            total + row.currentMetres,
                          0
                        )
                        .toLocaleString("en-GB")}m
                    </td>

                    <td className="px-5 py-4 text-right">
                      {money(
                        selectedProductComparison.reduce(
                          (total, row) =>
                            total + row.previous,
                          0
                        )
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {money(
                        selectedProductComparison.reduce(
                          (total, row) =>
                            total + row.current,
                          0
                        )
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {"£" + (
                        selectedProductComparison.reduce(
                          (total, row) =>
                            total + row.previous,
                          0
                        ) /
                        selectedProductComparison.reduce(
                          (total, row) =>
                            total + row.previousMetres,
                          0
                        )
                      ).toFixed(3) + "/m"}

                    </td>

                    <td className="px-5 py-4 text-right">
                      {"£" + (
                        selectedProductComparison.reduce(
                          (total, row) =>
                            total + row.current,
                          0
                        ) /
                        selectedProductComparison.reduce(
                          (total, row) =>
                            total + row.currentMetres,
                          0
                        )
                      ).toFixed(3) + "/m"}

                    </td>

                    <td className="px-5 py-4 text-right">
                      {money(
                        selectedProductComparison.reduce(
                          (total, row) =>
                            total + row.difference,
                          0
                        )
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {percentage(
                        calculateChange(
                          selectedProductComparison.reduce(
                            (total, row) =>
                              total + row.previous,
                            0
                          ),
                          selectedProductComparison.reduce(
                            (total, row) =>
                              total + row.current,
                            0
                          )
                        ).change
                      )}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
      {!allYearsSelected && (
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-semibold">
            Monthly Purchase Spend
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {selectedReportLabel === "All Purchases" ? "All products" : selectedReportLabel}            : {currentYear} compared with the equivalent period in{" "}            {previousYear}.


          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-5 py-3 font-semibold">
                  Month
                </th>

                <th className="px-5 py-3 text-right font-semibold">
                  {previousYear}
                </th>

                <th className="px-5 py-3 text-right font-semibold">
                  {currentYear}
                </th>

                <th className="px-5 py-3 text-right font-semibold">
                  Difference
                </th>

                <th className="px-5 py-3 text-right font-semibold">
                  Change
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {monthlySpend.map((row) => {
                const futureMonth =
                  row.monthIndex > latestMonth;

                return (
                  <tr
                    key={row.month}
                    className={
                      futureMonth
                        ? "-" : ""
                    }
                  >
                    <td className="px-5 py-3 font-medium">
                      {row.month}

                      {row.monthIndex ===
                        latestMonth && (
                        <span className="ml-2 text-xs font-normal text-slate-500">
                          to {ordinal(latestDay)}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3 text-right">
                      {futureMonth
                        ? "-" : money(row.previous)}
                    </td>

                    <td className="px-5 py-3 text-right">
                      {futureMonth
                        ? "-" : money(row.current)}
                    </td>

                    <td className="px-5 py-3 text-right">
                      {futureMonth
                        ? "-" : money(row.difference)}
                    </td>

                    <td className="px-5 py-3 text-right font-medium">
                      {futureMonth
                        ? "-" : percentage(row.change)}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot className="border-t bg-slate-50 font-semibold">
              <tr>
                <td className="px-5 py-4">
                  YTD Total
                </td>

                <td className="px-5 py-4 text-right">
                  {money(previousYtd)}
                </td>

                <td className="px-5 py-4 text-right">
                  {money(currentYtd)}
                </td>

                <td className="px-5 py-4 text-right">
                  {money(
                    spendComparison.difference
                  )}
                </td>

                <td className="px-5 py-4 text-right">
                  {percentage(
                    spendComparison.change
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
)}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Purchase Orders Imported
          </p>

          <p className="mt-2 text-2xl font-semibold">
            {purchaseOrderCount.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Purchase Lines Imported
          </p>

          <p className="mt-2 text-2xl font-semibold">
            {purchaseLineCount.toLocaleString()}
          </p>
        </div>
      </div>
    </main>
  );
}
