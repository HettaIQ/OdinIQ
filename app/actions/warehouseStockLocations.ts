"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

export async function createWarehouseLocation(
  formData: FormData
) {
  const { companyId } =
    await requireCompanyContext();

  const code = String(
    formData.get("code") ?? ""
  )
    .trim()
    .toUpperCase();

  const description = String(
    formData.get("description") ?? ""
  ).trim();

  const stocktakeOrderRaw = String(
    formData.get("stocktakeOrder") ?? ""
  ).trim();

  let stocktakeOrder: number | null =
    null;

  if (stocktakeOrderRaw !== "") {
    const parsed =
      Number(stocktakeOrderRaw);

    if (
      !Number.isInteger(parsed) ||
      parsed < 0
    ) {
      throw new Error(
        "Stocktake order must be a whole number of zero or greater."
      );
    }

    stocktakeOrder = parsed;
  }

  if (!code) {
    throw new Error(
      "Warehouse location code is required."
    );
  }

  await prisma.warehouseLocation.upsert({
    where: {
      companyId_code: {
        companyId,
        code,
      },
    },

    update: {
      active: true,
      description:
        description || null,
      stocktakeOrder,
    },

    create: {
      companyId,
      code,
      description:
        description || null,
      stocktakeOrder,
    },
  });

  revalidatePath(
    "/warehouse/stock-locations"
  );
}

export async function assignProductLocation(
  formData: FormData
) {
  const { companyId } =
    await requireCompanyContext();

  const productId = Number(
    formData.get("productId")
  );

  const locationId = Number(
    formData.get("locationId")
  );

  const quantity = Number(
    formData.get("quantity") ?? 0
  );

  if (
    !Number.isInteger(productId) ||
    productId <= 0
  ) {
    throw new Error(
      "A valid product is required."
    );
  }

  if (
    !Number.isInteger(locationId) ||
    locationId <= 0
  ) {
    throw new Error(
      "A valid warehouse location is required."
    );
  }

  if (
    !Number.isFinite(quantity) ||
    quantity < 0
  ) {
    throw new Error(
      "Quantity must be zero or greater."
    );
  }

  const [product, location] =
    await Promise.all([
      prisma.product.findFirst({
        where: {
          id: productId,
          companyId,
        },

        select: {
          id: true,
        },
      }),

      prisma.warehouseLocation.findFirst({
        where: {
          id: locationId,
          companyId,
          active: true,
        },

        select: {
          id: true,
        },
      }),
    ]);

  if (!product || !location) {
    throw new Error(
      "Product or warehouse location was not found."
    );
  }

  await prisma.productStockLocation.upsert({
    where: {
      companyId_productId_locationId: {
        companyId,
        productId,
        locationId,
      },
    },

    update: {
      quantity,
    },

    create: {
      companyId,
      productId,
      locationId,
      quantity,
    },
  });

  revalidatePath(
    "/warehouse/stock-locations"
  );
}