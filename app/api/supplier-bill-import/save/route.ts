import { NextResponse } from "next/server";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

type SupplierBillLineInput = {
  lineNumber: number;
  productCode: string;
  itemDate: string;
  quantity: number | null;
  unitPrice: number | null;
  netValue: number | null;
  description: string | null;
};

type SupplierBillInput = {
  supplierName: string;
  supplierAccountCode: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  customerReference: string | null;
  deliveryNoteNumber: string | null;
  deliveryDate: string | null;
  supplierOrderNumber: string | null;
  supplierOrderDate: string | null;
  line: SupplierBillLineInput | null;
  itemsTotal: number | null;
  vatRate: number | null;
  vatValue: number | null;
  totalNet: number | null;
  finalAmount: number | null;
  currency: string;
};

type SaveBody = {
  invoices?: SupplierBillInput[];
};

function parseDate(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(
    /^(\d{2})\.(\d{2})\.(\d{4})$/,
  );

  if (!match) {
    return null;
  }

  return new Date(
    Date.UTC(
      Number(match[3]),
      Number(match[2]) - 1,
      Number(match[1]),
    ),
  );
}

export async function POST(request: Request) {
  try {
    const {
      user,
      membership,
      companyId,
    } = await requireCompanyContext();

    const canImport =
      user.platformRole === "SUPER_ADMIN" ||
      Boolean(
        membership.role?.permissions.some(
          ({ permission }) =>
            permission.key === "imports.manage",
        ),
      );

    if (!canImport) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to import supplier bills.",
        },
        { status: 403 },
      );
    }

    const body =
      (await request.json()) as SaveBody;

    const invoices =
      body.invoices ?? [];

    if (invoices.length === 0) {
      return NextResponse.json(
        {
          error:
            "No supplier invoices were supplied.",
        },
        { status: 400 },
      );
    }

    let imported = 0;
    let skipped = 0;
    let failed = 0;

    const details: Array<{
      invoiceNumber: string;
      status: "IMPORTED" | "SKIPPED" | "FAILED";
      message?: string;
    }> = [];

    for (const invoice of invoices) {
      const invoiceNumber =
        invoice.invoiceNumber?.trim();

      if (
        !invoiceNumber ||
        !invoice.invoiceDate ||
        !invoice.line
      ) {
        failed += 1;

        details.push({
          invoiceNumber:
            invoiceNumber ?? "Unknown",
          status: "FAILED",
          message:
            "Required invoice information is missing.",
        });

        continue;
      }

      try {
        const existing =
          await prisma.supplierBill.findFirst({
            where: {
              companyId,
              supplierAccountCode:
                invoice.supplierAccountCode,
              invoiceNumber,
            },
            select: {
              id: true,
            },
          });

        if (existing) {
          skipped += 1;

          details.push({
            invoiceNumber,
            status: "SKIPPED",
            message:
              "Invoice already imported.",
          });

          continue;
        }

        await prisma.supplierBill.create({
          data: {
            companyId,

            supplierAccountCode:
              invoice.supplierAccountCode,

            supplierName:
              invoice.supplierName,

            invoiceNumber,

            invoiceDate:
              parseDate(
                invoice.invoiceDate,
              ),

            customerReference:
              invoice.customerReference,

            supplierOrderNumber:
              invoice.supplierOrderNumber,

            deliveryNoteNumber:
              invoice.deliveryNoteNumber,

            deliveryDate:
              parseDate(
                invoice.deliveryDate,
              ),

            netValue:
              invoice.totalNet,

            vatValue:
              invoice.vatValue,

            grossValue:
              invoice.finalAmount,

            currency:
              invoice.currency || "GBP",

            source:
              "SUPPLIER_PDF",

            lines: {
              create: {
                lineNumber:
                  invoice.line.lineNumber,

                productCode:
                  invoice.line.productCode,

                description:
                  invoice.line.description,

                quantity:
                  invoice.line.quantity,

                unitPrice:
                  invoice.line.unitPrice,

                netValue:
                  invoice.line.netValue,

                vatValue:
                  invoice.vatValue,

                grossValue:
                  invoice.finalAmount,
              },
            },
          },
        });

        imported += 1;

        details.push({
          invoiceNumber,
          status: "IMPORTED",
        });
      } catch (error) {
        console.error(
          `Supplier bill import failed for ${invoiceNumber}:`,
          error,
        );

        failed += 1;

        details.push({
          invoiceNumber,
          status: "FAILED",
          message:
            "Database import failed.",
        });
      }
    }

    return NextResponse.json({
      success: failed === 0,
      received: invoices.length,
      imported,
      skipped,
      failed,
      details,
    });
  } catch (error) {
    console.error(
      "Supplier bill import failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Odin could not import the supplier invoices.",
      },
      { status: 500 },
    );
  }
}