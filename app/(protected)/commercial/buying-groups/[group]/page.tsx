import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";
import BuyingGroupMemberTable from "./BuyingGroupMemberTable";


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

  const {
    companyId,
  } = await requireCompanyContext();

  const customers = await prisma.customer.findMany({
    where: {
      companyId,
      buyingGroup,
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

  if (
    invoice.invoiceDate >=
      startOfCurrentYear &&
    invoice.invoiceDate <= now
  ) {
    product.currentSales += sales;
    product.currentQuantity += quantity;
   if (!isCredit && rawQuantity > 0) {
  product.currentBuyers.add(buyerKey);
}
   
    if (
      !isCredit &&
      rawQuantity > 0 &&
      (
        !product.lastSold ||
        invoice.invoiceDate >
          product.lastSold
      )
    ) {
      product.lastSold =
        invoice.invoiceDate;
    }
  }

  if (
    invoice.invoiceDate >=
      startOfPreviousYear &&
    invoice.invoiceDate <=
      comparisonEndLastYear
  ) {
    product.previousSales += sales;
    product.previousQuantity += quantity;
    product.previousBuyers.add(buyerKey);
  }
}

const productAliases =
  await prisma.productAlias.findMany({
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

const mlcpCrossSellRows =
  mlcpOpportunityRows.filter(
    (row) =>
      !mlcpPreviousBuyers.has(String(row.id))
  );

const mlcpCurrentBuyerRows =
  rows
    .filter((row) =>
      mlcpCurrentBuyers.has(String(row.id))
    )
    .sort(
      (a, b) =>
        b.currentYearSales - a.currentYearSales
    );

   const mlcpNewBuyerRows =
  rows
    .filter((row) =>
      mlcpNewBuyers.includes(String(row.id))
    )
    .sort(
      (a, b) =>
        b.currentYearSales - a.currentYearSales
    );

const mlcpLapsedBuyerRows =
  rows
    .filter((row) =>
      mlcpLapsedBuyers.includes(String(row.id))
    )
    .sort(
      (a, b) =>
        b.previousYearSales - a.previousYearSales
    ); 
const mlcpPenetration =
  customers.length > 0
    ? (mlcpCurrentBuyers.size / customers.length) * 100
    : 0;

 

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
console.log(
  "NBG CATEGORY CHECK",
  {
    current:
      nbgProductGroupCurrentTotal.toFixed(2),
    previous:
      nbgProductGroupPreviousTotal.toFixed(2),
    groups:
      nbgProductGroupPerformance.map(
        (group) => ({
          group: group.label,
          current:
            group.currentSales.toFixed(2),
          previous:
            group.previousSales.toFixed(2),
          difference:
            group.difference.toFixed(2),
          percentage:
            group.percentage.toFixed(1),
          products:
            group.productCount,
        })
      ),
  }
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

console.log(
  "NBG TOP OTHER PRODUCTS",
  nbgOtherProducts
);

console.log(
  "NBG PRODUCT CHECK",
  {
    current:
      nbgProductCurrentTotal.toFixed(2),
    previous:
      nbgProductPreviousTotal.toFixed(2),
  }
);

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
          {buyingGroup}
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
      What is driving {buyingGroup}?
    </h2>

    <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
      {buyingGroup} is currently{" "}
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
    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
      Monthly Performance
    </p>

    <h2 className="mt-1 text-xl font-bold text-slate-950">
      {currentYear} vs {previousYear}
    </h2>

    <p className="mt-1 text-sm text-slate-500">
      Monthly net sales for {buyingGroup}, comparing the same periods year on year.
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
      What is NBG buying?
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
      MLCP is growing strongly within NBG, but penetration across the
      membership remains low.
    </p>
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
        Members not buying MLCP
      </p>
    </a>
    </div>
 
  <div
  id="mlcp-lapsed-buyers"
  className="border-t border-slate-200 p-5 scroll-mt-6"
>
  <div className="grid gap-5 lg:grid-cols-3">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
        Lapsed MLCP Buyers
      </p>

      <p className="mt-1 text-sm text-slate-600">
        Bought MLCP in {previousYear}, but not in {currentYear}.
      </p>

      <div className="mt-4 space-y-2">
        {mlcpLapsedBuyerRows.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3"
          >
            <span className="font-semibold text-slate-900">
              {row.name}
            </span>

            <span className="font-bold text-red-700">
              {money(row.previousYearSales)}
            </span>
          </div>
        ))}
      </div>
    </div>
    </div>
    <div
  id="mlcp-new-buyers"
  className="scroll-mt-6"
>
  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
    New MLCP Buyers
  </p>

  <p className="mt-1 text-sm text-slate-600">
    New MLCP buyers in {currentYear}.
  </p>

  <div className="mt-4 space-y-2">
    {mlcpNewBuyerRows.map((row) => (
      <div
        key={row.id}
        className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3"
      >
        <span className="font-semibold text-slate-900">
          {row.name}
        </span>

        <span className="font-bold text-emerald-700">
          {money(row.currentYearSales)}
        </span>
      </div>
    ))}
  </div>
  <div>
   <div
  id="mlcp-current-buyers"
  className="mb-5 scroll-mt-6"
>
  <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
    Current MLCP Buyers
  </p>

  <p className="mt-1 text-sm text-slate-600">
    All NBG members buying MLCP in {currentYear}.
  </p>

  <div className="mt-4 space-y-2">
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
          {money(row.currentYearSales)}
        </span>
      </div>
    ))}
  </div>

  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
    Top MLCP Opportunities
  </p>

  <p className="mt-1 text-sm text-slate-600">
    Highest-spending NBG members not buying MLCP in {currentYear}.
  </p>

  <div className="mt-4 space-y-2">
    {mlcpOpportunityRows.slice(0, 5).map((row) => (
      <div
        key={row.id}
        className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3"
      >
        <span className="font-semibold text-slate-900">
          {row.name}
        </span>

        <span className="font-bold text-amber-700">
          {money(row.currentYearSales)}
        </span>
      </div>
    ))}
  </div>
</div>
</div>
  </div>
</div>
<div
  id="mlcp-opportunities"
  className="border-t border-slate-200 p-5 scroll-mt-6"
>
  <div className="flex items-end justify-between gap-4">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
        All MLCP Opportunities
      </p>

      <h3 className="mt-1 text-lg font-bold text-slate-950">
        {mlcpOpportunityRows.length} NBG Members Not Buying MLCP
      </h3>

      <p className="mt-1 text-sm text-slate-600">
        Ranked by {currentYear} spend with Hetta, highest opportunity first.
      </p>
    </div>
  </div>

  <div className="mt-4 overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-5 py-3">Rank</th>
          <th className="px-5 py-3">NBG Member</th>
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
        {mlcpOpportunityRows.map((row, index) => (
          <tr
            key={row.id}
            className="border-t border-slate-100"
          >
            <td className="px-5 py-3 font-semibold text-slate-500">
              {index + 1}
            </td>

            <td className="px-5 py-3 font-semibold text-slate-950">
              {row.name}
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
</div>
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


