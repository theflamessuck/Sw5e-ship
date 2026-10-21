"use client"

import { useState, useEffect, useMemo } from "react"
import { CombatResources } from "./combat-resources"
import { StationModifications, type Modification } from "./ship-modifications"
import { ShipStats } from "./ship-stats"
import type { JourneyData } from "./navcomputer-station"
import type { ShipConfig } from "./ship-setup"
import type {
  ManifestMember,
  ShipCompartmentId,
  TacticalMovementState
} from "./bridge-dashboard"
import { getCrewRole } from "./bridge-dashboard"
import {
  Users,
  CheckCircle2,
  Clock,
  UserMinus,
  RotateCcw,
  Footprints,
  RotateCw,
  Compass,
  CalendarOff,
  FastForward,
  Flame,
  BookOpen,
  Lock,
  Unlock,
  X,
  Zap
} from "lucide-react"

type FlightEnvironment = "Space" | "Atmosphere" | "Underwater"
type TransponderMode = "PRIMARY" | "SECURE_BACKUP"

interface PilotAction {
  name: string
  description: string
  category: "Combat & Movement" | "Defense & Maneuvers" | "Utility"
}

const PILOT_ACTIONS: PilotAction[] = [
  {
    name: "Detect",
    category: "Utility",
    description: "When you take the Detect action, you devote your attention to finding something. Depending on the nature of your detection, the DM might have you make a Wisdom (Scan) check or an Intelligence (Probe) check."
  },
  {
    name: "Fire",
    category: "Combat & Movement",
    description: "(if applicable) The most common action to take in combat is the Fire action. With this action, you can make an attack (or attacks) with one ship weapon. See the 'Making an Attack' section for the rules that govern attacks. The Fire action may be taken multiple times on a ship’s turn, but normally only once per weapon. A crewmember Firing from the helm has disadvantage on attack rolls with primary and secondary weapons."
  },
  {
    name: "Attack Run",
    category: "Combat & Movement",
    description: "When you move at least 150 feet towards a target, you may declare an Attack Run as an action. You must have a clear path towards your target, and nothing should hinder your path (such as difficult terrain or obstacles). If you finish this movement within range of your target, you may follow it with one of these options:\n• Fire: Make a ship weapon attack from a forward-facing limited arc without normal disadvantage. Tertiary/quaternary weapons deal additional damage equal to distance divided by 50 (up to ship's Strength modifier, min 1).\n• Ram: Make a Ram attempt with advantage on Strength (Ram). Success deals additional damage equal to distance divided by 50 (up to ship's Constitution modifier, min +1).\n• Conceal: Make a Dexterity (Hide) check to conceal your ship following Chapter 7 hiding rules."
  },
  {
    name: "Dogfight",
    category: "Defense & Maneuvers",
    description: "When you engage a single enemy, you duck and weave, vying for a good shot while avoiding theirs. Choose a target and make an opposed Dexterity (Maneuvering) check. On success, the next attack made against your ship by that target suffers disadvantage, but you grant the next attack made against your ship by a different target advantage. Additionally, you can perform a primary or tertiary weapon attack from a forward-facing limited firing arc against that ship without normal disadvantage."
  },
  {
    name: "Evade",
    category: "Defense & Maneuvers",
    description: "When you take the Evade action, you focus entirely on avoiding attacks. Until the start of your next turn, any attack roll made against you has disadvantage if you can see the attacker on your instruments, and you make Dexterity Saving Throws with advantage. This action affects your entire ship: any ability check or attack made by your ship or anyone on it has disadvantage until the end of your ship's next turn. Ends if Incapacitated or speed drops to 0."
  },
  {
    name: "Fly",
    category: "Combat & Movement",
    description: "When you take the Fly action, you gain extra Movement for the current turn equal to your speed after modifiers (e.g., 300 ft speed becomes 600 ft movement). Any increase or decrease to speed changes this additional movement by the same amount. Affects your ship's ability to stay on target: any ability check or attack made by your ship or anyone on it has disadvantage until the end of your ship's next turn."
  },
  {
    name: "Harass",
    category: "Combat & Movement",
    description: "You can harass an enemy and lock them into close-combat maneuvers to prevent escape. Make an opposed Dexterity (Maneuvering) check against a target within one size category of you and within normal range of at least one forward-facing primary weapon (which cannot be Fired this turn). On a success, if the target voluntarily leaves its square before your next turn, it takes damage as though it suffered a critical hit with the primary weapon used to harass."
  },
  {
    name: "Hard Turn",
    category: "Defense & Maneuvers",
    description: "When you take the Hard Turn action, you coax your ship into a tight maneuver, turning your ship 90 degrees without expending any of your flying speed."
  },
  {
    name: "Ram",
    category: "Combat & Movement",
    description: "You can attempt to ram another ship while flying through its space. Make a Strength (Ram) check opposed by the target's Dexterity (Maneuvering) check. On failure, the ram fails. On success, both you and the target take kinetic damage equal to two of your ship's Hull Dice + your ship's Strength modifier. If your ship has shield points remaining, your ship instead takes half this damage."
  },
  {
    name: "Retro Thrusters",
    category: "Defense & Maneuvers",
    description: "When an attacker that any crewmember can see deals damage to your ship with a weapon, they can use their reaction to immediately move the ship up to 50 feet in a direction of their choice, halving the damage your ship takes. The orientation of the ship does not change. Once this feature has been used, it can't be used again until the ship recharges."
  },
  {
    name: "Conceal",
    category: "Utility",
    description: "When you take the Conceal action, you make a Dexterity (Hide) check in an attempt to Conceal your ship, following the rules in chapter 7 for hiding. If you succeed, you gain certain benefits, as described in the 'Unseen Attackers and Targets' section."
  }
]

interface EnginesStationProps {
  currentDay?: number
  lastAstrogationSyncDay?: number
  onUpdateDay?: (day: number | ((prev: number) => number), consumeRations?: boolean) => void
  onNavigate?: (station: string) => void
  activeJourney?: (JourneyData & { startedOnDay?: number }) | null
  availablePowerDice?: number
  maxPowerDice?: number
  powerDieType?: string
  onConsumePowerDice?: (amount?: number) => boolean | void
  shipConfig?: ShipConfig
  proficiencyBonus?: number
  currentFuel?: number
  maxFuel?: number
  onFuelChange?: (fuel: number) => void
  installedMods?: Modification[]
  onRemoveMod?: (instanceId: string) => void
  stationPools?: Record<string, number>
  onUpdateStationPools?: React.Dispatch<React.SetStateAction<Record<string, number>>>
  sharedPoolDice?: number
  onUpdateSharedPool?: React.Dispatch<React.SetStateAction<number>>
  pinpointStrikesUsed?: number
  onUpdatePinpointStrikesUsed?: (count: number | ((prev: number) => number)) => void
  retroThrustersUsed?: boolean
  onUpdateRetroThrustersUsed?: (used: boolean | ((prev: boolean) => boolean)) => void
  versatileSnubfighterUsed?: number
  onUpdateVersatileSnubfighterUsed?: (count: number | ((prev: number) => number)) => void
  evasiveManeuversUsed?: number
  onUpdateEvasiveManeuversUsed?: (count: number | ((prev: number) => number)) => void
  adaptiveArmorUsed?: number
  onUpdateAdaptiveArmorUsed?: (count: number | ((prev: number) => number)) => void
  onRecharge?: () => void
  isEngineBoosted?: boolean
  engineBoostTurnsRemaining?: number
  standingByUsed?: boolean
  onUseStandingBy?: () => void
  leafOnTheWindUsed?: boolean
  onUseLeafOnTheWind?: () => void
  sFoilsMode?: "locked" | "unlocked"
  onToggleSFoils?: (mode: "locked" | "unlocked") => void
  currentHull?: number
  maxHull?: number
  currentShields?: number
  maxShields?: number
  systemDamageLevel?: number
  onUpdateSystemDamageLevel?: (level: number | ((prev: number) => number)) => void
  effectiveSlowedLevel?: number
  manifest?: ManifestMember[]
  onAssignCrew?: (memberId: string, targetLocation: ShipCompartmentId) => void
  onToggleTurn?: (memberId: string) => void
  tacticalMovement?: TacticalMovementState
  onSpendMovement?: (feet: number) => void
  onResetMovement?: () => void
}

