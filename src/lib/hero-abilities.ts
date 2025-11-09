import { DeadlockItem, AbilityItem, Hero, ItemProperty } from "@/lib/types";

export type AbilityValueRange = {
  base: number | null;
  max: number | null;
};

export type AbilityDamageTotals = {
  interceptBase: number;
  interceptMax: number;
  scalingBase: number;
  scalingMax: number;
};

export type AbilityDamageComponent = {
  key: string;
  label: string;
  note?: string;
  intercept: AbilityValueRange;
  scaling: AbilityValueRange;
  value: AbilityValueRange;
  unit?: string | null;
  isPercent: boolean;
};

export type AbilityDamageSummary = {
  type: "burst" | "sustained";
  unit: "total" | "perSecond";
  value: AbilityValueRange;
  intercept: AbilityValueRange;
  scaling: AbilityValueRange;
  perMinute?: AbilityValueRange;
  components: AbilityDamageComponent[];
  totals: {
    min: AbilityDamageTotals;
    max: AbilityDamageTotals;
  };
};

export type AbilityCrowdControlType = "stun" | "silence" | "immobilize" | "displacement" | "slow";

export type AbilityCrowdControlEffect = {
  key: string;
  label: string;
  type: AbilityCrowdControlType;
  duration: AbilityValueRange;
  magnitude?: AbilityValueRange;
  magnitudeUnit?: string;
};

export type AbilityControlMetrics = {
  effects: AbilityCrowdControlEffect[];
  summary: {
    stun?: AbilityValueRange;
    silence?: AbilityValueRange;
    immobilize?: AbilityValueRange;
    displacement?: AbilityValueRange;
    slow?: {
      magnitude?: AbilityValueRange;
      duration?: AbilityValueRange;
    };
  };
};

export type AbilityModifierCategory = "buff" | "debuff" | "amp" | "shred";

export type AbilityModifierEffect = {
  key: string;
  label: string;
  stat: string;
  type: AbilityModifierCategory;
  target: "self" | "ally" | "enemy";
  value: AbilityValueRange;
  scaling: AbilityValueRange;
  unit?: string;
  duration?: AbilityValueRange;
};

export type AbilityModifierSummaryKey =
  | "weaponDamage"
  | "spiritPower"
  | "bulletResist"
  | "spiritResist"
  | "damageAmpAll"
  | "damageAmpGun"
  | "damageAmpSpirit"
  | "gunShred"
  | "spiritShred";

export type AbilityModifierSummary = {
  effects: AbilityModifierEffect[];
  summary: Partial<Record<AbilityModifierSummaryKey, AbilityModifierEffect>>;
};

export type AbilityCadenceMetrics = {
  cooldown: AbilityValueRange;
  duration: AbilityValueRange;
  charges: AbilityValueRange;
};

export type AbilityMetrics = {
  cadence: AbilityCadenceMetrics;
  damage: {
    burst: AbilityDamageSummary;
    sustained: AbilityDamageSummary;
  };
  control: AbilityControlMetrics;
  modifiers: AbilityModifierSummary;
};

export type AbilityTag = "burst" | "sustained" | "crowd-control" | "buff" | "debuff";

export type HeroAbilityRow = {
  heroId: number;
  heroName: string;
  heroImage: string | null;
  isDisabled: boolean;
  hasBurstComponents: boolean;
  hasDpsComponents: boolean;
  abilitySlot: string;
  abilityName: string;
  abilityType: string | null;
  abilityDescription: string | null;
  baseSpiritPower: number;
  maxSpiritPower: number;
  spiritGain: number;
  maxLevel: number;
  cooldownBase: number | null;
  cooldownMax: number | null;
  durationBase: number | null;
  durationMax: number | null;
  chargesBase: number | null;
  chargesMax: number | null;
  burstDamageBase: number | null;
  burstDamageMax: number | null;
  burstScalingBase: number | null;
  burstScalingMax: number | null;
  burstDpmBase: number | null;
  burstDpmMax: number | null;
  sustainedDpsBase: number | null;
  sustainedDpsMax: number | null;
  sustainedScalingBase: number | null;
  sustainedScalingMax: number | null;
  spiritScalingBase: number | null;
  spiritScalingMax: number | null;
  gunShredTotal: number | null;
  spiritShredTotal: number | null;
  damageAmpAll: number | null;
  damageAmpGun: number | null;
  damageAmpSpirit: number | null;
  damageComponents: Record<
    string,
    {
      label: string;
      damageBase: number | null;
      damageMax: number | null;
      scalingBase: number | null;
      scalingMax: number | null;
      category: "burst" | "dps";
      note?: string;
      unit?: string | null;
      isPercent: boolean;
    }
  >;
  burstDamageComponentOrder: string[];
  dpsDamageComponentOrder: string[];
  assumptionNotes: string[];
  metrics: AbilityMetrics;
  tags: AbilityTag[];
};

type DamageComponentEntry = NonNullable<HeroAbilityRow["damageComponents"][string]>;

type DamageGroupEntry = {
  min?: { key: string; component: DamageComponentEntry };
  max?: { key: string; component: DamageComponentEntry };
  defaults: Array<{ key: string; component: DamageComponentEntry }>;
};

function createDamageTotals(): AbilityDamageTotals {
  return {
    interceptBase: 0,
    interceptMax: 0,
    scalingBase: 0,
    scalingMax: 0,
  };
}

function addComponentToTotals(totals: AbilityDamageTotals, component: DamageComponentEntry) {
  totals.interceptBase += component.damageBase ?? 0;
  totals.interceptMax += component.damageMax ?? component.damageBase ?? 0;
  totals.scalingBase += component.scalingBase ?? 0;
  totals.scalingMax += component.scalingMax ?? component.scalingBase ?? 0;
}

