import { DeadlockItem, Hero, PurchaseBonus, WeaponItem } from "@/lib/types";

export type SpiritScalingDetail = {
  statKey: string;
  displayName: string;
  ratioPerSpirit: number;
  maxBonusAtMaxLevel: number;
};

export type HeroGrowthRow = {
  heroId: number;
  heroName: string;
  heroImage: string | null;
  isDisabled: boolean;
  baseBulletDamage: number | null;
  pellets: number | null;
  pelletExceptionNote: string | null;
  altFireName: string | null;
  altFireDamage: number | null;
  altFirePellets: number | null;
  baseAmmo: number | null;
  baseFireRate: number | null;
  baseDps: number | null;
  baseSpinDps: number | null;
  dpm: number | null;
  falloffRangeMin: number | null;
  falloffRangeMax: number | null;
  baseHp: number | null;
  baseRegen: number | null;
  baseMoveSpeed: number | null;
  baseSprint: number | null;
  baseStamina: number | null;
  maxHealthWithBoons: number | null;
  maxRegenWithBoons: number | null;
  maxRegenWithBoonsAndSpirit: number | null;
  maxSprintWithBoons: number | null;
  maxSprintWithBoonsAndSpirit: number | null;
  maxMoveSpeedWithBoons: number | null;
  maxMoveSpeedWithBoonsAndSpirit: number | null;
  dmgGain: number | null;
  hpGain: number | null;
  spiritGain: number | null;
  totalSpiritAtMaxLevel: number;
  maxLevelHp: number | null;
  maxGunDamage: number | null;
  maxGunDps: number | null;
  maxSpinGunDps: number | null;
  spiritBulletDamageBonus: number | null;
  spiritRoundsPerSecondBonus: number | null;
  maxGunDamageWithSpirit: number | null;
  maxGunDpsWithSpirit: number | null;
  maxSpinGunDpsWithSpirit: number | null;
  maxDpm: number | null;
  dpsGrowthPercent: number | null;
  hpGrowthPercent: number | null;
  spiritDetails: SpiritScalingDetail[];
  spiritScaling2: number | null;
  spiritRatio2: number | null;
  spiritBonus2: number | null;
};

function isWeaponItem(item: DeadlockItem | undefined): item is WeaponItem {
  return Boolean(item && item.type === "weapon");
}

function safeDivision(numerator: number | null, denominator: number | null): number | null {
  if (
    numerator === null ||
    numerator === undefined ||
    denominator === null ||
    denominator === undefined ||
    denominator === 0
  ) {
    return null;
  }

  return numerator / denominator;
}

