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
  ArrowUp, 
  ArrowDown,
  RefreshCw,
  Sparkles,
  BatteryCharging,
  Activity,
  Users,
  Clock,
  UserMinus,
  Flame,
  PowerOff,
  X,
  Maximize2,
  Minimize2,
  Layers,
  Bookmark,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  CheckCircle2
} from "lucide-react"
import { ShipStats } from "./ship-stats"
import { StationModifications, Modification } from "./ship-modifications"
import { type ShipConfig } from "./ship-setup"
import type { ActiveStatus } from "./defense-station"
import type { ManifestMember, ShipCompartmentId } from "./bridge-dashboard"
import { getCrewRole } from "./bridge-dashboard"

// --- FLAT AVIONICS SOUND SYNTHESIZER & HAPTICS (NO ASSETS REQUIRED) ---
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (!audioCtx && typeof window !== "undefined") {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  return audioCtx
}

function playFlatGlassClick() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === "suspended") ctx.resume()

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(1800, now)
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.012)

    gain.gain.setValueAtTime(0.035, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.012)
  } catch {}
}

function playSubtleEngage() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === "suspended") ctx.resume()

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "triangle"
    osc.frequency.setValueAtTime(520, now)
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.04)

    gain.gain.setValueAtTime(0.04, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.04)
  } catch {}
}

function triggerTactilePulse(type: "tap" | "heavy" = "tap") {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    try {
      if (type === "tap") navigator.vibrate(10)
      else navigator.vibrate([15, 20, 15])
    } catch {}
  }
}

export type EngineeringCardId =
  | "reactor"
  | "powerDice"
  | "boosts"
  | "patch"
  | "recharge"
  | "tacticalAux"
  | "mods"
  | "ship_stats"

interface CustomPreset {
  id: string
  name: string
  activeCards: EngineeringCardId[]
}

const DEFAULT_PRESETS: CustomPreset[] = [
  { id: "power", name: "Power Routing", activeCards: ["reactor", "powerDice"] },
  { id: "combat", name: "Combat Maintenance", activeCards: ["boosts", "patch", "tacticalAux"] },
  { id: "repair", name: "Damage Control", activeCards: ["patch", "recharge"] },
  { id: "all", name: "All Systems", activeCards: ["reactor", "powerDice", "boosts", "patch", "recharge", "tacticalAux", "mods", "ship_stats"] }
]

export interface RechargeResultPayload {
  newHull: number
  newHullDiceSpent: number
  newShields: number
  newShieldDiceSpent: number
}