function getDamageGroupInfo(key: string): { groupKey: string; variant: "min" | "max" | "default" } {
  if (/MinimumDamage$/i.test(key)) {
    return { groupKey: key.replace(/MinimumDamage$/i, "Damage"), variant: "min" };
  }
  if (/MaximumDamage$/i.test(key)) {
    return { groupKey: key.replace(/MaximumDamage$/i, "Damage"), variant: "max" };
  }
  if (/MinDamage$/i.test(key)) {
    return { groupKey: key.replace(/MinDamage$/i, "Damage"), variant: "min" };
  }
  if (/MaxDamage$/i.test(key)) {
    return { groupKey: key.replace(/MaxDamage$/i, "Damage"), variant: "max" };
  }
  return { groupKey: key, variant: "default" };
}

function aggregateDamageCategory(args: {
  componentKeys: string[];
  components: HeroAbilityRow["damageComponents"];
  baseSpirit: number;
  maxSpirit: number;
}): {
  value: AbilityValueRange;
  intercept: AbilityValueRange;
  scaling: AbilityValueRange;
  components: AbilityDamageComponent[];
  totalsMin: AbilityDamageTotals;
  totalsMax: AbilityDamageTotals;
} {
  const { componentKeys, components, baseSpirit, maxSpirit } = args;
  const groups = new Map<string, DamageGroupEntry>();
  const componentSummaries: AbilityDamageComponent[] = [];

  for (const key of componentKeys) {
    const component = components[key];
    if (!component) {
      continue;
    }

    const interceptRange = toValueRange(component.damageBase, component.damageMax ?? component.damageBase ?? null);
    const scalingRange = toValueRange(component.scalingBase, component.scalingMax ?? component.scalingBase ?? null);
    const valueRange = toValueRange(
      computeDamageValue(component.damageBase, component.scalingBase ?? null, baseSpirit),
      computeDamageValue(
        component.damageMax ?? component.damageBase,
        component.scalingMax ?? component.scalingBase ?? null,
        maxSpirit,
      ),
    );

    componentSummaries.push({
      key,
      label: component.label ?? formatDamageComponentLabel(key),
      note: component.note,
      intercept: interceptRange,
      scaling: scalingRange,
      value: valueRange,
      unit: component.unit ?? null,
      isPercent: component.isPercent,
    });

    if (component.isPercent) {
      continue;
    }

    const { groupKey, variant } = getDamageGroupInfo(key);
    const entry = groups.get(groupKey) ?? { defaults: [] };
    if (variant === "min") {
      entry.min = { key, component };
    } else if (variant === "max") {
      entry.max = { key, component };
    } else {
      entry.defaults.push({ key, component });
    }
    groups.set(groupKey, entry);
  }

  if (componentSummaries.length === 0) {
    return {
      value: toValueRange(null, null),
      intercept: toValueRange(null, null),
      scaling: toValueRange(null, null),
      components: [],
      totalsMin: createDamageTotals(),
      totalsMax: createDamageTotals(),
    };
  }

  const minTotals = createDamageTotals();
  const maxTotals = createDamageTotals();

  for (const entry of groups.values()) {
    if (entry.min && entry.max) {
      addComponentToTotals(minTotals, entry.min.component);
      addComponentToTotals(maxTotals, entry.max.component);
    } else {
      const candidates = [
        ...entry.defaults,
        ...(entry.min ? [entry.min] : []),
        ...(entry.max ? [entry.max] : []),
      ];
      for (const { component } of candidates) {
        addComponentToTotals(minTotals, component);
        addComponentToTotals(maxTotals, component);
      }
    }
  }

  const value = toValueRange(
    computeDamageValue(minTotals.interceptBase, minTotals.scalingBase, baseSpirit),
    computeDamageValue(maxTotals.interceptMax, maxTotals.scalingMax, maxSpirit),
  );
  const intercept = toValueRange(minTotals.interceptBase, maxTotals.interceptMax);
  const scaling = toValueRange(
    isApproximatelyZero(minTotals.scalingBase) ? null : minTotals.scalingBase,
    isApproximatelyZero(maxTotals.scalingMax) ? null : maxTotals.scalingMax,
  );

  return {
    value,
    intercept,
    scaling,
    components: componentSummaries,
    totalsMin: minTotals,
    totalsMax: maxTotals,
  };
}

type AbilityPropertyUpgrade = NonNullable<
  NonNullable<AbilityItem["upgrades"]>[number]["property_upgrades"]
>[number];

function getDamageCategory(key: string): "burst" | "dps" {
  const normalized = key.toLowerCase();
  const dpsIndicators = [
    "persecond",
    "per_second",
    "per second",
    "pertick",
    "per_tick",
    "per tick",
    "dot",
    "damageovertime",
    "damage_over_time",
    "damage over time",
    "dps",
  ];

  if (dpsIndicators.some((indicator) => normalized.includes(indicator))) {
    return "dps";
  }

  return "burst";
}

function formatDamageComponentLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function isAbilityItem(item: DeadlockItem | undefined): item is AbilityItem {
  return Boolean(item && item.type === "ability");
}

