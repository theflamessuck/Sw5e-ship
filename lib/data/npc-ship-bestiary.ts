export interface NpcAction {
  name: string
  type: "Action" | "Bonus Action" | "Reaction" | "Legendary Action"
  description: string
  attackBonus?: number
  range?: string
  damage?: string
  damageType?: string
}

export interface NpcShipStatblock {
  name: string
  faction:
    | "Galactic Empire"
    | "Pirates & Raiders"
    | "Bounty Hunters"
    | "Syndicates"
    | "Scavengers & Guilds"
    | "Republic / Separatist Surplus"
    | "Civilians"
    | "Custom"
  tier: 0 | 1 | 2 | 3 | 4 | 5
  tierOrCr: string
  threatClassification:
    | "Cannon Fodder (Minion)"
    | "Tactical Skirmisher (Elite)"
    | "Combat Brawler (Mini-Boss)"
    | "Tactical Controller (Deadly)"
    | "Apex Threat (Run Away)"
    | "Galactic Titan (Hide & Pray)"
  size: "Tiny" | "Small" | "Medium" | "Large" | "Huge" | "Gargantuan"
  shipType: string
  classification: "Threat" | "Vessel" | "Anomaly" | "Debris" | "Station"
  armorClass: number
  hullMax: number
  shieldsMax: number
  damageReduction?: number
  damageThreshold?: number
  speed: string
  turningSpeed: string
  stats: {
    str: number
    dex: number
    con: number
    int: number
    wis: number
    cha: number
  }
  savingThrows?: string
  skills?: string
  damageResistances?: string
  damageImmunities?: string
  conditionImmunities?: string
  senses?: string
  scanDc: number
  distance: string
  defaultNotes: string
  traits?: { name: string; description: string }[]
  actions: NpcAction[]
  bonusActions?: NpcAction[]
  reactions?: NpcAction[]
  legendaryActions?: {
    actionsPerRound: number
    actions: NpcAction[]
  }
}

