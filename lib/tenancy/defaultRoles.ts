export const permissionDefinitions = [
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

export const roleDefinitions = [
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