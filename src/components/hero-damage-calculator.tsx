"use client";

import * as React from "react";

import type { HeroAbilityRow, AbilityModifierEffect } from "@/lib/hero-abilities";
import type { HeroGrowthRow } from "@/lib/hero-growth";
import {
  MetricLineChart,
  type MetricLineChartSeries,
  type MetricLineChartDatum,
} from "@/components/metric-line-chart";

type HeroDamageCalculatorProps = {
  growthRows: HeroGrowthRow[];
  abilityRows: HeroAbilityRow[];
};

type AbilityMeta = {
  maxLevel: number;
  baseSpiritPower: number;
  spiritGain: number;
};

type HeroOption = {
  heroId: number;
  heroName: string;
  heroImage: string | null;
  isDisabled: boolean;
  maxLevel: number;
  baseSpiritPower: number;
  spiritGain: number;
};

type PercentEffect = {
  abilityName: string;
  componentLabel: string;
  mode: "burst" | "sustained";
  percentValue: number;
  perWindowCoefficient: number;
  uptimeSeconds: number;
};

type HeroDamageModel = {
  heroId: number;
  heroName: string;
  heroImage: string | null;
  isDisabled: boolean;
  level: number;
  maxLevel: number;
  baseSpiritPower: number;
  spiritGain: number;
  effectiveSpirit: number;
  gunDamageOverWindow: number;
  burstDamageOverWindow: number;
  sustainedDamageOverWindow: number;
  percentBurstCoefficient: number;
  percentSustainedCoefficient: number;
  baseDamageOverWindow: number;
  percentCoefficient: number;
  abilityDamageOverWindow: number;
  ampAllPercent: number;
  ampGunPercent: number;
  ampSpiritPercent: number;
  gunShredPercent: number;
  spiritShredPercent: number;
  percentEffects: PercentEffect[];
};

const integerFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const oneDecimalFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

const IGNORED_DAMAGE_ABILITY_NAMES = new Set<string>(["bloodletting", "jump start"]);

