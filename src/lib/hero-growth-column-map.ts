import { HeroGrowthRow } from "./hero-growth";

type GrowthColumnKey = keyof HeroGrowthRow;

export type ColumnMetadata = {
  label: string;
  description: string;
  source: string | string[];
  notes?: string;
};

export type GrowthColumnDictionary = Partial<Record<GrowthColumnKey, ColumnMetadata>>;

export const HERO_GROWTH_COLUMN_DICTIONARY: GrowthColumnDictionary = {
  heroName: {
    label: "Hero Name",
    description: "Display name sourced from the hero API",
    source: "hero.name",
  },
  baseBulletDamage: {
    label: "Base Bullet Damage",
    description: "Damage per bullet at level 1",
    source: "items[].weapon_info.bullet_damage",
  },
  pellets: {
    label: "Pellets",
    description: "Number of pellets fired per shot at base levels",
    source: "items[].weapon_info.bullets",
    notes: "For Drifter, pellets do not stack damage and are normalized to 1.",
  },
  baseFireRate: {
    label: "Base Fire Rate (RPS)",
    description: "Rounds-per-second derived from 1 / cycle_time",
    source: "items[].weapon_info.cycle_time",
  },
  baseDps: {
    label: "Base DPS",
    description: "Base bullet damage × pellets ÷ cycle time",
    source: ["items[].weapon_info.bullet_damage", "items[].weapon_info.cycle_time"],
  },
  baseSpinDps: {
    label: "Base DPS (Max Spin)",
    description: "Base bullet damage × pellets ÷ max_spin_cycle_time",
    source: ["items[].weapon_info.bullet_damage", "items[].weapon_info.max_spin_cycle_time"],
    notes: "Falls back to base cycle time when max spin data is missing.",
  },
  maxGunDamage: {
    label: "Max Gun Damage",
    description: "Base bullet damage plus standard level-up damage gains",
    source: [
      "items[].weapon_info.bullet_damage",
      "hero.standard_level_up_upgrades.MODIFIER_VALUE_BASE_BULLET_DAMAGE_FROM_LEVEL",
    ],
  },
  maxGunDps: {
    label: "Max Gun DPS",
    description: "Max gun damage × pellets ÷ cycle time",
    source: ["maxGunDamage", "items[].weapon_info.cycle_time"],
  },
  maxHealthWithBoons: {
    label: "Max HP (Boons)",
    description: "Max level health after applying all vitality purchase bonuses",
    source: "hero.purchase_bonuses.vitality[]",
  },
  maxRegenWithBoons: {
    label: "Max Regen (Boons)",
    description: "Base health regeneration adjusted by vitality purchase bonuses",
    source: "hero.purchase_bonuses.vitality[]",
  },
  maxRegenWithBoonsAndSpirit: {
    label: "Max Regen (Boons + Spirit)",
    description: "Boons-adjusted regen plus spirit-scaling bonuses",
    source: ["maxRegenWithBoons", "hero.scaling_stats.EBaseHealthRegen.scale"],
  },
  maxSprintWithBoons: {
    label: "Max Sprint (Boons)",
    description: "Base sprint speed adjusted by vitality purchase bonuses",
    source: "hero.purchase_bonuses.vitality[]",
  },
  maxSprintWithBoonsAndSpirit: {
    label: "Max Sprint (Boons + Spirit)",
    description: "Boons-adjusted sprint speed including spirit scaling",
    source: ["maxSprintWithBoons", "hero.scaling_stats.ESprintSpeed.scale"],
  },
  maxMoveSpeedWithBoons: {
    label: "Max Move Speed (Boons)",
    description: "Base move speed adjusted by vitality purchase bonuses",
    source: "hero.purchase_bonuses.vitality[]",
  },
  maxMoveSpeedWithBoonsAndSpirit: {
    label: "Max Move Speed (Boons + Spirit)",
    description: "Boons-adjusted move speed plus spirit scaling",
    source: ["maxMoveSpeedWithBoons", "hero.scaling_stats.EMaxMoveSpeed.scale"],
  },
  maxSpinGunDps: {
    label: "Max Gun DPS (Max Spin)",
    description: "Max gun damage × pellets ÷ max spin cycle time",
    source: ["maxGunDamage", "items[].weapon_info.max_spin_cycle_time"],
  },
  spiritBulletDamageBonus: {
    label: "Spirit Bullet Damage Bonus",
    description: "Additional bullet damage granted by spirit-infused scaling",
    source: "hero.scaling_stats.EBulletDamage.scale",
    notes: "Zero means no spirit-based bullet damage bonus.",
  },
  spiritRoundsPerSecondBonus: {
    label: "Spirit Rounds Per Second Bonus",
    description: "Additional RPS granted by spirit-infused scaling",
    source: "hero.scaling_stats.ERoundsPerSecond.scale",
  },
  maxGunDamageWithSpirit: {
    label: "Max Gun Damage (Spirit)",
    description: "Max gun damage including spirit bullet bonuses",
    source: ["maxGunDamage", "spiritBulletDamageBonus"],
  },
  maxGunDpsWithSpirit: {
    label: "Max Gun DPS (Spirit)",
    description: "Spirit-boosted gun damage at base spin divided by adjusted cycle time",
    source: ["maxGunDamageWithSpirit", "spiritRoundsPerSecondBonus"],
  },
  maxSpinGunDpsWithSpirit: {
    label: "Max Gun DPS (Spin + Spirit)",
    description: "Fully spun DPS including spirit bullet and RPS bonuses",
    source: ["maxGunDamageWithSpirit", "spiritRoundsPerSecondBonus"],
  },
  dpsGrowthPercent: {
    label: "DPS % Growth",
    description: "Percentage gain from base DPS to max gun DPS",
    source: ["baseDps", "maxGunDps"],
  },
  totalSpiritAtMaxLevel: {
    label: "Total Spirit at Max Level",
    description: "Spirit accumulated from level 1 to cap",
    source: "hero.standard_level_up_upgrades.MODIFIER_VALUE_TECH_POWER",
  },
};