function parseNumericValue(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    if (Number.isNaN(value)) {
      return null;
    }
    return value;
  }

  if (typeof value === "string") {
    const match = value.match(/-?\d+(?:\.\d+)?/);
    if (!match) {
      return null;
    }
    const parsed = Number.parseFloat(match[0]);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function parsePropertyValue(property: ItemProperty | undefined): number | null {
  if (!property) {
    return null;
  }
  return parseNumericValue(property.value);
}

function getSpiritScale(property: ItemProperty | undefined): number {
  const scaleFn = property?.scale_function;
  if (!scaleFn) {
    return 0;
  }

  const scalingStats = scaleFn.scaling_stats ?? [];
  const normalizedScalingStats = scalingStats
    .map((stat) => stat?.toLowerCase())
    .filter((stat): stat is string => Boolean(stat));
  const normalizedClass = (scaleFn.class_name ?? "").toLowerCase();
  const normalizedSubclass = (scaleFn.subclass_name ?? "").toLowerCase();
  const statScale =
    parseNumericValue(scaleFn.stat_scale) ?? parseNumericValue(scaleFn.stat_scale_secondary) ?? 0;

  if (scaleFn.specific_stat_scale_type === "ETechPower") {
    return statScale;
  }

  const referencesSpiritPower =
    normalizedScalingStats.includes("etechpower") ||
    normalizedClass.includes("tech_damage") ||
    normalizedClass.includes("techpower") ||
    normalizedSubclass.includes("tech_damage") ||
    normalizedSubclass.includes("techpower");

  if (!referencesSpiritPower) {
    return 0;
  }

  return statScale;
}

function stripHtml(content: string | null | undefined): string | null {
  if (!content) {
    return null;
  }
  return content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() || null;
}

function getImportantPropertyKeys(ability: AbilityItem): string[] {
  const keys = new Set<string>();
  const sections = ability.tooltip_details?.info_sections ?? [];

  for (const section of sections) {
    const blocks = section.properties_block ?? [];
    for (const block of blocks) {
      const properties = block.properties ?? [];
      for (const property of properties) {
        const key = property.important_property ?? property.property_name;
        if (key) {
          keys.add(key);
        }
      }
    }
  }

  return [...keys];
}

function isDamageProperty(key: string, property: ItemProperty | undefined): boolean {
  if (!property) {
    return false;
  }

  if (property.provided_property_type) {
    return false;
  }

  const normalized = key.toLowerCase();
  if (normalized.includes("damage")) {
    if (normalized.includes("taken") || normalized.includes("reduction")) {
      return false;
    }
    return true;
  }

  const cssClass = property.css_class ?? "";
  return cssClass.includes("damage");
}

function getPropertyUnit(property: ItemProperty | undefined): string | null {
  if (!property) {
    return null;
  }
  const postfix = property.postfix?.trim();
  if (postfix) {
    return postfix;
  }
  const postvalue = property.postvalue_label?.trim();
  if (postvalue) {
    return postvalue;
  }
  return null;
}

function isPercentProperty(key: string, property: ItemProperty | undefined): boolean {
  const unit = getPropertyUnit(property);
  if (unit === "%") {
    return true;
  }

  const normalizedKey = key.toLowerCase();
  if (normalizedKey.includes("percent") || normalizedKey.includes("pct")) {
    return true;
  }

  const label = property?.label?.toLowerCase() ?? "";
  if (label.includes("%") || label.includes("percent")) {
    return true;
  }

  const cssClass = property?.css_class?.toLowerCase() ?? "";
  if (cssClass.includes("percent") || cssClass.includes("pct")) {
    return true;
  }

  return false;
}

const abilityDamageKeyOverrides: Record<string, string[]> = {
  citadel_ability_lash_down_strike: ["StompDamage", "StompDamagePerMeterPrimary"],
  ability_bebop_stickybomb2: ["Damage"],
  citadel_ability_sticky_bomb: ["Damage"],
};

const abilityPerMeterAverages: Record<string, Record<string, number>> = {
  citadel_ability_lash_down_strike: {
    StompDamagePerMeterPrimary: 20,
  },
};

const abilityForcedNotes: Record<string, string> = {
  citadel_ability_lash_down_strike: "Ground Strike damage per meter is multiplied by a forced 20 m average height.",
};

const abilityComponentNotes: Record<string, Record<string, string>> = {
  citadel_ability_lash_down_strike: {
    StompDamagePerMeterPrimary: "20 m average height multiplier applied",
  },
};

const IGNORE_PERCENT_DAMAGE_ABILITIES = new Set<string>(["kinetic pulse"]);

function pickDamageKeys(ability: AbilityItem): string[] {
  const overrideKeys = abilityDamageKeyOverrides[ability.class_name];
  if (overrideKeys) {
    return overrideKeys;
  }

  const properties = ability.properties ?? {};
  const important = getImportantPropertyKeys(ability).filter((key) => isDamageProperty(key, properties[key]));

  if (important.length > 0) {
    return important;
  }

  return Object.keys(properties).filter((key) => isDamageProperty(key, properties[key]));
}

type ControlConfigEntry = {
  keys: readonly string[];
  type: AbilityCrowdControlType;
  label: string;
};

const CROWD_CONTROL_CONFIG: ControlConfigEntry[] = [
  { keys: ["StunDuration"], type: "stun", label: "Stun" },
  { keys: ["SleepDuration"], type: "stun", label: "Sleep" },
  { keys: ["PetrifyDuration"], type: "stun", label: "Petrify" },
  { keys: ["ImmobilizeDuration"], type: "immobilize", label: "Immobilize" },
  { keys: ["SilenceDuration"], type: "silence", label: "Silence" },
  { keys: ["TossDuration"], type: "displacement", label: "Displacement" },
];

const SLOW_PERCENT_KEYS = [
  "SlowPercent",
  "EnemySlowPct",
  "MoveSlowPercent",
  "MoveSpeedSlowPct",
  "MovementSlow",
  "FireRateSlow",
];

const SLOW_DURATION_KEYS = [
  "SlowDuration",
  "DebuffDuration",
  "AuraLingerDuration",
  "ZiplineProtectionSlowDurationOnHit",
  "LingerDuration",
];

type AbilityModifierConfig = {
  summaryKey: AbilityModifierSummaryKey;
  label: string;
  type: AbilityModifierCategory;
  target: "self" | "ally" | "enemy";
  unit?: string;
  absolute?: boolean;
  keys?: readonly string[];
  providedTypes?: readonly string[];
};

const ABILITY_MODIFIER_CONFIGS: AbilityModifierConfig[] = [
  {
    summaryKey: "weaponDamage",
    label: "Weapon Damage",
    type: "buff",
    target: "self",
    unit: "%",
    keys: ["WeaponPower", "WeaponPowerBuff"],
    providedTypes: ["MODIFIER_VALUE_WEAPON_POWER"],
  },
  {
    summaryKey: "spiritPower",
    label: "Spirit Power",
    type: "buff",
    target: "self",
    keys: ["TechPower"],
    providedTypes: ["MODIFIER_VALUE_TECH_POWER"],
  },
  {
    summaryKey: "bulletResist",
    label: "Bullet Resist",
    type: "buff",
    target: "self",
    unit: "%",
    keys: ["BulletResist"],
  },
  {
    summaryKey: "spiritResist",
    label: "Spirit Resist",
    type: "buff",
    target: "self",
    unit: "%",
    keys: ["TechResist"],
  },
  {
    summaryKey: "damageAmpAll",
    label: "Damage Amp (All)",
    type: "amp",
    target: "enemy",
    unit: "%",
    providedTypes: [
      "MODIFIER_VALUE_DAMAGE_PERCENT",
      "MODIFIER_VALUE_DAMAGE_TAKEN_INCREASE_PERCENT",
      "MODIFIER_VALUE_INCOMING_DAMAGE_PERCENTAGE",
    ],
  },
  {
    summaryKey: "damageAmpGun",
    label: "Damage Amp (Gun)",
    type: "buff",
    target: "self",
    unit: "%",
    providedTypes: [
      "MODIFIER_VALUE_BASE_BULLET_DAMAGE_PERCENT",
      "MODIFIER_VALUE_BONUS_WEAPON_DAMAGE_CLOSE_RANGE_MAX_RANGE",
      "MODIFIER_VALUE_BONUS_WEAPON_DAMAGE_LONG_RANGE_MIN_RANGE",
      "MODIFIER_VALUE_CLOSE_RANGE_BONUS_BASE_DAMAGE_PERCENT",
      "MODIFIER_VALUE_LONG_RANGE_BONUS_BASE_DAMAGE_PERCENT",
      "MODIFIER_VALUE_BULLET_DAMAGE_TAKEN_INCREASE_PERCENT",
    ],
  },
  {
    summaryKey: "damageAmpSpirit",
    label: "Damage Amp (Spirit)",
    type: "amp",
    target: "enemy",
    unit: "%",
    providedTypes: ["MODIFIER_VALUE_TECH_DAMAGE_PERCENT", "MODIFIER_VALUE_TECH_POWER_PERCENT"],
  },
  {
    summaryKey: "gunShred",
    label: "Gun Shred",
    type: "shred",
    target: "enemy",
    unit: "%",
    absolute: true,
    keys: ["BulletArmorReduction"],
    providedTypes: ["MODIFIER_VALUE_BULLET_ARMOR_DAMAGE_RESIST_REDUCTION"],
  },
  {
    summaryKey: "spiritShred",
    label: "Spirit Shred",
    type: "shred",
    target: "enemy",
    unit: "%",
    absolute: true,
    providedTypes: ["MODIFIER_VALUE_TECH_ARMOR_DAMAGE_RESIST_REDUCTION"],
  },
];

function normalizeNumberValue(value: number | null | undefined): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (Number.isNaN(value)) {
    return null;
  }
  return value;
}

