import { DeadlockItem, AbilityItem, Hero, ItemProperty } from "@/lib/types";

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
  burstDpmBase: number | null;
  burstDpmMax: number | null;
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
      damageBase: number | null;
      damageMax: number | null;
      scalingBase: number | null;
      scalingMax: number | null;
      category: "burst" | "dps";
    }
  >;
  burstDamageComponentOrder: string[];
  dpsDamageComponentOrder: string[];
};

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

  if (scaleFn.specific_stat_scale_type !== "ETechPower") {
    return 0;
  }

  return (
    parseNumericValue(scaleFn.stat_scale) ?? parseNumericValue(scaleFn.stat_scale_secondary) ?? 0
  );
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

function pickDamageKeys(ability: AbilityItem): string[] {
  const properties = ability.properties ?? {};
  const important = getImportantPropertyKeys(ability).filter((key) => isDamageProperty(key, properties[key]));

  if (important.length > 0) {
    return important;
  }

  return Object.keys(properties).filter((key) => isDamageProperty(key, properties[key]));
}

function sumByProvidedTypes(
  properties: Record<string, ItemProperty | undefined>,
  types: readonly string[],
  options: { absolute?: boolean } = {},
): number | null {
  let total = 0;
  let matched = false;

  for (const property of Object.values(properties)) {
    if (!property?.provided_property_type) {
      continue;
    }
    if (!types.includes(property.provided_property_type)) {
      continue;
    }
    const value = parsePropertyValue(property);
    if (value === null) {
      continue;
    }
    matched = true;
    total += options.absolute ? Math.abs(value) : value;
  }

  return matched ? total : null;
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

          const damageKeys = pickDamageKeys(abilityItem);

          let baseDamageSum = 0;
          let baseDamageMaxSum = 0;
          let scalingBaseSum = 0;
          let scalingMaxSum = 0;
          const damageComponents: HeroAbilityRow["damageComponents"] = {};

          for (const key of damageKeys) {
            if (!properties[key] && !propertyUpgradeMap.has(key)) {
              continue;
            }
            const stats = getPropertyStats(key);
            if (stats.base !== null) {
              baseDamageSum += stats.base;
            }
            if (stats.baseMax !== null) {
              baseDamageMaxSum += stats.baseMax;
            } else if (stats.base !== null) {
              baseDamageMaxSum += stats.base;
            }
            scalingBaseSum += stats.scale;
            scalingMaxSum += stats.scaleMax;

            damageComponents[key] = {
              damageBase: stats.base,
              damageMax: stats.baseMax ?? stats.base ?? null,
              scalingBase: stats.scale !== 0 ? stats.scale : null,
              scalingMax: stats.scaleMax !== 0 ? stats.scaleMax : null,
              category: getDamageCategory(key),
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

          const baseDamageTotal = baseDamageSum + scalingBaseSum * baseSpiritPower;
          const maxDamageTotal = baseDamageMaxSum + scalingMaxSum * totalSpiritAtMaxLevel;

          const burstDamageBase = damageKeys.length > 0 ? baseDamageTotal : null;
          const burstDamageMax = damageKeys.length > 0 ? maxDamageTotal : null;

          const burstDpmBase =
            burstDamageBase !== null && cooldownBase !== null && cooldownBase > 0
              ? (burstDamageBase * chargesBaseNormalized * 60) / cooldownBase
              : null;
          const burstDpmMax =
            burstDamageMax !== null && cooldownMax !== null && cooldownMax > 0
              ? (burstDamageMax * chargesMaxNormalized * 60) / cooldownMax
              : null;

          const spiritScalingBase = scalingBaseSum !== 0 ? scalingBaseSum : null;
          const spiritScalingMax = scalingMaxSum !== 0 ? scalingMaxSum : null;

          const gunShredTotal = sumByProvidedTypes(properties, ["MODIFIER_VALUE_BULLET_ARMOR_DAMAGE_RESIST_REDUCTION"], {
            absolute: true,
          });

          const spiritShredTotal = sumByProvidedTypes(properties, ["MODIFIER_VALUE_TECH_ARMOR_DAMAGE_RESIST_REDUCTION"], {
            absolute: true,
          });

          const damageAmpAll = sumByProvidedTypes(
            properties,
            [
              "MODIFIER_VALUE_DAMAGE_PERCENT",
              "MODIFIER_VALUE_DAMAGE_TAKEN_INCREASE_PERCENT",
              "MODIFIER_VALUE_INCOMING_DAMAGE_PERCENTAGE",
            ],
          );

          const damageAmpGun = sumByProvidedTypes(
            properties,
            [
              "MODIFIER_VALUE_BASE_BULLET_DAMAGE_PERCENT",
              "MODIFIER_VALUE_BONUS_WEAPON_DAMAGE_CLOSE_RANGE_MAX_RANGE",
              "MODIFIER_VALUE_BONUS_WEAPON_DAMAGE_LONG_RANGE_MIN_RANGE",
              "MODIFIER_VALUE_CLOSE_RANGE_BONUS_BASE_DAMAGE_PERCENT",
              "MODIFIER_VALUE_LONG_RANGE_BONUS_BASE_DAMAGE_PERCENT",
              "MODIFIER_VALUE_BULLET_DAMAGE_TAKEN_INCREASE_PERCENT",
            ],
          );

          const damageAmpSpirit = sumByProvidedTypes(properties, ["MODIFIER_VALUE_TECH_DAMAGE_PERCENT", "MODIFIER_VALUE_TECH_POWER_PERCENT"]);

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
            burstDpmBase,
            burstDpmMax,
            spiritScalingBase,
            spiritScalingMax,
            gunShredTotal,
            spiritShredTotal,
            damageAmpAll,
            damageAmpGun,
            damageAmpSpirit,
            damageComponents,
            burstDamageComponentOrder,
            dpsDamageComponentOrder,
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


