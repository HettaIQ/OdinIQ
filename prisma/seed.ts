import { prisma } from "../lib/prisma";

const permissionDefinitions = [
  {
    key: "products.view",
    description: "View the product catalogue.",
  },
  {
    key: "products.view_list_price",
    description: "View product list prices.",
  },
  {
    key: "products.view_cost_price",
    description: "View internal cost prices.",
  },
  {
    key: "products.view_margin",
    description: "View product margin information.",
  },
  {
    key: "customers.view_all",
    description: "View all customers belonging to the company.",
  },
  {
    key: "customers.view_own",
    description: "View only customers assigned to the user.",
  },
  {
    key: "quotes.view_all",
    description: "View all company quotations.",
  },
  {
    key: "quotes.view_own",
    description: "View only quotations assigned to or created by the user.",
  },
  {
    key: "quotes.create",
    description: "Create quotations.",
  },
  {
    key: "quotes.upload",
    description: "Upload quotation documents.",
  },
  {
    key: "quotes.approve",
    description: "Approve quotations.",
  },
  {
    key: "sales.view_all",
    description: "View all company sales.",
  },
  {
    key: "sales.view_own",
    description: "View only sales assigned to the user.",
  },
  {
    key: "agreements.view",
    description: "View commercial agreements.",
  },
  {
    key: "agreements.manage",
    description: "Create and edit commercial agreements.",
  },
  {
    key: "rebates.view",
    description: "View rebates and rebate schemes.",
  },
  {
    key: "users.manage",
    description: "Create users and manage company roles.",
  },
  {
  key: "rebates.manage",
  description: "Create and manage rebates and rebate schemes.",
},
{
  key: "credit.view",
  description: "View customer credit limits and credit information.",
},
{
  key: "credit.manage",
  description: "Manage customer credit limits and credit information.",
},
{
  key: "payments.view",
  description: "View customer payment and account information.",
},
{
  key: "reports.finance",
  description: "View commercial finance and accounts reports.",
},
{
  key: "stock.view",
  description: "View product stock levels and availability.",
},
{
  key: "stock.adjust",
  description: "Adjust product stock levels.",
},
{
  key: "stock.receive",
  description: "Record incoming stock and goods received.",
},
{
  key: "stock.dispatch",
  description: "Record stock dispatched to customers.",
},
{
  key: "stock.alerts",
  description: "View low stock and stock availability alerts.",
},
{
  key: "commercial.profitability.view",
  description: "View commercial profitability information.",
},
{
  key: "audit.manage",
  description: "Manage despatch audit investigations.",
},
{
  key: "customers.reassign",
  description: "Reassign customer accounts between team members.",
},
{
  key: "customers.manage",
  description: "Manage customer account details and commercial settings.",
},
{
  key: "tasks.create",
  description: "Create commercial tasks.",
},
{
  key: "tasks.complete",
  description: "Complete commercial tasks.",
},
{
  key: "opportunities.create",
  description: "Create commercial opportunities.",
},
{
  key: "opportunities.manage",
  description: "Manage commercial opportunities.",
},
{
  key: "voice_notes.create",
  description: "Add and analyse customer voice notes.",
},
{
  key: "imports.manage",
  description: "Import company data into OdinIQ.",
},
{
  key: "products.import",
  description: "Import and update company product data.",
},
] as const;

