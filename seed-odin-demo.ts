import { prisma } from "./lib/prisma";

const DEMO_COMPANY_ID = 9;
const DEMO_COMPANY_SLUG = "odin-demo";
const DEMO_COMPANY_NAME = "Odin Demo";

function date(value: string) {
  return new Date(`${value}T12:00:00`);
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

async function main() {
  console.log("");
  console.log("ODINIQ DEMO DATA SEED");
  console.log("=====================");
  console.log("");

  /*
   * -------------------------------------------------------
   * SAFETY CHECK
   * -------------------------------------------------------
   *
   * This script MUST only ever run against the Odin Demo
   * company.
   */

  const company = await prisma.company.findUnique({
    where: {
      id: DEMO_COMPANY_ID,
    },
  });

  if (!company) {
    throw new Error(
      `Safety stop: company ${DEMO_COMPANY_ID} does not exist.`
    );
  }

  if (
    company.id !== DEMO_COMPANY_ID ||
    company.slug !== DEMO_COMPANY_SLUG ||
    company.name !== DEMO_COMPANY_NAME
  ) {
    throw new Error(
      `Safety stop: company ${DEMO_COMPANY_ID} is not the expected Odin Demo tenant.`
    );
  }

  console.log(
    `Confirmed tenant: ${company.name} (${company.slug})`
  );

  /*
   * Refuse to seed over existing commercial data.
   */

  const [
    existingCustomers,
    existingProducts,
    existingInvoices,
    existingOrders,
  ] = await Promise.all([
    prisma.customer.count({
      where: {
        companyId: DEMO_COMPANY_ID,
      },
    }),
    prisma.product.count({
      where: {
        companyId: DEMO_COMPANY_ID,
      },
    }),
    prisma.salesInvoice.count({
      where: {
        companyId: DEMO_COMPANY_ID,
      },
    }),
    prisma.salesOrder.count({
      where: {
        companyId: DEMO_COMPANY_ID,
      },
    }),
  ]);

  if (
    existingCustomers > 0 ||
    existingProducts > 0 ||
    existingInvoices > 0 ||
    existingOrders > 0
  ) {
    throw new Error(
      `Safety stop: Odin Demo already contains commercial data. ` +
        `Customers=${existingCustomers}, ` +
        `Products=${existingProducts}, ` +
        `Invoices=${existingInvoices}, ` +
        `Orders=${existingOrders}.`
    );
  }

  console.log(
    "Odin Demo is empty. Safe to continue."
  );
  console.log("");

  /*
   * -------------------------------------------------------
   * CUSTOMERS
   * -------------------------------------------------------
   *
   * All names, addresses and contact details below are
   * fictional demonstration data.
   */

  const customerDefinitions = [
    {
      accountCode: "DEM001",
      name: "Northstar Heating Supplies",
      customerType: "Merchant",
      buyingGroup: "Independent",
      email: "accounts@northstar-demo.example",
      phone: "0161 555 0101",
      addressLine: "14 Meridian Trade Park",
      town: "Manchester",
      postcode: "M17 1AA",
      paymentTerms: "30 Days",
      creditLimit: 35000,
      currentBalance: 8420,
      discount: 52,
      accountOpenedDate: date("2023-02-14"),
      notes:
        "Demo account showing strong year-on-year and recent sales growth.",
    },
    {
      accountCode: "DEM002",
      name: "Oakridge Plumbing & Heating",
      customerType: "Merchant",
      buyingGroup: "Independent",
      email: "accounts@oakridge-demo.example",
      phone: "01925 555 0202",
      addressLine: "8 Foundry Way",
      town: "Warrington",
      postcode: "WA2 8ZZ",
      paymentTerms: "30 Days",
      creditLimit: 30000,
      currentBalance: 6150,
      discount: 50,
      accountOpenedDate: date("2022-06-08"),
      notes:
        "Demo account showing a significant recent sales decline.",
    },
    {
      accountCode: "DEM003",
      name: "Apex Building Services",
      customerType: "Contractor",
      buyingGroup: null,
      email: "accounts@apex-demo.example",
      phone: "0151 555 0303",
      addressLine: "21 Harbour Business Centre",
      town: "Liverpool",
      postcode: "L20 1AB",
      paymentTerms: "30 Days",
      creditLimit: 25000,
      currentBalance: 0,
      discount: 48,
      accountOpenedDate: date("2024-01-22"),
      notes:
        "Demo account deliberately configured to trigger a stopped-buying signal.",
    },
    {
      accountCode: "DEM004",
      name: "Summit Mechanical",
      customerType: "Contractor",
      buyingGroup: null,
      email: "accounts@summit-demo.example",
      phone: "0113 555 0404",
      addressLine: "5 Summit Court",
      town: "Leeds",
      postcode: "LS10 1AB",
      paymentTerms: "30 Days",
      creditLimit: 40000,
      currentBalance: 11750,
      discount: 51,
      accountOpenedDate: date("2023-09-04"),
      notes:
        "Demo account showing healthy consistent purchasing.",
    },
    {
      accountCode: "DEM005",
      name: "BluePeak Renewables",
      customerType: "Renewables Specialist",
      buyingGroup: "Green Trade Network",
      email: "accounts@bluepeak-demo.example",
      phone: "0121 555 0505",
      addressLine: "42 Innovation Drive",
      town: "Birmingham",
      postcode: "B7 4AA",
      paymentTerms: "30 Days",
      creditLimit: 45000,
      currentBalance: 9340,
      discount: 50,
      accountOpenedDate: date("2024-03-11"),
      notes:
        "Demo growth account with increasing demand for heating controls.",
    },
    {
      accountCode: "DEM006",
      name: "Redwood Plumbing Centres",
      customerType: "Merchant",
      buyingGroup: "Alliance Buying Group",
      email: "accounts@redwood-demo.example",
      phone: "0115 555 0606",
      addressLine: "16 Commerce Road",
      town: "Nottingham",
      postcode: "NG7 2AA",
      paymentTerms: "45 Days",
      creditLimit: 50000,
      currentBalance: 14560,
      discount: 53,
      accountOpenedDate: date("2021-11-19"),
      notes:
        "Established merchant account with stable purchasing.",
    },
    {
      accountCode: "DEM007",
      name: "Cedar Home Heating",
      customerType: "Installer",
      buyingGroup: null,
      email: "accounts@cedar-demo.example",
      phone: "01772 555 0707",
      addressLine: "7 Cedar Industrial Estate",
      town: "Preston",
      postcode: "PR2 5AA",
      paymentTerms: "30 Days",
      creditLimit: 18000,
      currentBalance: 3280,
      discount: 47,
      accountOpenedDate: date("2024-08-12"),
      notes:
        "Smaller but consistent installer account.",
    },
    {
      accountCode: "DEM008",
      name: "Horizon Trade Supplies",
      customerType: "Merchant",
      buyingGroup: "Independent",
      email: "accounts@horizon-demo.example",
      phone: "01244 555 0808",
      addressLine: "29 Horizon Park",
      town: "Chester",
      postcode: "CH1 4AA",
      paymentTerms: "30 Days",
      creditLimit: 28000,
      currentBalance: 4520,
      discount: 49,
      accountOpenedDate: date("2023-05-16"),
      notes:
        "Demo dormant account with strong historic sales but no recent invoices.",
    },
    {
      accountCode: "DEM009",
      name: "Vertex Property Services",
      customerType: "Contractor",
      buyingGroup: null,
      email: "accounts@vertex-demo.example",
      phone: "01782 555 0909",
      addressLine: "3 Enterprise Close",
      town: "Stoke-on-Trent",
      postcode: "ST4 4AA",
      paymentTerms: "30 Days",
      creditLimit: 32000,
      currentBalance: 5890,
      discount: 48,
      accountOpenedDate: date("2023-10-03"),
      notes:
        "Demo account with moderate recent sales decline.",
    },
    {
      accountCode: "DEM010",
      name: "Forge Heating Solutions",
      customerType: "Installer",
      buyingGroup: null,
      email: "accounts@forge-demo.example",
      phone: "01332 555 1010",
      addressLine: "11 Forge Lane",
      town: "Derby",
      postcode: "DE21 6AA",
      paymentTerms: "30 Days",
      creditLimit: 22000,
      currentBalance: 3940,
      discount: 47,
      accountOpenedDate: date("2024-02-01"),
      notes:
        "Healthy demo installer account.",
    },
  ];

  const customers = new Map<
    string,
    { id: number; name: string }
  >();

  for (const definition of customerDefinitions) {
    const customer = await prisma.customer.create({
      data: {
        companyId: DEMO_COMPANY_ID,
        ...definition,
      },
    });

    customers.set(customer.accountCode, {
      id: customer.id,
      name: customer.name,
    });
  }

  console.log(
    `Created ${customers.size} fictional customers.`
  );

  /*
   * -------------------------------------------------------
   * PRODUCTS
   * -------------------------------------------------------
   */

  const productDefinitions = [
    {
      productCode: "OD-P16-100",
      description:
        "16mm Multilayer Heating Pipe - 100m Coil",
      supplier: "NordTherm Manufacturing",
      category: "Pipe",
      brand: "Odin Demo",
      costPrice: 58,
      listPrice: 145,
      sellPrice: 79,
      margin: 26.58,
    },
    {
      productCode: "OD-P16-500",
      description:
        "16mm Multilayer Heating Pipe - 500m Coil",
      supplier: "NordTherm Manufacturing",
      category: "Pipe",
      brand: "Odin Demo",
      costPrice: 248,
      listPrice: 620,
      sellPrice: 339,
      margin: 26.84,
    },
    {
      productCode: "OD-MAN-04",
      description:
        "4 Port Stainless Steel Heating Manifold",
      supplier: "ThermaCore Europe",
      category: "Manifolds",
      brand: "Odin Demo",
      costPrice: 54,
      listPrice: 135,
      sellPrice: 82,
      margin: 34.15,
    },
    {
      productCode: "OD-MAN-08",
      description:
        "8 Port Stainless Steel Heating Manifold",
      supplier: "ThermaCore Europe",
      category: "Manifolds",
      brand: "Odin Demo",
      costPrice: 76,
      listPrice: 190,
      sellPrice: 116,
      margin: 34.48,
    },
    {
      productCode: "OD-MAN-12",
      description:
        "12 Port Stainless Steel Heating Manifold",
      supplier: "ThermaCore Europe",
      category: "Manifolds",
      brand: "Odin Demo",
      costPrice: 99,
      listPrice: 248,
      sellPrice: 151,
      margin: 34.44,
    },
    {
      productCode: "OD-ACT-230",
      description:
        "230V Electrothermal Actuator",
      supplier: "ControlWorks",
      category: "Controls",
      brand: "Odin Demo",
      costPrice: 8.4,
      listPrice: 24,
      sellPrice: 14.5,
      margin: 42.07,
    },
    {
      productCode: "OD-STAT-D",
      description:
        "Digital Programmable Room Thermostat",
      supplier: "ControlWorks",
      category: "Controls",
      brand: "Odin Demo",
      costPrice: 24,
      listPrice: 68,
      sellPrice: 42,
      margin: 42.86,
    },
    {
      productCode: "OD-WC-08",
      description:
        "8 Zone Wiring Centre",
      supplier: "ControlWorks",
      category: "Controls",
      brand: "Odin Demo",
      costPrice: 39,
      listPrice: 105,
      sellPrice: 64,
      margin: 39.06,
    },
    {
      productCode: "OD-CON-16",
      description:
        "16mm Eurocone Manifold Connector",
      supplier: "ThermaCore Europe",
      category: "Fittings",
      brand: "Odin Demo",
      costPrice: 1.65,
      listPrice: 5.2,
      sellPrice: 3.1,
      margin: 46.77,
    },
    {
      productCode: "OD-CLIP-16",
      description:
        "16mm Pipe Clip - Box 100",
      supplier: "NordTherm Manufacturing",
      category: "Accessories",
      brand: "Odin Demo",
      costPrice: 7.8,
      listPrice: 22,
      sellPrice: 13.5,
      margin: 42.22,
    },
    {
      productCode: "OD-PUMP-01",
      description:
        "High Efficiency Manifold Pump Set",
      supplier: "HydroMotion",
      category: "Pump Sets",
      brand: "Odin Demo",
      costPrice: 92,
      listPrice: 245,
      sellPrice: 149,
      margin: 38.26,
    },
    {
      productCode: "OD-KIT-100",
      description:
        "100m² Underfloor Heating Project Kit",
      supplier: "Odin Demo Assembly",
      category: "Heating Kits",
      brand: "Odin Demo",
      costPrice: 485,
      listPrice: 1295,
      sellPrice: 795,
      margin: 38.99,
    },
  ];

  const products = new Map<
    string,
    {
      description: string;
      sellPrice: number;
    }
  >();

  for (const definition of productDefinitions) {
    const product = await prisma.product.create({
      data: {
        companyId: DEMO_COMPANY_ID,
        ...definition,
      },
    });

    products.set(product.productCode, {
      description: product.description,
      sellPrice: product.sellPrice ?? 0,
    });
  }

  console.log(
    `Created ${products.size} fictional products.`
  );

  /*
   * -------------------------------------------------------
   * INVOICES
   * -------------------------------------------------------
   */

  let invoiceSequence = 10001;

  async function createInvoice(
    accountCode: string,
    invoiceDate: string,
    netValue: number,
    stockCode: string
  ) {
    const customer = customers.get(accountCode);
    const product = products.get(stockCode);

    if (!customer || !product) {
      throw new Error(
        `Missing demo customer/product for invoice: ${accountCode} / ${stockCode}`
      );
    }

    const invoiceNumber =
      `DEMO-INV-${invoiceSequence++}`;

    const vatValue = money(netValue * 0.2);
    const grossValue = money(
      netValue + vatValue
    );

    await prisma.salesInvoice.create({
      data: {
        companyId: DEMO_COMPANY_ID,
        invoiceNumber,
        invoiceType: "Invoice",
        invoiceDate: date(invoiceDate),
        customerAccountCode: accountCode,
        customerName: customer.name,
        netValue,
        vatValue,
        grossValue,

        lines: {
          create: [
            {
              lineNumber: 1,
              stockCode,
              description:
                product.description,
              quantity: Math.max(
                1,
                Math.round(
                  netValue /
                    Math.max(
                      product.sellPrice,
                      1
                    )
                )
              ),
              netValue,
              vatValue,
            },
          ],
        },
      },
    });
  }

  /*
   * Historic 2025 activity.
   *
   * Gives the demo meaningful YOY history and
   * provides a dormant-customer example.
   */

  await createInvoice(
    "DEM001",
    "2025-01-20",
    3200,
    "OD-P16-500"
  );
  await createInvoice(
    "DEM001",
    "2025-04-18",
    4100,
    "OD-MAN-08"
  );
  await createInvoice(
    "DEM001",
    "2025-07-15",
    5200,
    "OD-P16-500"
  );

  await createInvoice(
    "DEM002",
    "2025-02-14",
    5200,
    "OD-KIT-100"
  );
  await createInvoice(
    "DEM002",
    "2025-05-20",
    6100,
    "OD-MAN-12"
  );
  await createInvoice(
    "DEM002",
    "2025-08-19",
    5900,
    "OD-P16-500"
  );

  await createInvoice(
    "DEM003",
    "2025-03-10",
    3600,
    "OD-KIT-100"
  );
  await createInvoice(
    "DEM003",
    "2025-06-12",
    4400,
    "OD-MAN-08"
  );

  await createInvoice(
    "DEM004",
    "2025-01-28",
    4700,
    "OD-P16-500"
  );
  await createInvoice(
    "DEM004",
    "2025-04-22",
    5100,
    "OD-MAN-12"
  );
  await createInvoice(
    "DEM004",
    "2025-07-24",
    5500,
    "OD-KIT-100"
  );

  await createInvoice(
    "DEM005",
    "2025-02-25",
    2800,
    "OD-STAT-D"
  );
  await createInvoice(
    "DEM005",
    "2025-05-27",
    3400,
    "OD-WC-08"
  );
  await createInvoice(
    "DEM005",
    "2025-08-28",
    3900,
    "OD-ACT-230"
  );

  /*
   * DEM008 is intentionally historic only.
   *
   * Total historical sales > £10,000 and no
   * invoices within 180 days of the latest
   * invoice date. This should create a HIGH
   * dormant-customer signal.
   */

  await createInvoice(
    "DEM008",
    "2025-04-11",
    5200,
    "OD-P16-500"
  );
  await createInvoice(
    "DEM008",
    "2025-08-08",
    4800,
    "OD-MAN-08"
  );
  await createInvoice(
    "DEM008",
    "2025-12-12",
    5600,
    "OD-KIT-100"
  );

  /*
   * -------------------------------------------------------
   * 2026 EARLY-YEAR SALES
   * -------------------------------------------------------
   */

  await createInvoice(
    "DEM001",
    "2026-01-16",
    4200,
    "OD-P16-500"
  );
  await createInvoice(
    "DEM001",
    "2026-02-20",
    3900,
    "OD-MAN-08"
  );

  await createInvoice(
    "DEM002",
    "2026-01-22",
    5600,
    "OD-KIT-100"
  );
  await createInvoice(
    "DEM002",
    "2026-02-18",
    4900,
    "OD-P16-500"
  );

  await createInvoice(
    "DEM004",
    "2026-01-29",
    4600,
    "OD-MAN-12"
  );
  await createInvoice(
    "DEM004",
    "2026-02-26",
    4800,
    "OD-P16-500"
  );

  await createInvoice(
    "DEM005",
    "2026-01-14",
    3100,
    "OD-STAT-D"
  );
  await createInvoice(
    "DEM005",
    "2026-02-24",
    3500,
    "OD-WC-08"
  );

  await createInvoice(
    "DEM006",
    "2026-01-19",
    4100,
    "OD-P16-500"
  );
  await createInvoice(
    "DEM006",
    "2026-02-23",
    4300,
    "OD-MAN-08"
  );

  /*
   * -------------------------------------------------------
   * PREVIOUS 90-DAY COMPARISON PERIOD
   * -------------------------------------------------------
   *
   * Odin's latest invoice will be 23 Sep 2026.
   * Current period starts 26 Jun 2026.
   *
   * These invoices sit in the immediately
   * preceding 90-day period.
   */

  // DEM001 previous = £6,000
  await createInvoice(
    "DEM001",
    "2026-04-10",
    3000,
    "OD-P16-500"
  );
  await createInvoice(
    "DEM001",
    "2026-05-20",
    3000,
    "OD-MAN-08"
  );

  // DEM002 previous = £12,000
  await createInvoice(
    "DEM002",
    "2026-04-08",
    6000,
    "OD-KIT-100"
  );
  await createInvoice(
    "DEM002",
    "2026-06-12",
    6000,
    "OD-P16-500"
  );

  // DEM003 previous = £8,000, current = £0
  await createInvoice(
    "DEM003",
    "2026-04-16",
    4000,
    "OD-KIT-100"
  );
  await createInvoice(
    "DEM003",
    "2026-06-05",
    4000,
    "OD-MAN-08"
  );

  // DEM004 previous = £9,000
  await createInvoice(
    "DEM004",
    "2026-04-21",
    4500,
    "OD-P16-500"
  );
  await createInvoice(
    "DEM004",
    "2026-06-18",
    4500,
    "OD-MAN-12"
  );

  // DEM005 previous = £4,000
  await createInvoice(
    "DEM005",
    "2026-04-24",
    2000,
    "OD-STAT-D"
  );
  await createInvoice(
    "DEM005",
    "2026-06-19",
    2000,
    "OD-ACT-230"
  );

  // DEM006 previous = £7,500
  await createInvoice(
    "DEM006",
    "2026-04-28",
    3750,
    "OD-P16-500"
  );
  await createInvoice(
    "DEM006",
    "2026-06-22",
    3750,
    "OD-MAN-08"
  );

  // DEM007 previous = £2,500
  await createInvoice(
    "DEM007",
    "2026-05-12",
    2500,
    "OD-P16-100"
  );

  // DEM009 previous = £7,000
  await createInvoice(
    "DEM009",
    "2026-04-30",
    3500,
    "OD-KIT-100"
  );
  await createInvoice(
    "DEM009",
    "2026-06-15",
    3500,
    "OD-P16-500"
  );

  // DEM010 previous = £3,200
  await createInvoice(
    "DEM010",
    "2026-05-18",
    3200,
    "OD-MAN-08"
  );

  /*
   * -------------------------------------------------------
   * CURRENT 90-DAY PERIOD
   * -------------------------------------------------------
   */

  // DEM001 current = £11,000
  // Strong growth from £6,000.
  await createInvoice(
    "DEM001",
    "2026-07-10",
    3500,
    "OD-P16-500"
  );
  await createInvoice(
    "DEM001",
    "2026-08-14",
    3500,
    "OD-MAN-08"
  );
  await createInvoice(
    "DEM001",
    "2026-09-23",
    4000,
    "OD-KIT-100"
  );

  // DEM002 current = £5,000
  // Significant decline from £12,000.
  await createInvoice(
    "DEM002",
    "2026-07-17",
    2500,
    "OD-P16-500"
  );
  await createInvoice(
    "DEM002",
    "2026-09-04",
    2500,
    "OD-MAN-08"
  );

  // DEM003 deliberately receives NO current invoices.

  // DEM004 current = £9,400
  // Stable / healthy.
  await createInvoice(
    "DEM004",
    "2026-07-21",
    3100,
    "OD-P16-500"
  );
  await createInvoice(
    "DEM004",
    "2026-08-25",
    3100,
    "OD-MAN-12"
  );
  await createInvoice(
    "DEM004",
    "2026-09-18",
    3200,
    "OD-KIT-100"
  );

  // DEM005 current = £7,500
  // Strong growth from £4,000.
  await createInvoice(
    "DEM005",
    "2026-07-24",
    2400,
    "OD-STAT-D"
  );
  await createInvoice(
    "DEM005",
    "2026-08-27",
    2500,
    "OD-WC-08"
  );
  await createInvoice(
    "DEM005",
    "2026-09-21",
    2600,
    "OD-ACT-230"
  );

  // DEM006 current = £7,800
  // Stable.
  await createInvoice(
    "DEM006",
    "2026-07-29",
    3900,
    "OD-P16-500"
  );
  await createInvoice(
    "DEM006",
    "2026-09-09",
    3900,
    "OD-MAN-08"
  );

  // DEM007 current = £2,900
  // Healthy smaller account.
  await createInvoice(
    "DEM007",
    "2026-08-06",
    1400,
    "OD-P16-100"
  );
  await createInvoice(
    "DEM007",
    "2026-09-16",
    1500,
    "OD-MAN-04"
  );

  // DEM009 current = £4,800
  // Down enough to create a decline signal.
  await createInvoice(
    "DEM009",
    "2026-07-31",
    2400,
    "OD-P16-500"
  );
  await createInvoice(
    "DEM009",
    "2026-09-11",
    2400,
    "OD-MAN-08"
  );

  // DEM010 current = £3,500
  await createInvoice(
    "DEM010",
    "2026-08-12",
    1700,
    "OD-MAN-08"
  );
  await createInvoice(
    "DEM010",
    "2026-09-23",
    1800,
    "OD-P16-100"
  );

  console.log(
    `Created ${invoiceSequence - 10001} fictional invoices.`
  );

  /*
   * Update customer invoice dates.
   */

  for (const [
    accountCode,
    customer,
  ] of customers) {
    const invoiceDates =
      await prisma.salesInvoice.aggregate({
        where: {
          companyId: DEMO_COMPANY_ID,
          customerAccountCode:
            accountCode,
        },
        _min: {
          invoiceDate: true,
        },
        _max: {
          invoiceDate: true,
        },
      });

    await prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        firstInvoiceDate:
          invoiceDates._min.invoiceDate,
        lastInvoiceDate:
          invoiceDates._max.invoiceDate,
      },
    });
  }

  /*
   * -------------------------------------------------------
   * SALES ORDERS / WAREHOUSE
   * -------------------------------------------------------
   */

  const salesOrders = [
    {
      salesOrderNumber: "DEMO-SO-2001",
      orderDate: "2026-09-23",
      accountCode: "DEM001",
      value: 4860,
      status: "Processing",
      despatched: false,
      invoiced: false,
      warehouseActive: true,
      warehouseStatus:
        "ORDER_RECEIVED",
      warehouseNote:
        "Priority order for next-day delivery.",
    },
    {
      salesOrderNumber: "DEMO-SO-2002",
      orderDate: "2026-09-23",
      accountCode: "DEM005",
      value: 2750,
      status: "Picking",
      despatched: false,
      invoiced: false,
      warehouseActive: true,
      warehouseStatus:
        "PICKING",
      warehouseNote:
        "Controls and actuators being picked.",
    },
    {
      salesOrderNumber: "DEMO-SO-2003",
      orderDate: "2026-09-22",
      accountCode: "DEM004",
      value: 6120,
      status: "Packed",
      despatched: false,
      invoiced: false,
      warehouseActive: true,
      warehouseStatus:
        "PACKED",
      warehouseNote:
        "Pallet packed and awaiting carrier collection.",
    },
    {
      salesOrderNumber: "DEMO-SO-2004",
      orderDate: "2026-09-22",
      accountCode: "DEM006",
      value: 3890,
      status: "Despatched",
      despatched: true,
      invoiced: false,
      warehouseActive: true,
      warehouseStatus:
        "DESPATCHED",
      warehouseNote:
        "Carrier collection completed.",
    },
    {
      salesOrderNumber: "DEMO-SO-2005",
      orderDate: "2026-09-21",
      accountCode: "DEM010",
      value: 1840,
      status: "Complete",
      despatched: true,
      invoiced: true,
      warehouseActive: false,
      warehouseStatus:
        "COMPLETE",
      warehouseNote:
        "Order completed.",
    },
  ];

  for (const order of salesOrders) {
    const customer =
      customers.get(order.accountCode);

    if (!customer) {
      throw new Error(
        `Missing customer ${order.accountCode}`
      );
    }

    await prisma.salesOrder.create({
      data: {
        companyId: DEMO_COMPANY_ID,
        salesOrderNumber:
          order.salesOrderNumber,
        orderDate: date(order.orderDate),
        customerAccountCode:
          order.accountCode,
        customerName: customer.name,
        orderValue: order.value,
        status: order.status,
        despatched: order.despatched,
        invoiced: order.invoiced,
        warehouseActive:
          order.warehouseActive,
        warehouseStatus:
          order.warehouseStatus,
        warehouseStatusBy:
          "Odin Demo Warehouse",
        warehouseStatusAt:
          date(order.orderDate),
        warehouseNote:
          order.warehouseNote,
      },
    });
  }

  console.log(
    `Created ${salesOrders.length} fictional sales orders.`
  );

  /*
   * -------------------------------------------------------
   * COMMERCIAL OPPORTUNITIES
   * -------------------------------------------------------
   */

  const opportunityDefinitions = [
    {
      accountCode: "DEM001",
      title:
        "Northstar branch rollout",
      description:
        "Opportunity to expand the heating range across three additional branches.",
      stage: "PROPOSAL",
      status: "OPEN",
      value: 48000,
      probability: 70,
      expectedCloseDate:
        "2026-10-30",
      source: "Account Review",
    },
    {
      accountCode: "DEM005",
      title:
        "BluePeak controls expansion",
      description:
        "Growing customer interested in extending its controls and thermostat range.",
      stage: "QUALIFY",
      status: "OPEN",
      value: 26500,
      probability: 55,
      expectedCloseDate:
        "2026-11-20",
      source: "Sales Growth Signal",
    },
    {
      accountCode: "DEM002",
      title:
        "Oakridge recovery plan",
      description:
        "Commercial review following a significant reduction in recent purchasing.",
      stage: "REVIEW",
      status: "OPEN",
      value: 18000,
      probability: 40,
      expectedCloseDate:
        "2026-10-23",
      source: "Odin Intelligence",
    },
  ];

  const opportunities: {
    accountCode: string;
    id: number;
  }[] = [];

  for (
    const opportunity of
      opportunityDefinitions
  ) {
    const customer =
      customers.get(
        opportunity.accountCode
      );

    if (!customer) {
      throw new Error(
        `Missing customer ${opportunity.accountCode}`
      );
    }

    const created =
      await prisma.commercialOpportunity.create({
        data: {
          companyId: DEMO_COMPANY_ID,
          customerId: customer.id,
          title: opportunity.title,
          description:
            opportunity.description,
          stage: opportunity.stage,
          status: opportunity.status,
          value: opportunity.value,
          probability:
            opportunity.probability,
          expectedCloseDate: date(
            opportunity.expectedCloseDate
          ),
          source: opportunity.source,
        },
      });

    opportunities.push({
      accountCode:
        opportunity.accountCode,
      id: created.id,
    });
  }

  console.log(
    `Created ${opportunities.length} fictional opportunities.`
  );

  /*
   * -------------------------------------------------------
   * QUOTES
   * -------------------------------------------------------
   */

  const quoteDefinitions = [
    {
      quoteNumber: "DEMO-Q-3001",
      accountCode: "DEM001",
      quoteDate: "2026-09-22",
      expiryDate: "2026-10-22",
      status: "OPEN",
      netValue: 12850,
      productCode: "OD-KIT-100",
      description:
        "Underfloor heating project package",
    },
    {
      quoteNumber: "DEMO-Q-3002",
      accountCode: "DEM005",
      quoteDate: "2026-09-21",
      expiryDate: "2026-10-21",
      status: "OPEN",
      netValue: 8420,
      productCode: "OD-STAT-D",
      description:
        "Controls and thermostat package",
    },
    {
      quoteNumber: "DEMO-Q-3003",
      accountCode: "DEM004",
      quoteDate: "2026-09-18",
      expiryDate: "2026-10-18",
      status: "WON",
      netValue: 15750,
      productCode: "OD-P16-500",
      description:
        "Pipe and manifold project package",
    },
    {
      quoteNumber: "DEMO-Q-3004",
      accountCode: "DEM006",
      quoteDate: "2026-09-17",
      expiryDate: "2026-10-17",
      status: "OPEN",
      netValue: 6750,
      productCode: "OD-MAN-08",
      description:
        "Merchant stock replenishment",
    },
    {
      quoteNumber: "DEMO-Q-3005",
      accountCode: "DEM009",
      quoteDate: "2026-09-15",
      expiryDate: "2026-10-15",
      status: "LOST",
      netValue: 9250,
      productCode: "OD-KIT-100",
      description:
        "Residential development package",
    },
  ];

  for (const quote of quoteDefinitions) {
    const customer =
      customers.get(quote.accountCode);

    if (!customer) {
      throw new Error(
        `Missing customer ${quote.accountCode}`
      );
    }

    const vatValue = money(
      quote.netValue * 0.2
    );

    await prisma.quote.create({
      data: {
        companyId: DEMO_COMPANY_ID,
        customerId: customer.id,
        quoteNumber:
          quote.quoteNumber,
        quoteDate:
          date(quote.quoteDate),
        expiryDate:
          date(quote.expiryDate),
        merchantName:
          customer.name,
        status: quote.status,
        netValue: quote.netValue,
        vatValue,
        grossValue: money(
          quote.netValue + vatValue
        ),
        source: "ODIN_DEMO",

        lines: {
          create: [
            {
              productCode:
                quote.productCode,
              description:
                quote.description,
              quantity: 1,
              unitPrice:
                quote.netValue,
              lineValue:
                quote.netValue,
            },
          ],
        },
      },
    });
  }

  console.log(
    `Created ${quoteDefinitions.length} fictional quotes.`
  );

  /*
   * -------------------------------------------------------
   * COMMERCIAL PRIORITIES / TASKS
   * -------------------------------------------------------
   */

  const taskDefinitions = [
    {
      accountCode: "DEM002",
      title:
        "Review Oakridge sales decline",
      description:
        "Recent purchasing has fallen materially. Contact the customer and identify lost categories or competitor activity.",
      priority: "HIGH",
      type: "SALES_RECOVERY",
      dueDate: "2026-09-25",
    },
    {
      accountCode: "DEM003",
      title:
        "Contact Apex - stopped buying",
      description:
        "Apex had meaningful previous-period sales but has recorded no current-period revenue.",
      priority: "HIGH",
      type: "CUSTOMER_RETENTION",
      dueDate: "2026-09-24",
    },
    {
      accountCode: "DEM001",
      title:
        "Develop Northstar growth opportunity",
      description:
        "Strong recent growth detected. Review branch expansion and additional product opportunities.",
      priority: "MEDIUM",
      type: "GROWTH",
      dueDate: "2026-09-30",
    },
    {
      accountCode: "DEM005",
      title:
        "Expand BluePeak controls range",
      description:
        "Customer growth suggests an opportunity to increase controls and thermostat penetration.",
      priority: "MEDIUM",
      type: "GROWTH",
      dueDate: "2026-10-02",
    },
    {
      accountCode: "DEM008",
      title:
        "Re-engage dormant Horizon account",
      description:
        "Historic customer has had no recent invoice activity. Establish whether the account can be recovered.",
      priority: "HIGH",
      type: "DORMANT_CUSTOMER",
      dueDate: "2026-09-28",
    },
  ];

  for (const task of taskDefinitions) {
    const customer =
      customers.get(task.accountCode);

    if (!customer) {
      throw new Error(
        `Missing customer ${task.accountCode}`
      );
    }

    await prisma.commercialTask.create({
      data: {
        companyId: DEMO_COMPANY_ID,
        customerId: customer.id,
        title: task.title,
        description:
          task.description,
        priority: task.priority,
        type: task.type,
        status: "OPEN",
        dueDate: date(task.dueDate),
      },
    });
  }

  console.log(
    `Created ${taskDefinitions.length} fictional commercial priorities.`
  );

  /*
   * -------------------------------------------------------
   * FINAL VERIFICATION
   * -------------------------------------------------------
   */

  const [
    customerCount,
    productCount,
    invoiceCount,
    invoiceLineCount,
    orderCount,
    quoteCount,
    opportunityCount,
    taskCount,
  ] = await Promise.all([
    prisma.customer.count({
      where: {
        companyId: DEMO_COMPANY_ID,
      },
    }),
    prisma.product.count({
      where: {
        companyId: DEMO_COMPANY_ID,
      },
    }),
    prisma.salesInvoice.count({
      where: {
        companyId: DEMO_COMPANY_ID,
      },
    }),
    prisma.salesInvoiceLine.count({
      where: {
        salesInvoice: {
          companyId:
            DEMO_COMPANY_ID,
        },
      },
    }),
    prisma.salesOrder.count({
      where: {
        companyId: DEMO_COMPANY_ID,
      },
    }),
    prisma.quote.count({
      where: {
        companyId: DEMO_COMPANY_ID,
      },
    }),
    prisma.commercialOpportunity.count({
      where: {
        companyId: DEMO_COMPANY_ID,
      },
    }),
    prisma.commercialTask.count({
      where: {
        companyId: DEMO_COMPANY_ID,
      },
    }),
  ]);

  console.log("");
  console.log(
    "ODIN DEMO SEED COMPLETE"
  );
  console.log(
    "======================="
  );
  console.log(
    `Customers:     ${customerCount}`
  );
  console.log(
    `Products:      ${productCount}`
  );
  console.log(
    `Invoices:      ${invoiceCount}`
  );
  console.log(
    `Invoice lines: ${invoiceLineCount}`
  );
  console.log(
    `Sales orders:  ${orderCount}`
  );
  console.log(
    `Quotes:        ${quoteCount}`
  );
  console.log(
    `Opportunities: ${opportunityCount}`
  );
  console.log(
    `Tasks:         ${taskCount}`
  );
  console.log("");
  console.log(
    "No Hetta Systems data was modified."
  );
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      "DEMO SEED FAILED"
    );
    console.error(
      "================"
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });