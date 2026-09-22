import Link from "next/link";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

function normalizeCustomerName(
  value: string | null | undefined
) {
  return String(value ?? "")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
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

/*
 * Credits reduce sales.
 *
 * Sage normally imports credit-note values
 * as negative numbers.
 *
 * Math.abs is used here defensively so that
 * a credit can never accidentally increase
 * customer sales if a Sage report supplies
 * a positive credit value.
 */
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

function formatDate(
  value: Date | null | undefined
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
  }).format(value);
}

export default async function CustomerPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
  }>;
}) {
  const { q = "" } = await searchParams;

  const customerSearch = q
    .trim()
    .toLowerCase();

  const {
    membership,
    companyId,
  } = await requireCompanyContext();

  const isAgent =
    membership.role?.name === "Agent" ||
    membership.role?.name ===
      "Sales Agent";

  /*
   * These three queries are independent,
   * so run them together rather than
   * waiting for each one sequentially.
   */
  const [
    customers,
    invoices,
    salesOrders,
  ] = await Promise.all([
    prisma.customer.findMany({
      where: {
        companyId,
        ...(isAgent
          ? {
              assignedMembershipId:
                membership.id,
            }
          : {}),
      },

      include: {
        aliases: true,
      },

      orderBy: {
        name: "asc",
      },
    }),

    prisma.salesInvoice.findMany({
      where: {
        companyId,
      },

      orderBy: {
        invoiceDate: "desc",
      },
    }),

    prisma.salesOrder.findMany({
      where: {
        companyId,
      },

      select: {
        salesOrderNumber: true,
        orderValue: true,
      },
    }),
  ]);

  /*
   * Index invoices once.
   *
   * The old page scanned every invoice
   * for every customer.
   *
   * With hundreds of customers and
   * thousands of invoices that creates
   * unnecessary work.
   */
  const invoicesByAccount =
    new Map<
      string,
      (typeof invoices)[number][]
    >();

  const invoicesByCustomerName =
    new Map<
      string,
      (typeof invoices)[number][]
    >();

  for (const invoice of invoices) {
    const accountCode =
      invoice.customerAccountCode?.trim();

    if (accountCode) {
      const existing =
        invoicesByAccount.get(
          accountCode
        ) ?? [];

      existing.push(invoice);

      invoicesByAccount.set(
        accountCode,
        existing
      );
    } else {
      const customerName =
        normalizeCustomerName(
          invoice.customerName
        );

      if (customerName) {
        const existing =
          invoicesByCustomerName.get(
            customerName
          ) ?? [];

        existing.push(invoice);

        invoicesByCustomerName.set(
          customerName,
          existing
        );
      }
    }
  }

  /*
   * Index Sales Orders once as well.
   */
  const salesOrderByNumber =
    new Map(
      salesOrders.map((order) => [
        order.salesOrderNumber,
        order,
      ])
    );

  const today = new Date();

  const currentYear =
    today.getFullYear();

  const previousYear =
    currentYear - 1;

  const previousPeriodEnd =
    new Date(
      previousYear,
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999
    );

  function netSalesForPeriod(
    customerInvoices: (typeof invoices)[number][],
    year: number,
    periodEnd: Date
  ) {
    return customerInvoices.reduce(
      (total, invoice) => {
        if (!invoice.invoiceDate) {
          return total;
        }

        const invoiceDate =
          new Date(
            invoice.invoiceDate
          );

        if (
          invoiceDate.getFullYear() !==
          year
        ) {
          return total;
        }

        if (
          invoiceDate > periodEnd
        ) {
          return total;
        }

        return (
          total +
          commercialNetValue(invoice)
        );
      },
      0
    );
  }

  const customerPerformance =
    customers.map((customer) => {
      const accountCodes = [
        customer.accountCode,
        ...customer.aliases.map(
          (alias) =>
            alias.accountCode
        ),
      ];

      /*
       * Use a Map keyed by invoice ID so
       * aliases cannot accidentally cause
       * the same invoice to be counted twice.
       */
      const matchedInvoices =
        new Map<
          number,
          (typeof invoices)[number]
        >();

      for (
        const accountCode of accountCodes
      ) {
        const accountInvoices =
          invoicesByAccount.get(
            accountCode
          ) ?? [];

        for (
          const invoice of accountInvoices
        ) {
          matchedInvoices.set(
            invoice.id,
            invoice
          );
        }
      }

      /*
       * Sage sometimes supplies no account
       * reference. In that case fall back
       * to a normalised customer-name match.
       */
      const nameInvoices =
        invoicesByCustomerName.get(
          normalizeCustomerName(
            customer.name
          )
        ) ?? [];

      for (
        const invoice of nameInvoices
      ) {
        matchedInvoices.set(
          invoice.id,
          invoice
        );
      }

      const customerInvoices =
        Array.from(
          matchedInvoices.values()
        );

      const salesInvoices =
        customerInvoices.filter(
          isSalesInvoice
        );

      const creditNotes =
        customerInvoices.filter(
          isCreditNote
        );

      const cancelledInvoices =
        customerInvoices.filter(
          isCancelledInvoice
        );

      /*
       * Get unique cancelled Sales Orders.
       */
      const cancelledSalesOrderNumbers =
        new Set(
          cancelledInvoices
            .map(
              (invoice) =>
                invoice.salesOrderNumber
            )
            .filter(
              (
                value
              ): value is string =>
                Boolean(value)
            )
        );

      const cancelledOrders =
        Array.from(
          cancelledSalesOrderNumbers
        )
          .map((salesOrderNumber) =>
            salesOrderByNumber.get(
              salesOrderNumber
            )
          )
          .filter(
            (
              order
            ): order is NonNullable<
              typeof order
            > => Boolean(order)
          );

      const cancelledValue =
        cancelledOrders.reduce(
          (sum, order) =>
            sum +
            Number(
              order.orderValue ?? 0
            ),
          0
        );

      /*
       * True commercial net sales:
       *
       * invoices increase sales
       * credits reduce sales
       * cancellations contribute £0
       */
      const netSales =
        customerInvoices.reduce(
          (sum, invoice) =>
            sum +
            commercialNetValue(
              invoice
            ),
          0
        );

      /*
       * "Last Invoice" should refer to an
       * actual sales invoice, rather than
       * a subsequent credit note.
       *
       * invoices were loaded newest first,
       * so the first dated sales invoice is
       * the latest one.
       */
      const lastInvoice =
        salesInvoices.find(
          (invoice) =>
            invoice.invoiceDate
        );

      const lastInvoiceDate =
        lastInvoice?.invoiceDate ??
        customer.lastInvoiceDate;

      const currentYearSales =
        netSalesForPeriod(
          customerInvoices,
          currentYear,
          today
        );

      const previousYearSales =
        netSalesForPeriod(
          customerInvoices,
          previousYear,
          previousPeriodEnd
        );

      const salesMovement =
        previousYearSales !== 0
          ? ((currentYearSales -
              previousYearSales) /
              previousYearSales) *
            100
          : null;

      return {
        id: customer.id,
        accountCode:
          customer.accountCode,
        name: customer.name,
        buyingGroup:
          customer.buyingGroup,
        status: customer.status,
        accountOnHold:
          customer.accountOnHold,

        invoiceCount:
          salesInvoices.length,

        creditCount:
          creditNotes.length,

        cancelledCount:
          cancelledOrders.length,

        cancelledValue,

        netSales,

        lastInvoiceDate,

        currentYearSales,

        previousYearSales,

        salesMovement,
      };
    });

  /*
   * Alias accounts should not appear as
   * separate customers in the ranking.
   */
  const aliasAccountCodes =
    new Set(
      customers.flatMap(
        (customer) =>
          customer.aliases.map(
            (alias) =>
              alias.accountCode
          )
      )
    );

  const visibleCustomerPerformance =
    customerPerformance.filter(
      (customer) =>
        !aliasAccountCodes.has(
          customer.accountCode
        )
    );

  const rankedCustomers = [
    ...visibleCustomerPerformance,
  ].sort(
    (a, b) =>
      b.netSales -
      a.netSales
  );

  const searchedCustomers =
    customerSearch
      ? rankedCustomers.filter(
          (customer) => {
            const name =
              customer.name.toLowerCase();

            const accountCode =
              customer.accountCode.toLowerCase();

            const buyingGroup =
              (
                customer.buyingGroup ??
                ""
              ).toLowerCase();

            return (
              name.includes(
                customerSearch
              ) ||
              accountCode.includes(
                customerSearch
              ) ||
              buyingGroup.includes(
                customerSearch
              )
            );
          }
        )
      : rankedCustomers;

  const customersRequiringAttention =
    rankedCustomers
      .filter(
        (customer) =>
          customer.salesMovement !==
            null &&
          customer.salesMovement <=
            -10 &&
          customer.currentYearSales >
            0
      )
      .sort((a, b) => {
        const aGap =
          a.currentYearSales -
          a.previousYearSales;

        const bGap =
          b.currentYearSales -
          b.previousYearSales;

        return aGap - bGap;
      })
      .slice(0, 10);

  const customersGrowingStrongly =
    rankedCustomers
      .filter(
        (customer) =>
          customer.salesMovement !==
            null &&
          customer.salesMovement >=
            10 &&
          customer.currentYearSales >
            0
      )
      .sort((a, b) => {
        const aGrowth =
          a.currentYearSales -
          a.previousYearSales;

        const bGrowth =
          b.currentYearSales -
          b.previousYearSales;

        return bGrowth - aGrowth;
      })
      .slice(0, 10);

  const totalNetSales =
    rankedCustomers.reduce(
      (sum, customer) =>
        sum +
        customer.netSales,
      0
    );

  const customersOnHold =
    rankedCustomers.filter(
      (customer) =>
        customer.accountOnHold
    );

  return (
    <main className="space-y-6">
      <div>
        <Link
          href="/commercial"
          className="text-sm font-semibold text-amber-600 hover:text-amber-700"
        >
          ← Back to Commercial
        </Link>

        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-amber-600">
          Commercial Intelligence
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Customer Performance
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Review customer sales activity, account status and commercial
          performance using the data currently held in OdinIQ.
        </p>
      </div>

      <div
        className={`grid gap-4 ${
          isAgent
            ? "md:grid-cols-2"
            : "md:grid-cols-3"
        }`}
      >
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Customers
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-950">
            {rankedCustomers.length}
          </p>
        </div>

        {!isAgent && (
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Net Sales Imported
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-950">
              {totalNetSales.toLocaleString(
                "en-GB",
                {
                  style: "currency",
                  currency: "GBP",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Invoices less credits. Cancelled orders excluded.
            </p>
          </div>
        )}

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Accounts on Hold
          </p>

          <p className="mt-2 text-3xl font-bold text-red-700">
            {customersOnHold.length}
          </p>
        </div>
      </div>

      {customersRequiringAttention.length >
        0 && (
        <section className="rounded-xl border border-red-200 bg-white shadow-sm">
          <div className="border-b border-red-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-950">
              Customers Requiring Attention
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Customers currently down at least 10% against the same period last year,
              ranked by the largest sales shortfall.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-red-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">
                    Customer
                  </th>

                  <th className="px-5 py-3">
                    This Year YTD
                  </th>

                  <th className="px-5 py-3">
                    Last Year YTD
                  </th>

                  <th className="px-5 py-3">
                    Change
                  </th>

                  <th className="px-5 py-3">
                    Sales Gap
                  </th>
                </tr>
              </thead>

              <tbody>
                {customersRequiringAttention.map(
                  (customer) => {
                    const salesGap =
                      customer.currentYearSales -
                      customer.previousYearSales;

                    return (
                      <tr
                        key={
                          customer.id
                        }
                        className="border-t border-red-100"
                      >
                        <td className="px-5 py-4 font-semibold text-slate-950">
                          <Link
                            href={`/commercial/customers/${customer.id}`}
                            className="hover:text-amber-600 hover:underline"
                          >
                            {
                              customer.name
                            }
                          </Link>
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {customer.currentYearSales.toLocaleString(
                            "en-GB",
                            {
                              style:
                                "currency",
                              currency:
                                "GBP",
                            }
                          )}
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {customer.previousYearSales.toLocaleString(
                            "en-GB",
                            {
                              style:
                                "currency",
                              currency:
                                "GBP",
                            }
                          )}
                        </td>

                        <td className="px-5 py-4 font-semibold text-red-700">
                          {customer.salesMovement?.toFixed(
                            1
                          )}
                          %
                        </td>

                        <td className="px-5 py-4 font-semibold text-red-700">
                          {salesGap.toLocaleString(
                            "en-GB",
                            {
                              style:
                                "currency",
                              currency:
                                "GBP",
                            }
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {customersGrowingStrongly.length >
        0 && (
        <section className="rounded-xl border border-emerald-200 bg-white shadow-sm">
          <div className="border-b border-emerald-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-950">
              Customers Growing Strongly
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Customers currently up at least 10% against the same period last year,
              ranked by the largest sales increase.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">
                    Customer
                  </th>

                  <th className="px-5 py-3">
                    This Year YTD
                  </th>

                  <th className="px-5 py-3">
                    Last Year YTD
                  </th>

                  <th className="px-5 py-3">
                    Change
                  </th>

                  <th className="px-5 py-3">
                    Sales Growth
                  </th>
                </tr>
              </thead>

              <tbody>
                {customersGrowingStrongly.map(
                  (customer) => {
                    const salesGrowth =
                      customer.currentYearSales -
                      customer.previousYearSales;

                    return (
                      <tr
                        key={
                          customer.id
                        }
                        className="border-t border-emerald-100"
                      >
                        <td className="px-5 py-4 font-semibold text-slate-950">
                          <Link
                            href={`/commercial/customers/${customer.id}`}
                            className="hover:text-amber-600 hover:underline"
                          >
                            {
                              customer.name
                            }
                          </Link>
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {customer.currentYearSales.toLocaleString(
                            "en-GB",
                            {
                              style:
                                "currency",
                              currency:
                                "GBP",
                            }
                          )}
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {customer.previousYearSales.toLocaleString(
                            "en-GB",
                            {
                              style:
                                "currency",
                              currency:
                                "GBP",
                            }
                          )}
                        </td>

                        <td className="px-5 py-4 font-semibold text-emerald-700">
                          +
                          {customer.salesMovement?.toFixed(
                            1
                          )}
                          %
                        </td>

                        <td className="px-5 py-4 font-semibold text-emerald-700">
                          +
                          {salesGrowth.toLocaleString(
                            "en-GB",
                            {
                              style:
                                "currency",
                              currency:
                                "GBP",
                            }
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Customer ranking
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Ranked by true net sales from imported invoice and credit-note data.
                Cancelled orders are excluded.
              </p>
            </div>

            <form
              method="GET"
              className="flex w-full max-w-md gap-2"
            >
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search customer or account..."
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500"
              />

              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Search
              </button>

              {customerSearch && (
                <Link
                  href="/commercial/customers"
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Clear
                </Link>
              )}
            </form>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">
                  Customer
                </th>

                <th className="px-5 py-3">
                  Account
                </th>

                <th className="px-5 py-3">
                  Buying Group
                </th>

                <th className="px-5 py-3">
                  Net Sales
                </th>

                <th className="px-5 py-3">
                  YTD Change
                </th>

                <th className="px-5 py-3">
                  Invoices
                </th>

                <th className="px-5 py-3">
                  Credits
                </th>

                <th className="px-5 py-3">
                  Cancelled Orders
                </th>

                <th className="px-5 py-3">
                  Cancelled Value
                </th>

                <th className="px-5 py-3">
                  Last Invoice
                </th>

                <th className="px-5 py-3">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {searchedCustomers.map(
                (customer) => (
                  <tr
                    key={customer.id}
                    className="border-t"
                  >
                    <td className="px-5 py-4 font-semibold text-slate-950">
                      <Link
                        href={`/commercial/customers/${customer.id}`}
                        className="hover:text-amber-600 hover:underline"
                      >
                        {customer.name}
                      </Link>
                    </td>

                    <td className="px-5 py-4">
                      {
                        customer.accountCode
                      }
                    </td>

                    <td className="px-5 py-4">
                      {customer.buyingGroup ? (
                        <Link
                          href={`/commercial/buying-groups/${encodeURIComponent(
                            customer.buyingGroup
                          )}`}
                          className="font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                        >
                          {
                            customer.buyingGroup
                          }
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {customer.netSales.toLocaleString(
                        "en-GB",
                        {
                          style:
                            "currency",
                          currency:
                            "GBP",
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {customer.salesMovement ===
                      null ? (
                        <span className="text-slate-400">
                          —
                        </span>
                      ) : (
                        <div
                          className={
                            customer.salesMovement <
                            0
                              ? "text-red-700"
                              : customer.salesMovement >
                                0
                              ? "text-emerald-700"
                              : "text-slate-600"
                          }
                        >
                          <div>
                            {customer.salesMovement >
                            0
                              ? "+"
                              : ""}
                            {customer.salesMovement.toFixed(
                              1
                            )}
                            %
                          </div>

                          <div className="mt-1 text-xs">
                            {customer.currentYearSales -
                              customer.previousYearSales >
                            0
                              ? "+"
                              : ""}

                            {(
                              customer.currentYearSales -
                              customer.previousYearSales
                            ).toLocaleString(
                              "en-GB",
                              {
                                style:
                                  "currency",
                                currency:
                                  "GBP",
                              }
                            )}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {
                        customer.invoiceCount
                      }
                    </td>

                    <td className="px-5 py-4 font-semibold text-red-700">
                      {
                        customer.creditCount
                      }
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {
                        customer.cancelledCount
                      }
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {customer.cancelledValue.toLocaleString(
                        "en-GB",
                        {
                          style:
                            "currency",
                          currency:
                            "GBP",
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {formatDate(
                        customer.lastInvoiceDate
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {customer.accountOnHold ? (
                        <span className="font-semibold text-red-700">
                          ON HOLD
                        </span>
                      ) : (
                        <span className="font-semibold text-emerald-700">
                          {
                            customer.status
                          }
                        </span>
                      )}
                    </td>
                  </tr>
                )
              )}

              {searchedCustomers.length ===
                0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-5 py-8 text-center text-sm text-slate-500"
                  >
                    {customerSearch
                      ? `No customers found matching "${q}".`
                      : "No customer data has been imported yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

