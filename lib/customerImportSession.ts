type CustomerImportRow = Record<string, unknown>;

export type CustomerImportAllocation = {
  accountCode: string;
  membershipId: number;
  agentName: string;
  effectiveFrom: string;
};

type CustomerImportSession = {
  companyId: number;
  rows: CustomerImportRow[];
  allocations: Map<string, CustomerImportAllocation>;
  updatedAt: number;
};

const globalForCustomerImport = globalThis as unknown as {
  customerImportSessions?: Map<number, CustomerImportSession>;
};

const customerImportSessions =
  globalForCustomerImport.customerImportSessions ??
  new Map<number, CustomerImportSession>();

if (!globalForCustomerImport.customerImportSessions) {
  globalForCustomerImport.customerImportSessions = customerImportSessions;
}

export function saveCustomerImportSession(
  companyId: number,
  rows: CustomerImportRow[]
) {
  const existingSession = customerImportSessions.get(companyId);

  customerImportSessions.set(companyId, {
    companyId,
    rows,
    allocations: existingSession?.allocations ?? new Map(),
    updatedAt: Date.now(),
  });
}

export function getCustomerImportSession(companyId: number) {
  return customerImportSessions.get(companyId) ?? null;
}

export function saveCustomerImportAllocations(
  companyId: number,
  allocations: CustomerImportAllocation[]
) {
  const session = customerImportSessions.get(companyId);

  if (!session) {
    throw new Error("Customer import session not found.");
  }

  if (!session.allocations) {
    session.allocations = new Map();
  }

  for (const allocation of allocations) {
    session.allocations.set(
      allocation.accountCode.trim().toUpperCase(),
      allocation
    );
  }

  session.updatedAt = Date.now();
}

export function getCustomerImportAllocation(
  companyId: number,
  accountCode: string
) {
  const session = customerImportSessions.get(companyId);

  if (!session || !session.allocations) {
    return null;
  }

  return (
    session.allocations.get(accountCode.trim().toUpperCase()) ?? null
  );
}

export function clearCustomerImportSession(companyId: number) {
  customerImportSessions.delete(companyId);
}