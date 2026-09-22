"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

function textOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function numberOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  const parsed = Number(text);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

export async function updateProduct(
  formData: FormData
) {
  const {
    user,
    membership,
    companyId,
  } = await requireCompanyContext();

  const canEditProduct =
    user.platformRole === "SUPER_ADMIN" ||
    membership.role?.name === "Company Admin" ||
    membership.role?.name === "Accounts";

  if (!canEditProduct) {
    throw new Error(
      "You do not have permission to edit products."
    );
  }

  const productCode = String(
    formData.get("productCode") ?? ""
  ).trim();

  if (!productCode) {
    throw new Error(
      "Product code is required."
    );
  }

  const product =
  await prisma.product.findFirst({
    where: {
      productCode,
      companyId:
        companyId,
    },
    select: {
      id: true,
      productCode: true,
      costPrice: true,
    },
  });

  if (!product) {
    throw new Error(
      "Product could not be found."
    );
  }

  const description = String(
    formData.get("description") ?? ""
  ).trim();

  if (!description) {
    throw new Error(
      "Description is required."
    );
  }

  const supplier =
    textOrNull(
      formData.get("supplier")
    );

  const category =
    textOrNull(
      formData.get("category")
    );

  const brand =
    textOrNull(
      formData.get("brand")
    );

  const costPrice =
    numberOrNull(
      formData.get("costPrice")
    );

  const listPrice =
    numberOrNull(
      formData.get("listPrice")
    );

  const active =
    formData.get("active") === "on";

  const costHasChanged =
    costPrice !== product.costPrice;

 await prisma.product.update({
  where: {
    id: product.id,
  },
  data: {
    description,
    supplier,
    category,
    brand,
    costPrice,
    listPrice,
    active,
  },
});

  if (
    costHasChanged &&
    costPrice !== null
  ) {
    const changedAt = new Date();

    await prisma.productCostHistory.updateMany({
      where: {
        companyId:
          companyId,
        productId:
          product.id,
        effectiveTo: null,
      },
      data: {
        effectiveTo:
          changedAt,
      },
    });

    await prisma.productCostHistory.create({
      data: {
        companyId:
          companyId,
        productId:
          product.id,
        costPrice,
        effectiveFrom:
          changedAt,
        source:
          "MANUAL_PRODUCT_EDIT",
        notes:
          "Cost price updated manually in OdinIQ.",
      },
    });
  }

  revalidatePath("/products");

  revalidatePath(
    `/products/${encodeURIComponent(
      productCode
    )}`
  );

  redirect(
    `/products/${encodeURIComponent(
      productCode
    )}`
  );
}