function buildHeroOptions(
  growthRows: HeroGrowthRow[],
  abilityRows: HeroAbilityRow[],
  abilityMetaByHero: Map<number, AbilityMeta>,
): HeroOption[] {
  const options: HeroOption[] = [];
  const seen = new Set<number>();

  for (const row of growthRows) {
    const meta = abilityMetaByHero.get(row.heroId);
    options.push({
      heroId: row.heroId,
      heroName: row.heroName,
      heroImage: row.heroImage ?? null,
      isDisabled: row.isDisabled,
      maxLevel: meta?.maxLevel ?? 30,
      baseSpiritPower: meta?.baseSpiritPower ?? 0,
      spiritGain: meta?.spiritGain ?? row.spiritGain ?? 0,
    });
    seen.add(row.heroId);
  }

  for (const ability of abilityRows) {
    if (seen.has(ability.heroId)) {
      continue;
    }
    options.push({
      heroId: ability.heroId,
      heroName: ability.heroName,
      heroImage: ability.heroImage ?? null,
      isDisabled: ability.isDisabled,
      maxLevel: ability.maxLevel,
      baseSpiritPower: ability.baseSpiritPower,
      spiritGain: ability.spiritGain,
    });
    seen.add(ability.heroId);
  }

  options.sort((a, b) => a.heroName.localeCompare(b.heroName));
  return options;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function interpolateValue(base: number | null | undefined, max: number | null | undefined, ratio: number): number | null {
  if (base === null || base === undefined) {
    if (max === null || max === undefined) {
      return null;
    }
    return max;
  }

  if (max === null || max === undefined) {
    return base;
  }

  return base + (max - base) * ratio;
}

function getRangeValueAtLevel(range: { base: number | null; max: number | null } | undefined, ratio: number): number | null {
  if (!range) {
    return null;
  }

  const base = range.base ?? range.max ?? null;
  const max = range.max ?? range.base ?? null;

  if (base === null && max === null) {
    return null;
  }

  if (base === null) {
    return max;
  }

  if (max === null) {
    return base;
  }

  return base + (max - base) * ratio;
}

function computeComponentValue(
  component: HeroAbilityRow["damageComponents"][string],
  levelRatio: number,
  spirit: number,
): number {
  const intercept = interpolateValue(component.damageBase, component.damageMax, levelRatio) ?? 0;
  const scaling = interpolateValue(component.scalingBase, component.scalingMax, levelRatio) ?? 0;
  return intercept + scaling * spirit;
}

function computeModifierPercent(
  effect: AbilityModifierEffect | undefined,
  levelRatio: number,
  spirit: number,
): number {
  if (!effect) {
    return 0;
  }
  const intercept = interpolateValue(effect.value.base, effect.value.max, levelRatio) ?? 0;
  const scaling = interpolateValue(effect.scaling.base, effect.scaling.max, levelRatio) ?? 0;
  return intercept + scaling * spirit;
}

function computeAbilityUsage({
  windowSeconds,
  charges,
  cooldown,
  chargeInterval,
  duration,
}: {
  windowSeconds: number;
  charges: number;
  cooldown: number | null | undefined;
  chargeInterval: number | null | undefined;
  duration: number;
}): { castCount: number; uptimeSeconds: number } {
  if (windowSeconds <= 0) {
    return { castCount: 0, uptimeSeconds: 0 };
  }

  const normalizedDuration = Math.max(duration, 0);
  const normalizedCharges = Number.isFinite(charges) && charges !== null ? charges : 1;
  const initialCharges = Math.max(1, Math.floor(normalizedCharges));
  const normalizedCooldown =
    cooldown !== null && cooldown !== undefined && cooldown > 0 ? cooldown : Number.POSITIVE_INFINITY;
  const normalizedInterval = Math.max(chargeInterval ?? 0, 0);

  if (initialCharges <= 1) {
    if (Number.isFinite(normalizedCooldown)) {
      const castCount = windowSeconds / normalizedCooldown;
      const uptimeSeconds = Math.min(normalizedDuration * castCount, windowSeconds);
      return { castCount, uptimeSeconds };
    }
    const castCount = normalizedDuration > 0 ? windowSeconds / normalizedDuration : 0;
    const uptimeSeconds = Math.min(normalizedDuration * castCount, windowSeconds);
    return { castCount, uptimeSeconds };
  }

  const shotTimes: number[] = [];
  const maxIterations = 2000;

  for (let index = 0; index < maxIterations; index++) {
    let time: number;
    if (index < initialCharges) {
      time = normalizedInterval * index;
    } else {
      const rechargeReadyTime =
        normalizedCooldown === Number.POSITIVE_INFINITY
          ? Number.POSITIVE_INFINITY
          : shotTimes[index - initialCharges] + normalizedCooldown;
      const previousShotTime = shotTimes[index - 1] + normalizedInterval;
      time = Math.max(rechargeReadyTime, previousShotTime);
    }

    if (!Number.isFinite(time) || time > windowSeconds) {
      break;
    }

    shotTimes.push(time);
  }

  const castCount = shotTimes.length;
  const uptimeSeconds = Math.min(normalizedDuration * castCount, windowSeconds);
  return { castCount, uptimeSeconds };
}

function createEnemyHealthSamples(center: number, count = 18): number[] {
  const safeCenter = Math.max(center, 100);
  const min = Math.max(100, safeCenter * 0.4);
  const max = Math.max(min + 150, safeCenter * 1.6);
  if (count <= 1) {
    return [Math.round(safeCenter)];
  }
  return Array.from({ length: count }, (_, index) => {
    const ratio = index / (count - 1);
    return Math.round(min + (max - min) * ratio);
  });
}

type BuildModelArgs = {
  option: HeroOption;
  abilities: HeroAbilityRow[];
  growthRow: HeroGrowthRow | undefined;
  level: number;
  spirit: number;
  gunBonusPercent: number;
  fireRateBonusPercent: number;
  variant: "min" | "max";
  combatWindow: number;
};

function buildHeroDamageModel({
  option,
  abilities,
  growthRow,
  level,
  spirit,
  variant,
  combatWindow,
  gunBonusPercent,
  fireRateBonusPercent,
}: BuildModelArgs): HeroDamageModel {
  const levelClamped = clamp(level, 1, option.maxLevel);
  const levelRatio = option.maxLevel > 1 ? (levelClamped - 1) / (option.maxLevel - 1) : 0;
  const windowSeconds = Math.max(combatWindow, 1);

  const baseSpiritPower = option.baseSpiritPower;
  const spiritGainPerLevel = option.spiritGain;
  const naturalSpiritAtLevel = baseSpiritPower + spiritGainPerLevel * Math.max(levelClamped - 1, 0);
  const effectiveSpirit = Math.max(spirit, naturalSpiritAtLevel);
  const extraSpiritBeyondBase = Math.max(effectiveSpirit - baseSpiritPower, 0);

  const baseGunDps = growthRow?.baseDps ?? 0;
  const maxGunDps = growthRow?.maxGunDps ?? baseGunDps;
  const gunDpsFromLevel = (maxGunDps - baseGunDps) * levelRatio;
  const maxGunDpsWithSpirit = growthRow?.maxGunDpsWithSpirit ?? maxGunDps;
  const totalSpiritFromLevels = spiritGainPerLevel * Math.max(option.maxLevel - 1, 0);
  const dpsPerSpirit =
    totalSpiritFromLevels > 0 ? (maxGunDpsWithSpirit - maxGunDps) / totalSpiritFromLevels : 0;
  const gunBonusMultiplier = 1 + gunBonusPercent / 100;
  const fireRateBonusMultiplier = 1 + fireRateBonusPercent / 100;
  const gunDps = Math.max(
    (baseGunDps + gunDpsFromLevel + dpsPerSpirit * extraSpiritBeyondBase) * gunBonusMultiplier * fireRateBonusMultiplier,
    0,
  );
  const gunDamageOverWindow = gunDps * windowSeconds;

  let burstDamageOverWindow = 0;
  let sustainedDamageOverWindow = 0;
  let percentBurstCoefficient = 0;
  let percentSustainedCoefficient = 0;
  const percentEffects: PercentEffect[] = [];

  let ampAllPercent = 0;
  let ampGunPercent = 0;
  let ampSpiritPercent = 0;
  let gunShredPercent = 0;
  let spiritShredPercent = 0;

  const variantKey = variant === "min" ? "min" : "max";

  for (const ability of abilities) {
    if (IGNORED_DAMAGE_ABILITY_NAMES.has(ability.abilityName.trim().toLowerCase())) {
      continue;
    }
    const cooldown = getRangeValueAtLevel(ability.metrics.cadence.cooldown, levelRatio);
    const duration = getRangeValueAtLevel(ability.metrics.cadence.duration, levelRatio) ?? 0;
    const charges = getRangeValueAtLevel(ability.metrics.cadence.charges, levelRatio) ?? 1;
    const chargeInterval = charges > 1 ? duration : 0;
    const { castCount, uptimeSeconds } = computeAbilityUsage({
      windowSeconds,
      charges,
      cooldown,
      chargeInterval,
      duration,
    });

    const burstTotals = ability.metrics.damage.burst.totals[variantKey];
    const burstIntercept = interpolateValue(burstTotals.interceptBase, burstTotals.interceptMax, levelRatio) ?? 0;
    const burstScaling = interpolateValue(burstTotals.scalingBase, burstTotals.scalingMax, levelRatio) ?? 0;
    const burstPerCast = Math.max(burstIntercept + burstScaling * effectiveSpirit, 0);
    burstDamageOverWindow += burstPerCast * castCount;

    const sustainedTotals = ability.metrics.damage.sustained.totals[variantKey];
    const sustainedIntercept = interpolateValue(
      sustainedTotals.interceptBase,
      sustainedTotals.interceptMax,
      levelRatio,
    ) ?? 0;
    const sustainedScaling = interpolateValue(
      sustainedTotals.scalingBase,
      sustainedTotals.scalingMax,
      levelRatio,
    ) ?? 0;
    const sustainedPerSecond = Math.max(sustainedIntercept + sustainedScaling * effectiveSpirit, 0);
    sustainedDamageOverWindow += sustainedPerSecond * uptimeSeconds;

    for (const key of ability.burstDamageComponentOrder) {
      const component = ability.damageComponents[key];
      if (!component || !component.isPercent) {
        continue;
      }
      const percentValue = computeComponentValue(component, levelRatio, effectiveSpirit);
      if (!Number.isFinite(percentValue) || percentValue === 0) {
        continue;
      }
      const coefficient = (percentValue / 100) * castCount;
      percentBurstCoefficient += coefficient;
      percentEffects.push({
        abilityName: ability.abilityName,
        componentLabel: component.label ?? key,
        mode: "burst",
        percentValue,
        perWindowCoefficient: coefficient,
        uptimeSeconds: 0,
      });
    }

    for (const key of ability.dpsDamageComponentOrder) {
      const component = ability.damageComponents[key];
      if (!component || !component.isPercent) {
        continue;
      }
      const percentValue = computeComponentValue(component, levelRatio, effectiveSpirit);
      if (!Number.isFinite(percentValue) || percentValue === 0 || uptimeSeconds === 0) {
        continue;
      }
      const coefficient = (percentValue / 100) * uptimeSeconds;
      percentSustainedCoefficient += coefficient;
      percentEffects.push({
        abilityName: ability.abilityName,
        componentLabel: component.label ?? key,
        mode: "sustained",
        percentValue,
        perWindowCoefficient: coefficient,
        uptimeSeconds,
      });
    }

    const modifierSummary = ability.metrics.modifiers.summary;
    ampAllPercent += computeModifierPercent(modifierSummary.damageAmpAll, levelRatio, effectiveSpirit);
    ampGunPercent += computeModifierPercent(modifierSummary.damageAmpGun, levelRatio, effectiveSpirit);
    ampSpiritPercent += computeModifierPercent(modifierSummary.damageAmpSpirit, levelRatio, effectiveSpirit);
    gunShredPercent += computeModifierPercent(modifierSummary.gunShred, levelRatio, effectiveSpirit);
    spiritShredPercent += computeModifierPercent(modifierSummary.spiritShred, levelRatio, effectiveSpirit);
  }

  const abilityDamageOverWindow = burstDamageOverWindow + sustainedDamageOverWindow;
  const baseDamageOverWindow = gunDamageOverWindow + abilityDamageOverWindow;
  const percentCoefficient = percentBurstCoefficient + percentSustainedCoefficient;

  return {
    heroId: option.heroId,
    heroName: option.heroName,
    heroImage: option.heroImage,
    isDisabled: option.isDisabled,
    level: levelClamped,
    maxLevel: option.maxLevel,
    baseSpiritPower,
    spiritGain: spiritGainPerLevel,
    effectiveSpirit,
    gunDamageOverWindow,
    burstDamageOverWindow,
    sustainedDamageOverWindow,
    percentBurstCoefficient,
    percentSustainedCoefficient,
    baseDamageOverWindow,
    percentCoefficient,
    abilityDamageOverWindow,
    ampAllPercent,
    ampGunPercent,
    ampSpiritPercent,
    gunShredPercent,
    spiritShredPercent,
    percentEffects,
  };
}

export function HeroDamageCalculator({ growthRows, abilityRows }: HeroDamageCalculatorProps) {
  const abilityByHero = React.useMemo(() => {
    const map = new Map<number, HeroAbilityRow[]>();
    for (const ability of abilityRows) {
      const list = map.get(ability.heroId) ?? [];
      list.push(ability);
      map.set(ability.heroId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.abilityName.localeCompare(b.abilityName));
    }
    return map;
  }, [abilityRows]);

  const growthByHero = React.useMemo(
    () => new Map<number, HeroGrowthRow>(growthRows.map((row) => [row.heroId, row])),
    [growthRows],
  );

  const abilityMetaByHero = React.useMemo(() => {
    const meta = new Map<number, AbilityMeta>();
    for (const ability of abilityRows) {
      if (!meta.has(ability.heroId)) {
        meta.set(ability.heroId, {
          maxLevel: ability.maxLevel,
          baseSpiritPower: ability.baseSpiritPower,
          spiritGain: ability.spiritGain,
        });
      }
    }
    return meta;
  }, [abilityRows]);

  const heroOptions = React.useMemo(
    () => buildHeroOptions(growthRows, abilityRows, abilityMetaByHero),
    [abilityMetaByHero, abilityRows, growthRows],
  );

  const globalMaxLevel = React.useMemo(
    () => (heroOptions.length ? Math.max(...heroOptions.map((hero) => hero.maxLevel)) : 30),
    [heroOptions],
  );

  const spiritSliderMax = React.useMemo(() => {
    if (!abilityRows.length) {
      return 250;
    }
    const maxSpirit = Math.max(...abilityRows.map((row) => row.maxSpiritPower));
    return Math.max(150, Math.ceil(maxSpirit / 25) * 25 + 50);
  }, [abilityRows]);

  const defaultHeroIds = React.useMemo(
    () => heroOptions.filter((option) => !option.isDisabled).slice(0, 5).map((option) => option.heroId),
    [heroOptions],
  );

  const [enemyHealth, setEnemyHealth] = React.useState<number>(3000);
  const [level, setLevel] = React.useState<number>(globalMaxLevel);
  const [spirit, setSpirit] = React.useState<number>(Math.min(120, spiritSliderMax));
  const [combatWindow, setCombatWindow] = React.useState<number>(10);
  const [enemyGunResist, setEnemyGunResist] = React.useState<number>(0);
  const [enemySpiritResist, setEnemySpiritResist] = React.useState<number>(0);
  const [enemyGunBonus, setEnemyGunBonus] = React.useState<number>(0);
  const [enemyFireRateBonus, setEnemyFireRateBonus] = React.useState<number>(0);
  const [showDisabled, setShowDisabled] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [damageVariant, setDamageVariant] = React.useState<"min" | "max">("max");
  const [selectedHeroIds, setSelectedHeroIds] = React.useState<number[]>([]);
  const hasInitializedSelectionRef = React.useRef(false);

  React.useEffect(() => {
    setLevel((current) => clamp(current, 1, globalMaxLevel));
  }, [globalMaxLevel]);

  React.useEffect(() => {
    setSpirit((current) => Math.min(current, spiritSliderMax));
  }, [spiritSliderMax]);

  React.useEffect(() => {
    setSelectedHeroIds((current) =>
      current.filter((heroId) => heroOptions.some((option) => option.heroId === heroId)),
    );
  }, [heroOptions]);

  React.useEffect(() => {
    if (hasInitializedSelectionRef.current) {
      return;
    }
    if (!defaultHeroIds.length) {
      return;
    }
    hasInitializedSelectionRef.current = true;
    setSelectedHeroIds(defaultHeroIds);
  }, [defaultHeroIds]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredHeroOptions = React.useMemo(() => {
    return heroOptions.filter((option) => {
      if (!showDisabled && option.isDisabled) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      return option.heroName.toLowerCase().includes(normalizedSearch);
    });
  }, [heroOptions, normalizedSearch, showDisabled]);

  const heroColorIndex = React.useMemo(() => {
    const map = new Map<number, number>();
    heroOptions.forEach((option, index) => {
      map.set(option.heroId, index);
    });
    return map;
  }, [heroOptions]);

  const heroModels = React.useMemo(() => {
    const models = new Map<number, HeroDamageModel>();

    for (const option of heroOptions) {
      const abilities = abilityByHero.get(option.heroId) ?? [];
      const growthRow = growthByHero.get(option.heroId);
      const model = buildHeroDamageModel({
        option,
        abilities,
        growthRow,
        level,
        spirit,
        gunBonusPercent: enemyGunBonus,
        fireRateBonusPercent: enemyFireRateBonus,
        variant: damageVariant,
        combatWindow,
      });
      models.set(option.heroId, model);
    }

    return models;
  }, [
    abilityByHero,
    combatWindow,
    damageVariant,
    enemyFireRateBonus,
    enemyGunBonus,
    growthByHero,
    heroOptions,
    level,
    spirit,
  ]);

  const enemyHealthSamples = React.useMemo(() => createEnemyHealthSamples(enemyHealth), [enemyHealth]);

  const teamModifiers = React.useMemo(() => {
    let ampAllPercent = 0;
    let ampGunPercent = 0;
    let ampSpiritPercent = 0;
    let gunShredPercent = 0;
    let spiritShredPercent = 0;

    for (const heroId of selectedHeroIds) {
      const model = heroModels.get(heroId);
      if (!model) {
        continue;
      }
      ampAllPercent += model.ampAllPercent;
      ampGunPercent += model.ampGunPercent;
      ampSpiritPercent += model.ampSpiritPercent;
      gunShredPercent += model.gunShredPercent;
      spiritShredPercent += model.spiritShredPercent;
    }

    return {
      ampAllMultiplier: ampAllPercent / 100,
      gunAmpMultiplier: ampGunPercent / 100,
      spiritAmpMultiplier: ampSpiritPercent / 100,
      totalGunShredPercent: gunShredPercent,
      totalSpiritShredPercent: spiritShredPercent,
    };
  }, [heroModels, selectedHeroIds]);

  const chartSeries = React.useMemo<MetricLineChartSeries[]>(() => {
    const windowSeconds = Math.max(combatWindow, 1);
    const {
      ampAllMultiplier,
      gunAmpMultiplier,
      spiritAmpMultiplier,
      totalGunShredPercent,
      totalSpiritShredPercent,
    } = teamModifiers;
    const effectiveGunResist = enemyGunResist - totalGunShredPercent;
    const effectiveSpiritResist = enemySpiritResist - totalSpiritShredPercent;
    const gunResistMultiplier = Math.max(0, 1 - effectiveGunResist / 100);
    const spiritResistMultiplier = Math.max(0, 1 - effectiveSpiritResist / 100);
    const result: MetricLineChartSeries[] = [];

    for (const heroId of selectedHeroIds) {
      const model = heroModels.get(heroId);
      if (!model) {
        continue;
      }

      const data = enemyHealthSamples.reduce<MetricLineChartDatum[]>((acc, health) => {
        const percentBase = model.percentCoefficient * health;
        const gunBase = model.gunDamageOverWindow * gunResistMultiplier;
        const abilityBase = model.abilityDamageOverWindow * spiritResistMultiplier;
        const percentAdjusted = percentBase * spiritResistMultiplier;
        const baseDamage = gunBase + abilityBase + percentAdjusted;
        const extraDamage =
          baseDamage * ampAllMultiplier +
          gunBase * gunAmpMultiplier +
          (abilityBase + percentAdjusted) * spiritAmpMultiplier;
        const totalDamageOverWindow = baseDamage + extraDamage;
        const dps = totalDamageOverWindow / windowSeconds;
        if (dps <= 0) {
          return acc;
        }
        const timeToKill = health / dps;
        acc.push({ x: health, y: timeToKill });
        return acc;
      }, []);

      if (!data.length) {
        continue;
      }

      const colorIndex = heroColorIndex.get(model.heroId);
      result.push(
        colorIndex !== undefined
          ? { id: model.heroId, label: model.heroName, data, colorIndex }
          : { id: model.heroId, label: model.heroName, data },
      );
    }

    return result;
  }, [
    combatWindow,
    enemyGunResist,
    enemySpiritResist,
    enemyHealthSamples,
    heroColorIndex,
    heroModels,
    selectedHeroIds,
    teamModifiers,
  ]);

  const selectedSummaries = React.useMemo(() => {
    const windowSeconds = Math.max(combatWindow, 1);
    const {
      ampAllMultiplier,
      gunAmpMultiplier,
      spiritAmpMultiplier,
      totalGunShredPercent,
      totalSpiritShredPercent,
    } = teamModifiers;
    const effectiveGunResist = enemyGunResist - totalGunShredPercent;
    const effectiveSpiritResist = enemySpiritResist - totalSpiritShredPercent;
    const gunResistMultiplier = Math.max(0, 1 - effectiveGunResist / 100);
    const spiritResistMultiplier = Math.max(0, 1 - effectiveSpiritResist / 100);
    return selectedHeroIds
      .map((heroId) => {
        const model = heroModels.get(heroId);
        if (!model) {
          return null;
        }
        const percentBase = model.percentCoefficient * enemyHealth;
        const gunBaseRaw = model.gunDamageOverWindow;
        const abilityBaseRaw = model.abilityDamageOverWindow;
        const gunBase = gunBaseRaw * gunResistMultiplier;
        const abilityBase = abilityBaseRaw * spiritResistMultiplier;
        const percentAdjusted = percentBase * spiritResistMultiplier;
        const baseDamage = gunBase + abilityBase + percentAdjusted;
        const ampAllBonus = baseDamage * ampAllMultiplier;
        const ampGunBonus = gunBase * gunAmpMultiplier;
        const ampSpiritBonus = (abilityBase + percentAdjusted) * spiritAmpMultiplier;
        const extraDamage = ampAllBonus + ampGunBonus + ampSpiritBonus;
        const totalDamageOverWindow = baseDamage + extraDamage;
        const percentBurstDamage =
          model.percentBurstCoefficient * enemyHealth * spiritResistMultiplier * (1 + ampAllMultiplier + spiritAmpMultiplier);
        const percentSustainedDamage =
          model.percentSustainedCoefficient * enemyHealth * spiritResistMultiplier * (1 + ampAllMultiplier + spiritAmpMultiplier);
        const totalGunDamage = gunBase * (1 + ampAllMultiplier + gunAmpMultiplier);
        const dps = totalDamageOverWindow / windowSeconds;
        const timeToKill = dps > 0 ? enemyHealth / dps : null;

        return {
          model,
          baseDamage,
          extraDamage,
          totalDamageOverWindow,
          percentBurstDamage,
          percentSustainedDamage,
          totalGunDamage,
          timeToKill,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }, [
    combatWindow,
    enemyGunResist,
    enemySpiritResist,
    enemyHealth,
    heroModels,
    selectedHeroIds,
    teamModifiers,
  ]);

  const percentEffectDisplay = React.useMemo(() => {
    const {
      ampAllMultiplier,
      spiritAmpMultiplier,
      totalSpiritShredPercent,
    } = teamModifiers;
    const effectiveSpiritResist = enemySpiritResist - totalSpiritShredPercent;
    const spiritResistMultiplier = Math.max(0, 1 - effectiveSpiritResist / 100);
    const spiritAmplifier = 1 + ampAllMultiplier + spiritAmpMultiplier;

    const entries: Array<{
      heroName: string;
      heroId: number;
      effects: Array<{
        abilityName: string;
        componentLabel: string;
        mode: "burst" | "sustained";
        percentValue: number;
        damageOverWindow: number;
        damagePerCast: number | null;
        uptimeSeconds: number;
      }>;
    }> = [];

    for (const heroId of selectedHeroIds) {
      const model = heroModels.get(heroId);
      if (!model) {
        continue;
      }

      const effects = model.percentEffects
        .map((effect) => {
          const damageOverWindow = effect.perWindowCoefficient * enemyHealth * spiritResistMultiplier * spiritAmplifier;
          const damagePerCast =
            effect.mode === "burst"
              ? (effect.percentValue / 100) * enemyHealth * spiritResistMultiplier * spiritAmplifier
              : null;
          return {
            abilityName: effect.abilityName,
            componentLabel: effect.componentLabel,
            mode: effect.mode,
            percentValue: effect.percentValue,
            damageOverWindow,
            damagePerCast,
            uptimeSeconds: effect.uptimeSeconds,
          };
        })
        .filter((effect) => effect.damageOverWindow !== 0)
        .sort((a, b) => b.damageOverWindow - a.damageOverWindow);

      entries.push({
        heroName: model.heroName,
        heroId: model.heroId,
        effects,
      });
    }

    return entries;
  }, [enemyHealth, enemySpiritResist, heroModels, selectedHeroIds, teamModifiers]);

  const handleToggleHero = React.useCallback((heroId: number) => {
    setSelectedHeroIds((current) =>
      current.includes(heroId)
        ? current.filter((id) => id !== heroId)
        : [...current, heroId],
    );
  }, []);

  const handleSelectAll = React.useCallback(() => {
    setSelectedHeroIds(filteredHeroOptions.map((option) => option.heroId));
  }, [filteredHeroOptions]);

  const handleClearSelection = React.useCallback(() => {
    setSelectedHeroIds([]);
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex w-full flex-col gap-4 lg:w-1/3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Enemy total health
              </label>
              <input
                type="number"
                min={100}
                step={50}
                value={enemyHealth}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  setEnemyHealth(Number.isFinite(next) ? Math.max(next, 100) : 100);
                }}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-600"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Level {level}
              </label>
              <input
                type="range"
                min={1}
                max={globalMaxLevel}
                value={level}
                onChange={(event) => setLevel(Number.parseInt(event.target.value, 10))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Spirit {spirit}
              </label>
              <input
                type="range"
                min={0}
                max={spiritSliderMax}
                value={spirit}
                onChange={(event) => setSpirit(Number.parseInt(event.target.value, 10))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Gun damage bonus {enemyGunBonus}%
              </label>
              <input
                type="range"
                min={-50}
                max={200}
                step={1}
                value={enemyGunBonus}
                onChange={(event) => setEnemyGunBonus(Number.parseInt(event.target.value, 10))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Fire rate bonus {enemyFireRateBonus}%
              </label>
              <input
                type="range"
                min={-50}
                max={200}
                step={1}
                value={enemyFireRateBonus}
                onChange={(event) => setEnemyFireRateBonus(Number.parseInt(event.target.value, 10))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Combat window (s)
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={combatWindow}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  setCombatWindow(Number.isFinite(next) ? Math.max(next, 1) : 10);
                }}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-600"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Enemy gun resist (%)
              </label>
              <input
                type="number"
                step={1}
                value={enemyGunResist}
                onChange={(event) => {
                  const next = Number.parseFloat(event.target.value);
                  setEnemyGunResist(Number.isFinite(next) ? next : 0);
                }}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-600"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Enemy spirit resist (%)
              </label>
              <input
                type="number"
                step={1}
                value={enemySpiritResist}
                onChange={(event) => {
                  const next = Number.parseFloat(event.target.value);
                  setEnemySpiritResist(Number.isFinite(next) ? next : 0);
                }}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-600"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Damage variant
              </label>
              <select
                value={damageVariant}
                onChange={(event) => setDamageVariant(event.target.value === "min" ? "min" : "max")}
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-600"
              >
                <option value="max">Max</option>
                <option value="min">Min</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showDisabled}
                onChange={() => setShowDisabled((prev) => !prev)}
                className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
              />
              <span className="text-sm text-zinc-600 dark:text-zinc-300">Show disabled heroes</span>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-2/3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search heroes..."
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-600 sm:w-64"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="rounded-md border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="rounded-md border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800 sm:grid-cols-2">
              {filteredHeroOptions.map((option) => {
                const checked = selectedHeroIds.includes(option.heroId);
                return (
                  <label
                    key={option.heroId}
                    className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      checked ? "bg-zinc-100 dark:bg-zinc-800" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleHero(option.heroId)}
                      className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-zinc-700 dark:text-zinc-200">
                        {option.heroName}
                      </span>
                      {option.isDisabled ? (
                        <span className="text-[11px] uppercase tracking-wide text-rose-500 dark:text-rose-400">
                          Disabled
                        </span>
                      ) : null}
                    </div>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Select heroes to compare their combined gun DPS, burst rotations, sustained effects, and
              percentage-based damage against the configured enemy health.
            </p>
          </div>
        </div>
      </div>


      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            Damage breakdown (per {combatWindow}s window)
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  <th className="px-2 py-2">Hero</th>
                  <th className="px-2 py-2">Gun</th>
                  <th className="px-2 py-2">Burst</th>
                  <th className="px-2 py-2">% Burst</th>
                  <th className="px-2 py-2">Sustained</th>
                  <th className="px-2 py-2">% Sust.</th>
                  <th className="px-2 py-2">Base</th>
                  <th className="px-2 py-2">Mods</th>
                  <th className="px-2 py-2">Total</th>
                  <th className="px-2 py-2">TTK (s)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {selectedSummaries.map(({ model, baseDamage, extraDamage, totalDamageOverWindow, percentBurstDamage, percentSustainedDamage, totalGunDamage, timeToKill }) => (
                  <tr key={model.heroId} className="text-zinc-700 dark:text-zinc-200">
                    <td className="px-2 py-2 font-medium">{model.heroName}</td>
                    <td className="px-2 py-2">{integerFormatter.format(totalGunDamage)}</td>
                    <td className="px-2 py-2">{integerFormatter.format(model.burstDamageOverWindow)}</td>
                    <td className="px-2 py-2">{integerFormatter.format(percentBurstDamage)}</td>
                    <td className="px-2 py-2">{integerFormatter.format(model.sustainedDamageOverWindow)}</td>
                    <td className="px-2 py-2">{integerFormatter.format(percentSustainedDamage)}</td>
                    <td className="px-2 py-2">{integerFormatter.format(baseDamage)}</td>
                    <td className="px-2 py-2">{integerFormatter.format(extraDamage)}</td>
                    <td className="px-2 py-2">{integerFormatter.format(totalDamageOverWindow)}</td>
                    <td className="px-2 py-2">
                      {timeToKill ? oneDecimalFormatter.format(timeToKill) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            Percentage-based damage effects
          </h3>
          <div className="mt-3 space-y-4">
            {percentEffectDisplay.length ? (
              percentEffectDisplay.map(({ heroName, heroId, effects }) => (
                <div key={heroId} className="space-y-2">
                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{heroName}</p>
                  {effects.length ? (
                    <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                      {effects.map((effect, index) => (
                        <li key={`${heroId}-${effect.abilityName}-${index}`}>
                          <span className="font-medium text-zinc-700 dark:text-zinc-100">
                            {effect.abilityName}
                          </span>
                          {": "}
                          <span className="text-zinc-600 dark:text-zinc-300">
                            {effect.componentLabel}
                          </span>
                          {" · "}
                          <span className="text-zinc-700 dark:text-zinc-100">
                            {oneDecimalFormatter.format(effect.percentValue)}%
                          </span>
                          {effect.mode === "burst" ? " per cast" : " per second"}
                          {effect.mode === "burst" && effect.damagePerCast !== null ? (
                            <>
                              {" · "}
                              <span className="text-zinc-700 dark:text-zinc-100">
                                ≈ {integerFormatter.format(effect.damagePerCast)} dmg / cast
                              </span>
                            </>
                          ) : null}
                          {" · "}
                          <span className="text-zinc-700 dark:text-zinc-100">
                            ≈ {integerFormatter.format(effect.damageOverWindow)} dmg / {combatWindow}s
                          </span>
                          {effect.mode === "sustained" && effect.uptimeSeconds > 0 ? (
                            <>
                              {" · "}
                              uptime {oneDecimalFormatter.format(effect.uptimeSeconds)}s / {combatWindow}s window
                            </>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">No % based damage at current settings.</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Select heroes to see abilities that scale with enemy health.
              </p>
            )}
          </div>
        </div>
      </div>
    
      <MetricLineChart
        series={chartSeries}
        xLabel="Enemy health"
        yLabel="Seconds to defeat"
        header={
          <div className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-300 sm:flex-row sm:items-center sm:justify-between">
            <span>Time to defeat versus enemy health</span>
            <span>
              Level {level} · Spirit {spirit} · Window {combatWindow}s · Variant {damageVariant === "max" ? "Max" : "Min"} · Enemy HP {integerFormatter.format(enemyHealth)}
            </span>
          </div>
        }
        valueFormatter={(value) => oneDecimalFormatter.format(value)}
        xValueFormatter={(value) => `HP ${integerFormatter.format(value)}`}
        emptyMessage="Select at least one hero to display damage curves."
        tooltipOptions={{ primaryColumnLimit: 6, primaryColumnClassName: "grid-cols-1" }}
        invertY
      />
    </div>
    
  );
}


