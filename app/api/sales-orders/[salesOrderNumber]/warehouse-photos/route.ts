import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

import { getApiCompanyContext } from "@/lib/auth/getApiCompanyContext";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    salesOrderNumber: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const companyContext =
      await getApiCompanyContext();

    if (
      companyContext.status ===
      "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
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
          success: false,
          message:
            "No active company membership found.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      user,
      membership,
      companyId,
    } = companyContext;

    /*
     * Warehouse evidence can only be uploaded
     * by users who have the stock.dispatch
     * permission for the currently selected
     * company.
     *
     * SUPER_ADMIN retains platform-level access.
     */
    const canDispatchStock =
      user.platformRole === "SUPER_ADMIN" ||
      Boolean(
        membership.role?.permissions.some(
          ({ permission }) =>
            permission.key ===
            "stock.dispatch"
        )
      );

    if (!canDispatchStock) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to upload warehouse evidence.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      salesOrderNumber:
        rawSalesOrderNumber,
    } = await context.params;

    const salesOrderNumber =
      decodeURIComponent(
        rawSalesOrderNumber
      ).trim();

    if (!salesOrderNumber) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sales Order number is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * The Sales Order must belong to the
     * currently selected OdinIQ company.
     *
     * The compound key prevents an order from
     * another tenant being used as the target
     * for this warehouse upload.
     */
    const salesOrder =
      await prisma.salesOrder.findUnique({
        where: {
          companyId_salesOrderNumber: {
            companyId,
            salesOrderNumber,
          },
        },
        select: {
          id: true,
          salesOrderNumber:
            true,
          warehouseStatus:
            true,
        },
      });

    if (!salesOrder) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sales Order not found.",
        },
        {
          status: 404,
        }
      );
    }

    const formData =
      await request.formData();

    const file =
      formData.get("file");

    const note =
      String(
        formData.get("note") ??
          ""
      ).trim();

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No photo was supplied.",
        },
        {
          status: 400,
        }
      );
    }

    const originalName =
      file.name;

    const extension =
      path
        .extname(
          originalName
        )
        .toLowerCase();

    const allowedExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
    ];

    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedExtensions.includes(
        extension
      ) ||
      !allowedMimeTypes.includes(
        file.type
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only JPG, JPEG, PNG and WebP photos are supported.",
        },
        {
          status: 400,
        }
      );
    }

    const maximumSize =
      20 * 1024 * 1024;

    if (
      file.size >
      maximumSize
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The maximum photo size is 20 MB.",
        },
        {
          status: 400,
        }
      );
    }

    const storedFileName =
      `${crypto.randomUUID()}${extension}`;

    const relativeDirectory =
      path.join(
        "uploads",
        "warehouse",
        String(
          salesOrder.id
        )
      );

    const absoluteDirectory =
      path.join(
        process.cwd(),
        "public",
        relativeDirectory
      );

    await mkdir(
      absoluteDirectory,
      {
        recursive: true,
      }
    );

    const absoluteFilePath =
      path.join(
        absoluteDirectory,
        storedFileName
      );

    const buffer =
      Buffer.from(
        await file.arrayBuffer()
      );

    await writeFile(
      absoluteFilePath,
      buffer
    );

    const photo =
      await prisma.salesOrderWarehousePhoto.create({
        data: {
          salesOrderId:
            salesOrder.id,

          fileName:
            storedFileName,

          originalName,

          fileType:
            file.type,

          fileSize:
            file.size,

          warehouseStage:
            salesOrder.warehouseStatus,

          note:
            note || null,

          uploadedBy:
            user.name,
        },
      });

    const fileUrl =
      `/${relativeDirectory.replaceAll(
        "\\",
        "/"
      )}/${storedFileName}`;

    return NextResponse.json(
      {
        success: true,

        message:
          "Warehouse photo uploaded successfully.",

        photo,

        fileUrl,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Warehouse photo upload failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "The warehouse photo could not be uploaded.",

        error:
          error instanceof Error
            ? error.message
            : "Unknown upload error.",
      },
      {
        status: 500,
      }
    );
  }
}