"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type SalesOrderQrCodeProps = {
  salesOrderNumber: string;
};

export default function SalesOrderQrCode({
  salesOrderNumber,
}: SalesOrderQrCodeProps) {
  const [qrCode, setQrCode] = useState("");
  const [orderUrl, setOrderUrl] = useState("");

  useEffect(() => {
    const url =
  `http://192.168.1.74:3000/sales-orders/` +
  encodeURIComponent(salesOrderNumber);

    setOrderUrl(url);

    QRCode.toDataURL(url, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: "M",
    })
      .then(setQrCode)
      .catch((error) => {
        console.error("QR code generation failed:", error);
      });
  }, [salesOrderNumber]);

  if (!qrCode) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-5">
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <img
            src={qrCode}
            alt={`QR code for Sales Order ${salesOrderNumber}`}
            className="h-32 w-32"
          />
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
            Warehouse QR
          </p>

          <h3 className="mt-1 text-lg font-bold text-slate-950">
            Sales Order {salesOrderNumber}
          </h3>

          <p className="mt-1 max-w-md text-sm text-slate-500">
            Scan this code to open this Sales Order directly in Odin.
          </p>

          <a
            href={orderUrl}
            className="mt-3 inline-block text-sm font-semibold text-amber-700 hover:text-amber-800"
          >
            Open linked Sales Order
          </a>
        </div>
      </div>
    </div>
  );
}