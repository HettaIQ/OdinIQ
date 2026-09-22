import { NextResponse } from "next/server";

import { getApiCompanyContext } from "@/lib/auth/getApiCompanyContext";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
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

    const { searchParams } =
      new URL(request.url);

    const gdnNumber =
      searchParams.get(
        "gdnNumber"
      );

    const salesOrderNumber =
      searchParams.get(
        "salesOrderNumber"
      );

    if (
      !gdnNumber &&
      !salesOrderNumber
    ) {
      return NextResponse.json(
        {
          error:
            "A GDN number or Sales Order number is required.",
        },
        {
          status: 400,
        }
      );
    }

    let gdn;

    if (salesOrderNumber) {
      const salesOrder =
        await prisma.salesOrder.findFirst({
          where: {
            companyId,
            salesOrderNumber,
          },
        });

      if (!salesOrder) {
        return NextResponse.json(
          {
            error:
              `Sales Order ${salesOrderNumber} was not found.`,
          },
          {
            status: 404,
          }
        );
      }

      gdn =
        await prisma.goodsDespatchNote.findFirst({
          where: {
            companyId,
            salesOrderNumber,
          },
          include: {
            lines: true,
          },
        });

      if (!gdn) {
        const invoices =
          await prisma.salesInvoice.findMany({
            where: {
              companyId,
              salesOrderNumber,
            },
          });

        return NextResponse.json({
          salesOrderNumber:
            salesOrder.salesOrderNumber,

          customerAccountCode:
            salesOrder.customerAccountCode,

          customerName:
            salesOrder.customerName,

          orderValue:
            salesOrder.orderValue,

          status:
            "NOT_DESPATCHED",

          gdnFound: false,

          invoiceFound:
            invoices.length > 0,

          warning:
            "Sales Order exists but no Goods Despatch Note was found.",
        });
      }
    } else {
      gdn =
        await prisma.goodsDespatchNote.findFirst({
          where: {
            companyId,
            gdnNumber:
              gdnNumber!,
          },
          include: {
            lines: true,
          },
        });

      if (!gdn) {
        return NextResponse.json(
          {
            error:
              `GDN ${gdnNumber} was not found.`,
          },
          {
            status: 404,
          }
        );
      }
    }

    const invoices =
      await prisma.salesInvoice.findMany({
        where: {
          companyId,
          salesOrderNumber:
            gdn.salesOrderNumber,
        },
        include: {
          lines: true,
        },
        orderBy: {
          invoiceDate: "desc",
        },
      });

    const comparison =
      gdn.lines.map(
        (gdnLine) => {
          const matchingInvoiceLines =
            invoices.flatMap(
              (invoice) =>
                invoice.lines
                  .filter(
                    (
                      invoiceLine
                    ) =>
                      invoiceLine.stockCode &&
                      gdnLine.stockCode &&
                      invoiceLine.stockCode
                        .trim()
                        .toUpperCase() ===
                        gdnLine.stockCode
                          .trim()
                          .toUpperCase()
                  )
                  .map(
                    (
                      invoiceLine
                    ) => ({
                      invoiceNumber:
                        invoice.invoiceNumber,

                      invoiceDate:
                        invoice.invoiceDate,

                      quantity:
                        invoiceLine.quantity ??
                        0,
                    })
                  )
            );

          const totalInvoiced =
            matchingInvoiceLines.reduce(
              (
                sum,
                line
              ) =>
                sum +
                line.quantity,
              0
            );

          const quantityDespatched =
            gdnLine.quantityDespatched ??
            0;

          return {
            lineNumber:
              gdnLine.lineNumber,

            stockCode:
              gdnLine.stockCode,

            description:
              gdnLine.description,

            quantityDespatched,

            quantityInvoiced:
              totalInvoiced,

            difference:
              quantityDespatched -
              totalInvoiced,

            matchedInvoices:
              matchingInvoiceLines,
          };
        }
      );

    const fullyInvoiced =
      comparison.every(
        (line) =>
          line.difference <= 0
      );

    return NextResponse.json({
      gdnNumber:
        gdn.gdnNumber,

      salesOrderNumber:
        gdn.salesOrderNumber,

      customerAccountCode:
        gdn.customerAccountCode,

      customerName:
        gdn.customerName,

      fullyInvoiced,

      lines:
        comparison,
    });
  } catch (error) {
    console.error(
      "Despatch invoice check failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "OdinIQ could not compare this GDN against invoices.",
      },
      {
        status: 500,
      }
    );
  }
}