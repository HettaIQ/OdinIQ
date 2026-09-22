import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

import { updateProduct } from "./actions";

export const dynamic = "force-dynamic";

type EditProductPageProps = {
  params: Promise<{
    productCode: string;
  }>;
};

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const {
    user,
    membership,
    companyId,
  } = await requireCompanyContext();

  const canEditProduct =
    user.platformRole === "SUPER_ADMIN" ||
    membership.role?.name ===
      "Company Admin" ||
    membership.role?.name ===
      "Accounts";

  if (!canEditProduct) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <Link
            href="/products"
            style={goldLinkStyle}
          >
            ← Back to Product Explorer
          </Link>

          <div
            style={{
              marginTop: "30px",
              padding: "22px",
              border:
                "1px solid #7f1d1d",
              borderRadius:
                "12px",
              background:
                "#2a1010",
              color: "#fecaca",
            }}
          >
            You do not have permission to
            edit product information.
          </div>
        </div>
      </main>
    );
  }

  const { productCode } =
    await params;

  const decodedProductCode =
    decodeURIComponent(
      productCode
    );

  const product =
  await prisma.product.findFirst({
    where: {
      productCode:
        decodedProductCode,

      companyId:
        companyId,
    },
  });

  if (!product) {
    notFound();
  }

  /*
   * Build useful suggestions from suppliers,
   * categories and brands already stored in
   * OdinIQ.
   */
 const existingProducts =
  await prisma.product.findMany({
    where: {
      companyId:
        companyId,
    },
    select: {
      supplier: true,
      category: true,
      brand: true,
    },
  });;

  const suppliers =
    uniqueValues(
      existingProducts.map(
        (item) => item.supplier
      )
    );

  const categories =
    uniqueValues(
      existingProducts.map(
        (item) => item.category
      )
    );

  const brands =
    uniqueValues(
      existingProducts.map(
        (item) => item.brand
      )
    );

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <Link
          href={`/products/${encodeURIComponent(
            product.productCode
          )}`}
          style={goldLinkStyle}
        >
          ← Cancel and return to product
        </Link>

        <div
          style={{
            marginTop: "32px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#d4af37",
              fontSize: "13px",
              fontWeight: "bold",
              letterSpacing:
                "1.5px",
              textTransform:
                "uppercase",
            }}
          >
            Product Intelligence
          </p>

          <h1
            style={{
              margin:
                "10px 0 0",
              fontSize: "40px",
            }}
          >
            Edit {product.productCode}
          </h1>

          <p
            style={{
              color: "#999999",
              marginTop: "10px",
            }}
          >
            Update product information.
            Product code is locked so
            historical Sage and OdinIQ links
            cannot be broken.
          </p>
        </div>

        <form
          action={updateProduct}
          style={{
            marginTop: "30px",
            background: "#151515",
            border:
              "1px solid #2b2b2b",
            borderRadius:
              "14px",
            padding: "26px",
          }}
        >
          <input
            type="hidden"
            name="productCode"
            value={product.productCode}
          />

          <div style={gridStyle}>
            <Field
              label="Product Code"
            >
              <input
                value={
                  product.productCode
                }
                readOnly
                style={{
                  ...inputStyle,
                  opacity: 0.65,
                  cursor:
                    "not-allowed",
                }}
              />
            </Field>

            <Field label="Status">
              <label
                style={{
                  minHeight: "46px",
                  display: "flex",
                  alignItems:
                    "center",
                  gap: "10px",
                  padding:
                    "0 12px",
                  border:
                    "1px solid #333333",
                  borderRadius:
                    "8px",
                  background:
                    "#0b0b0f",
                }}
              >
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={
                    product.active
                  }
                />

                Active product
              </label>
            </Field>
          </div>

          <Field label="Description">
            <input
              name="description"
              defaultValue={
                product.description
              }
              required
              style={inputStyle}
            />
          </Field>

          <div style={gridStyle}>
            <Field label="Supplier">
              <input
                name="supplier"
                defaultValue={
                  product.supplier ??
                  ""
                }
                list="supplier-options"
                placeholder="e.g. Heatmiser"
                style={inputStyle}
              />

              <datalist id="supplier-options">
                {suppliers.map(
                  (supplier) => (
                    <option
                      key={supplier}
                      value={supplier}
                    />
                  )
                )}
              </datalist>
            </Field>

            <Field label="Category">
              <input
                name="category"
                defaultValue={
                  product.category ??
                  ""
                }
                list="category-options"
                placeholder="e.g. Thermostats"
                style={inputStyle}
              />

              <datalist id="category-options">
                {categories.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    />
                  )
                )}
              </datalist>
            </Field>

            <Field label="Brand">
              <input
                name="brand"
                defaultValue={
                  product.brand ??
                  ""
                }
                list="brand-options"
                placeholder="e.g. Heatmiser"
                style={inputStyle}
              />

              <datalist id="brand-options">
                {brands.map(
                  (brand) => (
                    <option
                      key={brand}
                      value={brand}
                    />
                  )
                )}
              </datalist>
            </Field>
          </div>

          <div style={gridStyle}>
            <Field label="Cost Price">
              <input
                type="number"
                name="costPrice"
                step="0.01"
                min="0"
                defaultValue={
                  product.costPrice ??
                  ""
                }
                placeholder="0.00"
                style={inputStyle}
              />
            </Field>

            <Field label="List Price">
              <input
                type="number"
                name="listPrice"
                step="0.01"
                min="0"
                defaultValue={
                  product.listPrice ??
                  ""
                }
                placeholder="0.00"
                style={inputStyle}
              />
            </Field>
          </div>

          <div
            style={{
              marginTop: "28px",
              padding: "16px",
              border:
                "1px solid #66571d",
              borderRadius:
                "10px",
              background:
                "#211e12",
              color: "#d8d0a7",
              lineHeight: 1.5,
            }}
          >
            If you change the cost price,
            OdinIQ will record the new cost
            from today in Product Cost
            History. It will not invent a
            historical date for the previous
            cost.
          </div>

          <div
            style={{
              marginTop: "26px",
              display: "flex",
              justifyContent:
                "flex-end",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <Link
              href={`/products/${encodeURIComponent(
                product.productCode
              )}`}
              style={{
                padding:
                  "12px 18px",
                border:
                  "1px solid #444444",
                borderRadius:
                  "9px",
                color: "#ffffff",
                textDecoration:
                  "none",
                fontWeight: "bold",
              }}
            >
              Cancel
            </Link>

            <button
              type="submit"
              style={{
                padding:
                  "12px 22px",
                border: "none",
                borderRadius:
                  "9px",
                background:
                  "#d4af37",
                color: "#111111",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Save Product
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children:
    React.ReactNode;
}) {
  return (
    <label
      style={{
        display: "block",
        marginTop: "18px",
      }}
    >
      <span
        style={{
          display: "block",
          marginBottom: "8px",
          color: "#cccccc",
          fontWeight: "bold",
        }}
      >
        {label}
      </span>

      {children}
    </label>
  );
}

function uniqueValues(
  values: Array<
    string | null
  >
) {
  return Array.from(
    new Set(
      values
        .map((value) =>
          String(
            value ?? ""
          ).trim()
        )
        .filter(Boolean)
    )
  ).sort((a, b) =>
    a.localeCompare(b)
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#0b0b0f",
  color: "#ffffff",
  padding: "48px 32px",
  fontFamily:
    "Arial, sans-serif",
};

const containerStyle = {
  width: "100%",
  maxWidth: "1050px",
  margin: "0 auto",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "16px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  minHeight: "46px",
  padding: "11px 12px",
  background: "#0b0b0f",
  color: "#ffffff",
  border:
    "1px solid #333333",
  borderRadius: "8px",
  fontSize: "15px",
};

const goldLinkStyle = {
  color: "#d4af37",
  textDecoration: "none",
  fontWeight: "bold",
};
