export type ShipSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan'

export interface ShipSizeRule {
  readonly name: string
  readonly dexterityMod: number
  readonly constitutionMod: number
  readonly modifier: number // Cost modifier
  readonly hitDie: string
  readonly startHd: number
  readonly avgVal: number
  readonly turningSpeed: number
  readonly fuelSize: number
  readonly fuelCostPerUnit: number
  readonly baseCargoCap: number
  readonly modCapacity: number
  readonly downtime: string // Refitting time
  readonly savingThrowNotes: string
}

export const SHIP_SIZE_RULES: Record<ShipSize, ShipSizeRule> = {
  tiny: { name: 'Tiny', dexterityMod: 4, constitutionMod: -4, modifier: 0.5, hitDie: 'd4', startHd: 1, avgVal: 3, turningSpeed: 300, fuelSize: 5, fuelCostPerUnit: 25, baseCargoCap: 0, modCapacity: 10, downtime: '4 Hours', savingThrowNotes: 'Dex, Int' },
  small: { name: 'Small', dexterityMod: 2, constitutionMod: -2, modifier: 1, hitDie: 'd6', startHd: 3, avgVal: 4, turningSpeed: 250, fuelSize: 10, fuelCostPerUnit: 50, baseCargoCap: 2, modCapacity: 20, downtime: '8 Hours', savingThrowNotes: 'Str, Dex' },
  medium: { name: 'Medium', dexterityMod: 0, constitutionMod: 0, modifier: 2, hitDie: 'd8', startHd: 5, avgVal: 5, turningSpeed: 200, fuelSize: 30, fuelCostPerUnit: 100, baseCargoCap: 25, modCapacity: 30, downtime: '1 Day', savingThrowNotes: 'Choose 2' },
  large: { name: 'Large', dexterityMod: -2, constitutionMod: 2, modifier: 10, hitDie: 'd10', startHd: 7, avgVal: 6, turningSpeed: 150, fuelSize: 300, fuelCostPerUnit: 1000, baseCargoCap: 500, modCapacity: 50, downtime: '3 Days', savingThrowNotes: 'Wis, and choice of Str or Con' },
  huge: { name: 'Huge', dexterityMod: -4, constitutionMod: 4, modifier: 100, hitDie: 'd12', startHd: 9, avgVal: 7, turningSpeed: 100, fuelSize: 600, fuelCostPerUnit: 10000, baseCargoCap: 10000, modCapacity: 60, downtime: '1 Week', savingThrowNotes: 'Wis, and choice of Str or Con' },
  gargantuan: { name: 'Gargantuan', dexterityMod: -6, constitutionMod: 6, modifier: 1000, hitDie: 'd20', startHd: 11, avgVal: 11, turningSpeed: 50, fuelSize: 1800, fuelCostPerUnit: 100000, baseCargoCap: 200000, modCapacity: 70, downtime: '1 Month', savingThrowNotes: 'Wis, and choice of Str or Con' },
} as const

// --- ROLE SPECIALIZATION (TIER 2 SNUBFIGHTER FEATURE) ---
export type RoleSpecialization =
  | 'Attack Fighter'
  | 'Bomber'
  | 'Scout'
  | 'Scrambler'
  | 'Shuttle'
  | 'Superiority Fighter'

export interface RoleSpecializationDetail {
  readonly name: RoleSpecialization
  readonly targetStation: string
  readonly summary: string
  readonly description: string
}

export const ROLE_SPECIALIZATIONS: Record<RoleSpecialization, RoleSpecializationDetail> = {
  'Attack Fighter': {
    name: 'Attack Fighter',
    targetStation: 'Weapons',
    summary: '+1 bonus to weapon attack rolls and save DCs',
    description: 'Your ship gains a +1 bonus to the attack rolls and save DCs of its ship weapons.'
  },
  'Bomber': {
    name: 'Bomber',
    targetStation: 'Weapons',
    summary: '+1 bonus to damage rolls with ship weapons',
    description: 'Your ship gains a +1 bonus to damage rolls with ship weapons.'
  },
  'Scout': {
    name: 'Scout',
    targetStation: 'Sensors / Bridge Stats',
    summary: '+1 bonus to Wisdom (Scan) and Intelligence (Probe) checks',
    description: 'Your ship gains a +1 bonus to Wisdom (Scan) and Intelligence (Probe) checks across all stations.'
  },
  'Scrambler': {
    name: 'Scrambler',
    targetStation: 'Communications',
    summary: 'Crew can use Interfere as a Bonus Action',
    description: 'Your ship’s crew can use Interfere as a bonus action.'
  },
  'Shuttle': {
    name: 'Shuttle',
    targetStation: 'Ship Modifications',
    summary: '+1 Free Suite (0 CR) and +1 Suite Capacity',
    description: 'Your ship gains or replaces one suite system of your choice at no cost, counting against your maximum suites. Starship Size Suite Capacity is increased by 1 (minimum 1).'
  },
  'Superiority Fighter': {
    name: 'Superiority Fighter',
    targetStation: 'Engines',
    summary: '+50 ft flying speed increase',
    description: 'Your ship’s flying speed increases by 50 feet.'
  }
} as const

