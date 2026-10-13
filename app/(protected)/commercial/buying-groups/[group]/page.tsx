import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";
import BuyingGroupMemberTable from "./BuyingGroupMemberTable";
import MlcpExpandableSection from "./MlcpExpandableSection";


const NON_PRODUCT_CODES = new Set([
  "M",
  "S1",
  "LAYOUT",
  "PLTDELIVERY",
  "STDELIVERY",
]);

function normaliseProductCode(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

type ProductGroup =
  | "PIPE"
  | "FITTINGS"
  | "MLCP"
  | "MANIFOLDS"
  | "CONTROLS"
  | "PUMPS"
  | "FLOOR_SYSTEMS"
  | "ELECTRIC_UFH"
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
  { value: "FLOOR_SYSTEMS", label: "Floor Systems" },
  { value: "ELECTRIC_UFH", label: "Electric UFH" },
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

  if (
    text.includes("TOOL") ||
    text.includes("JAW") ||
    text.includes("PRESS GUN") ||
    text.includes("CALIBRATOR") ||
    text.includes("DECOILER")
  ) {
    return "TOOLS";
  }

  if (
    text.includes("CLIP") ||
    text.includes("RAIL") ||
    text.includes("STAPLE") ||
    text.includes("EDGE") ||
    text.includes("CONDUIT") ||
    text.includes("BEND") ||
    text.includes("PIPE SUPPORT") ||
    text.includes("SLEEVE")
  ) {
    return "ACCESSORIES";
  }
if (
  normalisedCode.startsWith("HSEPS") ||
  normalisedCode.startsWith("HSPROTHERM") ||
  text.includes("EPS PANEL") ||
  text.includes("EPS BOARD") ||
  text.includes("PRO THERM") ||
  text.includes("PROTHERM") ||
  text.includes("CHIPBOARD") ||
  text.includes("SPREADER PLATE") ||
  text.includes("SPREADER PANEL") ||
  text.includes("ALUMINIUM PLATE") ||
  text.includes("ALUMINUM PLATE") ||
  text.includes("LOW FIX") ||
  text.includes("LOWFIX") ||
  text.includes("WET SCREED PANEL") ||
  text.includes("WET SCREED UNDERFLOOR HEATING PANEL") ||
  text.includes("POLYSTYRENE ADHESIVE")
) {
  return "FLOOR_SYSTEMS";
}
  if (
  text.includes("MANIFOLD") ||
  text.includes("BLENDING VALVE") ||
  text.includes("FLOW METER") ||
  text.includes("BLANKING PLUG") ||
  text.includes("ISOLATION VALVE") ||
  text.includes("FILL & DRAIN")
) {
  return "MANIFOLDS";
}

  if (
    text.includes("PUMP") ||
    text.includes("GRUNDFOS")
  ) {
    return "PUMPS";
  }

if (
  normalisedCode.startsWith("HSE-MAT") ||
  normalisedCode.startsWith("HSEMAT") ||
  text.includes("ELECTRIC HEATING MAT") ||
  text.includes("ELECTRIC UFH MAT") ||
  text.includes("ELECTRIC STAT") ||
text.includes("ELECTRIC THERMOSTAT") ||
  text.includes("ELECTRIC UNDERFLOOR")
) {
  return "ELECTRIC_UFH";
}

  if (
  text.includes("THERMOSTAT") ||
  text.includes("ACTUATOR") ||
  text.includes("PROGRAMABLE STAT") ||
text.includes("PROGRAMMABLE STAT") ||
text.includes("CIRCULAR STAT") ||
text.includes("EXTERNAL SENSOR") ||
normalisedCode.startsWith("HS01RF") ||
  text.includes("WIRING CENTRE") ||
  text.includes("WIRING CENTER") ||
  text.includes("CONTROL") ||
  text.includes("HEATMISER") ||
  text.includes("ZONE VALVE") ||
  text.includes("UH8") ||
  text.includes("UH4") ||
  text.includes("NEOHUB") ||
  text.includes("NEOSTAT")
) {
  return "CONTROLS";
}

  if (
  normalisedCode.includes("HSINS") ||
  normalisedCode.startsWith("HSPC") ||
  normalisedCode.startsWith("HSSPM") ||
normalisedCode.startsWith("HSSPF") ||
normalisedCode.startsWith("HSSPE") ||
normalisedCode.startsWith("HSPSE") ||
  text.includes("MLCP") ||
  text.includes("MULTILAYER") ||
  text.includes("PRESS TO COPPER") ||
  text.includes("PRESS-TO-COPPER")
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

  if (
    normalisedCode.startsWith("HSPAP") ||
    normalisedCode.startsWith("HSEVOH")
  ) {
    return "PIPE";
  }

  return "OTHER";
}

type PageProps = {
  params: Promise<{
    group: string;
  }>;
};

function cleanCustomerName(value: string) {
  return value
    .replace(/\*+/g, "")
    .trim();
}

function normalizeCustomerName(
  value: string | null | undefined
) {
  return String(value ?? "")
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function money(value: number) {
  return value.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
  });
}