function formatStatName(statKey: string): string {
  if (!statKey) return "Unknown";

  let normalized = statKey;
  if (normalized.startsWith("E")) {
    normalized = normalized.slice(1);
  }

  normalized = normalized.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");

  return normalized
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function parseNumericValue(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
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

function normalizePurchaseBonusList(list: PurchaseBonus[] | null | undefined): PurchaseBonus[] {
  if (!Array.isArray(list)) {
    return [];
  }
  return list.filter((entry): entry is PurchaseBonus => Boolean(entry));
}

function sumPurchaseBonusValues(
  list: PurchaseBonus[] | null | undefined,
  valueTypes: readonly string[],
): number {
  if (!valueTypes.length) {
    return 0;
  }

  const normalized = normalizePurchaseBonusList(list);

  return normalized.reduce((total, bonus) => {
    if (!bonus?.value_type || !valueTypes.includes(bonus.value_type)) {
      return total;
    }
    const parsed = parseNumericValue(bonus.value);
    return parsed !== null ? total + parsed : total;
  }, 0);
}

function applyFlatAndPercentBonuses(base: number | null, flatBonus: number, percentBonus: number): number | null {
  if (base === null || base === undefined) {
    return null;
  }

  let adjusted = base;

  if (flatBonus !== 0) {
    adjusted += flatBonus;
  }

  if (percentBonus !== 0) {
    adjusted *= 1 + percentBonus / 100;
  }

  return adjusted;
}

export function buildHeroGrowthRows(heroes: Hero[], items: DeadlockItem[]): HeroGrowthRow[] {
  const itemByClassName = new Map(items.map((item) => [item.class_name, item]));

  return heroes
    .map((hero) => {
      const heroItems = hero.items ?? {};
      const heroImage = hero.images?.icon_image_small ?? hero.images?.icon_hero_card ?? null;
      const isDisabled = Boolean(hero.disabled);
      const isDrifter = hero.class_name === "hero_drifter";
      const primaryWeaponClass = heroItems?.weapon_primary ?? heroItems?.weapon_secondary ?? null;
      const secondaryWeaponClass = heroItems?.weapon_secondary ?? null;

      const primaryWeapon = primaryWeaponClass
        ? itemByClassName.get(primaryWeaponClass)
        : undefined;
      const secondaryWeapon = secondaryWeaponClass
        ? itemByClassName.get(secondaryWeaponClass)
        : undefined;

      const primaryWeaponInfo = isWeaponItem(primaryWeapon) ? primaryWeapon.weapon_info ?? null : null;
      const secondaryWeaponInfo = isWeaponItem(secondaryWeapon) ? secondaryWeapon.weapon_info ?? null : null;

      const baseBulletDamage = primaryWeaponInfo?.bullet_damage ?? null;
      const pellets = primaryWeaponInfo?.bullets ?? null;
      const cycleTimeRaw = primaryWeaponInfo?.cycle_time ?? null;
      const clipSize = primaryWeaponInfo?.clip_size ?? null;
      const maxSpinCycleTimeRaw = primaryWeaponInfo?.max_spin_cycle_time ?? cycleTimeRaw ?? null;
      const burstShotCount = Math.max(primaryWeaponInfo?.burst_shot_count ?? 1, 1);
      const intraBurstCycleTime = primaryWeaponInfo?.intra_burst_cycle_time ?? 0;

      const projectilesPerShot = pellets !== null ? (isDrifter ? 1 : pellets) : 1;
      const burstAdjustment = burstShotCount > 1 ? intraBurstCycleTime * burstShotCount : 0;
      const effectiveCycleTime = cycleTimeRaw !== null ? cycleTimeRaw + burstAdjustment : null;
      const effectiveMaxSpinCycleTime = maxSpinCycleTimeRaw !== null ? maxSpinCycleTimeRaw + burstAdjustment : effectiveCycleTime;
      const pelletMultiplier = projectilesPerShot * burstShotCount;

      const baseFireRate = effectiveCycleTime ? safeDivision(burstShotCount, effectiveCycleTime) : null;
      const maxSpinFireRate = effectiveMaxSpinCycleTime ? safeDivision(burstShotCount, effectiveMaxSpinCycleTime) : baseFireRate;
      const baseDps = baseBulletDamage !== null && effectiveCycleTime
        ? safeDivision(baseBulletDamage * pelletMultiplier, effectiveCycleTime)
        : null;
      const baseSpinDps = baseBulletDamage !== null && effectiveMaxSpinCycleTime
        ? safeDivision(baseBulletDamage * pelletMultiplier, effectiveMaxSpinCycleTime)
        : baseDps;
      const dpm = baseBulletDamage !== null && clipSize !== null
        ? baseBulletDamage * projectilesPerShot * clipSize
        : null;

      const falloffRangeMin = primaryWeaponInfo?.damage_falloff_start_range ?? null;
      const falloffRangeMax = primaryWeaponInfo?.damage_falloff_end_range ?? null;

      const baseHp = hero.starting_stats?.max_health?.value ?? null;
      const baseRegen = hero.starting_stats?.base_health_regen?.value ?? null;
      const baseMoveSpeed = hero.starting_stats?.max_move_speed?.value ?? null;
      const baseSprint = hero.starting_stats?.sprint_speed?.value ?? null;
      const baseStamina = hero.starting_stats?.stamina?.value ?? null;

      const dmgGain = hero.standard_level_up_upgrades?.MODIFIER_VALUE_BASE_BULLET_DAMAGE_FROM_LEVEL ?? null;
      const hpGain = hero.standard_level_up_upgrades?.MODIFIER_VALUE_BASE_HEALTH_FROM_LEVEL ?? null;
      const spiritGain = hero.standard_level_up_upgrades?.MODIFIER_VALUE_TECH_POWER ?? null;
      const purchaseBonuses = hero.purchase_bonuses ?? null;
      const vitalityBonuses = purchaseBonuses?.vitality ?? [];
      const spiritBonuses = purchaseBonuses?.spirit ?? [];

      const vitalityHealthFlatBonus = sumPurchaseBonusValues(vitalityBonuses, [
        "MODIFIER_VALUE_BASE_HEALTH",
        "MODIFIER_VALUE_MAX_HEALTH",
      ]);
      const vitalityHealthPercentBonus = sumPurchaseBonusValues(vitalityBonuses, [
        "MODIFIER_VALUE_BASE_HEALTH_PERCENT",
        "MODIFIER_VALUE_MAX_HEALTH_PERCENT",
      ]);
      const vitalityRegenFlatBonus = sumPurchaseBonusValues(vitalityBonuses, [
        "MODIFIER_VALUE_BASE_HEALTH_REGEN",
      ]);
      const vitalityRegenPercentBonus = sumPurchaseBonusValues(vitalityBonuses, [
        "MODIFIER_VALUE_BASE_HEALTH_REGEN_PERCENT",
      ]);
      const vitalityMoveSpeedFlatBonus = sumPurchaseBonusValues(vitalityBonuses, [
        "MODIFIER_VALUE_MAX_MOVE_SPEED",
        "MODIFIER_VALUE_BASE_MOVE_SPEED",
      ]);
      const vitalityMoveSpeedPercentBonus = sumPurchaseBonusValues(vitalityBonuses, [
        "MODIFIER_VALUE_MAX_MOVE_SPEED_PERCENT",
        "MODIFIER_VALUE_BASE_MOVE_SPEED_PERCENT",
      ]);
      const vitalitySprintFlatBonus = sumPurchaseBonusValues(vitalityBonuses, [
        "MODIFIER_VALUE_SPRINT_SPEED",
        "MODIFIER_VALUE_BASE_SPRINT_SPEED",
      ]);
      const vitalitySprintPercentBonus = sumPurchaseBonusValues(vitalityBonuses, [
        "MODIFIER_VALUE_SPRINT_SPEED_PERCENT",
        "MODIFIER_VALUE_BASE_SPRINT_SPEED_PERCENT",
      ]);

      const spiritFlatBonus = sumPurchaseBonusValues(spiritBonuses, ["MODIFIER_VALUE_TECH_POWER"]);
      const levels = Object.keys(hero.level_info ?? {})
        .map((level) => Number.parseInt(level, 10))
        .filter((level) => Number.isFinite(level));
      const maxLevel = levels.length > 0 ? Math.max(...levels) : 1;
      const levelIncrements = Math.max(maxLevel - 1, 0);
      const totalSpiritAtMaxLevel = (spiritGain ?? 0) * levelIncrements;
      const totalSpiritFromBoonsAndLevels = totalSpiritAtMaxLevel + spiritFlatBonus;

      const maxGunDamage =
        baseBulletDamage !== null && dmgGain !== null
          ? baseBulletDamage + dmgGain * levelIncrements
          : baseBulletDamage;

      const maxGunDps =
        maxGunDamage !== null && effectiveCycleTime
          ? safeDivision(maxGunDamage * pelletMultiplier, effectiveCycleTime)
          : null;
      const maxSpinGunDps =
        maxGunDamage !== null && effectiveMaxSpinCycleTime
          ? safeDivision(maxGunDamage * pelletMultiplier, effectiveMaxSpinCycleTime)
          : maxGunDps;

      const scalingStats = hero.scaling_stats ?? {};
      const bulletDamagePerSpirit = scalingStats?.EBulletDamage?.scale ?? 0;
      const roundsPerSecondPerSpirit = scalingStats?.ERoundsPerSecond?.scale ?? 0;

      const rawSpiritBulletBonus = bulletDamagePerSpirit * totalSpiritAtMaxLevel;
      const rawSpiritRoundsPerSecondBonus = roundsPerSecondPerSpirit * totalSpiritAtMaxLevel;

      const spiritBulletDamageBonus = rawSpiritBulletBonus !== 0 ? rawSpiritBulletBonus : null;
      const spiritRoundsPerSecondBonus = rawSpiritRoundsPerSecondBonus !== 0 ? rawSpiritRoundsPerSecondBonus : null;

      const baseFireRateWithSpirit =
        baseFireRate !== null
          ? baseFireRate + (spiritRoundsPerSecondBonus ?? 0)
          : spiritRoundsPerSecondBonus !== null
            ? spiritRoundsPerSecondBonus
            : null;
      const maxSpinFireRateWithSpirit =
        maxSpinFireRate !== null
          ? maxSpinFireRate + (spiritRoundsPerSecondBonus ?? 0)
          : baseFireRateWithSpirit;

      const baseCycleTimeWithSpirit =
        baseFireRateWithSpirit !== null && baseFireRateWithSpirit !== 0
          ? 1 / baseFireRateWithSpirit
          : effectiveCycleTime ?? null;
      const maxSpinCycleTimeWithSpirit =
        maxSpinFireRateWithSpirit !== null && maxSpinFireRateWithSpirit !== 0
          ? 1 / maxSpinFireRateWithSpirit
          : effectiveMaxSpinCycleTime ?? baseCycleTimeWithSpirit ?? null;

      const maxGunDamageWithSpirit =
        maxGunDamage !== null
          ? maxGunDamage + (spiritBulletDamageBonus ?? 0)
          : baseBulletDamage !== null
            ? baseBulletDamage + (spiritBulletDamageBonus ?? 0)
            : null;

      const hasSpiritScaling = (spiritBulletDamageBonus ?? 0) !== 0 || (
        spiritRoundsPerSecondBonus ?? 0
      ) !== 0;

      const maxGunDpsWithSpirit = hasSpiritScaling
        ? maxGunDamageWithSpirit !== null && baseCycleTimeWithSpirit !== null
          ? safeDivision(maxGunDamageWithSpirit * pelletMultiplier, baseCycleTimeWithSpirit)
          : null
        : maxGunDps;
      const maxSpinGunDpsWithSpirit = hasSpiritScaling
        ? maxGunDamageWithSpirit !== null && maxSpinCycleTimeWithSpirit !== null
          ? safeDivision(maxGunDamageWithSpirit * pelletMultiplier, maxSpinCycleTimeWithSpirit)
          : maxGunDpsWithSpirit
        : maxSpinGunDps;

      const maxDpm =
        maxGunDamage !== null && clipSize !== null
          ? maxGunDamage * projectilesPerShot * clipSize
          : null;

      const maxLevelHp = baseHp !== null && hpGain !== null
        ? baseHp + hpGain * levelIncrements
        : baseHp;
      const maxHealthWithBoons = applyFlatAndPercentBonuses(
        maxLevelHp,
        vitalityHealthFlatBonus,
        vitalityHealthPercentBonus,
      );

      const maxRegenWithBoons = applyFlatAndPercentBonuses(
        baseRegen,
        vitalityRegenFlatBonus,
        vitalityRegenPercentBonus,
      );
      const maxMoveSpeedWithBoons = applyFlatAndPercentBonuses(
        baseMoveSpeed,
        vitalityMoveSpeedFlatBonus,
        vitalityMoveSpeedPercentBonus,
      );
      const maxSprintWithBoons = applyFlatAndPercentBonuses(
        baseSprint,
        vitalitySprintFlatBonus,
        vitalitySprintPercentBonus,
      );

      const regenScalePerSpirit = parseNumericValue(scalingStats?.EBaseHealthRegen?.scale ?? null) ?? 0;
      const moveSpeedScalePerSpirit = parseNumericValue(scalingStats?.EMaxMoveSpeed?.scale ?? null) ?? 0;
      const sprintScalePerSpirit = parseNumericValue(scalingStats?.ESprintSpeed?.scale ?? null) ?? 0;

      const regenSpiritBonus = regenScalePerSpirit * totalSpiritFromBoonsAndLevels;
      const moveSpeedSpiritBonus = moveSpeedScalePerSpirit * totalSpiritFromBoonsAndLevels;
      const sprintSpiritBonus = sprintScalePerSpirit * totalSpiritFromBoonsAndLevels;

      const maxRegenWithBoonsAndSpirit =
        maxRegenWithBoons !== null
          ? maxRegenWithBoons + regenSpiritBonus
          : baseRegen !== null
            ? baseRegen + regenSpiritBonus
            : null;
      const maxMoveSpeedWithBoonsAndSpirit =
        maxMoveSpeedWithBoons !== null
          ? maxMoveSpeedWithBoons + moveSpeedSpiritBonus
          : baseMoveSpeed !== null
            ? baseMoveSpeed + moveSpeedSpiritBonus
            : null;
      const maxSprintWithBoonsAndSpirit =
        maxSprintWithBoons !== null
          ? maxSprintWithBoons + sprintSpiritBonus
          : baseSprint !== null
            ? baseSprint + sprintSpiritBonus
            : null;

      const dpsGrowthPercent =
        baseDps !== null && baseDps !== 0 && maxGunDps !== null
          ? ((maxGunDps - baseDps) / baseDps) * 100
          : null;

      const hpGrowthPercent =
        baseHp !== null && baseHp !== 0 && maxLevelHp !== null
          ? ((maxLevelHp - baseHp) / baseHp) * 100
          : null;

      const spiritDetails: SpiritScalingDetail[] = Object.entries(hero.scaling_stats ?? {})
        .filter(([, detail]) => detail?.scaling_stat === "ETechPower")
        .map(([statKey, detail]) => {
          const ratio = detail?.scale ?? 0;
          return {
            statKey,
            displayName: formatStatName(statKey),
            ratioPerSpirit: ratio,
            maxBonusAtMaxLevel: ratio * totalSpiritAtMaxLevel,
          } satisfies SpiritScalingDetail;
        })
        .filter((detail) => detail.ratioPerSpirit !== 0 || detail.maxBonusAtMaxLevel !== 0);

      return {
        heroId: hero.id,
        heroName: hero.name,
        heroImage,
        isDisabled,
        baseBulletDamage,
        pellets,
        pelletExceptionNote: isDrifter
          ? "Drifter's pellets do not stack damage. Calculations use a single pellet."
          : null,
        altFireName: secondaryWeapon && isWeaponItem(secondaryWeapon) ? secondaryWeapon.name : null,
        altFireDamage: secondaryWeaponInfo?.bullet_damage ?? null,
        altFirePellets: secondaryWeaponInfo?.bullets ?? null,
        baseAmmo: clipSize ?? null,
        baseFireRate,
        baseDps,
        baseSpinDps,
        dpm,
        falloffRangeMin,
        falloffRangeMax,
        baseHp,
        baseRegen,
        baseMoveSpeed,
        baseSprint,
        baseStamina,
        maxHealthWithBoons,
        maxRegenWithBoons,
        maxRegenWithBoonsAndSpirit,
        maxSprintWithBoons,
        maxSprintWithBoonsAndSpirit,
        maxMoveSpeedWithBoons,
        maxMoveSpeedWithBoonsAndSpirit,
        dmgGain,
        hpGain,
        spiritGain,
        totalSpiritAtMaxLevel,
        maxLevelHp,
        maxGunDamage,
        maxGunDps,
        maxSpinGunDps,
        spiritBulletDamageBonus,
        spiritRoundsPerSecondBonus,
        maxGunDamageWithSpirit,
        maxGunDpsWithSpirit,
        maxSpinGunDpsWithSpirit,
        maxDpm,
        dpsGrowthPercent,
        hpGrowthPercent,
        spiritDetails,
        spiritScaling2: null,
        spiritRatio2: null,
        spiritBonus2: null,
      } satisfies HeroGrowthRow;
    })
    .sort((a, b) => a.heroName.localeCompare(b.heroName));
}

