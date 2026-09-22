import { NextResponse } from "next/server";

import { getApiCompanyContext } from "@/lib/auth/getApiCompanyContext";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const companyContext =
      await getApiCompanyContext();

    if (
      companyContext.status ===
      "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        {
          error:
            "You must be signed in.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      companyContext.status ===
      "NO_COMPANY"
    ) {
      return NextResponse.json(
        {
          error:
            "No active company membership found.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      companyId,
    } = companyContext;

    /*
     * Find the latest Sales Order import batch first.
     * The audit only checks Sales Orders from that latest import.
     */
    const latestSalesOrderBatch =
      await prisma.salesOrder.aggregate({
        where: {
          companyId,
        },
        _max: {
          importedAt: true,
        },
      });

    const latestImportedAt =
      latestSalesOrderBatch._max.importedAt;

    /*
     * Load the remaining audit data in parallel.
     * Only select fields actually required by this page.
     */
    const [
      salesOrders,
      gdns,
      invoices,
      customers,
      latestGdnBatch,
      latestInvoiceBatch,
    ] = await Promise.all([
      latestImportedAt
        ? prisma.salesOrder.findMany({
            where: {
              companyId,
              importedAt:
                latestImportedAt,
            },
            select: {
              salesOrderNumber:
                true,
              orderDate: true,
              customerAccountCode:
                true,
              customerName: true,
              orderValue: true,
              investigationStatus:
                true,
              investigationNote:
                true,
              investigatedBy:
                true,
              investigatedAt:
                true,
            },
            orderBy: {
              orderDate: "desc",
            },
          })
        : Promise.resolve([]),

      prisma.goodsDespatchNote.findMany({
        where: {
          companyId,
        },
        select: {
          gdnNumber: true,
          salesOrderNumber: true,
        },
      }),

      prisma.salesInvoice.findMany({
        where: {
          companyId,
        },
        select: {
          invoiceNumber: true,
          invoiceType: true,
          salesOrderNumber: true,
          customerOrderNumber:
            true,
          customerAccountCode:
            true,
        },
      }),

      prisma.customer.findMany({
        where: {
          companyId,
        },
        select: {
          accountCode: true,
          name: true,
        },
      }),

      prisma.goodsDespatchNote.aggregate({
        where: {
          companyId,
        },
        _max: {
          importedAt: true,
        },
      }),

      prisma.salesInvoice.aggregate({
        where: {
          companyId,
        },
        _max: {
          importedAt: true,
        },
      }),
    ]);

    /*
     * Build lookup maps ONCE.
     *
     * This replaces repeatedly scanning every GDN and invoice
     * for every Sales Order.
     */
    const gdnsBySalesOrder =
      new Map<
        string,
        string[]
      >();

    for (const gdn of gdns) {
      const salesOrderNumber =
        gdn.salesOrderNumber?.trim();

      if (!salesOrderNumber) {
        continue;
      }

      const existing =
        gdnsBySalesOrder.get(
          salesOrderNumber
        ) ?? [];

      existing.push(
        gdn.gdnNumber
      );

      gdnsBySalesOrder.set(
        salesOrderNumber,
        existing
      );
    }

    type InvoiceMatch = {
      invoiceNumber: string;
      customerAccountCode:
        string | null;
    };

    const invoicesBySalesOrder =
      new Map<
        string,
        InvoiceMatch[]
      >();

    const cancelledSalesOrders =
      new Set<string>();

    for (
      const invoice of invoices
    ) {
      const salesOrderNumber =
        invoice.salesOrderNumber?.trim();

      if (!salesOrderNumber) {
        continue;
      }

      const isCancelled =
        String(
          invoice.customerOrderNumber ??
            ""
        )
          .trim()
          .toLowerCase() ===
        "cancelled";

      if (isCancelled) {
        cancelledSalesOrders.add(
          salesOrderNumber
        );
      }

      const invoiceType =
        String(
          invoice.invoiceType ?? ""
        )
          .trim()
          .toUpperCase();

      const isNormalInvoice =
        !invoiceType ||
        invoiceType === "INV";

      if (!isNormalInvoice) {
        continue;
      }

      const existing =
        invoicesBySalesOrder.get(
          salesOrderNumber
        ) ?? [];

      existing.push({
        invoiceNumber:
          invoice.invoiceNumber,
        customerAccountCode:
          invoice.customerAccountCode,
      });

      invoicesBySalesOrder.set(
        salesOrderNumber,
        existing
      );
    }

    const customerByName =
      new Map(
        customers.map(
          (customer) => [
            customer.name
              .trim()
              .toLowerCase(),
            customer.accountCode,
          ]
        )
      );

    /*
     * Each Sales Order can now be resolved using constant-time
     * Map/Set lookups rather than repeatedly filtering huge arrays.
     */
    const results =
      salesOrders.map(
        (salesOrder) => {
          const matchingGdnNumbers =
            gdnsBySalesOrder.get(
              salesOrder.salesOrderNumber
            ) ?? [];

          const matchingInvoices =
            invoicesBySalesOrder.get(
              salesOrder.salesOrderNumber
            ) ?? [];

          let status:
            | "NOT_DESPATCHED"
            | "DESPATCHED_NOT_INVOICED"
            | "INVOICED"
            | "CANCELLED";

          if (
            cancelledSalesOrders.has(
              salesOrder.salesOrderNumber
            )
          ) {
            status =
              "CANCELLED";
          } else if (
            matchingGdnNumbers.length ===
            0
          ) {
            status =
              "NOT_DESPATCHED";
          } else if (
            matchingInvoices.length ===
            0
          ) {
            status =
              "DESPATCHED_NOT_INVOICED";
          } else {
            status =
              "INVOICED";
          }

          const resolvedCustomerAccountCode =
            salesOrder.customerAccountCode ??
            matchingInvoices.find(
              (invoice) =>
                invoice.customerAccountCode
            )
              ?.customerAccountCode ??
            (salesOrder.customerName
              ? customerByName.get(
                  salesOrder.customerName
                    .trim()
                    .toLowerCase()
                ) ?? null
              : null);

          return {
            salesOrderNumber:
              salesOrder.salesOrderNumber,

            orderDate:
              salesOrder.orderDate,

            customerAccountCode:
              resolvedCustomerAccountCode,

            customerName:
              salesOrder.customerName,

            orderValue:
              salesOrder.orderValue,

            investigationStatus:
              salesOrder.investigationStatus,

            investigationNote:
              salesOrder.investigationNote,

            investigatedBy:
              salesOrder.investigatedBy,

            investigatedAt:
              salesOrder.investigatedAt,

            gdnFound:
              matchingGdnNumbers.length >
              0,

            gdnNumbers:
              matchingGdnNumbers,

            invoiceFound:
              matchingInvoices.length >
              0,

            invoiceNumbers:
              matchingInvoices.map(
                (invoice) =>
                  invoice.invoiceNumber
              ),

            status,
          };
        }
      );

    return NextResponse.json({
      success: true,
      totalOrders:
        results.length,

      latestSalesOrderImport:
        latestImportedAt,

      latestGdnImport:
        latestGdnBatch._max
          .importedAt,

      latestInvoiceImport:
        latestInvoiceBatch._max
          .importedAt,

      results,
    });
  } catch (error) {
    console.error(
      "Despatch audit failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "OdinIQ could not run the despatch audit.",
      },
      {
        status: 500,
      }
    );
  }
}