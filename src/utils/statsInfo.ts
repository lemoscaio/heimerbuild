import itemStatsIcons from "../assets/stats-icons"

export const statsInfo: StatsInfoType = {
  order: [
    "attackDamage",
    "abilityPower",
    "armor",
    "magicResistance",
    "attackSpeed",
    "abilityHaste",
    "criticalStrike",
    "movespeed",
    "health",
    "healthRegen",
    "mana",
    "manaRegen",
    "lethality",
    "armorPenetration",
    "flatMagicPenetration",
    "percentageMagicPenetration",
    "lifeSteal",
    "physicalVamp",
    "omniVamp",
    "attackRange",
    "tenacity",
  ],

  labels: {
    attackDamage: {
      label: "Attack Damage",
      short_label: "AD",
      icon: itemStatsIcons.attackDamage,
    },
    abilityPower: {
      label: "Ability Power",
      short_label: "AP",
      icon: itemStatsIcons.abilityPower,
    },
    armor: {
      label: "Armor",
      short_label: "Armor",
      icon: itemStatsIcons.armor,
    },
    magicResistance: {
      label: "Magic Resistance",
      short_label: "MR",
      icon: itemStatsIcons.magicResist,
    },
    attackSpeed: {
      label: "Attack Speed",
      short_label: "Atk Speed",
      suffix: "%",
      icon: itemStatsIcons.attackSpeed,
    },
    abilityHaste: {
      label: "Ability Haste",
      short_label: "AH",
      icon: itemStatsIcons.abilityHaste,
    },
    criticalStrike: {
      label: "Critical Strike",
      short_label: "Crit",
      anotherAlternativeLabel: "criticalStrikeChance",
      suffix: "%",
      icon: itemStatsIcons.criticalStrike,
    },
    movespeed: {
      label: "Movement Speed",
      short_label: "Move Speed",
      icon: itemStatsIcons.moveSpeed,
    },
    health: {
      label: "Health",
      short_label: "HP",
      icon: itemStatsIcons.health,
    },
    healthRegen: {
      label: "Health Regen",
      short_label: "HP Regen",
      suffix: "%",
      icon: itemStatsIcons.health,
    },
    mana: {
      label: "Mana",
      short_label: "MP",
      icon: itemStatsIcons.mana,
    },
    manaRegen: {
      label: "Mana Regen",
      short_label: "MP Regen",
      suffix: "%",
      icon: itemStatsIcons.mana,
    },
    lethality: {
      label: "Lethality",
      short_label: "Lethality",
      icon: itemStatsIcons.lethality,
    },
    armorPenetration: {
      label: "Armor Penetration",
      short_label: "Armor Pen",
      suffix: "%",
      icon: itemStatsIcons.armorPenetration,
    },
    magicPenetration: {
      label: "Magic Penetration",
      icon: itemStatsIcons.magicPenetration,
    },
    flatMagicPenetration: {
      label: "Flat Magic Penetration",
      short_label: "Flat Magic Pen",
      icon: itemStatsIcons.magicPenetration,
    },
    percentageMagicPenetration: {
      label: "Percent Magic Penetration",
      short_label: "% Magic Pen",
      suffix: "%",
      icon: itemStatsIcons.percentageMagicPenetration,
    },
    lifeSteal: {
      label: "Life Steal",
      short_label: "Life Steal",
      suffix: "%",
      icon: itemStatsIcons.lifeSteal,
    },
    physicalVamp: {
      label: "Physical Vamp",
      short_label: "Physical Vamp",
      suffix: "%",
      icon: itemStatsIcons.physicalVamp,
    },
    onHit: {
      label: "On-Hit",
      short_label: "On-Hit",
      icon: itemStatsIcons.onHit,
    },
    omniVamp: {
      label: "Omnivamp",
      short_label: "Omnivamp",
      suffix: "%",
      icon: itemStatsIcons.omniVamp,
    },
    attackRange: {
      label: "Attack Range",
      short_label: "Atk Range",
      icon: itemStatsIcons.attackRange,
    },
    tenacity: {
      label: "Tenacity",
      short_label: "Tenacity",
      suffix: "%",
      icon: itemStatsIcons.tenacity,
    },
  },

  alternativeLabels: {
    attack_damage: {
      label: "attackDamage",
    },
    ability_power: {
      label: "abilityPower",
    },
    attack_speed: {
      label: "attackSpeed",
    },
    ability_haste: {
      label: "abilityHaste",
    },
    critical_strike_chance: {
      label: "criticalStrike",
    },
    criticalStrikeChance: {
      label: "criticalStrike",
    },
    health_regen: {
      label: "healthRegen",
    },
    mana: {
      label: "Mana",
    },
    maga_regen: {
      label: "manaRegen",
    },
    lethality: {
      label: "Lethality",
    },
    armor_penetration: {
      label: "armorPenetration",
    },
    lifesteal: {
      label: "lifeSteal",
    },
    omnivamp: {
      label: "omniVamp",
    },
  },
}

type StatsType = string

// type StatsType =
//   | "attackDamage"
//   | "abilityPower"
//   | "armor"
//   | "magicResistance"
//   | "attackSpeed"
//   | "abilityHaste"
//   | "criticalStrike"
//   | "movespeed"
//   | "health"
//   | "healthRegen"
//   | "mana"
//   | "manaRegen"
//   | "lethality"
//   | "armorPenetration"
//   | "flatMagicPenetration"
//   | "percentageMagicPenetration"
//   | "lifeSteal"
//   | "physicalVamp"
//   | "omniVamp"
//   | "attackRange"
//   | "tenacity"

type AlternativeStats = string

// type AlternativeStats =
//   | "attack_damage"
//   | "ability_power"
//   | "attack_speed"
//   | "ability_haste"
//   | "critical_strike_chance"
//   | "criticalStrikeChance"
//   | "health_regen"
//   | "mana"
//   | "maga_regen"
//   | "lethality"
//   | "armor_penetration"
//   | "lifestea"
//   | "omnivam"

type StatsLabelType = {
  label: string
  short_label?: string
  suffix?: string
  anotherAlternativeLabel?: string
  icon: string
}

export type StatsInfoType = {
  order: StatsType[]
  labels: Record<StatsType, StatsLabelType>
  alternativeLabels: Record<AlternativeStats, { label: string }>
}