function toValueRange(base: number | null | undefined, max: number | null | undefined): AbilityValueRange {
  const normalizedBase = normalizeNumberValue(base);
  const normalizedMax = normalizeNumberValue(max);

  if (normalizedBase === null && normalizedMax === null) {
    return { base: null, max: null };
  }

  if (normalizedBase === null) {
    return { base: normalizedMax, max: normalizedMax };
  }

  if (normalizedMax === null) {
    return { base: normalizedBase, max: normalizedBase };
  }

  return { base: normalizedBase, max: normalizedMax };
}

function isApproximatelyZero(value: number | null | undefined, epsilon = 1e-6): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  return Math.abs(value) <= epsilon;
}

function pruneZeroRange(range: AbilityValueRange | undefined): AbilityValueRange | null {
  if (!range) {
    return null;
  }

  const base = isApproximatelyZero(range.base) ? null : range.base;
  const max = isApproximatelyZero(range.max) ? null : range.max;

  if (base === null && max === null) {
    return null;
  }

  return { base, max };
}

function computeDamageValue(intercept: number | null, scaling: number | null, spirit: number): number | null {
  if (intercept === null && scaling === null) {
    return null;
  }
  const normalizedIntercept = intercept ?? 0;
  const normalizedScaling = scaling ?? 0;
  return normalizedIntercept + normalizedScaling * spirit;
}

function getMaxRange(ranges: Array<AbilityValueRange | undefined>): AbilityValueRange | undefined {
  let base: number | null = null;
  let max: number | null = null;

  for (const range of ranges) {
    if (!range) {
      continue;
    }
    if (range.base !== null && !isApproximatelyZero(range.base)) {
      base = base === null ? range.base : Math.max(base, range.base);
    }
    if (range.max !== null && !isApproximatelyZero(range.max)) {
      max = max === null ? range.max : Math.max(max, range.max);
    }
  }

  if (base === null && max === null) {
    return undefined;
  }

  if (base === null) {
    base = max ?? null;
  }
  if (max === null) {
    max = base;
  }

  return {
    base,
    max,
  };
}

type ModifierAccumulator = {
  base: number;
  max: number;
  hasBase: boolean;
  hasMax: boolean;
  scaleBase: number;
  scaleMax: number;
  hasScaleBase: boolean;
  hasScaleMax: boolean;
};