export const DEFAULT_NPC_SHIP_BESTIARY: NpcShipStatblock[] = [
  // =========================================================================
  // TIER 0: CANNON FODDER (MINIONS) - PB: +2
  // =========================================================================
  {
    name: "Z-95 Headhunter (Pirate Refit)",
    faction: "Pirates & Raiders",
    tier: 0,
    tierOrCr: "CR 1/2 (Tier 0)",
    threatClassification: "Cannon Fodder (Minion)",
    size: "Small",
    shipType: "Snubfighter",
    classification: "Threat",
    armorClass: 12,
    hullMax: 16,
    shieldsMax: 0,
    damageReduction: 0,
    damageThreshold: 0,
    speed: "350 ft (7 hexes)",
    turningSpeed: "100 ft",
    stats: { str: 10, dex: 14, con: 12, int: 8, wis: 10, cha: 8 },
    savingThrows: "Dex +4",
    senses: "Passive Scan 10",
    scanDc: 11,
    distance: "10,000 km",
    defaultNotes: "Swarm attacker; fragile, breaks formation easily under fire.",
    traits: [
      {
        name: "Pack Tactics",
        description: "Advantage on attack rolls if an allied ship is within 150 ft of the target."
      },
      {
        name: "Fragile Frame",
        description: "Critical hits against this ship deal an additional 1d6 damage."
      }
    ],
    actions: [
      {
        name: "Twin Light Lasers",
        type: "Action",
        attackBonus: 4,
        range: "300/600 ft",
        damage: "1d6 + 2",
        damageType: "Energy",
        description: "Ranged Ship Attack: +4 to hit (+2 PB, +2 Dex), range 300/600 ft. Hit: 5 (1d6 + 2) energy damage."
      }
    ],
    reactions: [
      {
        name: "Jettison Cargo",
        type: "Reaction",
        description: "Disadvantage on one pursuing missile lock roll against this ship (1/combat)."
      }
    ]
  },
  {
    name: "TIE/ln Space Superiority Fighter",
    faction: "Galactic Empire",
    tier: 0,
    tierOrCr: "CR 1 (Tier 0)",
    threatClassification: "Cannon Fodder (Minion)",
    size: "Small",
    shipType: "Space Superiority Snubfighter",
    classification: "Threat",
    armorClass: 13,
    hullMax: 18,
    shieldsMax: 0,
    damageReduction: 0,
    damageThreshold: 0,
    speed: "400 ft (8 hexes)",
    turningSpeed: "50 ft",
    stats: { str: 10, dex: 16, con: 11, int: 8, wis: 12, cha: 8 },
    savingThrows: "Dex +5",
    senses: "Passive Scan 11",
    scanDc: 12,
    distance: "12,000 km",
    defaultNotes: "Fast unshielded interceptor; dangerous in concentrated crossfires.",
    traits: [
      {
        name: "Swarm Coordinates",
        description: "+1 bonus to attack rolls per adjacent allied TIE within 100 ft (max +3)."
      },
      {
        name: "Life Support Deficit",
        description: "Unshielded hull. If HP is reduced below 50%, cockpit decompression checks begin."
      }
    ],
    actions: [
      {
        name: "Twin Laser Cannons",
        type: "Action",
        attackBonus: 5,
        range: "300/600 ft",
        damage: "1d8 + 3",
        damageType: "Energy",
        description: "Ranged Ship Attack: +5 to hit (+2 PB, +3 Dex), range 300/600 ft. Hit: 7 (1d8 + 3) energy damage."
      }
    ],
    reactions: [
      {
        name: "Evasive Break",
        type: "Reaction",
        description: "Add +2 to AC against one incoming ranged attack roll."
      }
    ]
  },
  {
    name: "R-41 Starchaser",
    faction: "Pirates & Raiders",
    tier: 0,
    tierOrCr: "CR 1 (Tier 0)",
    threatClassification: "Cannon Fodder (Minion)",
    size: "Small",
    shipType: "Light Fighter",
    classification: "Threat",
    armorClass: 12,
    hullMax: 22,
    shieldsMax: 5,
    damageReduction: 0,
    damageThreshold: 0,
    speed: "300 ft (6 hexes)",
    turningSpeed: "100 ft",
    stats: { str: 12, dex: 14, con: 12, int: 8, wis: 10, cha: 10 },
    savingThrows: "Dex +4, Con +3",
    senses: "Passive Scan 10",
    scanDc: 11,
    distance: "14,000 km",
    defaultNotes: "Slightly tougher pirate picket; carries unguided light ordnance.",
    traits: [
      {
        name: "Jury-Rigged Capacitors",
        description: "Regenerates 1d4 shield points on a d6 roll of 5-6 at the start of its turn."
      }
    ],
    actions: [
      {
        name: "Dual Light Laser",
        type: "Action",
        attackBonus: 4,
        range: "300/600 ft",
        damage: "1d6 + 2",
        damageType: "Energy",
        description: "Ranged Ship Attack: +4 to hit, range 300/600 ft. Hit: 5 (1d6 + 2) energy damage."
      },
      {
        name: "Light Ion Cannon",
        type: "Action",
        attackBonus: 4,
        range: "200/400 ft",
        damage: "1d4 + 2",
        damageType: "Ion",
        description: "Ranged Ship Attack: +4 to hit. Hit: 4 (1d4 + 2) ion damage; disables 1 shield point on hit."
      }
    ],
    bonusActions: [
      {
        name: "Overcharge Thrusters",
        type: "Bonus Action",
        description: "Gain +50 ft speed this turn, but suffer -1 AC until the start of the next turn."
      }
    ]
  },
  {
    name: "Ugly Fighter (TYE-Wing / DIE-Wing)",
    faction: "Pirates & Raiders",
    tier: 0,
    tierOrCr: "CR 1/2 (Tier 0)",
    threatClassification: "Cannon Fodder (Minion)",
    size: "Small",
    shipType: "Jury-rigged Starfighter",
    classification: "Threat",
    armorClass: 11,
    hullMax: 14,
    shieldsMax: 0,
    damageReduction: 0,
    damageThreshold: 0,
    speed: "350 ft (7 hexes)",
    turningSpeed: "100 ft",
    stats: { str: 8, dex: 12, con: 10, int: 8, wis: 8, cha: 6 },
    savingThrows: "Dex +3",
    senses: "Passive Scan 9",
    scanDc: 10,
    distance: "11,000 km",
    defaultNotes: "Frankenstein starfighter combining TIE ball cockpit and Y-wing engines. Highly erratic.",
    traits: [
      {
        name: "Catastrophic Misfire",
        description: "Rolling a natural 1 on an attack roll deals 1d4 kinetic damage to itself."
      }
    ],
    actions: [
      {
        name: "Single Laser Cannon",
        type: "Action",
        attackBonus: 3,
        range: "300/600 ft",
        damage: "1d8 + 1",
        damageType: "Energy",
        description: "Ranged Ship Attack: +3 to hit, range 300/600 ft. Hit: 5 (1d8 + 1) energy damage."
      }
    ]
  },
  {
    name: "M3-A 'Scyk' Interceptor (Hutt Cartel)",
    faction: "Syndicates",
    tier: 0,
    tierOrCr: "CR 1 (Tier 0)",
    threatClassification: "Cannon Fodder (Minion)",
    size: "Small",
    shipType: "Light Interceptor",
    classification: "Threat",
    armorClass: 13,
    hullMax: 16,
    shieldsMax: 5,
    damageReduction: 0,
    damageThreshold: 0,
    speed: "400 ft (8 hexes)",
    turningSpeed: "50 ft",
    stats: { str: 10, dex: 16, con: 11, int: 10, wis: 10, cha: 8 },
    savingThrows: "Dex +5",
    senses: "Passive Scan 10",
    scanDc: 11,
    distance: "13,000 km",
    defaultNotes: "Hutt Cartel scout fighter with modular weapon hardpoints.",
    traits: [
      {
        name: "Modular Weapon Mount",
        description: "Can switch weapon profiles between engagements (Ion, Blaster, or Torpedo)."
      }
    ],
    actions: [
      {
        name: "Light Blaster Cannon",
        type: "Action",
        attackBonus: 5,
        range: "300/600 ft",
        damage: "1d6 + 3",
        damageType: "Energy",
        description: "Ranged Ship Attack: +5 to hit (+2 PB, +3 Dex). Hit: 6 (1d6 + 3) energy damage."
      }
    ],
    reactions: [
      {
        name: "Snap Jink",
        type: "Reaction",
        description: "Add +2 to AC against a single incoming attack."
      }
    ]
  },
  {
    name: "TIE/sa Bomber (Solo / Unescorted)",
    faction: "Galactic Empire",
    tier: 0,
    tierOrCr: "CR 1 (Tier 0)",
    threatClassification: "Cannon Fodder (Minion)",
    size: "Small",
    shipType: "Strike Bomber",
    classification: "Threat",
    armorClass: 11,
    hullMax: 24,
    shieldsMax: 0,
    damageReduction: 1,
    damageThreshold: 0,
    speed: "250 ft (5 hexes)",
    turningSpeed: "150 ft",
    stats: { str: 14, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
    savingThrows: "Str +4, Con +4",
    senses: "Passive Scan 10",
    scanDc: 11,
    distance: "15,000 km",
    defaultNotes: "Lumbering ordinance delivery vessel. Highly vulnerable when unescorted.",
    actions: [
      {
        name: "Light Laser Cannon",
        type: "Action",
        attackBonus: 3,
        range: "300/600 ft",
        damage: "1d6 + 1",
        damageType: "Energy",
        description: "Ranged Ship Attack: +3 to hit. Hit: 4 (1d6 + 1) energy damage."
      },
      {
        name: "Proton Torpedo Salvo (2 Ammo)",
        type: "Action",
        range: "500/1,500 ft",
        damage: "3d10",
        damageType: "Kinetic",
        description: "DC 12 Dex save. Fail: 16 (3d10) kinetic damage. Half on save."
      }
    ]
  },
  {
    name: "Toscan 8-Q Starfighter",
    faction: "Pirates & Raiders",
    tier: 0,
    tierOrCr: "CR 1 (Tier 0)",
    threatClassification: "Cannon Fodder (Minion)",
    size: "Small",
    shipType: "Multirole Fighter",
    classification: "Threat",
    armorClass: 12,
    hullMax: 20,
    shieldsMax: 5,
    damageReduction: 0,
    damageThreshold: 0,
    speed: "300 ft (6 hexes)",
    turningSpeed: "100 ft",
    stats: { str: 12, dex: 14, con: 12, int: 8, wis: 10, cha: 8 },
    savingThrows: "Dex +4, Con +3",
    senses: "Passive Scan 10",
    scanDc: 11,
    distance: "12,500 km",
    defaultNotes: "Outdated, durable civilian starfighter converted for border piracy.",
    actions: [
      {
        name: "Twin Laser Cannons",
        type: "Action",
        attackBonus: 4,
        range: "300/600 ft",
        damage: "1d8 + 2",
        damageType: "Energy",
        description: "Ranged Ship Attack: +4 to hit. Hit: 6 (1d8 + 2) energy damage."
      }
    ]
  },
  {
    name: "Pinook Fighter",
    faction: "Pirates & Raiders",
    tier: 0,
    tierOrCr: "CR 1/2 (Tier 0)",
    threatClassification: "Cannon Fodder (Minion)",
    size: "Small",
    shipType: "Light Snubfighter",
    classification: "Threat",
    armorClass: 11,
    hullMax: 12,
    shieldsMax: 0,
    damageReduction: 0,
    damageThreshold: 0,
    speed: "300 ft (6 hexes)",
    turningSpeed: "100 ft",
    stats: { str: 8, dex: 12, con: 10, int: 8, wis: 8, cha: 8 },
    savingThrows: "Dex +3",
    senses: "Passive Scan 9",
    scanDc: 10,
    distance: "9,000 km",
    defaultNotes: "Extremely cheap pirate interceptor; notoriously unshielded and disposable.",
    actions: [
      {
        name: "Light Blaster",
        type: "Action",
        attackBonus: 3,
        range: "300/600 ft",
        damage: "1d6 + 1",
        damageType: "Energy",
        description: "Ranged Ship Attack: +3 to hit. Hit: 4 (1d6 + 1) energy damage."
      }
    ]
  },
  {
    name: "V-wing Starfighter (Surplus / Mercenary)",
    faction: "Republic / Separatist Surplus",
    tier: 0,
    tierOrCr: "CR 1 (Tier 0)",
    threatClassification: "Cannon Fodder (Minion)",
    size: "Small",
    shipType: "Rapid Interceptor",
    classification: "Threat",
    armorClass: 14,
    hullMax: 16,
    shieldsMax: 0,
    damageReduction: 0,
    damageThreshold: 0,
    speed: "450 ft (9 hexes)",
    turningSpeed: "50 ft",
    stats: { str: 10, dex: 18, con: 11, int: 10, wis: 12, cha: 8 },
    savingThrows: "Dex +6",
    senses: "Passive Scan 11",
    scanDc: 13,
    distance: "14,000 km",
    defaultNotes: "Clone Wars surplus interceptor; blistering acceleration with paper-thin hull.",
    actions: [
      {
        name: "Twin Rapid Lasers",
        type: "Action",
        attackBonus: 6,
        range: "300/600 ft",
        damage: "1d8 + 4",
        damageType: "Energy",
        description: "Ranged Ship Attack: +6 to hit (+2 PB, +4 Dex). Hit: 8 (1d8 + 4) energy damage."
      }
    ],
    reactions: [
      {
        name: "Thruster Jink",
        type: "Reaction",
        description: "Add +2 to AC against an incoming attack roll."
      }
    ]
  },

  // =========================================================================
  // TIER 1: TACTICAL SKIRMISHER (ELITE) - PB: +2
  // =========================================================================
  {
    name: "TIE/in Interceptor",
    faction: "Galactic Empire",
    tier: 1,
    tierOrCr: "CR 3 (Tier 1)",
    threatClassification: "Tactical Skirmisher (Elite)",
    size: "Small",
    shipType: "High-Speed Interceptor",
    classification: "Threat",
    armorClass: 15,
    hullMax: 24,
    shieldsMax: 0,
    damageReduction: 0,
    damageThreshold: 0,
    speed: "450 ft (9 hexes)",
    turningSpeed: "50 ft",
    stats: { str: 10, dex: 18, con: 12, int: 10, wis: 14, cha: 8 },
    savingThrows: "Dex +6, Wis +4",
    senses: "Passive Scan 12",
    scanDc: 14,
    distance: "15,000 km",
    defaultNotes: "Deadly interceptor with high maneuverability and four wingtip cannons.",
    traits: [
      {
        name: "Autothrusters",
        description: "Attacks of opportunity against this ship have disadvantage."
      },
      {
        name: "Ace Reflexes",
        description: "Advantage on initiative rolls."
      }
    ],
    actions: [
      {
        name: "Multiattack",
        type: "Action",
        description: "Makes two Quad Laser Cannon attacks."
      },
      {
        name: "Quad Laser Cannons",
        type: "Action",
        attackBonus: 6,
        range: "300/600 ft",
        damage: "2d8 + 4",
        damageType: "Energy",
        description: "Ranged Ship Attack: +6 to hit (+2 PB, +4 Dex). Hit: 13 (2d8 + 4) energy damage."
      }
    ],
    reactions: [
      {
        name: "Barrel Roll",
        type: "Reaction",
        description: "Adds +3 to AC against one incoming ranged attack roll."
      }
    ]
  },
  {
    name: "CloakShape Fighter (Upgraded)",
    faction: "Pirates & Raiders",
    tier: 1,
    tierOrCr: "CR 3 (Tier 1)",
    threatClassification: "Tactical Skirmisher (Elite)",
    size: "Small",
    shipType: "Heavy Starfighter",
    classification: "Threat",
    armorClass: 13,
    hullMax: 32,
    shieldsMax: 10,
    damageReduction: 1,
    damageThreshold: 0,
    speed: "300 ft (6 hexes)",
    turningSpeed: "100 ft",
    stats: { str: 14, dex: 14, con: 14, int: 8, wis: 10, cha: 8 },
    savingThrows: "Str +4, Con +4",
    senses: "Passive Scan 10",
    scanDc: 12,
    distance: "13,500 km",
    defaultNotes: "Heavily upgraded obsolete chassis with aftermarket shield generators and ion cannons.",
    actions: [
      {
        name: "Twin Heavy Blasters",
        type: "Action",
        attackBonus: 4,
        range: "400/800 ft",
        damage: "2d6 + 2",
        damageType: "Energy",
        description: "Ranged Ship Attack: +4 to hit. Hit: 9 (2d6 + 2) energy damage."
      },
      {
        name: "Light Ion Cannon",
        type: "Action",
        attackBonus: 4,
        range: "300/600 ft",
        damage: "1d8 + 2",
        damageType: "Ion",
        description: "Ranged Ship Attack: +4 to hit. Hit: 6 (1d8 + 2) ion damage."
      }
    ]
  },
  {
    name: "Skipray Blastboat",
    faction: "Scavengers & Guilds",
    tier: 1,
    tierOrCr: "CR 4 (Tier 1)",
    threatClassification: "Tactical Skirmisher (Elite)",
    size: "Medium",
    shipType: "Armed Gunship",
    classification: "Threat",
    armorClass: 14,
    hullMax: 48,
    shieldsMax: 25,
    damageReduction: 2,
    damageThreshold: 0,
    speed: "350 ft (7 hexes)",
    turningSpeed: "100 ft",
    stats: { str: 16, dex: 14, con: 16, int: 10, wis: 12, cha: 10 },
    savingThrows: "Str +5, Con +5",
    senses: "Passive Scan 11",
    scanDc: 14,
    distance: "18,000 km",
    defaultNotes: "Pound-for-pound one of the heaviest armed gunboats in the galaxy.",
    actions: [
      {
        name: "Twin Heavy Ion Batteries",
        type: "Action",
        attackBonus: 5,
        range: "400/800 ft",
        damage: "2d8 + 3",
        damageType: "Ion",
        description: "Ranged Ship Attack: +5 to hit. Hit: 12 (2d8 + 3) ion damage."
      },
      {
        name: "Proton Torpedo Tube",
        type: "Action",
        range: "600/1,800 ft",
        damage: "4d10",
        damageType: "Kinetic",
        description: "DC 13 Dex save. Fail: 22 (4d10) kinetic damage. Half on save."
      }
    ]
  },
  {
    name: "TIE/sa Bomber (Escorted Flight)",
    faction: "Galactic Empire",
    tier: 1,
    tierOrCr: "CR 3 (Tier 1)",
    threatClassification: "Tactical Skirmisher (Elite)",
    size: "Small",
    shipType: "Heavy Ordinance Bomber",
    classification: "Threat",
    armorClass: 13,
    hullMax: 28,
    shieldsMax: 15,
    damageReduction: 1,
    damageThreshold: 0,
    speed: "300 ft (6 hexes)",
    turningSpeed: "100 ft",
    stats: { str: 14, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    savingThrows: "Str +4, Con +4",
    senses: "Passive Scan 11",
    scanDc: 13,
    distance: "14,000 km",
    defaultNotes: "Covered by dedicated escorts, free to deliver devastating ordnance payloads.",
    actions: [
      {
        name: "Twin Laser Cannons",
        type: "Action",
        attackBonus: 4,
        range: "300/600 ft",
        damage: "1d8 + 2",
        damageType: "Energy",
        description: "Ranged Ship Attack: +4 to hit. Hit: 6 (1d8 + 2) energy damage."
      },
      {
        name: "Concussion Missile Volley",
        type: "Action",
        range: "600/1,800 ft",
        damage: "3d8 + 2",
        damageType: "Kinetic",
        description: "DC 13 Dex save. Fail: 15 (3d8 + 2) kinetic damage."
      }
    ]
  },
  {
    name: "G1-M4-C Dunelizard Fighter",
    faction: "Bounty Hunters",
    tier: 1,
    tierOrCr: "CR 3 (Tier 1)",
    threatClassification: "Tactical Skirmisher (Elite)",
    size: "Small",
    shipType: "Medium Fighter",
    classification: "Threat",
    armorClass: 14,
    hullMax: 34,
    shieldsMax: 20,
    damageReduction: 1,
    damageThreshold: 0,
    speed: "350 ft (7 hexes)",
    turningSpeed: "100 ft",
    stats: { str: 12, dex: 16, con: 14, int: 10, wis: 12, cha: 10 },
    savingThrows: "Dex +5, Con +4",
    senses: "Passive Scan 11",
    scanDc: 13,
    distance: "16,000 km",
    defaultNotes: "MandalMotors design prized by syndicate enforcers and cartel guns.",
    actions: [
      {
        name: "Heavy Blaster Cannons",
        type: "Action",
        attackBonus: 5,
        range: "400/800 ft",
        damage: "2d6 + 3",
        damageType: "Energy",
        description: "Ranged Ship Attack: +5 to hit. Hit: 10 (2d6 + 3) energy damage."
      }
    ]
  },
  {
    name: "Kihraxz Assault Fighter",
    faction: "Bounty Hunters",
    tier: 1,
    tierOrCr: "CR 4 (Tier 1)",
    threatClassification: "Tactical Skirmisher (Elite)",
    size: "Small",
    shipType: "Assault Fighter",
    classification: "Threat",
    armorClass: 14,
    hullMax: 30,
    shieldsMax: 25,
    damageReduction: 1,
    damageThreshold: 0,
    speed: "350 ft (7 hexes)",
    turningSpeed: "100 ft",
    stats: { str: 14, dex: 16, con: 14, int: 10, wis: 12, cha: 10 },
    savingThrows: "Dex +5, Con +4",
    senses: "Passive Scan 11",
    scanDc: 13,
    distance: "15,500 km",
    defaultNotes: "TransGalMeg Industries competitor to the X-wing, favorite of the Black Sun.",
    actions: [
      {
        name: "Dual Heavy Lasers",
        type: "Action",
        attackBonus: 5,
        range: "400/800 ft",
        damage: "2d8 + 3",
        damageType: "Energy",
        description: "Ranged Ship Attack: +5 to hit. Hit: 12 (2d8 + 3) energy damage."
      }
    ],
    bonusActions: [
      {
        name: "Quick-Lock Missile (2 Ammo)",
        type: "Bonus Action",
        attackBonus: 5,
        range: "400/800 ft",
        damage: "3d8",
        damageType: "Kinetic",
        description: "Fires an unguided missile payload."
      }
    ]
  },
  {
    name: "M22-T Krayt Gunship",
    faction: "Bounty Hunters",
    tier: 1,
    tierOrCr: "CR 4 (Tier 1)",
    threatClassification: "Tactical Skirmisher (Elite)",
    size: "Medium",
    shipType: "Heavy Gunship",
    classification: "Threat",
    armorClass: 13,
    hullMax: 45,
    shieldsMax: 30,
    damageReduction: 2,
    damageThreshold: 0,
    speed: "300 ft (6 hexes)",
    turningSpeed: "100 ft",
    stats: { str: 16, dex: 12, con: 16, int: 10, wis: 12, cha: 10 },
    savingThrows: "Str +5, Con +5",
    senses: "Passive Scan 11",
    scanDc: 13,
    distance: "17,000 km",
    defaultNotes: "Heavily armored gunboat designed for convoy interdiction and system enforcement.",
    actions: [
      {
        name: "Twin Heavy Blaster Cannons",
        type: "Action",
        attackBonus: 5,
        range: "400/800 ft",
        damage: "2d8 + 3",
        damageType: "Energy",
        description: "Ranged Ship Attack: +5 to hit. Hit: 12 (2d8 + 3) energy damage."
      }
    ]
  },
  {
    name: "GAT-12 Skipray Blastboat (Patrol Spec)",
    faction: "Galactic Empire",
    tier: 1,
    tierOrCr: "CR 4 (Tier 1)",
    threatClassification: "Tactical Skirmisher (Elite)",
    size: "Medium",
    shipType: "Imperial Picket Gunship",
    classification: "Threat",
    armorClass: 14,
    hullMax: 46,
    shieldsMax: 25,
    damageReduction: 2,
    damageThreshold: 0,
    speed: "350 ft (7 hexes)",
    turningSpeed: "100 ft",
    stats: { str: 16, dex: 14, con: 16, int: 12, wis: 12, cha: 10 },
    savingThrows: "Str +5, Con +5",
    senses: "Passive Scan 11",
    scanDc: 14,
    distance: "18,000 km",
    defaultNotes: "Official Imperial Navy patrol variant with synchronized targeting telemetry.",
    actions: [
      {
        name: "Triple Medium Ion Cannons",
        type: "Action",
        attackBonus: 5,
        range: "400/800 ft",
        damage: "2d8 + 3",
        damageType: "Ion",
        description: "Ranged Ship Attack: +5 to hit. Hit: 12 (2d8 + 3) ion damage."
      }
    ]
  },
  {
    name: "StarViper-class Attack Platform",
    faction: "Bounty Hunters",
    tier: 1,
    tierOrCr: "CR 5 (Tier 1)",
    threatClassification: "Tactical Skirmisher (Elite)",
    size: "Small",
    shipType: "Heavy Strike Fighter",
    classification: "Threat",
    armorClass: 16,
    hullMax: 28,
    shieldsMax: 30,
    damageReduction: 0,
    damageThreshold: 0,
    speed: "400 ft (8 hexes)",
    turningSpeed: "50 ft",
    stats: { str: 12, dex: 18, con: 14, int: 12, wis: 14, cha: 12 },
    savingThrows: "Dex +6, Wis +4",
    senses: "Passive Scan 12",
    scanDc: 15,
    distance: "16,500 km",
    defaultNotes: "MandalMotors masterpiece with variable geometry S-foils and Micro-thrust verniers.",
    traits: [
      {
        name: "Omni-directional Thrusters",
        description: "Can turn up to 90 degrees without spending tactical movement speed."
      }
    ],
    actions: [
      {
        name: "Heavy Laser Cannons",
        type: "Action",
        attackBonus: 6,
        range: "400/800 ft",
        damage: "2d8 + 4",
        damageType: "Energy",
        description: "Ranged Ship Attack: +6 to hit. Hit: 13 (2d8 + 4) energy damage."
      }
    ],
    reactions: [
      {
        name: "Vectored Jink",
        type: "Reaction",
        description: "Adds +3 to AC against a single incoming attack."
      }
    ]
  },
  {
    name: "H-type Nubian Yacht (Pirate Gunship Conversion)",
    faction: "Pirates & Raiders",
    tier: 1,
    tierOrCr: "CR 4 (Tier 1)",
    threatClassification: "Tactical Skirmisher (Elite)",
    size: "Medium",
    shipType: "Modified Armed Yacht",
    classification: "Threat",
    armorClass: 15,
    hullMax: 40,
    shieldsMax: 35,
    damageReduction: 1,
    damageThreshold: 0,
    speed: "350 ft (7 hexes)",
    turningSpeed: "100 ft",
    stats: { str: 14, dex: 16, con: 14, int: 12, wis: 14, cha: 14 },
    savingThrows: "Dex +5, Cha +4",
    senses: "Passive Scan 12",
    scanDc: 14,
    distance: "19,000 km",
    defaultNotes: "Sleek chromium hull retrofitted with illegal turret rings and high-drain power taps.",
    actions: [
      {
        name: "Twin Swivel Blaster Turrets",
        type: "Action",
        attackBonus: 5,
        range: "400/800 ft",
        damage: "2d8 + 3",
        damageType: "Energy",
        description: "Ranged Ship Attack: 360-degree arc, +5 to hit. Hit: 12 (2d8 + 3) energy damage."
      },
      {
        name: "Tractor Snare",
        type: "Action",
        range: "300 ft",
        description: "DC 13 Str save. Target ship speed drops to 0 until the end of its next turn."
      }
    ]
  },
  {
    name: "TIE/sk x1 'Striker' Atmospheric Fighter",
    faction: "Galactic Empire",
    tier: 1,
    tierOrCr: "CR 3 (Tier 1)",
    threatClassification: "Tactical Skirmisher (Elite)",
    size: "Small",
    shipType: "Atmospheric Fighter",
    classification: "Threat",
    armorClass: 15,
    hullMax: 26,
    shieldsMax: 10,
    damageReduction: 0,
    damageThreshold: 0,
    speed: "450 ft (9 hexes)",
    turningSpeed: "50 ft",
    stats: { str: 10, dex: 18, con: 12, int: 10, wis: 12, cha: 8 },
    savingThrows: "Dex +6",
    senses: "Passive Scan 11",
    scanDc: 13,
    distance: "14,500 km",
    defaultNotes: "Specialized planetary defense starfighter with massive flat aerofoil wings.",
    actions: [
      {
        name: "Quad Laser Cannons",
        type: "Action",
        attackBonus: 6,
        range: "300/600 ft",
        damage: "2d8 + 4",
        damageType: "Energy",
        description: "Ranged Ship Attack: +6 to hit. Hit: 13 (2d8 + 4) energy damage."
      }
    ]
  },

  // =========================================================================
  // TIER 2: COMBAT BRAWLER (MINI-BOSS) - PB: +3
  // =========================================================================
  {
    name: "Gozanti-class Armed Cruiser",
    faction: "Galactic Empire",
    tier: 2,
    tierOrCr: "CR 6 (Tier 2)",
    threatClassification: "Combat Brawler (Mini-Boss)",
    size: "Medium",
    shipType: "Armed Transport / Carrier",
    classification: "Threat",
    armorClass: 14,
    hullMax: 55,
    shieldsMax: 35,
    damageReduction: 2,
    damageThreshold: 0,
    speed: "300 ft (6 hexes)",
    turningSpeed: "150 ft",
    stats: { str: 18, dex: 12, con: 16, int: 12, wis: 12, cha: 10 },
    savingThrows: "Str +7, Con +6",
    senses: "Passive Scan 11",
    scanDc: 14,
    distance: "20,000 km",
    defaultNotes: "Workhorse armed transport; carries 4 external docking clamps for fighters.",
    traits: [
      {
        name: "External Clamps",
        description: "Can carry up to 4 TIE fighters or Z-95s docked under its belly."
      }
    ],
    actions: [
      {
        name: "Twin Heavy Laser Turrets",
        type: "Action",
        attackBonus: 7,
        range: "400/800 ft",
        damage: "2d8 + 4",
        damageType: "Energy",
        description: "Ranged Ship Attack: +7 to hit (+3 PB, +4 Str). Hit: 13 (2d8 + 4) energy damage."
      },
      {
        name: "Fighter Scramble",
        type: "Action",
        description: "Deploys 2 docked fighters into adjacent space on their own initiative."
      }
    ]
  },
  {
    name: "IPV-1 System Patrol Craft",
    faction: "Galactic Empire",
    tier: 2,
    tierOrCr: "CR 6 (Tier 2)",
    threatClassification: "Combat Brawler (Mini-Boss)",
    size: "Medium",
    shipType: "System Patrol Craft",
    classification: "Threat",
    armorClass: 15,
    hullMax: 70,
    shieldsMax: 40,
    damageReduction: 3,
    damageThreshold: 0,
    speed: "300 ft (6 hexes)",
    turningSpeed: "150 ft",
    stats: { str: 18, dex: 12, con: 16, int: 12, wis: 14, cha: 10 },
    savingThrows: "Str +7, Con +6",
    senses: "Passive Scan 12",
    scanDc: 15,
    distance: "21,000 km",
    defaultNotes: "Sub-light customs and enforcement gunboat with thick armor plating.",
    actions: [
      {
        name: "Turbolaser Battery",
        type: "Action",
        attackBonus: 7,
        range: "600/1,200 ft",
        damage: "2d10 + 4",
        damageType: "Energy",
        description: "Ranged Ship Attack: +7 to hit. Hit: 15 (2d10 + 4) energy damage."
      }
    ]
  },
  {
    name: "Corellian CR90 Corvette",
    faction: "Civilians",
    tier: 2,
    tierOrCr: "CR 8 (Tier 2)",
    threatClassification: "Combat Brawler (Mini-Boss)",
    size: "Large",
    shipType: "Blockade Runner Corvette",
    classification: "Threat",
    armorClass: 15,
    hullMax: 95,
    shieldsMax: 60,
    damageReduction: 3,
    damageThreshold: 0,
    speed: "350 ft (7 hexes)",
    turningSpeed: "150 ft",
    stats: { str: 20, dex: 14, con: 18, int: 14, wis: 14, cha: 14 },
    savingThrows: "Str +8, Con +7, Dex +5",
    senses: "Passive Scan 12",
    scanDc: 16,
    distance: "25,000 km",
    defaultNotes: "Iconic blockade runner with 11 massive sublight thrusters and 6 dual turbolasers.",
    traits: [
      {
        name: "Blockade Runner Engines",
        description: "Immune to speed reduction effects; can Dash as a bonus action."
      },
      {
        name: "Legendary Resistance (1/Day)",
        description: "If this ship fails a saving throw, it can choose to succeed instead."
      }
    ],
    actions: [
      {
        name: "Dual Turbolaser Battery Salvo",
        type: "Action",
        attackBonus: 8,
        range: "600/1,200 ft",
        damage: "2d10 + 5",
        damageType: "Energy",
        description: "Ranged Ship Attack: Fires into target arc, +8 to hit. Hit: 16 (2d10 + 5) energy damage."
      }
    ],
    bonusActions: [
      {
        name: "Full Power to Deflectors",
        type: "Bonus Action",
        description: "Restores 15 temporary shield points to its depleted quadrant."
      }
    ]
  },
  {
    name: "Firespray-31 Patrol and Attack Craft",
    faction: "Bounty Hunters",
    tier: 2,
    tierOrCr: "CR 7 (Tier 2)",
    threatClassification: "Combat Brawler (Mini-Boss)",
    size: "Medium",
    shipType: "Patrol Craft",
    classification: "Threat",
    armorClass: 15,
    hullMax: 50,
    shieldsMax: 40,
    damageReduction: 2,
    damageThreshold: 0,
    speed: "350 ft (7 hexes)",
    turningSpeed: "100 ft",
    stats: { str: 16, dex: 14, con: 16, int: 14, wis: 14, cha: 12 },
    savingThrows: "Dex +5, Con +6, Wis +5",
    senses: "Passive Scan 12",
    scanDc: 16,
    distance: "18,000 km",
    defaultNotes: "Infamous Kuat Systems Engineering pursuit craft retrofitted for lethal bounties.",
    traits: [
      {
        name: "Legendary Resistance (1/Day)",
        description: "If this ship fails a saving throw, it can choose to succeed instead."
      }
    ],
    actions: [
      {
        name: "Twin Heavy Blaster Cannons",
        type: "Action",
        attackBonus: 5,
        range: "400/800 ft",
        damage: "2d8 + 2",
        damageType: "Energy",
        description: "Ranged Ship Attack: +5 to hit (+3 PB, +2 Dex). Hit: 11 (2d8 + 2) energy damage."
      },
      {
        name: "Tractor Beam Lock",
        type: "Action",
        range: "300 ft",
        description: "DC 14 Str save. On fail, target ship speed is reduced to 0 and pulled 100 ft closer."
      }
    ],
    bonusActions: [
      {
        name: "Seismic Charge Drop (2 Ammo)",
        type: "Bonus Action",
        description: "Drops an acoustic mine aft. Explodes at round start: DC 15 Con save or 4d10 sonic/kinetic damage in 200 ft radius."
      }
    ]
  },
  {
    name: "Lancer-class Pursuit Craft (Shadow Caster)",
    faction: "Bounty Hunters",
    tier: 2,
    tierOrCr: "CR 7 (Tier 2)",
    threatClassification: "Combat Brawler (Mini-Boss)",
    size: "Medium",
    shipType: "Pursuit Craft",
    classification: "Threat",
    armorClass: 15,
    hullMax: 55,
    shieldsMax: 45,
    damageReduction: 2,
    damageThreshold: 0,
    speed: "400 ft (8 hexes)",
    turningSpeed: "100 ft",
    stats: { str: 16, dex: 16, con: 16, int: 12, wis: 14, cha: 12 },
    savingThrows: "Dex +6, Con +6",
    senses: "Passive Scan 12",
    scanDc: 15,
    distance: "20,000 km",
    defaultNotes: "Mandalorian pursuit craft equipped with dorsal tractor beam and laser arrays.",
    actions: [
      {
        name: "Dorsal Laser Turret",
        type: "Action",
        attackBonus: 6,
        range: "400/800 ft",
        damage: "2d8 + 3",
        damageType: "Energy",
        description: "Ranged Ship Attack: +6 to hit. Hit: 12 (2d8 + 3) energy damage."
      }
    ]
  },
  {
    name: "Consular-class Armed Cruiser (Charger c70)",
    faction: "Republic / Separatist Surplus",
    tier: 2,
    tierOrCr: "CR 7 (Tier 2)",
    threatClassification: "Combat Brawler (Mini-Boss)",
    size: "Large",
    shipType: "Armed Frigate",
    classification: "Threat",
    armorClass: 15,
    hullMax: 85,
    shieldsMax: 55,
    damageReduction: 3,
    damageThreshold: 0,
    speed: "300 ft (6 hexes)",
    turningSpeed: "150 ft",
    stats: { str: 18, dex: 12, con: 16, int: 14, wis: 14, cha: 12 },
    savingThrows: "Str +7, Con +6",
    senses: "Passive Scan 12",
    scanDc: 15,
    distance: "22,000 km",
    defaultNotes: "Clone Wars retrofit replacing the diplomatic salon with turbolasers and missile tubes.",
    actions: [
      {
        name: "Twin Turbolaser Battery",
        type: "Action",
        attackBonus: 7,
        range: "600/1,200 ft",
        damage: "2d10 + 4",
        damageType: "Energy",
        description: "Ranged Ship Attack: +7 to hit. Hit: 15 (2d10 + 4) energy damage."
      }
    ]
  },
  {
    name: "Raider-class Corvette",
    faction: "Galactic Empire",
    tier: 2,
    tierOrCr: "CR 8 (Tier 2)",
    threatClassification: "Combat Brawler (Mini-Boss)",
    size: "Large",
    shipType: "Anti-Starfighter Corvette",
    classification: "Threat",
    armorClass: 16,
    hullMax: 75,
    shieldsMax: 50,
    damageReduction: 2,
    damageThreshold: 0,
    speed: "350 ft (7 hexes)",
    turningSpeed: "100 ft",
    stats: { str: 16, dex: 16, con: 16, int: 14, wis: 14, cha: 12 },
    savingThrows: "Dex +6, Con +6",
    senses: "Passive Scan 12",
    scanDc: 16,
    distance: "22,000 km",
    defaultNotes: "Imperial fast-attack corvette designed specifically to hunt Rebel starfighters.",
    traits: [
      {
        name: "Legendary Resistance (1/Day)",
        description: "If this ship fails a saving throw, it can choose to succeed instead."
      }
    ],
    actions: [
      {
        name: "Heavy Laser Cannons",
        type: "Action",
        attackBonus: 6,
        range: "400/800 ft",
        damage: "2d8 + 3",
        damageType: "Energy",
        description: "Ranged Ship Attack: +6 to hit. Hit: 12 (2d8 + 3) energy damage."
      },
      {
        name: "Ion Cannon Batteries",
        type: "Action",
        attackBonus: 6,
        range: "400/800 ft",
        damage: "2d8 + 3",
        damageType: "Ion",
        description: "Ranged Ship Attack: +6 to hit. Hit: 12 (2d8 + 3) ion damage."
      }
    ]
  },
  {
    name: "Kom'rk-class Fighter/Transport (Gauntlet)",
    faction: "Bounty Hunters",
    tier: 2,
    tierOrCr: "CR 6 (Tier 2)",
    threatClassification: "Combat Brawler (Mini-Boss)",
    size: "Medium",
    shipType: "Troop Carrier Gunship",
    classification: "Threat",
    armorClass: 16,
    hullMax: 48,
    shieldsMax: 40,
    damageReduction: 2,
    damageThreshold: 0,
    speed: "350 ft (7 hexes)",
    turningSpeed: "100 ft",
    stats: { str: 16, dex: 16, con: 16, int: 12, wis: 14, cha: 12 },
    savingThrows: "Dex +6, Con +6",
    senses: "Passive Scan 12",
    scanDc: 15,
    distance: "19,000 km",
    defaultNotes: "Mandalorian heavy fighter-transport with rotating wing housing for extreme maneuverability.",
    actions: [
      {
        name: "Twin Heavy Laser Cannons",
        type: "Action",
        attackBonus: 6,
        range: "400/800 ft",
        damage: "2d8 + 3",
        damageType: "Energy",
        description: "Ranged Ship Attack: +6 to hit. Hit: 12 (2d8 + 3) energy damage."
      }
    ]
  },
  {
    name: "Modified YT-2400 Light Freighter",
    faction: "Scavengers & Guilds",
    tier: 2,
    tierOrCr: "CR 6 (Tier 2)",
    threatClassification: "Combat Brawler (Mini-Boss)",
    size: "Medium",
    shipType: "Armed Freighter",
    classification: "Threat",
    armorClass: 14,
    hullMax: 52,
    shieldsMax: 45,
    damageReduction: 2,
    damageThreshold: 0,
    speed: "350 ft (7 hexes)",
    turningSpeed: "100 ft",
    stats: { str: 16, dex: 14, con: 16, int: 12, wis: 12, cha: 12 },
    savingThrows: "Str +6, Con +6",
    senses: "Passive Scan 11",
    scanDc: 14,
    distance: "18,500 km",
    defaultNotes: "Armored Corellian transport with heavy military-grade dorsal/ventral turrets.",
    actions: [
      {
        name: "Dorsal Quad Laser Turret",
        type: "Action",
        attackBonus: 5,
        range: "400/800 ft",
        damage: "2d8 + 2",
        damageType: "Energy",
        description: "Ranged Ship Attack: 360-degree arc, +5 to hit. Hit: 11 (2d8 + 2) energy damage."
      }
    ]
  },
  {
    name: "Braha'tok-class Gunship (Dornean Gunship)",
    faction: "Civilians",
    tier: 2,
    tierOrCr: "CR 8 (Tier 2)",
    threatClassification: "Combat Brawler (Mini-Boss)",
    size: "Large",
    shipType: "System Gunship",
    classification: "Threat",
    armorClass: 14,
    hullMax: 105,
    shieldsMax: 50,
    damageReduction: 4,
    damageThreshold: 5,
    speed: "250 ft (5 hexes)",
    turningSpeed: "200 ft",
    stats: { str: 20, dex: 10, con: 18, int: 12, wis: 12, cha: 10 },
    savingThrows: "Str +8, Con +7",
    senses: "Passive Scan 11",
    scanDc: 15,
    distance: "23,000 km",
    defaultNotes: "Dornean anti-starfighter gunship bristling with turbolasers and concussion racks.",
    actions: [
      {
        name: "Dual Turbolaser Turrets",
        type: "Action",
        attackBonus: 8,
        range: "600/1,200 ft",
        damage: "2d10 + 5",
        damageType: "Energy",
        description: "Ranged Ship Attack: +8 to hit. Hit: 16 (2d10 + 5) energy damage."
      }
    ]
  },
  {
    name: "YKL-37R Nova Courier (Black Sun Conversion)",
    faction: "Syndicates",
    tier: 2,
    tierOrCr: "CR 6 (Tier 2)",
    threatClassification: "Combat Brawler (Mini-Boss)",
    size: "Medium",
    shipType: "Blockade Courier",
    classification: "Threat",
    armorClass: 15,
    hullMax: 44,
    shieldsMax: 35,
    damageReduction: 2,
    damageThreshold: 0,
    speed: "400 ft (8 hexes)",
    turningSpeed: "100 ft",
    stats: { str: 14, dex: 16, con: 14, int: 12, wis: 14, cha: 12 },
    savingThrows: "Dex +6, Con +5",
    senses: "Passive Scan 12",
    scanDc: 14,
    distance: "19,500 km",
    defaultNotes: "Black Sun smuggling vessel upgraded with reinforced engine couplings.",
    actions: [
      {
        name: "Heavy Blaster Cannons",
        type: "Action",
        attackBonus: 6,
        range: "400/800 ft",
        damage: "2d8 + 3",
        damageType: "Energy",
        description: "Ranged Ship Attack: +6 to hit. Hit: 12 (2d8 + 3) energy damage."
      }
    ]
  },
  {
    name: "DP20 Frigate (Corellian Gunship)",
    faction: "Civilians",
    tier: 2,
    tierOrCr: "CR 8 (Tier 2)",
    threatClassification: "Combat Brawler (Mini-Boss)",
    size: "Large",
    shipType: "Assault Gunship",
    classification: "Threat",
    armorClass: 15,
    hullMax: 90,
    shieldsMax: 55,
    damageReduction: 3,
    damageThreshold: 0,
    speed: "350 ft (7 hexes)",
    turningSpeed: "150 ft",
    stats: { str: 18, dex: 14, con: 18, int: 14, wis: 14, cha: 12 },
    savingThrows: "Str +7, Con +7",
    senses: "Passive Scan 12",
    scanDc: 16,
    distance: "24,000 km",
    defaultNotes: "Dedicated Corellian warship sacrificing cargo space entirely for heavy guns.",
    actions: [
      {
        name: "Turbolaser Salvo",
        type: "Action",
        attackBonus: 7,
        range: "600/1,200 ft",
        damage: "2d10 + 4",
        damageType: "Energy",
        description: "Ranged Ship Attack: +7 to hit. Hit: 15 (2d10 + 4) energy damage."
      }
    ]
  },

  // =========================================================================
  // TIER 3: TACTICAL CONTROLLER (DEADLY) - PB: +4
  // =========================================================================
  {
    name: "Nebulon-B Escort Frigate",
    faction: "Civilians",
    tier: 3,
    tierOrCr: "CR 10 (Tier 3)",
    threatClassification: "Tactical Controller (Deadly)",
    size: "Large",
    shipType: "Escort Frigate",
    classification: "Threat",
    armorClass: 16,
    hullMax: 140,
    shieldsMax: 90,
    damageReduction: 5,
    damageThreshold: 8,
    speed: "250 ft (5 hexes)",
    turningSpeed: "200 ft",
    stats: { str: 22, dex: 10, con: 20, int: 16, wis: 16, cha: 14 },
    savingThrows: "Str +10, Con +9, Wis +7",
    senses: "Passive Scan 13",
    scanDc: 17,
    distance: "28,000 km",
    defaultNotes: "Standard Imperial & Rebel escort vessel. Connecting spar is structurally vulnerable.",
    traits: [
      {
        name: "Vulnerable Mid-Section",
        description: "Attacks targeting the narrow connecting neck ignore DR and score critical hits on 19-20."
      },
      {
        name: "Legendary Resistance (2/Day)",
        description: "If this ship fails a saving throw, it can choose to succeed instead."
      }
    ],
    actions: [
      {
        name: "Battery Barrage",
        type: "Action",
        attackBonus: 10,
        range: "800/1,600 ft",
        damage: "3d10 + 6",
        damageType: "Energy",
        description: "Ranged Ship Attack: +10 to hit. Hit: 22 (3d10 + 6) energy damage."
      }
    ],
    legendaryActions: {
      actionsPerRound: 1,
      actions: [
        {
          name: "Emergency Shield Shunt",
          type: "Legendary Action",
          description: "Immediately restores 20 shield points to a depleted arc."
        }
      ]
    }
  },
  {
    name: "Arquitens-class Light Cruiser",
    faction: "Galactic Empire",
    tier: 3,
    tierOrCr: "CR 10 (Tier 3)",
    threatClassification: "Tactical Controller (Deadly)",
    size: "Large",
    shipType: "Light Cruiser",
    classification: "Threat",
    armorClass: 16,
    hullMax: 130,
    shieldsMax: 90,
    damageReduction: 5,
    damageThreshold: 10,
    speed: "250 ft (5 hexes)",
    turningSpeed: "200 ft",
    stats: { str: 22, dex: 12, con: 20, int: 16, wis: 16, cha: 14 },
    savingThrows: "Str +10, Con +9, Int +7, Wis +7",
    senses: "Passive Scan 13",
    scanDc: 17,
    distance: "27,000 km",
    defaultNotes: "Fast imperial patrol cruiser with twin dual turbolasers in recessed wing mounts.",
    traits: [
      {
        name: "Legendary Resistance (2/Day)",
        description: "If this ship fails a saving throw, it can choose to succeed instead."
      }
    ],
    actions: [
      {
        name: "Dual Turbolaser Salvo",
        type: "Action",
        attackBonus: 10,
        range: "800/1,600 ft",
        damage: "3d10 + 6",
        damageType: "Energy",
        description: "Ranged Ship Attack: +10 to hit. Hit: 22 (3d10 + 6) energy damage."
      }
    ],
    legendaryActions: {
      actionsPerRound: 1,
      actions: [
        {
          name: "Flak Salvo",
          type: "Legendary Action",
          description: "Fires anti-starfighter flak: hostile fighters within 150 ft suffer 2d8 kinetic damage."
        }
      ]
    }
  },
  {
    name: "Lancer-class Frigate",
    faction: "Galactic Empire",
    tier: 3,
    tierOrCr: "CR 9 (Tier 3)",
    threatClassification: "Tactical Controller (Deadly)",
    size: "Large",
    shipType: "Anti-Starfighter Frigate",
    classification: "Threat",
    armorClass: 15,
    hullMax: 120,
    shieldsMax: 80,
    damageReduction: 4,
    damageThreshold: 0,
    speed: "250 ft (5 hexes)",
    turningSpeed: "200 ft",
    stats: { str: 20, dex: 14, con: 18, int: 16, wis: 16, cha: 12 },
    savingThrows: "Str +9, Con +8, Wis +7",
    senses: "Passive Scan 13",
    scanDc: 16,
    distance: "26,000 km",
    defaultNotes: "Equipped with 20 quad laser batteries to shred snubfighter squadrons.",
    actions: [
      {
        name: "Quad Laser Flak Screen",
        type: "Action",
        attackBonus: 8,
        range: "400/800 ft",
        damage: "3d8 + 4",
        damageType: "Energy",
        description: "Ranged Ship Attack: +8 to hit. Hit: 17 (3d8 + 4) energy damage."
      }
    ]
  },
  {
    name: "Carrack-class Light Cruiser",
    faction: "Galactic Empire",
    tier: 3,
    tierOrCr: "CR 10 (Tier 3)",
    threatClassification: "Tactical Controller (Deadly)",
    size: "Large",
    shipType: "Light Cruiser",
    classification: "Threat",
    armorClass: 16,
    hullMax: 125,
    shieldsMax: 80,
    damageReduction: 4,
    damageThreshold: 8,
    speed: "350 ft (7 hexes)",
    turningSpeed: "150 ft",
    stats: { str: 22, dex: 14, con: 18, int: 16, wis: 14, cha: 12 },
    savingThrows: "Str +10, Dex +6, Con +8",
    senses: "Passive Scan 12",
    scanDc: 17,
    distance: "29,000 km",
    defaultNotes: "Exceptionally fast capital ship capable of keeping pace with pursuit starfighters.",
    traits: [
      {
        name: "Legendary Resistance (1/Day)",
        description: "If this ship fails a saving throw, it can choose to succeed instead."
      }
    ],
    actions: [
      {
        name: "Heavy Laser & Ion Batteries",
        type: "Action",
        attackBonus: 10,
        range: "600/1,200 ft",
        damage: "3d8 + 6",
        damageType: "Energy",
        description: "Ranged Ship Attack: +10 to hit. Hit: 19 (3d8 + 6) energy damage."
      }
    ],
    legendaryActions: {
      actionsPerRound: 1,
      actions: [
        {
          name: "Pursuit Volley",
          type: "Legendary Action",
          description: "Fires 1 Heavy Laser at a moving target that leaves its forward arc."
        }
      ]
    }
  },
  {
    name: "Dreadnaught-class Heavy Cruiser (Slave Rigged)",
    faction: "Galactic Empire",
    tier: 3,
    tierOrCr: "CR 11 (Tier 3)",
    threatClassification: "Tactical Controller (Deadly)",
    size: "Huge",
    shipType: "Heavy Cruiser",
    classification: "Threat",
    armorClass: 14,
    hullMax: 180,
    shieldsMax: 110,
    damageReduction: 6,
    damageThreshold: 10,
    speed: "200 ft (4 hexes)",
    turningSpeed: "250 ft",
    stats: { str: 24, dex: 8, con: 22, int: 14, wis: 14, cha: 12 },
    savingThrows: "Str +11, Con +10",
    senses: "Passive Scan 12",
    scanDc: 16,
    distance: "30,000 km",
    defaultNotes: "Cumbersome vintage battleship retrofitted with automated Katana fleet slave circuitry.",
    traits: [
      {
        name: "Legendary Resistance (2/Day)",
        description: "If this ship fails a saving throw, it can choose to succeed instead."
      }
    ],
    actions: [
      {
        name: "Broadside Turbolasers",
        type: "Action",
        attackBonus: 11,
        range: "800/1,600 ft",
        damage: "4d10 + 7",
        damageType: "Energy",
        description: "Ranged Ship Attack: +11 to hit. Hit: 29 (4d10 + 7) energy damage."
      }
    ]
  },
  {
    name: "Hammerhead Corvette (Combat Refit)",
    faction: "Civilians",
    tier: 3,
    tierOrCr: "CR 9 (Tier 3)",
    threatClassification: "Tactical Controller (Deadly)",
    size: "Large",
    shipType: "Ramming Corvette",
    classification: "Threat",
    armorClass: 15,
    hullMax: 115,
    shieldsMax: 75,
    damageReduction: 4,
    damageThreshold: 6,
    speed: "300 ft (6 hexes)",
    turningSpeed: "150 ft",
    stats: { str: 24, dex: 12, con: 20, int: 14, wis: 14, cha: 12 },
    savingThrows: "Str +11, Con +9",
    senses: "Passive Scan 12",
    scanDc: 16,
    distance: "25,000 km",
    defaultNotes: "Reinforced vertical bow section built to withstand physical ramming maneuvers.",
    traits: [
      {
        name: "Reinforced Prow",
        description: "Ramming checks deal double damage to the target and half damage to itself."
      }
    ],
    actions: [
      {
        name: "Twin Turbolaser Cannons",
        type: "Action",
        attackBonus: 11,
        range: "600/1,200 ft",
        damage: "2d10 + 7",
        damageType: "Energy",
        description: "Ranged Ship Attack: +11 to hit. Hit: 18 (2d10 + 7) energy damage."
      }
    ]
  },
  {
    name: "Interdictor Vessel (Immobilizer 418)",
    faction: "Galactic Empire",
    tier: 3,
    tierOrCr: "CR 11 (Tier 3)",
    threatClassification: "Tactical Controller (Deadly)",
    size: "Huge",
    shipType: "Gravity Well Cruiser",
    classification: "Threat",
    armorClass: 15,
    hullMax: 160,
    shieldsMax: 100,
    damageReduction: 5,
    damageThreshold: 10,
    speed: "200 ft (4 hexes)",
    turningSpeed: "250 ft",
    stats: { str: 22, dex: 10, con: 20, int: 20, wis: 18, cha: 14 },
    savingThrows: "Str +10, Con +9, Int +9, Wis +8",
    senses: "Passive Scan 14",
    scanDc: 18,
    distance: "32,000 km",
    defaultNotes: "Equipped with 4 massive gravity well projectors that prevent hyperspace jumps.",
    traits: [
      {
        name: "Gravity Well Projectors",
        description: "Hyperspace calculations fail automatically within 1,000 km of this vessel."
      },
      {
        name: "Legendary Resistance (2/Day)",
        description: "If this ship fails a saving throw, it can choose to succeed instead."
      }
    ],
    actions: [
      {
        name: "Dual Turbolasers",
        type: "Action",
        attackBonus: 10,
        range: "600/1,200 ft",
        damage: "3d10 + 6",
        damageType: "Energy",
        description: "Ranged Ship Attack: +10 to hit. Hit: 22 (3d10 + 6) energy damage."
      }
    ]
  },
  {
    name: "Tartan-class Patrol Cruiser",
    faction: "Galactic Empire",
    tier: 3,
    tierOrCr: "CR 9 (Tier 3)",
    threatClassification: "Tactical Controller (Deadly)",
    size: "Large",
    shipType: "Patrol Cruiser",
    classification: "Threat",
    armorClass: 16,
    hullMax: 110,
    shieldsMax: 70,
    damageReduction: 4,
    damageThreshold: 8,
    speed: "350 ft (7 hexes)",
    turningSpeed: "150 ft",
    stats: { str: 20, dex: 14, con: 18, int: 16, wis: 16, cha: 12 },
    savingThrows: "Dex +6, Con +8, Wis +7",
    senses: "Passive Scan 13",
    scanDc: 16,
    distance: "26,000 km",
    defaultNotes: "Damorian patrol vessel with fast-tracking laser cannons designed to purge pirate bands.",
    actions: [
      {
        name: "Rapid-Fire Laser Batteries",
        type: "Action",
        attackBonus: 8,
        range: "500/1,000 ft",
        damage: "3d8 + 4",
        damageType: "Energy",
        description: "Ranged Ship Attack: +8 to hit. Hit: 17 (3d8 + 4) energy damage."
      }
    ]
  },
  {
    name: "Gladiator-class Star Destroyer",
    faction: "Galactic Empire",
    tier: 3,
    tierOrCr: "CR 11 (Tier 3)",
    threatClassification: "Tactical Controller (Deadly)",
    size: "Huge",
    shipType: "Strike Carrier Star Destroyer",
    classification: "Threat",
    armorClass: 15,
    hullMax: 170,
    shieldsMax: 110,
    damageReduction: 6,
    damageThreshold: 10,
    speed: "200 ft (4 hexes)",
    turningSpeed: "250 ft",
    stats: { str: 24, dex: 10, con: 22, int: 16, wis: 16, cha: 14 },
    savingThrows: "Str +11, Con +10, Wis +7",
    senses: "Passive Scan 13",
    scanDc: 17,
    distance: "32,000 km",
    defaultNotes: "Medium capital warship with a cavernous belly hangar designed for sector subjugation.",
    traits: [
      {
        name: "Legendary Resistance (2/Day)",
        description: "If this ship fails a saving throw, it can choose to succeed instead."
      }
    ],
    actions: [
      {
        name: "Heavy Turbolaser Batteries",
        type: "Action",
        attackBonus: 11,
        range: "800/1,600 ft",
        damage: "4d10 + 7",
        damageType: "Energy",
        description: "Ranged Ship Attack: +11 to hit. Hit: 29 (4d10 + 7) energy damage."
      }
    ],
    legendaryActions: {
      actionsPerRound: 1,
      actions: [
        {
          name: "Launch Squadron",
          type: "Legendary Action",
          description: "Launches 1 flight of 4 TIE fighters from its ventral bay."
        }
      ]
    }
  },
  {
    name: "Pelta-class Frigate (Armed Patrol Variant)",
    faction: "Civilians",
    tier: 3,
    tierOrCr: "CR 9 (Tier 3)",
    threatClassification: "Tactical Controller (Deadly)",
    size: "Large",
    shipType: "Support Frigate",
    classification: "Threat",
    armorClass: 15,
    hullMax: 100,
    shieldsMax: 85,
    damageReduction: 4,
    damageThreshold: 6,
    speed: "250 ft (5 hexes)",
    turningSpeed: "200 ft",
    stats: { str: 20, dex: 12, con: 18, int: 16, wis: 16, cha: 14 },
    savingThrows: "Str +9, Con +8, Wis +7",
    senses: "Passive Scan 13",
    scanDc: 16,
    distance: "25,000 km",
    defaultNotes: "Modular Republic-era cargo frigate armed with point defense and light turbolasers.",
    actions: [
      {
        name: "Twin Turbolaser Turrets",
        type: "Action",
        attackBonus: 9,
        range: "600/1,200 ft",
        damage: "2d10 + 5",
        damageType: "Energy",
        description: "Ranged Ship Attack: +9 to hit. Hit: 16 (2d10 + 5) energy damage."
      }
    ]
  },
  {
    name: "Munificent-class Star Frigate (Separatist Surplus)",
    faction: "Republic / Separatist Surplus",
    tier: 3,
    tierOrCr: "CR 11 (Tier 3)",
    threatClassification: "Tactical Controller (Deadly)",
    size: "Huge",
    shipType: "Communications / Heavy Frigate",
    classification: "Threat",
    armorClass: 14,
    hullMax: 160,
    shieldsMax: 95,
    damageReduction: 5,
    damageThreshold: 10,
    speed: "200 ft (4 hexes)",
    turningSpeed: "250 ft",
    stats: { str: 24, dex: 10, con: 20, int: 18, wis: 16, cha: 12 },
    savingThrows: "Str +11, Con +9, Int +8",
    senses: "Passive Scan 13",
    scanDc: 17,
    distance: "31,000 km",
    defaultNotes: "Separatist Banking Clan warship built around two enormous bow-mounted heavy prow turbolasers.",
    traits: [
      {
        name: "Legendary Resistance (2/Day)",
        description: "If this ship fails a saving throw, it can choose to succeed instead."
      }
    ],
    actions: [
      {
        name: "Prow Heavy Turbolaser Cannons",
        type: "Action",
        attackBonus: 11,
        range: "1,000/2,000 ft",
        damage: "4d10 + 7",
        damageType: "Energy",
        description: "Ranged Ship Attack: Fixed forward arc, +11 to hit. Hit: 29 (4d10 + 7) energy damage."
      }
    ]
  },

  // =========================================================================
  // TIER 4: APEX THREAT (RUN AWAY) - PB: +5
  // =========================================================================
  {
    name: "Vindicator-class Heavy Cruiser",
    faction: "Galactic Empire",
    tier: 4,
    tierOrCr: "CR 14 (Tier 4)",
    threatClassification: "Apex Threat (Run Away)",
    size: "Huge",
    shipType: "Heavy Cruiser",
    classification: "Threat",
    armorClass: 17,
    hullMax: 260,
    shieldsMax: 180,
    damageReduction: 8,
    damageThreshold: 15,
    speed: "200 ft (4 hexes)",
    turningSpeed: "250 ft",
    stats: { str: 26, dex: 8, con: 22, int: 16, wis: 16, cha: 14 },
    savingThrows: "Str +13, Con +11, Wis +8",
    senses: "Passive Scan 13",
    scanDc: 18,
    distance: "35,000 km",
    defaultNotes: "Heavy line cruiser bristling with light and medium turbolasers for fleet engagements.",
    traits: [
      {
        name: "Legendary Resistance (2/Day)",
        description: "If this ship fails a saving throw, it can choose to succeed instead."
      }
    ],
    actions: [
      {
        name: "Full Battery Barrage",
        type: "Action",
        attackBonus: 13,
        range: "1,000/2,000 ft",
        damage: "5d10 + 8",
        damageType: "Energy",
        description: "Ranged Ship Attack: +13 to hit. Hit: 35 (5d10 + 8) energy damage."
      }
    ],
    legendaryActions: {
      actionsPerRound: 2,
      actions: [
        {
          name: "Battery Volley",
          type: "Legendary Action",
          description: "Fires one medium turbolaser battery (+13 to hit, 3d10+8 damage)."
        }
      ]
    }
  },
  {
    name: "Imperial-class Star Destroyer (ISD)",
    faction: "Galactic Empire",
    tier: 4,
    tierOrCr: "CR 17 (Tier 4)",
    threatClassification: "Apex Threat (Run Away)",
    size: "Huge",
    shipType: "Star Destroyer",
    classification: "Threat",
    armorClass: 18,
    hullMax: 450,
    shieldsMax: 300,
    damageReduction: 10,
    damageThreshold: 20,
    speed: "150 ft (3 hexes)",
    turningSpeed: "300 ft",
    stats: { str: 28, dex: 8, con: 24, int: 18, wis: 16, cha: 18 },
    savingThrows: "Str +14, Con +12, Int +9, Wis +8, Cha +9",
    senses: "Passive Scan 13",
    scanDc: 19,
    distance: "40,000 km",
    defaultNotes: "The undisputed symbol of Imperial domination. Apex capital dreadnought.",
    traits: [
      {
        name: "Dominance Aura",
        description: "Hostile ships within 1,000 ft suffer -2 on attack rolls unless they succeed on a DC 16 Wisdom check."
      },
      {
        name: "Legendary Resistance (3/Day)",
        description: "If this ship fails a saving throw, it can choose to succeed instead."
      }
    ],
    actions: [
      {
        name: "Full Broadside Salvo",
        type: "Action",
        attackBonus: 14,
        range: "1,200/2,400 ft",
        damage: "6d10 + 9",
        damageType: "Energy",
        description: "Ranged Ship Attack: +14 to hit. Hit: 42 (6d10 + 9) energy damage."
      },
      {
        name: "Heavy Tractor Well",
        type: "Action",
        range: "1,500 ft",
        description: "DC 18 Str save. On fail, target ship is pulled 300 ft closer and immobilized."
      }
    ],
    legendaryActions: {
      actionsPerRound: 3,
      actions: [
        {
          name: "Turbolaser Battery",
          type: "Legendary Action",
          description: "Fires 1 heavy turbolaser (+14 to hit, 4d10+9 energy damage)."
        },
        {
          name: "Scramble TIE Flight (Costs 2 Actions)",
          type: "Legendary Action",
          description: "Launches 4 TIE/ln fighters from its belly hangar."
        },
        {
          name: "Overcharge Deflectors (Costs 2 Actions)",
          type: "Legendary Action",
          description: "Restores 40 shield points to a depleted arc."
        }
      ]
    }
  },
  {
    name: "Venator-class Star Destroyer",
    faction: "Republic / Separatist Surplus",
    tier: 4,
    tierOrCr: "CR 15 (Tier 4)",
    threatClassification: "Apex Threat (Run Away)",
    size: "Huge",
    shipType: "Fleet Carrier Destroyer",
    classification: "Threat",
    armorClass: 17,
    hullMax: 380,
    shieldsMax: 260,
    damageReduction: 9,
    damageThreshold: 18,
    speed: "200 ft (4 hexes)",
    turningSpeed: "250 ft",
    stats: { str: 26, dex: 10, con: 22, int: 18, wis: 16, cha: 16 },
    savingThrows: "Str +13, Con +11, Wis +8",
    senses: "Passive Scan 13",
    scanDc: 18,
    distance: "38,000 km",
    defaultNotes: "Clone Wars fleet carrier with massive red dorsal hangar doors housing hundreds of craft.",
    traits: [
      {
        name: "Legendary Resistance (3/Day)",
        description: "If this ship fails a saving throw, it can choose to succeed instead."
      }
    ],
    actions: [
      {
        name: "Heavy Dual Turbolasers",
        type: "Action",
        attackBonus: 13,
        range: "1,000/2,000 ft",
        damage: "5d10 + 8",
        damageType: "Energy",
        description: "Ranged Ship Attack: +13 to hit. Hit: 35 (5d10 + 8) energy damage."
      }
    ],
    legendaryActions: {
      actionsPerRound: 2,
      actions: [
        {
          name: "Fighter Sortie",
          type: "Legendary Action",
          description: "Deploys a full wing of starfighters directly into active combat."
        }
      ]
    }
  },
  {
    name: "Victory I-class Star Destroyer",
    faction: "Galactic Empire",
    tier: 4,
    tierOrCr: "CR 15 (Tier 4)",
    threatClassification: "Apex Threat (Run Away)",
    size: "Huge",
    shipType: "Planetary Siege Destroyer",
    classification: "Threat",
    armorClass: 16,
    hullMax: 360,
    shieldsMax: 220,
    damageReduction: 10,
    damageThreshold: 20,
    speed: "150 ft (3 hexes)",
    turningSpeed: "300 ft",
    stats: { str: 28, dex: 8, con: 24, int: 16, wis: 14, cha: 14 },
    savingThrows: "Str +14, Con +12",
    senses: "Passive Scan 12",
    scanDc: 18,
    distance: "36,000 km",
    defaultNotes: "Planetary bombardment platform equipped with atmospheric maneuvering flaps and concussion missile tubes.",
    traits: [
      {
        name: "Legendary Resistance (2/Day)",
        description: "If this ship fails a saving throw, it can choose to succeed instead."
      }
    ],
    actions: [
      {
        name: "Turbolaser & Missile Barrage",
        type: "Action",
        attackBonus: 14,
        range: "1,000/2,000 ft",
        damage: "5d10 + 9",
        damageType: "Energy",
        description: "Ranged Ship Attack: +14 to hit. Hit: 36 (5d10 + 9) energy damage."
      }
    ]
  },
  {
    name: "Victory II-class Star Destroyer",
    faction: "Galactic Empire",
    tier: 4,
    tierOrCr: "CR 16 (Tier 4)",
    threatClassification: "Apex Threat (Run Away)",
    size: "Huge",
    shipType: "Space Combat Destroyer",
    classification: "Threat",
    armorClass: 17,
    hullMax: 370,
    shieldsMax: 250,
    damageReduction: 10,
    damageThreshold: 20,
    speed: "200 ft (4 hexes)",
    turningSpeed: "250 ft",
    stats: { str: 28, dex: 10, con: 24, int: 16, wis: 16, cha: 16 },
    savingThrows: "Str +14, Con +12, Wis +8",
    senses: "Passive Scan 13",
    scanDc: 18,
    distance: "37,000 km",
    defaultNotes: "Refit designed for deep-space combat, replacing atmospheric gear with heavier ion batteries.",
    traits: [
      {
        name: "Legendary Resistance (2/Day)",
        description: "If this ship fails a saving throw, it can choose to succeed instead."
      }
    ],
    actions: [
      {
        name: "Heavy Ion & Turbolasers",
        type: "Action",
        attackBonus: 14,
        range: "1,000/2,000 ft",
        damage: "5d10 + 9",
        damageType: "Energy",
        description: "Ranged Ship Attack: +14 to hit. Hit: 36 (5d10 + 9) energy damage."
      }
    ]
  },
  {
    name: "Imperial II-class Star Destroyer (ISD-II)",
    faction: "Galactic Empire",
    tier: 4,
    tierOrCr: "CR 18 (Tier 4)",
    threatClassification: "Apex Threat (Run Away)",
    size: "Huge",
    shipType: "Heavy Star Destroyer",
    classification: "Threat",
    armorClass: 19,
    hullMax: 520,
    shieldsMax: 360,
    damageReduction: 12,
    damageThreshold: 25,
    speed: "150 ft (3 hexes)",
    turningSpeed: "300 ft",
    stats: { str: 30, dex: 8, con: 26, int: 18, wis: 18, cha: 18 },
    savingThrows: "Str +15, Con +13, Int +9, Wis +9, Cha +9",
    senses: "Passive Scan 14",
    scanDc: 20,
    distance: "42,000 km",
    defaultNotes: "Upgraded hull plating, solid-state sensor dome, and massive heavy octuple barbette turbolaser turrets.",
    traits: [
      {
        name: "Legendary Resistance (3/Day)",
        description: "If this ship fails a saving throw, it can choose to succeed instead."
      }
    ],
    actions: [
      {
        name: "Octuple Barbette Turbolasers",
        type: "Action",
        attackBonus: 15,
        range: "1,500/3,000 ft",
        damage: "7d10 + 10",
        damageType: "Energy",
        description: "Ranged Ship Attack: +15 to hit (+5 PB, +10 Str). Hit: 48 (7d10 + 10) energy damage."
      }
    ],
    legendaryActions: {
      actionsPerRound: 3,
      actions: [
        {
          name: "Heavy Turbolaser Barrage",
          type: "Legendary Action",
          description: "Fires 1 octuple battery (+15 to hit, 4d10+10 energy damage)."
        },
        {
          name: "Scramble Strike Wing (Costs 2 Actions)",
          type: "Legendary Action",
          description: "Launches 4 TIE/in Interceptors from its launch bay."
        }
      ]
    }
  },
  {
    name: "Providence-class Dreadnought (Carrier/Destroyer)",
    faction: "Republic / Separatist Surplus",
    tier: 4,
    tierOrCr: "CR 16 (Tier 4)",
    threatClassification: "Apex Threat (Run Away)",
    size: "Huge",
    shipType: "Dreadnought Carrier",
    classification: "Threat",
    armorClass: 17,
    hullMax: 400,
    shieldsMax: 280,
    damageReduction: 9,
    damageThreshold: 18,
    speed: "200 ft (4 hexes)",
    turningSpeed: "250 ft",
    stats: { str: 28, dex: 10, con: 24, int: 18, wis: 16, cha: 16 },
    savingThrows: "Str +14, Con +12, Wis +8",
    senses: "Passive Scan 13",
    scanDc: 18,
    distance: "39,000 km",
    defaultNotes: "Separatist command flagship archetype built to brawl with Venator-class destroyers.",
    traits: [
      {
        name: "Legendary Resistance (3/Day)",
        description: "If this ship fails a saving throw, it can choose to succeed instead."
      }
    ],
    actions: [
      {
        name: "Heavy Turbolaser Batteries",
        type: "Action",
        attackBonus: 14,
        range: "1,000/2,000 ft",
        damage: "6d10 + 9",
        damageType: "Energy",
        description: "Ranged Ship Attack: +14 to hit. Hit: 42 (6d10 + 9) energy damage."
      }
    ]
  },
  {
    name: "Subjugator-class Heavy Cruiser (Malevolence Archetype)",
    faction: "Republic / Separatist Surplus",
    tier: 4,
    tierOrCr: "CR 18 (Tier 4)",
    threatClassification: "Apex Threat (Run Away)",
    size: "Gargantuan",
    shipType: "Super Heavy Cruiser",
    classification: "Threat",
    armorClass: 18,
    hullMax: 650,
    shieldsMax: 450,
    damageReduction: 14,
    damageThreshold: 30,
    speed: "150 ft (3 hexes)",
    turningSpeed: "300 ft",
    stats: { str: 30, dex: 6, con: 28, int: 18, wis: 16, cha: 18 },
    savingThrows: "Str +15, Con +14, Int +9, Wis +8",
    senses: "Passive Scan 13",
    scanDc: 20,
    distance: "45,000 km",
    defaultNotes: "Monstrous Separatist dreadnought armed with dual flank-mounted mega-ion pulse cannons.",
    traits: [
      {
        name: "Legendary Resistance (3/Day)",
        description: "If this ship fails a saving throw, it can choose to succeed instead."
      }
    ],
    actions: [
      {
        name: "Mega-Ion Pulse Cannon (Recharge 5-6)",
        type: "Action",
        range: "2,000 ft arc",
        description: "DC 18 Con save for all ships in a 60-degree cone. Fail: 8d10 ion damage and disabled for 1 round."
      }
    ]
  },
  {
    name: "Recusant-class Light Destroyer",
    faction: "Republic / Separatist Surplus",
    tier: 4,
    tierOrCr: "CR 14 (Tier 4)",
    threatClassification: "Apex Threat (Run Away)",
    size: "Huge",
    shipType: "Light Destroyer",
    classification: "Threat",
    armorClass: 16,
    hullMax: 310,
    shieldsMax: 200,
    damageReduction: 8,
    damageThreshold: 15,
    speed: "250 ft (5 hexes)",
    turningSpeed: "200 ft",
    stats: { str: 26, dex: 12, con: 22, int: 16, wis: 14, cha: 12 },
    savingThrows: "Str +13, Con +11",
    senses: "Passive Scan 12",
    scanDc: 17,
    distance: "34,000 km",
    defaultNotes: "Needle-thin automated Separatist warship built around a heavy prow turbolaser array.",
    traits: [
      {
        name: "Legendary Resistance (2/Day)",
        description: "If this ship fails a saving throw, it can choose to succeed instead."
      }
    ],
    actions: [
      {
        name: "Prow Heavy Turbolasers",
        type: "Action",
        attackBonus: 13,
        range: "1,200/2,400 ft",
        damage: "5d10 + 8",
        damageType: "Energy",
        description: "Ranged Ship Attack: +13 to hit. Hit: 35 (5d10 + 8) energy damage."
      }
    ]
  },
  {
    name: "Secutor-class Battlecarrier",
    faction: "Galactic Empire",
    tier: 4,
    tierOrCr: "CR 17 (Tier 4)",
    threatClassification: "Apex Threat (Run Away)",
    size: "Huge",
    shipType: "Battlecarrier",
    classification: "Threat",
    armorClass: 18,
    hullMax: 480,
    shieldsMax: 320,
    damageReduction: 11,
    damageThreshold: 20,
    speed: "150 ft (3 hexes)",
    turningSpeed: "300 ft",
    stats: { str: 28, dex: 8, con: 26, int: 18, wis: 16, cha: 16 },
    savingThrows: "Str +14, Con +13, Wis +8",
    senses: "Passive Scan 13",
    scanDc: 19,
    distance: "41,000 km",
    defaultNotes: "Massive wedge-shaped fleet carrier designed to flood entire star sectors with fighter wings.",
    traits: [
      {
        name: "Legendary Resistance (3/Day)",
        description: "If this ship fails a saving throw, it can choose to succeed instead."
      }
    ],
    actions: [
      {
        name: "Dual Heavy Turbolasers",
        type: "Action",
        attackBonus: 14,
        range: "1,000/2,000 ft",
        damage: "6d10 + 9",
        damageType: "Energy",
        description: "Ranged Ship Attack: +14 to hit. Hit: 42 (6d10 + 9) energy damage."
      }
    ]
  },

  // =========================================================================
  // TIER 5: GALACTIC TITAN (HIDE & PRAY) - PB: +6
  // =========================================================================
  {
    name: "Bellator-class Dreadnought",
    faction: "Galactic Empire",
    tier: 5,
    tierOrCr: "CR 22 (Tier 5)",
    threatClassification: "Galactic Titan (Hide & Pray)",
    size: "Gargantuan",
    shipType: "Super Star Destroyer / Fast Dreadnought",
    classification: "Threat",
    armorClass: 19,
    hullMax: 950,
    shieldsMax: 700,
    damageReduction: 15,
    damageThreshold: 30,
    speed: "200 ft (4 hexes)",
    turningSpeed: "350 ft",
    stats: { str: 30, dex: 8, con: 30, int: 20, wis: 18, cha: 20 },
    savingThrows: "Str +16, Con +16, Int +11, Wis +10, Cha +11",
    senses: "Passive Scan 14",
    scanDc: 22,
    distance: "55,000 km",
    defaultNotes: "7.2-kilometer battlecruiser built for deep bombardment and capital fleet destruction.",
    traits: [
      {
        name: "Legendary Resistance (3/Day)",
        description: "If this ship fails a saving throw, it can choose to succeed instead."
      }
    ],
    actions: [
      {
        name: "Cataclysmic Broadside",
        type: "Action",
        attackBonus: 16,
        range: "2,000/4,000 ft",
        damage: "10d10 + 10",
        damageType: "Energy",
        description: "Ranged Ship Attack: +16 to hit (+6 PB, +10 Str). Hit: 65 (10d10 + 10) energy damage."
      }
    ],
    legendaryActions: {
      actionsPerRound: 3,
      actions: [
        {
          name: "Heavy Octuple Barrage",
          type: "Legendary Action",
          description: "Fires heavy turbolasers (+16 to hit, 6d10+10 energy damage)."
        },
        {
          name: "Tractor Well Sweep",
          type: "Legendary Action",
          description: "All ships within 1,000 ft make DC 20 Str save or be held immobile."
        }
      ]
    }
  },
  {
    name: "Executor-class Super Star Destroyer",
    faction: "Galactic Empire",
    tier: 5,
    tierOrCr: "CR 30 (Tier 5)",
    threatClassification: "Galactic Titan (Hide & Pray)",
    size: "Gargantuan",
    shipType: "Command Dreadnought",
    classification: "Threat",
    armorClass: 20,
    hullMax: 2500,
    shieldsMax: 1800,
    damageReduction: 20,
    damageThreshold: 50,
    speed: "100 ft (2 hexes)",
    turningSpeed: "500 ft",
    stats: { str: 30, dex: 6, con: 30, int: 22, wis: 20, cha: 24 },
    savingThrows: "Str +16, Con +16, Int +12, Wis +11, Cha +13",
    senses: "Passive Scan 15",
    scanDc: 25,
    distance: "75,000 km",
    defaultNotes: "19-kilometer command dreadnought with over 5,000 heavy turbolasers and an entire fleet aboard.",
    traits: [
      {
        name: "Galactic Dreadnought Hegemony",
        description: "Immune to non-heavy weapon damage. Damage under 50 is completely ignored by Damage Threshold."
      },
      {
        name: "Legendary Resistance (3/Day)",
        description: "If this ship fails a saving throw, it can choose to succeed instead."
      }
    ],
    actions: [
      {
        name: "Full Fleet Annihilation Salvo",
        type: "Action",
        attackBonus: 16,
        range: "3,000/6,000 ft",
        damage: "16d10 + 10",
        damageType: "Energy",
        description: "Ranged Ship Attack: +16 to hit. Hit: 98 (16d10 + 10) energy damage."
      }
    ],
    legendaryActions: {
      actionsPerRound: 3,
      actions: [
        {
          name: "Octuple Battery Volley",
          type: "Legendary Action",
          description: "Fires 1 octuple battery (+16 to hit, 8d10+10 energy damage)."
        },
        {
          name: "Launch TIE Wing (Costs 2 Actions)",
          type: "Legendary Action",
          description: "Launches 12 TIE starfighters into the battle grid."
        },
        {
          name: "Shield Reinforcement Surge (Costs 2 Actions)",
          type: "Legendary Action",
          description: "Restores 100 shield points to a depleted quadrant."
        }
      ]
    }
  }
]