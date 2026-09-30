import Link from "next/link";

import {
  assignProductLocation,
  createWarehouseLocation,
} from "@/app/actions/warehouseStockLocations";
import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";
import StockImportPreview from "./StockImportPreview";
import StocktakeReconciliation from "./StocktakeReconciliation";
import StartStocktakeButton from "./StartStocktakeButton";
import LocationImportPreview from "./LocationImportPreview";

export default async function StockLocationsPage() {
  const { companyId } =
    await requireCompanyContext();

  const products =
    await prisma.product.findMany({
      where: {
        companyId,
        active: true,
      },

      select: {
        id: true,
        productCode: true,
        description: true,

        stockLocations: {
          select: {
            id: true,
            quantity: true,

            location: {
              select: {
                id: true,
                code: true,
                description: true,
                stocktakeOrder: true,
              },
            },
          },

          orderBy: {
            location: {
              code: "asc",
            },
          },
        },
      },

      orderBy: {
        productCode: "asc",
      },
    });

  const locations =
    await prisma.warehouseLocation.findMany({
      where: {
        companyId,
        active: true,
      },

      orderBy: [
        {
          stocktakeOrder: "asc",
        },
        {
          code: "asc",
        },
      ],
    });

  const productsWithoutLocation =
    products.filter(
      (product) =>
        product.stockLocations.length === 0
    ).length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <Link
            href="/warehouse"
            className="text-sm font-semibold text-slate-600 hover:text-slate-950"
          >
            ← Back to Warehouse
          </Link>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
                Warehouse
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                Stock Locations
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Manage warehouse locations,
                assign products and prepare
                stock information for warehouse
                stocktakes.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="/api/warehouse/stock-locations/template"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
              >
                Download Location Template
              </a>

<Link
  href="/warehouse/stock-locations/history"
  style={{
    display: "inline-block",
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 14,
  }}
>
  Stocktake History
</Link>

              <StartStocktakeButton />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Active Products
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-950">
              {products.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Warehouse Locations
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-950">
              {locations.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Products Without Location
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-950">
              {productsWithoutLocation}
            </p>
          </div>
        </div>

        <StockImportPreview />
<LocationImportPreview />

        <StocktakeReconciliation />

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
              Location
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Add Warehouse Location
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Create a warehouse bay or
              location and set its position in
              the stocktake walking route.
            </p>

            <form
              action={createWarehouseLocation}
              className="mt-5 space-y-4"
            >
              <div>
                <label
                  htmlFor="code"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Location Code{" "}
                  <span className="text-red-600">
                    *
                  </span>
                </label>

                <input
                  id="code"
                  name="code"
                  required
                  placeholder="e.g. A01"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Description
                </label>

                <input
                  id="description"
                  name="description"
                  placeholder="e.g. Main warehouse aisle A"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
              </div>

              <div>
                <label
                  htmlFor="stocktakeOrder"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Stocktake Order
                </label>

                <input
                  id="stocktakeOrder"
                  name="stocktakeOrder"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 10"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Controls the order the
                  warehouse team walks the bays
                  during a stocktake. Using 10,
                  20, 30, 40 leaves room to add
                  locations between them later.
                </p>
              </div>

              <button
                type="submit"
                className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Add Location
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
              Assign Stock
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Assign Product to Location
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select a product, choose a
              location and enter the quantity
              held there.
            </p>

            <form
              action={assignProductLocation}
              className="mt-5 space-y-4"
            >
              <div>
                <label
                  htmlFor="productId"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Product{" "}
                  <span className="text-red-600">
                    *
                  </span>
                </label>

                <select
                  id="productId"
                  name="productId"
                  required
                  defaultValue=""
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                >
                  <option value="" disabled>
                    Select a product...
                  </option>

                  {products.map(
                    (product) => (
                      <option
                        key={product.id}
                        value={product.id}
                      >
                        {product.productCode} -{" "}
                        {product.description}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="locationId"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Location{" "}
                  <span className="text-red-600">
                    *
                  </span>
                </label>

                <select
                  id="locationId"
                  name="locationId"
                  required
                  defaultValue=""
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                >
                  <option value="" disabled>
                    Select a location...
                  </option>

                  {locations.map(
                    (location) => (
                      <option
                        key={location.id}
                        value={location.id}
                      >
                        {location.stocktakeOrder !==
                        null
                          ? `${location.stocktakeOrder} - `
                          : ""}
                        {location.code}
                        {location.description
                          ? ` - ${location.description}`
                          : ""}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="quantity"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Quantity
                </label>

                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  step="any"
                  defaultValue="0"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
              </div>

              <button
                type="submit"
                disabled={
                  products.length === 0 ||
                  locations.length === 0
                }
                className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Assign Stock
              </button>
            </form>
          </section>
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
              Warehouse Stock
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Product Locations
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current warehouse locations and
              quantities assigned to products.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3">
                    Product Code
                  </th>

                  <th className="px-6 py-3">
                    Description
                  </th>

                  <th className="px-6 py-3">
                    Location
                  </th>

                  <th className="px-6 py-3 text-right">
                    Located Qty
                  </th>
                </tr>
              </thead>

              <tbody>
                {products.map(
                  (product) => {
                    const locatedQuantity =
                      product.stockLocations.reduce(
                        (
                          total,
                          stockLocation
                        ) =>
                          total +
                          stockLocation.quantity,
                        0
                      );

                    return (
                      <tr
                        key={product.id}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="whitespace-nowrap px-6 py-4 font-bold text-slate-950">
                          {product.productCode}
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          {product.description}
                        </td>

                        <td className="px-6 py-4">
                          {product
                            .stockLocations
                            .length >
                          0 ? (
                            <div className="flex flex-wrap gap-2">
                              {product.stockLocations.map(
                                (
                                  stockLocation
                                ) => (
                                  <span
                                    key={
                                      stockLocation.id
                                    }
                                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                                  >
                                    {
                                      stockLocation
                                        .location
                                        .code
                                    }{" "}
                                    (
                                    {
                                      stockLocation.quantity
                                    }
                                    )
                                  </span>
                                )
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">
                              Not assigned
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right font-bold text-slate-950">
                          {locatedQuantity}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}