function normalizeInvoiceType(
  value: string | null | undefined
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function isCreditNote(invoice: {
  invoiceType: string | null;
}) {
  const type = normalizeInvoiceType(
    invoice.invoiceType
  );

  return (
    type === "CRD" ||
    type === "CREDIT" ||
    type.includes("CREDIT NOTE")
  );
}

function isCancelledInvoice(invoice: {
  customerOrderNumber: string | null;
}) {
  return (
    String(invoice.customerOrderNumber ?? "")
      .trim()
      .toLowerCase() === "cancelled"
  );
}

function isSalesInvoice(invoice: {
  invoiceType: string | null;
  customerOrderNumber: string | null;
}) {
  if (isCancelledInvoice(invoice)) {
    return false;
  }

  if (isCreditNote(invoice)) {
    return false;
  }

  const type = normalizeInvoiceType(
    invoice.invoiceType
  );

  return (
    !type ||
    type === "INV" ||
    type === "INVOICE" ||
    type.includes("INVOICE")
  );
}

function commercialNetValue(invoice: {
  invoiceType: string | null;
  customerOrderNumber: string | null;
  netValue: number | null;
}) {
  if (isCancelledInvoice(invoice)) {
    return 0;
  }

  const value = Number(
    invoice.netValue ?? 0
  );

  if (isCreditNote(invoice)) {
    return -Math.abs(value);
  }

  if (isSalesInvoice(invoice)) {
    return value;
  }

  return 0;
}

export default async function BuyingGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ group: string }>;
  searchParams: Promise<{
    status?: string;
    search?: string;
  }>;
}) {

const filters = await searchParams;

const selectedStatus = filters.status ?? "all";
const search = (filters.search ?? "").trim().toLowerCase();

  const { group } = await params;

  const buyingGroup = decodeURIComponent(group);

const buyingGroupDisplayName = buyingGroup
  .replace(/\s*-\s*Rebate$/i, "")
  .trim();

  const {
    companyId,
  } = await requireCompanyContext();

  const customers = await prisma.customer.findMany({
     where: {
    companyId,
    buyingGroup,
    status: "ACTIVE",
  },
  orderBy: {
    name: "asc",
  },
    select: {
      id: true,
      name: true,
      accountCode: true,
      status: true,
      buyingGroup: true,
     aliases: {
  select: {
    accountCode: true,
  },
},
    },
  });

  

const invoices = await prisma.salesInvoice.findMany({
  where: {
    companyId,
  },
  orderBy: {
    invoiceDate: "desc",
  },
});

const salesLines =
  await prisma.salesInvoiceLine.findMany({
    where: {
      stockCode: {
        not: null,
      },

      salesInvoice: {
        companyId,
      },
    },

    select: {
      stockCode: true,
      description: true,
      quantity: true,
      netValue: true,

      salesInvoice: {
        select: {
          invoiceDate: true,
          invoiceType: true,
          customerOrderNumber: true,
          customerAccountCode: true,
          customerName: true,
        },
      },
    },
  });

  if (customers.length === 0) {
    notFound();
  }

  const now = new Date();

  const currentYear = now.getFullYear();
  const previousYear = currentYear - 1;

  const startOfCurrentYear = new Date(
    Date.UTC(currentYear, 0, 1)
  );

  const startOfPreviousYear = new Date(
    Date.UTC(previousYear, 0, 1)
  );

  const comparisonEndLastYear = new Date(
    Date.UTC(
      previousYear,
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59
    )
  );

  const rows = customers.map((customer) => {
    let currentYearSales = 0;
    let previousYearSales = 0;
    let lastInvoiceDate: Date | null = null;

const aliasCodes = new Set(
  customer.aliases.map((alias) => alias.accountCode)
);

const customerInvoices = invoices.filter((invoice) => {
  if (
    invoice.customerAccountCode === customer.accountCode
  ) {
    return true;
  }

  if (
    invoice.customerAccountCode &&
    aliasCodes.has(invoice.customerAccountCode)
  ) {
    return true;
  }

  if (
    !invoice.customerAccountCode &&
    normalizeCustomerName(invoice.customerName) ===
      normalizeCustomerName(customer.name)
  ) {
    return true;
  }

  return false;
});

    for (const invoice of customerInvoices) {
      if (!invoice.invoiceDate) {
        continue;
      }

      const signedValue =
  commercialNetValue(invoice);
      if (
        invoice.invoiceDate >= startOfCurrentYear &&
        invoice.invoiceDate <= now
      ) {
        currentYearSales += signedValue;
      }

      if (
        invoice.invoiceDate >= startOfPreviousYear &&
        invoice.invoiceDate <= comparisonEndLastYear
      ) {
        previousYearSales += signedValue;
      }

      if (
        !lastInvoiceDate ||
        invoice.invoiceDate > lastInvoiceDate
      ) {
        lastInvoiceDate = invoice.invoiceDate;
      }
    }

    const movementValue =
      currentYearSales - previousYearSales;

    const movementPercent =
      previousYearSales !== 0
        ? (movementValue / previousYearSales) * 100
        : currentYearSales > 0
        ? 100
        : 0;

    let trend: "GROWING" | "DECLINING" | "FLAT" | "NO SALES";

    if (currentYearSales === 0) {
      trend = "NO SALES";
    } else if (movementPercent >= 10) {
      trend = "GROWING";
    } else if (movementPercent <= -10) {
      trend = "DECLINING";
    } else {
      trend = "FLAT";
    }

    return {
      id: customer.id,
      name: cleanCustomerName(customer.name),
      accountCode: customer.accountCode,
      status: customer.status,
      currentYearSales,
      previousYearSales,
      movementValue,
      movementPercent,
      lastInvoiceDate,
      trend,
    };
  });

  rows.sort(
    (a, b) =>
      a.movementValue - b.movementValue
  );

  const totalCurrentYear = rows.reduce(
    (sum, row) => sum + row.currentYearSales,
    0
  );

  const totalPreviousYear = rows.reduce(
  (sum, row) => sum + row.previousYearSales,
  0
);


const totalMovement =
    totalCurrentYear - totalPreviousYear;

  const totalMovementPercent =
    totalPreviousYear !== 0
      ? (totalMovement / totalPreviousYear) * 100
      : totalCurrentYear > 0
      ? 100
      : 0;

  const growingCount = rows.filter(
    (row) => row.trend === "GROWING"
  ).length;

  const decliningCount = rows.filter(
    (row) => row.trend === "DECLINING"
  ).length;

  const noSalesCount = rows.filter(
    (row) => row.trend === "NO SALES"
  ).length;

const flatCount = rows.filter(
  (row) => row.trend === "FLAT"
).length;

const activeCount = rows.filter(
  (row) => row.currentYearSales > 0
).length;

const biggestGrowth = [...rows]
  .filter((row) => row.movementValue > 0)
  .sort(
    (a, b) =>
      b.movementValue - a.movementValue
  )
  .slice(0, 5);

const biggestDeclines = [...rows]
  .filter((row) => row.movementValue < 0)
  .sort(
    (a, b) =>
      a.movementValue - b.movementValue
  )
  .slice(0, 5);

const totalGrowthContribution =
  biggestGrowth.reduce(
    (sum, row) =>
      sum + row.movementValue,
    0
  );

const totalDeclineContribution =
  biggestDeclines.reduce(
    (sum, row) =>
      sum + row.movementValue,
    0
  );
const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const buyingGroupAccountCodes = new Set(
  customers.flatMap((customer) => [
    customer.accountCode,
    ...customer.aliases.map(
      (alias) => alias.accountCode
    ),
  ])
);

const buyingGroupCustomerNames = new Set(
  customers.map((customer) =>
    normalizeCustomerName(customer.name)
  )
);

const buyingGroupCustomerIdByAccountCode =
  new Map<string, number>();

const buyingGroupCustomerIdByName =
  new Map<string, number>();

for (const customer of customers) {
  buyingGroupCustomerIdByName.set(
    normalizeCustomerName(customer.name),
    customer.id
  );

  if (customer.accountCode) {
    buyingGroupCustomerIdByAccountCode.set(
      customer.accountCode,
      customer.id
    );
  }

  for (const alias of customer.aliases) {
    if (alias.accountCode) {
      buyingGroupCustomerIdByAccountCode.set(
        alias.accountCode,
        customer.id
      );
    }
  }
}

type NbgProductPerformance = {
  code: string;
  description: string;
  currentSales: number;
  previousSales: number;
  currentQuantity: number;
  previousQuantity: number;
  currentBuyers: Set<string>;
previousBuyers: Set<string>;
  lastSold: Date | null;
};

const nbgProductMap = new Map<
  string,
  NbgProductPerformance
>();

function getNbgProduct(
  code: string,
  description: string
) {
  const existing = nbgProductMap.get(code);

  if (existing) {
    return existing;
  }

  const created: NbgProductPerformance = {
    code,
    description: description.trim() || code,
    currentSales: 0,
    previousSales: 0,
    currentQuantity: 0,
    previousQuantity: 0,
    lastSold: null,
    currentBuyers: new Set(),
    previousBuyers: new Set(),
  };

  nbgProductMap.set(code, created);

  return created;
}

const nbgCustomerProductSales = new Map<
  string,
  {
    current: Map<string, number>;
    previous: Map<string, number>;
  }
>();

for (const line of salesLines) {
  const invoice = line.salesInvoice;

  if (!invoice.invoiceDate) {
    continue;
  }

  const matchesBuyingGroup =
    Boolean(
      invoice.customerAccountCode &&
        buyingGroupAccountCodes.has(
          invoice.customerAccountCode
        )
    ) ||
    (!invoice.customerAccountCode &&
      buyingGroupCustomerNames.has(
        normalizeCustomerName(
          invoice.customerName
        )
      ));

 if (!matchesBuyingGroup) {
  continue;
}

const buyerCustomerId =
  (invoice.customerAccountCode
    ? buyingGroupCustomerIdByAccountCode.get(
        invoice.customerAccountCode.trim()
      )
    : undefined) ??
  buyingGroupCustomerIdByName.get(
    normalizeCustomerName(invoice.customerName)
  );

if (!buyerCustomerId) continue;

const buyerKey = String(buyerCustomerId);



if (
  String(
    invoice.customerOrderNumber ?? ""
    )
      .trim()
      .toLowerCase() === "cancelled"
  ) {
    continue;
  }

  const code =
    normaliseProductCode(line.stockCode);

  if (
    !code ||
    NON_PRODUCT_CODES.has(code)
  ) {
    continue;
  }

  const invoiceType =
    normalizeInvoiceType(
      invoice.invoiceType
    );

  const isCredit =
    invoiceType === "CRD" ||
    invoiceType === "CREDIT" ||
    invoiceType.includes("CREDIT NOTE");

  const rawQuantity =
    Number(line.quantity ?? 0);

  const rawSales =
    Number(line.netValue ?? 0);

  const quantity = isCredit
    ? -Math.abs(rawQuantity)
    : rawQuantity;

  const sales = isCredit
    ? -Math.abs(rawSales)
    : rawSales;

  const product = getNbgProduct(
    code,
    line.description ?? code
  );

 const customerProductSales =
  nbgCustomerProductSales.get(buyerKey) ?? {
    current: new Map<string, number>(),
    previous: new Map<string, number>(),
  };


if (
  invoice.invoiceDate >= startOfCurrentYear &&
  invoice.invoiceDate <= now
) {
  product.currentSales += sales;
  product.currentQuantity += quantity;

  customerProductSales.current.set(
    code,
    (customerProductSales.current.get(code) ?? 0) + sales
  );

  nbgCustomerProductSales.set(
    buyerKey,
    customerProductSales
  );

  if (!isCredit && rawQuantity > 0) {
    product.currentBuyers.add(buyerKey);
  }
}

if (
  !isCredit &&
  rawQuantity > 0 &&
  (
    !product.lastSold ||
    invoice.invoiceDate > product.lastSold
  )
) {
  product.lastSold = invoice.invoiceDate;
}

if (
  invoice.invoiceDate >= startOfPreviousYear &&
  invoice.invoiceDate <= comparisonEndLastYear
) {
  product.previousSales += sales;
  product.previousQuantity += quantity;

  customerProductSales.previous.set(
    code,
    (customerProductSales.previous.get(code) ?? 0) + sales
  );

  nbgCustomerProductSales.set(
    buyerKey,
    customerProductSales
  );

  if (!isCredit && rawQuantity > 0) {
    product.previousBuyers.add(buyerKey);
  }
}

} // closes for (const line of salesLines)
 
const productAliases = await prisma.productAlias.findMany({
  where: {
    companyId,
  },
  select: {
    aliasCode: true,
    product: {
      select: {
        productCode: true,
      },
    },
  },
});

for (const alias of productAliases) {
  const aliasCode =
    normaliseProductCode(
      alias.aliasCode
    );

  const productCode =
    normaliseProductCode(
      alias.product.productCode
    );

  if (
    !aliasCode ||
    !productCode ||
    aliasCode === productCode
  ) {
    continue;
  }

  const aliasProduct =
    nbgProductMap.get(aliasCode);

  if (!aliasProduct) {
    continue;
  }

  const canonicalProduct =
    getNbgProduct(
      productCode,
      aliasProduct.description
    );

  canonicalProduct.currentSales +=
    aliasProduct.currentSales;

  canonicalProduct.previousSales +=
    aliasProduct.previousSales;


  canonicalProduct.currentQuantity +=
    aliasProduct.currentQuantity;

  canonicalProduct.previousQuantity +=
    aliasProduct.previousQuantity;

for (const buyer of aliasProduct.currentBuyers) {
  canonicalProduct.currentBuyers.add(buyer);
}

for (const buyer of aliasProduct.previousBuyers) {
  canonicalProduct.previousBuyers.add(buyer);
}

  if (
    aliasProduct.lastSold &&
    (
      !canonicalProduct.lastSold ||
      aliasProduct.lastSold >
        canonicalProduct.lastSold
    )
  ) {
    canonicalProduct.lastSold =
      aliasProduct.lastSold;
  }

  nbgProductMap.delete(aliasCode);
}
// Merge product aliases into canonical product codes
// for customer-level product sales as well.
for (const alias of productAliases) {
  const aliasCode =
    normaliseProductCode(alias.aliasCode);

  const productCode =
    normaliseProductCode(
      alias.product.productCode
    );

  if (
    !aliasCode ||
    !productCode ||
    aliasCode === productCode
  ) {
    continue;
  }

  for (const customerSales of nbgCustomerProductSales.values()) {
    const aliasCurrentSales =
      customerSales.current.get(aliasCode) ?? 0;

    if (aliasCurrentSales !== 0) {
      customerSales.current.set(
        productCode,
        (customerSales.current.get(productCode) ?? 0) +
          aliasCurrentSales
      );

      customerSales.current.delete(aliasCode);
    }

    const aliasPreviousSales =
      customerSales.previous.get(aliasCode) ?? 0;

    if (aliasPreviousSales !== 0) {
      customerSales.previous.set(
        productCode,
        (customerSales.previous.get(productCode) ?? 0) +
          aliasPreviousSales
      );

      customerSales.previous.delete(aliasCode);
    }
  }
}
const nbgProductPerformance =
  [...nbgProductMap.values()]
    .map((product) => {
      const difference =
        product.currentSales -
        product.previousSales;

      const percentage =
        product.previousSales !== 0
          ? (difference /
              Math.abs(
                product.previousSales
              )) *
            100
          : product.currentSales > 0
          ? 100
          : 0;

      return {
        ...product,
        difference,
        percentage,
      };
    })
    .filter(
      (product) =>
        product.currentSales !== 0 ||
        product.previousSales !== 0
    )
    .sort(
      (a, b) =>
        b.currentSales -
        a.currentSales
    );

const nbgProductCurrentTotal =
  nbgProductPerformance.reduce(
    (total, product) =>
      total + product.currentSales,
    0
  );

const nbgProductPreviousTotal =
  nbgProductPerformance.reduce(
    (total, product) =>
      total + product.previousSales,
    0
  );

type NbgProductGroupPerformance = {
  group: ProductGroup;
  label: string;
  currentSales: number;
  previousSales: number;
  currentQuantity: number;
  previousQuantity: number;
};

const nbgProductGroupPerformance =
  PRODUCT_GROUPS.map(({ value, label }) => {
    const products =
      nbgProductPerformance.filter(
        (product) =>
          classifyProduct(
            product.code,
            product.description
          ) === value
      );
const currentBuyers = new Set<string>();
const previousBuyers = new Set<string>();

for (const product of products) {
  for (const buyer of product.currentBuyers) {
    currentBuyers.add(buyer);
  }

  for (const buyer of product.previousBuyers) {
    previousBuyers.add(buyer);
  }
}
    const currentSales =
      products.reduce(
        (total, product) =>
          total + product.currentSales,
        0
      );

    const previousSales =
      products.reduce(
        (total, product) =>
          total + product.previousSales,
        0
      );

    const currentQuantity =
      products.reduce(
        (total, product) =>
          total + product.currentQuantity,
        0
      );

    const previousQuantity =
      products.reduce(
        (total, product) =>
          total + product.previousQuantity,
        0
      );

    const difference =
      currentSales - previousSales;

    const percentage =
      previousSales !== 0
        ? (difference /
            Math.abs(previousSales)) *
          100
        : currentSales > 0
        ? 100
        : 0;

    return {
      group: value,
      label,
      currentSales,
      previousSales,
      currentQuantity,
      previousQuantity,
      difference,
      percentage,
      currentBuyers,
      previousBuyers,
      currentBuyerCount: currentBuyers.size,
      previousBuyerCount: previousBuyers.size,
      productCount: products.length,
    };
  }).filter(
    (group) =>
      group.currentSales !== 0 ||
      group.previousSales !== 0
  );

const mlcpProducts =
  nbgProductPerformance
    .filter(
      (product) =>
        classifyProduct(
          product.code,
          product.description
        ) === "MLCP"
    )
    .sort(
      (a, b) =>
        b.currentSales - a.currentSales
    );


const mlcpPreInsulatedProducts =
  mlcpProducts.filter((product) =>
    normaliseProductCode(product.code).startsWith("HSINS")
  );

const mlcpFittingProducts =
  mlcpProducts.filter(
    (product) =>
      !normaliseProductCode(product.code).startsWith("HSINS")
  );
const mlcpPreInsulatedCurrentSales =
  mlcpPreInsulatedProducts.reduce(
    (total, product) => total + product.currentSales,
    0
  );

const mlcpPreInsulatedPreviousSales =
  mlcpPreInsulatedProducts.reduce(
    (total, product) => total + product.previousSales,
    0
  );

const mlcpFittingsCurrentSales =
  mlcpFittingProducts.reduce(
    (total, product) => total + product.currentSales,
    0
  );

const mlcpFittingsPreviousSales =
  mlcpFittingProducts.reduce(
    (total, product) => total + product.previousSales,
    0
  );
 const mlcpPreInsulatedDifference =
  mlcpPreInsulatedCurrentSales -
  mlcpPreInsulatedPreviousSales;

const mlcpPreInsulatedPercentage =
  mlcpPreInsulatedPreviousSales !== 0
    ? (mlcpPreInsulatedDifference /
        Math.abs(mlcpPreInsulatedPreviousSales)) *
      100
    : mlcpPreInsulatedCurrentSales > 0
      ? 100
      : 0;

const mlcpFittingsDifference =
  mlcpFittingsCurrentSales -
  mlcpFittingsPreviousSales;

const mlcpFittingsPercentage =
  mlcpFittingsPreviousSales !== 0
    ? (mlcpFittingsDifference /
        Math.abs(mlcpFittingsPreviousSales)) *
      100
    : mlcpFittingsCurrentSales > 0
      ? 100
      : 0;

const topMlcpProducts =
  [...mlcpProducts]
    .filter((product) => product.currentSales > 0)
    .sort(
      (a, b) =>
        b.currentSales - a.currentSales
    )
    .slice(0, 5);

const growingMlcpProducts =
  [...mlcpProducts]
    .map((product) => ({
      ...product,
      salesDifference:
        product.currentSales - product.previousSales,
    }))
    .filter(
      (product) => product.salesDifference > 0
    )
    .sort(
      (a, b) =>
        b.salesDifference - a.salesDifference
    )
    .slice(0, 5);

const decliningMlcpProducts =
  [...mlcpProducts]
    .map((product) => ({
      ...product,
      salesDifference:
        product.currentSales - product.previousSales,
    }))
    .filter(
      (product) => product.salesDifference < 0
    )
    .sort(
      (a, b) =>
        a.salesDifference - b.salesDifference
    )
    .slice(0, 5);


const mlcpGroup =
  nbgProductGroupPerformance.find(
    (group) => group.group === "MLCP"
  );

const mlcpCurrentBuyers =
  mlcpGroup?.currentBuyers ?? new Set<string>();

const mlcpPreviousBuyers =
  mlcpGroup?.previousBuyers ?? new Set<string>();

const mlcpNewBuyers =
  [...mlcpCurrentBuyers].filter(
    (buyer) => !mlcpPreviousBuyers.has(buyer)
  );

const mlcpRetainedBuyers =
  [...mlcpCurrentBuyers].filter(
    (buyer) => mlcpPreviousBuyers.has(buyer)
  );

const mlcpLapsedBuyers =
  [...mlcpPreviousBuyers].filter(
    (buyer) => !mlcpCurrentBuyers.has(buyer)
  );

const mlcpOpportunityCustomers =
  customers.filter(
    (customer) =>
      !mlcpCurrentBuyers.has(String(customer.id))
  );
const mlcpOpportunityRows =
  rows
    .filter(
      (row) =>
        !mlcpCurrentBuyers.has(String(row.id))
    )
    .sort(
      (a, b) =>
        b.currentYearSales - a.currentYearSales
    );
const mlcpActiveOpportunityRows =
  mlcpOpportunityRows.filter(
    (row) => row.currentYearSales > 0
  );

const mlcpDormantOpportunityRows =
  mlcpOpportunityRows.filter(
    (row) => row.currentYearSales <= 0
  );

const mlcpCrossSellRows =
  mlcpOpportunityRows.filter(
    (row) =>
      !mlcpPreviousBuyers.has(String(row.id))
  );

const getCustomerMlcpSales = (
  customerId: string,
  period: "current" | "previous"
) => {
  const customerProductSales =
    nbgCustomerProductSales.get(customerId);

  return mlcpProducts.reduce(
    (total, product) =>
      total +
      (customerProductSales?.[period].get(
        normaliseProductCode(product.code)
      ) ?? 0),
    0
  );
};

const mlcpCurrentBuyerRows =
  rows
    .filter((row) =>
      mlcpCurrentBuyers.has(String(row.id))
    )
    .map((row) => ({
      ...row,
      mlcpSales: getCustomerMlcpSales(
        String(row.id),
        "current"
      ),
    }))
    .sort((a, b) => b.mlcpSales - a.mlcpSales);

const mlcpNewBuyerRows =
  rows
    .filter((row) =>
      mlcpNewBuyers.includes(String(row.id))
    )
    .map((row) => ({
      ...row,
      mlcpSales: getCustomerMlcpSales(
        String(row.id),
        "current"
      ),
    }))
    .sort((a, b) => b.mlcpSales - a.mlcpSales);

const mlcpLapsedBuyerRows =
  rows
    .filter((row) =>
      mlcpLapsedBuyers.includes(String(row.id))
    )
    .map((row) => ({
      ...row,
      mlcpSales: getCustomerMlcpSales(
        String(row.id),
        "previous"
      ),
    }))
    .sort((a, b) => b.mlcpSales - a.mlcpSales); 
const mlcpCustomerGrowthDrivers =
  rows
    .map((row) => {
      const customerProductSales =
        nbgCustomerProductSales.get(String(row.id));

      const currentMlcpSales =
        mlcpProducts.reduce(
          (total, product) =>
            total +
            (customerProductSales?.current.get(
              normaliseProductCode(product.code)
            ) ?? 0),
          0
        );

      const previousMlcpSales =
        mlcpProducts.reduce(
          (total, product) =>
            total +
            (customerProductSales?.previous.get(
              normaliseProductCode(product.code)
            ) ?? 0),
          0
        );

      return {
        ...row,
        currentMlcpSales,
        previousMlcpSales,
        mlcpGrowth:
          currentMlcpSales - previousMlcpSales,
      };
    })
    .filter((row) => row.mlcpGrowth > 0)
    .sort((a, b) => b.mlcpGrowth - a.mlcpGrowth)
    .slice(0, 5);


const mlcpCustomerSalesReconciliation =
  [...nbgCustomerProductSales.values()].reduce(
    (grandTotal, customerSales) => {
      const customerMlcpSales =
        mlcpProducts.reduce(
          (total, product) =>
            total +
            (customerSales.current.get(
              normaliseProductCode(product.code)
            ) ?? 0),
          0
        );

      return grandTotal + customerMlcpSales;
    },
    0
  );



const mlcpPenetration =
  customers.length > 0
    ? (mlcpCurrentBuyers.size / customers.length) * 100
    : 0;

const floorSystemsGroup =
  nbgProductGroupPerformance.find(
    (group) => group.group === "FLOOR_SYSTEMS"
  );


 const floorSystemProducts =
  nbgProductPerformance.filter(
    (product) =>
      classifyProduct(
        product.code,
        product.description
      ) === "FLOOR_SYSTEMS"
  );

const floorSystemCustomerPerformance =
  rows
    .map((row) => {
      const customerProductSales =
        nbgCustomerProductSales.get(String(row.id));

      const currentFloorSystemSales =
        floorSystemProducts.reduce(
          (total, product) =>
            total +
            (customerProductSales?.current.get(
              normaliseProductCode(product.code)
            ) ?? 0),
          0
        );

      const previousFloorSystemSales =
        floorSystemProducts.reduce(
          (total, product) =>
            total +
            (customerProductSales?.previous.get(
              normaliseProductCode(product.code)
            ) ?? 0),
          0
        );

      return {
        ...row,
        currentFloorSystemSales,
        previousFloorSystemSales,
        floorSystemMovement:
          currentFloorSystemSales -
          previousFloorSystemSales,
      };
    });

const floorSystemDecliningCustomers =
  floorSystemCustomerPerformance
    .filter(
      (row) => row.floorSystemMovement < 0
    )
    .sort(
      (a, b) =>
        a.floorSystemMovement -
        b.floorSystemMovement
    );

const floorSystemGrowingCustomers =
  floorSystemCustomerPerformance
    .filter(
      (row) => row.floorSystemMovement > 0
    )
    .sort(
      (a, b) =>
        b.floorSystemMovement -
        a.floorSystemMovement
    );

const floorSystemStoppedCustomers =
  floorSystemCustomerPerformance
    .filter(
      (row) =>
        row.previousFloorSystemSales > 0 &&
        row.currentFloorSystemSales === 0
    )
    .sort(
      (a, b) =>
        b.previousFloorSystemSales -
        a.previousFloorSystemSales
    );

    const electricUfhGroup =
  nbgProductGroupPerformance.find(
    (group) => group.group === "ELECTRIC_UFH"
  );

const electricUfhProducts =
  nbgProductPerformance.filter(
    (product) =>
      classifyProduct(
        product.code,
        product.description
      ) === "ELECTRIC_UFH"
  );

const electricUfhCustomerPerformance =
  rows.map((row) => {
    const customerProductSales =
      nbgCustomerProductSales.get(String(row.id));

    const currentElectricUfhSales =
      electricUfhProducts.reduce(
        (total, product) =>
          total +
          (customerProductSales?.current.get(
            normaliseProductCode(product.code)
          ) ?? 0),
        0
      );

    const previousElectricUfhSales =
      electricUfhProducts.reduce(
        (total, product) =>
          total +
          (customerProductSales?.previous.get(
            normaliseProductCode(product.code)
          ) ?? 0),
        0
      );

    return {
      ...row,
      currentElectricUfhSales,
      previousElectricUfhSales,
      electricUfhMovement:
        currentElectricUfhSales - previousElectricUfhSales,
    };
  });

const electricUfhDecliningCustomers =
  electricUfhCustomerPerformance
    .filter((row) => row.electricUfhMovement < 0)
    .sort(
      (a, b) =>
        a.electricUfhMovement - b.electricUfhMovement
    );

const electricUfhGrowingCustomers =
  electricUfhCustomerPerformance
    .filter((row) => row.electricUfhMovement > 0)
    .sort(
      (a, b) =>
        b.electricUfhMovement - a.electricUfhMovement
    );

const electricUfhStoppedCustomers =
  electricUfhCustomerPerformance
    .filter(
      (row) =>
        row.previousElectricUfhSales > 0 &&
        row.currentElectricUfhSales === 0
    )
    .sort(
      (a, b) =>
        b.previousElectricUfhSales -
        a.previousElectricUfhSales
    );
   

const accessoriesGroup =
  nbgProductGroupPerformance.find(
    (group) => group.group === "ACCESSORIES"
  );

const accessoryProducts =
  nbgProductPerformance.filter(
    (product) =>
      classifyProduct(
        product.code,
        product.description
      ) === "ACCESSORIES"
  );

const accessoryCustomerPerformance =
  rows.map((row) => {
    const customerProductSales =
      nbgCustomerProductSales.get(String(row.id));

    const currentAccessorySales =
      accessoryProducts.reduce(
        (total, product) =>
          total +
          (customerProductSales?.current.get(
            normaliseProductCode(product.code)
          ) ?? 0),
        0
      );

    const previousAccessorySales =
      accessoryProducts.reduce(
        (total, product) =>
          total +
          (customerProductSales?.previous.get(
            normaliseProductCode(product.code)
          ) ?? 0),
        0
      );

    return {
      ...row,
      currentAccessorySales,
      previousAccessorySales,
      accessoryMovement:
        currentAccessorySales - previousAccessorySales,
    };
  });

const accessoryDecliningCustomers =
  accessoryCustomerPerformance
    .filter((row) => row.accessoryMovement < 0)
    .sort(
      (a, b) =>
        a.accessoryMovement - b.accessoryMovement
    );

const accessoryGrowingCustomers =
  accessoryCustomerPerformance
    .filter((row) => row.accessoryMovement > 0)
    .sort(
      (a, b) =>
        b.accessoryMovement - a.accessoryMovement
    );

const accessoryStoppedCustomers =
  accessoryCustomerPerformance
    .filter(
      (row) =>
        row.previousAccessorySales > 0 &&
        row.currentAccessorySales === 0
    )
    .sort(
      (a, b) =>
        b.previousAccessorySales -
        a.previousAccessorySales
    );

// NBG Meeting Brief
const meetingBriefGrowthCustomers = [...rows]
  .filter((row) => row.movementValue > 0)
  .sort((a, b) => b.movementValue - a.movementValue)
  .slice(0, 5);

const meetingBriefDecliningCustomers = [...rows]
  .filter((row) => row.movementValue < 0)
  .sort((a, b) => a.movementValue - b.movementValue)
  .slice(0, 5);

const meetingBriefStoppedCustomers = [...rows]
  .filter(
    (row) =>
      row.previousYearSales > 0 &&
      row.currentYearSales === 0
  )
  .sort(
    (a, b) =>
      b.previousYearSales - a.previousYearSales
  );

const meetingBriefActiveCustomers = rows.filter(
  (row) => row.currentYearSales > 0
).length;

const meetingBriefNoSalesCustomers = rows.filter(
  (row) => row.currentYearSales === 0
).length;

const meetingBriefGrowthValue =
  meetingBriefGrowthCustomers.reduce(
    (total, row) => total + row.movementValue,
    0
  );

const meetingBriefDeclineValue =
  meetingBriefDecliningCustomers.reduce(
    (total, row) => total + row.movementValue,
    0
  );

const meetingBriefStoppedValue =
  meetingBriefStoppedCustomers.reduce(
    (total, row) => total + row.previousYearSales,
    0
  );
const meetingBriefMovement =
  totalCurrentYear - totalPreviousYear;

const meetingBriefMovementPercentage =
  totalPreviousYear !== 0
    ? (meetingBriefMovement /
        Math.abs(totalPreviousYear)) *
      100
    : totalCurrentYear > 0
      ? 100
      : 0;

const meetingBriefTopGrowthCustomer =
  meetingBriefGrowthCustomers[0] ?? null;

const meetingBriefTopDecliningCustomer =
  meetingBriefDecliningCustomers[0] ?? null;

const meetingBriefLargestStoppedCustomer =
  meetingBriefStoppedCustomers[0] ?? null;
const meetingBriefCategories =
  nbgProductGroupPerformance.filter(
    (category) => category.group !== "OTHER"
  );

const meetingBriefStrongestCategory =
  [...meetingBriefCategories]
    .filter((category) => category.difference > 0)
    .sort(
      (a, b) => b.difference - a.difference
    )[0] ?? null;

const meetingBriefWeakestCategory =
  [...meetingBriefCategories]
    .filter((category) => category.difference < 0)
    .sort(
      (a, b) => a.difference - b.difference
    )[0] ?? null;

    const pipeGroup =
  nbgProductGroupPerformance.find(
    (group) => group.group === "PIPE"
  );

const pipeProducts =
  nbgProductPerformance.filter(
    (product) =>
      classifyProduct(
        product.code,
        product.description
      ) === "PIPE"
  );

const pipeCustomerPerformance =
  rows.map((row) => {
    const customerProductSales =
      nbgCustomerProductSales.get(String(row.id));

    const currentPipeSales =
      pipeProducts.reduce(
        (total, product) =>
          total +
          (customerProductSales?.current.get(
            normaliseProductCode(product.code)
          ) ?? 0),
        0
      );

    const previousPipeSales =
      pipeProducts.reduce(
        (total, product) =>
          total +
          (customerProductSales?.previous.get(
            normaliseProductCode(product.code)
          ) ?? 0),
        0
      );

    return {
      ...row,
      currentPipeSales,
      previousPipeSales,
      pipeMovement:
        currentPipeSales - previousPipeSales,
    };
  });

const pipeDecliningCustomers =
  pipeCustomerPerformance
    .filter((row) => row.pipeMovement < 0)
    .sort(
      (a, b) =>
        a.pipeMovement - b.pipeMovement
    );

const pipeGrowingCustomers =
  pipeCustomerPerformance
    .filter((row) => row.pipeMovement > 0)
    .sort(
      (a, b) =>
        b.pipeMovement - a.pipeMovement
    );

const pipeStoppedCustomers =
  pipeCustomerPerformance
    .filter(
      (row) =>
        row.previousPipeSales > 0 &&
        row.currentPipeSales === 0
    )
    .sort(
      (a, b) =>
        b.previousPipeSales -
        a.previousPipeSales
    );



const manifoldsGroup =
  nbgProductGroupPerformance.find(
    (group) => group.group === "MANIFOLDS"
  );

const manifoldProducts =
  nbgProductPerformance.filter(
    (product) =>
      classifyProduct(
        product.code,
        product.description
      ) === "MANIFOLDS"
  );

const manifoldCustomerPerformance =
  rows.map((row) => {
    const customerProductSales =
      nbgCustomerProductSales.get(String(row.id));

    const currentManifoldSales =
      manifoldProducts.reduce(
        (total, product) =>
          total +
          (customerProductSales?.current.get(
            normaliseProductCode(product.code)
          ) ?? 0),
        0
      );

    const previousManifoldSales =
      manifoldProducts.reduce(
        (total, product) =>
          total +
          (customerProductSales?.previous.get(
            normaliseProductCode(product.code)
          ) ?? 0),
        0
      );

    return {
      ...row,
      currentManifoldSales,
      previousManifoldSales,
      manifoldMovement:
        currentManifoldSales - previousManifoldSales,
    };
  });

const manifoldDecliningCustomers =
  manifoldCustomerPerformance
    .filter((row) => row.manifoldMovement < 0)
    .sort(
      (a, b) =>
        a.manifoldMovement - b.manifoldMovement
    );

const manifoldGrowingCustomers =
  manifoldCustomerPerformance
    .filter((row) => row.manifoldMovement > 0)
    .sort(
      (a, b) =>
        b.manifoldMovement - a.manifoldMovement
    );

const manifoldStoppedCustomers =
  manifoldCustomerPerformance
    .filter(
      (row) =>
        row.previousManifoldSales > 0 &&
        row.currentManifoldSales === 0
    )
    .sort(
      (a, b) =>
        b.previousManifoldSales -
        a.previousManifoldSales
    );


const controlsGroup =
  nbgProductGroupPerformance.find(
    (group) => group.group === "CONTROLS"
  );

const controlProducts =
  nbgProductPerformance.filter(
    (product) =>
      classifyProduct(
        product.code,
        product.description
      ) === "CONTROLS"
  );

const controlCustomerPerformance =
  rows
    .map((row) => {
      const customerProductSales =
        nbgCustomerProductSales.get(String(row.id));

      const currentControlSales =
        controlProducts.reduce(
          (total, product) =>
            total +
            (customerProductSales?.current.get(
              normaliseProductCode(product.code)
            ) ?? 0),
          0
        );

      const previousControlSales =
        controlProducts.reduce(
          (total, product) =>
            total +
            (customerProductSales?.previous.get(
              normaliseProductCode(product.code)
            ) ?? 0),
          0
        );

      return {
        ...row,
        currentControlSales,
        previousControlSales,
        controlMovement:
          currentControlSales - previousControlSales,
      };
    });

const controlDecliningCustomers =
  controlCustomerPerformance
    .filter(
      (row) => row.controlMovement < 0
    )
    .sort(
      (a, b) =>
        a.controlMovement -
        b.controlMovement
    );

const controlGrowingCustomers =
  controlCustomerPerformance
    .filter(
      (row) => row.controlMovement > 0
    )
    .sort(
      (a, b) =>
        b.controlMovement -
        a.controlMovement
    );

const controlStoppedCustomers =
  controlCustomerPerformance
    .filter(
      (row) =>
        row.previousControlSales > 0 &&
        row.currentControlSales === 0
    )
    .sort(
      (a, b) =>
        b.previousControlSales -
        a.previousControlSales
    );


const nbgProductGroupCurrentTotal =
  nbgProductGroupPerformance.reduce(
    (total, group) =>
      total + group.currentSales,
    0
  );

const nbgProductGroupPreviousTotal =
  nbgProductGroupPerformance.reduce(
    (total, group) =>
      total + group.previousSales,
    0
  );

const nbgOtherProducts =
  nbgProductPerformance
    .filter(
      (product) =>
        classifyProduct(
          product.code,
          product.description
        ) === "OTHER"
    )
    .sort(
      (a, b) =>
        b.currentSales - a.currentSales
    )
    .slice(0, 30)
    .map((product) => ({
      code: product.code,
      description: product.description,
      current: product.currentSales.toFixed(2),
      previous: product.previousSales.toFixed(2),
    }));


const monthlyPerformance = monthNames.map(
  (month, monthIndex) => {
    let current = 0;
    let previous = 0;

    const isPastMonth =
      monthIndex < now.getUTCMonth();

    const isCurrentMonth =
      monthIndex === now.getUTCMonth();

    const isFutureMonth =
      monthIndex > now.getUTCMonth();

    const previousYearSameDay = new Date(
      Date.UTC(
        previousYear,
        monthIndex,
        now.getUTCDate(),
        23,
        59,
        59,
        999
      )
    );

    for (const invoice of invoices) {
      if (!invoice.invoiceDate) {
        continue;
      }

      const matchesBuyingGroup =
        Boolean(
          invoice.customerAccountCode &&
            buyingGroupAccountCodes.has(
              invoice.customerAccountCode
            )
        ) ||
        (!invoice.customerAccountCode &&
          buyingGroupCustomerNames.has(
            normalizeCustomerName(
              invoice.customerName
            )
          ));

      if (!matchesBuyingGroup) {
        continue;
      }

      const invoiceDate = new Date(
        invoice.invoiceDate
      );

      if (
        invoiceDate.getUTCMonth() !==
        monthIndex
      ) {
        continue;
      }

      const value =
        commercialNetValue(invoice);

      // Current year:
      // past months = full month
      // current month = month to date
      // future months = no sales yet
      if (
        invoiceDate.getUTCFullYear() ===
          currentYear &&
        invoiceDate <= now
      ) {
        current += value;
      }

      // Previous year:
      // past months = full month
      // current month = same point last year
      // future months = full historical month
      if (
        invoiceDate.getUTCFullYear() ===
        previousYear
      ) {
        if (
          isPastMonth ||
          isFutureMonth
        ) {
          previous += value;
        } else if (
          isCurrentMonth &&
          invoiceDate <=
            previousYearSameDay
        ) {
          previous += value;
        }
      }
    }

    const difference =
      current - previous;

    const percentage =
      previous !== 0
        ? (difference / previous) * 100
        : current > 0
        ? 100
        : 0;

    return {
      month,
      current,
      previous,
      difference,
      percentage,
    };
  }
);
  
const filteredRows = rows.filter((row) => {
  const matchesStatus =
    selectedStatus === "all" ||
    row.trend.toLowerCase().replace(" ", "-") === selectedStatus;

  const matchesSearch =
    !search ||
    row.name.toLowerCase().includes(search) ||
    row.accountCode.toLowerCase().includes(search);

  return matchesStatus && matchesSearch;
});

const customersRequiringAttention = rows
  .filter((row) => {
    // Customer bought last year but has no sales this year
    if (
      row.currentYearSales === 0 &&
      row.previousYearSales > 0
    ) {
      return true;
    }

    // Customer is at least 10% down year on year
    if (
      row.previousYearSales > 0 &&
      row.movementPercent <= -10
    ) {
      return true;
    }

    return false;
  })
  .sort((a, b) => a.movementValue - b.movementValue);

const memberTableRows = rows.map((row) => ({
  id: row.id,
  name: row.name,
  accountCode: row.accountCode,
  currentYearSales: row.currentYearSales,
  previousYearSales: row.previousYearSales,
  movementValue: row.movementValue,
  movementPercent: row.movementPercent,
  lastInvoiceDate: row.lastInvoiceDate
    ? row.lastInvoiceDate.toISOString()
    : null,
  trend: row.trend,
}));
const meetingActionGrowthCustomer =
  meetingBriefTopGrowthCustomer;

const meetingActionRecoveryCustomer =
  meetingBriefTopDecliningCustomer;

const meetingActionWinBackCustomer =
  meetingBriefLargestStoppedCustomer;

const meetingActionMlcpOpportunity =
  mlcpActiveOpportunityRows[0] ?? null;

  return (
    <main className="p-8">
      <Link
        href="/commercial/customers"
        className="text-sm font-semibold text-amber-600 hover:underline"
      >
        ← Back to Customers
      </Link>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
          Buying Group Performance
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          {buyingGroupDisplayName}
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Performance of all customers currently allocated to this buying group.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          label="Members"
          value={String(rows.length)}
        />

        <SummaryCard
          label={`${currentYear} YTD`}
          value={money(totalCurrentYear)}
        />

        <SummaryCard
          label={`${previousYear} YTD`}
          value={money(totalPreviousYear)}
        />

        <SummaryCard
          label="Movement"
          value={`${totalMovementPercent >= 0 ? "+" : ""}${totalMovementPercent.toFixed(
            1
          )}%`}
        />

       <SummaryCard
  label="Declining"
  value={String(decliningCount)}
/>

<SummaryCard
  label="No Sales"
  value={String(noSalesCount)}
/>
      </div>
<section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
      Odin Group Intelligence
    </p>

    <h2 className="mt-1 text-xl font-bold text-slate-950">
      What is driving {buyingGroupDisplayName}?
    </h2>

    <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
     {buyingGroupDisplayName} is currently{" "}
      <span
        className={
          totalMovementPercent >= 0
            ? "font-semibold text-emerald-700"
            : "font-semibold text-red-700"
        }
      >
        {totalMovementPercent >= 0 ? "up" : "down"}{" "}
        {Math.abs(totalMovementPercent).toFixed(1)}%
      </span>{" "}
      year to date, with sales of{" "}
      <span className="font-semibold text-slate-950">
        {money(totalCurrentYear)}
      </span>{" "}
      compared with{" "}
      <span className="font-semibold text-slate-950">
        {money(totalPreviousYear)}
      </span>{" "}
      for the same period last year.
      {" "}
      {activeCount} of {rows.length} members have sales this year.
      {" "}
      {growingCount} are growing, {decliningCount} are declining,
      {" "}
      {flatCount} are broadly flat and {noSalesCount} have no sales.
    </p>
  </div>

  <div className="mt-6 grid gap-6 lg:grid-cols-2">
    <div>
      <h3 className="text-sm font-bold text-emerald-700">
        Biggest Growth Contributors
      </h3>

      <div className="mt-3 space-y-2">
        {biggestGrowth.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3"
          >
            <span className="font-semibold text-slate-900">
              {row.name}
            </span>

            <span className="font-bold text-emerald-700">
              +{money(row.movementValue)}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Top five growth contributors:{" "}
        <span className="font-semibold text-emerald-700">
          +{money(totalGrowthContribution)}
        </span>
      </p>
    </div>

    <div>
      <h3 className="text-sm font-bold text-red-700">
        Biggest Sales Declines
      </h3>

      <div className="mt-3 space-y-2">
        {biggestDeclines.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3"
          >
            <span className="font-semibold text-slate-900">
              {row.name}
            </span>

            <span className="font-bold text-red-700">
              {money(row.movementValue)}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Top five sales declines:{" "}
        <span className="font-semibold text-red-700">
          {money(totalDeclineContribution)}
        </span>
      </p>
    </div>
  </div>
</section>
<section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
  <div className="border-b border-slate-200 px-6 py-5">
    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
      Odin Executive Intelligence
    </p>

    <h2 className="mt-1 text-xl font-bold text-slate-950">
      {buyingGroupDisplayName} Meeting Brief
    </h2>

    <p className="mt-1 text-sm text-slate-500">
      Key commercial points to take into the meeting, based on current year-to-date performance.
    </p>
  </div>

  <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Group Performance
      </p>

      <p className="mt-2 text-lg font-bold text-slate-950">
        {money(totalCurrentYear)}
      </p>

      <p
        className={`mt-1 text-sm font-semibold ${
          meetingBriefMovement >= 0
            ? "text-emerald-700"
            : "text-red-700"
        }`}
      >
        {meetingBriefMovement >= 0 ? "+" : ""}
        {meetingBriefMovementPercentage.toFixed(1)}% vs {previousYear}
      </p>

      <p className="mt-2 text-sm text-slate-600">
        {money(Math.abs(meetingBriefMovement))}{" "}
        {meetingBriefMovement >= 0 ? "ahead of" : "behind"} the same period last year.
      </p>
      <p className="mt-2 text-xs font-medium text-amber-700">
  Growth is concentrated: the top 5 growers have added{" "}
  {money(meetingBriefGrowthValue)} against net group growth of{" "}
  {money(Math.abs(meetingBriefMovement))}.
</p>
    </div>

    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
        Biggest Growth Driver
      </p>

      <p className="mt-2 text-lg font-bold text-slate-950">
        {meetingBriefTopGrowthCustomer?.name ?? "No growth customer"}
      </p>

      <p className="mt-1 text-sm font-semibold text-emerald-700">
        {meetingBriefTopGrowthCustomer
          ? `+${money(meetingBriefTopGrowthCustomer.movementValue)}`
          : "—"}
      </p>

      <p className="mt-2 text-sm text-slate-600">
        Top 5 growing members have added{" "}
        {money(meetingBriefGrowthValue)}.
      </p>
    </div>

    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
        Biggest Customer Risk
      </p>

      <p className="mt-2 text-lg font-bold text-slate-950">
        {meetingBriefTopDecliningCustomer?.name ?? "No declining customer"}
      </p>

      <p className="mt-1 text-sm font-semibold text-red-700">
        {meetingBriefTopDecliningCustomer
          ? money(meetingBriefTopDecliningCustomer.movementValue)
          : "—"}
      </p>

      <p className="mt-2 text-sm text-slate-600">
        Top 5 declining members are down{" "}
        {money(Math.abs(meetingBriefDeclineValue))}.
      </p>
    </div>

    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
        Stopped Buying
      </p>

      <p className="mt-2 text-lg font-bold text-slate-950">
        {meetingBriefStoppedCustomers.length} members
      </p>

      <p className="mt-1 text-sm font-semibold text-amber-700">
        {money(meetingBriefStoppedValue)} prior-year sales
      </p>

      <p className="mt-2 text-sm text-slate-600">
        Largest stopped account:{" "}
        <span className="font-semibold">
          {meetingBriefLargestStoppedCustomer?.name ?? "None"}
        </span>
      </p>
    </div>

    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
    Strongest Category
  </p>

  <p className="mt-2 text-lg font-bold text-slate-950">
    {meetingBriefStrongestCategory?.label ?? "—"}
  </p>

  <p className="mt-1 text-sm font-semibold text-emerald-700">
    {meetingBriefStrongestCategory
      ? `+${money(meetingBriefStrongestCategory.difference)} / +${meetingBriefStrongestCategory.percentage.toFixed(1)}%`
      : "—"}
  </p>

  <p className="mt-2 text-sm text-slate-600">
    {meetingBriefStrongestCategory?.group === "MLCP"
      ? `${mlcpCurrentBuyers.size} of ${rows.length} members buying MLCP, leaving ${mlcpOpportunityRows.length} opportunities.`
      : "Largest positive product-category movement year to date."}
  </p>
</div>

<div className="rounded-lg border border-red-200 bg-red-50 p-4">
  <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
    Biggest Category Risk
  </p>

  <p className="mt-2 text-lg font-bold text-slate-950">
    {meetingBriefWeakestCategory?.label ?? "—"}
  </p>

  <p className="mt-1 text-sm font-semibold text-red-700">
    {meetingBriefWeakestCategory
      ? `${money(meetingBriefWeakestCategory.difference)} / ${meetingBriefWeakestCategory.percentage.toFixed(1)}%`
      : "—"}
  </p>

  <p className="mt-2 text-sm text-slate-600">
    Largest negative product-category movement year to date.
  </p>
</div>
  </div>
  <div className="border-t border-slate-200 px-6 py-4">
  <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
      Odin Meeting Priority
    </p>

    <p className="mt-1 text-sm leading-6 text-slate-700">
      Protect the growth being driven by{" "}
      <span className="font-semibold text-slate-950">
        {meetingBriefTopGrowthCustomer?.name ?? "the leading growth accounts"}
      </span>
      , recover declining and stopped members, and use{" "}
      <span className="font-semibold text-slate-950">
        {meetingBriefStrongestCategory?.label ?? "the strongest product category"}
      </span>{" "}
      as the clearest cross-sell opportunity across{" "}
      <span className="font-semibold text-slate-950">
        {meetingBriefStrongestCategory?.group === "MLCP"
          ? mlcpOpportunityRows.length
          : rows.length -
            (meetingBriefStrongestCategory?.currentBuyerCount ?? 0)}
      </span>{" "}
      remaining {buyingGroupDisplayName} members.
    </p>
  </div>
</div>
</section>

<section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
  <div className="border-b border-slate-200 px-6 py-5">
    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
      Monthly Performance
    </p>

    <h2 className="mt-1 text-xl font-bold text-slate-950">
      {currentYear} vs {previousYear}
    </h2>

    <p className="mt-1 text-sm text-slate-500">
      Monthly net sales for {buyingGroupDisplayName}, comparing the same periods year on year.
    </p>
  </div>

  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-6 py-3">
            Month
          </th>

          <th className="px-6 py-3 text-right">
            {currentYear}
          </th>

          <th className="px-6 py-3 text-right">
            {previousYear}
          </th>

          <th className="px-6 py-3 text-right">
            £ Difference
          </th>

          <th className="px-6 py-3 text-right">
            Change
          </th>
        </tr>
      </thead>

      <tbody>
     
{monthlyPerformance.map((month, monthIndex) => {
  const isFutureMonth =
    monthIndex > now.getUTCMonth();

  return (
    <tr
      key={month.month}
      className="border-t border-slate-100"
    >
      <td className="px-6 py-4 font-semibold text-slate-950">
        {month.month}
      </td>

      <td className="px-6 py-4 text-right font-semibold">
        {money(month.current)}
      </td>

      <td className="px-6 py-4 text-right">
        {money(month.previous)}
      </td>

      <td
        className={`px-6 py-4 text-right font-semibold ${
          isFutureMonth
            ? "text-slate-400"
            : month.difference > 0
            ? "text-emerald-700"
            : month.difference < 0
            ? "text-red-700"
            : "text-slate-500"
        }`}
      >
        {isFutureMonth
          ? "—"
          : `${month.difference > 0 ? "+" : ""}${money(
              month.difference
            )}`}
      </td>

      <td
        className={`px-6 py-4 text-right font-semibold ${
          isFutureMonth
            ? "text-amber-600"
            : month.percentage > 0
            ? "text-emerald-700"
            : month.percentage < 0
            ? "text-red-700"
            : "text-slate-500"
        }`}
      >
        {isFutureMonth
          ? "UPCOMING"
          : `${month.percentage > 0 ? "+" : ""}${month.percentage.toFixed(
              1
            )}%`}
      </td>
    </tr>
  );
})}

      </tbody>
    </table>
  </div>
</section>

<section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
  <div className="border-b border-slate-200 px-5 py-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
      Product Analysis
    </p>

    <h2 className="mt-1 text-lg font-bold text-slate-950">
      What is {buyingGroupDisplayName} buying?
    </h2>

    <p className="mt-1 text-sm text-slate-600">
      Product sales by category, comparing {currentYear} year to date
      with the same period in {previousYear}.
    </p>
  </div>

  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-6 py-4 text-left">
            Category
          </th>
          <th className="px-6 py-4 text-right">
            {currentYear}
          </th>
          <th className="px-6 py-4 text-right">
            {previousYear}
          </th>
          <th className="px-6 py-4 text-right">
            £ Difference
          </th>
          <th className="px-6 py-4 text-right">
            Change
          </th>
<th className="px-6 py-4 text-right">
  Members {currentYear}
</th>
<th className="px-6 py-4 text-right">
  Members {previousYear}
</th>
          <th className="px-6 py-4 text-right">
            Products
          </th>
        </tr>
      </thead>

      <tbody>
        {nbgProductGroupPerformance.map(
          (group) => (
            <tr
              key={group.group}
              className="border-t border-slate-100"
            >
              <td className="px-6 py-4 font-semibold text-slate-950">
                {group.label}
              </td>

              <td className="px-6 py-4 text-right font-semibold">
                {money(group.currentSales)}
              </td>

              <td className="px-6 py-4 text-right">
                {money(group.previousSales)}
              </td>

              <td
                className={`px-6 py-4 text-right font-semibold ${
                  group.difference > 0
                    ? "text-emerald-700"
                    : group.difference < 0
                    ? "text-red-700"
                    : "text-slate-500"
                }`}
              >
                {group.difference > 0 ? "+" : ""}
                {money(group.difference)}
              </td>

              <td
                className={`px-6 py-4 text-right font-semibold ${
                  group.percentage > 0
                    ? "text-emerald-700"
                    : group.percentage < 0
                    ? "text-red-700"
                    : "text-slate-500"
                }`}
              >
                {group.percentage > 0 ? "+" : ""}
                {group.percentage.toFixed(1)}%
              </td>
<td className="px-6 py-4 text-right font-semibold">
  {group.currentBuyerCount}
</td>

<td className="px-6 py-4 text-right">
  {group.previousBuyerCount}
</td>
              <td className="px-6 py-4 text-right">
                {group.productCount}
                
              </td>
            </tr>
          )
        )}
      </tbody>
    </table>
  </div>
</section>
<section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
  <div className="border-b border-slate-200 px-5 py-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
      Odin MLCP Intelligence
    </p>

    <h2 className="mt-1 text-lg font-bold text-slate-950">
      MLCP Growth & Opportunity
    </h2>

    <p className="mt-1 text-sm text-slate-600">
      MLCP is growing strongly within {buyingGroupDisplayName}, but penetration across the membership remains low.
    </p>
  </div>
<div className="border-t border-slate-200 p-5">
  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
    MLCP Product Intelligence
  </p>

  <h3 className="mt-1 text-lg font-bold text-slate-950">
    What is driving MLCP growth?
  </h3>

  <div className="mt-4 grid gap-4 md:grid-cols-3">
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Total MLCP
      </p>

      <p className="mt-2 text-xl font-bold text-slate-950">
        {money(mlcpGroup?.currentSales ?? 0)}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {previousYear}: {money(mlcpGroup?.previousSales ?? 0)}
      </p>

      <p
        className={`mt-2 text-sm font-semibold ${
          (mlcpGroup?.difference ?? 0) >= 0
            ? "text-emerald-700"
            : "text-red-700"
        }`}
      >
        {(mlcpGroup?.difference ?? 0) >= 0 ? "+" : ""}
        {money(mlcpGroup?.difference ?? 0)} ·{" "}
        {(mlcpGroup?.percentage ?? 0) >= 0 ? "+" : ""}
        {(mlcpGroup?.percentage ?? 0).toFixed(1)}%
      </p>
    </div>

    <div className="rounded-lg bg-blue-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
        Pre-Insulated Pipe
      </p>

      <p className="mt-2 text-xl font-bold text-slate-950">
        {money(mlcpPreInsulatedCurrentSales)}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {previousYear}: {money(mlcpPreInsulatedPreviousSales)}
      </p>

      <p
        className={`mt-2 text-sm font-semibold ${
          mlcpPreInsulatedDifference >= 0
            ? "text-emerald-700"
            : "text-red-700"
        }`}
      >
        {mlcpPreInsulatedDifference >= 0 ? "+" : ""}
        {money(mlcpPreInsulatedDifference)} ·{" "}
        {mlcpPreInsulatedPercentage >= 0 ? "+" : ""}
        {mlcpPreInsulatedPercentage.toFixed(1)}%
      </p>
    </div>

    <div className="rounded-lg bg-amber-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
        MLCP Fittings
      </p>

      <p className="mt-2 text-xl font-bold text-slate-950">
        {money(mlcpFittingsCurrentSales)}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {previousYear}: {money(mlcpFittingsPreviousSales)}
      </p>

      <p
        className={`mt-2 text-sm font-semibold ${
          mlcpFittingsDifference >= 0
            ? "text-emerald-700"
            : "text-red-700"
        }`}
      >
        {mlcpFittingsDifference >= 0 ? "+" : ""}
        {money(mlcpFittingsDifference)} ·{" "}
        {mlcpFittingsPercentage >= 0 ? "+" : ""}
        {mlcpFittingsPercentage.toFixed(1)}%
      </p>
    </div>
  </div>
</div>
<div className="grid gap-4 px-5 pb-5 xl:grid-cols-3">
  <div className="rounded-lg border border-slate-200 p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      Top MLCP Products
    </p>
    <p className="mt-1 text-sm text-slate-600">
      Highest-selling MLCP products in {currentYear}.
    </p>

    <div className="mt-4 space-y-2">
      {topMlcpProducts.map((product, index) => (
        <div
          key={product.code}
          className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2"
        >
          <div className="min-w-0">
            <p className="text-xs text-slate-500">
              #{index + 1} · {product.code}
            </p>
            <p className="truncate text-sm font-semibold text-slate-900">
              {product.description}
            </p>
          </div>

          <span className="shrink-0 text-sm font-bold text-slate-900">
            {money(product.currentSales)}
          </span>
        </div>
      ))}
    </div>
  </div>
  <div className="rounded-lg border border-emerald-200 p-4">
  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
    MLCP Growth Drivers
  </p>
  <p className="mt-1 text-sm text-slate-600">
    Products contributing the most additional sales in {currentYear}.
  </p>

  <div className="mt-4 space-y-2">
    {growingMlcpProducts.map((product, index) => (
      <div
        key={product.code}
        className="flex items-center justify-between gap-4 rounded-lg bg-emerald-50 px-3 py-2"
      >
        <div className="min-w-0">
          <p className="text-xs text-slate-500">
            #{index + 1} · {product.code}
          </p>
          <p className="truncate text-sm font-semibold text-slate-900">
            {product.description}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-slate-900">
            {money(product.currentSales)}
          </p>
          <p className="text-xs font-semibold text-emerald-700">
            +{money(product.salesDifference)}
          </p>
        </div>
      </div>
    ))}
  </div>
</div>
<div className="rounded-lg border border-red-200 p-4">
  <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
    MLCP Declines
  </p>
  <p className="mt-1 text-sm text-slate-600">
    Products with the largest sales decline versus {previousYear}.
  </p>

  <div className="mt-4 space-y-2">
    {decliningMlcpProducts.map((product, index) => (
      <div
        key={product.code}
        className="flex items-center justify-between gap-4 rounded-lg bg-red-50 px-3 py-2"
      >
        <div className="min-w-0">
          <p className="text-xs text-slate-500">
            #{index + 1} · {product.code}
          </p>
          <p className="truncate text-sm font-semibold text-slate-900">
            {product.description}
          </p>
        </div>

        <div className="shrink-0 text-right">
  {product.currentSales === 0 ? (
    <>
      <span className="inline-block rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
        STOPPED SELLING
      </span>
      <p className="mt-1 text-xs font-semibold text-red-700">
        {money(product.salesDifference)}
      </p>
    </>
  ) : (
    <>
      <p className="text-sm font-bold text-slate-900">
        {money(product.currentSales)}
      </p>
      <p className="text-xs font-semibold text-red-700">
        {money(product.salesDifference)}
      </p>
    </>
  )}
</div>
      </div>
    ))}
  </div>
</div>
</div>
<div className="px-5 pb-5">
  <div className="rounded-lg border border-emerald-200 p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
      MLCP Customer Growth Drivers
    </p>

    <p className="mt-1 text-sm text-slate-600">
      {buyingGroupDisplayName} members contributing the most additional MLCP sales in {currentYear}.
    </p>

    <div className="mt-4 grid gap-2 md:grid-cols-5">
      {mlcpCustomerGrowthDrivers.map((row, index) => (
        <div
          key={row.id}
          className="rounded-lg bg-emerald-50 px-3 py-3"
        >
          <p className="text-xs text-slate-500">
            #{index + 1}
          </p>

          <p className="mt-1 truncate text-sm font-semibold text-slate-900">
            {row.name}
          </p>

          <p className="mt-2 text-sm font-bold text-slate-900">
            {money(row.currentMlcpSales)}
          </p>

          <p className="text-xs font-semibold text-emerald-700">
            +{money(row.mlcpGrowth)}
          </p>
        </div>
      ))}
    </div>
  </div>
</div>
  <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-5">
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Penetration
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-950">
        {mlcpPenetration.toFixed(1)}%
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {mlcpCurrentBuyers.size} of {customers.length} members
      </p>
    </div>

    <a
  href="#mlcp-current-buyers"
  className="block rounded-lg bg-slate-50 p-4 transition hover:bg-slate-100 hover:shadow-sm"
>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Current Buyers
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-950">
        {mlcpCurrentBuyers.size}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Buying MLCP in {currentYear}
      </p>
    </a>

   <a
  href="#mlcp-new-buyers"
  className="block rounded-lg bg-emerald-50 p-4 transition hover:bg-emerald-100 hover:shadow-sm"
>
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
        New Buyers
      </p>
      <p className="mt-2 text-2xl font-bold text-emerald-700">
        {mlcpNewBuyers.length}
      </p>
      <p className="mt-1 text-xs text-emerald-700">
        New versus {previousYear}
      </p>
    </a>

    <a
  href="#mlcp-lapsed-buyers"
  className="block rounded-lg bg-red-50 p-4 transition hover:bg-red-100 hover:shadow-sm"
>
      <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
        Lapsed Buyers
      </p>
      <p className="mt-2 text-2xl font-bold text-red-700">
        {mlcpLapsedBuyers.length}
      </p>
      <p className="mt-1 text-xs text-red-700">
        Bought last year, not this year
      </p>
    </a>

    <a
  href="#mlcp-opportunities"
  className="block rounded-lg bg-amber-50 p-4 transition hover:bg-amber-100 hover:shadow-sm"
>
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
        Opportunities
      </p>
      <p className="mt-2 text-2xl font-bold text-amber-700">
        {mlcpOpportunityCustomers.length}
      </p>
      <p className="mt-1 text-xs text-amber-700">
        {mlcpActiveOpportunityRows.length} active •{" "}
        {mlcpDormantOpportunityRows.length} dormant
      </p>
    </a>
    </div>
 
 <MlcpExpandableSection
  id="mlcp-lapsed-buyers"
  title="Lapsed MLCP Buyers"
  subtitle={`Bought MLCP in ${previousYear}, but not in ${currentYear}.`}
  count={mlcpLapsedBuyerRows.length}
>
  <div className="space-y-2">
    {mlcpLapsedBuyerRows.map((row) => (
      <div
        key={row.id}
        className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3"
      >
        <span className="font-semibold text-slate-900">
          {row.name}
        </span>

        <span className="font-bold text-red-700">
          {money(row.mlcpSales)}
        </span>
      </div>
    ))}
  </div>
</MlcpExpandableSection>
   <MlcpExpandableSection
  id="mlcp-new-buyers"
  title="New MLCP Buyers"
  subtitle={`New MLCP buyers in ${currentYear}.`}
  count={mlcpNewBuyerRows.length}
>
  <div className="space-y-2">
    {mlcpNewBuyerRows.map((row) => (
      <div
        key={row.id}
        className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3"
      >
        <span className="font-semibold text-slate-900">
          {row.name}
        </span>

        <span className="font-bold text-emerald-700">
          {money(row.mlcpSales)}
        </span>
      </div>
    ))}
  </div>
</MlcpExpandableSection>

 <MlcpExpandableSection
  id="mlcp-current-buyers"
  title="Current MLCP Buyers"
 subtitle={`All ${buyingGroupDisplayName} members buying MLCP in ${currentYear}.`}
  count={mlcpCurrentBuyerRows.length}
>
  <div className="space-y-2">
    {mlcpCurrentBuyerRows.map((row) => (
      <div
        key={row.id}
        className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3"
      >
       <Link
  href={`/commercial/customers/${row.id}`}
  className="font-semibold text-slate-900 hover:text-blue-700 hover:underline"
>
  {row.name}
</Link>

        <span className="font-bold text-slate-700">
          {money(row.mlcpSales)}
        </span>
      </div>
    ))}
  </div>
</MlcpExpandableSection>

  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
    Top MLCP Opportunities
  </p>

  <p className="mt-1 text-sm text-slate-600">
    Highest-spending {buyingGroupDisplayName} members not buying MLCP in {currentYear}.
  </p>

  <div className="mt-4 space-y-2">
    {mlcpActiveOpportunityRows.slice(0, 5).map((row) => (
      <div
        key={row.id}
        className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3"
      >
        <Link
  href={`/commercial/customers/${row.id}`}
  className="font-semibold text-slate-900 hover:text-blue-700 hover:underline"
>
  {row.name}
</Link>

        <span className="font-bold text-amber-700">
          {money(row.currentYearSales)}
        </span>
      </div>
    ))}
  </div>

<MlcpExpandableSection
  id="mlcp-opportunities"
  title="Active MLCP Opportunities"
  subtitle={`Members buying from Hetta in ${currentYear} but not currently buying MLCP, ranked by spend.`}
  count={mlcpActiveOpportunityRows.length}
>

  <div className="mt-4 overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-5 py-3">Rank</th>
          <th className="px-5 py-3">{buyingGroupDisplayName} Member</th>
          <th className="px-5 py-3">
  Opportunity Type
</th>
          <th className="px-5 py-3 text-right">
            {currentYear} Spend
          </th>
          <th className="px-5 py-3 text-right">
            {previousYear} Spend
          </th>
        </tr>
      </thead>

      <tbody>
        {mlcpActiveOpportunityRows.map((row, index) => (
          <tr
            key={row.id}
            className="border-t border-slate-100"
          >
            <td className="px-5 py-3 font-semibold text-slate-500">
              {index + 1}
            </td>

            <td className="px-5 py-3">
  <Link
    href={`/commercial/customers/${row.id}`}
    className="font-semibold text-slate-950 hover:text-blue-700 hover:underline"
  >
    {row.name}
  </Link>
</td>
<td className="px-5 py-3">
  {mlcpPreviousBuyers.has(String(row.id)) ? (
    <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
      Win Back
    </span>
  ) : (
    <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
      Cross-Sell
    </span>
  )}
</td>
            <td className="px-5 py-3 text-right font-semibold">
              {money(row.currentYearSales)}
            </td>

            <td className="px-5 py-3 text-right">
              {money(row.previousYearSales)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</MlcpExpandableSection>
<MlcpExpandableSection
  id="mlcp-dormant-opportunities"
  title={`Dormant ${buyingGroupDisplayName} Members`}
subtitle={`Active ${buyingGroupDisplayName} members with no Hetta spend in ${currentYear} and not currently buying MLCP.`}
  count={mlcpDormantOpportunityRows.length}
>
  <div className="mt-4 overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-5 py-3">Rank</th>
          <th className="px-5 py-3">{buyingGroupDisplayName} Member</th>
          <th className="px-5 py-3">Opportunity Type</th>
          <th className="px-5 py-3 text-right">
            {currentYear} Spend
          </th>
          <th className="px-5 py-3 text-right">
            {previousYear} Spend
          </th>
        </tr>
      </thead>

      <tbody>
        {mlcpDormantOpportunityRows.map((row, index) => (
          <tr
            key={row.id}
            className="border-t border-slate-100"
          >
            <td className="px-5 py-3 font-semibold text-slate-500">
              {index + 1}
            </td>

            <td className="px-5 py-3">
  <Link
    href={`/commercial/customers/${row.id}`}
    className="font-semibold text-slate-950 hover:text-blue-700 hover:underline"
  >
    {row.name}
  </Link>
</td>

            <td className="px-5 py-3">
              {mlcpPreviousBuyers.has(String(row.id)) ? (
                <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                  Win Back
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  Dormant
                </span>
              )}
            </td>

            <td className="px-5 py-3 text-right font-semibold">
              {money(row.currentYearSales)}
            </td>

            <td className="px-5 py-3 text-right">
              {money(row.previousYearSales)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</MlcpExpandableSection>
</section>
<section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
  <div className="border-b border-slate-200 px-5 py-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
      Floor Systems Intelligence
    </p>

    <h2 className="mt-1 text-lg font-bold text-slate-950">
      What is driving the Floor Systems decline?
    </h2>

    <p className="mt-1 text-sm text-slate-500">
      {buyingGroupDisplayName} Floor Systems sales are down {money(Math.abs(floorSystemsGroup?.difference ?? 0))} versus the same period last year.
    </p>
  </div>

  <div className="grid gap-4 border-b border-slate-200 p-5 md:grid-cols-3">
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {currentYear} Sales
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-950">
        {money(floorSystemsGroup?.currentSales ?? 0)}
      </p>
    </div>

    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {previousYear} Sales
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-950">
        {money(floorSystemsGroup?.previousSales ?? 0)}
      </p>
    </div>

    <div className="rounded-lg bg-red-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
        Movement
      </p>
      <p className="mt-2 text-2xl font-bold text-red-700">
        -{money(Math.abs(floorSystemsGroup?.difference ?? 0))}
      </p>
      <p className="mt-1 text-xs text-red-700">
       {(floorSystemsGroup?.percentage ?? 0).toFixed(1)}%
      </p>
    </div>
  </div>

  <div className="p-5">
    <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
      Biggest Customer Declines
    </p>

    <p className="mt-1 text-sm text-slate-500">
  {buyingGroupDisplayName} members contributing most to the Floor Systems sales decline.
</p>

    <div className="mt-4 space-y-2">
      {floorSystemDecliningCustomers.slice(0, 5).map((row, index) => (
        <div
          key={row.id}
          className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3"
        >
          <div>
            <span className="mr-3 text-sm text-slate-500">
              #{index + 1}
            </span>

            <Link
              href={`/commercial/customers/${row.id}`}
              className="font-semibold text-slate-950 hover:text-blue-700 hover:underline"
            >
              {row.name}
            </Link>
          </div>

          <div className="text-right">
            <p className="font-bold text-red-700">
              {money(row.floorSystemMovement)}
            </p>
            <p className="text-xs text-slate-500">
              {money(row.previousFloorSystemSales)} →{" "}
              {money(row.currentFloorSystemSales)}
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
  <div className="border-t border-slate-200 p-5">
  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
    Growth Offsets
  </p>

  <p className="mt-1 text-sm text-slate-500">
    {buyingGroupDisplayName} members helping offset the Floor Systems decline.
  </p>

  <div className="mt-4 space-y-2">
    {floorSystemGrowingCustomers.slice(0, 5).map((row, index) => (
      <div
        key={row.id}
        className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3"
      >
        <div>
          <span className="mr-3 text-sm text-slate-500">
            #{index + 1}
          </span>

          <Link
            href={`/commercial/customers/${row.id}`}
            className="font-semibold text-slate-950 hover:text-blue-700 hover:underline"
          >
            {row.name}
          </Link>
        </div>

        <div className="text-right">
          <p className="font-bold text-emerald-700">
            +{money(row.floorSystemMovement)}
          </p>

          <p className="text-xs text-slate-500">
            {money(row.previousFloorSystemSales)} →{" "}
            {money(row.currentFloorSystemSales)}
          </p>
        </div>
      </div>
    ))}
  </div>
</div>
<div className="border-t border-slate-200 p-5">
  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
    Stopped Buying Floor Systems
  </p>

  <p className="mt-1 text-sm text-slate-500">
    {buyingGroupDisplayName} members that bought Floor Systems in {previousYear} but have bought none in {currentYear}.
  </p>

  <div className="mt-4 grid gap-3 md:grid-cols-2">
    {floorSystemStoppedCustomers.map((row) => (
      <div
        key={row.id}
        className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3"
      >
        <Link
          href={`/commercial/customers/${row.id}`}
          className="font-semibold text-slate-950 hover:text-blue-700 hover:underline"
        >
          {row.name}
        </Link>

        <div className="text-right">
          <p className="font-bold text-amber-700">
            {money(row.previousFloorSystemSales)}
          </p>
          <p className="text-xs text-slate-500">
            {previousYear} spend
          </p>
        </div>
      </div>
    ))}
  </div>
</div>
</section>
{/* Electric UFH Intelligence */}
<section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
  <div className="mb-6">
    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
      Electric UFH Intelligence
    </div>

    <h2 className="mt-1 text-xl font-semibold text-slate-900">
      What is driving Electric UFH growth?
    </h2>

    <p className="mt-2 text-sm text-slate-600">
      Electric UFH sales are{" "}
      <span
        className={
          (electricUfhGroup?.difference ?? 0) >= 0
            ? "font-semibold text-emerald-600"
            : "font-semibold text-red-600"
        }
      >
        {(electricUfhGroup?.difference ?? 0) >= 0 ? "up " : "down "}
        {money(Math.abs(electricUfhGroup?.difference ?? 0))}
      </span>{" "}
      against the same period last year.
    </p>
  </div>

  <div className="grid gap-4 md:grid-cols-4">
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {currentYear} YTD
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">
        {money(electricUfhGroup?.currentSales ?? 0)}
      </div>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {previousYear} YTD
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">
        {money(electricUfhGroup?.previousSales ?? 0)}
      </div>
    </div>

    <div
      className={`rounded-2xl border p-4 ${
        (electricUfhGroup?.difference ?? 0) >= 0
          ? "border-emerald-200 bg-emerald-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      <div
        className={`text-xs font-medium uppercase tracking-wide ${
          (electricUfhGroup?.difference ?? 0) >= 0
            ? "text-emerald-600"
            : "text-red-600"
        }`}
      >
        Movement
      </div>
      <div
        className={`mt-2 text-2xl font-semibold ${
          (electricUfhGroup?.difference ?? 0) >= 0
            ? "text-emerald-700"
            : "text-red-700"
        }`}
      >
        {(electricUfhGroup?.difference ?? 0) >= 0 ? "+" : ""}
        {money(electricUfhGroup?.difference ?? 0)}
      </div>
    </div>

    <div
      className={`rounded-2xl border p-4 ${
        (electricUfhGroup?.percentage ?? 0) >= 0
          ? "border-emerald-200 bg-emerald-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      <div
        className={`text-xs font-medium uppercase tracking-wide ${
          (electricUfhGroup?.percentage ?? 0) >= 0
            ? "text-emerald-600"
            : "text-red-600"
        }`}
      >
        Percentage
      </div>
      <div
        className={`mt-2 text-2xl font-semibold ${
          (electricUfhGroup?.percentage ?? 0) >= 0
            ? "text-emerald-700"
            : "text-red-700"
        }`}
      >
        {(electricUfhGroup?.percentage ?? 0) >= 0 ? "+" : ""}
        {(electricUfhGroup?.percentage ?? 0).toFixed(1)}%
      </div>
    </div>
  </div>

  <div className="mt-6 grid gap-6 lg:grid-cols-2">
    <div>
      <div className="mb-3">
        <h3 className="font-semibold text-slate-900">
          Biggest Growth Contributors
        </h3>
        <p className="text-sm text-slate-500">
          Customers contributing most to Electric UFH growth.
        </p>
      </div>

      <div className="space-y-2">
        {electricUfhGrowingCustomers.slice(0, 5).map((row) => (
          <Link
            key={row.id}
            href={`/commercial/customers/${row.id}?products=top#product-performance`}
            className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 transition hover:border-emerald-200 hover:bg-emerald-50"
          >
            <div className="min-w-0 pr-4">
              <div className="truncate font-medium text-slate-900">
                {row.name}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {money(row.previousElectricUfhSales)} →{" "}
                {money(row.currentElectricUfhSales)}
              </div>
            </div>

            <div className="shrink-0 font-semibold text-emerald-600">
              +{money(row.electricUfhMovement)}
            </div>
          </Link>
        ))}
      </div>
    </div>

    <div>
      <div className="mb-3">
        <h3 className="font-semibold text-slate-900">
          Biggest Customer Declines
        </h3>
        <p className="text-sm text-slate-500">
          Customers offsetting some of the Electric UFH growth.
        </p>
      </div>

      <div className="space-y-2">
        {electricUfhDecliningCustomers.slice(0, 5).map((row) => (
          <Link
            key={row.id}
            href={`/commercial/customers/${row.id}?products=decline#product-performance`}
            className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/60 px-4 py-3 transition hover:border-red-200 hover:bg-red-50"
          >
            <div className="min-w-0 pr-4">
              <div className="truncate font-medium text-slate-900">
                {row.name}
              </div>
              <div className="mt-1 text-xs text-slate-500">
  {money(row.previousElectricUfhSales)} →{" "}
  {row.currentElectricUfhSales < 0
    ? `NET CREDIT ${money(Math.abs(row.currentElectricUfhSales))}`
    : money(row.currentElectricUfhSales)}
</div>
            </div>

            <div className="shrink-0 font-semibold text-red-600">
              {money(row.electricUfhMovement)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  </div>

  {electricUfhStoppedCustomers.length > 0 && (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="mb-3">
        <h3 className="font-semibold text-slate-900">
          Stopped Buying Electric UFH
        </h3>
        <p className="text-sm text-slate-600">
          Customers who bought Electric UFH in {previousYear} but have recorded
          no Electric UFH sales in {currentYear}.
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {electricUfhStoppedCustomers.map((row) => (
          <Link
            key={row.id}
            href={`/commercial/customers/${row.id}?products=none#product-performance`}
            className="flex items-center justify-between rounded-xl border border-amber-200 bg-white px-4 py-3 transition hover:bg-amber-50"
          >
            <span className="min-w-0 truncate font-medium text-slate-900">
              {row.name}
            </span>

            <span className="ml-4 shrink-0 text-sm font-semibold text-amber-700">
              {money(row.previousElectricUfhSales)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )}
</section>
{/* Accessories Intelligence */}
<section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
  <div className="mb-6">
    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
      Accessories Intelligence
    </div>

    <h2 className="mt-1 text-xl font-semibold text-slate-900">
      What is driving the Accessories decline?
    </h2>

    <p className="mt-2 text-sm text-slate-600">
      Accessories sales are down{" "}
      <span className="font-semibold text-red-600">
        {money(Math.abs(accessoriesGroup?.difference ?? 0))}
      </span>{" "}
      against the same period last year.
    </p>
  </div>

  <div className="grid gap-4 md:grid-cols-4">
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {currentYear} YTD
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">
        {money(accessoriesGroup?.currentSales ?? 0)}
      </div>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {previousYear} YTD
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">
        {money(accessoriesGroup?.previousSales ?? 0)}
      </div>
    </div>

    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-red-600">
        Movement
      </div>
      <div className="mt-2 text-2xl font-semibold text-red-700">
        {money(accessoriesGroup?.difference ?? 0)}
      </div>
    </div>

    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-red-600">
        Percentage
      </div>
      <div className="mt-2 text-2xl font-semibold text-red-700">
        {(accessoriesGroup?.percentage ?? 0).toFixed(1)}%
      </div>
    </div>
  </div>

  <div className="mt-6 grid gap-6 lg:grid-cols-2">
    <div>
      <div className="mb-3">
        <h3 className="font-semibold text-slate-900">
          Biggest Customer Declines
        </h3>
        <p className="text-sm text-slate-500">
          Customers contributing most to the Accessories decline.
        </p>
      </div>

      <div className="space-y-2">
        {accessoryDecliningCustomers.slice(0, 5).map((row) => (
          <Link
            key={row.id}
            href={`/commercial/customers/${row.id}?products=decline#product-performance`}
            className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/60 px-4 py-3 transition hover:border-red-200 hover:bg-red-50"
          >
            <div className="min-w-0 pr-4">
              <div className="truncate font-medium text-slate-900">
                {row.name}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {money(row.previousAccessorySales)} →{" "}
                {money(row.currentAccessorySales)}
              </div>
            </div>

            <div className="shrink-0 font-semibold text-red-600">
              {money(row.accessoryMovement)}
            </div>
          </Link>
        ))}
      </div>
    </div>

    <div>
      <div className="mb-3">
        <h3 className="font-semibold text-slate-900">
          Growth Offsets
        </h3>
        <p className="text-sm text-slate-500">
          Customers helping offset the Accessories decline.
        </p>
      </div>

      <div className="space-y-2">
        {accessoryGrowingCustomers.slice(0, 5).map((row) => (
          <Link
            key={row.id}
            href={`/commercial/customers/${row.id}?products=top#product-performance`}
            className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 transition hover:border-emerald-200 hover:bg-emerald-50"
          >
            <div className="min-w-0 pr-4">
              <div className="truncate font-medium text-slate-900">
                {row.name}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {money(row.previousAccessorySales)} →{" "}
                {money(row.currentAccessorySales)}
              </div>
            </div>

            <div className="shrink-0 font-semibold text-emerald-600">
              +{money(row.accessoryMovement)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  </div>

  {accessoryStoppedCustomers.length > 0 && (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="mb-3">
        <h3 className="font-semibold text-slate-900">
          Stopped Buying Accessories
        </h3>
        <p className="text-sm text-slate-600">
          Customers who bought Accessories in {previousYear} but have recorded
          no Accessories sales in {currentYear}.
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {accessoryStoppedCustomers.map((row) => (
          <Link
            key={row.id}
            href={`/commercial/customers/${row.id}?products=none#product-performance`}
            className="flex items-center justify-between rounded-xl border border-amber-200 bg-white px-4 py-3 transition hover:bg-amber-50"
          >
            <span className="min-w-0 truncate font-medium text-slate-900">
              {row.name}
            </span>

            <span className="ml-4 shrink-0 text-sm font-semibold text-amber-700">
              {money(row.previousAccessorySales)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )}
</section>
{/* Pipe Intelligence */}
<section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
  <div className="mb-6">
    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
      Pipe Intelligence
    </div>

    <h2 className="mt-1 text-xl font-semibold text-slate-900">
      What is driving Pipe growth?
    </h2>

    <p className="mt-2 text-sm text-slate-600">
      Pipe sales are{" "}
      <span
        className={
          (pipeGroup?.difference ?? 0) >= 0
            ? "font-semibold text-emerald-600"
            : "font-semibold text-red-600"
        }
      >
        {(pipeGroup?.difference ?? 0) >= 0 ? "up " : "down "}
        {money(Math.abs(pipeGroup?.difference ?? 0))}
      </span>{" "}
      against the same period last year.
    </p>
  </div>

  <div className="grid gap-4 md:grid-cols-4">
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {currentYear} YTD
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">
        {money(pipeGroup?.currentSales ?? 0)}
      </div>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {previousYear} YTD
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">
        {money(pipeGroup?.previousSales ?? 0)}
      </div>
    </div>

    <div
      className={`rounded-2xl border p-4 ${
        (pipeGroup?.difference ?? 0) >= 0
          ? "border-emerald-200 bg-emerald-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      <div
        className={`text-xs font-medium uppercase tracking-wide ${
          (pipeGroup?.difference ?? 0) >= 0
            ? "text-emerald-600"
            : "text-red-600"
        }`}
      >
        Movement
      </div>

      <div
        className={`mt-2 text-2xl font-semibold ${
          (pipeGroup?.difference ?? 0) >= 0
            ? "text-emerald-700"
            : "text-red-700"
        }`}
      >
        {(pipeGroup?.difference ?? 0) >= 0 ? "+" : ""}
        {money(pipeGroup?.difference ?? 0)}
      </div>
    </div>

    <div
      className={`rounded-2xl border p-4 ${
        (pipeGroup?.percentage ?? 0) >= 0
          ? "border-emerald-200 bg-emerald-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      <div
        className={`text-xs font-medium uppercase tracking-wide ${
          (pipeGroup?.percentage ?? 0) >= 0
            ? "text-emerald-600"
            : "text-red-600"
        }`}
      >
        Percentage
      </div>

      <div
        className={`mt-2 text-2xl font-semibold ${
          (pipeGroup?.percentage ?? 0) >= 0
            ? "text-emerald-700"
            : "text-red-700"
        }`}
      >
        {(pipeGroup?.percentage ?? 0) >= 0 ? "+" : ""}
        {(pipeGroup?.percentage ?? 0).toFixed(1)}%
      </div>
    </div>
  </div>

  <div className="mt-6 grid gap-6 lg:grid-cols-2">
    <div>
      <div className="mb-3">
        <h3 className="font-semibold text-slate-900">
          Biggest Growth Contributors
        </h3>
        <p className="text-sm text-slate-500">
          Customers contributing most to Pipe growth.
        </p>
      </div>

      <div className="space-y-2">
        {pipeGrowingCustomers.slice(0, 5).map((row) => (
          <Link
            key={row.id}
            href={`/commercial/customers/${row.id}?products=top#product-performance`}
            className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 transition hover:border-emerald-200 hover:bg-emerald-50"
          >
            <div className="min-w-0 pr-4">
              <div className="truncate font-medium text-slate-900">
                {row.name}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {money(row.previousPipeSales)} →{" "}
                {money(row.currentPipeSales)}
              </div>
            </div>

            <div className="shrink-0 font-semibold text-emerald-600">
              +{money(row.pipeMovement)}
            </div>
          </Link>
        ))}
      </div>
    </div>

    <div>
      <div className="mb-3">
        <h3 className="font-semibold text-slate-900">
          Biggest Customer Declines
        </h3>
        <p className="text-sm text-slate-500">
          Customers offsetting some of the Pipe growth.
        </p>
      </div>

      <div className="space-y-2">
        {pipeDecliningCustomers.slice(0, 5).map((row) => (
          <Link
            key={row.id}
            href={`/commercial/customers/${row.id}?products=decline#product-performance`}
            className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/60 px-4 py-3 transition hover:border-red-200 hover:bg-red-50"
          >
            <div className="min-w-0 pr-4">
              <div className="truncate font-medium text-slate-900">
                {row.name}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {money(row.previousPipeSales)} →{" "}
                {money(row.currentPipeSales)}
              </div>
            </div>

            <div className="shrink-0 font-semibold text-red-600">
              {money(row.pipeMovement)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  </div>

  {pipeStoppedCustomers.length > 0 && (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="mb-3">
        <h3 className="font-semibold text-slate-900">
          Stopped Buying Pipe
        </h3>

        <p className="text-sm text-slate-600">
          Customers who bought Pipe in {previousYear} but have recorded no Pipe
          sales in {currentYear}.
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {pipeStoppedCustomers.map((row) => (
          <Link
            key={row.id}
            href={`/commercial/customers/${row.id}?products=none#product-performance`}
            className="flex items-center justify-between rounded-xl border border-amber-200 bg-white px-4 py-3 transition hover:bg-amber-50"
          >
            <span className="min-w-0 truncate font-medium text-slate-900">
              {row.name}
            </span>

            <span className="ml-4 shrink-0 text-sm font-semibold text-amber-700">
              {money(row.previousPipeSales)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )}
</section>
{/* Manifolds Intelligence */}
<section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
  <div className="mb-6">
    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
      Manifolds Intelligence
    </div>

    <h2 className="mt-1 text-xl font-semibold text-slate-900">
      What is happening with Manifold sales?
    </h2>

    <p className="mt-2 text-sm text-slate-600">
      Manifold sales are{" "}
      <span
        className={
          (manifoldsGroup?.difference ?? 0) >= 0
            ? "font-semibold text-emerald-600"
            : "font-semibold text-red-600"
        }
      >
        {(manifoldsGroup?.difference ?? 0) >= 0 ? "up " : "down "}
        {money(Math.abs(manifoldsGroup?.difference ?? 0))}
      </span>{" "}
      against the same period last year.
    </p>
  </div>

  <div className="grid gap-4 md:grid-cols-4">
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {currentYear} YTD
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">
        {money(manifoldsGroup?.currentSales ?? 0)}
      </div>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {previousYear} YTD
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">
        {money(manifoldsGroup?.previousSales ?? 0)}
      </div>
    </div>

    <div
      className={`rounded-2xl border p-4 ${
        (manifoldsGroup?.difference ?? 0) >= 0
          ? "border-emerald-200 bg-emerald-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      <div
        className={`text-xs font-medium uppercase tracking-wide ${
          (manifoldsGroup?.difference ?? 0) >= 0
            ? "text-emerald-600"
            : "text-red-600"
        }`}
      >
        Movement
      </div>

      <div
        className={`mt-2 text-2xl font-semibold ${
          (manifoldsGroup?.difference ?? 0) >= 0
            ? "text-emerald-700"
            : "text-red-700"
        }`}
      >
        {(manifoldsGroup?.difference ?? 0) >= 0 ? "+" : ""}
        {money(manifoldsGroup?.difference ?? 0)}
      </div>
    </div>

    <div
      className={`rounded-2xl border p-4 ${
        (manifoldsGroup?.percentage ?? 0) >= 0
          ? "border-emerald-200 bg-emerald-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      <div
        className={`text-xs font-medium uppercase tracking-wide ${
          (manifoldsGroup?.percentage ?? 0) >= 0
            ? "text-emerald-600"
            : "text-red-600"
        }`}
      >
        Percentage
      </div>

      <div
        className={`mt-2 text-2xl font-semibold ${
          (manifoldsGroup?.percentage ?? 0) >= 0
            ? "text-emerald-700"
            : "text-red-700"
        }`}
      >
        {(manifoldsGroup?.percentage ?? 0) >= 0 ? "+" : ""}
        {(manifoldsGroup?.percentage ?? 0).toFixed(1)}%
      </div>
    </div>
  </div>

  <div className="mt-6 grid gap-6 lg:grid-cols-2">
    <div>
      <div className="mb-3">
        <h3 className="font-semibold text-slate-900">
          Biggest Customer Declines
        </h3>
        <p className="text-sm text-slate-500">
          Customers contributing most to lost Manifold sales.
        </p>
      </div>

      <div className="space-y-2">
        {manifoldDecliningCustomers.slice(0, 5).map((row) => (
          <Link
            key={row.id}
            href={`/commercial/customers/${row.id}?products=decline#product-performance`}
            className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/60 px-4 py-3 transition hover:border-red-200 hover:bg-red-50"
          >
            <div className="min-w-0 pr-4">
              <div className="truncate font-medium text-slate-900">
                {row.name}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {money(row.previousManifoldSales)} →{" "}
                {money(row.currentManifoldSales)}
              </div>
            </div>

            <div className="shrink-0 font-semibold text-red-600">
              {money(row.manifoldMovement)}
            </div>
          </Link>
        ))}
      </div>
    </div>

    <div>
      <div className="mb-3">
        <h3 className="font-semibold text-slate-900">
          Growth Offsets
        </h3>
        <p className="text-sm text-slate-500">
          Customers generating additional Manifold sales.
        </p>
      </div>

      <div className="space-y-2">
        {manifoldGrowingCustomers.slice(0, 5).map((row) => (
          <Link
            key={row.id}
            href={`/commercial/customers/${row.id}?products=top#product-performance`}
            className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 transition hover:border-emerald-200 hover:bg-emerald-50"
          >
            <div className="min-w-0 pr-4">
              <div className="truncate font-medium text-slate-900">
                {row.name}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {money(row.previousManifoldSales)} →{" "}
                {money(row.currentManifoldSales)}
              </div>
            </div>

            <div className="shrink-0 font-semibold text-emerald-600">
              +{money(row.manifoldMovement)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  </div>

  {manifoldStoppedCustomers.length > 0 && (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="mb-3">
        <h3 className="font-semibold text-slate-900">
          Stopped Buying Manifolds
        </h3>

        <p className="text-sm text-slate-600">
          Customers who bought Manifolds in {previousYear} but have recorded no
          Manifold sales in {currentYear}.
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {manifoldStoppedCustomers.map((row) => (
          <Link
            key={row.id}
            href={`/commercial/customers/${row.id}?products=none#product-performance`}
            className="flex items-center justify-between rounded-xl border border-amber-200 bg-white px-4 py-3 transition hover:bg-amber-50"
          >
            <span className="min-w-0 truncate font-medium text-slate-900">
              {row.name}
            </span>

            <span className="ml-4 shrink-0 text-sm font-semibold text-amber-700">
              {money(row.previousManifoldSales)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )}
</section>
{/* Controls Intelligence */}
<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
  <div className="mb-6">
    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
      Controls Intelligence
    </div>

    <h2 className="mt-1 text-xl font-semibold text-slate-900">
      What is driving the Controls decline?
    </h2>

    <p className="mt-2 text-sm text-slate-600">
      Controls sales are down{" "}
      <span className="font-semibold text-red-600">
        {money(Math.abs(controlsGroup?.difference ?? 0))}
      </span>{" "}
      against the same period last year.
    </p>
  </div>

  <div className="grid gap-4 md:grid-cols-4">
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {currentYear} YTD
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">
        {money(controlsGroup?.currentSales ?? 0)}
      </div>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {previousYear} YTD
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">
        {money(controlsGroup?.previousSales ?? 0)}
      </div>
    </div>

    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-red-600">
        Movement
      </div>
      <div className="mt-2 text-2xl font-semibold text-red-700">
        {money(controlsGroup?.difference ?? 0)}
      </div>
    </div>

    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-red-600">
        Percentage
      </div>
      <div className="mt-2 text-2xl font-semibold text-red-700">
        {(controlsGroup?.percentage ?? 0).toFixed(1)}%
      </div>
    </div>
  </div>

  <div className="mt-6 grid gap-6 lg:grid-cols-2">
    <div>
      <div className="mb-3">
        <h3 className="font-semibold text-slate-900">
          Biggest Customer Declines
        </h3>
        <p className="text-sm text-slate-500">
          Customers contributing most to the Controls decline.
        </p>
      </div>

      <div className="space-y-2">
        {controlDecliningCustomers.slice(0, 5).map((row) => (
          <Link
            key={row.id}
            href={`/commercial/customers/${row.id}?products=decline#product-performance`}
            className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/60 px-4 py-3 transition hover:border-red-200 hover:bg-red-50"
          >
            <div className="min-w-0 pr-4">
              <div className="truncate font-medium text-slate-900">
                {row.name}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {money(row.previousControlSales)} →{" "}
                {money(row.currentControlSales)}
              </div>
            </div>

            <div className="shrink-0 font-semibold text-red-600">
              {money(row.controlMovement)}
            </div>
          </Link>
        ))}
      </div>
    </div>

    <div>
      <div className="mb-3">
        <h3 className="font-semibold text-slate-900">
          Growth Offsets
        </h3>
        <p className="text-sm text-slate-500">
          Customers helping offset the Controls decline.
        </p>
      </div>

      <div className="space-y-2">
        {controlGrowingCustomers.slice(0, 5).map((row) => (
          <Link
            key={row.id}
            href={`/commercial/customers/${row.id}?products=top#product-performance`}
            className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 transition hover:border-emerald-200 hover:bg-emerald-50"
          >
            <div className="min-w-0 pr-4">
              <div className="truncate font-medium text-slate-900">
                {row.name}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {money(row.previousControlSales)} →{" "}
                {money(row.currentControlSales)}
              </div>
            </div>

            <div className="shrink-0 font-semibold text-emerald-600">
              +{money(row.controlMovement)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  </div>

  {controlStoppedCustomers.length > 0 && (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="mb-3">
        <h3 className="font-semibold text-slate-900">
          Stopped Buying Controls
        </h3>

        <p className="text-sm text-slate-600">
          Customers who bought Controls in {previousYear} but have recorded no
          Controls sales in {currentYear}.
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {controlStoppedCustomers.map((row) => (
          <Link
            key={row.id}
            href={`/commercial/customers/${row.id}?products=none#product-performance`}
            className="flex items-center justify-between rounded-xl border border-amber-200 bg-white px-4 py-3 transition hover:bg-amber-50"
          >
            <span className="min-w-0 truncate font-medium text-slate-900">
              {row.name}
            </span>

            <span className="ml-4 shrink-0 text-sm font-semibold text-amber-700">
              {money(row.previousControlSales)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )}
</section>

<section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
  <div className="border-b border-slate-200 px-5 py-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
      Odin Sales Intelligence
    </p>

    <h2 className="mt-1 text-lg font-bold text-slate-950">
      Customers Requiring Attention
    </h2>

    <p className="mt-1 text-sm text-slate-500">
      Customers currently down at least 10% against the same period last year,
      ranked by the largest sales shortfall.
    </p>
  </div>

  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-5 py-3">Customer</th>
          <th className="px-5 py-3">This Year YTD</th>
          <th className="px-5 py-3">Last Year YTD</th>
          <th className="px-5 py-3">Change</th>
          <th className="px-5 py-3">Sales Gap</th>
          <th className="px-5 py-3">Last Invoice</th>
          <th className="px-5 py-3">Status</th>
        </tr>
      </thead>

      <tbody>
        {customersRequiringAttention.map((customer) => {
          const salesGap =
            customer.currentYearSales -
            customer.previousYearSales;

          return (
            <tr
              key={customer.id}
              className="border-t border-slate-100"
            >
              <td className="px-5 py-4 font-semibold text-slate-950">
                <Link
                  href={`/commercial/customers/${customer.id}?products=decline#product-performance`}
                  className="hover:text-amber-600 hover:underline"
                >
                  {customer.name}
                </Link>
              </td>

              <td className="px-5 py-4">
                {money(customer.currentYearSales)}
              </td>

              <td className="px-5 py-4">
                {money(customer.previousYearSales)}
              </td>

              <td className="px-5 py-4 font-semibold text-red-700">
                {customer.movementPercent.toFixed(1)}%
              </td>

              <td className="px-5 py-4 font-semibold text-red-700">
                {money(salesGap)}
              </td>
              <td className="px-5 py-4">
  {customer.lastInvoiceDate
    ? customer.lastInvoiceDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "No invoices"}
</td>

<td className="px-5 py-4">
  {customer.currentYearSales === 0 &&
  customer.previousYearSales > 0 ? (
    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      STOPPED BUYING
    </span>
  ) : (
    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
      DECLINING
    </span>
  )}
</td>

            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
</section>
<section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
  <div className="border-b border-slate-200 px-6 py-5">
    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
      Odin Commercial Actions
    </p>

    <h2 className="mt-1 text-xl font-bold text-slate-950">
      Meeting Actions
    </h2>

    <p className="mt-1 text-sm text-slate-500">
      Priority {buyingGroupDisplayName} accounts to discuss and the commercial action to take.
    </p>
  </div>

  <div className="grid gap-4 p-6 md:grid-cols-2">
    {meetingActionGrowthCustomer && (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Protect &amp; Develop
        </p>

        <p className="mt-2 text-lg font-bold text-slate-950">
  <Link
    href={`/commercial/customers/${meetingActionGrowthCustomer.id}?products=top#product-performance`}
    className="hover:text-amber-600 hover:underline"
  >
    {meetingActionGrowthCustomer.name}
  </Link>
</p>

        <p className="mt-1 text-sm font-semibold text-emerald-700">
          +{money(meetingActionGrowthCustomer.movementValue)} YTD growth
        </p>

        <p className="mt-2 text-sm text-slate-600">
          Protect the momentum and identify additional product categories
          that can increase share of wallet.
        </p>
      </div>
    )}

    {meetingActionRecoveryCustomer && (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
          Recovery Priority
        </p>

        <p className="mt-2 text-lg font-bold text-slate-950">
  <Link
    href={`/commercial/customers/${meetingActionRecoveryCustomer.id}?products=risk#product-performance`}
    className="hover:text-amber-600 hover:underline"
  >
    {meetingActionRecoveryCustomer.name}
  </Link>
</p>

        <p className="mt-1 text-sm font-semibold text-red-700">
          {money(meetingActionRecoveryCustomer.movementValue)} YTD
        </p>

        <p className="mt-2 text-sm text-slate-600">
          Understand what has driven the decline and agree a plan to recover
          lost spend.
        </p>
      </div>
    )}

    {meetingActionWinBackCustomer && (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
          Win Back
        </p>

        <p className="mt-2 text-lg font-bold text-slate-950">
  <Link
    href={`/commercial/customers/${meetingActionWinBackCustomer.id}?products=risk#product-performance`}
    className="hover:text-amber-600 hover:underline"
  >
    {meetingActionWinBackCustomer.name}
  </Link>
</p>

        <p className="mt-1 text-sm font-semibold text-amber-700">
          {money(meetingActionWinBackCustomer.previousYearSales)} prior-year sales
        </p>

        <p className="mt-2 text-sm text-slate-600">
          No sales this year. Establish why purchasing stopped and whether the
          business can be recovered.
        </p>
      </div>
    )}

    {meetingActionMlcpOpportunity && (
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
          MLCP Cross-Sell
        </p>

        <p className="mt-2 text-lg font-bold text-slate-950">
  <Link
    href={`/commercial/customers/${meetingActionMlcpOpportunity.id}?products=none#product-performance`}
    className="hover:text-amber-600 hover:underline"
  >
    {meetingActionMlcpOpportunity.name}
  </Link>
</p>

        <p className="mt-1 text-sm font-semibold text-indigo-700">
          {money(meetingActionMlcpOpportunity.currentYearSales)} current Hetta spend
        </p>

        <p className="mt-2 text-sm text-slate-600">
          Active {buyingGroupDisplayName} customer not currently buying MLCP. Prioritise for
range introduction and cross-sell.
        </p>
      </div>
    )}
  </div>
</section>
      <BuyingGroupMemberTable
  rows={memberTableRows}
  currentYear={currentYear}
  previousYear={previousYear}
/>
    </main>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function TrendBadge({
  trend,
}: {
  trend: "GROWING" | "DECLINING" | "FLAT" | "NO SALES";
}) {
  const className =
    trend === "GROWING"
      ? "bg-emerald-50 text-emerald-700"
      : trend === "DECLINING"
      ? "bg-red-50 text-red-700"
      : trend === "NO SALES"
      ? "bg-amber-50 text-amber-700"
      : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {trend}
    </span>
  );
}