// --- SHIP TYPE (ROLE) RULES ---
export interface ShipTypeRule {
  readonly name: string
  readonly sizeCategory: ShipSize
  readonly strengthMod: number
  readonly dexterityMod: number
  readonly constitutionMod: number
  readonly intelligenceMod: number
  readonly wisdomMod: number
  readonly charismaMod: number
  readonly baseSpeed: number
  readonly turningSpeed: number
  readonly recommendedReactor: string
  readonly recommendedPowerCoupling: string
  readonly recommendedArmor: string
  readonly recommendedShields?: string
}

export const SHIP_TYPE_RULES: Record<string, ShipTypeRule> = {
  // Small Roles
  'Attack Fighter': { 
    name: 'Attack Fighter', 
    sizeCategory: 'small', 
    strengthMod: 1, 
    dexterityMod: 0, 
    constitutionMod: 0, 
    intelligenceMod: 0, 
    wisdomMod: 0, 
    charismaMod: 0, 
    baseSpeed: 350, 
    turningSpeed: 100,
    recommendedArmor: 'Reinforced Armor',
    recommendedReactor: 'Power Core Reactor',
    recommendedPowerCoupling: 'Direct Power Coupling',
  },
  'Bomber': { 
    name: 'Bomber', 
    sizeCategory: 'small', 
    strengthMod: 0, 
    dexterityMod: 0, 
    constitutionMod: 0, 
    intelligenceMod: 0, 
    wisdomMod: 1, 
    charismaMod: 0, 
    baseSpeed: 450, 
    turningSpeed: 200,
    recommendedArmor: 'Deflection Armor',
    recommendedReactor: 'Fuel Cell Reactor',
    recommendedPowerCoupling: 'Hub & Spoke Power Coupling',
  },
  'Scout': { 
    name: 'Scout', 
    sizeCategory: 'small', 
    strengthMod: 0, 
    dexterityMod: 0, 
    constitutionMod: 0, 
    intelligenceMod: 1, 
    wisdomMod: 0, 
    charismaMod: 0, 
    baseSpeed: 450, 
    turningSpeed: 200,
    recommendedArmor: 'Lightweight Armor',
    recommendedReactor: 'Ionization Reactor',
    recommendedPowerCoupling: 'Distributed Power Coupling',
  },
  'Scrambler': { 
    name: 'Scrambler', 
    sizeCategory: 'small', 
    strengthMod: 0, 
    dexterityMod: 0, 
    constitutionMod: 0, 
    intelligenceMod: 0, 
    wisdomMod: 0, 
    charismaMod: 1, 
    baseSpeed: 400, 
    turningSpeed: 150,
    recommendedArmor: 'Deflection Armor',
    recommendedReactor: 'Power Core Reactor',
    recommendedPowerCoupling: 'Direct Power Coupling',
  },
  'Shuttle': { 
    name: 'Shuttle', 
    sizeCategory: 'small', 
    strengthMod: 0, 
    dexterityMod: 0, 
    constitutionMod: 1, 
    intelligenceMod: 0, 
    wisdomMod: 0, 
    charismaMod: 0, 
    baseSpeed: 350, 
    turningSpeed: 100,
    recommendedArmor: 'Deflection Armor',
    recommendedReactor: 'Fuel Cell Reactor',
    recommendedPowerCoupling: 'Direct Power Coupling',
  },
  'Superiority Fighter': { 
    name: 'Superiority Fighter', 
    sizeCategory: 'small', 
    strengthMod: 0, 
    dexterityMod: 1, 
    constitutionMod: 0, 
    intelligenceMod: 0, 
    wisdomMod: 0, 
    charismaMod: 0, 
    baseSpeed: 400, 
    turningSpeed: 150,
    recommendedArmor: 'Lightweight Armor',
    recommendedReactor: 'Ionization Reactor',
    recommendedPowerCoupling: 'Hub & Spoke Power Coupling',
  },

  // Medium Roles
  'Courier': { 
    name: 'Courier', 
    sizeCategory: 'medium', 
    strengthMod: 0, 
    dexterityMod: 1, 
    constitutionMod: 0, 
    intelligenceMod: 0, 
    wisdomMod: 0, 
    charismaMod: 0, 
    baseSpeed: 400, 
    turningSpeed: 250,
    recommendedArmor: 'Lightweight Armor',
    recommendedReactor: 'Ionization Reactor',
    recommendedPowerCoupling: 'Hub & Spoke Power Coupling',
  },
  'Freighter': { 
    name: 'Freighter', 
    sizeCategory: 'medium', 
    strengthMod: 0, 
    dexterityMod: 0, 
    constitutionMod: 1, 
    intelligenceMod: 0, 
    wisdomMod: 0, 
    charismaMod: 0, 
    baseSpeed: 300, 
    turningSpeed: 150,
    recommendedArmor: 'Deflection Armor',
    recommendedReactor: 'Fuel Cell Reactor',
    recommendedPowerCoupling: 'Hub & Spoke Power Coupling',
  },
  'Gunship': { 
    name: 'Gunship', 
    sizeCategory: 'medium', 
    strengthMod: 1, 
    dexterityMod: 0, 
    constitutionMod: 0, 
    intelligenceMod: 0, 
    wisdomMod: 0, 
    charismaMod: 0, 
    baseSpeed: 300, 
    turningSpeed: 150,
    recommendedArmor: 'Reinforced Armor',
    recommendedReactor: 'Power Core Reactor',
    recommendedPowerCoupling: 'Hub & Spoke Power Coupling',
  },
  'Missile Boat': { 
    name: 'Missile Boat', 
    sizeCategory: 'medium', 
    strengthMod: 0, 
    dexterityMod: 0, 
    constitutionMod: 0, 
    intelligenceMod: 0, 
    wisdomMod: 1, 
    charismaMod: 0, 
    baseSpeed: 400, 
    turningSpeed: 250,
    recommendedArmor: 'Reinforced Armor',
    recommendedReactor: 'Power Core Reactor',
    recommendedPowerCoupling: 'Direct Power Coupling',
  },
  'Navigator': { 
    name: 'Navigator', 
    sizeCategory: 'medium', 
    strengthMod: 0, 
    dexterityMod: 0, 
    constitutionMod: 0, 
    intelligenceMod: 1, 
    wisdomMod: 0, 
    charismaMod: 0, 
    baseSpeed: 350, 
    turningSpeed: 200,
    recommendedArmor: 'Deflection Armor',
    recommendedReactor: 'Ionization Reactor',
    recommendedPowerCoupling: 'Distributed Power Coupling',
  },
  'Yacht': { 
    name: 'Yacht', 
    sizeCategory: 'medium', 
    strengthMod: 0, 
    dexterityMod: 0, 
    constitutionMod: 0, 
    intelligenceMod: 0, 
    wisdomMod: 0, 
    charismaMod: 1, 
    baseSpeed: 350, 
    turningSpeed: 200,
    recommendedArmor: 'Lightweight Armor',
    recommendedReactor: 'Fuel Cell Reactor',
    recommendedPowerCoupling: 'Distributed Power Coupling',
  },

  // Large Roles
  'Ambassador': { 
    name: 'Ambassador', 
    sizeCategory: 'large', 
    strengthMod: 0, 
    dexterityMod: 0, 
    constitutionMod: 1, 
    intelligenceMod: 0, 
    wisdomMod: 0, 
    charismaMod: 1, 
    baseSpeed: 350, 
    turningSpeed: 250,
    recommendedArmor: 'Deflection Armor',
    recommendedShields: 'Fortress Shields',
    recommendedReactor: 'Ionization Reactor',
    recommendedPowerCoupling: 'Hub & Spoke Power Coupling',
  },
  'Corvette': { 
    name: 'Corvette', 
    sizeCategory: 'large', 
    strengthMod: 1, 
    dexterityMod: 1, 
    constitutionMod: 0, 
    intelligenceMod: 0, 
    wisdomMod: 0, 
    charismaMod: 0, 
    baseSpeed: 400, 
    turningSpeed: 300,
    recommendedArmor: 'Deflection Armor',
    recommendedShields: 'Directional Shields',
    recommendedReactor: 'Fuel Cell Reactor',
    recommendedPowerCoupling: 'Direct Power Coupling',
  },
  'Cruiser': { 
    name: 'Cruiser', 
    sizeCategory: 'large', 
    strengthMod: 1, 
    dexterityMod: 0, 
    constitutionMod: 0, 
    intelligenceMod: 0, 
    wisdomMod: 1, 
    charismaMod: 0, 
    baseSpeed: 400, 
    turningSpeed: 300,
    recommendedArmor: 'Reinforced Armor',
    recommendedShields: 'Fortress Shields',
    recommendedReactor: 'Power Core Reactor',
    recommendedPowerCoupling: 'Distributed Power Coupling',
  },
  'Explorer': { 
    name: 'Explorer', 
    sizeCategory: 'large', 
    strengthMod: 0, 
    dexterityMod: 1, 
    constitutionMod: 0, 
    intelligenceMod: 1, 
    wisdomMod: 0, 
    charismaMod: 0, 
    baseSpeed: 350, 
    turningSpeed: 250,
    recommendedArmor: 'Lightweight Armor',
    recommendedShields: 'Directional Shields',
    recommendedReactor: 'Ionization Reactor',
    recommendedPowerCoupling: 'Distributed Power Coupling',
  },
  'Picket Ship': { 
    name: 'Picket Ship', 
    sizeCategory: 'large', 
    strengthMod: 0, 
    dexterityMod: 1, 
    constitutionMod: 0, 
    intelligenceMod: 0, 
    wisdomMod: 1, 
    charismaMod: 0, 
    baseSpeed: 300, 
    turningSpeed: 200,
    recommendedArmor: 'Deflection Armor',
    recommendedShields: 'Quick Charge Shields',
    recommendedReactor: 'Power Core Reactor',
    recommendedPowerCoupling: 'Hub & Spoke Power Coupling',
  },
  "Ship's Tender": { 
    name: "Ship's Tender", 
    sizeCategory: 'large', 
    strengthMod: 1, 
    dexterityMod: 0, 
    constitutionMod: 1, 
    intelligenceMod: 0, 
    wisdomMod: 0, 
    charismaMod: 0, 
    baseSpeed: 300, 
    turningSpeed: 200,
    recommendedArmor: 'Reinforced Armor',
    recommendedShields: 'Quick Charge Shields',
    recommendedReactor: 'Fuel Cell Reactor',
    recommendedPowerCoupling: 'Direct Power Coupling',
  },

  // Huge Roles
  'Battleship': { 
    name: 'Battleship', 
    sizeCategory: 'huge', 
    strengthMod: 1, 
    dexterityMod: 0, 
    constitutionMod: 0, 
    intelligenceMod: 0, 
    wisdomMod: 1, 
    charismaMod: 0, 
    baseSpeed: 200, 
    turningSpeed: 400,
    recommendedArmor: 'Reinforced Armor',
    recommendedShields: 'Directional Shields',
    recommendedReactor: 'Power Core Reactor',
    recommendedPowerCoupling: 'Hub & Spoke Power Coupling',
  },
  'Carrier': { 
    name: 'Carrier', 
    sizeCategory: 'huge', 
    strengthMod: 0, 
    dexterityMod: 0, 
    constitutionMod: 0, 
    intelligenceMod: 1, 
    wisdomMod: 0, 
    charismaMod: 1, 
    baseSpeed: 300, 
    turningSpeed: 500,
    recommendedArmor: 'Deflection Armor',
    recommendedShields: 'Directional Shields',
    recommendedReactor: 'Ionization Reactor',
    recommendedPowerCoupling: 'Hub & Spoke Power Coupling',
  },
  'Colonizer': { 
    name: 'Colonizer', 
    sizeCategory: 'huge', 
    strengthMod: 0, 
    dexterityMod: 0, 
    constitutionMod: 1, 
    intelligenceMod: 1, 
    wisdomMod: 0, 
    charismaMod: 0, 
    baseSpeed: 400, 
    turningSpeed: 600,
    recommendedArmor: 'Deflection Armor',
    recommendedShields: 'Quick Charge Shields',
    recommendedReactor: 'Ionization Reactor',
    recommendedPowerCoupling: 'Distributed Power Coupling',
  },
  'Command Ship': { 
    name: 'Command Ship', 
    sizeCategory: 'huge', 
    strengthMod: 0, 
    dexterityMod: 0, 
    constitutionMod: 0, 
    intelligenceMod: 0, 
    wisdomMod: 1, 
    charismaMod: 1, 
    baseSpeed: 300, 
    turningSpeed: 500,
    recommendedArmor: 'Reinforced Armor',
    recommendedShields: 'Fortress Shields',
    recommendedReactor: 'Fuel Cell Reactor',
    recommendedPowerCoupling: 'Distributed Power Coupling',
  },
  'Interdictor': { 
    name: 'Interdictor', 
    sizeCategory: 'huge', 
    strengthMod: 1, 
    dexterityMod: 1, 
    constitutionMod: 0, 
    intelligenceMod: 0, 
    wisdomMod: 0, 
    charismaMod: 0, 
    baseSpeed: 200, 
    turningSpeed: 400,
    recommendedArmor: 'Deflection Armor',
    recommendedShields: 'Quick Charge Shields',
    recommendedReactor: 'Power Core Reactor',
    recommendedPowerCoupling: 'Distributed Power Coupling',
  },
  'Juggernaut': { 
    name: 'Juggernaut', 
    sizeCategory: 'huge', 
    strengthMod: 1, 
    dexterityMod: 0, 
    constitutionMod: 1, 
    intelligenceMod: 0, 
    wisdomMod: 0, 
    charismaMod: 0, 
    baseSpeed: 400, 
    turningSpeed: 600,
    recommendedArmor: 'Reinforced Armor',
    recommendedShields: 'Fortress Shields',
    recommendedReactor: 'Power Core Reactor',
    recommendedPowerCoupling: 'Direct Power Coupling',
  },

  // Gargantuan Roles
  'Blockade Ship': { 
    name: 'Blockade Ship', 
    sizeCategory: 'gargantuan', 
    strengthMod: 1, 
    dexterityMod: 1, 
    constitutionMod: 0, 
    intelligenceMod: 0, 
    wisdomMod: 0, 
    charismaMod: 0, 
    baseSpeed: 100, 
    turningSpeed: 400,
    recommendedArmor: 'Reinforced Armor',
    recommendedShields: 'Directional Shields',
    recommendedReactor: 'Fuel Cell Reactor',
    recommendedPowerCoupling: 'Direct Power Coupling',
  },
  'Flag Ship': { 
    name: 'Flag Ship', 
    sizeCategory: 'gargantuan', 
    strengthMod: 0, 
    dexterityMod: 0, 
    constitutionMod: 0, 
    intelligenceMod: 0, 
    wisdomMod: 1, 
    charismaMod: 1, 
    baseSpeed: 200, 
    turningSpeed: 500,
    recommendedArmor: 'Reinforced Armor',
    recommendedShields: 'Quick Charge Shields',
    recommendedReactor: 'Power Core Reactor',
    recommendedPowerCoupling: 'Distributed Power Coupling',
  },
  'Industrial Center': { 
    name: 'Industrial Center', 
    sizeCategory: 'gargantuan', 
    strengthMod: 1, 
    dexterityMod: 0, 
    constitutionMod: 1, 
    intelligenceMod: 0, 
    wisdomMod: 0, 
    charismaMod: 0, 
    baseSpeed: 300, 
    turningSpeed: 600,
    recommendedArmor: 'Deflection Armor',
    recommendedShields: 'Quick Charge Shields',
    recommendedReactor: 'Fuel Cell Reactor',
    recommendedPowerCoupling: 'Hub & Spoke Power Coupling',
  },
  'Mobile Metropolis': { 
    name: 'Mobile Metropolis', 
    sizeCategory: 'gargantuan', 
    strengthMod: 0, 
    dexterityMod: 0, 
    constitutionMod: 1, 
    intelligenceMod: 0, 
    wisdomMod: 1, 
    charismaMod: 0, 
    baseSpeed: 300, 
    turningSpeed: 600,
    recommendedArmor: 'Deflection Armor',
    recommendedShields: 'Directional Shields',
    recommendedReactor: 'Ionization Reactor',
    recommendedPowerCoupling: 'Distributed Power Coupling',
  },
  'Researcher': { 
    name: 'Researcher', 
    sizeCategory: 'gargantuan', 
    strengthMod: 0, 
    dexterityMod: 0, 
    constitutionMod: 0, 
    intelligenceMod: 1, 
    wisdomMod: 1, 
    charismaMod: 0, 
    baseSpeed: 100, 
    turningSpeed: 400,
    recommendedArmor: 'Deflection Armor',
    recommendedShields: 'Fortress Shields',
    recommendedReactor: 'Fuel Cell Reactor',
    recommendedPowerCoupling: 'Hub & Spoke Power Coupling',
  },
  'Warship': { 
    name: 'Warship', 
    sizeCategory: 'gargantuan', 
    strengthMod: 1, 
    dexterityMod: 0, 
    constitutionMod: 0, 
    intelligenceMod: 0, 
    wisdomMod: 1, 
    charismaMod: 0, 
    baseSpeed: 200, 
    turningSpeed: 500,
    recommendedArmor: 'Reinforced Armor',
    recommendedShields: 'Fortress Shields',
    recommendedReactor: 'Power Core Reactor',
    recommendedPowerCoupling: 'Distributed Power Coupling',
  },
} as const

