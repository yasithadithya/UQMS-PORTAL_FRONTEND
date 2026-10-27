/** Mirrors BACKEND/src/config/certificateVariants.ts: the COS is named after the vessel code. */
export interface CosVariant {
  shortName: string;
  title: string;
  defaultTypeOfSurvey: string;
}

const VARIANTS: Record<string, CosVariant> = {
  SSC: { shortName: 'SSCCOS', title: 'Small Craft Code Certificate of Survey', defaultTypeOfSurvey: 'SSC Initial Survey' },
};

/**
 * Schedule II is named after the vessel's governing code, e.g. "SSC Schedule II". Mirrors
 * scheduleIILabelFor in the backend.
 */
export const scheduleIILabelFor = (vesselCode?: string | null): string => {
  const code = String(vesselCode || '').trim().toUpperCase();
  return code ? `${code} Schedule II` : 'Schedule II';
};

export const cosVariantFor = (vesselCode?: string | null): CosVariant => {
  const code = String(vesselCode || '').trim().toUpperCase();
  return VARIANTS[code] ?? {
    shortName: code ? `${code}COS` : 'COS',
    title: 'Certificate of Survey',
    defaultTypeOfSurvey: code ? `${code} Initial Survey` : 'Initial Survey',
  };
};
