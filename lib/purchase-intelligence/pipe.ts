export const PIPE_PRODUCTS = {
  HSEVOH80: {
    description: "12mm EVOH Pert Pipe - 80m Coil",
    coilLengthMetres: 80,
  },
  "HSEVOH80-12MM": {
    description: "12mm EVOH Pert Pipe - 80m Coil",
    coilLengthMetres: 80,
  },
  "HSEVOH160-12MM": {
    description: "12mm EVOH Pert Pipe - 160m Coil",
    coilLengthMetres: 160,
  },
  HSEVOH100: {
    description: "16mm EVOH Pert Pipe - 100m Coil",
    coilLengthMetres: 100,
  },
  HSEVOH150: {
    description: "16mm EVOH Pert Pipe - 150m Coil",
    coilLengthMetres: 150,
  },
  HSEVOH200: {
    description: "16mm EVOH Pert Pipe - 200m Coil",
    coilLengthMetres: 200,
  },
  HSEVOH500: {
    description: "16mm EVOH Pert Pipe - 500m Coil",
    coilLengthMetres: 500,
  },
  HSPAP50: {
    description: "Pert-Al-Pert Pipe - 50m Coil",
    coilLengthMetres: 50,
  },
  "HSPAP80.": {
    description: "12mm Pert-Al-Pert Pipe - 80m Coil",
    coilLengthMetres: 80,
  },
  HSPAP160: {
    description: "12mm Pert-Al-Pert Pipe - 160m Coil",
    coilLengthMetres: 160,
  },
  HSPAP100: {
    description: "16mm Pert-Al-Pert Pipe - 100m Coil",
    coilLengthMetres: 100,
  },
  HSPAP150: {
    description: "16mm Pert-Al-Pert Pipe - 150m Coil",
    coilLengthMetres: 150,
  },
  HSPAP200: {
    description: "16mm Pert-Al-Pert Pipe - 200m Coil",
    coilLengthMetres: 200,
  },
  HSPAP500: {
    description: "16mm Pert-Al-Pert Pipe - 500m Coil",
    coilLengthMetres: 500,
  },
  "HSINS16BLUE-100M": {
    description: "16mm Pre-insulated MLCP - 100m Coil",
    coilLengthMetres: 100,
  },
  "HSINS16BLUE-100M-13MM": {
    description: "16mm Pre-insulated MLCP 13mm - 100m Coil",
    coilLengthMetres: 100,
  },
  "HSINS16RED-100M": {
    description: "16mm Pre-insulated MLCP - 100m Coil",
    coilLengthMetres: 100,
  },
  "HSINS16RED-100M-13MM": {
    description: "16mm Pre-insulated MLCP 13mm - 100m Coil",
    coilLengthMetres: 100,
  },
  "HSINS20BLUE-50M": {
    description: "20mm Pre-insulated MLCP - 50m Coil",
    coilLengthMetres: 50,
  },
  "HSINS20BLUE-50M-13MM": {
    description: "20mm Pre-insulated MLCP 13mm - 50m Coil",
    coilLengthMetres: 50,
  },
  "HSINS20RED-50M": {
    description: "20mm Pre-insulated MLCP - 50m Coil",
    coilLengthMetres: 50,
  },
  "HSINS20RED-50M-13MM": {
    description: "20mm Pre-insulated MLCP 13mm - 50m Coil",
    coilLengthMetres: 50,
  },
  "HSINS25BLUE-50M": {
    description: "25mm Pre-insulated MLCP - 50m Coil",
    coilLengthMetres: 50,
  },
  "HSINS25BLUE-50M-13MM": {
    description: "25mm Pre-insulated MLCP 13mm - 50m Coil",
    coilLengthMetres: 50,
  },
  "HSINS25RED-50M": {
    description: "25mm Pre-insulated MLCP - 50m Coil",
    coilLengthMetres: 50,
  },
  "HSINS25RED-50M-13MM": {
    description: "25mm Pre-insulated MLCP 13mm - 50m Coil",
    coilLengthMetres: 50,
  },
  "HSINS32BLUE-25M": {
    description: "32mm Pre-insulated MLCP - 25m Coil",
    coilLengthMetres: 25,
  },
  "HSINS32BLUE-25M-13MM": {
    description: "32mm Pre-insulated MLCP 13mm - 25m Coil",
    coilLengthMetres: 25,
  },
  "HSINS32RED-25M": {
    description: "32mm Pre-insulated MLCP - 25m Coil",
    coilLengthMetres: 25,
  },
  "HSINS32RED-25M-13MM": {
    description: "32mm Pre-insulated MLCP 13mm - 25m Coil",
    coilLengthMetres: 25,
  },} as const;

export type PipeProductCode =
  keyof typeof PIPE_PRODUCTS;

export function getPipeProduct(
  productCode: string | null | undefined
) {
  if (!productCode) {
    return null;
  }

  const code =
    productCode.trim().toUpperCase();

  if (!(code in PIPE_PRODUCTS)) {
    return null;
  }

  return {
    code: code as PipeProductCode,
    ...PIPE_PRODUCTS[
      code as PipeProductCode
    ],
  };
}

export function calculatePipeMetres(
  productCode: string | null | undefined,
  quantity: number | null | undefined
) {
  const pipe = getPipeProduct(productCode);

  if (!pipe || quantity == null) {
    return null;
  }

  return quantity * pipe.coilLengthMetres;
}