interface EngineeringStationProps {
  isPoweredOn?: boolean
  onSetPoweredOn?: (powered: boolean) => void
  autoCycleReactor?: boolean
  onToggleAutoCycleReactor?: (enabled: boolean) => void
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
  autoCycleReactor = false,
  onToggleAutoCycleReactor,
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
  // --- MFD MODULAR DECK STATE (PER-CLIENT PERSISTENCE) ---
  const [openCards, setOpenCards] = useState<EngineeringCardId[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sw5e_eng_open_cards")
        if (saved) return JSON.parse(saved)
      } catch {}
    }
    return ["reactor", "boosts", "patch"]
  })

  const [maximizedCard, setMaximizedCard] = useState<EngineeringCardId | null>(null)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sw5e_eng_open_cards", JSON.stringify(openCards))
      } catch {}
    }
  }, [openCards])

  const toggleCard = (id: EngineeringCardId) => {
    if (soundEnabled) {
      playFlatGlassClick()
      triggerTactilePulse("tap")
    }
    setOpenCards((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const applyPreset = (cards: EngineeringCardId[]) => {
    if (soundEnabled) {
      playSubtleEngage()
      triggerTactilePulse("heavy")
    }
    setOpenCards(cards)
    setMaximizedCard(null)
  }

  const handleSaveCustomPreset = () => {
    const name = window.prompt("Enter name for this custom engineering layout:", "Custom Engineering Setup")
    if (!name) return
    if (typeof window !== "undefined") {
      try {
        const key = `sw5e_eng_preset_${Date.now()}`
        localStorage.setItem(key, JSON.stringify({ id: key, name, activeCards: openCards }))
        alert(`Preset '${name}' saved to this device!`)
      } catch {}
    }
  }

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

  const engineeringMods = useMemo(() => {
    return installedMods.filter(
      (m) => m.station?.toLowerCase() === "engineering"
    )
  }, [installedMods])

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

  const shipSize = (shipConfig?.size || "small").toLowerCase()
  const isSmallOrTiny = shipSize === "small" || shipSize === "tiny"
  const isMedium = shipSize === "medium"
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

  // --- STARTUP / SHUTDOWN PROCEDURES MODAL STATE ---
  const [showStartupModal, setShowStartupModal] = useState<boolean>(false)
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

  const duressCondition: "advantage" | "disadvantage" | "normal" = useMemo(() => {
    if (currentActualHull < effectiveHullMax) return "disadvantage"
    if (currentActualHull >= effectiveHullMax && currentActualShields >= effectiveShieldMax) return "advantage"
    return "normal"
  }, [currentActualHull, effectiveHullMax, currentActualShields, effectiveShieldMax])

  const defaultEngMod = shipConfig?.skills?.regulation ?? effectiveConstitutionMod
  const [engModInput] = useState<number>(defaultEngMod)
  const [mishapResultLog, setMishapResultLog] = useState<string | null>(null)

  const evaluateDuressCheck = (total: number): { gained: number; label: string } => {
    if (total >= 30) return { gained: 5, label: "30+ : 5 Checklists Completed" }
    if (total >= 26) return { gained: 4, label: "26-29 : 4 Checklists Completed" }
    if (total >= 21) return { gained: 3, label: "21-25 : 3 Checklists Completed" }
    if (total >= 16) return { gained: 2, label: "16-20 : 2 Checklists Completed" }
    if (total >= 10) return { gained: 1, label: "10-15 : 1 Checklist Completed" }
    return { gained: 0, label: "≤ 9 : No Progress" }
  }

  const handleRollDuressCheck = () => {
    const rollA = Math.floor(Math.random() * 20) + 1
    const rollB = Math.floor(Math.random() * 20) + 1
    let keptD20 = rollA

    if (duressCondition === "advantage") {
      keptD20 = Math.max(rollA, rollB)
    } else if (duressCondition === "disadvantage") {
      keptD20 = Math.min(rollA, rollB)
    }

    const total = keptD20 + engModInput
    const evalResult = evaluateDuressCheck(total)

    setInitiationProcedures((prev) => Math.min(targetProcedures, prev + evalResult.gained))
    setMishapResultLog(
      `Check: d20 [${duressCondition !== "normal" ? `${rollA}, ${rollB} -> Kept ${keptD20}` : keptD20}] + Mod (${engModInput >= 0 ? `+${engModInput}` : engModInput}) = ${total} (${evalResult.label})`
    )
  }

  const handleShutdownShip = () => {
    if (confirm("EMERGENCY REACTOR SHUTDOWN: Shut down main reactor and drop ship to offline state?")) {
      setInitiationProcedures(0)
      setMishapResultLog("🛑 Reactor shut down. Vessel power offline.")
      if (onSetPoweredOn) onSetPoweredOn(false)
      setShowStartupModal(false)
    }
  }

  const resolveMishapTableRoll = (dieRoll: number, bonus: number, isRecursiveSecondRoll: boolean = false): string => {
    const total = dieRoll + bonus
    let description = ""

    if (dieRoll === 20 && bonus === 0) {
      description = "Natural 20 with 0 checklists! Clean ignition, but starts with 0 power dice available."
    } else if (total >= 20) {
      description = `Total ${total} (20+): Clean ignition. Main systems online without consequences.`
    } else if (total >= 18) {
      description = `Total ${total} (18-19): Navcomputer is disabled until ship recharges.`
      onAddStatus?.({
        id: `navcomputer-disabled-${Date.now()}`,
        title: "NAVCOMPUTER DISABLED // OFFLINE",
        effect: "Hyperspace calculations offline until short recharge.",
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
      setMishapResultLog("✅ Optimal Start-Up: All 10 ignition checklists completed cleanly. Primary reactor online.")
      if (onSetPoweredOn) onSetPoweredOn(true)
      return
    }

    const d20 = Math.floor(Math.random() * 20) + 1
    const resultText = resolveMishapTableRoll(d20, initiationProcedures)
    setMishapResultLog(`⚠️ FORCED START (Roll ${d20} + ${initiationProcedures} proc): ${resultText}`)
    if (onSetPoweredOn) onSetPoweredOn(true)
  }

  // --- HARDWARE FEATURE DETECTION ---
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
    "defense",
    "weapons",
    "sensors",
    "communications",
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

      setReactorLog(`${rollDescription}${shieldRegenLog}`)

      if (onCycleReactor) {
        onCycleReactor(generatedAmount)
      }
      
      setIsCycling(false)
    }, 600)
  }

  const executeBoostCheck = (rollTotal: number) => {
    if (!selectedBoostType || boostActionUsed) return

    const isSuccess = rollTotal >= 10
    setBoostActionUsed(true)

    if (!isSuccess) {
      setBoostFeedback(`Check total (${rollTotal}) failed DC 10. Boost action failed.`)
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

    const dieSides = parseInt(effectiveHullDieType.replace(/[^0-9]/g, ""), 10) || 8
    const rollHullDie = () => Math.floor(Math.random() * dieSides) + 1

    let restoredAmount = 0
    const autoProtocolsBonus = hasAutomatedProtocols ? Math.max(1, effectiveIntelligenceMod) : 0

    if (isSuccess) {
      restoredAmount = rollHullDie() + autoProtocolsBonus
      setPatchFeedback(`Patch SUCCESS (Rolled ${total} vs DC ${patchDC}). Restored ${restoredAmount} Hull Points (${effectiveHullDieType}${autoProtocolsBonus > 0 ? ` +${autoProtocolsBonus} Int` : ""}).`)
    } else {
      const die1 = rollHullDie()
      const die2 = rollHullDie()
      restoredAmount = Math.min(die1, die2) + autoProtocolsBonus
      setPatchFeedback(`Patch FAILED (Rolled ${total} vs DC ${patchDC}). Lesser of 2 ${effectiveHullDieType}: Restored ${restoredAmount} Hull Points${autoProtocolsBonus > 0 ? ` (+${autoProtocolsBonus} Int)` : ""}.`)
    }

    if (onPatchHull && restoredAmount > 0) {
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
    setTacticalFeedback(`Electronic Baffle Activated: Suffered ${selfDamage} direct hull damage. Condition cleared!`)
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
    if (lower.includes("ionization")) return "Ionization (1d2-1)"
    if (lower.includes("power core")) return "Power Core (1d2)"
    return "Fuel Cell (+1)"
  }

  // RENDER DOCKED SNAPSHOT CARD TILE
  const renderSnapshotCard = (
    id: EngineeringCardId,
    title: string,
    value: string,
    statusText: string,
    icon: React.ReactNode,
    accentColor: string
  ) => {
    const isOpen = openCards.includes(id)
    return (
      <button
        key={id}
        type="button"
        onClick={() => toggleCard(id)}
        className={`flex flex-col justify-between p-2.5 rounded border transition-all text-left relative overflow-hidden group cursor-pointer ${
          isOpen
            ? "bg-slate-950 border-cyan-neon shadow-[0_0_15px_rgba(0,255,255,0.18)]"
            : "bg-black/60 border-bridge-border/80 hover:border-cyan-neon/50 hover:bg-slate-950/80"
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 group-hover:text-cyan-neon flex items-center gap-1.5 truncate">
            {icon}
            {title}
          </span>
          <span
            className={`w-2 h-2 rounded-full transition-all shrink-0 ${
              isOpen
                ? "bg-cyan-neon shadow-[0_0_8px_#06b6d4] scale-125"
                : "bg-slate-700 group-hover:bg-cyan-neon/50"
            }`}
          />
        </div>

        <div className="my-1.5">
          <span className={`text-sm md:text-base font-bold font-mono tracking-tight block truncate ${accentColor}`}>
            {value}
          </span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest block truncate">
            {statusText}
          </span>
        </div>

        <div className="flex items-center justify-between w-full border-t border-bridge-border/30 pt-1 text-[8px] uppercase text-slate-500">
          <span>PANEL</span>
          <span className={isOpen ? "text-cyan-neon font-bold" : ""}>
            {isOpen ? "OPEN ▲" : "CLOSED ▼"}
          </span>
        </div>
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3.5 w-full font-mono">
      {/* 1. MASTER HEADER & INTEGRATED QUICK-ACTION ACCESS BAR */}
      <header className="flex flex-col xl:flex-row items-start xl:items-center justify-between border-b border-bridge-border pb-2.5 gap-2.5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-glow-cyan text-base md:text-lg font-bold tracking-[0.15em] text-cyan-neon flex items-center gap-2">
              <Cpu className="h-5 w-5 text-cyan-neon" />
              ENGINEERING &amp; REACTOR CORE CONSOLE
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowStartupModal(true)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border transition cursor-pointer ${
                  isPoweredOn
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    : "border-amber-400/60 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 shadow-[0_0_8px_rgba(251,191,36,0.2)] animate-pulse"
                }`}
              >
                <Flame className="h-3 w-3" />
                <span>{isPoweredOn ? "Core: Online" : `Reactor Offline (${initiationProcedures}/10)`}</span>
              </button>

              {isPoweredOn && (
                <button
                  type="button"
                  onClick={handleShutdownShip}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-rose-500/50 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 transition cursor-pointer"
                  title="Emergency Reactor Shutdown"
                >
                  <PowerOff className="h-3 w-3" />
                  <span>Shutdown</span>
                </button>
              )}
            </div>
          </div>
          <p className="text-[10px] tracking-[0.3em] text-muted-foreground/60 mt-0.5">
            {shipConfig?.name?.toUpperCase() || "VESSEL"} // {powerCoupling.toUpperCase()} //{" "}
            <span className={isPoweredOn ? "text-emerald-400 font-bold" : "text-amber-400 font-bold animate-pulse"}>
              {isPoweredOn ? "REACTOR BUS ENERGIZED" : "OFFLINE (AUXILIARY BATTERY)"}
            </span>
          </p>
        </div>

        {/* Telemetry Status Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {autoShieldRegen && (
            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400 flex items-center gap-1">
              <Shield className="h-3 w-3 text-emerald-400" /> AUTO-REGEN ACTIVE
            </span>
          )}

          <span className="rounded border border-cyan-neon/30 bg-cyan-neon/10 px-2 py-0.5 text-[9px] font-bold text-cyan-neon flex items-center gap-1">
            <Zap className="h-3 w-3 text-amber-400" />
            {isDirect ? `CENTRAL: ${availablePowerDice}/${effectiveMaxPowerDice}` : isHubAndSpoke ? `SHARED: ${sharedPoolDice}/${maxSharedPool}` : "DISTRIBUTED MATRIX"}
          </span>
        </div>
      </header>

      {/* 2. PRESET WORKSPACE SELECTOR & AUDIO/HAPTIC MUTE BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded bg-black/60 border border-bridge-border text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-cyan-neon" /> Presets:
          </span>
          {DEFAULT_PRESETS.map((p) => {
            const isMatch =
              p.activeCards.length === openCards.length &&
              p.activeCards.every((c) => openCards.includes(c))
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.activeCards)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition border cursor-pointer ${
                  isMatch
                    ? "bg-cyan-neon/20 border-cyan-neon text-cyan-neon shadow-[0_0_8px_rgba(0,255,255,0.3)]"
                    : "bg-black/40 border-bridge-border/60 text-slate-400 hover:text-white"
                }`}
              >
                {p.name}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => applyPreset([])}
            disabled={openCards.length === 0}
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-slate-700 bg-black/40 text-slate-400 hover:text-rose-400 hover:border-rose-500/50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            title="Collapse all open drawers"
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={handleSaveCustomPreset}
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-amber-400/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 flex items-center gap-1 cursor-pointer"
            title="Save layout view"
          >
            <Bookmark className="w-3 h-3" /> Save View
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSoundEnabled((prev) => !prev)
              triggerTactilePulse("tap")
            }}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold uppercase cursor-pointer transition ${
              soundEnabled
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-slate-800 bg-slate-900 text-slate-500"
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{soundEnabled ? "Audio & Haptics ON" : "Muted"}</span>
          </button>
        </div>
      </div>

      {/* 3. PERSISTENT CREW ROSTER HUD */}
      <div className="rounded border border-cyan-neon/40 bg-black/40 px-3 py-1.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 shadow-[0_0_12px_rgba(0,255,255,0.04)]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs font-bold text-cyan-neon uppercase tracking-wider mr-1">
            <Users className="h-3.5 w-3.5" />
            <span>Manned Engineering:</span>
          </div>

          {assignedCrew.length === 0 ? (
            <span className="text-xs text-amber-300 italic px-2 py-0.5 border border-amber-500/30 bg-amber-950/20 rounded">
              Console Uncrewed — Assign Engineer for checks
            </span>
          ) : (
            assignedCrew.map((member, idx) => {
              const isChief = idx === 0
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
                if (e.target.value) onAssignCrew(e.target.value, "engineering")
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

      {/* 4. TOP-DECK MODULAR SNAPSHOT TILES (8 UNIFORM TILES) */}
      <section className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 w-full">
        {renderSnapshotCard(
          "reactor",
          "Reactor Core",
          getShortReactorDisplayName(rawReactorType),
          autoCycleReactor ? "Auto-Refresh ON" : isCycling ? "Cycling..." : "Cycle Ready",
          <Zap className="w-3 h-3 text-amber-400" />,
          "text-amber-300"
        )}

        {renderSnapshotCard(
          "powerDice",
          "Power Matrix",
          isDistributed ? "Local Pools" : `${availablePowerDice}/${effectiveMaxPowerDice} Dice`,
          powerCoupling.replace(" Power Coupling", ""),
          <Gauge className="w-3 h-3 text-cyan-neon" />,
          "text-cyan-neon"
        )}

        {renderSnapshotCard(
          "boosts",
          "Boost System",
          boostActionUsed ? "Used (Round)" : "Ready (1/Rnd)",
          engineBoostTurnsRemaining > 0 ? "Speed +50 Active" : shieldBoostTurnsRemaining > 0 ? `+${shieldTemp} Temp SP` : "No Boost Active",
          <Sliders className="w-3 h-3 text-cyan-neon" />,
          boostActionUsed ? "text-amber-400" : "text-emerald-400"
        )}

        {renderSnapshotCard(
          "patch",
          "Field Patch",
          `DC ${patchDC}`,
          missingHull > 0 ? `${missingHull} HP Damage` : "Hull Optimal",
          <Wrench className="w-3 h-3 text-emerald-400" />,
          missingHull > 0 ? "text-amber-400" : "text-emerald-400"
        )}

        {renderSnapshotCard(
          "recharge",
          "Ship Recharge",
          `${availableHullDice}/${maxHullDice} Dice`,
          "1-Hr Maintenance",
          <RefreshCw className="w-3 h-3 text-cyan-neon" />,
          "text-cyan-neon"
        )}

        {renderSnapshotCard(
          "tacticalAux",
          "Aux Circuits",
          hasPowerBackup || hasEmergencyGenerator ? "Active Gear" : "Standard",
          powerBackupUsed ? "Backup Expended" : emergencyGenUsed ? "Gen Expended" : "Circuits Ready",
          <BatteryCharging className="w-3 h-3 text-amber-400" />,
          powerBackupUsed || emergencyGenUsed ? "text-amber-400" : "text-emerald-400"
        )}

        {renderSnapshotCard(
          "mods",
          "Hardware",
          `${engineeringMods.length} Mods`,
          "Engineering Mods",
          <Cpu className="w-3 h-3 text-purple-400" />,
          "text-purple-300"
        )}

        {renderSnapshotCard(
          "ship_stats",
          "Ship Stats",
          `AC ${shipConfig?.armorClass ?? 12}`,
          "Armor Class",
          <Activity className="w-3 h-3 text-cyan-neon" />,
          "text-cyan-neon"
        )}
      </section>

      {/* 5. EXPANDABLE DYNAMIC WORKSPACE GRID (RESPONSIVE 2-COLUMN) */}
      {openCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 border border-dashed border-bridge-border/60 rounded bg-black/40 text-center text-xs text-muted-foreground my-2">
          <Cpu className="w-8 h-8 text-cyan-neon/30 mb-2 animate-pulse" />
          <p className="uppercase tracking-widest text-slate-300 font-bold">ALL ENGINEERING PANELS COLLAPSED</p>
          <p className="text-[10px] mt-1 text-slate-500">Tap any status card above or select a preset to expand controls.</p>
        </div>
      ) : (
        <div
          className={`grid gap-3.5 transition-all duration-300 ${
            maximizedCard
              ? "grid-cols-1"
              : openCards.length === 1
              ? "grid-cols-1"
              : "grid-cols-1 lg:grid-cols-2"
          }`}
        >
          {openCards.map((cardId) => {
            if (maximizedCard && maximizedCard !== cardId) return null
            const isMax = maximizedCard === cardId

            return (
              <div
                key={cardId}
                className="flex flex-col rounded-lg border border-cyan-neon/50 bg-bridge-panel p-3.5 shadow-[0_0_20px_rgba(0,255,255,0.06)] relative overflow-hidden transition-all duration-200"
              >
                {/* SUB-PANEL DRAWER HEADER */}
                <div className="flex items-center justify-between border-b border-bridge-border pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-xs bg-cyan-neon shadow-[0_0_6px_#06b6d4]" />
                    <h3 className="text-xs font-bold tracking-widest uppercase text-cyan-neon">
                      {cardId === "reactor" && "Reactor Core & Round Cycle"}
                      {cardId === "powerDice" && "Power Coupling & Station Routing"}
                      {cardId === "boosts" && "Engineering Boost Actions"}
                      {cardId === "patch" && "Emergency Patch Protocol"}
                      {cardId === "recharge" && "Ship Recharge & Maintenance"}
                      {cardId === "tacticalAux" && "Auxiliary Tactical Systems"}
                      {cardId === "mods" && "Installed Engineering Hardware"}
                      {cardId === "ship_stats" && "Ship Ability Scores & Statistics"}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setMaximizedCard((prev) => (prev === cardId ? null : cardId))}
                      className="p-1 rounded text-slate-400 hover:text-cyan-neon hover:bg-black/40 cursor-pointer"
                      title={isMax ? "Restore Multi-Window" : "Maximize"}
                    >
                      {isMax ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCard(cardId)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-black/40 cursor-pointer"
                      title="Collapse Panel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 1. REACTOR WORKSPACE */}
                {cardId === "reactor" && (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="rounded border border-bridge-border p-2 bg-black/30">
                        <span className="text-[9px] text-muted-foreground uppercase block">Reactor Model</span>
                        <span className="font-bold text-amber-300 truncate block">{getFullReactorDisplayName(rawReactorType)}</span>
                      </div>
                      <div className="rounded border border-bridge-border p-2 bg-black/30">
                        <span className="text-[9px] text-muted-foreground uppercase block">Recovery Logic</span>
                        <span className="font-bold text-cyan-neon block">
                          {reactorType.includes("ionization") ? "1d2 - 1" : reactorType.includes("power core") ? "1d2" : "+1 Fixed"}
                        </span>
                      </div>
                      <div className="rounded border border-bridge-border p-2 bg-black/30">
                        <span className="text-[9px] text-muted-foreground uppercase block">Coupling</span>
                        <span className="font-bold text-slate-200 truncate block">{powerCoupling}</span>
                      </div>
                      <div className="rounded border border-bridge-border p-2 bg-black/30">
                        <span className="text-[9px] text-muted-foreground uppercase block">Core State</span>
                        <span className={`font-bold block ${isPoweredOn ? "text-emerald-400" : "text-amber-400 animate-pulse"}`}>
                          {isPoweredOn ? "ONLINE" : "OFFLINE"}
                        </span>
                      </div>
                    </div>

                    {/* AUTOMATED TURN-END REFRESH SWITCH */}
                    <div className="flex items-center justify-between p-2.5 rounded bg-black/60 border border-bridge-border text-xs gap-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-200 uppercase text-[10px] flex items-center gap-1.5">
                          <RefreshCw className={`w-3.5 h-3.5 ${autoCycleReactor ? "text-emerald-400 animate-spin" : "text-slate-400"}`} />
                          Automated Turn-End Reactor Cycle
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          Auto-cycles reactor immediately when all deployed PC crew check off their turn.
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleAutoCycleReactor?.(!autoCycleReactor)}
                        className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition border cursor-pointer shrink-0 ${
                          autoCycleReactor
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.3)] animate-pulse"
                            : "bg-slate-900 border-slate-700 text-slate-500 hover:text-white"
                        }`}
                      >
                        {autoCycleReactor ? "AUTO: ON" : "MANUAL ONLY"}
                      </button>
                    </div>

                    <div className="p-3 rounded border border-amber-500/30 bg-amber-500/5 flex flex-col gap-2">
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Cycle Reactor: Advances the combat round, replenishes station power dice, resets movement budgets, and unchecks crew turns.
                      </p>
                      <button
                        type="button"
                        onClick={handleCycleReactor}
                        disabled={isCycling}
                        className={`w-full py-2.5 rounded border text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 ${
                          isCycling 
                            ? "border-cyan-neon/60 bg-cyan-neon/20 text-cyan-neon shadow-[0_0_12px_rgba(0,240,255,0.3)] animate-pulse" 
                            : "border-amber-500/60 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                        }`}
                      >
                        <RotateCw className={`h-4 w-4 ${isCycling ? "animate-spin" : ""}`} />
                        {isCycling ? "Spooling Core..." : "Cycle Reactor (Manual Round End)"}
                      </button>
                    </div>

                    {reactorLog && (
                      <div className="p-2 rounded border border-cyan-neon/30 bg-cyan-neon/5 text-[11px] text-cyan-neon flex items-center gap-2 animate-pulse">
                        <Terminal className="h-3.5 w-3.5 shrink-0" />
                        <span>{reactorLog}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. POWER DICE & ROUTING WORKSPACE */}
                {cardId === "powerDice" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-bridge-border/40 pb-2">
                      <span className="text-xs text-muted-foreground">
                        {isDirect ? "Central Power Pool" : isHubAndSpoke ? "Shared Pool & Local Nodes" : "Distributed Local Pools"}
                      </span>
                      {(isDistributed || isHubAndSpoke) && (
                        <button
                          type="button"
                          onClick={() => setIsPowerRoutingUnlocked((prev) => !prev)}
                          className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition cursor-pointer ${
                            isPowerRoutingUnlocked
                              ? "bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse"
                              : "bg-slate-900 border-slate-700 text-slate-300 hover:border-cyan-neon"
                          }`}
                        >
                          {isPowerRoutingUnlocked ? <Unlock className="h-3 w-3 text-amber-400" /> : <Lock className="h-3 w-3 text-slate-400" />}
                          <span>{isPowerRoutingUnlocked ? "Lock Prioritization" : "Route Power (Bonus Action)"}</span>
                        </button>
                      )}
                    </div>

                    {isPowerRoutingUnlocked && (
                      <div className="p-1.5 rounded bg-amber-950/40 border border-amber-500/40 text-[10px] text-amber-300">
                        ⚡ Power routing unlocked. Adjust priority hierarchy using the arrows, then click "Lock Prioritization".
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      {priorityOrder.map((stationKey, index) => {
                        const currentDice = stationPools[stationKey] ?? 0
                        return (
                          <div key={stationKey} className="flex items-center justify-between px-2.5 py-1.5 rounded bg-black/40 border border-bridge-border text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-amber-400 w-4">#{index + 1}</span>
                              <span className="font-bold text-slate-200 uppercase">{STATION_NAMES[stationKey]}</span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                {Array.from({ length: maxStationCapacity }).map((_, i) => (
                                  <span
                                    key={i}
                                    className={`h-2.5 w-5 rounded-sm inline-block ${
                                      i < currentDice 
                                        ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]" 
                                        : "bg-black/90 border border-bridge-border"
                                    }`}
                                  />
                                ))}
                              </div>

                              {(isDistributed || isHubAndSpoke) && (
                                <div className="flex items-center gap-0.5">
                                  <button
                                    onClick={() => movePriority(index, "up")}
                                    disabled={index === 0 || !isPowerRoutingUnlocked}
                                    className="p-1 rounded bg-black/60 border border-bridge-border text-slate-300 hover:bg-cyan-neon/20 disabled:opacity-20 cursor-pointer"
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => movePriority(index, "down")}
                                    disabled={index === priorityOrder.length - 1 || !isPowerRoutingUnlocked}
                                    className="p-1 rounded bg-black/60 border border-bridge-border text-slate-300 hover:bg-cyan-neon/20 disabled:opacity-20 cursor-pointer"
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 3. BOOST ACTIONS WORKSPACE */}
                {cardId === "boosts" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-bridge-border/40 pb-2">
                      <span className="text-xs text-muted-foreground">Engineering Boost Action (1 per Round)</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                        boostActionUsed ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      }`}>
                        {boostActionUsed ? "ACTION USED" : "READY"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        disabled={boostActionUsed}
                        onClick={() => setSelectedBoostType("engines")}
                        className={`p-2.5 rounded border text-left flex flex-col gap-1 transition-all cursor-pointer disabled:opacity-50 ${
                          selectedBoostType === "engines" 
                            ? "border-cyan-neon bg-cyan-neon/15 shadow-[0_0_10px_rgba(0,240,255,0.2)]" 
                            : "border-bridge-border bg-black/40 hover:border-cyan-neon/50"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-100">
                          <span>Boost Engines</span>
                          <Gauge className="h-3.5 w-3.5 text-cyan-neon" />
                        </div>
                        <span className="text-[9px] text-muted-foreground">DC 10 Str: +50 ft Speed</span>
                      </button>

                      <button
                        disabled={boostActionUsed}
                        onClick={() => setSelectedBoostType("shields")}
                        className={`p-2.5 rounded border text-left flex flex-col gap-1 transition-all cursor-pointer disabled:opacity-50 ${
                          selectedBoostType === "shields" 
                            ? "border-cyan-neon bg-cyan-neon/15 shadow-[0_0_10px_rgba(0,240,255,0.2)]" 
                            : "border-bridge-border bg-black/40 hover:border-cyan-neon/50"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-100">
                          <span>Boost Shields</span>
                          <Shield className="h-3.5 w-3.5 text-cyan-neon" />
                        </div>
                        <span className="text-[9px] text-muted-foreground">DC 10 Str: +Shield Die Temp SP</span>
                      </button>

                      <button
                        disabled={boostActionUsed}
                        onClick={() => setSelectedBoostType("weapons")}
                        className={`p-2.5 rounded border text-left flex flex-col gap-1 transition-all cursor-pointer disabled:opacity-50 ${
                          selectedBoostType === "weapons" 
                            ? "border-cyan-neon bg-cyan-neon/15 shadow-[0_0_10px_rgba(0,240,255,0.2)]" 
                            : "border-bridge-border bg-black/40 hover:border-cyan-neon/50"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-100">
                          <span>Boost Weapons</span>
                          <Crosshair className="h-3.5 w-3.5 text-cyan-neon" />
                        </div>
                        <span className="text-[9px] text-muted-foreground">DC 10 Str: Next Atk Advantage</span>
                      </button>
                    </div>

                    {selectedBoostType && !boostActionUsed && (
                      <div className="p-2.5 rounded border border-cyan-neon/40 bg-cyan-neon/5 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                        <div className="text-xs">
                          <span className="text-cyan-neon font-bold uppercase">Target: Boost {selectedBoostType}</span>
                          <span className="text-[10px] text-muted-foreground block">Str Mod: {effectiveStrengthMod >= 0 ? `+${effectiveStrengthMod}` : effectiveStrengthMod} • DC 10</span>
                        </div>
                        <div className="flex items-center gap-1.5 w-full sm:w-auto">
                          <button
                            onClick={handleSystemRollBoost}
                            className="flex-1 sm:flex-none px-3 py-1 rounded bg-cyan-neon text-black font-bold text-xs hover:bg-cyan-neon/80 cursor-pointer"
                          >
                            Roll d20 ({formatMod(effectiveStrengthMod)})
                          </button>
                          <form onSubmit={handleManualRollBoost} className="flex gap-1">
                            <input
                              type="number"
                              placeholder="Total"
                              value={manualRollInput}
                              onChange={(e) => setManualRollInput(e.target.value)}
                              className="w-14 px-2 py-0.5 rounded bg-black border border-bridge-border text-xs text-foreground font-mono"
                            />
                            <button
                              type="submit"
                              className="px-2 py-0.5 rounded border border-cyan-neon/50 bg-cyan-neon/10 text-cyan-neon text-xs font-bold hover:bg-cyan-neon/20 cursor-pointer"
                            >
                              Submit
                            </button>
                          </form>
                        </div>
                      </div>
                    )}

                    {boostFeedback && (
                      <div className="p-2 rounded border border-amber-500/40 bg-amber-500/10 text-xs text-amber-300">
                        {boostFeedback}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. PATCH WORKSPACE */}
                {cardId === "patch" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center border-b border-bridge-border/40 pb-2">
                      <div>
                        <span className="text-xs font-bold text-emerald-400 uppercase">Emergency Damage Control</span>
                        <span className="text-[10px] text-muted-foreground block">Patch DC: {patchDC} (Missing Hull: {missingHull} HP)</span>
                      </div>
                      {(hasDamageControl || hasAutomatedProtocols) && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-cyan-400/40 bg-cyan-950/40 text-cyan-300">
                          {hasAutomatedProtocols ? "REACTION PATCH" : "BONUS PATCH"}
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Make a Constitution (Patch) check. Success: Roll {effectiveHullDieType} Hull Die{hasAutomatedProtocols ? ` + ${Math.max(1, effectiveIntelligenceMod)} (Int Mod)` : ""}. Failure: Roll {effectiveHullDieType} twice and take lesser{hasAutomatedProtocols ? ` + ${Math.max(1, effectiveIntelligenceMod)} (Int Mod)` : ""}.
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => handlePatchCheck(true)}
                        className="px-3 py-1.5 rounded border border-emerald-500/50 bg-emerald-500/20 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 cursor-pointer flex items-center gap-1.5"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        Standard Patch (d20 {formatMod(effectivePatchSkillMod)})
                      </button>

                      {(hasDamageControl || hasAutomatedProtocols) && (
                        <button
                          disabled={quickPatchUses >= tierUses}
                          onClick={() => {
                            setQuickPatchUses((prev) => prev + 1)
                            handlePatchCheck(true)
                          }}
                          className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer flex items-center gap-1.5 border ${
                            quickPatchUses >= tierUses
                              ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                              : "border-cyan-neon/60 bg-cyan-neon/20 text-cyan-neon hover:bg-cyan-neon/30"
                          }`}
                        >
                          <Zap className="h-3.5 w-3.5 text-cyan-neon" />
                          {hasAutomatedProtocols ? "Reaction Patch" : "Bonus Action Patch"} ({tierUses - quickPatchUses} Left)
                        </button>
                      )}

                      {patchFeedback && (
                        <button
                          onClick={handleResetPatch}
                          className="px-2.5 py-1.5 rounded border border-bridge-border bg-black/40 text-slate-400 text-xs hover:text-white cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {patchFeedback && (
                      <div className="p-2.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-xs text-emerald-300 flex flex-col gap-1">
                        <span>{patchFeedback}</span>
                        <span className="text-[10px] text-emerald-400 font-bold">
                          ✓ Hull Integrity automatically updated.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. RECHARGE WORKSPACE */}
                {cardId === "recharge" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-bridge-border/40 pb-2">
                      <span className="text-xs font-bold text-cyan-neon uppercase">1-Hour Short Rest Maintenance</span>
                      <span className="text-[10px] text-muted-foreground font-mono">Hull Dice Pool: {availableHullDice}/{maxHullDice}</span>
                    </div>

                    {rechargeStep === "idle" ? (
                      <div className="flex flex-col gap-2">
                        <div className="text-[11px] text-muted-foreground space-y-1">
                          <p>• Shields will auto-restore to 100% ({effectiveShieldMax} SP) and recover +{shieldDiceToRestore} Shield Dice.</p>
                          <p>• Spend available Hull Dice with Mechanic's Kit checks for field repairs.</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleStartRechargeProcess}
                          className="w-full py-2 bg-cyan-neon/20 hover:bg-cyan-neon/30 text-cyan-neon border border-cyan-neon/60 rounded text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Initiate 1-Hour Maintenance</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between bg-black/40 p-2 rounded border border-bridge-border text-xs">
                          <span className="text-muted-foreground">Select Hull Dice to Spend:</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDiceCountToSpend((prev) => Math.max(1, prev - 1))}
                              disabled={diceCountToSpend <= 1}
                              className="px-2 py-0.5 rounded bg-black border border-bridge-border text-foreground hover:bg-cyan-neon/20 disabled:opacity-30 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-bold text-cyan-neon font-mono">{diceCountToSpend}</span>
                            <button
                              type="button"
                              onClick={() => setDiceCountToSpend((prev) => Math.min(availableHullDice, prev + 1))}
                              disabled={diceCountToSpend >= availableHullDice}
                              className="px-2 py-0.5 rounded bg-black border border-bridge-border text-foreground hover:bg-cyan-neon/20 disabled:opacity-30 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            placeholder={`Sum of ${diceCountToSpend} dice`}
                            value={rawRollTotalInput}
                            onChange={(e) => setRawRollTotalInput(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 bg-black border border-bridge-border rounded text-xs text-foreground font-mono focus:border-cyan-neon outline-none"
                          />
                          <span className="text-xs font-bold text-emerald-400 font-mono">
                            Net: +{calculatedHullRegained} HP
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleExecuteRecharge(false)}
                            className="flex-1 py-1.5 bg-black/40 hover:bg-black/60 border border-bridge-border text-slate-300 rounded text-xs font-bold uppercase cursor-pointer"
                          >
                            Shields Only
                          </button>
                          <button
                            type="button"
                            disabled={parsedRawRoll <= 0}
                            onClick={() => handleExecuteRecharge(true)}
                            className="flex-1 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/60 text-emerald-300 disabled:opacity-40 rounded text-xs font-bold uppercase cursor-pointer"
                          >
                            Apply +{calculatedHullRegained} HP
                          </button>
                        </div>
                      </div>
                    )}

                    {rechargeFeedback && (
                      <div className="p-2 rounded border border-emerald-500/40 bg-emerald-500/10 text-xs text-emerald-300">
                        {rechargeFeedback}
                      </div>
                    )}
                  </div>
                )}

                {/* 6. TACTICAL AUXILIARIES WORKSPACE */}
                {cardId === "tacticalAux" && (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {hasPowerBackup && (
                        <button
                          disabled={powerBackupUsed}
                          onClick={handleTriggerPowerBackup}
                          className={`p-2.5 rounded border text-left flex flex-col gap-1 transition cursor-pointer ${
                            powerBackupUsed
                              ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                              : "bg-amber-500/10 border-amber-400 text-amber-300 hover:bg-amber-500/20"
                          }`}
                        >
                          <div className="flex justify-between items-center font-bold">
                            <span>Power Backup</span>
                            <span>{powerBackupUsed ? "EXPENDED" : "READY"}</span>
                          </div>
                          <span className="text-[9px] text-muted-foreground">Drop to 1 HP instead of 0</span>
                        </button>
                      )}

                      {hasEmergencyGenerator && (
                        <button
                          disabled={emergencyGenUsed}
                          onClick={() => handleTriggerEmergencyGenerator("drop1")}
                          className={`p-2.5 rounded border text-left flex flex-col gap-1 transition cursor-pointer ${
                            emergencyGenUsed
                              ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                              : "bg-cyan-500/10 border-cyan-neon text-cyan-neon hover:bg-cyan-500/20"
                          }`}
                        >
                          <div className="flex justify-between items-center font-bold">
                            <span>Emergency Gen</span>
                            <span>{emergencyGenUsed ? "EXPENDED" : "READY"}</span>
                          </div>
                          <span className="text-[9px] text-muted-foreground">Drop shields to 1 SP</span>
                        </button>
                      )}

                      {hasElectronicBaffle && (
                        <button
                          disabled={baffleUses >= tierUses}
                          onClick={handleTriggerElectronicBaffle}
                          className={`p-2.5 rounded border text-left flex flex-col gap-1 transition cursor-pointer ${
                            baffleUses >= tierUses
                              ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                              : "bg-rose-500/10 border-rose-400 text-rose-300 hover:bg-rose-500/20"
                          }`}
                        >
                          <div className="flex justify-between items-center font-bold">
                            <span>Electronic Baffle</span>
                            <span>{tierUses - baffleUses}/{tierUses}</span>
                          </div>
                          <span className="text-[9px] text-muted-foreground">Roll 1 HD self-damage to clear condition</span>
                        </button>
                      )}

                      {hasAltFuelConverter && (
                        <button
                          disabled={altFuelUses >= tierUses}
                          onClick={handleTriggerAltFuel}
                          className={`p-2.5 rounded border text-left flex flex-col gap-1 transition cursor-pointer ${
                            altFuelUses >= tierUses
                              ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                              : "bg-emerald-500/10 border-emerald-400 text-emerald-300 hover:bg-emerald-500/20"
                          }`}
                        >
                          <div className="flex justify-between items-center font-bold">
                            <span>Alt Fuel Converter</span>
                            <span>{tierUses - altFuelUses}/{tierUses}</span>
                          </div>
                          <span className="text-[9px] text-muted-foreground">DC 10 Regulation: +1 Day Fuel</span>
                        </button>
                      )}
                    </div>

                    {tacticalFeedback && (
                      <div className="p-2 rounded bg-black/60 border border-bridge-border text-xs text-cyan-neon font-mono">
                        {tacticalFeedback}
                      </div>
                    )}
                  </div>
                )}

                {/* 7. HARDWARE MODIFICATIONS WORKSPACE */}
                {cardId === "mods" && (
                  <div className="flex flex-col gap-2">
                    <StationModifications 
                      station="Engineering" 
                      installedMods={installedMods} 
                      onRemoveMod={onRemoveMod} 
                    />
                  </div>
                )}

                {/* 8. SHIP ABILITY SCORES & STATISTICS WORKSPACE */}
                {cardId === "ship_stats" && (
                  <div className="flex flex-col gap-3">
                    <ShipStats shipConfig={shipConfig} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 6. CHASSIS TACTICAL SURGES & REACTIONS (ALWAYS READY TRAY AT BOTTOM) */}
      {shipTier >= 3 && (
        <section className="rounded-md border border-cyan-neon/40 bg-bridge-panel p-2.5 shadow-[0_0_12px_rgba(0,255,255,0.04)] flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-bridge-border/60 pb-1">
            <h3 className="text-[10px] font-bold tracking-[0.2em] text-cyan-neon uppercase flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-neon" />
              Chassis Tactical Surges (Tier {shipTier})
            </h3>
            <span className="text-[8px] font-mono text-muted-foreground">COMBAT ACTIONS</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {isSmallOrTiny && shipTier >= 4 && (
              <button
                type="button"
                disabled={standingByUsed}
                onClick={onUseStandingBy}
                className={`p-2 rounded border text-left transition cursor-pointer ${
                  standingByUsed
                    ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-black/40 border-cyan-neon/50 text-cyan-neon hover:bg-cyan-950/40"
                }`}
              >
                <div className="flex justify-between text-[10px] font-bold">
                  <span>Standing By</span>
                  <span>{standingByUsed ? "USED" : "READY"}</span>
                </div>
                <span className="text-[8px] text-slate-400 block mt-0.5">Reaction: +1 Extra Action</span>
              </button>
            )}

            {isSmallOrTiny && shipTier >= 5 && (
              <button
                type="button"
                disabled={leafOnTheWindUsed}
                onClick={onUseLeafOnTheWind}
                className={`p-2 rounded border text-left transition cursor-pointer ${
                  leafOnTheWindUsed
                    ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-black/40 border-emerald-500/50 text-emerald-400 hover:bg-emerald-950/40"
                }`}
              >
                <div className="flex justify-between text-[10px] font-bold">
                  <span>Leaf on the Wind</span>
                  <span>{leafOnTheWindUsed ? "USED" : "READY"}</span>
                </div>
                <span className="text-[8px] text-slate-400 block mt-0.5">Reaction: Treat roll as Nat 20</span>
              </button>
            )}

            {isMedium && hasVersatileTransport && (
              <button
                type="button"
                disabled={versatileTransportUsed >= versatileMax}
                onClick={handleUseVersatileTransport}
                className={`p-2 rounded border text-left transition cursor-pointer ${
                  versatileTransportUsed >= versatileMax
                    ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-black/40 border-cyan-400/50 text-cyan-300 hover:bg-cyan-950/40"
                }`}
              >
                <div className="flex justify-between text-[10px] font-bold">
                  <span>Versatile Transport</span>
                  <span>{versatileMax - versatileTransportUsed}/{versatileMax}</span>
                </div>
                <span className="text-[8px] text-slate-400 block mt-0.5">Reaction: Grant Advantage</span>
              </button>
            )}

            {isMedium && hasBestShip && (
              <button
                type="button"
                disabled={bestShipInVerseUsed}
                onClick={handleUseBestShip}
                className={`p-2 rounded border text-left transition cursor-pointer ${
                  bestShipInVerseUsed
                    ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-black/40 border-amber-400/50 text-amber-300 hover:bg-amber-950/40"
                }`}
              >
                <div className="flex justify-between text-[10px] font-bold">
                  <span>Best Ship in 'Verse</span>
                  <span>{bestShipInVerseUsed ? "EXP" : "READY"}</span>
                </div>
                <span className="text-[8px] text-slate-400 block mt-0.5">Action: Gain Resistance</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* MODAL: STARTUP PROTOCOL */}
      {showStartupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-bridge-panel border border-cyan-neon/70 rounded-md p-5 max-w-xl w-full flex flex-col gap-4 shadow-[0_0_25px_rgba(0,255,255,0.15)] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-bridge-border/60 pb-2">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold tracking-widest text-cyan-neon uppercase">
                  Reactor Ignition Protocol
                </h3>
              </div>
              <button onClick={() => setShowStartupModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300">Nominal Warm-Up: <strong className="text-amber-300">{normalStartupTime}</strong></span>
              <span className="text-xs text-cyan-neon font-bold uppercase">{duressCondition}</span>
            </div>

            <div className="bg-black/60 p-3 rounded border border-bridge-border/60 flex flex-col gap-2">
              <div className="flex justify-between text-xs font-bold text-slate-200">
                <span>Checklists Completed:</span>
                <span className="text-cyan-neon">{initiationProcedures} / {targetProcedures}</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-sm overflow-hidden">
                <div className="h-full bg-cyan-neon" style={{ width: `${(initiationProcedures / 10) * 100}%` }} />
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
              <button
                onClick={handleEngageStartup}
                className="px-4 py-1.5 rounded border border-emerald-500/60 bg-emerald-500/20 text-xs font-bold text-emerald-300 uppercase cursor-pointer"
              >
                Engage Core
              </button>
            </div>

            {mishapResultLog && (
              <div className="p-2 rounded bg-black/80 border border-amber-400/50 text-[11px] text-amber-300">
                {mishapResultLog}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}