// --- TIER PROGRESSION RULES ---
export interface ShipTierRule {
  readonly tier: number
  readonly features: string[]
  readonly pinpointStrikeDie: string | null
  readonly totalHd: number
  readonly acUpgrade: number
}

// Inside lib/ship-rules.ts -> SHIP_TIER_PROGRESSION
export const SHIP_TIER_PROGRESSION: Record<ShipSize, Record<number, ShipTierRule>> = {
  tiny: {} as any,
  small: {
    0: { tier: 0, features: ['Role'], pinpointStrikeDie: null, totalHd: 3, acUpgrade: 0 },
    1: { tier: 1, features: ['Pinpoint Strike', 'Ability Score Increase'], pinpointStrikeDie: 'd4', totalHd: 4, acUpgrade: 0 },
    2: { tier: 2, features: ['Role Specialization', 'Retro Thrusters', 'Ability Score Increase'], pinpointStrikeDie: 'd6', totalHd: 5, acUpgrade: 1 },
    3: { tier: 3, features: ['Versatile Snubfighter', 'Auto-Thrusters', 'Ability Score Increase'], pinpointStrikeDie: 'd8', totalHd: 6, acUpgrade: 2 },
    4: { tier: 4, features: ['Role Mastery', 'Standing By', 'Ability Score Increase'], pinpointStrikeDie: 'd10', totalHd: 7, acUpgrade: 3 },
    5: { tier: 5, features: ['Paragon Snubfighter', 'A Leaf on the Wind', 'Ability Score Increase'], pinpointStrikeDie: 'd12', totalHd: 8, acUpgrade: 4 },
  },
  medium: {} as any,
  large: {} as any,
  huge: {} as any,
  gargantuan: {} as any,
} as const

