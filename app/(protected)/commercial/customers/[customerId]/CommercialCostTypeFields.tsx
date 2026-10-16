"use client";

import { useState } from "react";

export default function CommercialCostTypeFields() {
  const [costType, setCostType] = useState("REBATE");

  return (
    <>
      <div>
        <label
          htmlFor="costType"
          className="text-sm font-semibold text-slate-700"
        >
          Type
        </label>

        <select
          id="costType"
          name="costType"
          required
          value={costType}
          onChange={(event) => setCostType(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="REBATE">Rebate</option>
          <option value="AGENT_COMMISSION">Agent Commission</option>
          <option value="MERCHANDISE">Merchandise</option>
          <option value="ENTERTAINMENT">Entertainment</option>
          <option value="MARKETING">Marketing</option>
          <option value="CARRIAGE">Carriage</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {costType === "REBATE" && (
        <div>
          <label
            htmlFor="rebateCategory"
            className="text-sm font-semibold text-slate-700"
          >
            Rebate Category
          </label>

          <select
            id="rebateCategory"
            name="rebateCategory"
            defaultValue="QUARTERLY"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="QUARTERLY">Quarterly Rebate</option>
            <option value="ANNUAL_RETROSPECTIVE">
              Annual Retrospective Rebate
            </option>
            <option value="OTHER">Other Rebate</option>
          </select>
        </div>
      )}
    </>
  );
}