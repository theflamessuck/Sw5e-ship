"use client"

import { useState, useMemo, useEffect } from "react"
import { 
  Cpu, 
  Zap, 
  RotateCw, 
  Terminal, 
  Shield, 
  Crosshair, 
  Wrench, 
  Gauge, 
  Sliders, 
  Anchor, 
  ArrowUp, 
  ArrowDown,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Sparkles,
  Wind,
  BatteryCharging,
  Fuel,
  Activity,
  Radio,
  Hexagon,
  ShieldAlert,
  Users,
  UserCheck,
  UserPlus,
  Lock,
  Unlock,
  Clock,
  UserMinus,
  Flame,
  PowerOff,
  X
} from "lucide-react"
import { ShipStats } from "./ship-stats"
import { StationModifications, Modification } from "./ship-modifications"
import { type ShipConfig } from "./ship-setup"
import type { ActiveStatus } from "./defense-station"
import type { ManifestMember, ShipCompartmentId } from "./bridge-dashboard"
import { getCrewRole } from "./bridge-dashboard"

export interface RechargeResultPayload {
  newHull: number
  newHullDiceSpent: number
  newShields: number
  newShieldDiceSpent: number
}

interface EngineeringStationProps {
  isPoweredOn?: boolean
  onSetPoweredOn?: (powered: boolean) => void
  maxPowerDice?: number
  availablePowerDice?: number
  powerDieType?: string
  recoveryRate?: number
  onCycleReactor?: (generatedAmount?: number) => void
  hullCurrent?: number
  hullMax?: number
  shieldCurrent?: number
  shieldMax?: number
  shieldTemp?: number
  onShieldChange?: (current: number, max: number, temp?: number) => void
  autoShieldRegen?: boolean
  shieldRegenThreshold?: number
  spentShieldDice?: number
  onSpentShieldDiceChange?: React.Dispatch<React.SetStateAction<number>>
  spentHullDice?: number
  onSpentHullDiceChange?: React.Dispatch<React.SetStateAction<number>>
  onBoostSpeed?: (bonus: number) => void
  onBoostShields?: (tempShields: number) => void
  onBoostWeapons?: () => void
  onPatchHull?: (amount: number) => void
  strengthMod?: number
  constitutionMod?: number
  patchSkillMod?: number
  regulationSkillMod?: number
  shipConfig?: ShipConfig
  installedMods?: Modification[]
  onRemoveMod?: (instanceId: string) => void
  stationPools?: Record<string, number>
  onUpdateStationPools?: React.Dispatch<React.SetStateAction<Record<string, number>>>
  sharedPoolDice?: number                         
  onUpdateSharedPool?: React.Dispatch<React.SetStateAction<number>>
  onApplyFullRecharge?: (payload: RechargeResultPayload) => void
  boostActionUsed?: boolean
  onBoostActionUsedChange?: (used: boolean) => void
  selectedBoostType?: "engines" | "shields" | "weapons" | null
  onSelectedBoostTypeChange?: (type: "engines" | "shields" | "weapons" | null) => void
  boostFeedback?: string | null
  onBoostFeedbackChange?: (feedback: string | null) => void
  engineBoostTurnsRemaining?: number
  shieldBoostTurnsRemaining?: number
  standingByUsed?: boolean
  onUseStandingBy?: () => void
  leafOnTheWindUsed?: boolean
  onUseLeafOnTheWind?: () => void
  versatileTransportUsed?: number
  onUpdateVersatileTransportUsed?: (count: number | ((prev: number) => number)) => void
  bestShipInVerseUsed?: boolean
  onUpdateBestShipInVerseUsed?: (used: boolean | ((prev: boolean) => boolean)) => void
  onAddStatus?: (status: ActiveStatus) => void
  systemDamageLevel?: number
  onUpdateSystemDamageLevel?: (level: number | ((prev: number) => number)) => void
  manifest?: ManifestMember[]
  onAssignCrew?: (memberId: string, targetLocation: ShipCompartmentId) => void
  onToggleTurn?: (memberId: string) => void
}

type StationKey = "engines" | "communications" | "weapons" | "sensors" | "defense"

const STATION_NAMES: Record<StationKey, string> = {
  engines: "Engines",
  communications: "Communications",
  weapons: "Weapons",
  sensors: "Sensors",
  defense: "Defense",
}

const getBaseDiceBySize = (size?: string): number => {
  switch (size?.toLowerCase()) {
    case "tiny": return 1
    case "small": return 3
    case "medium": return 4
    case "large": return 7
    case "huge": return 10
    case "gargantuan": return 15
    default: return 3
  }
}