const roleDefinitions = [
  {
    name: "Company Admin",
    description: "Full administrative access within this company.",
    permissionKeys: permissionDefinitions.map(
      (permission) => permission.key
    ),
  },
  {
    name: "Management",
    description:
      "Company-wide commercial access including costs, margins, agreements and quote approvals.",
    permissionKeys: [
      "products.view",
      "products.view_list_price",
      "products.view_cost_price",
      "products.view_margin",
      "commercial.profitability.view",
      "customers.view_all",
      "quotes.view_all",
      "quotes.create",
      "quotes.upload",
      "quotes.approve",
      "sales.view_all",
      "agreements.view",
      "agreements.manage",
      "rebates.view",
      "audit.manage",
"customers.reassign",
"tasks.create",
"tasks.complete",
"opportunities.create",
"opportunities.manage",
"voice_notes.create",
    ],
  },
  {
    name: "Quoting Team",
    description:
      "Can create, upload and view company quotations without company-wide administration.",
    permissionKeys: [
  "products.view",
  "products.view_list_price",
  "customers.view_all",
  "quotes.view_all",
  "quotes.create",
  "quotes.upload",
  "tasks.create",
  "tasks.complete",
  "opportunities.create",
  "opportunities.manage",
  "voice_notes.create",
],
  },
  {
  name: "Sales Agent",
  description:
    "Can view assigned customers, quotations and sales. Cost prices and margins are hidden.",
  permissionKeys: [
    "products.view",
    "products.view_list_price",
    "customers.view_own",
    "quotes.view_own",
    "quotes.create",
    "quotes.upload",
    "sales.view_own",
    "tasks.create",
    "tasks.complete",
    "opportunities.create",
    "opportunities.manage",
    "voice_notes.create",
  ],
},
  {
  name: "Accounts",
  description:
    "Can manage rebates, customer credit information, payments and commercial finance reporting.",
 permissionKeys: [
  "products.view",
  "products.view_list_price",
  "products.view_cost_price",
  "customers.view_all",
  "sales.view_all",
  "agreements.view",
  "rebates.view",
  "rebates.manage",
  "credit.view",
  "credit.manage",
  "payments.view",
  "reports.finance",
  "commercial.profitability.view",
  "audit.manage",
  "customers.manage",
  "customers.reassign",
  "imports.manage",
  "products.import",
  "tasks.create",
  "tasks.complete",
],
},
{
  name: "Warehouse",
  description:
    "Can view and manage stock levels, goods received, dispatches and stock alerts.",
  permissionKeys: [
  "products.view",
  "stock.view",
  "stock.adjust",
  "stock.receive",
  "stock.dispatch",
  "stock.alerts",
],
},

] as const;

