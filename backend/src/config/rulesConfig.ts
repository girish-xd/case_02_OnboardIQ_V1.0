import fs from 'fs';
import path from 'path';

export interface RulesConfig {
  version: string;
  min_field_confidence: number;
  min_age: number;
  pan_pattern: string;
  pan_holder_type_char: string;
  name_match_threshold: number;
  name_reject_below: number;
  watchlist_match_threshold: number;
  watchlist_possible_threshold: number;
  address_proof_max_age_days: number;
  medium_risk_income: number;
  rekyc_years: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  name_title_tokens: string[];
  mandatory_documents: string[];
  address_proof_types: string[];
  resubmission_sla_days: number;
  checker_sla_hours: number;
}

const DEFAULT_CONFIG: RulesConfig = {
  version: "1.0",
  min_field_confidence: 0.8,
  min_age: 18,
  pan_pattern: "^[A-Z]{5}[0-9]{4}[A-Z]$",
  pan_holder_type_char: "P",
  name_match_threshold: 0.9,
  name_reject_below: 0.75,
  watchlist_match_threshold: 0.9,
  watchlist_possible_threshold: 0.8,
  address_proof_max_age_days: 90,
  medium_risk_income: 2500000,
  rekyc_years: {
    HIGH: 2,
    MEDIUM: 8,
    LOW: 10
  },
  name_title_tokens: [
    "MR", "MRS", "MS", "MISS", "DR", "SHRI", "SMT", "KUMARI"
  ],
  mandatory_documents: [
    "PAN_CARD", "AADHAAR_CARD", "ADDRESS_PROOF"
  ],
  address_proof_types: [
    "ELECTRICITY_BILL", "BANK_STATEMENT", "DRIVING_LICENCE"
  ],
  resubmission_sla_days: 7,
  checker_sla_hours: 24
};

let currentConfig: RulesConfig = { ...DEFAULT_CONFIG };

export function loadRulesConfig(customPath?: string): RulesConfig {
  const potentialPaths = [
    customPath,
    process.env.RULES_CONFIG_PATH,
    path.resolve(process.cwd(), 'case_02_rules_config_V1.0.json'),
    path.resolve(process.cwd(), '..', 'case_02_rules_config_V1.0.json'),
    path.resolve(process.cwd(), 'docs', 'source', 'case_02_rules_config_V1.0.json'),
  ].filter(Boolean) as string[];

  for (const p of potentialPaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        currentConfig = JSON.parse(raw);
        console.log(`[Config] Loaded rules config from ${p} (v${currentConfig.version})`);
        return currentConfig;
      } catch (err) {
        console.error(`[Config] Error reading rules config from ${p}:`, err);
      }
    }
  }

  console.warn('[Config] Using default rules configuration.');
  return currentConfig;
}

export function getRulesConfig(): RulesConfig {
  return currentConfig;
}

export function updateRulesConfig(newConfig: Partial<RulesConfig>): RulesConfig {
  currentConfig = {
    ...currentConfig,
    ...newConfig,
    version: `${parseFloat(currentConfig.version || '1.0') + 0.1}`
  };
  return currentConfig;
}