export function EngineeringStation({
  isPoweredOn = true,
  onSetPoweredOn,
  maxPowerDice,
  availablePowerDice = 4,
  powerDieType,
  recoveryRate,
  onCycleReactor,
  hullCurrent,
  hullMax,
  shieldCurrent,
  shieldMax,
  shieldTemp = 0,
  onShieldChange,
  autoShieldRegen = false,
  shieldRegenThreshold = 50,
  spentShieldDice = 0,
  onSpentShieldDiceChange,
  spentHullDice = 0,
  onSpentHullDiceChange,
  onBoostSpeed,
  onBoostShields,
  onBoostWeapons,
  onPatchHull,
  strengthMod,
  constitutionMod,
  patchSkillMod,
  regulationSkillMod,
  shipConfig,
  installedMods = [],
  onRemoveMod,
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
  onApplyFullRecharge,
  boostActionUsed: externalBoostActionUsed,
  onBoostActionUsedChange,
  selectedBoostType: externalSelectedBoostType,
  onSelectedBoostTypeChange,
  boostFeedback: externalBoostFeedback,
  onBoostFeedbackChange,
  engineBoostTurnsRemaining = 0,
  shieldBoostTurnsRemaining = 0,
  standingByUsed = false,
  onUseStandingBy,
  leafOnTheWindUsed = false,
  onUseLeafOnTheWind,
  versatileTransportUsed = 0,
  onUpdateVersatileTransportUsed,
  bestShipInVerseUsed = false,
  onUpdateBestShipInVerseUsed,
  onAddStatus,
  systemDamageLevel = 0,
  onUpdateSystemDamageLevel,
  manifest = [],
  onAssignCrew,
  onToggleTurn,
}: EngineeringStationProps) {
  const getModFromScore = (score?: number) => (score !== undefined ? Math.floor((score - 10) / 2) : 0)
  const formatMod = (mod: number) => (mod >= 0 ? `+${mod}` : `${mod}`)

  const assignedCrew = useMemo(() => {
    return manifest
      .filter((m) => m.location === "engineering" && !m.isPassenger)
      .sort((a, b) => a.assignedOrder - b.assignedOrder)
  }, [manifest])

  const availablePersonnel = useMemo(() => {
    return manifest.filter((m) => m.location !== "engineering" && !m.isPassenger)
  }, [manifest])

  const chiefEngineer = assignedCrew[0] || null
  const engineeringSupport = assignedCrew.slice(1)

  const effectiveMaxPowerDice = shipConfig?.maxPowerDice ?? maxPowerDice ?? 0
  const effectivePowerDieType = shipConfig?.powerDieType ?? powerDieType ?? "d6"
  const effectiveRecoveryRate = shipConfig?.recoveryRate ?? recoveryRate ?? 1
  const effectiveHullMax = shipConfig?.hullMax ?? hullMax ?? 0
  const effectiveShieldMax = shipConfig?.maxShields ?? shieldMax ?? 0
  const currentActualHull = hullCurrent ?? effectiveHullMax
  const currentActualShields = shieldCurrent ?? effectiveShieldMax
  const effectiveHullDieType = shipConfig?.hullDiceType ?? "d8"
  
  const rawReactorType = shipConfig?.reactorType ?? "Fuel Cell Reactor"
  const reactorType = rawReactorType.toLowerCase()

  const powerCoupling = shipConfig?.powerCoupling ?? shipConfig?.couplingType ?? "Direct Power Coupling"
  const isDistributed = powerCoupling.toLowerCase().includes("distributed")
  const isHubAndSpoke = powerCoupling.toLowerCase().includes("hub") || powerCoupling.toLowerCase().includes("spoke")
  const isDirect = !isDistributed && !isHubAndSpoke

  const effectiveStrengthMod = shipConfig?.stats?.strength !== undefined
    ? getModFromScore(shipConfig.stats.strength) 
    : (strengthMod ?? 0)

  const effectiveConstitutionMod = shipConfig?.stats?.constitution !== undefined
    ? getModFromScore(shipConfig.stats.constitution)
    : (constitutionMod ?? 0)

  const effectiveIntelligenceMod = shipConfig?.stats?.intelligence !== undefined
    ? getModFromScore(shipConfig.stats.intelligence)
    : 0

  const effectivePatchSkillMod = shipConfig?.skills?.patch ?? patchSkillMod ?? effectiveConstitutionMod
  const effectiveRegulationSkillMod = shipConfig?.skills?.regulation ?? regulationSkillMod ?? effectiveConstitutionMod

  const shipSize = shipConfig?.size || "small"
  const isMedium = shipSize.toLowerCase() === "medium"
  const shipTier = shipConfig?.tier ?? 0
  const tierUses = Math.max(1, shipTier)
  const baseChassisDice = getBaseDiceBySize(shipConfig?.size)
  const calculatedTotalShipDice = baseChassisDice + shipTier

  const maxHullDice = (shipConfig as any)?.hull?.totalHD ?? (shipConfig as any)?.totalHitDice ?? calculatedTotalShipDice
  const availableHullDice = Math.max(0, maxHullDice - spentHullDice)

  const maxShieldDice = (shipConfig as any)?.shields?.totalSD ?? (shipConfig as any)?.totalShieldDice ?? calculatedTotalShipDice
  const availableShieldDice = Math.max(0, maxShieldDice - spentShieldDice)
  const shieldDiceToRestore = Math.max(1, Math.floor(maxShieldDice / 2))
  const newSpentShieldDiceValue = Math.max(0, spentShieldDice - shieldDiceToRestore)

  const maxSharedPool = isDirect ? effectiveMaxPowerDice : (isHubAndSpoke ? 2 : 0)
  const maxStationCapacity = isDistributed ? 2 : (isHubAndSpoke ? 1 : 0)

  // --- STARTUP / SCRAM PROCEDURES MODAL STATE ---
  const [showStartupModal, setShowStartupModal] = useState<boolean>(false)
  const [forcedStartupSafety, setForcedStartupSafety] = useState<boolean>(false)
  const [initiationProcedures, setInitiationProcedures] = useState<number>(isPoweredOn ? 10 : 0)
  const targetProcedures = 10

  useEffect(() => {
    if (isPoweredOn && initiationProcedures < targetProcedures) {
      setInitiationProcedures(10)
    } else if (!isPoweredOn && initiationProcedures >= targetProcedures) {
      setInitiationProcedures(0)
    }
  }, [isPoweredOn])

  const normalStartupTime = useMemo(() => {
    switch (shipSize.toLowerCase()) {
      case "tiny": return "1 Minute"
      case "small": return "2 Minutes"
      case "medium": return "5 Minutes"
      case "large": return "10 Minutes"
      case "huge": return "30 Minutes"
      case "gargantuan": return "60 Minutes"
      default: return "5 Minutes"
    }
  }, [shipSize])

  const duressCondition: "advantage" | "disadvantage" | "normal" = useMemo(() => {
    if (currentActualHull < effectiveHullMax) return "disadvantage"
    if (currentActualHull >= effectiveHullMax && currentActualShields >= effectiveShieldMax) return "advantage"
    return "normal"
  }, [currentActualHull, effectiveHullMax, currentActualShields, effectiveShieldMax])

  const defaultEngMod = shipConfig?.skills?.regulation ?? effectiveConstitutionMod
  const [engModInput, setEngModInput] = useState<number>(defaultEngMod)
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

    const total = keptD20 + engModInput
    const evalResult = evaluateDuressCheck(total)

    setInitiationProcedures((prev) => Math.min(targetProcedures, prev + evalResult.gained))
    setLastDuressRollLog(
      `Check: d20 [${duressCondition !== "normal" ? `${rollA}, ${rollB} -> Kept ${keptD20}` : keptD20}] + Mod (${engModInput >= 0 ? `+${engModInput}` : engModInput}) = ${total} (${evalResult.label})`
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
    if (onSetPoweredOn) onSetPoweredOn(false)
  }

  const handleShutdownShip = () => {
    if (confirm("CONFIRM REACTOR SCRAM: Shut down main reactor and drop ship to cold & dark?")) {
      setInitiationProcedures(0)
      setMishapResultLog("🛑 REACTOR SCRAMMED: Vessel power grid offline.")
      setForcedStartupSafety(false)
      if (onSetPoweredOn) onSetPoweredOn(false)
      setShowStartupModal(false)
    }
  }

  const resolveMishapTableRoll = (dieRoll: number, bonus: number, isRecursiveSecondRoll: boolean = false): string => {
    const total = dieRoll + bonus
    let description = ""

    if (dieRoll === 20 && bonus === 0) {
      description = "Natural 20 with 0 procedures! Ship is unscathed, but starts with 0 power dice available."
      if (onUpdateSharedPool) onUpdateSharedPool(0)
      if (onUpdateStationPools) {
        onUpdateStationPools({ engines: 0, communications: 0, weapons: 0, sensors: 0, defense: 0 })
      }
    } else if (total >= 20) {
      description = `Total ${total} (20+): Clean takeoff! The ship suffers no adverse consequences.`
    } else if (total >= 18) {
      description = `Total ${total} (18-19): Navcomputer is disabled until ship recharges.`
      onAddStatus?.({
        id: `navcomputer-disabled-${Date.now()}`,
        title: "NAVCOMPUTER DISABLED // OFFLINE",
        effect: "Hyperspace calculations offline. Blind jumps without calculations risk catastrophic drift unless a Nat 20 is rolled.",
        duration: "Until Ship Recharges",
      })
    } else if (total >= 15) {
      description = `Total ${total} (15-17): Ship gains 1 level of slowed until ship recharges.`
      onAddStatus?.({
        id: `slowed-mishap-${Date.now()}`,
        title: "SLOWED (LVL 1)",
        effect: "Speed reduced by 150 feet due to thermal engine strain.",
        duration: "Until Ship Recharges",
        level: 1,
      })
    } else if (total >= 12) {
      description = `Total ${total} (12-14): Sensor overload! Ship is blinded until ship recharges.`
      onAddStatus?.({
        id: `blinded-mishap-${Date.now()}`,
        title: "BLINDED",
        effect: "Sensors overloaded by core discharge. Attacks against ship have advantage; ship attacks suffer disadvantage.",
        duration: "Until Ship Recharges",
      })
    } else if (total >= 9) {
      description = `Total ${total} (9-11): Structural stress. Ship suffers 1 level of system damage.`
      onUpdateSystemDamageLevel?.((prev) => Math.min(6, (Number(prev) || 0) + 1))
    } else if (total >= 6) {
      description = `Total ${total} (6-8): Severe surge! Ship suffers 2 levels of system damage.`
      onUpdateSystemDamageLevel?.((prev) => Math.min(6, (Number(prev) || 0) + 2))
    } else if (total >= 3) {
      description = `Total ${total} (3-5): Critical burnout! Ship suffers 3 levels of system damage.`
      onUpdateSystemDamageLevel?.((prev) => Math.min(6, (Number(prev) || 0) + 3))
    } else {
      description = `Total ${total} (1-2): Catastrophic ignition breach! Ship suffers 4 levels of system damage.`
      onUpdateSystemDamageLevel?.((prev) => Math.min(6, (Number(prev) || 0) + 4))
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
      setMishapResultLog("✅ Optimal Start-Up: All 10 initiation procedures completed cleanly. Primary reactor online.")
      if (onSetPoweredOn) onSetPoweredOn(true)
      return
    }

    const d20 = Math.floor(Math.random() * 20) + 1
    const resultText = resolveMishapTableRoll(d20, initiationProcedures)
    setMishapResultLog(`⚠️ FORCED TAKEOFF (Roll ${d20} + ${initiationProcedures} proc): ${resultText}`)
    if (onSetPoweredOn) onSetPoweredOn(true)
  }

  // --- MODIFICATION FEATURE DETECTION ---
  const hasPowerBackup = installedMods.some((m) => m.name.toUpperCase().includes("POWER BACKUP"))
  const hasEmergencyGenerator = installedMods.some((m) => m.name.toUpperCase().includes("EMERGENCY GENERATOR"))
  const hasDamageControl = installedMods.some((m) => m.name.toUpperCase().includes("DAMAGE CONTROL SYSTEM"))
  const hasAutomatedProtocols = installedMods.some((m) => m.name.toUpperCase().includes("AUTOMATED PROTOCOLS"))
  const hasElectronicBaffle = installedMods.some((m) => m.name.toUpperCase().includes("ELECTRONIC BAFFLE"))
  const hasAltFuelConverter = installedMods.some((m) => m.name.toUpperCase().includes("ALTERNATIVE FUEL CONVERTER"))

  const hasVersatileTransport = isMedium && shipTier >= 3
  const versatileMax = 2 * shipTier
  const hasBestShip = isMedium && shipTier >= 5

  const [powerBackupUsed, setPowerBackupUsed] = useState<boolean>(false)
  const [emergencyGenUsed, setEmergencyGenUsed] = useState<boolean>(false)
  const [quickPatchUses, setQuickPatchUses] = useState<number>(0)
  const [baffleUses, setBaffleUses] = useState<number>(0)
  const [altFuelUses, setAltFuelUses] = useState<number>(0)
  const [tacticalFeedback, setTacticalFeedback] = useState<string | null>(null)

  const [isPowerRoutingUnlocked, setIsPowerRoutingUnlocked] = useState<boolean>(false)

  const [priorityOrder, setPriorityOrder] = useState<StationKey[]>([
    "engines",
    "communications",
    "weapons",
    "sensors",
    "defense",
  ])

  const [reactorLog, setReactorLog] = useState<string | null>(null)
  const [isCycling, setIsCycling] = useState<boolean>(false)

  const [localSelectedBoost, setLocalSelectedBoost] = useState<"engines" | "shields" | "weapons" | null>(null)
  const selectedBoostType = externalSelectedBoostType !== undefined ? externalSelectedBoostType : localSelectedBoost
  const setSelectedBoostType = (val: "engines" | "shields" | "weapons" | null) => {
    if (onSelectedBoostTypeChange) onSelectedBoostTypeChange(val)
    else setLocalSelectedBoost(val)
  }

  const [localBoostUsed, setLocalBoostUsed] = useState<boolean>(false)
  const boostActionUsed = externalBoostActionUsed !== undefined ? externalBoostActionUsed : localBoostUsed
  const setBoostActionUsed = (val: boolean) => {
    if (onBoostActionUsedChange) onBoostActionUsedChange(val)
    else setLocalBoostUsed(val)
  }

  const [localBoostFeedback, setLocalBoostFeedback] = useState<string | null>(null)
  const boostFeedback = externalBoostFeedback !== undefined ? externalBoostFeedback : localBoostFeedback
  const setBoostFeedback = (val: string | null) => {
    if (onBoostFeedbackChange) onBoostFeedbackChange(val)
    else setLocalBoostFeedback(val)
  }

  const [manualRollInput, setManualRollInput] = useState<string>("")

  const [rechargeStep, setRechargeStep] = useState<"idle" | "spending">("idle")
  const [diceCountToSpend, setDiceCountToSpend] = useState<number>(1)
  const [rawRollTotalInput, setRawRollTotalInput] = useState<string>("")
  const [rechargeFeedback, setRechargeFeedback] = useState<string | null>(null)

  const [patchFeedback, setPatchFeedback] = useState<string | null>(null)

  const missingHull = Math.max(0, effectiveHullMax - currentActualHull)
  const patchDC = Math.max(10, Math.floor(missingHull / 2))

  const movePriority = (index: number, direction: "up" | "down") => {
    if (!isPowerRoutingUnlocked) return
    const newOrder = [...priorityOrder]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newOrder.length) return
    const temp = newOrder[index]
    newOrder[index] = newOrder[targetIndex]
    newOrder[targetIndex] = temp
    setPriorityOrder(newOrder)
  }

  const handleCycleReactor = () => {
    if (isCycling) return

    setIsCycling(true)
    setReactorLog("Initiating reactor spool-up and power cycle sequence...")
    setIsPowerRoutingUnlocked(false)

    setTimeout(() => {
      let generatedAmount = effectiveRecoveryRate
      let rollDescription = ""

      if (reactorType.includes("ionization")) {
        const roll1d2 = Math.floor(Math.random() * 2) + 1
        generatedAmount = Math.max(0, roll1d2 - 1)
        rollDescription = `Ionization Reactor Cycle: Rolled [1d2 (${roll1d2}) - 1] = +${generatedAmount} Die.`
      } else if (reactorType.includes("power core")) {
        const roll1d2 = Math.floor(Math.random() * 2) + 1
        generatedAmount = roll1d2
        rollDescription = `Power Core Reactor Cycle: Rolled [1d2 (${roll1d2})] = +${generatedAmount} Dice.`
      } else {
        generatedAmount = 1
        rollDescription = `Fuel Cell Reactor Cycle: Stable output = +1 Die.`
      }

      let fullLog = ""
      let shieldRegenLog = ""

      if (autoShieldRegen && currentActualShields !== undefined && effectiveShieldMax > 0) {
        const currentPercent = (currentActualShields / effectiveShieldMax) * 100
        const threshold = shieldRegenThreshold
        const currentSpentDice = spentShieldDice

        if (currentPercent <= threshold && currentSpentDice < maxShieldDice) {
          const shieldRoll = Math.floor(Math.random() * 8) + 1
          const newShieldCurrent = Math.min(effectiveShieldMax, currentActualShields + shieldRoll)

          if (onSpentShieldDiceChange) {
            onSpentShieldDiceChange(currentSpentDice + 1)
          }
          if (onShieldChange) {
            onShieldChange(newShieldCurrent, effectiveShieldMax, shieldTemp)
          }

          shieldRegenLog = ` | Auto-Shield Regen: Consumed 1 shield die, restored +${shieldRoll} shields (${newShieldCurrent}/${effectiveShieldMax}).`
        }
      }

      if (generatedAmount <= 0) {
        fullLog = `${rollDescription} Reactor cycle yielded 0 power dice — no power generated this round.${shieldRegenLog}`
      } else {
        let diceLeftToAllocate = generatedAmount
        let routingNotes: string[] = []

        let updatedShared = sharedPoolDice
        const updatedStations = { ...stationPools }

        if (isHubAndSpoke) {
          const sharedSpace = maxSharedPool - updatedShared
          const toShared = Math.min(diceLeftToAllocate, Math.max(0, sharedSpace))
          if (toShared > 0) {
            updatedShared += toShared
            diceLeftToAllocate -= toShared
            routingNotes.push(`+${toShared} to Shared Pool`)
          }
        }

        if (isDistributed || isHubAndSpoke) {
          for (const station of priorityOrder) {
            if (diceLeftToAllocate <= 0) break
            const spaceAtStation = maxStationCapacity - (updatedStations[station] ?? 0)
            if (spaceAtStation > 0) {
              const toAdd = Math.min(diceLeftToAllocate, spaceAtStation)
              updatedStations[station] = (updatedStations[station] ?? 0) + toAdd
              diceLeftToAllocate -= toAdd
              routingNotes.push(`+${toAdd} to ${STATION_NAMES[station]}`)
            }
          }
        } else {
          const sharedSpace = effectiveMaxPowerDice - updatedShared
          const toAdd = Math.min(diceLeftToAllocate, sharedSpace)
          updatedShared += toAdd
          diceLeftToAllocate -= toAdd
          if (toAdd > 0) {
            routingNotes.push(`+${toAdd} to Central Pool`)
          }
        }

        if (diceLeftToAllocate > 0) {
          routingNotes.push(`NOTICE: All systems full! ${diceLeftToAllocate} die lost.`)
        }

        if (onUpdateSharedPool) {
          onUpdateSharedPool(updatedShared)
        }
        if (onUpdateStationPools) {
          onUpdateStationPools(updatedStations)
        }

        fullLog = `${rollDescription} [Routing: ${routingNotes.join(" | ") || "Pools Full"} ]${shieldRegenLog}`
      }

      setReactorLog(fullLog)

      if (onCycleReactor) {
        onCycleReactor(generatedAmount)
      }
      
      setIsCycling(false)
    }, 800)
  }

  const executeBoostCheck = (rollTotal: number) => {
    if (!selectedBoostType || boostActionUsed) return

    const isSuccess = rollTotal >= 10
    setBoostActionUsed(true)

    if (!isSuccess) {
      setBoostFeedback(`Check total (${rollTotal}) failed DC 10. Boost action failed!`)
      return
    }

    if (selectedBoostType === "engines") {
      setBoostFeedback("SUCCESS! Speed increased by +50 ft until end of next turn (survives 1 reactor cycle, expires on 2nd).")
      if (onBoostSpeed) {
        onBoostSpeed(50)
      }
    } else if (selectedBoostType === "shields") {
      const shieldRoll = Math.floor(Math.random() * 8) + 1
      setBoostFeedback(`SUCCESS! Rolled shield die: +${shieldRoll} Temporary Shield Points granted (survives 1 reactor cycle, expires on 2nd).`)
      if (onBoostShields) {
        onBoostShields(shieldRoll)
      }
    } else if (selectedBoostType === "weapons") {
      setBoostFeedback("SUCCESS! Next weapon attack roll has ADVANTAGE.")
      if (onBoostWeapons) onBoostWeapons()
    }
  }

  const handleSystemRollBoost = () => {
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + effectiveStrengthMod
    executeBoostCheck(total)
  }

  const handleManualRollBoost = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseInt(manualRollInput, 10)
    if (!isNaN(parsed)) {
      executeBoostCheck(parsed)
      setManualRollInput("")
    }
  }

  const handleStartRechargeProcess = () => {
    setRechargeStep("spending")
    setDiceCountToSpend(Math.min(availableHullDice, 1))
    setRawRollTotalInput("")
    setRechargeFeedback(null)
  }

  const parsedRawRoll = parseInt(rawRollTotalInput, 10) || 0
  const intModBonus = hasAutomatedProtocols ? Math.max(1, effectiveIntelligenceMod) : 0
  const totalConBonusForSelectedDice = diceCountToSpend * effectiveConstitutionMod
  const calculatedHullRegained = Math.max(0, parsedRawRoll + totalConBonusForSelectedDice + intModBonus)

  const handleExecuteRecharge = (spendHullDice: boolean) => {
    let finalRestoredHull = 0
    let newlySpentDice = 0

    if (spendHullDice && availableHullDice > 0 && parsedRawRoll > 0) {
      finalRestoredHull = calculatedHullRegained
      newlySpentDice = diceCountToSpend
    }

    const calculatedNewHull = Math.min(effectiveHullMax, currentActualHull + finalRestoredHull)
    const calculatedNewSpentHullDice = spentHullDice + newlySpentDice

    if (onApplyFullRecharge) {
      onApplyFullRecharge({
        newHull: calculatedNewHull,
        newHullDiceSpent: calculatedNewSpentHullDice,
        newShields: effectiveShieldMax,
        newShieldDiceSpent: newSpentShieldDiceValue,
      })
    } else {
      if (onShieldChange) onShieldChange(effectiveShieldMax, effectiveShieldMax, 0)
      if (onSpentShieldDiceChange) onSpentShieldDiceChange(newSpentShieldDiceValue)
      if (onSpentHullDiceChange) onSpentHullDiceChange(calculatedNewSpentHullDice)
      if (onPatchHull && finalRestoredHull > 0) onPatchHull(finalRestoredHull)
    }

    setPowerBackupUsed(false)
    setEmergencyGenUsed(false)

    setRechargeFeedback(
      `Recharge Completed: Shields set to ${effectiveShieldMax}/${effectiveShieldMax} SP, restored +${shieldDiceToRestore} Shield Dice. ${
        spendHullDice && finalRestoredHull > 0 
          ? `Spent ${newlySpentDice} Hull Dice for +${finalRestoredHull} HP.` 
          : "No Hull Dice spent."
      }`
    )
    setRechargeStep("idle")
    setRawRollTotalInput("")
  }

  const handlePatchCheck = (systemRolled: boolean, manualVal?: number) => {
    const d20 = systemRolled ? Math.floor(Math.random() * 20) + 1 : (manualVal || 0)
    const total = d20 + effectivePatchSkillMod
    const isSuccess = total >= patchDC

    const rollHullDie = () => Math.floor(Math.random() * 8) + 1

    let restoredAmount = 0
    const autoProtocolsBonus = hasAutomatedProtocols ? Math.max(1, effectiveIntelligenceMod) : 0

    if (isSuccess) {
      restoredAmount = rollHullDie() + autoProtocolsBonus
      setPatchFeedback(`Patch SUCCESS (Rolled ${total} vs DC ${patchDC}). Restored ${restoredAmount} Hull Integrity${autoProtocolsBonus > 0 ? ` (+${autoProtocolsBonus} Int Mod)` : ""}.`)
    } else {
      const die1 = rollHullDie()
      const die2 = rollHullDie()
      restoredAmount = Math.min(die1, die2) + autoProtocolsBonus
      setPatchFeedback(`Patch FAILED (Rolled ${total} vs DC ${patchDC}). Took lesser of two hull dice: Restored ${restoredAmount} Hull Integrity${autoProtocolsBonus > 0 ? ` (+${autoProtocolsBonus} Int Mod)` : ""}.`)
    }

    if (onPatchHull) {
      onPatchHull(restoredAmount)
    }
  }

  const handleResetPatch = () => {
    setPatchFeedback(null)
  }

  const handleTriggerPowerBackup = () => {
    if (powerBackupUsed) return
    setPowerBackupUsed(true)
    setTacticalFeedback("Power Backup Activated: Starship drops to 1 HP instead of 0, or auto-succeeds on Destruction Saving Throw!")
  }

  const handleTriggerEmergencyGenerator = (mode: "drop1" | "restore") => {
    if (emergencyGenUsed) return
    setEmergencyGenUsed(true)
    if (mode === "drop1") {
      setTacticalFeedback("Emergency Generator Activated: Starship shields drop to 1 SP instead of 0!")
      if (onShieldChange) onShieldChange(1, effectiveShieldMax, shieldTemp)
    } else {
      const spAmount = Math.max(2, effectiveStrengthMod * 2)
      setTacticalFeedback(`Emergency Generator Activated: Restored ${spAmount} SP (2x Strength Modifier)!`)
      if (onShieldChange) onShieldChange(Math.min(effectiveShieldMax, (shieldCurrent || 0) + spAmount), effectiveShieldMax, shieldTemp)
    }
  }

  const handleTriggerElectronicBaffle = () => {
    if (baffleUses >= tierUses) return
    const selfDamage = Math.floor(Math.random() * 8) + 1
    setBaffleUses((prev) => prev + 1)
    if (onPatchHull) onPatchHull(-selfDamage)
    setTacticalFeedback(`Electronic Baffle Activated: Suffered ${selfDamage} direct hull damage. Blinded, Ionized, Shocked, or Stunned condition cleared!`)
  }

  const handleTriggerAltFuel = () => {
    if (altFuelUses >= tierUses) return
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + effectiveRegulationSkillMod
    const dc = 10
    const isSuccess = total >= dc
    setAltFuelUses((prev) => prev + 1)
    if (isSuccess) {
      setTacticalFeedback(`Fuel Converter Success (Rolled ${total} vs DC ${dc}): Recovered 1 day's worth of fuel!`)
    } else {
      setTacticalFeedback(`Fuel Converter Failed (Rolled ${total} vs DC ${dc}): Conversion unsuccessful.`)
    }
  }

  const handleUseVersatileTransport = () => {
    if (versatileTransportUsed >= versatileMax) return
    if (onUpdateVersatileTransportUsed) {
      onUpdateVersatileTransportUsed((prev) => Math.min(versatileMax, prev + 1))
    }
  }

  const handleUseBestShip = () => {
    if (bestShipInVerseUsed) return
    if (onUpdateBestShipInVerseUsed) {
      onUpdateBestShipInVerseUsed(true)
    }
  }

  const getFullReactorDisplayName = (type: string) => {
    const lower = type.toLowerCase()
    if (lower.includes("ionization")) {
      return lower.includes("reactor") ? "Ionization Reactor" : "Ionization Reactor (1d2-1)"
    }
    if (lower.includes("power core")) {
      return lower.includes("reactor") ? "Power Core Reactor" : "Power Core Reactor (1d2)"
    }
    return lower.includes("reactor") ? "Fuel Cell Reactor" : "Fuel Cell Reactor (+1)"
  }

  const getShortReactorDisplayName = (type: string) => {
    const lower = type.toLowerCase()
    if (lower.includes("ionization")) return "Ionization Reactor (1d2-1)"
    if (lower.includes("power core")) return "Power Core Reactor (1d2)"
    return "Fuel Cell Reactor (+1)"
  }

  return (
    <div className="flex flex-col gap-4 font-mono w-full max-w-7xl mx-auto">
      {/* Top Header Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-md border border-bridge-border bg-bridge-panel p-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-cyan-neon" />
            <h2 className="text-glow-cyan text-sm font-bold tracking-[0.25em] text-cyan-neon">
              ENGINEERING &amp; REACTOR CORE CONSOLE
            </h2>
          </div>
          <p className="text-xs tracking-wider text-muted-foreground/70 mt-1">
            COUPLING MODE: <span className="text-amber-400 font-bold">{powerCoupling}</span>
            <span className="mx-2 text-muted-foreground">|</span>
            REACTOR: <span className="text-cyan-neon font-bold">{getFullReactorDisplayName(rawReactorType)}</span>
            <span className="mx-2 text-muted-foreground">|</span>
            STATE:{" "}
            <span className={isPoweredOn ? "text-emerald-400 font-bold" : "text-amber-400 font-bold animate-pulse"}>
              {isPoweredOn ? "ONLINE" : "COLD & DARK"}
            </span>
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setShowStartupModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border transition cursor-pointer ${
              isPoweredOn
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                : "border-amber-400/60 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 shadow-[0_0_8px_rgba(251,191,36,0.2)] animate-pulse"
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>{isPoweredOn ? "Core: Online" : `Cold Start (${initiationProcedures}/10)`}</span>
          </button>

          {isPoweredOn && (
            <button
              type="button"
              onClick={handleShutdownShip}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border border-rose-500/50 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 transition cursor-pointer"
              title="Emergency SCRAM / Shutdown Ship"
            >
              <PowerOff className="h-3.5 w-3.5" />
              <span>SCRAM</span>
            </button>
          )}

          {autoShieldRegen && (
            <div className="rounded border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-1.5 text-xs text-emerald-400 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[10px]">AUTO-REGEN</span>
            </div>
          )}

          <div className="rounded border border-cyan-neon/30 bg-cyan-neon/5 px-2.5 py-1.5 text-xs text-cyan-neon flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[10px]">
              {isDirect ? `POOL: ${sharedPoolDice}/${maxSharedPool}` : isHubAndSpoke ? `SHARED: ${sharedPoolDice}/${maxSharedPool}` : "DISTRIBUTED"}
            </span>
          </div>
        </div>
      </div>

      {/* STATION CREW ASSIGNMENT & COMBAT TURN HUD */}
      <div className="rounded-md border border-cyan-neon/40 bg-black/40 p-3 shadow-[0_0_15px_rgba(0,255,255,0.05)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-neon uppercase tracking-wider">
              <Users className="h-4 w-4 text-cyan-neon" />
              <span>Assigned Personnel:</span>
            </div>

            {assignedCrew.length === 0 ? (
              <span className="text-xs text-slate-500 italic bg-slate-900/60 border border-slate-800 px-3 py-1 rounded">
                Console Uncrewed — Select personnel to assign
              </span>
            ) : (
              assignedCrew.map((member, idx) => {
                const isChief = idx === 0
                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded border text-xs transition ${
                      member.hasTakenTurnThisRound
                        ? "bg-slate-900/60 border-slate-800 text-slate-400"
                        : "bg-slate-950 border-cyan-500/40 text-slate-100"
                    }`}
                  >
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase ${
                        isChief
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : "bg-sky-500/20 text-sky-400 border-sky-500/40"
                      }`}
                    >
                      {isChief ? "Chief Engineer" : "Support"}
                    </span>

                    <span className="font-bold text-xs">{member.name}</span>

                    <button
                      type="button"
                      onClick={() => onToggleTurn && onToggleTurn(member.id)}
                      className={`p-0.5 rounded transition ${
                        member.hasTakenTurnThisRound
                          ? "text-emerald-400 hover:text-emerald-300"
                          : "text-amber-400 hover:text-amber-300"
                      }`}
                      title={member.hasTakenTurnThisRound ? "Turn Taken" : "Turn Pending"}
                    >
                      {member.hasTakenTurnThisRound ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onAssignCrew && onAssignCrew(member.id, "crew_quarters")}
                      className="text-slate-500 hover:text-rose-400 transition ml-1"
                      title="Vacate Station (Return to Quarters)"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {availablePersonnel.length > 0 && onAssignCrew && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">
                Deploy to Console:
              </span>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    onAssignCrew(e.target.value, "engineering")
                  }
                }}
                className="rounded bg-slate-950 border border-slate-700 px-2 py-1 text-xs text-cyan-300 focus:outline-none focus:border-cyan-neon"
              >
                <option value="" disabled>
                  + Assign Crew Member...
                </option>
                {availablePersonnel.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({getCrewRole(p, manifest)})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <ShipStats shipConfig={shipConfig} />

      {(shipTier >= 3) && (
        <div className="rounded-md border border-bridge-border bg-bridge-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-bridge-border pb-2">
            <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon flex items-center gap-2 uppercase">
              <Sparkles className="h-4 w-4 text-cyan-neon" />
              Chassis Tactical Surges &amp; Reactions (Tier {shipTier})
            </h3>
            <span className="text-[10px] text-muted-foreground font-mono">
              COMBAT ACTIONS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shipTier >= 4 && (
              <div className="flex flex-col justify-between gap-2 rounded border border-bridge-border/60 bg-black/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-cyan-neon uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-300" /> Standing By
                  </span>
                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                    standingByUsed ? "bg-red-500/20 text-red-400 border-red-500/40" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  }`}>
                    {standingByUsed ? "EXPENDED" : "READY"}
                  </span>
                </div>
                <p className="text-[9px] text-muted-foreground leading-relaxed">
                  Push ship limits: crewmember takes 1 extra action on their turn (resets on recharge).
                </p>
                <div className="flex-1" />
                <button
                  type="button"
                  disabled={standingByUsed}
                  onClick={onUseStandingBy}
                  className={`py-2 px-3 rounded text-[10px] font-bold uppercase tracking-wider font-mono border transition-all flex items-center justify-center gap-1.5 ${
                    standingByUsed
                      ? "border-slate-800 bg-slate-900/60 text-slate-500 cursor-not-allowed"
                      : "border-cyan-neon/60 bg-cyan-neon/20 text-cyan-neon hover:bg-cyan-neon/30 shadow-[0_0_10px_rgba(0,255,255,0.2)] cursor-pointer"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {standingByUsed ? "USED (SHORT REST)" : "SURGE: EXTRA ACTION"}
                </button>
              </div>
            )}

            {shipTier >= 5 && !isMedium && (
              <div className="flex flex-col justify-between gap-2 rounded border border-bridge-border/60 bg-black/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-emerald-400" /> A Leaf on the Wind
                  </span>
                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                    leafOnTheWindUsed ? "bg-red-500/20 text-red-400 border-red-500/40" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  }`}>
                    {leafOnTheWindUsed ? "EXPENDED" : "READY"}
                  </span>
                </div>
                <p className="text-[9px] text-muted-foreground leading-relaxed">
                  Reaction: Treat amount rolled on d20 as a natural 20 for an ability check, attack roll, or save (resets on recharge).
                </p>
                <div className="flex-1" />
                <button
                  type="button"
                  disabled={leafOnTheWindUsed}
                  onClick={onUseLeafOnTheWind}
                  className={`py-2 px-3 rounded text-[10px] font-bold uppercase tracking-wider font-mono border transition-all flex items-center justify-center gap-1.5 ${
                    leafOnTheWindUsed
                      ? "border-slate-800 bg-slate-900/60 text-slate-500 cursor-not-allowed"
                      : "border-emerald-500/60 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)] cursor-pointer"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {leafOnTheWindUsed ? "USED (SHORT REST)" : "TRIGGER NATURAL 20"}
                </button>
              </div>
            )}

            {hasVersatileTransport && (
              <div className="flex flex-col justify-between gap-2 rounded border border-bridge-border/60 bg-black/40 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold tracking-wider text-cyan-300 uppercase flex items-center gap-1.5">
                    <Hexagon className="w-3.5 h-3.5" /> Versatile Transport
                  </span>
                  <span className="text-[9px] font-mono text-cyan-400 font-bold border border-cyan-400/40 bg-cyan-900/40 px-1.5 py-0.5 rounded">
                    {versatileMax - versatileTransportUsed} / {versatileMax} Uses (Refit)
                  </span>
                </div>
                <p className="text-[9px] text-muted-foreground leading-snug">
                  Reaction: When a crewmember makes an ability check, attack roll, or save with the ship, gain advantage before the GM declares success/failure.
                </p>
                <div className="flex-1" />
                <div className="flex items-center gap-1 mt-1 mb-2">
                  {Array.from({ length: versatileMax }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-2 flex-1 rounded-sm transition-all ${
                        i < versatileMax - versatileTransportUsed
                          ? "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]"
                          : "bg-slate-800 border border-bridge-border/50"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  disabled={versatileTransportUsed >= versatileMax}
                  onClick={handleUseVersatileTransport}
                  className={`py-2 rounded text-[9px] font-bold uppercase tracking-wider font-mono border transition-all ${
                    versatileTransportUsed >= versatileMax
                      ? "border-slate-800 bg-slate-900/60 text-slate-500 cursor-not-allowed"
                      : "border-cyan-500/60 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 cursor-pointer shadow-[0_0_8px_rgba(34,211,238,0.2)]"
                  }`}
                >
                  Trigger Reaction (Advantage)
                </button>
              </div>
            )}

            {hasBestShip && (
              <div className="flex flex-col justify-between gap-2 rounded border border-bridge-border/60 bg-black/40 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold tracking-wider text-amber-300 uppercase flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> Best Ship in the 'Verse
                  </span>
                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                    bestShipInVerseUsed ? "bg-red-500/20 text-red-400 border-red-500/40" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  }`}>
                    {bestShipInVerseUsed ? "EXPENDED" : "READY (RECHARGE)"}
                  </span>
                </div>
                <p className="text-[9px] text-muted-foreground leading-snug">
                  Action: Give the ship resistance to un-enhanced damage from ship weapons for 1 minute (ends early if disabled).
                </p>
                <div className="flex-1" />
                <button
                  type="button"
                  disabled={bestShipInVerseUsed}
                  onClick={handleUseBestShip}
                  className={`mt-1 py-2 rounded text-[9px] font-bold uppercase tracking-wider font-mono border transition-all flex items-center justify-center gap-1.5 ${
                    bestShipInVerseUsed
                      ? "border-slate-800 bg-slate-900/60 text-slate-500 cursor-not-allowed"
                      : "border-amber-500/60 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 cursor-pointer shadow-[0_0_8px_rgba(251,191,36,0.2)]"
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {bestShipInVerseUsed ? "ACTIVE / EXPENDED" : "TRIGGER RESISTANCE"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {(hasPowerBackup || hasEmergencyGenerator || hasElectronicBaffle || hasAltFuelConverter) && (
        <div className="rounded-md border border-cyan-neon/50 bg-bridge-panel p-4 flex flex-col gap-3 shadow-[0_0_15px_rgba(0,255,255,0.06)]">
          <div className="flex items-center justify-between border-b border-bridge-border pb-2">
            <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon flex items-center gap-2 uppercase">
              <Zap className="h-4 w-4 text-cyan-neon animate-pulse" />
              Active Tactical Engineering Systems
            </h3>
            <span className="text-[10px] text-muted-foreground font-mono">
              EMERGENCY CIRCUITS &amp; AUXILIARIES
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {hasPowerBackup && (
              <div className="p-3 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-amber-300 uppercase">Power Backup</span>
                    <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded border font-bold ${
                      powerBackupUsed ? "bg-red-500/20 text-red-400 border-red-500/40" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    }`}>
                      {powerBackupUsed ? "EXPENDED" : "READY (1/RECHARGE)"}
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">
                    Reaction: Drop to 1 HP instead of 0, or auto-succeed on a Destruction save.
                  </p>
                </div>
                <button
                  disabled={powerBackupUsed}
                  onClick={handleTriggerPowerBackup}
                  className={`w-full py-1.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono border transition-all cursor-pointer ${
                    powerBackupUsed
                      ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-amber-500/20 border-amber-400 text-amber-300 hover:bg-amber-500/30"
                  }`}
                >
                  ⚡ Trigger Backup Surge
                </button>
              </div>
            )}

            {hasEmergencyGenerator && (
              <div className="p-3 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-cyan-neon uppercase">Emergency Generator</span>
                    <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded border font-bold ${
                      emergencyGenUsed ? "bg-red-500/20 text-red-400 border-red-500/40" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    }`}>
                      {emergencyGenUsed ? "EXPENDED" : "READY (1/RECHARGE)"}
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">
                    Reaction: Drop to 1 SP instead of 0, or restore SP equal to 2x Strength modifier (+{Math.max(2, effectiveStrengthMod * 2)} SP).
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    disabled={emergencyGenUsed}
                    onClick={() => handleTriggerEmergencyGenerator("drop1")}
                    className={`flex-1 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono border transition-all cursor-pointer ${
                      emergencyGenUsed
                        ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                        : "bg-cyan-500/20 border-cyan-neon text-cyan-neon hover:bg-cyan-500/30"
                    }`}
                  >
                    Drop to 1 SP
                  </button>
                  <button
                    disabled={emergencyGenUsed}
                    onClick={() => handleTriggerEmergencyGenerator("restore")}
                    className={`flex-1 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono border transition-all cursor-pointer ${
                      emergencyGenUsed
                        ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                        : "bg-cyan-500/20 border-cyan-neon text-cyan-neon hover:bg-cyan-500/30"
                    }`}
                  >
                    +{Math.max(2, effectiveStrengthMod * 2)} SP
                  </button>
                </div>
              </div>
            )}

            {hasElectronicBaffle && (
              <div className="p-3 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-rose-300 uppercase">Electronic Baffle</span>
                    <span className="text-[8px] font-mono px-1.5 py-0.2 rounded border bg-rose-950/40 text-rose-300 border-rose-500/40 font-bold">
                      {tierUses - baffleUses} / {tierUses} (REFIT)
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">
                    Reaction: Roll 1 Hull Die of direct self-damage to ignore Ionized, Shocked, or Stunned.
                  </p>
                </div>
                <button
                  disabled={baffleUses >= tierUses}
                  onClick={handleTriggerElectronicBaffle}
                  className={`w-full py-1.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono border transition-all cursor-pointer ${
                    baffleUses >= tierUses
                      ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-rose-500/20 border-rose-400 text-rose-300 hover:bg-rose-500/30"
                  }`}
                >
                  ⚡ Flush Condition (Roll {effectiveHullDieType})
                </button>
              </div>
            )}

            {hasAltFuelConverter && (
              <div className="p-3 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-300 uppercase">Alt Fuel Converter</span>
                    <span className="text-[8px] font-mono px-1.5 py-0.2 rounded border bg-emerald-950/40 text-emerald-300 border-emerald-500/40 font-bold">
                      {tierUses - altFuelUses} / {tierUses} (REFIT)
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">
                    10-min downtime: Con (Regulation) check vs DC 10 to convert materials into 1 day of fuel.
                  </p>
                </div>
                <button
                  disabled={altFuelUses >= tierUses}
                  onClick={handleTriggerAltFuel}
                  className={`w-full py-1.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono border transition-all cursor-pointer ${
                    altFuelUses >= tierUses
                      ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-emerald-500/20 border-emerald-400 text-emerald-300 hover:bg-emerald-500/30"
                  }`}
                >
                  🎲 Convert Fuel (d20 {formatMod(effectiveRegulationSkillMod)})
                </button>
              </div>
            )}
          </div>

          {tacticalFeedback && (
            <div className="p-2 rounded bg-black/60 border border-bridge-border/60 text-xs font-mono text-cyan-neon">
              {tacticalFeedback}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Reactor Core Management Panel */}
        <div className="rounded-md border border-bridge-border bg-bridge-panel p-4">
          <div className="flex items-center justify-between pb-3 border-b border-bridge-border mb-4">
            <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              REACTOR CORE &amp; POWER DIE MATRIX
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-amber-400 font-bold uppercase">{powerCoupling}</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-cyan-neon font-bold uppercase">{getShortReactorDisplayName(rawReactorType)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="rounded border border-bridge-border p-2.5 bg-black/20">
              <span className="text-[10px] text-muted-foreground block mb-0.5">ARCHITECTURE</span>
              <span className="text-xs font-bold text-amber-400 truncate block">{powerCoupling}</span>
            </div>
            <div className="rounded border border-bridge-border p-2.5 bg-black/20">
              <span className="text-[10px] text-muted-foreground block mb-0.5">
                {isDirect ? "CENTRAL POOL" : isHubAndSpoke ? "SHARED POOL" : "LOCAL POOLS"}
              </span>
              <span className="text-sm font-bold text-amber-400">
                {isDistributed ? "N/A (0)" : `${sharedPoolDice} / ${maxSharedPool}`}
              </span>
            </div>
            <div className="rounded border border-bridge-border p-2.5 bg-black/20">
              <span className="text-[10px] text-muted-foreground block mb-0.5">DIE TYPE</span>
              <span className="text-sm font-bold text-cyan-neon uppercase">{effectivePowerDieType}</span>
            </div>
            <div className="rounded border border-bridge-border p-2.5 bg-black/20">
              <span className="text-[10px] text-muted-foreground block mb-0.5">CYCLE LOGIC</span>
              <span className="text-xs font-bold text-amber-400 uppercase">
                {reactorType.includes("ionization") ? "1d2 - 1" : reactorType.includes("power core") ? "1d2" : "+1 Fixed"}
              </span>
            </div>
          </div>

          <div className={`grid grid-cols-1 ${(isDistributed || isHubAndSpoke) ? "lg:grid-cols-2" : ""} gap-4 mb-4`}>
            {/* Left Box: Cycle Reactor Control */}
            <div className="flex flex-col justify-between p-4 rounded border border-amber-500/30 bg-amber-500/5 gap-3">
              <div>
                <span className="text-xs font-bold text-amber-400 block uppercase tracking-wider mb-1">
                  Combat Round Management
                </span>
                <span className="text-[10px] text-muted-foreground leading-relaxed">
                  Cycle the reactor at round end to replenish power dice, reset split ship movement, clear turn completed flags, and advance round boost durations.
                </span>
              </div>
              
              <button
                onClick={handleCycleReactor}
                disabled={isCycling}
                className={`w-full py-2.5 rounded border text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 ${
                  isCycling 
                    ? "border-cyan-neon/60 bg-cyan-neon/20 text-cyan-neon shadow-[0_0_12px_rgba(0,240,255,0.3)] animate-pulse" 
                    : "border-amber-500/60 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                }`}
              >
                <RotateCw className={`h-4 w-4 ${isCycling ? "animate-spin" : ""}`} />
                {isCycling ? "Spooling & Cycling..." : "Cycle Reactor (End of Round)"}
              </button>
            </div>

            {/* Right Box: System Prioritization Framework with Bonus Action Lock */}
            {(isDistributed || isHubAndSpoke) && (
              <div className="p-4 rounded border border-cyan-neon/30 bg-black/30 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between border-b border-bridge-border pb-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-3.5 w-3.5 text-cyan-neon" />
                    <span className="text-xs font-bold text-cyan-neon uppercase tracking-wider">
                      System Prioritization
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPowerRoutingUnlocked((prev) => !prev)}
                    className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
                      isPowerRoutingUnlocked
                        ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.3)] animate-pulse"
                        : "bg-slate-900 border-slate-700 text-slate-300 hover:border-cyan-neon"
                    }`}
                  >
                    {isPowerRoutingUnlocked ? (
                      <>
                        <Unlock className="h-3 w-3 text-amber-400" />
                        <span>Lock Configuration</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3 text-slate-400" />
                        <span>Route Power (Bonus Action)</span>
                      </>
                    )}
                  </button>
                </div>

                {isPowerRoutingUnlocked && (
                  <div className="p-1.5 rounded bg-amber-950/40 border border-amber-500/40 text-[10px] text-amber-300">
                    ⚡ Power routing unlocked (Bonus Action active). Adjust hierarchy using arrows, then click "Lock Configuration".
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  {priorityOrder.map((stationKey, index) => {
                    const currentDice = stationPools[stationKey] ?? 0
                    return (
                      <div key={stationKey} className="flex items-center justify-between px-2 py-1.5 rounded bg-bridge-panel border border-bridge-border text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-amber-400 w-4">#{index + 1}</span>
                          <span className="font-bold text-foreground w-28 uppercase truncate">{STATION_NAMES[stationKey]}</span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 w-16 justify-end">
                            {Array.from({ length: maxStationCapacity }).map((_, i) => (
                              <span
                                key={i}
                                className={`h-2.5 w-5 rounded-sm inline-block ${
                                  i < currentDice 
                                    ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]" 
                                    : "bg-black/90 border border-bridge-border"
                                }`}
                                title={i < currentDice ? "Power Die Available" : "Empty Slot"}
                              />
                            ))}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => movePriority(index, "up")}
                              disabled={index === 0 || !isPowerRoutingUnlocked}
                              className="p-1 rounded bg-black/40 border border-bridge-border text-foreground hover:bg-cyan-neon/20 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              title={isPowerRoutingUnlocked ? "Move Priority Up" : "Unlock Power Routing First"}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => movePriority(index, "down")}
                              disabled={index === priorityOrder.length - 1 || !isPowerRoutingUnlocked}
                              className="p-1 rounded bg-black/40 border border-bridge-border text-foreground hover:bg-cyan-neon/20 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              title={isPowerRoutingUnlocked ? "Move Priority Down" : "Unlock Power Routing First"}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {reactorLog && (
            <div className="p-2.5 rounded border border-cyan-neon/30 bg-cyan-neon/5 text-xs text-cyan-neon flex items-center gap-2 animate-pulse">
              <Terminal className="h-4 w-4 shrink-0" />
              <span>{reactorLog}</span>
            </div>
          )}
        </div>

        {/* ENGINEERING BOOST ACTIONS PANEL */}
        <div className="rounded-md border border-bridge-border bg-bridge-panel p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-bridge-border pb-3">
            <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon flex items-center gap-2">
              <Gauge className="h-4 w-4 text-cyan-neon" />
              ENGINEERING BOOST ACTIONS (1 PER ROUND)
            </h3>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {engineBoostTurnsRemaining > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  ENGINES: +50 SPEED ({engineBoostTurnsRemaining === 2 ? "ACTIVE" : "EXPIRES NEXT CYCLE"})
                </span>
              )}
              {shieldBoostTurnsRemaining > 0 && shieldTemp > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-[#e0ffff] border border-cyan-400/50 shadow-[0_0_8px_rgba(0,255,255,0.3)]">
                  SHIELDS: +{shieldTemp} TEMP ({shieldBoostTurnsRemaining === 2 ? "ACTIVE" : "EXPIRES NEXT CYCLE"})
                </span>
              )}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${boostActionUsed ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"}`}>
                {boostActionUsed ? "ACTION EXECUTED THIS ROUND" : "READY FOR DEPLOYMENT"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              disabled={boostActionUsed}
              onClick={() => setSelectedBoostType("engines")}
              className={`p-3 rounded border text-left flex flex-col gap-1 transition-all cursor-pointer disabled:opacity-50 ${
                selectedBoostType === "engines" 
                  ? "border-cyan-neon bg-cyan-neon/10 shadow-[0_0_10px_rgba(0,240,255,0.2)]" 
                  : "border-bridge-border bg-black/30 hover:border-cyan-neon/50"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span>Boost Engines</span>
                <Gauge className="h-3.5 w-3.5 text-cyan-neon" />
              </div>
              <span className="text-[10px] text-muted-foreground">DC 10 Str Check: +50 Speed until end of next turn.</span>
            </button>

            <button
              disabled={boostActionUsed}
              onClick={() => setSelectedBoostType("shields")}
              className={`p-3 rounded border text-left flex flex-col gap-1 transition-all cursor-pointer disabled:opacity-50 ${
                selectedBoostType === "shields" 
                  ? "border-cyan-neon bg-cyan-neon/10 shadow-[0_0_10px_rgba(0,240,255,0.2)]" 
                  : "border-bridge-border bg-black/30 hover:border-cyan-neon/50"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span>Boost Shields</span>
                <Shield className="h-3.5 w-3.5 text-cyan-neon" />
              </div>
              <span className="text-[10px] text-muted-foreground">DC 10 Str Check: Roll shield die for temp shield points.</span>
            </button>

            <button
              disabled={boostActionUsed}
              onClick={() => setSelectedBoostType("weapons")}
              className={`p-3 rounded border text-left flex flex-col gap-1 transition-all cursor-pointer disabled:opacity-50 ${
                selectedBoostType === "weapons" 
                  ? "border-cyan-neon bg-cyan-neon/10 shadow-[0_0_10px_rgba(0,240,255,0.2)]" 
                  : "border-bridge-border bg-black/30 hover:border-cyan-neon/50"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span>Boost Weapons</span>
                <Crosshair className="h-3.5 w-3.5 text-cyan-neon" />
              </div>
              <span className="text-[10px] text-muted-foreground">DC 10 Str Check: Advantage on next weapon attack roll.</span>
            </button>
          </div>

          {selectedBoostType && !boostActionUsed && (
            <div className="p-3 rounded border border-cyan-neon/40 bg-cyan-neon/5 flex flex-col sm:flex-row items-center justify-between gap-3 mt-2">
              <div className="text-xs">
                <span className="text-cyan-neon font-bold uppercase">Selected: Boost {selectedBoostType}</span>
                <div className="text-[10px] text-muted-foreground">Strength Modifier: {effectiveStrengthMod >= 0 ? `+${effectiveStrengthMod}` : effectiveStrengthMod} | DC: 10</div>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleSystemRollBoost}
                  className="flex-1 sm:flex-none px-4 py-1.5 rounded bg-cyan-neon text-black font-bold text-xs hover:bg-cyan-neon/80 transition-colors cursor-pointer"
                >
                  System Roll (d20 {effectiveStrengthMod >= 0 ? `+ ${effectiveStrengthMod}` : `- ${Math.abs(effectiveStrengthMod)}`})
                </button>
                
                <form onSubmit={handleManualRollBoost} className="flex gap-1">
                  <input
                    type="number"
                    placeholder="Total"
                    value={manualRollInput}
                    onChange={(e) => setManualRollInput(e.target.value)}
                    className="w-16 px-2 py-1 rounded bg-black border border-bridge-border text-xs text-foreground"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded border border-cyan-neon/50 bg-cyan-neon/10 text-cyan-neon text-xs font-bold hover:bg-cyan-neon/20 cursor-pointer"
                  >
                    Submit
                  </button>
                </form>
              </div>
            </div>
          )}

          {boostFeedback && (
            <div className="p-2.5 rounded border border-amber-500/40 bg-amber-500/10 text-xs text-amber-300 mt-1">
              {boostFeedback}
            </div>
          )}
        </div>

        {/* SHIP RECHARGE PROTOCOL */}
        <div className="rounded-md border border-cyan-neon/50 bg-bridge-panel p-4 flex flex-col gap-4 shadow-[0_0_15px_rgba(0,240,255,0.06)]">
          <div className="flex items-center justify-between border-b border-bridge-border pb-3">
            <div className="flex items-center gap-2.5">
              <RefreshCw className={`h-4 w-4 text-cyan-neon ${rechargeStep === "spending" ? "animate-spin" : ""}`} />
              <div>
                <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase">
                  Ship Recharge Protocol
                </h3>
                <span className="text-[10px] text-muted-foreground block">
                  1-Hour Short Rest Maintenance Cycle &amp; Hull Field Repairs
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono tracking-widest uppercase bg-cyan-950/80 border border-cyan-neon/40 text-cyan-neon rounded">
              Short Rest
            </span>
          </div>

          {rechargeStep === "idle" ? (
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 py-1">
              <div className="text-xs text-muted-foreground space-y-1.5">
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    Shield Points will restore to <strong className="text-foreground">100%</strong> ({effectiveShieldMax} SP) and recover{" "}
                    <strong className="text-emerald-400">+{shieldDiceToRestore} Shield Dice</strong> (Half Max, min 1).
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-cyan-neon shrink-0" />
                  <span>
                    Hull Dice Pool: <strong className="text-foreground">{availableHullDice} / {maxHullDice} ({effectiveHullDieType})</strong> available to spend with Mechanic&apos;s Kit checks.
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>
                    Resets engineering boost statuses and unlocks per-recharge ship systems.
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartRechargeProcess}
                className="w-full lg:w-auto px-6 py-3.5 bg-cyan-neon/20 hover:bg-cyan-neon/30 text-cyan-neon border border-cyan-neon/60 rounded text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
                <span>Initiate 1-Hour Recharge</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between">
                  <span className="text-muted-foreground">Shield Systems (Auto):</span>
                  <span className="text-emerald-400 font-bold">100% RESTORED ({effectiveShieldMax} SP)</span>
                </div>
                <div className="p-3 rounded border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between">
                  <span className="text-muted-foreground">Shield Dice Restored:</span>
                  <span className="text-emerald-400 font-bold">+{shieldDiceToRestore} Dice (Total Available: {Math.min(maxShieldDice, availableShieldDice + shieldDiceToRestore)}/{maxShieldDice})</span>
                </div>
              </div>

              <div className="rounded border border-bridge-border bg-black/40 p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-bridge-border">
                  <div className="text-xs font-bold uppercase tracking-wider text-cyan-neon flex items-center gap-1.5">
                    <Wrench className="h-4 w-4 text-cyan-neon" />
                    Makeshift Hull Repairs (Hull Dice Spending)
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Current Hull Dice: </span>
                    <span className="text-cyan-neon font-bold">{availableHullDice} / {maxHullDice} ({effectiveHullDieType})</span>
                  </div>
                </div>

                {availableHullDice > 0 ? (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-bridge-panel p-3 rounded border border-bridge-border">
                      <div>
                        <span className="text-xs font-bold text-foreground block">
                          Select Number of Hull Dice to Spend:
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Available: {availableHullDice} dice • Ship Constitution Mod per die: {formatMod(effectiveConstitutionMod)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDiceCountToSpend((prev) => Math.max(1, prev - 1))}
                          disabled={diceCountToSpend <= 1}
                          className="p-1.5 rounded bg-black/60 border border-bridge-border text-foreground hover:bg-cyan-neon/20 disabled:opacity-30 cursor-pointer"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-10 text-center font-bold text-sm text-cyan-neon font-mono">
                          {diceCountToSpend}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDiceCountToSpend((prev) => Math.min(availableHullDice, prev + 1))}
                          disabled={diceCountToSpend >= availableHullDice}
                          className="p-1.5 rounded bg-black/60 border border-bridge-border text-foreground hover:bg-cyan-neon/20 disabled:opacity-30 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded border border-amber-500/30 bg-amber-500/5 text-[11px] space-y-1">
                      <div className="font-bold text-amber-300 uppercase tracking-wide">
                        Engineer Check Prompt:
                      </div>
                      <p className="text-muted-foreground">
                        Roll an <strong className="text-foreground">Intelligence (Mechanic&apos;s kit) check</strong> on your character sheet:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground pl-1 space-y-0.5">
                        <li><strong className="text-rose-400">10 or less:</strong> Roll each Hull Die twice and take the lesser amount.</li>
                        <li><strong className="text-cyan-300">11 to 20:</strong> Roll each Hull Die normally.</li>
                        <li><strong className="text-emerald-400">21 or higher:</strong> Roll each Hull Die twice and take the greater amount.</li>
                      </ul>
                      <p className="text-amber-200/90 font-semibold pt-1">
                        👉 Physically roll {diceCountToSpend} × {effectiveHullDieType} and sum the dice results.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center bg-black/50 p-3 rounded border border-bridge-border">
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground block font-bold">
                          Enter Total Value of All Rolled Dice:
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            placeholder={`Sum of ${diceCountToSpend} dice`}
                            value={rawRollTotalInput}
                            onChange={(e) => setRawRollTotalInput(e.target.value)}
                            className="w-full px-3 py-2 bg-black border border-bridge-border rounded text-xs text-foreground font-mono focus:border-cyan-neon outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-2.5 rounded bg-bridge-panel border border-bridge-border text-xs space-y-1 font-mono">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Dice Sum:</span>
                          <span className="text-foreground font-bold">{parsedRawRoll}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Con Mod Bonus ({diceCountToSpend} × {formatMod(effectiveConstitutionMod)}):</span>
                          <span className="text-amber-400 font-bold">{formatMod(totalConBonusForSelectedDice)}</span>
                        </div>
                        {intModBonus > 0 && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>Automated Protocols (Int Mod):</span>
                            <span className="text-cyan-300 font-bold">+{intModBonus}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1 border-t border-bridge-border font-bold">
                          <span className="text-cyan-neon">Net HP Regained:</span>
                          <span className="text-emerald-400">+{calculatedHullRegained} HP</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded bg-black/60 border border-bridge-border text-xs text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-cyan-neon" />
                    <span>No Hull Dice remaining. You can still recharge shields and reset system charges.</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-bridge-border">
                  <button
                    type="button"
                    onClick={() => handleExecuteRecharge(false)}
                    className="w-full sm:w-auto px-4 py-2 bg-secondary/50 hover:bg-secondary border border-bridge-border text-foreground rounded text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Recharge Shields Only (Spend 0 Hull Dice)
                  </button>

                  {availableHullDice > 0 && (
                    <button
                      type="button"
                      disabled={parsedRawRoll <= 0}
                      onClick={() => handleExecuteRecharge(true)}
                      className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/60 text-emerald-300 disabled:opacity-40 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-all"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Apply +{calculatedHullRegained} HP &amp; Complete Recharge
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {rechargeFeedback && (
            <div className="p-2.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-xs text-emerald-300 mt-1 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{rechargeFeedback}</span>
            </div>
          )}
        </div>

        {/* PATCH ACTION PANEL */}
        <div className="rounded-md border border-bridge-border bg-bridge-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-bridge-border pb-3">
            <div>
              <h3 className="text-xs font-bold tracking-[0.2em] text-emerald-400 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-emerald-400" />
                EMERGENCY PATCH PROTOCOL
              </h3>
              {(hasDamageControl || hasAutomatedProtocols) && (
                <span className="text-[10px] text-cyan-300 font-mono mt-0.5 block">
                  {hasAutomatedProtocols 
                    ? "★ Automated Protocols: Take Patch as a REACTION (Tier Uses/Refit) + Add Int Mod to healing!" 
                    : "★ Damage Control System: Take Patch as a BONUS ACTION (Tier Uses/Refit)!"}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold text-muted-foreground">
              Current DC: <span className="text-emerald-400 font-extrabold">{patchDC}</span> (Missing Hull: {missingHull})
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Make a Constitution (Patch) check. Success: Roll Hull Die normally{hasAutomatedProtocols ? ` + ${Math.max(1, effectiveIntelligenceMod)} (Int Mod)` : ""}. Failure: Roll Hull Die twice, take lesser amount{hasAutomatedProtocols ? ` + ${Math.max(1, effectiveIntelligenceMod)} (Int Mod)` : ""}.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={() => handlePatchCheck(true)}
              className="px-4 py-2 rounded border border-emerald-500/50 bg-emerald-500/20 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition-colors cursor-pointer flex items-center gap-2"
            >
              <Wrench className="h-3.5 w-3.5" />
              Standard Action Patch (d20 {formatMod(effectivePatchSkillMod)})
            </button>

            {(hasDamageControl || hasAutomatedProtocols) && (
              <button
                disabled={quickPatchUses >= tierUses}
                onClick={() => {
                  setQuickPatchUses((prev) => prev + 1)
                  handlePatchCheck(true)
                }}
                className={`px-4 py-2 rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 border ${
                  quickPatchUses >= tierUses
                    ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                    : "border-cyan-neon/60 bg-cyan-neon/20 text-cyan-neon hover:bg-cyan-neon/30 shadow-[0_0_8px_rgba(0,255,255,0.2)]"
                }`}
              >
                <Zap className="h-3.5 w-3.5 text-cyan-neon" />
                {hasAutomatedProtocols ? "Reaction Patch" : "Bonus Action Patch"} ({tierUses - quickPatchUses} Left)
              </button>
            )}

            {patchFeedback && (
              <button
                onClick={handleResetPatch}
                className="px-3 py-2 rounded border border-bridge-border bg-secondary/40 text-secondary-foreground text-xs hover:bg-secondary/70 transition-colors cursor-pointer"
              >
                Reset Patch Log
              </button>
            )}
          </div>

          {patchFeedback && (
            <div className="p-3 rounded border border-emerald-500/40 bg-emerald-500/10 flex flex-col gap-2 mt-1">
              <div className="text-xs text-emerald-300 font-mono">
                {patchFeedback}
              </div>
              <div className="text-[11px] text-amber-400 font-bold flex items-center gap-1.5 pt-1 border-t border-emerald-500/20">
                <span>📢 VERBAL COMMUNICATION REQUIRED:</span>
                <span className="text-muted-foreground font-normal">Tell the Defense operator to manually increase the hull by this amount.</span>
              </div>
            </div>
          )}
        </div>

        {/* INSTALLED STATION MODIFICATIONS */}
        <section className="rounded-md border border-bridge-border bg-bridge-panel p-4">
          <h3 className="mb-3 text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase border-b border-bridge-border/60 pb-1">
            Installed Station Modifications
          </h3>
          <StationModifications 
            station="Engineering" 
            installedMods={installedMods} 
            onRemoveMod={onRemoveMod}
          />
        </section>

        {/* VESSEL SETUP STATISTICS SNAPSHOT */}
        <div className="rounded-md border border-cyan-neon/40 bg-bridge-panel p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-bridge-border pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-cyan-neon" />
              <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon">
                VESSEL SETUP STATISTICS SNAPSHOT
              </h3>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${shipConfig ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-red-500/20 text-red-300 border border-red-500/40"}`}>
              {shipConfig ? `CONFIG ACTIVE (${shipConfig.name || "Custom Vessel"})` : "ERROR: NO CONFIG RECEIVED"}
            </span>
          </div>

          {shipConfig ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded border border-bridge-border p-3 bg-black/30 flex flex-col gap-2">
                <span className="text-[10px] text-cyan-neon font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Anchor className="h-3.5 w-3.5" /> Identification
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-[9px] text-muted-foreground block">VESSEL NAME</span>
                    <span className="font-bold text-foreground truncate block">{shipConfig.name ?? "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground block">SHIP SIZE / CLASS</span>
                    <span className="font-bold text-foreground truncate block">{shipConfig.size ?? "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground block">TIER</span>
                    <span className="font-bold text-amber-400">Tier {shipConfig.tier ?? "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground block">COUPLING MODE</span>
                    <span className="font-bold text-cyan-neon truncate block">{powerCoupling}</span>
                  </div>
                </div>
              </div>

              <div className="rounded border border-bridge-border p-3 bg-black/30 flex flex-col gap-2 sm:col-span-2">
                <span className="text-[10px] text-cyan-neon font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5" /> Core Attribute Scores &amp; Modifiers
                </span>
                <div className="grid grid-cols-6 gap-2 text-xs pt-1 text-center">
                  <div className="rounded bg-bridge-panel p-1.5 border border-bridge-border">
                    <span className="text-[9px] text-muted-foreground block">STR</span>
                    <span className="font-bold text-foreground text-sm block">{shipConfig.stats?.strength ?? "N/A"}</span>
                    <span className="text-[10px] text-cyan-neon font-bold block">{shipConfig.stats?.strength !== undefined ? formatMod(getModFromScore(shipConfig.stats.strength)) : "-"}</span>
                  </div>
                  <div className="rounded bg-bridge-panel p-1.5 border border-bridge-border">
                    <span className="text-[9px] text-muted-foreground block">DEX</span>
                    <span className="font-bold text-foreground text-sm block">{shipConfig.stats?.dexterity ?? "N/A"}</span>
                    <span className="text-[10px] text-cyan-neon font-bold block">{shipConfig.stats?.dexterity !== undefined ? formatMod(getModFromScore(shipConfig.stats.dexterity)) : "-"}</span>
                  </div>
                  <div className="rounded bg-bridge-panel p-1.5 border border-bridge-border">
                    <span className="text-[9px] text-muted-foreground block">CON</span>
                    <span className="font-bold text-foreground text-sm block">{shipConfig.stats?.constitution ?? "N/A"}</span>
                    <span className="text-[10px] text-cyan-neon font-bold block">{shipConfig.stats?.constitution !== undefined ? formatMod(getModFromScore(shipConfig.stats.constitution)) : "-"}</span>
                  </div>
                  <div className="rounded bg-bridge-panel p-1.5 border border-bridge-border">
                    <span className="text-[9px] text-muted-foreground block">INT</span>
                    <span className="font-bold text-foreground text-sm block">{shipConfig.stats?.intelligence ?? "N/A"}</span>
                    <span className="text-[10px] text-cyan-neon font-bold block">{shipConfig.stats?.intelligence !== undefined ? formatMod(getModFromScore(shipConfig.stats.intelligence)) : "-"}</span>
                  </div>
                  <div className="rounded bg-bridge-panel p-1.5 border border-bridge-border">
                    <span className="text-[9px] text-muted-foreground block">WIS</span>
                    <span className="font-bold text-foreground text-sm block">{shipConfig.stats?.wisdom ?? "N/A"}</span>
                    <span className="text-[10px] text-cyan-neon font-bold block">{shipConfig.stats?.wisdom !== undefined ? formatMod(getModFromScore(shipConfig.stats.wisdom)) : "-"}</span>
                  </div>
                  <div className="rounded bg-bridge-panel p-1.5 border border-bridge-border">
                    <span className="text-[9px] text-muted-foreground block">CHA</span>
                    <span className="font-bold text-foreground text-sm block">{shipConfig.stats?.charisma ?? "N/A"}</span>
                    <span className="text-[10px] text-cyan-neon font-bold block">{shipConfig.stats?.charisma !== undefined ? formatMod(getModFromScore(shipConfig.stats.charisma)) : "-"}</span>
                  </div>
                </div>
              </div>

              <div className="rounded border border-bridge-border p-3 bg-black/30 flex flex-col gap-2 sm:col-span-3">
                <span className="text-[10px] text-cyan-neon font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> Operational Pools &amp; Defense
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-[9px] text-muted-foreground block">MAX HULL</span>
                    <span className="font-bold text-emerald-400">{effectiveHullMax} HP</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground block">POWER POOL CAP</span>
                    <span className="font-bold text-amber-400">{effectiveMaxPowerDice} ({effectivePowerDieType})</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground block">REACTOR TYPE</span>
                    <span className="font-bold text-cyan-neon uppercase">{rawReactorType}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground block">MAX SHIELDS</span>
                    <span className="font-bold text-foreground">{shipConfig.maxShields ?? "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded border border-red-500/40 bg-red-500/10 text-xs text-red-400">
              🚨 CRITICAL ERROR: No <code className="font-bold">shipConfig</code> object received.
            </div>
          )}
        </div>

        <div className="border-t border-bridge-border pt-2">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Terminal className="h-3.5 w-3.5 text-cyan-neon" />
            <span>All primary engineering circuits nominal</span>
          </div>
        </div>
      </div>

      {/* START-UP & DURESS INITIATION PROTOCOL MODAL */}
      {showStartupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-bridge-panel border border-cyan-neon/70 rounded-md p-5 max-w-xl w-full flex flex-col gap-4 shadow-[0_0_25px_rgba(0,255,255,0.15)] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-bridge-border/60 pb-2">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold tracking-widest text-cyan-neon uppercase">
                  Reactor Ignition &amp; Start-Up Protocol
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
                Integrity: {duressCondition.toUpperCase()} ({currentActualHull}/{effectiveHullMax} HP)
              </span>
            </div>

            <div className="bg-black/60 p-3 rounded border border-bridge-border/60 flex flex-col gap-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-200">
                  Procedures Completed: <strong className="text-cyan-neon text-sm">{initiationProcedures} / {targetProcedures}</strong>
                </span>
                <span className={`text-[10px] font-bold ${initiationProcedures >= targetProcedures ? "text-emerald-400" : "text-amber-300"}`}>
                  {initiationProcedures >= targetProcedures ? "CORE ONLINE" : "COLD INITIATION"}
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

            <div className="bg-black/50 p-3 rounded border border-bridge-border/60 flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-cyan-neon uppercase">Duress Regulation Check</span>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-muted-foreground uppercase">Mod:</span>
                  <input
                    type="number"
                    value={engModInput}
                    onChange={(e) => setEngModInput(parseInt(e.target.value, 10) || 0)}
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
                  Roll Regulation Check
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
                      title="Safety Interlock: Click to enable emergency reactor ignition"
                    >
                      {forcedStartupSafety ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </button>
                    <span className="text-[10px] text-muted-foreground">
                      {forcedStartupSafety ? "IGNITION INTERLOCK DISENGAGED" : "Safety locked (Emergency start guarded)"}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-emerald-400 font-bold uppercase">Ready for Clean Core Ignition</span>
                )}

                <div className="flex items-center gap-2">
                  {isPoweredOn && (
                    <button
                      type="button"
                      onClick={handleShutdownShip}
                      className="px-3 py-2 rounded border border-rose-500/60 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 text-xs font-bold uppercase cursor-pointer"
                    >
                      SCRAM Core
                    </button>
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
                    {initiationProcedures >= targetProcedures ? "Ignite Reactor Core" : `Force Core Start (${initiationProcedures}/10)`}
                  </button>
                </div>
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

    </div>
  )
}