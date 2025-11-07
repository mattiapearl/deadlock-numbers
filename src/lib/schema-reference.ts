// Centralized documentation helpers for Deadlock API payloads.
// These descriptors are intended to make it easier to cross-reference
// raw API field names with their meaning inside the app.

export type SchemaDescriptor = {
  type: string;
  description?: string;
  optional?: boolean;
  example?: unknown;
  children?: Record<string, SchemaDescriptor | SchemaDescriptor[]>;
};

export const WeaponInfoSchema: SchemaDescriptor = {
  type: "object",
  description: "Primary/secondary weapon stats returned from the API",
  children: {
    bullet_damage: { type: "number | null", description: "Damage dealt per bullet", example: 22.5 },
    bullets: { type: "number | null", description: "Pellet count fired per cycle", example: 4 },
    clip_size: { type: "number | null", description: "Magazine size before reload", example: 24 },
    cycle_time: { type: "number | null", description: "Seconds between shots at base spin", example: 0.25 },
    max_spin_cycle_time: {
      type: "number | null",
      description: "Seconds between shots when fully spun up (if applicable)",
      optional: true,
      example: 0.18,
    },
    reload_duration: { type: "number | null", description: "Time in seconds to reload", example: 2.3 },
  },
};

export const HeroApiSchema: SchemaDescriptor = {
  type: "object",
  description: "Shape of the hero payload returned by /v2/heroes",
  children: {
    id: { type: "number", description: "Stable hero id", example: 5001 },
    class_name: { type: "string", description: "Internal hero identifier", example: "hero_archer" },
    name: { type: "string", description: "Display name", example: "Grey Talon" },
    hero_type: { type: "string | null", description: "Archetype bucket", optional: true },
    description: {
      type: "object | null",
      optional: true,
      children: {
        role: { type: "string | null", description: "Current in-game role label" },
        playstyle: { type: "string | null", description: "Short blurb summarising playstyle" },
      },
    },
    images: {
      type: "object | null",
      optional: true,
      children: {
        icon_image_small: { type: "string | null", description: "PNG hero badge" },
        icon_image_small_webp: { type: "string | null", description: "WEBP hero badge" },
        icon_hero_card: { type: "string | null", description: "Fallback larger promo art", optional: true },
      },
    },
    items: {
      type: "record<string, string> | null",
      description: "Map of loadout slots to item class names",
      example: { weapon_primary: "citadel_weapon_archer_set" },
    },
    starting_stats: {
      type: "object | null",
      description: "Baseline stats at level 1",
      children: {
        max_health: { type: "HeroStartingStat | undefined", description: "Base HP" },
        weapon_power: { type: "HeroStartingStat | undefined", description: "Base weapon damage scalar" },
        spirit_power: { type: "HeroStartingStat | undefined", description: "Base spirit power" },
      },
    },
    level_info: {
      type: "record<string, object> | null",
      description: "Per-level metadata including gold requirements",
      example: {
        "1": { required_gold: 0 },
        "10": { required_gold: 5400 },
      },
    },
    standard_level_up_upgrades: {
      type: "record<string, number | null | undefined> | null",
      description: "Numeric growth applied per level for standardized upgrades",
      example: {
        MODIFIER_VALUE_BASE_BULLET_DAMAGE_FROM_LEVEL: 0.91,
        MODIFIER_VALUE_TECH_POWER: 1.1,
      },
    },
    scaling_stats: {
      type: "record<string, object> | null",
      description: "Spirit infused bonuses keyed by internal stat names",
      children: {
        "*": {
          type: "object",
          description: "Individual scaling entry",
          children: {
            scaling_stat: {
              type: "string | null",
              description: "Targeted stat bucket (e.g. ETechPower)",
              example: "ETechPower",
            },
            scale: {
              type: "number | null",
              description: "Per-spirit contribution to the stat",
              example: 0.08,
            },
          },
        },
      },
    },
    disabled: { type: "boolean | undefined", description: "Whether the hero is currently disabled", optional: true },
  },
};

export const ItemApiSchema: SchemaDescriptor = {
  type: "object",
  description: "Shape of /v2/items payload entries",
  children: {
    id: { type: "number", description: "Stable item id" },
    class_name: { type: "string", description: "Internal item identifier" },
    name: { type: "string", description: "Display label", example: "Archon's Bow" },
    type: { type: "string", description: "Item category (weapon, ability, upgrade, etc.)" },
    hero: { type: "number | null", description: "Owning hero id (if single-hero item)", optional: true },
    heroes: { type: "number[] | null", description: "List of supported hero ids", optional: true },
    image: { type: "string | null", description: "Primary marketing image", optional: true },
    image_webp: { type: "string | null", description: "WEBP alternative", optional: true },
    properties: {
      type: "record<string, object> | null",
      description: "Additional display properties for the item UI",
    },
    weapon_info: {
      type: "WeaponInfo | null",
      description: "Only present for weapon entries",
      children: WeaponInfoSchema.children,
      optional: true,
    },
  },
};

export const ApiSchemas = {
  hero: HeroApiSchema,
  item: ItemApiSchema,
  weaponInfo: WeaponInfoSchema,
} as const;


