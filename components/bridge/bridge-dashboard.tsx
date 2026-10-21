"use client"

import { useState, useMemo, useEffect } from "react"
import { HeaderBar } from "./header-bar"
import { StationSidebar, type Station } from "./station-sidebar"
import { WeaponsStation, type OrdnanceItem } from "./weapons-station"
import { SensorsStation } from "./sensors-station"
import { DefenseStation, type ActiveStatus } from "./defense-station"
import { ShipModifications, MASTER_MODIFICATIONS, type Modification, type InstalledSuite } from "./ship-modifications"
import { CargoStation } from "./cargo-station"
import { CrewStation } from "./crew-station"
import { CommunicationsStation } from "./communications-station"
import { EnginesStation } from "./engines-station"
import { NavcomputerStation, type JourneyData } from "./navcomputer-station"
import { FinanceStation, type Transaction } from "./finance-station"
import { EngineeringStation, type RechargeResultPayload } from "./engineering-station"
import { GmStation, type SensorContact } from "./gm-station"
import { ShipSetup, type ShipConfig } from "./ship-setup"
import { SHIP_SIZE_RULES, SHIP_TYPE_RULES, ShipSize } from "@/lib/ship-rules"
import { STARSHIP_AMMUNITION } from "@/lib/starship-weapons"
import { CodexStation } from "./codex-station"
import { computeShipModifiers } from "@/lib/ship-modifiers"
import { AlertOctagon, RefreshCw } from "lucide-react"

// ==========================================
// CREW MANIFEST & TACTICAL MOVEMENT SCHEMAS
// ==========================================

export type ShipStationId =
  | "helm"
  | "engineering"
  | "communications"
  | "defense"
  | "sensors"
  | "weapons"

export type ShipCompartmentId =
  | ShipStationId
  | `turret-${string}`
  | "crew_quarters"
  | "passenger_lounge"
  | "cargo_bay"
  | "medical_bay"

export type CrewRoleTitle =
  | "Pilot"
  | "Copilot"
  | "Chief Engineer"
  | "Comms Officer"
  | "Defense Officer"
  | "Sensor Officer"
  | "Weapons Officer"
  | "Gunner"
  | "Support"
  | "Off Duty"
  | "Passenger"

export interface ManifestMember {
  id: string
  name: string
  isPlayer: boolean
  isPassenger: boolean
  location: ShipCompartmentId
  assignedOrder: number
  individualInitiative: number
  hasTakenTurnThisRound: boolean
  notes?: string
}

export interface TacticalMovementState {
  spentFeet: number
}

export function getCrewRole(
  member: ManifestMember,
  allMembers: ManifestMember[]
): CrewRoleTitle {
  if (member.isPassenger || member.location === "passenger_lounge") {
    return "Passenger"
  }

  if (
    member.location === "crew_quarters" ||
    member.location === "cargo_bay" ||
    member.location === "medical_bay"
  ) {
    return "Off Duty"
  }

  if (member.location.startsWith("turret-")) {
    return "Gunner"
  }

  const stationmates = allMembers
    .filter((m) => m.location === member.location && !m.isPassenger)
    .sort((a, b) => a.assignedOrder - b.assignedOrder)

  const slotIndex = stationmates.findIndex((m) => m.id === member.id)

  switch (member.location) {
    case "helm":
      if (slotIndex === 0) return "Pilot"
      if (slotIndex === 1) return "Copilot"
      return "Support"

    case "engineering":
      return slotIndex === 0 ? "Chief Engineer" : "Support"

    case "communications":
      return slotIndex === 0 ? "Comms Officer" : "Support"

    case "defense":
      return slotIndex === 0 ? "Defense Officer" : "Support"

    case "sensors":
      return slotIndex === 0 ? "Sensor Officer" : "Support"

    case "weapons":
      return slotIndex === 0 ? "Weapons Officer" : "Support"

    default:
      return "Support"
  }
}

const STAT_SKILLS_MAP = {
  strength: ["boost", "ram"],
  dexterity: ["hide", "maneuver"],
  constitution: ["patch", "regulation"],
  intelligence: ["astrogation", "data", "probe"],
  wisdom: ["scan"],
  charisma: ["impress", "interfere", "menace", "swindle"],
} as const

function getRawModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export default function BridgeDashboard() {
  const [maxFuel, setMaxFuel] = useState<number>(30)
  const [currentFuel, setCurrentFuel] = useState<number>(30)
  const [active, setActive] = useState<Station>("Weapons")
  
  const [currentDay, setCurrentDay] = useState<number>(1)
  const [activeJourney, setActiveJourney] = useState<JourneyData | null>(null)
  const [lastAstrogationDay, setLastAstrogationDay] = useState<number>(1)
  const externalPendingCharts = currentDay > lastAstrogationDay ? 150 : 0

  // --- CARGO RATIONS / STOCKS STATE ---
  const [cargoRations, setCargoRations] = useState<number>(60)

  // --- CREW MANIFEST & TACTICAL MOVEMENT ---
  const [manifest, setManifest] = useState<ManifestMember[]>([
    {
      id: "pc-1",
      name: "Captain Vance",
      isPlayer: true,
      isPassenger: false,
      location: "helm",
      assignedOrder: 1,
      individualInitiative: 12,
      hasTakenTurnThisRound: false,
      notes: "Commanding officer",
    },
    {
      id: "pc-2",
      name: "Jax Spark",
      isPlayer: true,
      isPassenger: false,
      location: "engineering",
      assignedOrder: 2,
      individualInitiative: 15,
      hasTakenTurnThisRound: false,
      notes: "Chief mechanic",
    },
    {
      id: "npc-1",
      name: "Envoy Trel",
      isPlayer: false,
      isPassenger: true,
      location: "passenger_lounge",
      assignedOrder: 3,
      individualInitiative: 0,
      hasTakenTurnThisRound: false,
      notes: "Diplomatic passenger from Coruscant",
    },
  ])

  const [tacticalMovement, setTacticalMovement] = useState<TacticalMovementState>({
    spentFeet: 0,
  })

  // --- MANIFEST DISPATCH ACTIONS ---
  const handleAddMember = (
    newMember: Omit<ManifestMember, "id" | "assignedOrder" | "hasTakenTurnThisRound">
  ) => {
    const id = `manifest-${Date.now()}`
    const location = newMember.isPassenger
      ? "passenger_lounge"
      : (newMember.location || "crew_quarters")

    setManifest((prev) => [
      ...prev,
      {
        ...newMember,
        id,
        location,
        assignedOrder: Date.now(),
        hasTakenTurnThisRound: false,
      },
    ])
  }

  const handleRemoveMember = (id: string) => {
    setManifest((prev) => prev.filter((m) => m.id !== id))
  }

  const handleAssignLocation = (memberId: string, targetLocation: ShipCompartmentId) => {
    setManifest((prev) => {
      const member = prev.find((m) => m.id === memberId)
      if (!member || member.isPassenger) return prev // Passengers remain in the lounge

      const isTargetTurret = targetLocation.startsWith("turret-")
      return prev.map((m) => {
        // Enforce max 1 person per turret
        if (isTargetTurret && m.location === targetLocation && m.id !== memberId) {
          return {
            ...m,
            location: "crew_quarters" as ShipCompartmentId,
            assignedOrder: Date.now(),
          }
        }
        if (m.id === memberId) {
          return {
            ...m,
            location: targetLocation,
            assignedOrder: Date.now(),
          }
        }
        return m
      })
    })
  }

  const handleToggleTurnTaken = (memberId: string) => {
    setManifest((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, hasTakenTurnThisRound: !m.hasTakenTurnThisRound }
          : m
      )
    )
  }

  const handleUpdateInitiative = (memberId: string, initiative: number) => {
    setManifest((prev) =>
      prev.map((m) =>
        m.id === memberId ? { ...m, individualInitiative: initiative } : m
      )
    )
  }

  const handleSpendMovement = (feet: number) => {
    setTacticalMovement((prev) => ({
      ...prev,
      spentFeet: Math.max(0, prev.spentFeet + feet),
    }))
  }

  const handleResetMovement = () => {
    setTacticalMovement({ spentFeet: 0 })
  }

  // --- DAY ADVANCE & RATION DEPLETION (SAFE FUNCTIONAL UPDATER) ---
  const handleAdvanceCampaignDay = (
    newDay?: number | ((prev: number) => number)
  ) => {
    setCurrentDay((prevDay) => {
      let resolvedTarget: number
      if (typeof newDay === "function") {
        resolvedTarget = newDay(prevDay)
      } else if (typeof newDay === "number") {
        resolvedTarget = newDay
      } else {
        resolvedTarget = prevDay + 1
      }

      const daysPassed = Math.max(0, resolvedTarget - prevDay)
      if (daysPassed > 0) {
        const dailyDepletion = manifest.length * daysPassed
        setCargoRations((prevRations) => Math.max(0, prevRations - dailyDepletion))
      }

      return resolvedTarget
    })
  }

  // --- DYNAMIC ASTROGATION CHART SYNC STATUS ---
  const astrogationAdvantage: "advantage" | "disadvantage" | "normal" = useMemo(() => {
    const daysSinceSync = Math.max(0, currentDay - lastAstrogationDay)
    if (daysSinceSync < 1) return "advantage"
    if (daysSinceSync >= 7) return "disadvantage"
    return "normal"
  }, [currentDay, lastAstrogationDay])

  // --- PERSISTENT VESSEL GALACTIC LOCATION ---
  const [currentLocationPlanet, setCurrentLocationPlanet] = useState<string>("Corellia")
  const [targetDestinationPlanet, setTargetDestinationPlanet] = useState<string>("")

  // --- ELEVATED SYSTEM DAMAGE LEVEL (0-6) & SLOWED STATUS ---
  const [systemDamageLevel, setSystemDamageLevel] = useState<number>(0)

  // --- ELEVATED ACTIVE SHIP STATUSES (PERSISTS ACROSS STATIONS) ---
  const [shipStatuses, setShipStatuses] = useState<ActiveStatus[]>([])

  // --- PERSISTENT LEVEL 5 USED CONDITION ---
  const [isUsedCondition, setIsUsedCondition] = useState<boolean>(false)

  // Status handlers
  const handleAddStatus = (newStatus: ActiveStatus) => {
    setShipStatuses((prev) => [...prev, newStatus])
  }

  const handleRemoveStatus = (statusId: string) => {
    setShipStatuses((prev) => prev.filter((s) => s.id !== statusId))
  }

  // Robust helper to check statuses by substring matching both id and title
  const hasStatus = (key: string) =>
    shipStatuses.some(
      (s) =>
        s.id?.toLowerCase().includes(key.toLowerCase()) ||
        s.title?.toLowerCase().includes(key.toLowerCase())
    )

  const isBlinded = hasStatus("blinded")
  const isDisabled = hasStatus("disabled")
  const isIonized = hasStatus("ionized")
  const isInvisible = hasStatus("invisible")
  const isStunned = hasStatus("stunned")
  const isTractored = hasStatus("tractored")
  const isStalled = hasStatus("stalled")
  const isUsedStatus = hasStatus("used")

  // Compound Used Condition Check
  const effectiveIsUsed = isUsedCondition || isUsedStatus || systemDamageLevel >= 5

  useEffect(() => {
    if (effectiveIsUsed && !isUsedCondition) {
      setIsUsedCondition(true)
    }
  }, [effectiveIsUsed, isUsedCondition])

  const handleUpdateUsedConditionBridge = (used: boolean) => {
    setIsUsedCondition(used)
    if (!used) {
      setShipStatuses((prev) =>
        prev.filter(
          (s) =>
            !s.id?.toLowerCase().includes("used") &&
            !s.title?.toLowerCase().includes("used")
        )
      )
    } else {
      if (!hasStatus("used")) {
        handleAddStatus({
          id: `used-${Date.now()}`,
          title: "USED",
          effect: "A used starship's value is reduced by half. When a deployed crew member on a used starship rolls a 1 on an ability check, attack roll, or saving throw, they must make a destruction saving throw. If the roll is 10 or higher, they succeed. On a failure, the ship suffers 1 level of system damage.",
          duration: "Until Overhauled",
        })
      }
    }
  }

  // Compound Slowed Calculation
  const effectiveSlowedLevel = useMemo(() => {
    let baseSlow = 0
    if (isDisabled || isStunned || isTractored || isStalled) {
      baseSlow = 4
    }

    const manualSlows = shipStatuses
      .filter((s) => s.title.toLowerCase().includes("slowed") || (s.id && s.id.toLowerCase().includes("slowed")))
      .map((s) => s.level ?? 0)
      
    const maxManualSlow = manualSlows.length > 0 ? Math.max(...manualSlows) : 0
    const combinedSlow = Math.max(baseSlow, maxManualSlow)
    const systemDamageSlow = systemDamageLevel >= 2 ? 1 : 0
    
    return Math.min(4, combinedSlow + systemDamageSlow)
  }, [isDisabled, isStunned, isTractored, isStalled, shipStatuses, systemDamageLevel])

  const isLevel6Blackout = systemDamageLevel >= 6

  const [spentHullDice, setSpentHullDice] = useState<number>(0)
  const [spentShieldDice, setSpentShieldDice] = useState<number>(0)
  const [pendingTier, setPendingTier] = useState<number | null>(null)

  const [pinpointStrikesUsed, setPinpointStrikesUsed] = useState<number>(0)
  const [versatileSnubfighterUsed, setVersatileSnubfighterUsed] = useState<number>(0)

  // --- MEDIUM SHIP TIER CHARGE TRACKERS ---
  const [evasiveManeuversUsed, setEvasiveManeuversUsed] = useState<number>(0)
  const [versatileStarshipUsed, setVersatileStarshipUsed] = useState<number>(0)
  const [adaptiveArmorUsed, setAdaptiveArmorUsed] = useState<number>(0)
  const [bestShipInVerseUsed, setBestShipInVerseUsed] = useState<boolean>(false)

  // --- S-FOILS STANCE (ENGINES & WEAPONS SYNC) ---
  const [sFoilsMode, setSFoilsMode] = useState<"locked" | "unlocked">("unlocked")

  // --- ELEVATED ENGINEERING BOOST & SURGE STATES ---
  const [engineSpeedBoostTurns, setEngineSpeedBoostTurns] = useState<number>(0)
  const [shieldBoostTurns, setShieldBoostTurns] = useState<number>(0)
  const [boostActionUsed, setBoostActionUsed] = useState<boolean>(false)
  const [selectedBoostType, setSelectedBoostType] = useState<"engines" | "shields" | "weapons" | null>(null)
  const [boostFeedback, setBoostFeedback] = useState<string | null>(null)

  const [standingByUsed, setStandingByUsed] = useState<boolean>(false)
  const [leafOnTheWindUsed, setLeafOnTheWindUsed] = useState<boolean>(false)

  const [ordnanceList, setOrdnanceList] = useState<OrdnanceItem[]>(() =>
    STARSHIP_AMMUNITION.map((ammo) => ({
      id: ammo.id,
      name: ammo.name,
      category: ammo.launcherFamily,
      currentReserve: ammo.name.toLowerCase().includes("concussion missile") ? 6 : ammo.name.toLowerCase().includes("proton torpedo") ? 4 : 0,
      costPerUnit: ammo.cost,
      damage: ammo.standardDamage,
      damageType: ammo.damageType,
      requisitionQty: 0,
    }))
  )

  const pendingOrdnanceCost = useMemo(() => {
    return ordnanceList.reduce((acc, it) => acc + it.requisitionQty * it.costPerUnit, 0)
  }, [ordnanceList])

  const pendingOrdnanceItems = useMemo(() => {
    return ordnanceList
      .filter((it) => it.requisitionQty > 0)
      .map((it) => ({
        name: it.name,
        qty: it.requisitionQty,
        cost: it.requisitionQty * it.costPerUnit,
      }))
  }, [ordnanceList])

  const [shipConfig, setShipConfig] = useState<ShipConfig>({
    name: "Queens Revenge",
    manufacturer: "Nubia Star Drives",
    model: "J-type Diplomatic (Medium)",
    size: "Medium",
    shipType: "Yacht",
    tier: 0,
    proficiencyBonus: 2,
    shipCost: 75000,
    paidAmount: 75000,
    reactorType: "Fuel Cell Reactor",
    powerCoupling: "Distributed Power Coupling",
    armorType: "Lightweight Armor", 
    shieldType: "Directional Shields",
    roleSpecialization: null,
    roleMastery: null,
    extraSuiteCapacity: 0,
    stats: {
      strength: 10,
      dexterity: 14,
      constitution: 13,
      intelligence: 8,
      wisdom: 12,
      charisma: 15,
    },
    tierStatBoosts: {
      strength: 0,
      dexterity: 0,
      constitution: 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0,
    },
    tierRolls: {},
    saveProficiencies: {
      strength: false,
      dexterity: true,
      constitution: false,
      intelligence: false,
      wisdom: false,
      charisma: true,
    },
    skillTiers: {
      boost: "none",
      ram: "none",
      hide: "none",
      maneuver: "none",
      patch: "none",
      regulation: "none",
      astrogation: "none",
      data: "none",
      probe: "none",
      scan: "none",
      impress: "none",
      interfere: "none",
      menace: "none",
      swindle: "none",
    },
    baseHull: 33,
    baseShields: 28,
    maxShields: 28,
    maxPowerDice: 4,
    powerDieType: "d1",
    recoveryRate: 1,
    skills: {
      boost: 0,
      ram: 0,
      hide: 2,
      maneuver: 2,
      patch: 1,
      regulation: 1,
      astrogation: -1,
      data: -1,
      probe: -1,
      scan: 1,
      impress: 3,
      interfere: 3,
      menace: 3,
      swindle: 3,
    },
    savingThrows: {
      strength: 0,
      dexterity: 2,
      constitution: 3,
      intelligence: -1,
      wisdom: 1,
      charisma: 3,
    },
  })

  const [installedMods, setInstalledMods] = useState<Modification[]>([
    { ...MASTER_MODIFICATIONS[0], instanceId: "seed-fixed-hardpoint-1", location: "Bow" }
  ])

  const [installedSuites, setInstalledSuites] = useState<InstalledSuite[]>([])

  const activeSizeKey = ((shipConfig.size as string)?.toLowerCase() ?? "small") as ShipSize
  const activeSizeRules = SHIP_SIZE_RULES[activeSizeKey] || SHIP_SIZE_RULES.small
  const activeTypeRules = SHIP_TYPE_RULES[shipConfig.shipType] || null

  const shipModifiers = useMemo(() => {
    return computeShipModifiers({
      shipTier: shipConfig.tier ?? 0,
      shipSize: activeSizeKey,
      installedMods,
      installedSuites,
      sFoilsMode,
      roleSpecialization: shipConfig.roleSpecialization,
      roleMastery: shipConfig.roleMastery,
    })
  }, [shipConfig.tier, activeSizeKey, installedMods, installedSuites, sFoilsMode, shipConfig.roleSpecialization, shipConfig.roleMastery])

  const effectiveStats = useMemo(() => {
    return {
      strength: shipConfig.stats.strength + (shipConfig.tierStatBoosts?.strength || 0) + (activeTypeRules?.strengthMod || 0) + shipModifiers.statDeltas.strength,
      dexterity: shipConfig.stats.dexterity + (shipConfig.tierStatBoosts?.dexterity || 0) + (activeSizeRules.dexterityMod || 0) + (activeTypeRules?.dexterityMod || 0) + shipModifiers.statDeltas.dexterity,
      constitution: shipConfig.stats.constitution + (shipConfig.tierStatBoosts?.constitution || 0) + (activeSizeRules.constitutionMod || 0) + (activeTypeRules?.constitutionMod || 0) + shipModifiers.statDeltas.constitution,
      intelligence: shipConfig.stats.intelligence + (shipConfig.tierStatBoosts?.intelligence || 0) + (activeTypeRules?.intelligenceMod || 0) + shipModifiers.statDeltas.intelligence,
      wisdom: shipConfig.stats.wisdom + (shipConfig.tierStatBoosts?.wisdom || 0) + (activeTypeRules?.wisdomMod || 0) + shipModifiers.statDeltas.wisdom,
      charisma: shipConfig.stats.charisma + (shipConfig.tierStatBoosts?.charisma || 0) + (activeTypeRules?.charismaMod || 0) + shipModifiers.statDeltas.charisma,
    }
  }, [shipConfig.stats, shipConfig.tierStatBoosts, activeSizeRules, activeTypeRules, shipModifiers.statDeltas])

  const effectiveSavingThrows = useMemo(() => {
    const keys = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const
    const newThrows: Record<string, number> = {}

    const isMedium = activeSizeKey === "medium"
    const isNimble = isMedium && (shipConfig.tier ?? 0) >= 2
    const halfDexMod = Math.max(1, Math.floor(getRawModifier(effectiveStats.dexterity) / 2))

    keys.forEach((key) => {
      let rawMod = getRawModifier(effectiveStats[key])
      const isProficient = shipConfig.saveProficiencies?.[key] || shipModifiers.savingThrowProficiencies.has(key)
      
      if (isNimble && key !== "dexterity") {
        rawMod += halfDexMod
      }

      newThrows[key] = rawMod + (isProficient ? shipConfig.proficiencyBonus : 0)
    })
    return newThrows as ShipConfig["savingThrows"]
  }, [effectiveStats, shipConfig.saveProficiencies, shipConfig.proficiencyBonus, shipModifiers.savingThrowProficiencies, activeSizeKey, shipConfig.tier])

  const effectiveSkills = useMemo(() => {
    const calculated: Record<string, number> = {}
    Object.entries(shipConfig.skillTiers).forEach(([skillName, tier]) => {
      const governingStat = Object.entries(STAT_SKILLS_MAP).find(([_, skills]) => (skills as readonly string[]).includes(skillName))?.[0] as keyof ShipConfig["stats"] | undefined
      const statScore = governingStat ? effectiveStats[governingStat] : 8
      let baseMod = getRawModifier(statScore)

      if (shipConfig.roleSpecialization === "Scout" && (skillName === "scan" || skillName === "probe")) {
        baseMod += 1
      }

      if (shipConfig.roleMastery === "Scout" && skillName === "astrogation") {
        baseMod += 2
      }

      if (shipConfig.roleMastery === "Scrambler" && skillName === "interfere") {
        baseMod += 2
      }

      const capitalizedSkill = skillName.charAt(0).toUpperCase() + skillName.slice(1)
      if (shipModifiers.skillFlatBonuses[capitalizedSkill]) {
        baseMod += shipModifiers.skillFlatBonuses[capitalizedSkill]
      }

      const pb = shipConfig.proficiencyBonus
      let effectiveTier = tier
      if (shipModifiers.skillProficiencies[capitalizedSkill]) {
        effectiveTier = shipModifiers.skillProficiencies[capitalizedSkill]
      }

      let bonusMultiplier = 0
      if (effectiveTier === "proficient") bonusMultiplier = 1
      else if (["expert", "mastery", "high-mastery", "grand-mastery"].includes(effectiveTier as string)) bonusMultiplier = 2
      calculated[skillName] = baseMod + (bonusMultiplier * pb)
    })
    return calculated
  }, [shipConfig.skillTiers, shipConfig.roleSpecialization, shipConfig.roleMastery, effectiveStats, shipConfig.proficiencyBonus, shipModifiers])

  const effectiveShipConfig = useMemo(() => {
    const dexMod = getRawModifier(effectiveStats.dexterity)
    let calculatedAC = 10 + dexMod

    if (shipModifiers.armorClassOverride !== undefined) {
      if (shipModifiers.armorClassOverride >= 17) {
        calculatedAC = shipModifiers.armorClassOverride
      } else if (shipModifiers.armorClassOverride >= 14) {
        calculatedAC = shipModifiers.armorClassOverride + Math.min(dexMod, 2)
      } else {
        calculatedAC = shipModifiers.armorClassOverride + dexMod
      }
    }
    calculatedAC += shipModifiers.armorClassBonus

    const baseModCapacity = 30
    const finalModCapacity = baseModCapacity + shipModifiers.maxModSlotsBonus
    const calculatedMaxFuel = Math.round(30 * shipModifiers.baseFuelMultiplier)

    const baseCargoInput = shipModifiers.baseCargoOverride ?? (shipConfig.cargoCapacity ?? 25)
    const finalCargoCap = Math.round(baseCargoInput * (1 + shipModifiers.cargoBonusMultiplier))

    return {
      ...shipConfig,
      stats: effectiveStats,
      savingThrows: effectiveSavingThrows,
      skills: effectiveSkills,
      armorClass: calculatedAC,
      modSlots: finalModCapacity,
      fuelCapacity: calculatedMaxFuel,
      cargoCapacity: finalCargoCap,
      damageResistances: shipModifiers.damageResistances,
      systemDamageLevel,
      effectiveSlowedLevel,
      isIonized,
      isStalled,
      isStunned,
      isUsed: effectiveIsUsed,
      shipStatuses,
    }
  }, [shipConfig, effectiveStats, effectiveSavingThrows, effectiveSkills, shipModifiers, systemDamageLevel, effectiveSlowedLevel, isIonized, isStalled, isStunned, effectiveIsUsed, shipStatuses])

  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "tx-initial",
      date: `Day ${currentDay}`,
      description: "Initial Ship Account Balance & Baseline Registry",
      amount: 2500000,
      category: "Income",
      type: "credit",
    }
  ])

  const totalMaxShields = shipConfig.maxShields + installedMods.reduce((sum, mod) => sum + ((mod as any).shieldBonus || 0), 0)
  const totalMaxHull = shipConfig.baseHull + installedMods.reduce((sum, mod) => sum + ((mod as any).hullBonus || 0), 0)

  const [shieldState, setShieldState] = useState({ 
    current: shipConfig.maxShields, 
    max: shipConfig.maxShields,
    temp: 0,
  })
  const [hullState, setHullState] = useState({ current: shipConfig.baseHull, max: shipConfig.baseHull })

  const totalShields = {
    current: Math.min(shieldState.current, totalMaxShields),
    max: totalMaxShields,
    temp: shieldState.temp,
  }

  const totalHull = {
    current: Math.min(hullState.current, totalMaxHull),
    max: totalMaxHull,
  }

  const setTotalShields = (
    update: 
      | { current: number; max: number; temp?: number } 
      | ((prev: { current: number; max: number; temp: number }) => { current: number; max: number; temp?: number })
  ) => {
    queueMicrotask(() => {
      if (typeof update === "function") {
        setShieldState(prev => {
          const res = update({ current: prev.current, max: totalMaxShields, temp: prev.temp })
          return { 
            current: res.current, 
            max: totalMaxShields, 
            temp: res.temp !== undefined ? res.temp : prev.temp 
          }
        })
      } else {
        setShieldState(prev => ({ 
          current: update.current, 
          max: totalMaxShields, 
          temp: update.temp !== undefined ? update.temp : prev.temp 
        }))
      }
    })
  }

  const setTotalHull = (update: { current: number; max: number } | ((prev: { current: number; max: number }) => { current: number; max: number })) => {
    queueMicrotask(() => {
      if (typeof update === "function") {
        setHullState(prev => update({ current: prev.current, max: totalMaxHull }))
      } else {
        setHullState({ current: update.current, max: totalMaxHull })
      }
    })
  }

  const [availablePowerDice, setAvailablePowerDice] = useState<number>(shipConfig.maxPowerDice)

  const [stationPools, setStationPools] = useState<Record<string, number>>({
    engines: 1,
    communications: 1,
    weapons: 1,
    sensors: 1,
    defense: 1,
  })

  const [sharedPoolDice, setSharedPoolDice] = useState<number>(2)

  const [sensorContacts, setSensorContacts] = useState<SensorContact[]>([
    {
      id: "1",
      name: "Derelict Cargo Pod",
      classification: "Debris",
      distance: "14,200 km",
      scanDc: 10,
      isRevealed: false,
      gmNotes: "Contains 2 units of scrap metal and a cracked navigation log."
    }
  ])

  const handleAddTransaction = (newTx: Omit<Transaction, "id">) => {
    const txWithId = { ...newTx, id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` }
    setTransactions(prev => [txWithId, ...prev])
  }

  const handleCompleteOrCancelJourney = (arrivedAtDestination?: boolean) => {
    if (activeJourney) {
      if (arrivedAtDestination) {
        setCurrentLocationPlanet(activeJourney.destination)
        setTargetDestinationPlanet("")
      }
    }
    setActiveJourney(null)
  }

  const handleEmergencyDropOut = (dropoutRegion: string) => {
    const deepSpaceName = `Deep Space (${dropoutRegion})`
    setCurrentLocationPlanet(deepSpaceName)
    setTargetDestinationPlanet("")
    setActiveJourney(null)
  }

  const handleFullShipReset = (startingDay: number, startingFunds: number) => {
    setShipConfig({
      name: "",
      manufacturer: "",
      model: "",
      size: "Small",
      shipType: "Freighter",
      tier: 0,
      proficiencyBonus: 2,
      shipCost: 0,
      paidAmount: 0,
      powerCoupling: "Direct Power Coupling",
      armorType: "Lightweight Armor",                  
      baseHull: 40,
      baseShields: 24,
      maxShields: 24,
      maxPowerDice: 4,
      powerDieType: "d1",
      recoveryRate: 1,
      roleSpecialization: null,
      roleMastery: null,
      extraSuiteCapacity: 0,
      tierStatBoosts: { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 },
      tierAsiHistory: {},
      tierRolls: {},
      stats: { strength: 10, dexterity: 14, constitution: 13, intelligence: 15, wisdom: 12, charisma: 8 },
      saveProficiencies: { strength: false, dexterity: true, constitution: true, intelligence: false, wisdom: false, charisma: false },
      skillTiers: { boost: "none", ram: "none", hide: "none", maneuver: "none", patch: "none", regulation: "none", astrogation: "none", data: "none", probe: "none", scan: "none", impress: "none", interfere: "none", menace: "none", swindle: "none" },
      skills: { boost: 0, ram: 0, hide: 0, maneuver: 0, patch: 0, regulation: 0, astrogation: 0, data: 0, probe: 0, scan: 0, impress: 0, interfere: 0, menace: 0, swindle: 0 },
      savingThrows: { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 },
    } as any)

    setCurrentDay(startingDay)
    setLastAstrogationDay(startingDay)
    setCargoRations(60)
    setManifest([])
    setTacticalMovement({ spentFeet: 0 })
    setActiveJourney(null)
    setCurrentLocationPlanet("Corellia")
    setTargetDestinationPlanet("")
    setSystemDamageLevel(0)
    setShipStatuses([])
    setIsUsedCondition(false)
    setSpentHullDice(0)
    setSpentShieldDice(0)
    setPinpointStrikesUsed(0)
    setVersatileSnubfighterUsed(0)
    setEvasiveManeuversUsed(0)
    setVersatileStarshipUsed(0)
    setAdaptiveArmorUsed(0)
    setBestShipInVerseUsed(false)
    setEngineSpeedBoostTurns(0)
    setShieldBoostTurns(0)
    setBoostActionUsed(false)
    setSelectedBoostType(null)
    setBoostFeedback(null)
    setStandingByUsed(false)
    setLeafOnTheWindUsed(false)
    setSFoilsMode("unlocked")
    setCurrentFuel(maxFuel)
    setHullState({ current: 40, max: 40 })
    setShieldState({ current: 24, max: 24, temp: 0 })
    setAvailablePowerDice(4)
    setSharedPoolDice(2)
    setStationPools({ engines: 1, communications: 1, weapons: 1, sensors: 1, defense: 1 })

    setOrdnanceList(
      STARSHIP_AMMUNITION.map((ammo) => ({
        id: ammo.id,
        name: ammo.name,
        category: ammo.launcherFamily,
        currentReserve: ammo.name.toLowerCase().includes("concussion missile") ? 6 : ammo.name.toLowerCase().includes("proton torpedo") ? 4 : 0,
        costPerUnit: ammo.cost,
        damage: ammo.standardDamage,
        damageType: ammo.damageType,
        requisitionQty: 0,
      }))
    )

    setTransactions([
      { id: `tx-reset-${Date.now()}`, date: `Day ${startingDay}`, description: "Initial Ship Account Balance", amount: startingFunds, category: "Income", type: "credit" }
    ])

    setInstalledMods([])
    setInstalledSuites([])
  }

  const handleInstallMod = (mod: Modification): boolean => {
    if (mod.name === "Fixed Hardpoint") {
      let maxHardpoints = 2 
      switch (shipConfig.size.toLowerCase()) {
        case "tiny":
        case "small":
          maxHardpoints = 1
          break
        case "medium":
          maxHardpoints = 2
          break
        case "large":
          maxHardpoints = 3
          break
        case "huge":
        case "gargantuan":
          maxHardpoints = 5
          break
        default:
          maxHardpoints = 2
      }

      const consumedHardpoints = installedMods.filter(m => m.name === "Fixed Hardpoint").length

      if (consumedHardpoints >= maxHardpoints) {
        alert(`Installation Failed: This ${shipConfig.size} frame supports a maximum of ${maxHardpoints} Fixed Hardpoints (${consumedHardpoints}/${maxHardpoints} in use).`)
        return false
      }
    }

    setInstalledMods(prev => [...prev, mod])
    
    handleAddTransaction({
      date: `Day ${currentDay}`,
      description: `Installed Modification: ${mod.name} (${mod.station})`,
      category: "Refit",
      amount: mod.cost,
      type: "debit",
    })

    return true
  }

  const handleRemoveMod = (instanceId: string) => {
    const targetMod = installedMods.find(m => m.instanceId === instanceId)
    setInstalledMods(prev => {
      const toRemove = new Set<string>([instanceId])
      let changed = true
      while (changed) {
        changed = false
        for (const m of prev) {
          if (m.instanceId && m.mountedOnInstanceId && toRemove.has(m.mountedOnInstanceId) && !toRemove.has(m.instanceId)) {
            toRemove.add(m.instanceId)
            changed = true
          }
        }
      }
      return prev.filter(m => !m.instanceId || !toRemove.has(m.instanceId))
    })

    if (targetMod) {
      handleAddTransaction({
        date: `Day ${currentDay}`,
        description: `Refund / Uninstalled Modification: ${targetMod.name}`,
        category: "Refit",
        amount: Math.round(targetMod.cost * 0.5),
        type: "credit",
      })
    }
  }

  const handleUpdateSuites = (newSuites: InstalledSuite[]) => {
    if (newSuites.length > installedSuites.length) {
      const addedSuite = newSuites.find(s => !installedSuites.some(existing => existing.id === s.id))
      if (addedSuite && addedSuite.cost > 0) {
        handleAddTransaction({
          date: `Day ${currentDay}`,
          description: `Installed Vessel Suite: ${addedSuite.name}`,
          category: "Refit",
          amount: addedSuite.cost,
          type: "debit",
        })
      } else if (addedSuite && addedSuite.cost === 0) {
        handleAddTransaction({
          date: `Day ${currentDay}`,
          description: `Installed Vessel Suite: ${addedSuite.name} (Free Role Allocation Claim)`,
          category: "Refit",
          amount: 0,
          type: "credit",
        })
      }
    }

    setInstalledSuites(newSuites)
  }

  const handleSaveShipConfig = (newConfig: ShipConfig) => {
    setShipConfig(newConfig)
    setHullState(prev => ({ current: Math.min(prev.current, newConfig.baseHull), max: newConfig.baseHull }))
    setShieldState(prev => ({ current: Math.min(prev.current, newConfig.maxShields), max: newConfig.maxShields, temp: prev.temp }))
    setAvailablePowerDice(prev => Math.min(prev, newConfig.maxPowerDice))
    setPendingTier(null)
  }

  const handleAddContact = (newContact: Omit<SensorContact, "id">) => {
    const contactWithId = { ...newContact, id: Date.now().toString() }
    setSensorContacts(prev => [...prev, contactWithId])
  }

  const handleRemoveContact = (id: string) => {
    setSensorContacts(prev => prev.filter(c => c.id !== id))
  }

  const handleToggleReveal = (id: string) => {
    setSensorContacts(prev => prev.map(c => c.id === id ? { ...c, isRevealed: !c.isRevealed } : c))
  }

  const handleUpdateContact = (id: string, updates: Partial<SensorContact>) => {
    setSensorContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  // --- CYCLE REACTOR (ROUND RESET + MOVEMENT/TURN RESETS) ---
  const handleCycleReactor = (generatedAmount?: number) => {
    const amountToAdd = generatedAmount !== undefined ? generatedAmount : shipConfig.recoveryRate
    if (availablePowerDice < shipConfig.maxPowerDice) {
      setAvailablePowerDice(prev => Math.min(shipConfig.maxPowerDice, prev + amountToAdd))
    }

    // Reset combat actions and split movement
    setManifest(prev => prev.map(m => ({ ...m, hasTakenTurnThisRound: false })))
    setTacticalMovement({ spentFeet: 0 })

    setBoostActionUsed(false)
    setSelectedBoostType(null)
    setBoostFeedback(null)

    setEngineSpeedBoostTurns((prev) => Math.max(0, prev - 1))

    setShieldBoostTurns((prev) => {
      const next = Math.max(0, prev - 1)
      if (prev === 1 && next === 0) {
        setTotalShields((s) => ({ ...s, temp: 0 }))
      }
      return next
    })
  }

  const handleConsumePowerDice = (amount: number = 1) => {
    if (availablePowerDice >= amount) {
      setAvailablePowerDice(prev => Math.max(0, prev - amount))
      return true
    }
    return false
  }

  const handleConsumeStationPower = (stationKey: string, amount: number = 1) => {
    const coupling = shipConfig?.powerCoupling ?? "Direct Power Coupling"
    const isHubAndSpoke = coupling === "Hub and Spoke Coupling"

    if ((stationPools[stationKey] ?? 0) >= amount) {
      setStationPools(prev => ({ ...prev, [stationKey]: Math.max(0, prev[stationKey] - amount) }))
      return true
    }

    if (isHubAndSpoke && sharedPoolDice >= amount) {
      setSharedPoolDice(prev => Math.max(0, prev - amount))
      return true
    }

    return handleConsumePowerDice(amount)
  }

  const handleApplyFullRecharge = (payload: RechargeResultPayload) => {
    setTotalHull({ current: Math.min(totalMaxHull, payload.newHull), max: totalMaxHull })
    setTotalShields({ current: totalMaxShields, max: totalMaxShields, temp: 0 })
    setSpentHullDice(payload.newHullDiceSpent)
    setSpentShieldDice(payload.newShieldDiceSpent)

    const coupling = shipConfig?.powerCoupling ?? "Direct Power Coupling"
    const isHubAndSpoke = coupling.toLowerCase().includes("hub") || coupling.toLowerCase().includes("spoke")
    const maxSharedPool = isHubAndSpoke ? 2 : shipConfig.maxPowerDice

    setAvailablePowerDice(shipConfig.maxPowerDice)
    if (isHubAndSpoke) {
      setSharedPoolDice(maxSharedPool)
    }

    setPinpointStrikesUsed(0)
    setEngineSpeedBoostTurns(0)
    setShieldBoostTurns(0)
    setBoostActionUsed(false)
    setSelectedBoostType(null)
    setBoostFeedback(null)

    setStandingByUsed(false)
    setLeafOnTheWindUsed(false)
    setBestShipInVerseUsed(false)

    handleAddTransaction({
      date: `Day ${currentDay}`,
      description: `Ship Recharge Conducted (Hull: ${payload.newHull}/${totalMaxHull} HP, Shields: 100%, Systems Refreshed, Standing By Surge Restored)`,
      category: "Operations",
      amount: 0,
      type: "credit",
    })
  }

  const damageReduction = shipConfig.armorType === "Reinforced Armor" ? 6 : shipConfig.armorType === "Deflection Armor" ? 3 : 0

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 p-3 sm:p-4 lg:p-6">
      <HeaderBar
        shipName={shipConfig.name} 
        shipModel={shipConfig.model || (shipConfig as any).shipClass || (shipConfig as any).class || (shipConfig as any).type}
        currentDay={currentDay} 
        activeJourney={activeJourney} 
        totalShields={totalShields}
        totalHull={totalHull}
        systemDamageLevel={systemDamageLevel}
        shipStatuses={shipStatuses}
        isUsedCondition={effectiveIsUsed}
      />
      <div className="flex flex-1 flex-col gap-4 lg:flex-row">
        <StationSidebar
          active={active}
          onSelect={setActive}
          isBlackout={isLevel6Blackout}
          manifest={manifest}
        />
        <main className="min-w-0 flex-1 relative">
          
          {/* LEVEL 6 EMERGENCY BLACKOUT OVERLAY */}
          {isLevel6Blackout && active !== "GM Station" ? (
            <div className="flex min-h-[500px] flex-col items-center justify-center gap-4 rounded-md border-2 border-red-600 bg-black/95 p-6 text-center font-mono shadow-[0_0_50px_rgba(239,68,68,0.4)] animate-pulse">
              <AlertOctagon className="h-16 w-16 text-red-500 animate-bounce" />
              <h2 className="text-xl sm:text-2xl font-black text-red-400 tracking-[0.25em] uppercase">
                🚨 CATASTROPHIC SYSTEM FAILURE // ALL PRIMARY SYSTEMS OFFLINE
              </h2>
              <p className="max-w-md text-xs tracking-wider text-red-200 leading-relaxed">
                Total blackout condition. Auxiliary power grid severed. All stations are disabled. 
                Vessel is inoperable. Abandon ship protocol engaged.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setActive("GM Station")}
                  className="px-4 py-2.5 rounded border border-amber-400 bg-amber-500/20 text-xs font-bold text-amber-300 hover:bg-amber-500/30 uppercase tracking-widest cursor-pointer"
                >
                  Access GM Terminal Override
                </button>
                <button
                  type="button"
                  onClick={() => setSystemDamageLevel(5)}
                  className="px-4 py-2.5 rounded border border-red-500 bg-red-500/20 text-xs font-bold text-red-300 hover:bg-red-500/30 uppercase tracking-widest cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Auxiliary Reboot (Clear to Lvl 5)
                </button>
              </div>
            </div>
          ) : active === "Ship Setup" ? (
            <ShipSetup 
              initialConfig={shipConfig}
              currentDay={currentDay}
              onSaveConfig={handleSaveShipConfig}
              onFullReset={handleFullShipReset}
              externalPendingTier={pendingTier}
              onClearPendingTier={() => setPendingTier(null)}
            />
          ) : active === "Crew" ? (
            <CrewStation
              manifest={manifest}
              allMembers={manifest}
              onAddMember={handleAddMember}
              onRemoveMember={handleRemoveMember}
              onAssignLocation={handleAssignLocation}
              onToggleTurn={handleToggleTurnTaken}
              onUpdateInitiative={handleUpdateInitiative}
              cargoRations={cargoRations}
              installedMods={installedMods}
            />
          ) : active === "Weapons" ? (
            <WeaponsStation 
              availablePowerDice={stationPools["weapons"] ?? availablePowerDice}
              maxPowerDice={shipConfig.maxPowerDice}
              powerDieType={shipConfig.powerDieType}
              onConsumePowerDice={(amt) => handleConsumeStationPower("weapons", amt)}
              shipConfig={effectiveShipConfig}
              installedMods={installedMods}
              onRemoveMod={handleRemoveMod}
              stationPools={stationPools}
              onUpdateStationPools={setStationPools}
              sharedPoolDice={sharedPoolDice}
              onUpdateSharedPool={setSharedPoolDice}
              standingByUsed={standingByUsed}
              onUseStandingBy={() => setStandingByUsed(true)}
              leafOnTheWindUsed={leafOnTheWindUsed}
              onUseLeafOnTheWind={() => setLeafOnTheWindUsed(true)}
              versatileTransportUsed={versatileStarshipUsed}
              onUpdateVersatileTransportUsed={setVersatileStarshipUsed}
              bestShipInVerseUsed={bestShipInVerseUsed}
              onUpdateBestShipInVerseUsed={setBestShipInVerseUsed}
              ordnanceList={ordnanceList}
              onUpdateOrdnanceList={setOrdnanceList}
              sFoilsMode={sFoilsMode}
              systemDamageLevel={systemDamageLevel}
              shipStatuses={shipStatuses}
              manifest={manifest}
              onAssignCrew={handleAssignLocation}
              onToggleTurn={handleToggleTurnTaken}
            />
          ) : active === "Sensors" ? (
            <SensorsStation 
              availablePowerDice={stationPools["sensors"] ?? availablePowerDice}
              maxPowerDice={shipConfig.maxPowerDice}
              powerDieType={shipConfig.powerDieType}
              onConsumePowerDice={(amt) => handleConsumeStationPower("sensors", amt)}
              contacts={sensorContacts}
              onUpdateContact={handleUpdateContact}
              sensorSkillMod={effectiveSkills.scan ?? 0}
              probeSkillMod={effectiveSkills.probe ?? 0}
              dataSkillMod={effectiveSkills.data ?? 0}
              shipConfig={effectiveShipConfig}
              installedMods={installedMods}
              onRemoveMod={handleRemoveMod}
              stationPools={stationPools}
              onUpdateStationPools={setStationPools}
              sharedPoolDice={sharedPoolDice}
              onUpdateSharedPool={setSharedPoolDice}
              standingByUsed={standingByUsed}
              onUseStandingBy={() => setStandingByUsed(true)}
              leafOnTheWindUsed={leafOnTheWindUsed}
              onUseLeafOnTheWind={() => setLeafOnTheWindUsed(true)}
              versatileTransportUsed={versatileStarshipUsed}
              onUpdateVersatileTransportUsed={setVersatileStarshipUsed}
              bestShipInVerseUsed={bestShipInVerseUsed}
              onUpdateBestShipInVerseUsed={setBestShipInVerseUsed}
              onRemoveContact={handleRemoveContact}
              systemDamageLevel={systemDamageLevel}
              isBlinded={isBlinded}
              manifest={manifest}
              onAssignCrew={handleAssignLocation}
              onToggleTurn={handleToggleTurnTaken}
            />
          ) : active === "Defense" ? (
            <DefenseStation 
              availablePowerDice={stationPools["defense"] ?? availablePowerDice}
              maxPowerDice={shipConfig.maxPowerDice}
              powerDieType={shipConfig.powerDieType}
              damageReduction={damageReduction}
              onConsumePowerDice={(amt) => handleConsumeStationPower("defense", amt)}
              onHullChange={(current, max) => setTotalHull({ current, max })}
              onShieldChange={(current, max, temp) => setTotalShields({ current, max, temp })}
              shipConfig={effectiveShipConfig}
              spentHullDice={spentHullDice}
              onSpentHullDiceChange={setSpentHullDice}
              spentShieldDice={spentShieldDice}
              onSpentShieldDiceChange={setSpentShieldDice}
              installedMods={installedMods}
              onRemoveMod={handleRemoveMod}
              stationPools={stationPools}
              onUpdateStationPools={setStationPools}
              sharedPoolDice={sharedPoolDice}
              onUpdateSharedPool={setSharedPoolDice}
              currentShields={totalShields.current}
              maxShields={totalShields.max}
              tempShields={totalShields.temp}
              standingByUsed={standingByUsed}
              onUseStandingBy={() => setStandingByUsed(true)}
              systemDamageLevel={systemDamageLevel}
              onUpdateSystemDamageLevel={setSystemDamageLevel}
              statuses={shipStatuses}
              onAddStatus={handleAddStatus}
              onRemoveStatus={handleRemoveStatus}
              manifest={manifest}
              onAssignCrew={handleAssignLocation}
              onToggleTurn={handleToggleTurnTaken}
            />
          ) : active === "Engineering" ? (
            <EngineeringStation 
              maxPowerDice={shipConfig.maxPowerDice}
              availablePowerDice={availablePowerDice}
              powerDieType={shipConfig.powerDieType}
              recoveryRate={shipConfig.recoveryRate}
              onCycleReactor={handleCycleReactor}
              hullCurrent={totalHull.current}
              hullMax={totalHull.max}
              shieldCurrent={totalShields.current}
              shieldMax={totalShields.max}
              shieldTemp={totalShields.temp}
              onShieldChange={(current, max, temp) => setTotalShields({ current, max, temp })}
              spentShieldDice={spentShieldDice}
              onSpentShieldDiceChange={setSpentShieldDice}
              spentHullDice={spentHullDice}
              onSpentHullDiceChange={setSpentHullDice}
              onBoostSpeed={() => setEngineSpeedBoostTurns(2)}
              onBoostShields={(rolledTemp) => {
                setShieldBoostTurns(2)
                setTotalShields((prev) => ({
                  ...prev,
                  temp: (prev.temp || 0) + rolledTemp,
                }))
              }}
              boostActionUsed={boostActionUsed}
              onBoostActionUsedChange={setBoostActionUsed}
              selectedBoostType={selectedBoostType}
              onSelectedBoostTypeChange={setSelectedBoostType}
              boostFeedback={boostFeedback}
              onBoostFeedbackChange={setBoostFeedback}
              engineBoostTurnsRemaining={engineSpeedBoostTurns}
              shieldBoostTurnsRemaining={shieldBoostTurns}
              onPatchHull={(amount) => {
                setTotalHull((prev) => ({
                  current: Math.min(totalHull.max, prev.current + amount),
                  max: totalHull.max,
                }))
              }}
              onApplyFullRecharge={handleApplyFullRecharge}
              strengthMod={getRawModifier(effectiveStats.strength)}
              constitutionMod={getRawModifier(effectiveStats.constitution)}
              patchSkillMod={effectiveSkills.patch ?? 0}
              regulationSkillMod={effectiveSkills.regulation ?? 0}
              shipConfig={effectiveShipConfig}
              installedMods={installedMods}
              onRemoveMod={handleRemoveMod}
              stationPools={stationPools}
              onUpdateStationPools={setStationPools}
              sharedPoolDice={sharedPoolDice}
              onUpdateSharedPool={setSharedPoolDice}
              standingByUsed={standingByUsed}
              onUseStandingBy={() => setStandingByUsed(true)}
              leafOnTheWindUsed={leafOnTheWindUsed}
              onUseLeafOnTheWind={() => setLeafOnTheWindUsed(true)}
              versatileTransportUsed={versatileStarshipUsed}
              onUpdateVersatileTransportUsed={setVersatileStarshipUsed}
              bestShipInVerseUsed={bestShipInVerseUsed}
              onUpdateBestShipInVerseUsed={setBestShipInVerseUsed}
              manifest={manifest}
              onAssignCrew={handleAssignLocation}
              onToggleTurn={handleToggleTurnTaken}
            />
          ) : active === "Ship Modifications" ? (
            <ShipModifications 
              installedMods={installedMods}
              installedSuites={installedSuites}
              onInstallMod={handleInstallMod}
              onRemoveMod={handleRemoveMod}
              onUpdateSuites={handleUpdateSuites}
              shipConfig={effectiveShipConfig}
              maxMods={effectiveShipConfig.modSlots}
            />
          ) : active === "Cargo" ? (
            <CargoStation 
              installedMods={installedMods}
              installedSuites={installedSuites} 
              maxCapacityTons={effectiveShipConfig.cargoCapacity}
              cargoRations={cargoRations}
              onUpdateRations={setCargoRations}
              manifest={manifest}
              currentDay={currentDay}
            />
          ) : active === "Communications" ? (
            <CommunicationsStation 
              availablePowerDice={stationPools["communications"] ?? availablePowerDice}
              maxPowerDice={shipConfig.maxPowerDice}
              powerDieType={shipConfig.powerDieType}
              onConsumePowerDice={(amt) => handleConsumeStationPower("communications", amt)}
              impressMod={effectiveSkills.impress ?? 0}
              interfereMod={effectiveSkills.interfere ?? 0}
              menaceMod={effectiveSkills.menace ?? 0}
              swindleMod={effectiveSkills.swindle ?? 0}
              shipConfig={effectiveShipConfig}
              installedMods={installedMods}
              onRemoveMod={handleRemoveMod}
              stationPools={stationPools}
              onUpdateStationPools={setStationPools}
              sharedPoolDice={sharedPoolDice}
              onUpdateSharedPool={setSharedPoolDice}
              standingByUsed={standingByUsed}
              onUseStandingBy={() => setStandingByUsed(true)}
              leafOnTheWindUsed={leafOnTheWindUsed}
              onUseLeafOnTheWind={() => setLeafOnTheWindUsed(true)}
              versatileTransportUsed={versatileStarshipUsed}
              onUpdateVersatileTransportUsed={setVersatileStarshipUsed}
              bestShipInVerseUsed={bestShipInVerseUsed}
              onUpdateBestShipInVerseUsed={setBestShipInVerseUsed}
              systemDamageLevel={systemDamageLevel}
              isDisabled={isDisabled}
              manifest={manifest}
              onAssignCrew={handleAssignLocation}
              onToggleTurn={handleToggleTurnTaken}
            />
          ) : active === "Finance" ? (
            <FinanceStation 
              externalShipTier={shipConfig.tier}
              onUpgradePurchased={(newTier) => {
                setPendingTier(newTier)
                setActive("Ship Setup")
              }}
              onUpdateTier={(newTier) => {
                setShipConfig((prev) => ({
                  ...prev,
                  tier: newTier,
                }))
              }}
              onTierReverted={(targetTier) => {
                setShipConfig(prev => {
                  const updatedRolls = { ...prev.tierRolls }
                  for (let t = prev.tier; t > targetTier; t--) {
                    delete updatedRolls[t]
                  }
                  return {
                    ...prev,
                    tier: targetTier,
                    tierRolls: updatedRolls,
                    roleSpecialization: targetTier < 2 ? null : prev.roleSpecialization,
                    roleMastery: targetTier < 4 ? null : prev.roleMastery,
                    extraSuiteCapacity: targetTier < 2 ? 0 : prev.extraSuiteCapacity,
                  }
                })
              }}
              onPaymentSettlement={(chartsIncluded?: boolean, ordnanceIncluded?: boolean) => {
                setSpentHullDice(0) 
                setCurrentFuel(maxFuel)
                setVersatileSnubfighterUsed(0)
                setEvasiveManeuversUsed(0)
                setVersatileStarshipUsed(0)
                setAdaptiveArmorUsed(0)

                if (chartsIncluded !== false && externalPendingCharts > 0) {
                  setLastAstrogationDay(currentDay)
                } else if (chartsIncluded === true) {
                  setLastAstrogationDay(currentDay)
                }

                if (ordnanceIncluded) {
                  setOrdnanceList((prev) =>
                    prev.map((item) => ({
                      ...item,
                      currentReserve: item.currentReserve + item.requisitionQty,
                      requisitionQty: 0,
                    }))
                  )
                }
              }}
              transactions={transactions}
              onAddTransaction={handleAddTransaction}
              currentDay={currentDay}
              installedMods={installedMods}
              externalBaseShipCost={shipConfig.shipCost}
              externalShipCost={shipConfig.shipCost}
              externalPaidAmount={shipConfig.paidAmount}
              maxHullPoints={shipConfig.baseHull}
              spentHullDice={spentHullDice}
              shipSize={(shipConfig.size?.toLowerCase() as any) || "medium"}
              isUsedCondition={effectiveIsUsed}
              onUpdateUsedCondition={handleUpdateUsedConditionBridge}
              currentFuel={currentFuel}
              maxFuel={effectiveShipConfig.fuelCapacity}
              externalPendingCharts={externalPendingCharts}
              pendingOrdnanceCost={pendingOrdnanceCost}
              pendingOrdnanceItems={pendingOrdnanceItems}
              onRestockRations={(qty) => setCargoRations((prev) => prev + qty)}
            />
          ) : active === "Engines" ? (
            <EnginesStation 
              currentFuel={currentFuel}
              onFuelChange={setCurrentFuel}
              maxFuel={effectiveShipConfig.fuelCapacity}              
              currentDay={currentDay}
              onUpdateDay={handleAdvanceCampaignDay}
              lastAstrogationSyncDay={lastAstrogationDay}
              activeJourney={activeJourney}
              availablePowerDice={stationPools["engines"] ?? availablePowerDice}
              maxPowerDice={shipConfig.maxPowerDice}
              powerDieType={shipConfig.powerDieType}
              onConsumePowerDice={(amt) => handleConsumeStationPower("engines", amt)}
              onNavigate={(station) => {
                if (station.toLowerCase() === "navcomputer") {
                  setActive("Navcomputer")
                }
              }}
              shipConfig={effectiveShipConfig} 
              installedMods={installedMods}
              onRemoveMod={handleRemoveMod}
              stationPools={stationPools}
              onUpdateStationPools={setStationPools}
              sharedPoolDice={sharedPoolDice}
              onUpdateSharedPool={setSharedPoolDice}
              pinpointStrikesUsed={pinpointStrikesUsed}
              onUpdatePinpointStrikesUsed={setPinpointStrikesUsed}
              versatileSnubfighterUsed={versatileSnubfighterUsed}
              onUpdateVersatileSnubfighterUsed={setVersatileSnubfighterUsed}
              evasiveManeuversUsed={evasiveManeuversUsed}
              onUpdateEvasiveManeuversUsed={setEvasiveManeuversUsed}
              adaptiveArmorUsed={adaptiveArmorUsed}
              onUpdateAdaptiveArmorUsed={setAdaptiveArmorUsed}
              onRecharge={() => {
                setPinpointStrikesUsed(0)
              }}
              isEngineBoosted={engineSpeedBoostTurns > 0}
              engineBoostTurnsRemaining={engineSpeedBoostTurns}
              standingByUsed={standingByUsed}
              onUseStandingBy={() => setStandingByUsed(true)}
              leafOnTheWindUsed={leafOnTheWindUsed}
              onUseLeafOnTheWind={() => setLeafOnTheWindUsed(true)}
              sFoilsMode={sFoilsMode}
              onToggleSFoils={setSFoilsMode}
              currentHull={totalHull.current}
              maxHull={totalHull.max}
              currentShields={totalShields.current}
              maxShields={totalShields.max}
              systemDamageLevel={systemDamageLevel}
              onUpdateSystemDamageLevel={setSystemDamageLevel}
              effectiveSlowedLevel={effectiveSlowedLevel}
              manifest={manifest}
              onAssignCrew={handleAssignLocation}
              onToggleTurn={handleToggleTurnTaken}
              tacticalMovement={tacticalMovement}
              onSpendMovement={handleSpendMovement}
              onResetMovement={handleResetMovement}
            />
          ) : active === "Navcomputer" ? (
            <NavcomputerStation
              astrogationAdvantage={astrogationAdvantage}
              astrogationSkillMod={effectiveSkills.astrogation ?? 0}
              currentDay={currentDay}
              lastAstrogationSyncDay={lastAstrogationDay}
              activeJourney={activeJourney}
              onStartJourney={(journey) => {
                setActiveJourney(journey)
                setTargetDestinationPlanet(journey.destination)
              }}
              onCancelJourney={() => handleCompleteOrCancelJourney(false)}
              onArriveAtDestination={() => handleCompleteOrCancelJourney(true)}
              onEmergencyDropOut={handleEmergencyDropOut}
              currentLocationPlanet={currentLocationPlanet}
              onUpdateCurrentLocationPlanet={setCurrentLocationPlanet}
              targetDestinationPlanet={targetDestinationPlanet}
              onUpdateTargetDestinationPlanet={setTargetDestinationPlanet}
              onBackToEngines={() => setActive("Engines")}
              installedMods={installedMods}
              onRemoveMod={handleRemoveMod}
            />
          ) : active === "GM Station" ? (
            <GmStation 
              contacts={sensorContacts}
              onAddContact={handleAddContact}
              onRemoveContact={handleRemoveContact}
              onToggleReveal={handleToggleReveal}
              shipStatuses={shipStatuses}
              manifest={manifest}
              onToggleTurn={handleToggleTurnTaken}
              onUpdateInitiative={handleUpdateInitiative}
              onCycleReactor={handleCycleReactor}
              installedMods={installedMods}
            />
          ) : active === "Codex" ? (
            <CodexStation />          
          ) : (
            <OfflineStation name={active} />
          )}
        </main>
      </div>
    </div>
  )
}

function OfflineStation({ name }: { name: Station }) {
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 rounded-md border border-bridge-border bg-bridge-panel text-center">
      <span
        className="h-10 w-10 animate-pulse rotate-45 border-2 border-cyan-neon/40"
        aria-hidden="true"
      />
      <p className="text-glow-cyan text-sm font-bold tracking-[0.2em] text-cyan-neon/80">
        {name.toUpperCase()} STATION
      </p>
      <p className="max-w-xs text-xs tracking-widest text-muted-foreground/60">
        CONSOLE STANDING BY — SELECT WEAPONS FOR ACTIVE TACTICAL FEED
      </p>
    </div>
  )
}