function createModifierAccumulator(): ModifierAccumulator {
  return {
    base: 0,
    max: 0,
    hasBase: false,
    hasMax: false,
    scaleBase: 0,
    scaleMax: 0,
    hasScaleBase: false,
    hasScaleMax: false,
  };
}

function addToModifierAccumulator(
  accumulator: ModifierAccumulator,
  stats: { base: number | null; baseMax: number | null; scale: number; scaleMax: number },
  options: { absolute?: boolean } = {},
) {
  const absolute = options.absolute ?? false;

  if (stats.base !== null) {
    accumulator.base += absolute ? Math.abs(stats.base) : stats.base;
    accumulator.hasBase = true;
  }

  if (stats.baseMax !== null) {
    accumulator.max += absolute ? Math.abs(stats.baseMax) : stats.baseMax;
    accumulator.hasMax = true;
  } else if (stats.base !== null) {
    accumulator.max += absolute ? Math.abs(stats.base) : stats.base;
    accumulator.hasMax = true;
  }

  if (stats.scale !== 0) {
    accumulator.scaleBase += stats.scale;
    accumulator.hasScaleBase = true;
  }

  if (stats.scaleMax !== 0) {
    accumulator.scaleMax += stats.scaleMax;
    accumulator.hasScaleMax = true;
  }
}

function finalizeModifierEffect(
  config: AbilityModifierConfig,
  accumulator: ModifierAccumulator,
): AbilityModifierEffect | null {
  if (
    !accumulator.hasBase &&
    !accumulator.hasMax &&
    !accumulator.hasScaleBase &&
    !accumulator.hasScaleMax
  ) {
    return null;
  }

  const valueRange = pruneZeroRange(
    toValueRange(
      accumulator.hasBase ? accumulator.base : null,
      accumulator.hasMax ? accumulator.max : null,
    ),
  );
  const scalingRange = pruneZeroRange(
    toValueRange(
      accumulator.hasScaleBase ? accumulator.scaleBase : null,
      accumulator.hasScaleMax ? accumulator.scaleMax : null,
    ),
  );

  if (!valueRange && !scalingRange) {
    return null;
  }

  return {
    key: config.summaryKey,
    label: config.label,
    stat: config.label,
    type: config.type,
    target: config.target,
    value: valueRange ?? { base: null, max: null },
    scaling: scalingRange ?? { base: null, max: null },
    unit: config.unit,
  };
}

function extractPrimaryValue(effect: AbilityModifierEffect | undefined): number | null {
  if (!effect) {
    return null;
  }
  const base = effect.value.base;
  const max = effect.value.max;
  if (base === null && max === null) {
    return null;
  }
  if (base === null) {
    return max;
  }
  if (max === null) {
    return base;
  }
  return Math.abs(max) >= Math.abs(base) ? max : base;
}

