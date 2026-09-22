import { prisma } from "../lib/prisma";
import {
  permissionDefinitions,
  roleDefinitions,
} from "../lib/tenancy/defaultRoles";

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