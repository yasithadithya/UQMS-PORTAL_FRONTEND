/** Mirrors BACKEND/src/config/certificateVariants.ts: the COS is named after the vessel code. */
export interface CosVariant {
  shortName: string;
  title: string;
  defaultTypeOfSurvey: string;
}

const VARIANTS: Record<string, CosVariant> = {
  SSC: { shortName: 'SSCCOS', title: 'Small Craft Code Certificate of Survey', defaultTypeOfSurvey: 'SSC Initial Survey' },
};

export const cosVariantFor = (vesselCode?: string | null): CosVariant => {
  const code = String(vesselCode || '').trim().toUpperCase();
  return VARIANTS[code] ?? {
    shortName: code ? `${code}COS` : 'COS',
    title: 'Certificate of Survey',
    defaultTypeOfSurvey: code ? `${code} Initial Survey` : 'Initial Survey',
  };
};