export function buildHeroAbilityRows(heroes: Hero[], items: DeadlockItem[]): HeroAbilityRow[] {
  const itemByClassName = new Map(items.map((item) => [item.class_name, item]));

  return heroes
    .flatMap((hero) => {
      const heroItems = hero.items ?? {};
      const heroImage = hero.images?.icon_image_small ?? hero.images?.icon_hero_card ?? null;
      const isDisabled = Boolean(hero.disabled);
      const baseSpiritPower = parseNumericValue(hero.starting_stats?.spirit_power?.value) ?? 0;

      const spiritGain = hero.standard_level_up_upgrades?.MODIFIER_VALUE_TECH_POWER ?? 0;
      const levelNumbers = Object.keys(hero.level_info ?? {})
        .map((level) => Number.parseInt(level, 10))
        .filter((level) => Number.isFinite(level));
      const maxLevel = levelNumbers.length > 0 ? Math.max(...levelNumbers) : 1;
      const levelIncrements = Math.max(maxLevel - 1, 0);
      const totalSpiritAtMaxLevel = baseSpiritPower + spiritGain * levelIncrements;

      return Object.entries(heroItems)
        .filter(([slot]) => slot.startsWith("signature"))
        .map(([slot, abilityClass]) => {
          const abilityItem = itemByClassName.get(abilityClass);
          if (!isAbilityItem(abilityItem)) {
            return null;
          }

          const properties = abilityItem.properties ?? {};
          const normalizedAbilityName = abilityItem.name?.trim().toLowerCase() ?? "";
          const propertyUpgradeMap = new Map<string, AbilityPropertyUpgrade[]>();

          for (const upgrade of abilityItem.upgrades ?? []) {
            for (const propertyUpgrade of upgrade?.property_upgrades ?? []) {
              if (!propertyUpgrade?.name) continue;
              const list = propertyUpgradeMap.get(propertyUpgrade.name) ?? [];
              list.push(propertyUpgrade);
              propertyUpgradeMap.set(propertyUpgrade.name, list);
            }
          }

          const computeMultiplier = (bonus: number) => {
            const absBonus = Math.abs(bonus);
            if (absBonus === 0) return 1;
            if (absBonus > 10) {
              return 1 + bonus / 100;
            }
            return bonus;
          };

          const getPropertyStats = (key: string) => {
            const property = properties[key];
            const base = parsePropertyValue(property);
            const baseScale = getSpiritScale(property);
            let baseMax = base;
            let scaleMax = baseScale;

            const upgrades = propertyUpgradeMap.get(key) ?? [];

            for (const upgrade of upgrades) {
              const bonus = parseNumericValue(upgrade?.bonus);
              if (bonus === null) {
                continue;
              }

              const type = upgrade?.upgrade_type ?? (upgrade?.scale_stat_filter ? "EAddToScale" : undefined);

              switch (type) {
                case "EAddToBase":
                case undefined: {
                  baseMax = (baseMax ?? 0) + bonus;
                  break;
                }
                case "EAddToScale": {
                  if (upgrade?.scale_stat_filter && upgrade.scale_stat_filter !== "ETechPower") {
                    baseMax = (baseMax ?? 0) + bonus;
                  } else {
                    scaleMax += bonus;
                  }
                  break;
                }
                case "EMultiplyBase": {
                  if (baseMax !== null) {
                    baseMax *= computeMultiplier(bonus);
                  }
                  break;
                }
                case "EMultiplyScale": {
                  scaleMax *= computeMultiplier(bonus);
                  break;
                }
                default: {
                  baseMax = (baseMax ?? 0) + bonus;
                }
              }
            }

            return {
              base,
              scale: baseScale,
              baseMax,
              scaleMax,
            };
          };

          const getPropertyStatsFromKeys = (keys: readonly string[]) => {
            for (const key of keys) {
              if (properties[key] || propertyUpgradeMap.has(key)) {
                return getPropertyStats(key);
              }
            }
            return {
              base: null,
              scale: 0,
              baseMax: null,
              scaleMax: 0,
            };
          };

          const ignorePercentDamage = IGNORE_PERCENT_DAMAGE_ABILITIES.has(normalizedAbilityName);

          const damageKeys = pickDamageKeys(abilityItem);

          const damageComponents: HeroAbilityRow["damageComponents"] = {};
          const assumptionNotes = new Set<string>();

          for (const key of damageKeys) {
            if (!properties[key] && !propertyUpgradeMap.has(key)) {
              continue;
            }
            const property = properties[key];
            const unitFromProperty = getPropertyUnit(property);
            const isPercentComponent = isPercentProperty(key, property);
            if (ignorePercentDamage && isPercentComponent) {
              continue;
            }
            const stats = getPropertyStats(key);
            const perMeterMultiplier = abilityPerMeterAverages[abilityItem.class_name]?.[key] ?? null;
            const shouldApplyMeterMultiplier = perMeterMultiplier !== null && !isPercentComponent;
            const adjustedStats =
              shouldApplyMeterMultiplier
                ? {
                    base: stats.base !== null ? stats.base * perMeterMultiplier : null,
                    baseMax: stats.baseMax !== null ? stats.baseMax * perMeterMultiplier : null,
                    scale: stats.scale * perMeterMultiplier,
                    scaleMax: stats.scaleMax * perMeterMultiplier,
                  }
                : stats;
            if (shouldApplyMeterMultiplier) {
              const forcedNote = abilityForcedNotes[abilityItem.class_name];
              if (forcedNote) {
                assumptionNotes.add(forcedNote);
              }
            }

            const category = getDamageCategory(key);
            const label = formatDamageComponentLabel(key);
            const normalizedKey = key.toLowerCase();
            const labelLower = label.toLowerCase();
            const isAmpLikePercent =
              isPercentComponent &&
              (normalizedKey.includes("damageamp") ||
                normalizedKey.includes("damage_amp") ||
                normalizedKey.includes("damageamppercent") ||
                normalizedKey.includes("damagepercent") ||
                normalizedKey.includes("damage_percent") ||
                normalizedKey.includes("damageboost") ||
                normalizedKey.includes("damage_boost") ||
                normalizedKey.includes("weaponpower") ||
                normalizedKey.includes("weapon_damage") ||
                normalizedKey.includes("gun_damage") ||
                normalizedKey.includes("damagebuff") ||
                normalizedKey.includes("damage_buff") ||
                labelLower.includes("amp") ||
                labelLower.includes("damage buff") ||
                labelLower.includes("damage boost"));
            if (isAmpLikePercent) {
              continue;
            }
            const inferredUnit = unitFromProperty ?? (isPercentComponent ? "%" : null);

            damageComponents[key] = {
              label,
              damageBase: adjustedStats.base,
              damageMax: adjustedStats.baseMax ?? adjustedStats.base ?? null,
              scalingBase: adjustedStats.scale !== 0 ? adjustedStats.scale : null,
              scalingMax: adjustedStats.scaleMax !== 0 ? adjustedStats.scaleMax : null,
              category,
              note:
                abilityComponentNotes[abilityItem.class_name]?.[key] ??
                (shouldApplyMeterMultiplier && perMeterMultiplier !== null
                  ? `Scaled by ${perMeterMultiplier} m average height`
                  : undefined),
              unit: inferredUnit ?? undefined,
              isPercent: isPercentComponent,
            };
          }

          const burstDamageComponentOrder = Object.keys(damageComponents)
            .filter((key) => damageComponents[key]?.category === "burst")
            .sort((a, b) => formatDamageComponentLabel(a).localeCompare(formatDamageComponentLabel(b)));
          const dpsDamageComponentOrder = Object.keys(damageComponents)
            .filter((key) => damageComponents[key]?.category === "dps")
            .sort((a, b) => formatDamageComponentLabel(a).localeCompare(formatDamageComponentLabel(b)));

          const chargesStats = getPropertyStatsFromKeys(["AbilityCharges", "AbilityMaxCharges"]);
          const chargesBase = chargesStats.base;
          const chargesMax = chargesStats.baseMax ?? chargesBase ?? null;
          const chargesBaseNormalized = chargesBase !== null ? Math.max(chargesBase, 1) : 1;
          const chargesMaxNormalized = chargesMax !== null ? Math.max(chargesMax, 1) : chargesBaseNormalized;

          const cooldownStats = getPropertyStatsFromKeys(["AbilityCooldown"]);
          const cooldownBase = cooldownStats.base;
          const cooldownMax = cooldownStats.baseMax ?? cooldownBase ?? null;

          const durationStats = getPropertyStatsFromKeys(["AbilityDuration", "Duration"]);
          const durationBase = durationStats.base;
          const durationMax = durationStats.baseMax ?? durationBase ?? null;

          const burstAggregate = aggregateDamageCategory({
            componentKeys: burstDamageComponentOrder,
            components: damageComponents,
            baseSpirit: baseSpiritPower,
            maxSpirit: totalSpiritAtMaxLevel,
          });

          const sustainedAggregate = aggregateDamageCategory({
            componentKeys: dpsDamageComponentOrder,
            components: damageComponents,
            baseSpirit: baseSpiritPower,
            maxSpirit: totalSpiritAtMaxLevel,
          });

          const burstDamageBase = burstAggregate.value.base;
          const burstDamageMax = burstAggregate.value.max;

          const burstDpmBase =
            burstDamageBase !== null && cooldownBase !== null && cooldownBase > 0
              ? (burstDamageBase * chargesBaseNormalized * 60) / cooldownBase
              : null;
          const burstDpmMax =
            burstDamageMax !== null && cooldownMax !== null && cooldownMax > 0
              ? (burstDamageMax * chargesMaxNormalized * 60) / cooldownMax
              : null;

          const sustainedDpsBase = sustainedAggregate.value.base;
          const sustainedDpsMax = sustainedAggregate.value.max;

          const burstScalingBase =
            burstAggregate.scaling.base !== null && !isApproximatelyZero(burstAggregate.scaling.base)
              ? burstAggregate.scaling.base
              : null;
          const burstScalingMax =
            burstAggregate.scaling.max !== null && !isApproximatelyZero(burstAggregate.scaling.max)
              ? burstAggregate.scaling.max
              : null;
          const sustainedScalingBase =
            sustainedAggregate.scaling.base !== null && !isApproximatelyZero(sustainedAggregate.scaling.base)
              ? sustainedAggregate.scaling.base
              : null;
          const sustainedScalingMax =
            sustainedAggregate.scaling.max !== null && !isApproximatelyZero(sustainedAggregate.scaling.max)
              ? sustainedAggregate.scaling.max
              : null;

          const totalScalingBaseSum =
            (burstAggregate.scaling.base ?? 0) + (sustainedAggregate.scaling.base ?? 0);
          const totalScalingMaxSum =
            (burstAggregate.scaling.max ?? 0) + (sustainedAggregate.scaling.max ?? 0);
          const spiritScalingBase = isApproximatelyZero(totalScalingBaseSum) ? null : totalScalingBaseSum;
          const spiritScalingMax = isApproximatelyZero(totalScalingMaxSum) ? null : totalScalingMaxSum;

          const burstDamageSummary: AbilityDamageSummary = {
            type: "burst",
            unit: "total",
            value: burstAggregate.value,
            intercept: burstAggregate.intercept,
            scaling: burstAggregate.scaling,
            perMinute: toValueRange(burstDpmBase, burstDpmMax),
            components: burstAggregate.components,
            totals: {
              min: burstAggregate.totalsMin,
              max: burstAggregate.totalsMax,
            },
          };

          const sustainedDamageSummary: AbilityDamageSummary = {
            type: "sustained",
            unit: "perSecond",
            value: sustainedAggregate.value,
            intercept: sustainedAggregate.intercept,
            scaling: sustainedAggregate.scaling,
            components: sustainedAggregate.components,
            totals: {
              min: sustainedAggregate.totalsMin,
              max: sustainedAggregate.totalsMax,
            },
          };

          const controlEffects: AbilityCrowdControlEffect[] = [];

          for (const config of CROWD_CONTROL_CONFIG) {
            const stats = getPropertyStatsFromKeys(config.keys);
            const durationRange = pruneZeroRange(
              toValueRange(stats.base, stats.baseMax ?? stats.base),
            );
            if (!durationRange) {
              continue;
            }
            controlEffects.push({
              key: config.keys[0],
              label: config.label,
              type: config.type,
              duration: durationRange,
            });
          }

          const slowMagnitudeStats = getPropertyStatsFromKeys(SLOW_PERCENT_KEYS);
          const slowDurationStats = getPropertyStatsFromKeys(SLOW_DURATION_KEYS);
          const slowMagnitudeRange = pruneZeroRange(
            toValueRange(slowMagnitudeStats.base, slowMagnitudeStats.baseMax ?? slowMagnitudeStats.base),
          );
          const slowDurationRange = pruneZeroRange(
            toValueRange(slowDurationStats.base, slowDurationStats.baseMax ?? slowDurationStats.base),
          );

          if (slowMagnitudeRange) {
            controlEffects.push({
              key: "Slow",
              label: "Slow",
              type: "slow",
              duration: slowDurationRange ?? { base: null, max: null },
              magnitude: slowMagnitudeRange,
              magnitudeUnit: "%",
            });
          }

          const controlSummary: AbilityControlMetrics["summary"] = {};
          const stunSummary = getMaxRange(
            controlEffects.filter((effect) => effect.type === "stun").map((effect) => effect.duration),
          );
          if (stunSummary) {
            controlSummary.stun = stunSummary;
          }
          const silenceSummary = getMaxRange(
            controlEffects.filter((effect) => effect.type === "silence").map((effect) => effect.duration),
          );
          if (silenceSummary) {
            controlSummary.silence = silenceSummary;
          }
          const immobilizeSummary = getMaxRange(
            controlEffects.filter((effect) => effect.type === "immobilize").map((effect) => effect.duration),
          );
          if (immobilizeSummary) {
            controlSummary.immobilize = immobilizeSummary;
          }
          const displacementSummary = getMaxRange(
            controlEffects.filter((effect) => effect.type === "displacement").map((effect) => effect.duration),
          );
          if (displacementSummary) {
            controlSummary.displacement = displacementSummary;
          }
          const slowEffects = controlEffects.filter((effect) => effect.type === "slow");
          const slowMagnitudeSummary = getMaxRange(slowEffects.map((effect) => effect.magnitude));
          const slowDurationSummary = getMaxRange(slowEffects.map((effect) => effect.duration));
          if (slowMagnitudeSummary || slowDurationSummary) {
            controlSummary.slow = {
              magnitude: slowMagnitudeSummary,
              duration: slowDurationSummary,
            };
          }

          const modifierAccumulators = new Map<AbilityModifierSummaryKey, ModifierAccumulator>();

          const pushModifierStats = (
            summaryKey: AbilityModifierSummaryKey,
            stats: { base: number | null; baseMax: number | null; scale: number; scaleMax: number },
            config: AbilityModifierConfig,
          ) => {
            const accumulator = modifierAccumulators.get(summaryKey) ?? createModifierAccumulator();
            addToModifierAccumulator(accumulator, stats, { absolute: config.absolute });
            modifierAccumulators.set(summaryKey, accumulator);
          };

          for (const config of ABILITY_MODIFIER_CONFIGS) {
            const relevantKeys = new Set<string>();
            for (const key of config.keys ?? []) {
              if (properties[key] || propertyUpgradeMap.has(key)) {
                relevantKeys.add(key);
              }
            }
            if (config.providedTypes) {
              for (const [propertyKey, property] of Object.entries(properties)) {
                if (property?.provided_property_type && config.providedTypes.includes(property.provided_property_type)) {
                  relevantKeys.add(propertyKey);
                }
              }
            }
            for (const key of relevantKeys) {
              const stats = getPropertyStats(key);
              if (
                stats.base === null &&
                stats.baseMax === null &&
                stats.scale === 0 &&
                stats.scaleMax === 0
              ) {
                continue;
              }
              pushModifierStats(config.summaryKey, stats, config);
            }
          }

          const modifierEffects: AbilityModifierEffect[] = [];
          const modifierSummaryMap: Partial<Record<AbilityModifierSummaryKey, AbilityModifierEffect>> = {};
          for (const config of ABILITY_MODIFIER_CONFIGS) {
            const accumulator = modifierAccumulators.get(config.summaryKey);
            if (!accumulator) {
              continue;
            }
            const effect = finalizeModifierEffect(config, accumulator);
            if (!effect) {
              continue;
            }
            modifierEffects.push(effect);
            modifierSummaryMap[config.summaryKey] = effect;
          }
          modifierEffects.sort((a, b) => a.label.localeCompare(b.label));

          const modifiers: AbilityModifierSummary = {
            effects: modifierEffects,
            summary: modifierSummaryMap,
          };

          const metrics: AbilityMetrics = {
            cadence: {
              cooldown: toValueRange(cooldownBase, cooldownMax),
              duration: toValueRange(durationBase, durationMax),
              charges: toValueRange(chargesBase, chargesMax),
            },
            damage: {
              burst: burstDamageSummary,
              sustained: sustainedDamageSummary,
            },
            control: {
              effects: controlEffects,
              summary: controlSummary,
            },
            modifiers,
          };

          const tags = new Set<AbilityTag>();
          if (burstDamageComponentOrder.length > 0) {
            tags.add("burst");
          }
          if (dpsDamageComponentOrder.length > 0) {
            tags.add("sustained");
          }
          if (controlEffects.length > 0) {
            tags.add("crowd-control");
          }
          if (modifiers.effects.some((effect) => effect.type === "buff")) {
            tags.add("buff");
          }
          if (
            modifiers.effects.some(
              (effect) => effect.type === "debuff" || effect.type === "amp" || effect.type === "shred",
            )
          ) {
            tags.add("debuff");
          }

          const abilityDescription = stripHtml(abilityItem.description?.desc);

          return {
            heroId: hero.id,
            heroName: hero.name,
            heroImage,
            isDisabled,
            hasBurstComponents: burstDamageComponentOrder.length > 0,
            hasDpsComponents: dpsDamageComponentOrder.length > 0,
            abilitySlot: slot,
            abilityName: abilityItem.name,
            abilityType: abilityItem.ability_type ?? null,
            abilityDescription,
            baseSpiritPower,
            maxSpiritPower: totalSpiritAtMaxLevel,
            spiritGain,
            maxLevel,
            cooldownBase,
            cooldownMax,
            durationBase,
            durationMax,
            chargesBase,
            chargesMax,
            burstDamageBase,
            burstDamageMax,
            burstScalingBase,
            burstScalingMax,
            burstDpmBase,
            burstDpmMax,
            sustainedDpsBase,
            sustainedDpsMax,
            sustainedScalingBase,
            sustainedScalingMax,
            spiritScalingBase,
            spiritScalingMax,
            gunShredTotal: extractPrimaryValue(modifiers.summary.gunShred),
            spiritShredTotal: extractPrimaryValue(modifiers.summary.spiritShred),
            damageAmpAll: extractPrimaryValue(modifiers.summary.damageAmpAll),
            damageAmpGun: extractPrimaryValue(modifiers.summary.damageAmpGun),
            damageAmpSpirit: extractPrimaryValue(modifiers.summary.damageAmpSpirit),
            damageComponents,
            burstDamageComponentOrder,
            dpsDamageComponentOrder,
            assumptionNotes: Array.from(assumptionNotes),
            metrics,
            tags: Array.from(tags),
          } satisfies HeroAbilityRow;
        })
        .filter((row): row is HeroAbilityRow => row !== null);
    })
    .sort((a, b) => {
      if (a.heroName === b.heroName) {
        return a.abilityName.localeCompare(b.abilityName);
      }
      return a.heroName.localeCompare(b.heroName);
    });
}


