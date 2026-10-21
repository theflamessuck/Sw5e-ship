import { ShipSize } from "./ship-rules"
import { Modification, StationName, InstalledSuite } from "@/components/bridge/ship-modifications"

export type AbilityScoreName =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "wisdom"
  | "charisma"

export interface WeaponModifierOverride {
  toHitBonus: number
  damageBonus: number
  normalRangeMultiplier: number
  maxRangeMultiplier: number
  reloadMultiplier: number
  rerollLowDamageDice: boolean
  addedSaveCondition?: "blinded" | "ionized" | "shocked" | "stunned"
  conditionSaveDCStat?: AbilityScoreName
  directControllerActive?: boolean
  explosivePayload?: boolean
}

export interface StationActionAbility {
  id: string
  name: string
  station: StationName
  actionType: "action" | "bonus action" | "reaction" | "downtime"
  maxUses: number
  resetOn: "recharge" | "refit"
  description: string
  requiresTargetWeapon?: boolean
}

export interface ShipModifierBonuses {
  statDeltas: Record<AbilityScoreName, number>
  statCapDeltas: Record<AbilityScoreName, number>

  armorClassOverride?: number
  armorClassBonus: number
  damageResistances: {
    hullEnergy: boolean
    hullKinetic: boolean
    shieldsEnergy: boolean
    shieldsKinetic: boolean
    rammingKinetic: boolean
  }

  flyingSpeedBonus: number
  turningSpeedDelta: number
  swimmingSpeedRatio: number

  maxModSlotsBonus: number
  maxCrewBonus: number
  minCrewMultiplier: number
  baseFuelMultiplier: number
  baseCargoOverride?: number
  cargoBonusMultiplier: number
  hiddenCargoRatio: number
  vaultCargoRatio: number

  savingThrowProficiencies: Set<AbilityScoreName>
  skillProficiencies: Record<string, "proficient" | "expert">
  skillFlatBonuses: Record<string, number>

  sFoilsInstalled: boolean
  sFoilsMode?: "locked" | "unlocked"

  globalWeaponDamageBonus: number
  globalWeaponCritDiceBonus: number
  missileBoatMasteryActive: boolean
  hyperdriveClassImprovement: boolean

  weaponOverrides: Record<string, WeaponModifierOverride>
  grantedAbilities: StationActionAbility[]
}

export interface ComputeShipModifiersParams {
  shipTier: number
  shipSize: ShipSize
  installedMods: Modification[]
  installedSuites?: InstalledSuite[]
  sFoilsMode?: "locked" | "unlocked"
  roleSpecialization?: string | null
  roleMastery?: string | null
}