async function main() {
  const company = await prisma.company.upsert({
    where: {
      slug: "hetta-systems",
    },
    update: {
      name: "Hetta Systems",
      status: "ACTIVE",
    },
    create: {
      name: "Hetta Systems",
      slug: "hetta-systems",
      status: "ACTIVE",
    },
  });

  const permissionMap = new Map<string, number>();

  for (const definition of permissionDefinitions) {
    const permission = await prisma.permission.upsert({
      where: {
        key: definition.key,
      },
      update: {
        description: definition.description,
      },
      create: {
        key: definition.key,
        description: definition.description,
      },
    });

    permissionMap.set(permission.key, permission.id);
  }

  const roleMap = new Map<string, number>();

  for (const definition of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: {
        companyId_name: {
          companyId: company.id,
          name: definition.name,
        },
      },
      update: {
        description: definition.description,
        isSystem: true,
      },
      create: {
        companyId: company.id,
        name: definition.name,
        description: definition.description,
        isSystem: true,
      },
    });

    roleMap.set(role.name, role.id);

    await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
      },
    });

    const permissionRows = definition.permissionKeys.map(
      (permissionKey) => {
        const permissionId = permissionMap.get(permissionKey);

        if (!permissionId) {
          throw new Error(
            `Permission "${permissionKey}" could not be found.`
          );
        }

        return {
          roleId: role.id,
          permissionId,
        };
      }
    );

    await prisma.rolePermission.createMany({
      data: permissionRows,
    });
  }

  const user = await prisma.user.upsert({
    where: {
      email: "jamie@odiniq.co.uk",
    },
    update: {
      name: "Jamie",
      platformRole: "SUPER_ADMIN",
      active: true,
    },
    create: {
      name: "Jamie",
      email: "jamie@odiniq.co.uk",
      platformRole: "SUPER_ADMIN",
      active: true,
    },
  });

  const companyAdminRoleId = roleMap.get("Company Admin");

  if (!companyAdminRoleId) {
    throw new Error("The Company Admin role could not be created.");
  }

  const membership = await prisma.companyMembership.upsert({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId: company.id,
      },
    },
    update: {
      roleId: companyAdminRoleId,
      active: true,
    },
    create: {
      userId: user.id,
      companyId: company.id,
      roleId: companyAdminRoleId,
      active: true,
    },
  });
  const customerDefinitions = [
  {
    accountCode: "MKM-WARR",
    name: "MKM Warrington",
    buyingGroup: "MKM",
    customerType: "Merchant",
    town: "Warrington",
    postcode: "WA1",
    paymentTerms: "30 days",
    creditLimit: 50000,
    currentBalance: 18450,
    status: "ACTIVE",
  },
  {
    accountCode: "HUWS-GRAY",
    name: "Huws Gray",
    buyingGroup: "Huws Gray",
    customerType: "Merchant",
    town: "National",
    paymentTerms: "30 days",
    creditLimit: 75000,
    currentBalance: 32150,
    status: "ACTIVE",
  },
  {
    accountCode: "JT-PLUMB",
    name: "JT Plumbing & Renewables",
    customerType: "Independent Merchant",
    paymentTerms: "30 days",
    creditLimit: 15000,
    currentBalance: 4275,
    status: "ACTIVE",
  },
  {
    accountCode: "NEWARK-PH",
    name: "Newark Plumbing & Heating",
    customerType: "Independent Merchant",
    town: "Newark",
    paymentTerms: "30 days",
    creditLimit: 5000,
    currentBalance: 4150,
    status: "ACTIVE",
  },
  {
    accountCode: "CITY-PLUMB",
    name: "City Plumbing",
    customerType: "National Merchant",
    buyingGroup: "Highbourne Group",
    paymentTerms: "30 days",
    creditLimit: 100000,
    currentBalance: 28750,
    status: "ACTIVE",
  },
  {
    accountCode: "GRANT-STONE",
    name: "Grant & Stone",
    customerType: "Merchant",
    paymentTerms: "30 days",
    creditLimit: 30000,
    currentBalance: 9650,
    status: "ACTIVE",
  },
  {
    accountCode: "PLUMBCITY",
    name: "Plumbcity Stevenage",
    customerType: "Merchant",
    town: "Stevenage",
    paymentTerms: "30 days",
    creditLimit: 20000,
    currentBalance: 7850,
    status: "ACTIVE",
  },
  {
    accountCode: "BPS",
    name: "BPS",
    customerType: "Independent Merchant",
    paymentTerms: "30 days",
    creditLimit: 25000,
    currentBalance: 6320,
    status: "ACTIVE",
  },
];

for (const customerDefinition of customerDefinitions) {
  await prisma.customer.upsert({
    where: {
      companyId_accountCode: {
        companyId: company.id,
        accountCode: customerDefinition.accountCode,
      },
    },
    update: {
      ...customerDefinition,
    },
    create: {
      companyId: company.id,
      ...customerDefinition,
    },
  });
}
const mkMCustomer = await prisma.customer.findUnique({
  where: {
    companyId_accountCode: {
      companyId: company.id,
      accountCode: "MKM-WARR",
    },
  },
});

const newarkCustomer = await prisma.customer.findUnique({
  where: {
    companyId_accountCode: {
      companyId: company.id,
      accountCode: "NEWARK-PH",
    },
  },
});