export function EnginesStation({
  currentDay = 42,
  lastAstrogationSyncDay = 38,
  onUpdateDay,
  onNavigate,
  activeJourney,
  availablePowerDice = 4,
  maxPowerDice = 4,
  powerDieType = "d4",
  onConsumePowerDice = () => false,
  shipConfig,
  proficiencyBonus,
  currentFuel = 30,
  maxFuel = 30,
  onFuelChange,
  installedMods = [],
  onRemoveMod = () => {},
  stationPools = {
    engines: 0,
    communications: 0,
    weapons: 0,
    sensors: 0,
    defense: 0,
  },
  onUpdateStationPools,
  sharedPoolDice = 0,
  onUpdateSharedPool,
  pinpointStrikesUsed: externalPinpointStrikesUsed,
  onUpdatePinpointStrikesUsed,
  retroThrustersUsed: externalRetroThrustersUsed,
  onUpdateRetroThrustersUsed,
  versatileSnubfighterUsed: externalVersatileUsed,
  onUpdateVersatileSnubfighterUsed,
  evasiveManeuversUsed = 0,
  onUpdateEvasiveManeuversUsed,
  adaptiveArmorUsed = 0,
  onUpdateAdaptiveArmorUsed,
  onRecharge,
  isEngineBoosted = false,
  engineBoostTurnsRemaining = 0,
  standingByUsed = false,
  onUseStandingBy,
  leafOnTheWindUsed = false,
  onUseLeafOnTheWind,
  sFoilsMode: externalSFoilsMode,
  onToggleSFoils,
  currentHull = 40,
  maxHull = 40,
  currentShields = 24,
  maxShields = 24,
  systemDamageLevel = 0,
  onUpdateSystemDamageLevel,
  effectiveSlowedLevel = 0,
  manifest = [],
  onAssignCrew,
  onToggleTurn,
  tacticalMovement = { spentFeet: 0 },
  onSpendMovement,
  onResetMovement,
}: EnginesStationProps) {
  // Modal Overlays[cite: 2]
  const [showStartupModal, setShowStartupModal] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [forcedStartupSafety, setForcedStartupSafety] = useState(false)

  // Fast-Forward Input[cite: 2]
  const [awayMissionDaysInput, setAwayMissionDaysInput] = useState<string>("7")

  // Crew assignment extraction[cite: 2]
  const assignedCrew = useMemo(() => {
    return manifest
      .filter((m) => m.location === "helm" && !m.isPassenger)
      .sort((a, b) => a.assignedOrder - b.assignedOrder)
  }, [manifest])

  const availablePersonnel = useMemo(() => {
    return manifest.filter((m) => m.location !== "helm" && !m.isPassenger)
  }, [manifest])

  const pilot = assignedCrew[0] || null

  const hasSFoils = installedMods.some((m) => m.name.toUpperCase().trim() === "S-FOILS")
  const [internalSFoilsMode, setInternalSFoilsMode] = useState<"locked" | "unlocked">("unlocked")
  const activeSFoilsMode = externalSFoilsMode ?? internalSFoilsMode

  const handleToggleSFoils = (newMode: "locked" | "unlocked") => {
    if (onToggleSFoils) onToggleSFoils(newMode)
    else setInternalSFoilsMode(newMode)
  }

  // Power Coupling Logic[cite: 2]
  const powerCoupling = shipConfig?.powerCoupling ?? shipConfig?.couplingType ?? "Direct Power Coupling"
  const isDistributed = powerCoupling.toLowerCase().includes("distributed")
  const isHubAndSpoke = powerCoupling.toLowerCase().includes("hub") || powerCoupling.toLowerCase().includes("spoke")
  const isDirect = !isDistributed && !isHubAndSpoke

  const currentStationDice = stationPools["engines"] ?? (isHubAndSpoke ? 1 : isDistributed ? 2 : availablePowerDice)
  const effectiveMax = isDirect ? maxPowerDice : (isDistributed ? 2 : 1)
  const effectiveAvailable = Math.min(
    effectiveMax,
    isDirect ? availablePowerDice : currentStationDice
  )

  const isSuperiorityFighterSpec = shipConfig?.roleSpecialization === "Superiority Fighter"
  const isSuperiorityFighterMastery = shipConfig?.roleMastery === "Superiority Fighter"
  const isCourierSpec = shipConfig?.roleSpecialization === "Courier"

  const rawTurningSpeed = (shipConfig as any)?.turningSpeed ?? 150
  let finalTurningSpeed = effectiveSlowedLevel >= 4 ? 0 : rawTurningSpeed
  let turningOverflowSpeed = 0
  let turningReductionApplied = false

  if (isSuperiorityFighterMastery && effectiveSlowedLevel < 4) {
    if (finalTurningSpeed - 50 <= 0) {
      finalTurningSpeed = 0
      turningOverflowSpeed = 50
    } else {
      finalTurningSpeed -= 50
      turningReductionApplied = true
    }
  }

  const modifierSpeedBonus = (shipConfig as any)?.flyingSpeedBonus || 0
  const sFoilsSpeedBonus = hasSFoils && activeSFoilsMode === "locked" && effectiveSlowedLevel < 4 ? 50 : 0
  const engineeringBoost = isEngineBoosted && effectiveSlowedLevel < 4 ? 50 : 0
  
  const bonusSpeed = effectiveSlowedLevel >= 4 ? 0 : (
    (isSuperiorityFighterSpec ? 50 : 0) + 
    modifierSpeedBonus + 
    turningOverflowSpeed + 
    engineeringBoost + 
    sFoilsSpeedBonus
  )

  const calculateSlowedSpeed = (baseSpeed: number, level: number): number => {
    if (level >= 4) return 0
    if (level === 3) return Math.max(0, baseSpeed - 300)
    if (level === 2) return Math.max(0, baseSpeed - 250)
    if (level === 1) return Math.max(0, baseSpeed - 150)
    return baseSpeed
  }

  const slowedReductionAmount = useMemo(() => {
    if (effectiveSlowedLevel >= 4) return 9999
    if (effectiveSlowedLevel === 3) return 300
    if (effectiveSlowedLevel === 2) return 250
    if (effectiveSlowedLevel === 1) return 150
    return 0
  }, [effectiveSlowedLevel])

  const handleCustomConsume = (amount: number = 1) => {
    if (isDirect) return onConsumePowerDice?.(amount)
    if (currentStationDice >= amount) {
      if (onUpdateStationPools) {
        onUpdateStationPools((prev) => ({
          ...prev,
          engines: Math.max(0, (prev["engines"] ?? (isHubAndSpoke ? 1 : 2)) - amount),
        }))
      }
      return true
    } else if (isHubAndSpoke && sharedPoolDice >= amount) {
      if (onUpdateSharedPool) {
        onUpdateSharedPool((prev) => Math.max(0, prev - amount))
      }
      return true
    }
    return false
  }

  const canSpendStation = effectiveAvailable > 0
  const canSpendShared = isHubAndSpoke && sharedPoolDice > 0

  const rawReactorType = shipConfig?.reactorType ?? installedMods.find((mod) => 
    mod.name.toLowerCase().includes("reactor") || mod.category === "Reactor"
  )?.name ?? "Fuel Cell Reactor"

  const reactorName = rawReactorType
  const fuelMultiplier = reactorName.toLowerCase().includes("ionization") 
    ? 0.5 
    : reactorName.toLowerCase().includes("power core") 
    ? 1.5 
    : 1.0

  const campaignDays = currentDay
  const [environment, setEnvironment] = useState<FlightEnvironment>("Space")
  const fuelMax = maxFuel ?? 30
  const [fuelRemaining, setFuelRemaining] = useState<number>(currentFuel ?? 30)
  const [totalFuelUsed, setTotalFuelUsed] = useState<number>(0)
  const fuelCostPerUnit = 100

  useEffect(() => {
    if (currentFuel !== undefined) setFuelRemaining(currentFuel)
  }, [currentFuel])

  const syncDay = lastAstrogationSyncDay ?? currentDay
  const daysElapsedSinceSync = Math.max(0, currentDay - syncDay)

  const [transponderMode, setTransponderMode] = useState<TransponderMode>("PRIMARY")
  const primaryCode = "ZETA-CRUCIBLE-7749"
  const backupCode = "CIV-FREIGHTER-9021X"

  const [selectedPilotAction, setSelectedPilotAction] = useState<PilotAction>(PILOT_ACTIONS[0])
  const [lastBurnedDay, setLastBurnedDay] = useState<number | null>(null)
  const [hasBurnedInitialJump, setHasBurnedInitialJump] = useState<boolean>(false)

  const shipTier = typeof shipConfig?.tier === "number" ? shipConfig.tier : 0
  const shipSize = (shipConfig?.size || "small").toLowerCase()

  const hasPinpointStrike = shipSize === "small" && shipTier >= 1

  const getPinpointDie = (tier: number): { type: string; maxRoll: number } => {
    if (tier >= 5) return { type: "d12", maxRoll: 12 }
    if (tier === 4) return { type: "d10", maxRoll: 10 }
    if (tier === 3) return { type: "d8", maxRoll: 8 }
    if (tier === 2) return { type: "d6", maxRoll: 6 }
    return { type: "d4", maxRoll: 4 }
  }

  const pinpointDieInfo = getPinpointDie(shipTier)
  const pinpointMaxUses = shipTier

  const [localPinpointStrikesUsed, setLocalPinpointStrikesUsed] = useState<number>(0)
  const currentPinpointUses = externalPinpointStrikesUsed !== undefined 
    ? externalPinpointStrikesUsed 
    : localPinpointStrikesUsed

  const [lastPinpointRoll, setLastPinpointRoll] = useState<number | null>(null)
  const [isRollingPinpoint, setIsRollingPinpoint] = useState<boolean>(false)

  const hasRetroThrusters = shipSize === "small" && shipTier >= 2
  const [localRetroUsed, setLocalRetroUsed] = useState<boolean>(false)
  const isRetroUsed = externalRetroThrustersUsed !== undefined
    ? externalRetroThrustersUsed
    : localRetroUsed

  const hasVersatileSnubfighter = shipSize === "small" && shipTier >= 3
  const versatileMaxUses = shipTier
  const [localVersatileUsed, setLocalVersatileUsed] = useState<number>(0)
  const currentVersatileUses = externalVersatileUsed !== undefined
    ? externalVersatileUsed
    : localVersatileUsed

  const isMedium = shipSize === "medium"
  const hasEvasiveManeuvers = isMedium && shipTier >= 1
  const evasiveMax = 2 * shipTier
  const evasiveDieInfo = getPinpointDie(shipTier)
  const [lastEvasiveRoll, setLastEvasiveRoll] = useState<number | null>(null)

  const hasAdaptiveArmor = isMedium && shipTier >= 4
  const adaptiveMax = shipTier

  const normalStartupTime = useMemo(() => {
    switch (shipSize) {
      case "tiny": return "1 Minute"
      case "small": return "2 Minutes"
      case "medium": return "5 Minutes"
      case "large": return "10 Minutes"
      case "huge": return "30 Minutes"
      case "gargantuan": return "60 Minutes"
      default: return "5 Minutes"
    }
  }, [shipSize])

  const [initiationProcedures, setInitiationProcedures] = useState<number>(0)
  const targetProcedures = 10

  const duressCondition: "advantage" | "disadvantage" | "normal" = useMemo(() => {
    if (currentHull < maxHull) return "disadvantage"
    if (currentHull >= maxHull && currentShields >= maxShields) return "advantage"
    return "normal"
  }, [currentHull, maxHull, currentShields, maxShields])

  const defaultPilotMod = shipConfig?.skills?.maneuver ?? 2
  const [pilotModInput, setPilotModInput] = useState<number>(defaultPilotMod)
  const [manualProcInput, setManualProcInput] = useState<string>("")
  const [lastDuressRollLog, setLastDuressRollLog] = useState<string | null>(null)
  const [mishapResultLog, setMishapResultLog] = useState<string | null>(null)

  const evaluateDuressCheck = (total: number): { gained: number; label: string } => {
    if (total >= 30) return { gained: 5, label: "30+ : PERFECT (+5 Procedures)" }
    if (total >= 26) return { gained: 4, label: "26-29 : MASTERFUL (+4 Procedures)" }
    if (total >= 21) return { gained: 3, label: "21-25 : EXCELLENT (+3 Procedures)" }
    if (total >= 16) return { gained: 2, label: "16-20 : BREAKTHROUGH (+2 Procedures)" }
    if (total >= 10) return { gained: 1, label: "10-15 : ADEQUATE (+1 Procedure)" }
    return { gained: 0, label: "≤ 9 : FAILED (0 Procedures)" }
  }

  const handleRollDuressCheck = () => {
    let rollA = Math.floor(Math.random() * 20) + 1
    let rollB = Math.floor(Math.random() * 20) + 1
    let keptD20 = rollA

    if (duressCondition === "advantage") {
      keptD20 = Math.max(rollA, rollB)
    } else if (duressCondition === "disadvantage") {
      keptD20 = Math.min(rollA, rollB)
    }

    const total = keptD20 + pilotModInput
    const evalResult = evaluateDuressCheck(total)

    setInitiationProcedures((prev) => Math.min(targetProcedures, prev + evalResult.gained))
    setLastDuressRollLog(
      `Check: d20 [${duressCondition !== "normal" ? `${rollA}, ${rollB} -> Kept${keptD20}` : keptD20}] + Mod (${pilotModInput >= 0 ? `+${pilotModInput}` : pilotModInput}) = ${total} (${evalResult.label})`
    )
  }

  const handleApplyManualProcedures = (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseInt(manualProcInput, 10)
    if (!isNaN(val)) {
      setInitiationProcedures((prev) => Math.min(targetProcedures, Math.max(0, prev + val)))
      setManualProcInput("")
    }
  }

  const handleResetStartup = () => {
    setInitiationProcedures(0)
    setLastDuressRollLog(null)
    setMishapResultLog(null)
    setForcedStartupSafety(false)
  }

  const resolveMishapTableRoll = (dieRoll: number, bonus: number, isRecursiveSecondRoll: boolean = false): string => {
    const total = dieRoll + bonus
    let description = ""

    if (dieRoll === 20 && bonus === 0) {
      description = "Natural 20 with 0 procedures! Ship is unscathed, but starts with 0 power dice available."
    } else if (total >= 20) {
      description = `Total ${total} (20+): The ship suffers no adverse consequences.`
    } else if (total >= 18) {
      description = `Total ${total} (18-19): Navcomputer is disabled until ship recharges.`
    } else if (total >= 15) {
      description = `Total ${total} (15-17): Ship gains 1 level of slowed until ship recharges.`
    } else if (total >= 12) {
      description = `Total ${total} (12-14): Ship is blinded until ship recharges.`
    } else if (total >= 9) {
      description = `Total ${total} (9-11): Ship gains 1 level of system damage.`
      onUpdateSystemDamageLevel?.((prev) => Math.min(6, prev + 1))
    } else if (total >= 6) {
      description = `Total ${total} (6-8): Ship gains 2 levels of system damage.`
      onUpdateSystemDamageLevel?.((prev) => Math.min(6, prev + 2))
    } else if (total >= 3) {
      description = `Total ${total} (3-5): Ship gains 3 levels of system damage.`
      onUpdateSystemDamageLevel?.((prev) => Math.min(6, prev + 3))
    } else {
      description = `Total ${total} (1-2): Ship gains 4 levels of system damage.`
      onUpdateSystemDamageLevel?.((prev) => Math.min(6, prev + 4))
    }

    if (dieRoll === 1 && !isRecursiveSecondRoll) {
      const secondDie = Math.floor(Math.random() * 20) + 1
      const extraDesc = resolveMishapTableRoll(secondDie, bonus, true)
      description += ` ⚠️ NATURAL 1 ROLLED! Must roll again on mishap table: [Roll 2: d20(${secondDie})+${bonus}] -> ${extraDesc}`
    }

    return description
  }

  const handleEngageStartup = () => {
    if (initiationProcedures >= targetProcedures) {
      setMishapResultLog("✅ Optimal Start-Up: All 10 initiation procedures completed cleanly. Engines primed.")
      return
    }

    const d20 = Math.floor(Math.random() * 20) + 1
    const resultText = resolveMishapTableRoll(d20, initiationProcedures)
    setMishapResultLog(`⚠️ FORCED TAKEOFF (Roll ${d20} + ${initiationProcedures} proc): ${resultText}`)
  }

  const handleActivatePinpointStrike = () => {
    if (currentPinpointUses >= pinpointMaxUses) return
    setIsRollingPinpoint(true)
    setTimeout(() => {
      const rolledValue = Math.floor(Math.random() * pinpointDieInfo.maxRoll) + 1
      setLastPinpointRoll(rolledValue)
      setIsRollingPinpoint(false)

      if (onUpdatePinpointStrikesUsed) {
        onUpdatePinpointStrikesUsed((prev) => Math.min(pinpointMaxUses, prev + 1))
      } else {
        setLocalPinpointStrikesUsed((prev) => Math.min(pinpointMaxUses, prev + 1))
      }
    }, 250)
  }

  const handleRollEvasiveManeuvers = () => {
    if (evasiveManeuversUsed >= evasiveMax) return
    setIsRollingPinpoint(true)
    setTimeout(() => {
      const rolledValue = Math.floor(Math.random() * evasiveDieInfo.maxRoll) + 1
      setLastEvasiveRoll(rolledValue)
      setIsRollingPinpoint(false)
      if (onUpdateEvasiveManeuversUsed) onUpdateEvasiveManeuversUsed((prev) => Math.min(evasiveMax, prev + 1))
    }, 250)
  }

  const handleActivateAdaptiveArmor = () => {
    if (adaptiveArmorUsed >= adaptiveMax) return
    if (onUpdateAdaptiveArmorUsed) onUpdateAdaptiveArmorUsed((prev) => Math.min(adaptiveMax, prev + 1))
  }

  const handleFireRetroThrusters = () => {
    if (isRetroUsed) return
    if (onUpdateRetroThrustersUsed) onUpdateRetroThrustersUsed(true)
    else setLocalRetroUsed(true)
  }

  const handleUseVersatileSnubfighter = () => {
    if (currentVersatileUses >= versatileMaxUses) return
    if (onUpdateVersatileSnubfighterUsed) onUpdateVersatileSnubfighterUsed((prev) => Math.min(versatileMaxUses, prev + 1))
    else setLocalVersatileUsed((prev) => Math.min(versatileMaxUses, prev + 1))
  }

  const handleShipRecharge = () => {
    if (onUpdatePinpointStrikesUsed) onUpdatePinpointStrikesUsed(0)
    else setLocalPinpointStrikesUsed(0)
    if (onUpdateRetroThrustersUsed) onUpdateRetroThrustersUsed(false)
    else setLocalRetroUsed(false)
    setLastPinpointRoll(null)
    onRecharge?.()
  }

  // Speed & Environment Calculations[cite: 2]
  const envStats = useMemo(() => {
    const rawNominalSpeed = environment === "Underwater" ? 150 + Math.round(bonusSpeed / 2) : 300 + bonusSpeed
    const finalEffectiveSpeed = calculateSlowedSpeed(rawNominalSpeed, effectiveSlowedLevel)
    const numericTurn = environment === "Underwater" ? Math.round(finalTurningSpeed / 2) : finalTurningSpeed

    switch (environment) {
      case "Atmosphere":
        return { 
          speed: `${finalEffectiveSpeed} ft`, 
          rawSpeed: rawNominalSpeed,
          numericSpeed: finalEffectiveSpeed,
          turn: `${finalTurningSpeed} ft`, 
          numericTurn: numericTurn,
          burnRateText: `1 Unit / 1 Hour (${fuelMultiplier}x Core Mod)`,
          baseUnit: 1,
          labelStep1: `-1 Unit (1 Hr)`,
          labelStep5: `-5 Units (5 Hr)`,
          labelRefund: `+1 Refund`
        }
      case "Underwater":
        return { 
          speed: `${finalEffectiveSpeed} ft`, 
          rawSpeed: rawNominalSpeed,
          numericSpeed: finalEffectiveSpeed,
          turn: `${numericTurn} ft`, 
          numericTurn: numericTurn,
          burnRateText: `2 Units / 1 Hour (${fuelMultiplier}x Core Mod)`,
          baseUnit: 2,
          labelStep1: `-2 Units (1 Hr)`,
          labelStep5: `-10 Units (5 Hr)`,
          labelRefund: `+2 Refund`
        }
      case "Space":
      default:
        return { 
          speed: `${finalEffectiveSpeed} ft`, 
          rawSpeed: rawNominalSpeed,
          numericSpeed: finalEffectiveSpeed,
          turn: `${finalTurningSpeed} ft`, 
          numericTurn: numericTurn,
          burnRateText: `${fuelMultiplier} Unit / 1 Day (or Jump)`,
          baseUnit: fuelMultiplier,
          labelStep1: `-${fuelMultiplier} Unit (1 Jump)`,
          labelStep5: `-${fuelMultiplier * 3} Units (3 Jumps)`,
          labelRefund: `+${fuelMultiplier} Refund`
        }
    }
  }, [environment, bonusSpeed, finalTurningSpeed, fuelMultiplier, effectiveSlowedLevel])

  const maxAvailableMovement = envStats.numericSpeed
  const currentSpentMovement = tacticalMovement.spentFeet
  const remainingMovement = Math.max(0, maxAvailableMovement - currentSpentMovement)

  const turnCost90 = envStats.numericTurn
  const turnCost45 = Math.round(turnCost90 / 2)

  const handleConsumeFuelCustom = (units: number) => {
    const finalBurnCost = environment === "Space" ? units : units * fuelMultiplier
    if (fuelRemaining >= finalBurnCost) {
      const newFuel = Math.max(0, fuelRemaining - finalBurnCost)
      setFuelRemaining(newFuel)
      onFuelChange?.(newFuel)
      setTotalFuelUsed((prev) => prev + finalBurnCost)
    }
  }

  const handleRefundFuelCustom = (units: number) => {
    const finalRefund = environment === "Space" ? units : units * fuelMultiplier
    const newFuel = Math.min(fuelMax, fuelRemaining + finalRefund)
    setFuelRemaining(newFuel)
    onFuelChange?.(newFuel)
    setTotalFuelUsed((prev) => Math.max(0, prev - finalRefund))
  }

  const journeyStart = activeJourney 
    ? (activeJourney.startDay ?? (activeJourney as any).startedOnDay ?? (activeJourney as any).day ?? campaignDays) 
    : 0
  const daysInTransit = Math.max(0, campaignDays - journeyStart)
  
  const rawDuration = activeJourney 
    ? (activeJourney.totalDays ??
       (activeJourney as any).durationDays ?? 
       (activeJourney as any).duration ?? 
       (activeJourney as any).days ?? 
       (activeJourney as any).travelDays ?? 
       (activeJourney as any).transitDays ?? 
       1) 
    : 1

  const duration = typeof rawDuration === "string" 
    ? parseInt(rawDuration, 10) || 1 
    : Number(rawDuration) || 1

  const progressPercent = Math.min(100, Math.max(0, Math.round((daysInTransit / duration) * 100)))

  useEffect(() => {
    if (!activeJourney) {
      setHasBurnedInitialJump(false)
      setLastBurnedDay(null)
      return
    }

    if (!hasBurnedInitialJump) {
      const initialJumpCost = fuelMultiplier
      const nextFuel = Math.max(0, fuelRemaining - initialJumpCost)
      setFuelRemaining(nextFuel)
      onFuelChange?.(nextFuel)
      setTotalFuelUsed((prev) => prev + initialJumpCost)
      setHasBurnedInitialJump(true)
      setLastBurnedDay(campaignDays)
      return
    }

    if (lastBurnedDay !== null && campaignDays > lastBurnedDay) {
      const daysPassedIncrement = campaignDays - lastBurnedDay
      const dailyBurnCost = daysPassedIncrement * fuelMultiplier
      const nextFuel = Math.max(0, fuelRemaining - dailyBurnCost)
      setFuelRemaining(nextFuel)
      onFuelChange?.(nextFuel)
      setTotalFuelUsed((prev) => prev + dailyBurnCost)
      setLastBurnedDay(campaignDays)
    }
  }, [activeJourney, campaignDays, hasBurnedInitialJump, lastBurnedDay, onFuelChange, fuelRemaining, fuelMultiplier])

  const getAstrogationStatus = (days: number) => {
    if (days < 1) {
      return { label: "ADVANTAGE (<24H)", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" }
    } else if (days >= 7) {
      return { label: "DISADVANTAGE (>7D)", color: "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse" }
    }
    return { label: "NOMINAL SYNC", color: "bg-cyan-neon/10 text-cyan-neon border-cyan-neon/40" }
  }

  const astrogationStatus = getAstrogationStatus(daysElapsedSinceSync)

  return (
    <div className="flex flex-col gap-3.5 w-full font-mono">

      {/* ========================================================================= */}
      {/* 1. MASTER HEADER & INTEGRATED QUICK-ACTION ACCESS BAR                     */}
      {/* ========================================================================= */}
      <header className="flex flex-col xl:flex-row items-start xl:items-center justify-between border-b border-bridge-border pb-2.5 gap-2.5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-glow-cyan text-base md:text-lg font-bold tracking-[0.15em] text-cyan-neon">
              PROPULSION &amp; HELMSMAN CONTROL
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowStartupModal(true)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border transition cursor-pointer ${
                  initiationProcedures >= targetProcedures
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    : "border-amber-400/60 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 shadow-[0_0_8px_rgba(251,191,36,0.2)]"
                }`}
              >
                <Flame className="h-3 w-3" />
                <span>Start-Up ({initiationProcedures}/10)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowActionModal(true)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-cyan-neon/40 bg-cyan-neon/10 text-cyan-neon hover:bg-cyan-neon/20 cursor-pointer"
              >
                <BookOpen className="h-3 w-3" />
                <span>Tactics DB</span>
              </button>
            </div>
          </div>
          <p className="text-[10px] tracking-[0.3em] text-muted-foreground/60 mt-0.5">
            {shipConfig?.name?.toUpperCase() || "VESSEL"} // HELM CONSOLE
          </p>
        </div>

        {/* Mode Toggles & IFF Transponder */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {hasSFoils && (
            <div className="flex items-center gap-1 rounded border border-cyan-500/40 bg-black/60 p-0.5 text-[9px]">
              <span className="text-muted-foreground px-1 uppercase tracking-wider">S-Foils:</span>
              <button
                type="button"
                onClick={() => handleToggleSFoils("locked")}
                className={`px-1.5 py-0.5 rounded font-bold uppercase transition-all cursor-pointer ${
                  activeSFoilsMode === "locked"
                    ? "bg-amber-500/30 border border-amber-400 text-amber-300"
                    : "text-slate-400 hover:text-amber-200"
                }`}
              >
                CRUISE (+50 FT)
              </button>
              <button
                type="button"
                onClick={() => handleToggleSFoils("unlocked")}
                className={`px-1.5 py-0.5 rounded font-bold uppercase transition-all cursor-pointer ${
                  activeSFoilsMode === "unlocked"
                    ? "bg-cyan-500/30 border border-cyan-neon text-cyan-neon"
                    : "text-slate-400 hover:text-cyan-200"
                }`}
              >
                ATK (+1)
              </button>
            </div>
          )}

          {isEngineBoosted && (
            <span className="rounded border border-amber-400 bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-300 animate-pulse">
              ⚡ BOOST (+50 FT)
            </span>
          )}

          <div className="flex items-center gap-2 rounded border border-bridge-border bg-black/50 px-2 py-0.5">
            <span className="text-[8px] text-muted-foreground uppercase">IFF:</span>
            <span className="text-[10px] font-bold text-amber-300">
              {transponderMode === "PRIMARY" ? primaryCode : backupCode}
            </span>
            <button
              onClick={() => setTransponderMode((prev) => (prev === "PRIMARY" ? "SECURE_BACKUP" : "PRIMARY"))}
              className={`rounded px-1.5 py-0.2 text-[8px] font-bold uppercase transition-all cursor-pointer ${
                transponderMode === "PRIMARY"
                  ? "border border-cyan-neon/40 bg-cyan-neon/10 text-cyan-neon"
                  : "border border-red-500/50 bg-red-500/20 text-red-400 animate-pulse"
              }`}
            >
              {transponderMode === "PRIMARY" ? "BACKUP" : "ACTIVE"}
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. COMPACT CREW ROSTER HUD                                                */}
      {/* ========================================================================= */}
      <div className="rounded border border-cyan-neon/40 bg-black/40 px-3 py-1.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 shadow-[0_0_12px_rgba(0,255,255,0.04)]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs font-bold text-cyan-neon uppercase tracking-wider mr-1">
            <Users className="h-3.5 w-3.5" />
            <span>Manned Helm:</span>
          </div>

          {assignedCrew.length === 0 ? (
            <span className="text-xs text-amber-300 italic px-2 py-0.5 border border-amber-500/30 bg-amber-950/20 rounded">
              Uncrewed (Automatic Disadvantage)
            </span>
          ) : (
            assignedCrew.map((member, idx) => {
              const isLead = idx === 0
              return (
                <div
                  key={member.id}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs ${
                    member.hasTakenTurnThisRound
                      ? "bg-slate-900/60 border-slate-800 text-slate-400"
                      : "bg-slate-950 border-cyan-500/40 text-slate-100"
                  }`}
                >
                  <span
                    className={`text-[8px] font-bold px-1 rounded border uppercase ${
                      isLead
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : idx === 1
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-sky-500/20 text-sky-400 border-sky-500/40"
                    }`}
                  >
                    {isLead ? "Pilot" : idx === 1 ? "Copilot" : "Support"}
                  </span>
                  <span className="font-bold text-xs">{member.name}</span>

                  <button
                    type="button"
                    onClick={() => onToggleTurn && onToggleTurn(member.id)}
                    className="cursor-pointer ml-0.5"
                    title={member.hasTakenTurnThisRound ? "Action Taken" : "Action Pending"}
                  >
                    {member.hasTakenTurnThisRound ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onAssignCrew && onAssignCrew(member.id, "crew_quarters")}
                    className="text-slate-500 hover:text-rose-400 transition ml-0.5 cursor-pointer"
                    title="Relieve from Station"
                  >
                    <UserMinus className="h-3 w-3" />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {availablePersonnel.length > 0 && onAssignCrew && (
          <div className="flex items-center gap-1.5 self-end md:self-auto">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Deploy:</span>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) onAssignCrew(e.target.value, "helm")
              }}
              className="rounded bg-slate-950 border border-slate-700 px-2 py-0.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-neon cursor-pointer"
            >
              <option value="" disabled>+ Assign Crew...</option>
              {availablePersonnel.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({getCrewRole(p, manifest)})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Global Ship Stats Telemetry strip[cite: 2] */}
      <ShipStats shipConfig={shipConfig} proficiencyBonus={proficiencyBonus} />

      {/* ========================================================================= */}
      {/* 3. ROW 1: SIDE-BY-SIDE TACTICAL MOVEMENT & COMBAT RESOURCES               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
        
        {/* LEFT COLUMN: TACTICAL SPLIT-MOVEMENT */}
        <section className="rounded-md border border-cyan-neon/60 bg-bridge-panel p-3 shadow-[0_0_15px_rgba(0,255,255,0.06)] flex flex-col justify-between gap-2.5">
          <div className="flex justify-between items-center border-b border-bridge-border/60 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Footprints className="h-4 w-4 text-cyan-neon animate-pulse" />
              <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase">
                Movement &amp; Heading
              </h3>
            </div>
            <span className="text-[10px] text-muted-foreground">
              90°: <strong className="text-cyan-300">{turnCost90} ft</strong> • 45°: <strong className="text-cyan-300">{turnCost45} ft</strong>
            </span>
          </div>

          <div className="flex flex-col gap-2 bg-black/50 p-2.5 rounded border border-bridge-border/60">
            {/* Speed Gauge Readout */}
            <div>
              <div className="flex justify-between items-baseline mb-0.5">
                <span className="text-muted-foreground uppercase text-[9px]">Speed Remaining:</span>
                <span className={`text-lg font-black font-mono ${remainingMovement === 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {remainingMovement} ft
                </span>
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>Spent: <strong className="text-amber-300">{currentSpentMovement} ft</strong></span>
                <span>Max: <strong>{maxAvailableMovement} ft</strong></span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-sm overflow-hidden border border-bridge-border/40 mt-1">
                <div
                  className={`h-full transition-all duration-300 ${
                    remainingMovement === 0
                      ? "bg-red-500"
                      : remainingMovement <= 100
                      ? "bg-amber-400"
                      : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                  }`}
                  style={{ width: `${Math.min(100, (remainingMovement / (maxAvailableMovement || 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Slider Adjustment */}
            <div className="flex flex-col gap-0.5 pt-1">
              <div className="flex justify-between text-[9px] text-slate-300">
                <span>Throttle Slider:</span>
                <span className="text-cyan-neon font-bold">{currentSpentMovement} ft spent</span>
              </div>
              <input
                type="range"
                min="0"
                max={maxAvailableMovement}
                step="25"
                value={currentSpentMovement}
                onChange={(e) => {
                  const targetVal = parseInt(e.target.value, 10) || 0
                  const delta = targetVal - currentSpentMovement
                  onSpendMovement?.(delta)
                }}
                className="w-full accent-cyan-neon cursor-pointer bg-slate-900 h-1.5 rounded"
              />
            </div>
          </div>

          {/* Stepper Buttons & Rotation controls */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-bridge-border/40">
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => onSpendMovement?.(turnCost90)}
                disabled={remainingMovement < turnCost90 || turnCost90 <= 0}
                className="px-2 py-1 rounded border border-cyan-neon/60 bg-cyan-neon/20 hover:bg-cyan-neon/30 text-cyan-neon text-[9px] font-bold uppercase transition disabled:opacity-30 flex items-center gap-1 cursor-pointer shadow-[0_0_8px_rgba(0,255,255,0.2)]"
              >
                <RotateCw className="h-3 w-3" />
                90° (-{turnCost90} ft)
              </button>

              <button
                type="button"
                onClick={() => onSpendMovement?.(turnCost45)}
                disabled={remainingMovement < turnCost45 || turnCost45 <= 0}
                className="px-2 py-1 rounded border border-cyan-500/50 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 text-[9px] font-bold uppercase transition disabled:opacity-30 flex items-center gap-1 cursor-pointer"
              >
                <Compass className="h-3 w-3" />
                45° (-{turnCost45} ft)
              </button>

              <button
                type="button"
                onClick={() => onSpendMovement?.(50)}
                disabled={remainingMovement < 50}
                className="px-1.5 py-1 rounded border border-bridge-border bg-slate-900 hover:bg-slate-800 text-slate-300 text-[9px] font-bold uppercase disabled:opacity-30 cursor-pointer"
              >
                +50
              </button>

              <button
                type="button"
                onClick={() => onSpendMovement?.(-50)}
                disabled={currentSpentMovement <= 0}
                className="px-1.5 py-1 rounded border border-bridge-border bg-slate-900 hover:bg-slate-800 text-slate-300 text-[9px] font-bold uppercase disabled:opacity-30 cursor-pointer"
              >
                -50
              </button>
            </div>

            <button
              type="button"
              onClick={() => onResetMovement?.()}
              disabled={currentSpentMovement <= 0}
              className="px-2 py-1 rounded border border-rose-500/40 bg-rose-950/30 hover:bg-rose-950/50 text-rose-300 text-[9px] font-bold uppercase transition disabled:opacity-30 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
        </section>

        {/* RIGHT COLUMN: COMBAT RESOURCES */}
        <section className="rounded-md border border-cyan-neon/60 bg-bridge-panel p-3 shadow-[0_0_15px_rgba(0,255,255,0.06)] flex flex-col justify-between gap-2.5">
          <div className="flex justify-between items-center border-b border-bridge-border/60 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-cyan-neon" />
              <h3 className="text-xs font-bold tracking-[0.15em] text-cyan-neon uppercase">
                Combat Resources
              </h3>
            </div>
            <span className="text-[9px] text-muted-foreground uppercase">
              {powerCoupling}
            </span>
          </div>

          {/* Inline Power Pool Bar */}
          <div className="bg-black/50 p-2.5 rounded border border-bridge-border/60 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-bold uppercase text-[10px]">
                Station Dice ({powerDieType.toUpperCase()}):
              </span>
              <span className="text-cyan-neon font-black font-mono">
                {effectiveAvailable} / {effectiveMax}
              </span>
            </div>

            <div className="flex items-center gap-1.5 w-full">
              {Array.from({ length: effectiveMax }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2 flex-1 rounded-xs transition-all ${
                    i < effectiveAvailable
                      ? "bg-cyan-neon shadow-[0_0_8px_rgba(0,255,255,0.7)]"
                      : "bg-slate-900 border border-bridge-border/60"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={effectiveAvailable <= 0}
                onClick={() => handleCustomConsume(1)}
                className="flex-1 py-1 rounded border border-cyan-neon/60 bg-cyan-neon/20 hover:bg-cyan-neon/30 text-cyan-neon text-[10px] font-bold uppercase transition disabled:opacity-30 cursor-pointer shadow-[0_0_8px_rgba(0,255,255,0.15)]"
              >
                Consume Station Die (-1)
              </button>
            </div>
          </div>

          {/* Hub-and-Spoke Shared Reactor Strip */}
          {isHubAndSpoke && (
            <div className="bg-amber-950/20 border border-amber-500/30 p-2 rounded flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-amber-400 font-bold uppercase">Shared Reactor Bus:</span>
                <span className="font-bold text-amber-300 font-mono">{sharedPoolDice} / 2</span>
              </div>
              <div className="flex items-center gap-1 w-full">
                {Array.from({ length: 2 }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-xs ${
                      i < sharedPoolDice
                        ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                        : "bg-black/90 border border-bridge-border/60"
                    }`}
                  />
                ))}
              </div>
              {!canSpendStation && canSpendShared && (
                <button
                  type="button"
                  onClick={() => handleCustomConsume(1)}
                  className="w-full mt-0.5 rounded bg-amber-500/20 border border-amber-400/60 py-0.5 text-[9px] font-bold text-amber-300 hover:bg-amber-500/30 cursor-pointer"
                >
                  Spend Shared Die ({sharedPoolDice} Left)
                </button>
              )}
            </div>
          )}

          {/* Reaction Triggers */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-bridge-border/40">
            {onUseStandingBy && (
              <button
                type="button"
                onClick={onUseStandingBy}
                disabled={standingByUsed}
                className={`flex-1 py-1 px-1 rounded text-[9px] font-bold uppercase border transition cursor-pointer ${
                  standingByUsed
                    ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                    : "border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-950/50"
                }`}
                title="Use Reaction: Standing By"
              >
                {standingByUsed ? "Standing By (Used)" : "Standing By (Rx)"}
              </button>
            )}

            {shipTier >= 3 && onUseLeafOnTheWind && (
              <button
                type="button"
                onClick={onUseLeafOnTheWind}
                disabled={leafOnTheWindUsed}
                className={`flex-1 py-1 px-1 rounded text-[9px] font-bold uppercase border transition cursor-pointer ${
                  leafOnTheWindUsed
                    ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                    : "border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50"
                }`}
                title="Tier 3 Reaction: Leaf on the Wind"
              >
                {leafOnTheWindUsed ? "Leaf on Wind (Used)" : "Leaf on Wind"}
              </button>
            )}
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* 4. ROW 2: PROPULSION / FUEL + CAMPAIGN TIME + HYPERSPACE VECTOR           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch">
        
        {/* CARD 1: FLIGHT DETAILS & FUEL RESERVES */}
        <section className="rounded-md border border-bridge-border bg-bridge-panel p-3 flex flex-col justify-between gap-2.5">
          <div className="flex justify-between items-center border-b border-bridge-border/60 pb-1.5">
            <h3 className="text-xs font-bold tracking-[0.15em] text-cyan-neon uppercase">
              Propulsion &amp; Fuel
            </h3>
            <div className="flex rounded border border-bridge-border/60 bg-black/50 p-0.5">
              {(["Space", "Atmosphere", "Underwater"] as FlightEnvironment[]).map((env) => (
                <button
                  key={env}
                  onClick={() => setEnvironment(env)}
                  className={`px-1.5 py-0.2 text-[9px] font-bold uppercase transition-colors rounded-sm cursor-pointer ${
                    environment === env
                      ? "bg-cyan-neon text-black font-extrabold"
                      : "text-muted-foreground hover:text-cyan-neon"
                  }`}
                >
                  {env.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-baseline">
              <div>
                <span className="text-[9px] text-muted-foreground block uppercase">Flying Speed</span>
                <span className={`text-base font-bold font-mono ${
                  slowedReductionAmount > 0 ? "text-red-400" : "text-cyan-neon"
                }`}>
                  {envStats.speed}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-muted-foreground block uppercase">Turn Rating</span>
                <span className="text-sm font-bold font-mono text-amber-300">{envStats.turn}</span>
              </div>
            </div>

            <div className="bg-black/40 p-2 rounded border border-bridge-border/40">
              <div className="flex justify-between items-baseline text-[10px]">
                <span className="text-muted-foreground uppercase">Fuel Reserves:</span>
                <span className="font-bold text-cyan-neon font-mono">{fuelRemaining} / {fuelMax} Units</span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-sm overflow-hidden border border-bridge-border/30 mt-1">
                <div
                  className="h-full bg-cyan-neon transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, (fuelRemaining / fuelMax) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 pt-1 border-t border-bridge-border/40">
            <button
              onClick={() => handleConsumeFuelCustom(envStats.baseUnit)}
              className="px-2 py-0.5 rounded border border-cyan-neon/40 bg-cyan-neon/10 text-[9px] font-bold text-cyan-neon hover:bg-cyan-neon/20 cursor-pointer"
            >
              {envStats.labelStep1}
            </button>
            <button
              onClick={() => handleConsumeFuelCustom(envStats.baseUnit * (environment === "Space" ? 3 : 5))}
              className="px-2 py-0.5 rounded border border-cyan-neon/40 bg-cyan-neon/10 text-[9px] font-bold text-cyan-neon hover:bg-cyan-neon/20 cursor-pointer"
            >
              {envStats.labelStep5}
            </button>
            <button
              onClick={() => handleRefundFuelCustom(envStats.baseUnit)}
              className="px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-[9px] font-bold text-amber-300 hover:bg-amber-500/20 cursor-pointer"
            >
              {envStats.labelRefund}
            </button>
          </div>
        </section>

        {/* CARD 2: CAMPAIGN TIME & ASTROGATION TRACKER */}
        <section className="rounded-md border border-bridge-border bg-bridge-panel p-3 flex flex-col justify-between gap-2.5">
          <div className="flex justify-between items-center border-b border-bridge-border/60 pb-1.5">
            <h3 className="text-xs font-bold tracking-[0.15em] text-cyan-neon uppercase">
              Campaign Time
            </h3>
            <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border uppercase ${astrogationStatus.color}`}>
              {astrogationStatus.label}
            </span>
          </div>

          <div className="flex items-center justify-between bg-black/40 p-2 rounded border border-bridge-border/40">
            <div>
              <span className="text-[9px] text-muted-foreground uppercase block">Elapsed Time</span>
              <span className="text-base font-bold text-cyan-neon font-mono">Day {campaignDays}</span>
              <span className="text-[8px] text-muted-foreground block">Sync: Day {syncDay} ({daysElapsedSinceSync}d old)</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onUpdateDay && onUpdateDay((prev: number) => Math.max(0, prev - 1), false)}
                className="px-2 py-1 rounded border border-cyan-neon/40 bg-cyan-neon/10 text-xs text-cyan-neon font-bold cursor-pointer"
                title="Step back 1 day (No rations)"
              >
                -1D
              </button>
              <button
                onClick={() => onUpdateDay && onUpdateDay((prev: number) => prev + 1, true)}
                className="px-2.5 py-1 rounded border border-cyan-neon/60 bg-cyan-neon/20 text-xs text-cyan-neon font-bold cursor-pointer"
                title="Advance 1 day (Standard: consumes daily rations)"
              >
                +1D
              </button>
            </div>
          </div>

          {/* Shore Leave Mini-Bar */}
          <div className="p-2 rounded bg-amber-950/20 border border-amber-500/30 flex items-center justify-between text-[10px] gap-2">
            <div className="flex items-center gap-1.5 text-amber-300">
              <CalendarOff className="h-3.5 w-3.5 shrink-0" />
              <span className="font-bold uppercase text-[9px]">Off-Ship:</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onUpdateDay?.((prev: number) => prev + 1, false)}
                className="px-2 py-0.5 rounded border border-amber-400/60 bg-amber-500/20 text-amber-300 font-bold uppercase text-[9px] cursor-pointer"
              >
                +1D
              </button>

              <div className="flex items-center gap-0.5 bg-black/60 p-0.5 rounded border border-amber-500/30">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={awayMissionDaysInput}
                  onChange={(e) => setAwayMissionDaysInput(e.target.value)}
                  className="w-8 text-center bg-black border-none text-[10px] text-amber-300 font-bold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const days = parseInt(awayMissionDaysInput, 10)
                    if (!isNaN(days) && days > 0) onUpdateDay?.((prev: number) => prev + days, false)
                  }}
                  className="px-1.5 py-0.2 rounded bg-amber-500/30 border border-amber-400/60 text-amber-200 text-[9px] font-bold uppercase cursor-pointer"
                >
                  <FastForward className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* CARD 3: ACTIVE HYPERSPACE VECTOR */}
        <section className="rounded-md border border-bridge-border bg-bridge-panel p-3 flex flex-col justify-between gap-2.5">
          <div className="flex justify-between items-center border-b border-bridge-border/60 pb-1.5">
            <h3 className="text-xs font-bold tracking-[0.15em] text-cyan-neon uppercase">
              FTL Vector
            </h3>
            <span className={`text-[8px] font-semibold px-2 py-0.5 rounded border uppercase ${
              activeJourney ? "bg-cyan-neon/10 text-cyan-neon border-cyan-neon/40 animate-pulse" : "bg-black/50 text-muted-foreground border-bridge-border/60"
            }`}>
              {activeJourney ? "IN HYPERSPACE" : "SUBLIGHT"}
            </span>
          </div>

          <div className="bg-black/40 p-2.5 rounded border border-bridge-border/40 flex flex-col justify-between h-full gap-2">
            {activeJourney ? (
              <>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-[8px] text-muted-foreground block uppercase">DEST</span>
                    <span className="font-bold text-amber-300 font-mono">{activeJourney.destination}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] text-muted-foreground block uppercase">PROGRESS</span>
                    <span className="font-bold text-emerald-400 font-mono">{daysInTransit}/{duration}D</span>
                  </div>
                </div>

                <div>
                  <div className="h-2 w-full bg-slate-900 rounded-sm overflow-hidden border border-bridge-border/40">
                    <div
                      className="h-full bg-cyan-neon shadow-[0_0_8px_rgba(0,255,255,0.5)] transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="text-right text-[8px] text-muted-foreground mt-0.5">{progressPercent}% Locked</div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-2 text-center my-auto">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  No Active FTL Transit
                </span>
                <button
                  onClick={() => onNavigate?.("navcomputer")}
                  className="mt-2 rounded border border-cyan-neon/40 bg-cyan-neon/10 px-2 py-0.5 text-[9px] font-bold text-cyan-neon hover:bg-cyan-neon/20 cursor-pointer"
                >
                  OPEN NAVCOMPUTER &rarr;
                </button>
              </div>
            )}
          </div>

          {activeJourney && (
            <button
              type="button"
              onClick={() => onNavigate?.("navcomputer")}
              className="w-full py-1 text-center rounded border border-cyan-neon/40 bg-cyan-neon/10 text-[9px] font-bold text-cyan-neon hover:bg-cyan-neon/20 cursor-pointer uppercase"
            >
              Navcomputer &rarr;
            </button>
          )}
        </section>
      </div>

      {/* ========================================================================= */}
      {/* 5. ROW 3: CHASSIS TACTICAL MANEUVERS (TIER SPECIAL FEATURES)              */}
      {/* ========================================================================= */}
      {(hasPinpointStrike || hasRetroThrusters || hasVersatileSnubfighter || hasEvasiveManeuvers || hasAdaptiveArmor) && (
        <section className="rounded-md border border-cyan-neon/60 bg-bridge-panel p-3 shadow-[0_0_15px_rgba(0,255,255,0.06)] flex flex-col gap-2.5">
          <div className="flex justify-between items-center border-b border-bridge-border/60 pb-1.5">
            <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase">
              Chassis Tactical Maneuvers (Tier {shipTier})
            </h3>
            <button
              onClick={handleShipRecharge}
              className="rounded border border-bridge-border bg-black/60 px-2 py-0.5 text-[9px] font-mono text-muted-foreground hover:text-amber-300 hover:border-amber-400/50 uppercase cursor-pointer"
            >
              Recharge (Reset)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
            {hasPinpointStrike && (
              <div className="rounded border border-bridge-border/70 bg-black/40 p-2.5 flex flex-col justify-between gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-cyan-neon uppercase text-[11px]">Pinpoint Strike</span>
                  <span className="font-bold text-cyan-neon text-[10px]">
                    {pinpointMaxUses - currentPinpointUses}/{pinpointMaxUses}
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 line-clamp-2">
                  Add +{pinpointDieInfo.type} to hit or save DC. Bypasses shields directly to hull damage.
                </p>
                <button
                  disabled={currentPinpointUses >= pinpointMaxUses || isRollingPinpoint}
                  onClick={handleActivatePinpointStrike}
                  className="w-full py-1 rounded font-bold text-[9px] uppercase border border-cyan-neon bg-cyan-neon/20 hover:bg-cyan-neon/30 text-cyan-neon disabled:opacity-30 cursor-pointer"
                >
                  {isRollingPinpoint ? "Rolling..." : lastPinpointRoll ? `Fired (+${lastPinpointRoll})` : `Fire (+${pinpointDieInfo.type})`}
                </button>
              </div>
            )}

            {hasRetroThrusters && (
              <div className="rounded border border-bridge-border/70 bg-black/40 p-2.5 flex flex-col justify-between gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-cyan-neon uppercase text-[11px]">Retro Thrusters</span>
                  <span className={`text-[10px] font-bold ${isRetroUsed ? "text-red-400" : "text-emerald-400"}`}>
                    {isRetroUsed ? "EXPENDED" : "READY"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 line-clamp-2">
                  Reaction when hit: Move up to 50 ft in any direction to halve weapon damage.
                </p>
                <button
                  disabled={isRetroUsed}
                  onClick={handleFireRetroThrusters}
                  className="w-full py-1 rounded font-bold text-[9px] uppercase border border-amber-400 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 disabled:opacity-30 cursor-pointer"
                >
                  {isRetroUsed ? "Expended" : "Fire Retro Burst"}
                </button>
              </div>
            )}

            {hasEvasiveManeuvers && (
              <div className="rounded border border-bridge-border/70 bg-black/40 p-2.5 flex flex-col justify-between gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-amber-300 uppercase text-[11px]">Evasive Maneuver</span>
                  <span className="font-bold text-amber-300 text-[10px]">
                    {evasiveMax - evasiveManeuversUsed}/{evasiveMax}
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 line-clamp-2">
                  Reaction on initiative: Move immediately {evasiveDieInfo.type} x 50 ft before turn order.
                </p>
                <button
                  disabled={evasiveManeuversUsed >= evasiveMax || isRollingPinpoint}
                  onClick={handleRollEvasiveManeuvers}
                  className="w-full py-1 rounded font-bold text-[9px] uppercase border border-amber-400 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 disabled:opacity-30 cursor-pointer"
                >
                  {lastEvasiveRoll ? `Rolled (+${lastEvasiveRoll * 50} ft)` : `Roll (${evasiveDieInfo.type})`}
                </button>
              </div>
            )}

            {hasAdaptiveArmor && (
              <div className="rounded border border-bridge-border/70 bg-black/40 p-2.5 flex flex-col justify-between gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-cyan-neon uppercase text-[11px]">Adaptive Armor</span>
                  <span className="font-bold text-cyan-300 text-[10px]">
                    {adaptiveMax - adaptiveArmorUsed}/{adaptiveMax}
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 line-clamp-2">
                  Reaction when hit: Add +CON mod (+{Math.max(1, Math.floor(((shipConfig?.stats?.constitution ?? 10) - 10)/2))}) to AC.
                </p>
                <button
                  disabled={adaptiveArmorUsed >= adaptiveMax}
                  onClick={handleActivateAdaptiveArmor}
                  className="w-full py-1 rounded font-bold text-[9px] uppercase border border-cyan-400 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 disabled:opacity-30 cursor-pointer"
                >
                  Trigger (+CON AC)
                </button>
              </div>
            )}

            {hasVersatileSnubfighter && (
              <div className="rounded border border-bridge-border/70 bg-black/40 p-2.5 flex flex-col justify-between gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-purple-300 uppercase text-[11px]">Versatile Snub</span>
                  <span className="font-bold text-purple-300 text-[10px]">
                    {versatileMaxUses - currentVersatileUses}/{versatileMaxUses}
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 line-clamp-2">
                  Reaction on check, attack, or save: gain advantage before DM announces outcome.
                </p>
                <button
                  disabled={currentVersatileUses >= versatileMaxUses}
                  onClick={handleUseVersatileSnubfighter}
                  className="w-full py-1 rounded font-bold text-[9px] uppercase border border-purple-400 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 disabled:opacity-30 cursor-pointer"
                >
                  Trigger Advantage
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Installed Station Modifications */}
      <section className="rounded-md border border-bridge-border bg-bridge-panel p-3">
        <h3 className="mb-2 text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase border-b border-bridge-border/60 pb-1">
          Installed Hardware Modifications
        </h3>
        <StationModifications 
          station="Engines" 
          installedMods={installedMods} 
          onRemoveMod={onRemoveMod} 
        />
      </section>

      {/* ========================================================================= */}
      {/* MODAL 1: DRILL-DOWN ENGINE START-UP & DURESS TAKEOFF                      */}
      {/* ========================================================================= */}
      {showStartupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-bridge-panel border border-cyan-neon/70 rounded-md p-5 max-w-xl w-full flex flex-col gap-4 shadow-[0_0_25px_rgba(0,255,255,0.15)] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-bridge-border/60 pb-2">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold tracking-widest text-cyan-neon uppercase">
                  Ship Start-Up &amp; Initiation Protocol
                </h3>
              </div>
              <button
                onClick={() => setShowStartupModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300">
                Chassis Warm-Up: <strong className="text-amber-300">{normalStartupTime}</strong>
              </span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                duressCondition === "advantage"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  : duressCondition === "disadvantage"
                  ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                  : "bg-cyan-neon/10 text-cyan-neon border-cyan-neon/40"
              }`}>
                Repair: {duressCondition.toUpperCase()} ({currentHull}/{maxHull} HP)
              </span>
            </div>

            {/* Stepper Display */}
            <div className="bg-black/60 p-3 rounded border border-bridge-border/60 flex flex-col gap-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-200">
                  Procedures Completed: <strong className="text-cyan-neon text-sm">{initiationProcedures} / {targetProcedures}</strong>
                </span>
                <span className={`text-[10px] font-bold ${initiationProcedures >= targetProcedures ? "text-emerald-400" : "text-amber-300"}`}>
                  {initiationProcedures >= targetProcedures ? "ENGINES PRIMED" : "INCOMPLETE"}
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-900 rounded-sm overflow-hidden border border-bridge-border/50">
                <div
                  className={`h-full transition-all duration-300 ${
                    initiationProcedures >= targetProcedures ? "bg-emerald-400" : "bg-cyan-neon"
                  }`}
                  style={{ width: `${Math.min(100, (initiationProcedures / targetProcedures) * 100)}%` }}
                />
              </div>
              <div className="flex justify-end gap-1 font-mono pt-1">
                <button
                  onClick={() => setInitiationProcedures((prev) => Math.max(0, prev - 1))}
                  className="px-2 py-0.5 bg-black border border-bridge-border text-xs rounded text-slate-300 cursor-pointer"
                >
                  -1
                </button>
                <button
                  onClick={() => setInitiationProcedures((prev) => Math.min(targetProcedures, prev + 1))}
                  className="px-2 py-0.5 bg-black border border-bridge-border text-xs rounded text-slate-300 cursor-pointer"
                >
                  +1
                </button>
              </div>
            </div>

            {/* Duress Piloting Check */}
            <div className="bg-black/50 p-3 rounded border border-bridge-border/60 flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-cyan-neon uppercase">Duress Piloting Check</span>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-muted-foreground uppercase">Mod:</span>
                  <input
                    type="number"
                    value={pilotModInput}
                    onChange={(e) => setPilotModInput(parseInt(e.target.value, 10) || 0)}
                    className="w-10 bg-black border border-bridge-border text-center rounded text-cyan-neon font-bold py-0.5 text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleRollDuressCheck}
                  disabled={initiationProcedures >= targetProcedures}
                  className="flex-1 py-1.5 rounded border border-cyan-neon/60 bg-cyan-neon/20 hover:bg-cyan-neon/30 text-xs font-bold text-cyan-neon uppercase disabled:opacity-40 cursor-pointer"
                >
                  Roll Duress Check
                </button>
                <form onSubmit={handleApplyManualProcedures} className="flex gap-1">
                  <input
                    type="number"
                    placeholder="+Manual"
                    value={manualProcInput}
                    onChange={(e) => setManualProcInput(e.target.value)}
                    className="w-16 bg-black border border-bridge-border text-xs text-center text-slate-200 px-1 rounded"
                  />
                  <button
                    type="submit"
                    disabled={initiationProcedures >= targetProcedures}
                    className="px-2 bg-slate-900 border border-bridge-border text-xs font-bold text-muted-foreground hover:text-white rounded disabled:opacity-40 cursor-pointer"
                  >
                    Add
                  </button>
                </form>
              </div>

              {lastDuressRollLog && (
                <div className="text-[10px] font-mono text-amber-300 bg-black/60 p-1.5 rounded border border-bridge-border/40">
                  {lastDuressRollLog}
                </div>
              )}
            </div>

            {/* Forced Takeoff Interlock Trigger */}
            <div className="border-t border-bridge-border/60 pt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                {initiationProcedures < targetProcedures ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setForcedStartupSafety((prev) => !prev)}
                      className={`p-1.5 rounded border transition cursor-pointer ${
                        forcedStartupSafety
                          ? "border-red-500 bg-red-500/20 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                          : "border-bridge-border bg-black/50 text-slate-500"
                      }`}
                      title="Safety Interlock: Click to enable forced launch"
                    >
                      {forcedStartupSafety ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </button>
                    <span className="text-[10px] text-muted-foreground">
                      {forcedStartupSafety ? "SAFETY INTERLOCK DISENGAGED" : "Safety locked (Emergency takeoff guarded)"}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-emerald-400 font-bold uppercase">Ready for Clean Ignition</span>
                )}

                <button
                  disabled={initiationProcedures < targetProcedures && !forcedStartupSafety}
                  onClick={handleEngageStartup}
                  className={`px-4 py-2 rounded text-xs font-bold uppercase transition cursor-pointer ${
                    initiationProcedures >= targetProcedures
                      ? "border border-emerald-400 bg-emerald-500/20 text-emerald-300 animate-pulse"
                      : forcedStartupSafety
                      ? "border border-amber-400 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                      : "border border-bridge-border bg-slate-900 text-slate-600 cursor-not-allowed"
                  }`}
                >
                  {initiationProcedures >= targetProcedures ? "Engage Engines" : `Force Start (${initiationProcedures}/10)`}
                </button>
              </div>

              {mishapResultLog && (
                <div className="p-2 rounded bg-black/80 border border-amber-400/50 text-[11px] text-amber-300">
                  {mishapResultLog}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-[9px] text-muted-foreground border-t border-bridge-border/40 pt-2">
              <button onClick={handleResetStartup} className="hover:text-white underline cursor-pointer">
                Reset Startup State
              </button>
              <button onClick={() => setShowStartupModal(false)} className="hover:text-cyan-neon font-bold cursor-pointer">
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DRILL-DOWN PILOT ACTIONS & TACTICS DATABASE                      */}
      {/* ========================================================================= */}
      {showActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-bridge-panel border border-cyan-neon/70 rounded-md p-5 max-w-3xl w-full flex flex-col gap-4 shadow-[0_0_25px_rgba(0,255,255,0.15)] max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-bridge-border/60 pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-cyan-neon" />
                <h3 className="text-sm font-bold tracking-widest text-cyan-neon uppercase">
                  Helmsman Action Reference Database
                </h3>
              </div>
              <button
                onClick={() => setShowActionModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 overflow-hidden min-h-[300px]">
              {/* Action list */}
              <div className="flex flex-col gap-1 overflow-y-auto pr-1">
                {PILOT_ACTIONS.map((action) => {
                  const isSelected = selectedPilotAction.name === action.name
                  return (
                    <button
                      key={action.name}
                      onClick={() => setSelectedPilotAction(action)}
                      className={`flex items-center justify-between text-left px-2.5 py-1.5 rounded text-xs transition border cursor-pointer ${
                        isSelected
                          ? "bg-cyan-neon/20 border-cyan-neon text-cyan-neon font-bold"
                          : "bg-black/40 border-bridge-border/60 text-slate-300 hover:text-cyan-neon"
                      }`}
                    >
                      <span>{action.name}</span>
                      <span className="text-[7px] px-1 py-0.2 rounded uppercase border border-bridge-border text-muted-foreground">
                        {action.category.split(" ")[0]}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Action Description */}
              <div className="md:col-span-2 bg-black/50 p-4 rounded border border-bridge-border/60 flex flex-col justify-between overflow-y-auto">
                <div>
                  <div className="flex justify-between items-center border-b border-bridge-border/40 pb-1.5 mb-2">
                    <h4 className="text-sm font-bold text-cyan-neon uppercase">
                      {selectedPilotAction.name}
                    </h4>
                    <span className="text-[9px] uppercase text-muted-foreground">
                      {selectedPilotAction.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                    {selectedPilotAction.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-bridge-border/40 text-[9px] text-muted-foreground italic flex justify-between mt-4">
                  <span>SW5e Starship Combat Standard Rulebook</span>
                  <span className="text-cyan-neon">HELM PROTOCOL</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-bridge-border/40 pt-2">
              <button
                onClick={() => setShowActionModal(false)}
                className="px-4 py-1 rounded bg-cyan-neon/10 border border-cyan-neon/40 text-cyan-neon text-xs font-bold uppercase hover:bg-cyan-neon/20 cursor-pointer"
              >
                Close Reference
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}