export function computeShipModifiers({
  shipTier,
  shipSize,
  installedMods = [],
  installedSuites = [],
  sFoilsMode = "unlocked",
  roleSpecialization,
  roleMastery
}: ComputeShipModifiersParams): ShipModifierBonuses {
  const tier = Math.max(0, shipTier)
  const tierUses = Math.max(1, tier)

  const result: ShipModifierBonuses = {
    statDeltas: {
      strength: 0,
      dexterity: 0,
      constitution: 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0,
    },
    statCapDeltas: {
      strength: 0,
      dexterity: 0,
      constitution: 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0,
    },
    armorClassOverride: undefined,
    armorClassBonus: 0,
    damageResistances: {
      hullEnergy: false,
      hullKinetic: false,
      shieldsEnergy: false,
      shieldsKinetic: false,
      rammingKinetic: false,
    },
    flyingSpeedBonus: 0,
    turningSpeedDelta: 0,
    swimmingSpeedRatio: 0,
    maxModSlotsBonus: 0,
    maxCrewBonus: 0,
    minCrewMultiplier: 1,
    baseFuelMultiplier: 1,
    baseCargoOverride: undefined,
    cargoBonusMultiplier: 0,
    hiddenCargoRatio: 0,
    vaultCargoRatio: 0,
    savingThrowProficiencies: new Set<AbilityScoreName>(),
    skillProficiencies: {},
    skillFlatBonuses: {},
    sFoilsInstalled: false,
    sFoilsMode,
    globalWeaponDamageBonus: 0,
    globalWeaponCritDiceBonus: 0,
    missileBoatMasteryActive: false,
    hyperdriveClassImprovement: false,
    weaponOverrides: {},
    grantedAbilities: [],
  }

  const helperSetSkill = (skill: string, level: "proficient" | "expert") => {
    if (result.skillProficiencies[skill] === "expert") return
    result.skillProficiencies[skill] = level
  }

  // --- 0. MEDIUM SHIP ROLE SPECIALIZATIONS & MASTERIES ---
  if (shipSize === "medium" || shipSize === "Medium") {
    if (tier >= 2 && roleSpecialization) {
      if (roleSpecialization === "Courier") {
        result.flyingSpeedBonus += 50
      } else if (roleSpecialization === "Freighter") {
        result.baseCargoOverride = 50
        result.cargoBonusMultiplier += 1.0 // Free Storage Compartment equivalent
      } else if (roleSpecialization === "Gunship") {
        result.globalWeaponDamageBonus += 1
        result.maxModSlotsBonus += 1 // Free Fixed Hardpoint equivalent
      } else if (roleSpecialization === "Navigator") {
        helperSetSkill("Astrogation", "proficient") // Free Navcomputer equivalent
      }
    }

    if (tier >= 4 && roleMastery) {
      if (roleMastery === "Courier") {
        result.hyperdriveClassImprovement = true // Acts as one class faster
      } else if (roleMastery === "Gunship") {
        result.globalWeaponCritDiceBonus += 1
      } else if (roleMastery === "Missile Boat") {
        result.missileBoatMasteryActive = true
      }
    }
  }

  // --- 1. PROCESS SUITES BAY MODULES ---
  for (const suite of installedSuites) {
    const name = suite.name.toUpperCase().trim()

    if (name.includes("EQUIPMENT ROOM")) {
      result.maxModSlotsBonus += 4
    } else if (name.includes("CREW EXPANSION")) {
      result.maxCrewBonus += 1
    } else if (name.includes("FUEL STORAGE")) {
      result.baseFuelMultiplier += 5
    } else if (name.includes("STORAGE COMPARTMENT")) {
      result.cargoBonusMultiplier += 1.0
    } else if (name.includes("HIDDEN STORAGE")) {
      result.hiddenCargoRatio += 0.5
    } else if (name.includes("VAULT")) {
      result.vaultCargoRatio += 0.5
    }
  }

  const getWeaponOverride = (weaponId: string): WeaponModifierOverride => {
    if (!result.weaponOverrides[weaponId]) {
      result.weaponOverrides[weaponId] = {
        toHitBonus: 0,
        damageBonus: 0,
        normalRangeMultiplier: 1,
        maxRangeMultiplier: 1,
        reloadMultiplier: 1,
        rerollLowDamageDice: false,
        addedSaveCondition: undefined,
        conditionSaveDCStat: "strength",
        directControllerActive: false,
        explosivePayload: false,
      }
    }
    return result.weaponOverrides[weaponId]
  }

  // --- 2. PROCESS INSTALLED MODIFICATIONS ---
  for (const mod of installedMods) {
    const rawName = mod.name.trim()
    const name = rawName.toUpperCase()

    // --- A. Core Ability Score Modifications ---
    // Reactor (Strength)
    if (name.startsWith("REACTOR, MARK V")) {
      result.statDeltas.strength += 2
      result.statCapDeltas.strength += 2
    } else if (name.startsWith("REACTOR, MARK")) {
      result.statDeltas.strength += 1
    } else if (name === "REACTOR, MAKESHIFT") {
      result.statDeltas.strength += 1
    }

    // Thrusters (Dexterity)
    if (name.startsWith("THRUSTERS, MARK V")) {
      result.statDeltas.dexterity += 2
      result.statCapDeltas.dexterity += 2
    } else if (name.startsWith("THRUSTERS, MARK")) {
      result.statDeltas.dexterity += 1
    } else if (name === "THRUSTERS, MAKESHIFT") {
      result.statDeltas.dexterity += 1
    }

    // Frame (Constitution)
    if (name.startsWith("FRAME, MARK V")) {
      result.statDeltas.constitution += 2
      result.statCapDeltas.constitution += 2
    } else if (name.startsWith("FRAME, MARK")) {
      result.statDeltas.constitution += 1
    } else if (name === "FRAME, MAKESHIFT") {
      result.statDeltas.constitution += 1
    }

    // Data Core (Intelligence)
    if (name.startsWith("DATA CORE, MARK V")) {
      result.statDeltas.intelligence += 2
      result.statCapDeltas.intelligence += 2
    } else if (name.startsWith("DATA CORE, MARK")) {
      result.statDeltas.intelligence += 1
    } else if (name === "DATA CORE, MAKESHIFT") {
      result.statDeltas.intelligence += 1
    }

    // Sensor Array (Wisdom)
    if (name.startsWith("SENSOR ARRAY, MARK V")) {
      result.statDeltas.wisdom += 2
      result.statCapDeltas.wisdom += 2
    } else if (name.startsWith("SENSOR ARRAY, MARK")) {
      result.statDeltas.wisdom += 1
    } else if (name === "SENSOR ARRAY, MAKESHIFT") {
      result.statDeltas.wisdom += 1
    }

    // Transmitters (Charisma)
    if (name.startsWith("TRANSMITTERS, MARK V")) {
      result.statDeltas.charisma += 2
      result.statCapDeltas.charisma += 2
    } else if (name.startsWith("TRANSMITTERS, MARK")) {
      result.statDeltas.charisma += 1
    } else if (name === "TRANSMITTERS, MAKESHIFT") {
      result.statDeltas.charisma += 1
    }

    // User-selected penalty on Makeshift modules
    const penaltyStat = (mod as any).penaltyStat as AbilityScoreName | undefined
    if (penaltyStat && result.statDeltas[penaltyStat] !== undefined) {
      result.statDeltas[penaltyStat] -= 1
    }

    // --- B. Armor Class (Plating) ---
    if (name === "PLATING, MAKESHIFT") {
      result.armorClassOverride = 11
    } else if (name === "PLATING, MARK I") {
      result.armorClassOverride = 12
    } else if (name === "PLATING, MARK II") {
      result.armorClassOverride = 14
    } else if (name === "PLATING, MARK III") {
      result.armorClassOverride = 15
    } else if (name === "PLATING, MARK IV") {
      result.armorClassOverride = 17
    } else if (name === "PLATING, MARK V") {
      result.armorClassOverride = 18
    }

    // --- C. Damage Resistances ---
    if (name === "ABLATIVE PLATING LAYER") {
      result.damageResistances.hullEnergy = true
    } else if (name === "REACTIVE PLATING LAYER") {
      result.damageResistances.hullKinetic = true
    } else if (name === "ABSORPTIVE SHIELDING") {
      result.damageResistances.shieldsKinetic = true
    } else if (name === "REACTIVE SHIELDING COMPENSATOR") {
      result.damageResistances.shieldsEnergy = true
    } else if (name === "SHOCK ABSORBERS") {
      result.damageResistances.rammingKinetic = true
    }

    // --- D. Propulsion & Maneuverability ---
    if (name === "ADAPTIVE AILERONS") {
      result.turningSpeedDelta -= 100
      result.armorClassBonus += 1
    } else if (name === "AMPHIBIOUS SYSTEMS") {
      result.swimmingSpeedRatio = 0.5
    }

    // --- E. Capacity Adjustments ---
    if (name === "EXTRA FUEL TANK") {
      result.baseFuelMultiplier += 0.5
    } else if (name === "SLAVE CIRCUIT") {
      result.minCrewMultiplier = 0.5
    }

    // --- F. Saving Throw Proficiencies ---
    if (name === "RESILIENT REACTOR") result.savingThrowProficiencies.add("strength")
    if (name === "RESILIENT THRUSTER") result.savingThrowProficiencies.add("dexterity")
    if (name === "RESILIENT HULL") result.savingThrowProficiencies.add("constitution")
    if (name === "RESILIENT PROCESSORS") result.savingThrowProficiencies.add("intelligence")
    if (name === "RESILIENT SENSORS") result.savingThrowProficiencies.add("wisdom")
    if (name === "RESILIENT COMMUNICATIONS") result.savingThrowProficiencies.add("charisma")

    // --- G. Skill Proficiencies & Expertises ---
    if (name === "HARDENED PROW") helperSetSkill("Ram", "proficient")
    if (name === "BOARDING HARPOON") helperSetSkill("Ram", "expert")
    if (name === "CRYOGENIC CAPACITOR") helperSetSkill("Boost", "proficient")
    if (name === "CRYOGENIC CAPACITOR, PREMIUM") helperSetSkill("Boost", "expert")
    if (name === "POWER CONVERTER, PREMIUM") helperSetSkill("Regulation", "proficient")
    if (name === "POWER CONVERTER, PROTOTYPE") helperSetSkill("Regulation", "expert")
    if (name === "DAMAGE CONTROL SYSTEM") helperSetSkill("Patch", "proficient")
    if (name === "AUTOMATED PROTOCOLS") helperSetSkill("Patch", "expert")
    if (name === "NAVCOMPUTER") helperSetSkill("Astrogation", "proficient")
    if (name === "NAVCOMPUTER, MARK II") helperSetSkill("Astrogation", "expert")
    if (name === "NAVCOMPUTER, MARK III") result.skillFlatBonuses["Astrogation"] = 1
    if (name === "NAVCOMPUTER, MARK IV") result.skillFlatBonuses["Astrogation"] = 2
    if (name === "NAVCOMPUTER, MARK V") result.skillFlatBonuses["Astrogation"] = 3
    if (name === "SCANNER, PREMIUM") {
      helperSetSkill("Probe", "proficient")
      helperSetSkill("Scan", "proficient")
    }
    if (name === "SCANNER, PROTOTYPE") {
      helperSetSkill("Probe", "expert")
      helperSetSkill("Scan", "expert")
    }
    if (name === "COMMUNICATIONS PACKAGE, PREMIUM") helperSetSkill("Broadcast", "proficient")
    if (name === "COMMUNICATIONS PACKAGE, PROTOTYPE") helperSetSkill("Broadcast", "expert")
    if (name === "COMMUNICATIONS SUPPRESSOR, PREMIUM") helperSetSkill("Interfere", "proficient")
    if (name === "COMMUNICATIONS SUPPRESSOR, PROTOYPE") helperSetSkill("Interfere", "expert")
    if (name === "STEALTH DEVICE") helperSetSkill("Hide", "proficient")
    if (name === "ACTIVE CAMOUFLAGE") helperSetSkill("Hide", "expert")
    if (name === "SECONDARY TRANSPONDER CODE") helperSetSkill("Swindle", "proficient")

    // --- H. S-Foils Global Check ---
    if (name === "S-FOILS") {
      result.sFoilsInstalled = true
    }

    // --- I. Targeted Weapon Modifications ---
    if (mod.targetWeaponInstanceId) {
      const weaponOv = getWeaponOverride(mod.targetWeaponInstanceId)

      if (name === "EXPANDED PAYLOAD") {
        weaponOv.reloadMultiplier *= 1.5
      } else if (name === "EXPLOSIVE PAYLOAD") {
        weaponOv.explosivePayload = true
      } else if (name === "PINPOINTING ADDITION") {
        weaponOv.normalRangeMultiplier *= 1.5
        weaponOv.maxRangeMultiplier *= 1.5
      } else if (name === "GAUSS ROUNDS") {
        weaponOv.rerollLowDamageDice = true
      } else if (name === "DIRECT CONTROLLER") {
        weaponOv.directControllerActive = true
      } else if (name === "TRIBUTARY BEAM") {
        weaponOv.damageBonus += 5
      } else if (name === "BLINDING ROUNDS") {
        weaponOv.addedSaveCondition = "blinded"
        weaponOv.conditionSaveDCStat = "strength"
      } else if (name === "IONIZING ROUNDS") {
        weaponOv.addedSaveCondition = "ionized"
        weaponOv.conditionSaveDCStat = "strength"
      } else if (name === "SHOCKING ROUNDS") {
        weaponOv.addedSaveCondition = "shocked"
        weaponOv.conditionSaveDCStat = "strength"
      } else if (name === "STUNNING ROUNDS") {
        weaponOv.addedSaveCondition = "stunned"
        weaponOv.conditionSaveDCStat = "strength"
      }
    }

    // --- J. Active Tactical Features ---
    const checkAndPushAbility = (ability: StationActionAbility) => {
      result.grantedAbilities.push(ability)
    }

    if (name === "SLAM") {
      checkAndPushAbility({
        id: "slam",
        name: "SLAM (SubLight Acceleration Motor)",
        station: "Engines",
        actionType: "action",
        maxUses: tierUses,
        resetOn: "recharge",
        description: "Gain extra movement equal to current speed for the turn.",
      })
    } else if (name === "ADVANCED SLAM") {
      checkAndPushAbility({
        id: "adv-slam",
        name: "ADVANCED SLAM",
        station: "Engines",
        actionType: "action",
        maxUses: tierUses,
        resetOn: "recharge",
        description: "Gain extra movement equal to twice your current speed for the turn.",
      })
    } else if (name === "POWER BACKUP") {
      checkAndPushAbility({
        id: "power-backup",
        name: "Power Backup Emergency Surge",
        station: "Engineering",
        actionType: "reaction",
        maxUses: 1,
        resetOn: "recharge",
        description: "Drop to 1 HP instead of 0, or automatically succeed on a Destruction save.",
      })
    } else if (name === "EMERGENCY GENERATOR") {
      checkAndPushAbility({
        id: "emergency-generator",
        name: "Emergency Shield Generator",
        station: "Engineering",
        actionType: "reaction",
        maxUses: 1,
        resetOn: "recharge",
        description: "Drop to 1 SP instead of 0, or restore SP equal to 2x Str modifier.",
      })
    } else if (name === "ELECTRONIC BAFFLE") {
      checkAndPushAbility({
        id: "electronic-baffle",
        name: "Electronic Baffle Condition Flush",
        station: "Engineering",
        actionType: "reaction",
        maxUses: tierUses,
        resetOn: "refit",
        description: "Roll 1 Hull Die of self-damage to immediately ignore ionized, shocked, or stunned.",
      })
    } else if (name === "DAMAGE CONTROL SYSTEM") {
      checkAndPushAbility({
        id: "bonus-patch",
        name: "Quick Patch",
        station: "Engineering",
        actionType: "bonus action",
        maxUses: tierUses,
        resetOn: "refit",
        description: "Take the Patch action as a bonus action.",
      })
    } else if (name === "AUTOMATED PROTOCOLS") {
      checkAndPushAbility({
        id: "reaction-patch",
        name: "Automated Reaction Patch",
        station: "Engineering",
        actionType: "reaction",
        maxUses: tierUses,
        resetOn: "refit",
        description: "Take the Patch action as a reaction.",
      })
    } else if (name === "ALTERNATIVE FUEL CONVERTER") {
      checkAndPushAbility({
        id: "alt-fuel",
        name: "Alternative Fuel Converter",
        station: "Engineering",
        actionType: "downtime",
        maxUses: tierUses,
        resetOn: "refit",
        description: "Spend 10 mins & roll Con (Regulation) to recover 1 day's worth of fuel.",
      })
    } else if (name === "FLARE PODS") {
      checkAndPushAbility({
        id: "flare-pods",
        name: "Countermeasure Flares",
        station: "Sensors",
        actionType: "reaction",
        maxUses: tierUses,
        resetOn: "refit",
        description: "Grant advantage or a reroll on a Dex saving throw against missile/incoming fire.",
      })
    } else if (name === "BUZZ DROID CLOUD") {
      checkAndPushAbility({
        id: "buzz-droids",
        name: "Deploy Buzz Droid Cloud",
        station: "Sensors",
        actionType: "action",
        maxUses: tierUses,
        resetOn: "refit",
        description: "Create a 200-ft sphere (1500 ft range) dealing 2d4 kinetic hull damage per 50 ft.",
      })
    } else if (name === "SENSOR DAMPENER") {
      checkAndPushAbility({
        id: "sensor-dampener",
        name: "Sensor Dampener",
        station: "Sensors",
        actionType: "action",
        maxUses: tierUses,
        resetOn: "recharge",
        description: "Target ship within 1000 ft makes Wis save or is blinded for 1 min.",
      })
    } else if (name === "SHIELD DISRUPTOR") {
      checkAndPushAbility({
        id: "shield-disruptor",
        name: "Activate Shield Disruptor",
        station: "Sensors",
        actionType: "action",
        maxUses: tierUses,
        resetOn: "recharge",
        description: "Contested Cha (Interfere) vs Con (Regulate) to halve target shield cap & regen for 1 min.",
      })
    } else if (name === "ELECTRICAL DISCHARGERS") {
      checkAndPushAbility({
        id: "electrical-discharger",
        name: "Electrical Discharge Burst",
        station: "Communications",
        actionType: "action",
        maxUses: tierUses,
        resetOn: "recharge",
        description: "Ships within 50 ft make Dex save or take scaling lightning damage (1d6/tier).",
      })
    } else if (name === "EMP DEVICE") {
      checkAndPushAbility({
        id: "emp-device",
        name: "Trigger EMP Pulse",
        station: "Communications",
        actionType: "action",
        maxUses: tierUses,
        resetOn: "recharge",
        description: "Ships within 100 ft make Con save or become stunned for 1 min.",
      })
    } else if (name.startsWith("SHIP SLICER")) {
      checkAndPushAbility({
        id: `ship-slicer-${mod.instanceId}`,
        name: mod.name,
        station: "Communications",
        actionType: "action",
        maxUses: tierUses,
        resetOn: "recharge",
        description: mod.description,
      })
    } else if (name.startsWith("ELECTROMAGNETIC SCRAMBLER")) {
      checkAndPushAbility({
        id: `scrambler-${mod.instanceId}`,
        name: mod.name,
        station: "Communications",
        actionType: "action",
        maxUses: tierUses,
        resetOn: "recharge",
        description: mod.description,
      })
    } else if (name === "FEEDBACK SHIELD") {
      checkAndPushAbility({
        id: "feedback-shield",
        name: "Shield Feedback Retaliation",
        station: "Defense",
        actionType: "reaction",
        maxUses: 99,
        resetOn: "recharge",
        description: "When hit by weapon attack, deal damage back to attacker based on ship size.",
      })
    } else if (name === "INVULNERABILITY DRIVE") {
      checkAndPushAbility({
        id: "invulnerability-drive",
        name: "Invulnerability Drive",
        station: "Defense",
        actionType: "action",
        maxUses: 1,
        resetOn: "refit",
        description: "Immune to all damage for 1d4 rounds. Halves speed, doubles turn speed. Destruction save at end.",
      })
    } else if (name.startsWith("CARBONITE LAUNCHER")) {
      checkAndPushAbility({
        id: `carbonite-launcher-${mod.instanceId}`,
        name: mod.name,
        station: "Weapons",
        actionType: "action",
        maxUses: tierUses,
        resetOn: "recharge",
        description: mod.description,
        requiresTargetWeapon: true,
      })
    } else if (name.startsWith("TIBANA GAS PROJECTOR")) {
      checkAndPushAbility({
        id: `tibana-projector-${mod.instanceId}`,
        name: mod.name,
        station: "Weapons",
        actionType: "action",
        maxUses: tierUses,
        resetOn: "recharge",
        description: mod.description,
        requiresTargetWeapon: true,
      })
    } else if (name === "SUPER-HEAVY ION CANNON") {
      checkAndPushAbility({
        id: "super-heavy-ion",
        name: "Super-Heavy Ion Cannon Burst",
        station: "Weapons",
        actionType: "action",
        maxUses: tierUses,
        resetOn: "recharge",
        description: "1000-ft range shot forcing Con save or target is stunned for 1 min.",
      })
    } else if (name === "TRACTOR BEAM") {
      checkAndPushAbility({
        id: "tractor-beam",
        name: "Engage Tractor Beam",
        station: "Weapons",
        actionType: "action",
        maxUses: tierUses,
        resetOn: "recharge",
        description: "Tractor target within 1000 ft on failed Str save. Bonus action to move 100 ft.",
      })
    }
  }

  // --- 3. APPLY S-FOILS STANCE DELTAS ---
  if (result.sFoilsInstalled) {
    if (result.sFoilsMode === "locked") {
      result.flyingSpeedBonus += 50
      for (const mod of installedMods) {
        if (mod.category === "Weapon System" && mod.instanceId) {
          const ov = getWeaponOverride(mod.instanceId)
          ov.toHitBonus -= 2
        }
      }
    } else if (result.sFoilsMode === "unlocked") {
      for (const mod of installedMods) {
        if (mod.category === "Weapon System" && mod.instanceId) {
          const ov = getWeaponOverride(mod.instanceId)
          ov.toHitBonus += 1
        }
      }
    }
  }

  return result
}