// --- PARAGON SNUBFIGHTER (TIER 5 FEATURE) ---
export type ParagonSnubfighter =
  | 'Attack Fighter'
  | 'Bomber'
  | 'Scout'
  | 'Scrambler'
  | 'Shuttle'
  | 'Superiority Fighter'

export interface ParagonSnubfighterDetail {
  readonly name: ParagonSnubfighter
  readonly boostedStat: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'
  readonly summary: string
  readonly description: string
}

export const PARAGON_SNUBFIGHTERS: Record<ParagonSnubfighter, ParagonSnubfighterDetail> = {
  'Attack Fighter': {
    name: 'Attack Fighter',
    boostedStat: 'strength',
    summary: 'Strength score increases by 2; maximum for this score increases by 2.',
    description: 'Your ship’s Strength score increases by 2. Its maximum for this score increases by 2.'
  },
  'Bomber': {
    name: 'Bomber',
    boostedStat: 'wisdom',
    summary: 'Wisdom score increases by 2; maximum for this score increases by 2.',
    description: 'Your ship’s Wisdom score increases by 2. Its maximum for this score increases by 2.'
  },
  'Scout': {
    name: 'Scout',
    boostedStat: 'intelligence',
    summary: 'Intelligence score increases by 2; maximum for this score increases by 2.',
    description: 'Your ship’s Intelligence score increases by 2. Its maximum for this score increases by 2.'
  },
  'Scrambler': {
    name: 'Scrambler',
    boostedStat: 'charisma',
    summary: 'Charisma score increases by 2; maximum for this score increases by 2.',
    description: 'Your ship’s Charisma score increases by 2. Its maximum for this score increases by 2.'
  },
  'Shuttle': {
    name: 'Shuttle',
    boostedStat: 'constitution',
    summary: 'Constitution score increases by 2; maximum for this score increases by 2.',
    description: 'Your ship’s Constitution score increases by 2. Its maximum for this score increases by 2.'
  },
  'Superiority Fighter': {
    name: 'Superiority Fighter',
    boostedStat: 'dexterity',
    summary: 'Dexterity score increases by 2; maximum for this score increases by 2.',
    description: 'Your ship’s Dexterity score increases by 2. Its maximum for this score increases by 2.'
  }
} as const