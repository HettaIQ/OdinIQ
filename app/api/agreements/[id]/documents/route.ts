import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

import { getApiCompanyContext } from "@/lib/auth/getApiCompanyContext";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
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
    { status: 401 }
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
        "No active company membership was found.",
    },
    { status: 403 }
  );
}

const {
  user,
  membership,
  companyId,
} = companyContext;

const canManageAgreements =
  user.platformRole === "SUPER_ADMIN" ||
  Boolean(
    membership.role?.permissions.some(
      ({ permission }) =>
        permission.key === "agreements.manage",
    ),
  );

if (!canManageAgreements) {
  return NextResponse.json(
    {
      success: false,
      message:
        "You do not have permission to upload agreement documents.",
    },
    {
      status: 403,
    },
  );
}

    const { id } = await context.params;
    const agreementId = Number(id);

    if (
      !Number.isInteger(agreementId) ||
      agreementId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid agreement ID.",
        },
        { status: 400 }
      );
    }

    const agreement =
      await prisma.commercialAgreement.findFirst({
        where: {
  id: agreementId,
  companyId,
},
        select: {
          id: true,
        },
      });

    if (!agreement) {
      return NextResponse.json(
        {
          success: false,
          message: "Agreement not found.",
        },
        { status: 404 }
      );
    }

    const formData = await request.formData();

    const file = formData.get("file");

    const category = String(
      formData.get("category") ?? ""
    ).trim();

    const uploadedBy = String(
      formData.get("uploadedBy") ?? ""
    ).trim();

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "No document was supplied.",
        },
        { status: 400 }
      );
    }

    const allowedExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".csv",
      ".png",
      ".jpg",
      ".jpeg",
    ];

    const originalName = file.name;

    const extension = path
      .extname(originalName)
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This file type is not supported.",
        },
        { status: 400 }
      );
    }

    const maximumSize =
      20 * 1024 * 1024;

    if (file.size > maximumSize) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The maximum file size is 20 MB.",
        },
        { status: 400 }
      );
    }

    const storedFileName =
      `${crypto.randomUUID()}${extension}`;

    const relativeDirectory = path.join(
      "uploads",
      "agreements",
      String(agreement.id)
    );

    const absoluteDirectory = path.join(
      process.cwd(),
      "public",
      relativeDirectory
    );

    await mkdir(absoluteDirectory, {
      recursive: true,
    });

    const absoluteFilePath = path.join(
      absoluteDirectory,
      storedFileName
    );

    const buffer = Buffer.from(
      await file.arrayBuffer()
    );

    await writeFile(
      absoluteFilePath,
      buffer
    );

    const document =
      await prisma.agreementDocument.create({
        data: {
          agreementId: agreement.id,
          fileName: storedFileName,
          originalName,
          fileType:
            file.type ||
            extension.replace(".", ""),
          fileSize: file.size,
          category: category || null,
          uploadedBy: uploadedBy || null,
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
          "Document uploaded successfully.",
        document,
        fileUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Agreement document upload failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "The document could not be uploaded.",
        error:
          error instanceof Error
            ? error.message
            : "Unknown upload error.",
      },
      { status: 500 }
    );
  }
}