if (mkMCustomer) {
  await prisma.customerTimelineEntry.deleteMany({
    where: {
      customerId: mkMCustomer.id,
    },
  });

  await prisma.customerTimelineEntry.createMany({
    data: [
      {
        customerId: mkMCustomer.id,
        type: "QUOTE",
        title: "Quote created",
        description: "Underfloor heating quotation prepared for branch review.",
        value: 12840,
        reference: "Q-10452",
        createdBy: "Jamie",
      },
      {
        customerId: mkMCustomer.id,
        type: "CALL",
        title: "Commercial call completed",
        description: "Discussed manifold pricing and current branch demand.",
        createdBy: "Jamie",
      },
      {
        customerId: mkMCustomer.id,
        type: "AGREEMENT",
        title: "Commercial agreement reviewed",
        description: "Reviewed current pricing and rebate structure.",
        reference: "2026 Price Agreement",
        createdBy: "Jamie",
      },
    ],
  });
}

if (newarkCustomer) {
  await prisma.customerTimelineEntry.deleteMany({
    where: {
      customerId: newarkCustomer.id,
    },
  });

  await prisma.customerTimelineEntry.create({
    data: {
      customerId: newarkCustomer.id,
      type: "CREDIT",
      title: "Credit exposure warning",
      description: "Current balance is approaching the agreed credit limit.",
      value: newarkCustomer.currentBalance ?? undefined,
      createdBy: "Odin",
    },
  });
}
const commercialTaskDefinitions = [
  {
    customerAccountCode: "MKM-WARR",
    title: "Follow up quote Q-10452",
    description:
      "Contact MKM Warrington regarding the recent underfloor heating quotation.",
    type: "QUOTE_FOLLOW_UP",
    priority: "HIGH",
    status: "OPEN",
    dueDate: new Date("2026-08-10T12:00:00"),
  },
  {
    customerAccountCode: "MKM-WARR",
    title: "Review manifold opportunity",
    description:
      "Review current manifold demand and identify the next commercial opportunity.",
    type: "SALES_OPPORTUNITY",
    priority: "MEDIUM",
status: "OPEN",
    dueDate: new Date("2026-08-10T12:00:00"),
  },
  {
    customerAccountCode: "NEWARK-PH",
    title: "Review credit position",
    description:
      "Customer balance is close to the current credit limit. Review before further exposure.",
    type: "CREDIT_REVIEW",
    priority: "HIGH",
    status: "OPEN",
    dueDate: new Date("2026-08-10T12:00:00"),
  },
];

const taskMembership = await prisma.companyMembership.findUnique({
  where: {
    userId_companyId: {
      userId: user.id,
      companyId: company.id,
    },
  },
});

for (const taskDefinition of commercialTaskDefinitions) {
  const customer = await prisma.customer.findFirst({
    where: {
      companyId: company.id,
      accountCode: taskDefinition.customerAccountCode,
    },
  });

  if (!customer) {
    continue;
  }

  const existingTask = await prisma.commercialTask.findFirst({
    where: {
      companyId: company.id,
      customerId: customer.id,
      title: taskDefinition.title,
    },
  });

  if (existingTask) {
  await prisma.commercialTask.update({
    where: {
      id: existingTask.id,
    },
    data: {
      description: taskDefinition.description,
      type: taskDefinition.type,
      priority: taskDefinition.priority,
      status: taskDefinition.status,
      dueDate: taskDefinition.dueDate,
      assignedMembershipId: taskMembership?.id,
    },
  });
} else {
  await prisma.commercialTask.create({
    data: {
      companyId: company.id,
      customerId: customer.id,
      assignedMembershipId: taskMembership?.id,
      title: taskDefinition.title,
      description: taskDefinition.description,
      type: taskDefinition.type,
      priority: taskDefinition.priority,
      status: taskDefinition.status,
      dueDate: taskDefinition.dueDate,
    },
    });
  }
}

console.log(
  "Commercial tasks created:",
  commercialTaskDefinitions.length
);

console.log("Customer timeline entries created.");
console.log("Customers created:", customerDefinitions.length);

  console.log("Company ready:", company.name);
  console.log("Permissions created:", permissionDefinitions.length);
  console.log("Roles created:", roleDefinitions.length);
  console.log("Super Admin ready:", user.email);
}



main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });