export type HeroStartingStat = {
  value?: number | null;
  display_stat_name?: string | null;
};

export type Hero = {
  id: number;
  class_name: string;
  name: string;
  hero_type?: string | null;
  disabled?: boolean | null;
  description?: {
    role?: string | null;
    playstyle?: string | null;
  } | null;
  images?: {
    icon_image_small?: string | null;
    icon_image_small_webp?: string | null;
  } | null;
  items?: Record<string, string> | null;
  starting_stats?: {
    max_health?: HeroStartingStat;
    weapon_power?: HeroStartingStat;
    spirit_power?: HeroStartingStat;
    [key: string]: HeroStartingStat | undefined;
  } | null;
  level_info?: Record<string, { required_gold?: number | null } | undefined> | null;
  standard_level_up_upgrades?: Record<string, number | null | undefined> | null;
  scaling_stats?:
    | Record<
        string,
        {
          scaling_stat?: string | null;
          scale?: number | null;
        } | undefined
      >
    | null;
};

export type ItemProperty = {
  value?: string | number | null;
  label?: string | null;
  postfix?: string | null;
  postvalue_label?: string | null;
  css_class?: string | null;
  icon?: string | null;
  disable_value?: string | number | null;
  provided_property_type?: string | null;
  usage_flags?: string[] | null;
  negative_attribute?: boolean | null;
  scale_function?: {
    class_name?: string | null;
    subclass_name?: string | null;
    specific_stat_scale_type?: string | null;
    stat_scale?: number | string | null;
    stat_scale_secondary?: number | string | null;
    scaling_stats?: string[] | null;
  } | null;
};

export type ItemBase = {
  id: number;
  class_name: string;
  name: string;
  image?: string | null;
  image_webp?: string | null;
  hero?: number | null;
  heroes?: number[] | null;
  properties?: Record<string, ItemProperty | undefined> | null;
};

export type WeaponInfo = {
  bullet_damage?: number | null;
  clip_size?: number | null;
  cycle_time?: number | null;
  reload_duration?: number | null;
  bullets?: number | null;
  max_spin_cycle_time?: number | null;
  burst_shot_count?: number | null;
  intra_burst_cycle_time?: number | null;
};

export type WeaponItem = ItemBase & {
  type: "weapon";
  weapon_info?: WeaponInfo | null;
};

export type AbilityItem = ItemBase & {
  type: "ability";
  ability_type?: string | null;
  tooltip_details?: {
    info_sections?: Array<{
      properties_block?: Array<{
        properties?: Array<{
          important_property?: string | null;
          property_name?: string | null;
        }>;
      }>;
    }>;
  } | null;
  description?: {
    desc?: string | null;
    [key: string]: string | null;
  } | null;
  upgrades?: Array<{
    property_upgrades?: Array<{
      name?: string | null;
      bonus?: string | number | null;
      upgrade_type?: string | null;
      scale_stat_filter?: string | null;
    }> | null;
  }> | null;
};

export type UpgradeItem = ItemBase & {
  type: "upgrade" | string;
};

export type DeadlockItem = WeaponItem | AbilityItem | UpgradeItem;

