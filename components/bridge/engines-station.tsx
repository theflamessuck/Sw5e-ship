"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { CombatResources } from "./combat-resources"
import { StationModifications, type Modification } from "./ship-modifications"
import { ShipStats } from "./ship-stats"
import type { JourneyData } from "./navcomputer-station"
import type { ShipConfig } from "./ship-setup"
import type { OrdnanceItem } from "./weapons-station"
import type { ActiveStatus } from "./defense-station"
import type {
  ManifestMember,
  ShipCompartmentId,
  TacticalMovementState
} from "./bridge-dashboard"
import { getCrewRole } from "./bridge-dashboard"
import { STARSHIP_AMMUNITION, STARSHIP_WEAPONS } from "@/lib/starship-weapons"
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
  Flame,
  BookOpen,
  PowerOff,
  Crosshair,
  XCircle,
  Dices,
  Ban,
  PackagePlus,
  Undo2,
  Swords,
  Sparkles,
  Radio,
  Sliders,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Cpu,
  Layers,
  ShieldAlert,
  Activity,
  X,
  Zap
} from "lucide-react"
import {
  rollAttackD20,
  rollDamage,
  resolveAdvantageMode,
  type AttackRollResult,
  type DamageRollBreakdown
} from "@/lib/combat-roller"

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

export type SectionCardId =
  | "movement"
  | "resources"
  | "weapons"
  | "fuel"
  | "time"
  | "ftl"
  | "mods"
  | "ship_stats"

interface CustomPreset {
  id: string
  name: string
  activeCards: SectionCardId[]
}

const DEFAULT_PRESETS: CustomPreset[] = [
  { id: "combat", name: "Tactical Combat", activeCards: ["movement", "weapons", "resources"] },
  { id: "cruise", name: "Sublight Cruise", activeCards: ["fuel", "time"] },
  { id: "transit", name: "Hyperspace Vector", activeCards: ["ftl", "time"] },
  { id: "all", name: "All Panels", activeCards: ["movement", "resources", "weapons", "fuel", "time", "ftl", "mods", "ship_stats"] }
]

type FlightEnvironment = "Space" | "Atmosphere" | "Underwater"
type TransponderMode = "PRIMARY" | "SECURE_BACKUP"
type LauncherFamily = "Missile launcher" | "Cluster pod" | "Torpedo launcher" | "Quaternary Ammunition"
type HelmAttackType = "standard" | "attack_run" | "dogfight"

interface LauncherLoadState {
  ordnanceId: string | null
  ordnanceName: string | null
  loadedCount: number
  maxCapacity: number
  damage: string | null
  damageType: string | null
}

function getLauncherFamily(weaponName: string): LauncherFamily | null {
  const norm = weaponName.toLowerCase()
  if (norm.includes("rocket") || norm.includes("cluster")) return "Cluster pod"
  if (norm.includes("missile")) return "Missile launcher"
  if (norm.includes("torpedo")) return "Torpedo launcher"
  if (norm.includes("bomb") || norm.includes("mine") || norm.includes("layer") || norm.includes("deployer")) return "Quaternary Ammunition"
  return null
}

function findArmedAmmoCatalog(launcherState: LauncherLoadState | null) {
  if (!launcherState || !launcherState.ordnanceId) return null
  return (
    STARSHIP_AMMUNITION.find((a) => a.id === launcherState.ordnanceId) ||
    STARSHIP_AMMUNITION.find((a) => a.name.toLowerCase() === (launcherState.ordnanceName || "").toLowerCase()) ||
    null
  )
}

function generateTransponderCode(modelName?: string): string {
  const clean = (modelName || "VESSEL").replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
  const prefix = (clean.slice(0, 4) || "STAR").padEnd(4, "X")
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let randomPart = ""
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  const serial = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${randomPart}-${serial}`
}

interface PilotAction {
  name: string
  description: string
  category: "Combat & Movement" | "Defense & Maneuvers" | "Utility"
}

const PILOT_ACTIONS: PilotAction[] = [
  {
    name: "Detect",
    category: "Utility",
    description: "Devote your attention to finding something on sensors. The DM might have you make a Wisdom (Scan) check or an Intelligence (Probe) check."
  },
  {
    name: "Fire",
    category: "Combat & Movement",
    description: "Make an attack with one ship weapon. Normal attacks with Primary and Secondary weapons made from the Helm suffer disadvantage unless performing an Attack Run or Dogfight."
  },
  {
    name: "Attack Run",
    category: "Combat & Movement",
    description: "Move at least 150 ft in a direct, unobstructed line towards an enemy. You may then fire a forward-facing weapon without normal helm disadvantage, Ram with advantage, or Conceal your vessel."
  },
  {
    name: "Dogfight",
    category: "Defense & Maneuvers",
    description: "Engage an enemy within close quarters. Make an opposed Dexterity (Maneuvering) check. On success, the target's next attack against you suffers disadvantage, and you may attack with a forward weapon without helm disadvantage."
  },
  {
    name: "Evade",
    category: "Defense & Maneuvers",
    description: "Focus entirely on defensive maneuvers. Until your next turn, attacks against your ship suffer disadvantage, and you gain advantage on Dexterity saving throws. Any attacks made by your ship also suffer disadvantage."
  },
  {
    name: "Fly",
    category: "Combat & Movement",
    description: "Gain extra tactical movement for the current turn equal to your modified flying speed (e.g., 300 ft becomes 600 ft). Attacks made from your ship suffer disadvantage until the end of next turn."
  },
  {
    name: "Harass",
    category: "Combat & Movement",
    description: "Lock an enemy in dogfighting maneuvers. Make an opposed Dexterity (Maneuvering) check. On success, if the enemy voluntarily moves away before your next turn, it suffers critical hit damage from your selected primary weapon."
  },
  {
    name: "Hard Turn",
    category: "Defense & Maneuvers",
    description: "Pivot your vessel 90 degrees instantly without expending any of your flying speed budget."
  },
  {
    name: "Ram",
    category: "Combat & Movement",
    description: "Attempt to collide with another ship in its space. Make a Strength (Ram) check opposed by the target's Dexterity (Maneuvering) check. On success, both vessels take kinetic damage equal to 2 Hull Dice + STR mod."
  },
  {
    name: "Retro Thrusters",
    category: "Defense & Maneuvers",
    description: "Reaction when damaged by a weapon: Move up to 50 ft in any direction and halve the incoming damage. Recharges on a short or full recharge."
  },
  {
    name: "Conceal",
    category: "Utility",
    description: "Make a Dexterity (Hide) check using asteroid fields, nebulae, or debris to obscure your vessel and become an unseen attacker."
  }
]

interface EnginesStationProps {
  isPoweredOn?: boolean
  onSetPoweredOn?: (powered: boolean) => void
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
  onUpdateMod?: (instanceId: string, updates: Partial<Modification>) => void
  ordnanceList?: OrdnanceItem[]
  onUpdateOrdnanceList?: (
    newList: OrdnanceItem[] | ((prev: OrdnanceItem[]) => OrdnanceItem[])
  ) => void
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
  versatileTransportUsed?: number
  onUpdateVersatileTransportUsed?: (count: number | ((prev: number) => number)) => void
  bestShipInVerseUsed?: boolean
  onUpdateBestShipInVerseUsed?: (used: boolean | ((prev: boolean) => boolean)) => void
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
  onAddStatus?: (status: ActiveStatus) => void
  effectiveSlowedLevel?: number
  manifest?: ManifestMember[]
  onAssignCrew?: (memberId: string, targetLocation: ShipCompartmentId) => void
  onToggleTurn?: (memberId: string) => void
  tacticalMovement?: TacticalMovementState
  onSpendMovement?: (feet: number) => void
  onResetMovement?: () => void
  isWeaponsBoosted?: boolean
  onConsumeWeaponBoost?: () => void
  transponderCode?: string
  onUpdateTransponderCode?: (code: string) => void
}

export function EnginesStation({
  isPoweredOn = true,
  onSetPoweredOn,
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
  proficiencyBonus = 2,
  currentFuel = 30,
  maxFuel = 30,
  onFuelChange,
  installedMods = [],
  onRemoveMod = () => {},
  onUpdateMod,
  ordnanceList = [],
  onUpdateOrdnanceList,
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
  versatileTransportUsed,
  onUpdateVersatileTransportUsed,
  bestShipInVerseUsed,
  onUpdateBestShipInVerseUsed,
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
  onAddStatus,
  effectiveSlowedLevel = 0,
  manifest = [],
  onAssignCrew,
  onToggleTurn,
  tacticalMovement = { spentFeet: 0 },
  onSpendMovement,
  onResetMovement,
  isWeaponsBoosted = false,
  onConsumeWeaponBoost,
  transponderCode: externalTransponderCode,
  onUpdateTransponderCode,
}: EnginesStationProps) {
  // --- MFD MODULAR DECK STATE (PER-CLIENT PERSISTENCE) ---
  const [openCards, setOpenCards] = useState<SectionCardId[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sw5e_helm_open_cards")
        if (saved) return JSON.parse(saved)
      } catch {}
    }
    return ["movement", "resources"]
  })

  const [maximizedCard, setMaximizedCard] = useState<SectionCardId | null>(null)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sw5e_helm_open_cards", JSON.stringify(openCards))
      } catch {}
    }
  }, [openCards])

  const toggleCard = (id: SectionCardId) => {
    if (soundEnabled) {
      playFlatGlassClick()
      triggerTactilePulse("tap")
    }
    setOpenCards((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const applyPreset = (cards: SectionCardId[]) => {
    if (soundEnabled) {
      playSubtleEngage()
      triggerTactilePulse("heavy")
    }
    setOpenCards(cards)
    setMaximizedCard(null)
  }

  const engineMods = useMemo(() => {
    return installedMods.filter(
      (m) => m.station?.toLowerCase() === "engines"
    )
  }, [installedMods])

  // --- HELM & ENGINE SUB-SYSTEM STATES ---
  const [showStartupModal, setShowStartupModal] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [awayMissionDaysInput, setAwayMissionDaysInput] = useState<string>("7")
  const [helmAttackType, setHelmAttackType] = useState<HelmAttackType>("standard")
  const [dogfightCheckResult, setDogfightCheckResult] = useState<string | null>(null)

  const hasSecondaryTransponderMod = useMemo(() => {
    return installedMods.some((mod) => {
      const name = (mod.name || "").toLowerCase()
      return (
        name.includes("secondary transponder") ||
        name.includes("alternate transponder") ||
        (name.includes("transponder") && name.includes("code"))
      )
    })
  }, [installedMods])

  const currentModel = shipConfig?.model || ""
  const [lastTrackedModel, setLastTrackedModel] = useState<string>(currentModel)
  const [localTransponderCode, setLocalTransponderCode] = useState<string>(() =>
    generateTransponderCode(currentModel)
  )

  const primaryTransponder = externalTransponderCode || localTransponderCode

  useEffect(() => {
    if (currentModel && currentModel !== lastTrackedModel) {
      const newCode = generateTransponderCode(currentModel)
      setLastTrackedModel(currentModel)
      if (onUpdateTransponderCode) {
        onUpdateTransponderCode(newCode)
      } else {
        setLocalTransponderCode(newCode)
      }
    }
  }, [currentModel, lastTrackedModel, onUpdateTransponderCode])

  const [backupTransponder] = useState<string>(() => "CIV-FREIGHTER-9021X")
  const [transponderMode, setTransponderMode] = useState<TransponderMode>("PRIMARY")

  useEffect(() => {
    if (!hasSecondaryTransponderMod && transponderMode !== "PRIMARY") {
      setTransponderMode("PRIMARY")
    }
  }, [hasSecondaryTransponderMod, transponderMode])

  const handleToggleTransponder = () => {
    if (!hasSecondaryTransponderMod) {
      alert("Feature Locked: Requires 'Secondary Transponder Code' modification.")
      return
    }
    setTransponderMode((prev) => (prev === "PRIMARY" ? "SECURE_BACKUP" : "PRIMARY"))
  }

  const assignedCrew = useMemo(() => {
    return manifest
      .filter((m) => m.location === "helm" && !m.isPassenger)
      .sort((a, b) => a.assignedOrder - b.assignedOrder)
  }, [manifest])

  const availablePersonnel = useMemo(() => {
    return manifest.filter((m) => m.location !== "helm" && !m.isPassenger)
  }, [manifest])

  const hasSFoils = installedMods.some((m) => m.name.toUpperCase().trim() === "S-FOILS")
  const [internalSFoilsMode, setInternalSFoilsMode] = useState<"locked" | "unlocked">("unlocked")
  const activeSFoilsMode = externalSFoilsMode ?? internalSFoilsMode

  const handleToggleSFoils = (newMode: "locked" | "unlocked") => {
    if (onToggleSFoils) onToggleSFoils(newMode)
    else setInternalSFoilsMode(newMode)
  }

  const isTurretMounted = (w: Modification): boolean => {
    if (w.mountedOnInstanceId) {
      const parent = installedMods.find((m) => m.instanceId === w.mountedOnInstanceId || m.id === w.mountedOnInstanceId)
      if (parent && parent.name.toLowerCase().includes("turret")) return true
    }
    const loc = (w.location || "").toLowerCase()
    return loc.includes("turret")
  }

  const getAssignedGunner = (w: Modification): ManifestMember | null => {
    if (!isTurretMounted(w)) return null
    const turretCompartmentId: ShipCompartmentId = `turret-${w.instanceId || w.id}`
    return manifest.find((m) => m.location === turretCompartmentId && !m.isPassenger) || null
  }

  const forwardWeapons = useMemo(() => {
    return installedMods.filter((mod) => {
      if (mod.name === "Fixed Hardpoint" || mod.name === "Turret Hardpoint") return false
      const isWeaponCategory =
        mod.category === "Weapon System" ||
        mod.station === "Weapons" ||
        mod.category === "Weapon" ||
        mod.category === "Ordnance"
      if (!isWeaponCategory) return false

      const loc = (mod.location || "").toLowerCase().trim()
      const isBow = loc === "bow" || loc === "forward" || loc.includes("bow") || loc === ""

      if (isTurretMounted(mod)) {
        return !getAssignedGunner(mod)
      }
      return isBow
    })
  }, [installedMods, manifest])

  // Get launcher state directly from modification object (synchronized with database)
  const getLauncherState = (instanceKey: string, weapon: Modification): LauncherLoadState => {
    const catalogDef = STARSHIP_WEAPONS.find((sw) => sw.name.toLowerCase() === weapon.name.toLowerCase())
    const capacity = weapon.reload || catalogDef?.reload || 4
    const syncedOrdnance = (weapon as any).loadedOrdnance

    if (syncedOrdnance) {
      return {
        ordnanceId: syncedOrdnance.id ?? null,
        ordnanceName: syncedOrdnance.name ?? null,
        loadedCount: syncedOrdnance.loadedCount ?? 0,
        maxCapacity: capacity,
        damage: syncedOrdnance.damage ?? null,
        damageType: syncedOrdnance.damageType ?? null,
      }
    }

    return {
      ordnanceId: null,
      ordnanceName: null,
      loadedCount: 0,
      maxCapacity: capacity,
      damage: null,
      damageType: null,
    }
  }

  const handleCoolMountedWeapon = (instanceId: string) => {
    onUpdateMod?.(instanceId, { currentHeat: 0 } as any)
  }

  const [weaponArmModal, setWeaponArmModal] = useState<{ weapon: Modification } | null>(null)

  const executeArmLauncher = (targetLauncher: Modification, ordnance: OrdnanceItem) => {
    const key = targetLauncher.instanceId || targetLauncher.id
    const state = getLauncherState(key, targetLauncher)

    if (state.ordnanceId && state.ordnanceId !== ordnance.id && state.loadedCount > 0) {
      alert(`Cannot mix warheads: ${targetLauncher.name} already contains ${state.ordnanceName}.`)
      return
    }

    if (ordnance.currentReserve <= 0) {
      alert(`No ${ordnance.name} available in ship cargo reserve.`)
      return
    }

    const needed = state.maxCapacity - state.loadedCount
    if (needed <= 0) {
      alert(`${targetLauncher.name} is at maximum capacity (${state.maxCapacity}/${state.maxCapacity}).`)
      return
    }

    const transferAmount = Math.min(needed, ordnance.currentReserve)
    const newLoadedTotal = state.loadedCount + transferAmount

    onUpdateOrdnanceList?.((prev) =>
      prev.map((o) => (o.id === ordnance.id ? { ...o, currentReserve: o.currentReserve - transferAmount } : o))
    )

    onUpdateMod?.(key, {
      loadedOrdnance: {
        id: ordnance.id,
        name: ordnance.name,
        loadedCount: newLoadedTotal,
        damage: ordnance.damage,
        damageType: ordnance.damageType,
      },
    } as any)

    setWeaponArmModal(null)
  }

  const handleDisarmLauncher = (instanceKey: string, launcher: Modification) => {
    const state = getLauncherState(instanceKey, launcher)
    if (!state.ordnanceId || state.loadedCount <= 0) return

    const ordnanceId = state.ordnanceId
    const returnCount = state.loadedCount

    onUpdateOrdnanceList?.((prev) =>
      prev.map((o) => (o.id === ordnanceId ? { ...o, currentReserve: o.currentReserve + returnCount } : o))
    )

    onUpdateMod?.(instanceKey, {
      loadedOrdnance: null,
    } as any)
  }

  const specialization = shipConfig?.roleSpecialization
  const isAttackFighter = specialization === "Attack Fighter"
  const isBomber = specialization === "Bomber"
  const isGunshipSpec = specialization === "Gunship"

  const rawWis = shipConfig?.stats?.wisdom ?? 10
  const wisBoost = shipConfig?.tierStatBoosts?.wisdom ?? 0
  const wisMod = Math.floor((rawWis + wisBoost - 10) / 2)

  const rawStr = shipConfig?.stats?.strength ?? 10
  const strBoost = shipConfig?.tierStatBoosts?.strength ?? 0
  const strMod = Math.floor((rawStr + strBoost - 10) / 2)

  const rawCon = shipConfig?.stats?.constitution ?? 10
  const conBoost = shipConfig?.tierStatBoosts?.constitution ?? 0
  const conScore = rawCon + conBoost

  const rawDex = shipConfig?.stats?.dexterity ?? 10
  const dexBoost = shipConfig?.tierStatBoosts?.dexterity ?? 0
  const dexMod = Math.floor((rawDex + dexBoost - 10) / 2)

  const computeAttackModDisplay = (weaponProperties: string[] = [], isPrimary: boolean = true) => {
    const isSaturate = weaponProperties.some((p) => p.toLowerCase().includes("saturate"))
    const baseMod = isSaturate ? Math.max(wisMod, strMod) : wisMod
    const sFoilsAtkDelta = hasSFoils && isPrimary ? (activeSFoilsMode === "locked" ? -2 : 1) : 0
    const boosted = baseMod + (isAttackFighter ? 1 : 0) + sFoilsAtkDelta

    const sourceBreakdowns: string[] = []
    sourceBreakdowns.push(`${baseMod >= 0 ? `+${baseMod}` : baseMod} from ${isSaturate ? "Strength/Wisdom" : "Wisdom"} Modifier`)
    if (isAttackFighter) sourceBreakdowns.push("+1 from Attack Fighter Role Spec")
    if (sFoilsAtkDelta !== 0) {
      sourceBreakdowns.push(`${sFoilsAtkDelta > 0 ? `+${sFoilsAtkDelta}` : sFoilsAtkDelta} from S-Foils (${activeSFoilsMode === "locked" ? "Closed" : "Attack"})`)
    }

    return {
      display: boosted >= 0 ? `+${boosted}` : `${boosted}`,
      note: sourceBreakdowns.join(", "),
      val: boosted,
      sFoilsDelta: sFoilsAtkDelta,
    }
  }

  const computeDamageDisplay = (rawDamage: string | null = "1d8", weaponProperties: string[] = []) => {
    if (!rawDamage || rawDamage === "-" || rawDamage === "Payload") {
      return { display: "Ordnance", note: null, flatTotal: 0, dicePart: null, sourceBreakdown: [] }
    }

    const isHeavy = weaponProperties.some((p) => p.toLowerCase().includes("heavy"))
    const heavyBonus = isHeavy ? Math.max(1, Math.ceil(strMod / 2)) : 0
    const gunshipBonus = isGunshipSpec ? 1 : 0
    const totalFlat = strMod + heavyBonus + (isBomber ? 1 : 0) + gunshipBonus

    const match = rawDamage.match(/^(\d+d\d+)(?:([+-])(\d+))?$/)
    const dicePart = match ? match[1] : rawDamage
    const innateFlat = match && match[3] ? parseInt(match[3], 10) * (match[2] === "-" ? -1 : 1) : 0
    const finalFlat = innateFlat + totalFlat

    let display = dicePart
    if (finalFlat > 0) display = `${dicePart}+${finalFlat}`
    else if (finalFlat < 0) display = `${dicePart}${finalFlat}`

    const sourceBreakdown: string[] = []
    if (strMod !== 0) sourceBreakdown.push(`${strMod >= 0 ? `+${strMod}` : strMod} from Strength Modifier`)
    if (isHeavy) sourceBreakdown.push(`+${heavyBonus} from Heavy Weapon Trait`)
    if (isBomber) sourceBreakdown.push("+1 from Bomber Role Spec")
    if (isGunshipSpec) sourceBreakdown.push("+1 from Gunship Role Spec")
    if (innateFlat !== 0) sourceBreakdown.push(`${innateFlat >= 0 ? `+${innateFlat}` : innateFlat} weapon innate`)

    return { display, note: sourceBreakdown.length > 0 ? sourceBreakdown.join(", ") : null, flatTotal: finalFlat, dicePart, sourceBreakdown }
  }

  // --- ATTACK WIZARD STATE ---
  const [activeWizardWeapon, setActiveWizardWeapon] = useState<Modification | null>(null)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1)
  const [firingMode, setFiringMode] = useState<"standard" | "rapid" | "burst">("standard")
  const [rangeBracket, setRangeBracket] = useState<"normal" | "long" | "out">("normal")
  const [togglePiercing, setTogglePiercing] = useState<boolean>(false)
  const [toggleMelt, setToggleMelt] = useState<boolean>(false)
  const [toggleDire, setToggleDire] = useState<boolean>(false)
  const [attackRollData, setAttackRollData] = useState<AttackRollResult | null>(null)
  const [damageRollData, setDamageRollData] = useState<DamageRollBreakdown | null>(null)
  const [manualAttackInput, setManualAttackInput] = useState<string>("")
  const [manualDamageInput, setManualDamageInput] = useState<string>("")
  const [attackOutcome, setAttackOutcome] = useState<"pending" | "hit" | "crit" | "miss" | "saved" | "failed">("pending")

  const closeWizard = () => {
    setActiveWizardWeapon(null)
    setWizardStep(1)
    setFiringMode("standard")
    setRangeBracket("normal")
    setTogglePiercing(false)
    setToggleMelt(false)
    setToggleDire(false)
    setAttackRollData(null)
    setDamageRollData(null)
    setManualAttackInput("")
    setManualDamageInput("")
    setAttackOutcome("pending")
  }

  const openWizard = (w: Modification) => {
    if ((w as any).firedThisRound) {
      alert("Weapon Fired: Already fired this round. Cycle Reactor to reset.")
      return
    }

    const isOrdnance = !!w.isOrdnanceLauncher
    const key = w.instanceId || w.id
    if (isOrdnance) {
      const state = getLauncherState(key, w)
      if (state.loadedCount <= 0) {
        alert(`${w.name} has no warheads loaded. Arm it with ordnance before engaging.`)
        return
      }
    }

    if (helmAttackType === "attack_run" && tacticalMovement.spentFeet < 150) {
      alert("Attack Run Requirement: Must spend at least 150 ft moving towards the target before firing.")
      return
    }

    setActiveWizardWeapon(w)
    setWizardStep(1)

    const currentHeat = (w as any).currentHeat || 0
    const catalogDef = STARSHIP_WEAPONS.find((sw) => sw.name.toLowerCase() === w.name.toLowerCase())
    const maxHeat = typeof w.overheat === "number" && w.overheat > 0 ? w.overheat : catalogDef?.overheat ?? 4
    const remainingHeadroom = Math.max(0, maxHeat - currentHeat)

    const launcherState = isOrdnance ? getLauncherState(key, w) : null
    const armedAmmoDef = findArmedAmmoCatalog(launcherState)

    const activeRawProps = (isOrdnance && armedAmmoDef?.properties)
      ? armedAmmoDef.properties
      : (w.properties || catalogDef?.properties || [])
    const props = activeRawProps.map((p: string) => p.toLowerCase())

    const isAuto = props.some((p: string) => p.includes("auto"))
    const hasBurst = props.some((p: string) => p.includes("burst")) || catalogDef?.burst !== undefined
    const hasRapid = props.some((p: string) => p.includes("rapid")) || catalogDef?.rapid !== undefined
    const burstRating = parseInt((props.find((p: string) => p.includes("burst")) || "1").replace(/[^0-9]/g, ""), 10) || (catalogDef?.burst ?? 1)
    const rapidRating = parseInt((props.find((p: string) => p.includes("rapid")) || "2").replace(/[^0-9]/g, ""), 10) || (w.rapid ?? catalogDef?.rapid ?? 2)

    if (!isAuto && remainingHeadroom >= 1) {
      setFiringMode("standard")
    } else if (hasRapid && remainingHeadroom >= rapidRating) {
      setFiringMode("rapid")
    } else if (hasBurst && remainingHeadroom >= burstRating) {
      setFiringMode("burst")
    } else {
      setFiringMode(isAuto ? (hasBurst ? "burst" : "rapid") : "standard")
    }

    setRangeBracket("normal")
    setTogglePiercing(false)
    setToggleMelt(false)
    setToggleDire(false)
    setAttackRollData(null)
    setDamageRollData(null)
    setManualAttackInput("")
    setManualDamageInput("")
    setAttackOutcome("pending")
  }

  const completeAttack = (heatCost: number) => {
    if (!activeWizardWeapon) return
    const key = activeWizardWeapon.instanceId || activeWizardWeapon.id
    const isOrdnance = !!activeWizardWeapon.isOrdnanceLauncher

    if (isWeaponsBoosted && onConsumeWeaponBoost) {
      onConsumeWeaponBoost()
    }

    if (isOrdnance) {
      const state = getLauncherState(key, activeWizardWeapon)
      const newCount = Math.max(0, state.loadedCount - 1)
      onUpdateMod?.(key, {
        firedThisRound: true,
        loadedOrdnance: newCount === 0 ? null : {
          ...state,
          loadedCount: newCount,
        },
      } as any)
    } else {
      const currentHeat = (activeWizardWeapon as any).currentHeat || 0
      const catalogDef = STARSHIP_WEAPONS.find((sw) => sw.name.toLowerCase() === activeWizardWeapon.name.toLowerCase())
      const maxHeat = typeof activeWizardWeapon.overheat === "number" && activeWizardWeapon.overheat > 0
        ? activeWizardWeapon.overheat
        : catalogDef?.overheat ?? 4
      const nextHeat = Math.min(maxHeat, currentHeat + heatCost)
      onUpdateMod?.(key, { currentHeat: nextHeat, firedThisRound: true } as any)
    }
    closeWizard()
  }

  // Power Coupling Cascading Consumption
  const powerCoupling = shipConfig?.powerCoupling ?? shipConfig?.couplingType ?? "Direct Power Coupling"
  const isDistributed = powerCoupling.toLowerCase().includes("distributed")
  const isHubAndSpoke = powerCoupling.toLowerCase().includes("hub") || powerCoupling.toLowerCase().includes("spoke")
  const isDirect = !isDistributed && !isHubAndSpoke

  const currentStationDice = stationPools["engines"] ?? 0
  const effectiveMax = isDirect ? maxPowerDice : (isDistributed ? 2 : 1)
  const effectiveAvailable = isDirect ? availablePowerDice : currentStationDice

  const isSuperiorityFighterSpec = shipConfig?.roleSpecialization === "Superiority Fighter"
  const isSuperiorityFighterMastery = shipConfig?.roleMastery === "Superiority Fighter"

  const rawTurningSpeed = (shipConfig as any)?.turningSpeed ?? 150
  let finalTurningSpeed = effectiveSlowedLevel >= 4 ? 0 : rawTurningSpeed
  let turningOverflowSpeed = 0

  if (isSuperiorityFighterMastery && effectiveSlowedLevel < 4) {
    if (finalTurningSpeed - 50 <= 0) {
      finalTurningSpeed = 0
      turningOverflowSpeed = 50
    } else {
      finalTurningSpeed -= 50
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

  const handleCustomConsume = (amount: number = 1): boolean => {
    if (isDirect) {
      return !!onConsumePowerDice?.(amount)
    }

    if (currentStationDice >= amount) {
      if (onUpdateStationPools) {
        onUpdateStationPools((prev) => ({
          ...prev,
          engines: Math.max(0, (prev["engines"] ?? 0) - amount),
        }))
      }
      return true
    }

    if (isHubAndSpoke && sharedPoolDice >= amount) {
      if (onUpdateSharedPool) {
        onUpdateSharedPool((prev) => Math.max(0, prev - amount))
      }
      return true
    }

    return !!onConsumePowerDice?.(amount)
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

  useEffect(() => {
    if (currentFuel !== undefined) setFuelRemaining(currentFuel)
  }, [currentFuel])

  const syncDay = lastAstrogationSyncDay ?? currentDay
  const daysElapsedSinceSync = Math.max(0, currentDay - syncDay)

  const [selectedPilotAction, setSelectedPilotAction] = useState<PilotAction>(PILOT_ACTIONS[0])

  const shipTier = typeof shipConfig?.tier === "number" ? shipConfig.tier : 0
  const shipSize = (shipConfig?.size || "small").toLowerCase()
  const isSmallOrTiny = shipSize === "small" || shipSize === "tiny"
  const isMedium = shipSize === "medium"

  // Chassis Surge Tier Gating: Tier 0 ships have NO unlocked surges
  const hasPinpointStrike = isSmallOrTiny && shipTier >= 1
  const hasRetroThrusters = isSmallOrTiny && shipTier >= 2
  const hasVersatileSnubfighter = isSmallOrTiny && shipTier >= 3

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

  const [localRetroUsed, setLocalRetroUsed] = useState<boolean>(false)
  const isRetroUsed = externalRetroThrustersUsed !== undefined
    ? externalRetroThrustersUsed
    : localRetroUsed

  const versatileMaxUses = shipTier
  const [localVersatileUsed, setLocalVersatileUsed] = useState<number>(0)
  const currentVersatileUses = externalVersatileUsed !== undefined
    ? externalVersatileUsed
    : localVersatileUsed

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

  const [initiationProcedures, setInitiationProcedures] = useState<number>(isPoweredOn ? 10 : 0)
  const targetProcedures = 10

  useEffect(() => {
    if (isPoweredOn && initiationProcedures < targetProcedures) {
      setInitiationProcedures(10)
    } else if (!isPoweredOn && initiationProcedures >= targetProcedures) {
      setInitiationProcedures(0)
    }
  }, [isPoweredOn])

  const duressCondition: "advantage" | "disadvantage" | "normal" = useMemo(() => {
    if (currentHull < maxHull) return "disadvantage"
    if (currentHull >= maxHull && currentShields >= maxShields) return "advantage"
    return "normal"
  }, [currentHull, maxHull, currentShields, maxShields])

  const defaultPilotMod = shipConfig?.skills?.maneuver ?? 2
  const [pilotModInput] = useState<number>(defaultPilotMod)
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

    const total = keptD20 + pilotModInput
    const evalResult = evaluateDuressCheck(total)

    setInitiationProcedures((prev) => Math.min(targetProcedures, prev + evalResult.gained))
    setMishapResultLog(
      `Check: d20 [${duressCondition !== "normal" ? `${rollA}, ${rollB} -> Kept ${keptD20}` : keptD20}] + Mod (${pilotModInput >= 0 ? `+${pilotModInput}` : pilotModInput}) = ${total} (${evalResult.label})`
    )
  }

  const handleShutdownShip = () => {
    if (confirm("EMERGENCY REACTOR SHUTDOWN: Cut main power and drop consoles offline?")) {
      setInitiationProcedures(0)
      setMishapResultLog("🛑 Main reactor shut down. Auxiliary battery online.")
      if (onSetPoweredOn) onSetPoweredOn(false)
      setShowStartupModal(false)
    }
  }

  const handleEngageStartup = () => {
    if (initiationProcedures >= targetProcedures) {
      setMishapResultLog("✅ Startup sequence complete. Main reactor online.")
      if (onSetPoweredOn) onSetPoweredOn(true)
      return
    }
    const d20 = Math.floor(Math.random() * 20) + 1
    setMishapResultLog(`⚠️ Forced reactor ignition engaged. (Check: ${d20})`)
    if (onSetPoweredOn) onSetPoweredOn(true)
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

  const handleShipRecharge = () => {
    if (onUpdatePinpointStrikesUsed) onUpdatePinpointStrikesUsed(0)
    else setLocalPinpointStrikesUsed(0)
    if (onUpdateRetroThrustersUsed) onUpdateRetroThrustersUsed(false)
    else setLocalRetroUsed(false)
    setLastPinpointRoll(null)
    onRecharge?.()
  }

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
    }
  }

  const handleRefundFuelCustom = (units: number) => {
    const finalRefund = environment === "Space" ? units : units * fuelMultiplier
    const newFuel = Math.min(fuelMax, fuelRemaining + finalRefund)
    setFuelRemaining(newFuel)
    onFuelChange?.(newFuel)
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

  const getAstrogationStatus = (days: number) => {
    if (days < 1) {
      return { label: "ADVANTAGE (<24H)", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" }
    } else if (days >= 7) {
      return { label: "DISADVANTAGE (>7D)", color: "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse" }
    }
    return { label: "NOMINAL SYNC", color: "bg-cyan-neon/10 text-cyan-neon border-cyan-neon/40" }
  }

  const astrogationStatus = getAstrogationStatus(daysElapsedSinceSync)

  const handleRollDogfightContest = () => {
    const d20 = Math.floor(Math.random() * 20) + 1
    const manMod = shipConfig?.skills?.maneuver ?? 2
    const total = d20 + manMod
    setDogfightCheckResult(`Maneuvering Check: d20 (${d20}) + ${manMod} = ${total}`)
  }

  // RENDER DOCKED CARD TILE
  const renderSnapshotCard = (
    id: SectionCardId,
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
      {/* 1. MASTER HEADER BAR */}
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
                  isPoweredOn
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    : "border-amber-400/60 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 shadow-[0_0_8px_rgba(251,191,36,0.2)] animate-pulse"
                }`}
              >
                <Flame className="h-3 w-3" />
                <span>{isPoweredOn ? "Reactor: Online" : `Reactor Offline (${initiationProcedures}/10)`}</span>
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
            {shipConfig?.name?.toUpperCase() || "VESSEL"} // HELM CONSOLE //{" "}
            <span className={isPoweredOn ? "text-emerald-400 font-bold" : "text-amber-400 font-bold animate-pulse"}>
              {isPoweredOn ? "MAIN REACTOR ONLINE" : "OFFLINE (AUXILIARY BATTERY)"}
            </span>
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
                LOCKED (+50 FT, -2 ATK)
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
                ATTACK (+1 ATK)
              </button>
            </div>
          )}

          {isEngineBoosted && (
            <span className="rounded border border-amber-400 bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-300 animate-pulse">
              ⚡ SPEED BOOST (+50 FT)
            </span>
          )}

          <div className="flex items-center gap-2 rounded border border-bridge-border bg-black/50 px-2 py-0.5">
            <span className="text-[8px] text-muted-foreground uppercase flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 text-cyan-neon" /> IFF:
            </span>
            <span className="text-[10px] font-bold font-mono text-amber-300">
              {transponderMode === "PRIMARY" ? primaryTransponder : backupTransponder}
            </span>
            {hasSecondaryTransponderMod && (
              <button
                type="button"
                onClick={handleToggleTransponder}
                className="rounded px-1.5 py-0.2 text-[8px] font-bold uppercase border border-cyan-neon/40 bg-cyan-neon/10 text-cyan-neon hover:bg-cyan-neon/20 cursor-pointer"
              >
                {transponderMode === "PRIMARY" ? "BACKUP" : "ACTIVE"}
              </button>
            )}
          </div>
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
            <span>Manned Helm:</span>
          </div>

          {assignedCrew.length === 0 ? (
            <span className="text-xs text-amber-300 italic px-2 py-0.5 border border-amber-500/30 bg-amber-950/20 rounded">
              Console Uncrewed — Assign Pilot
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

      {/* 4. TOP-DECK MODULAR SNAPSHOT TILES (8 UNIFORM TILES) */}
      <section className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 w-full">
        {renderSnapshotCard(
          "movement",
          "Movement",
          `${remainingMovement} ft`,
          `Spent: ${currentSpentMovement} ft`,
          <Footprints className="w-3 h-3 text-emerald-400" />,
          remainingMovement === 0 ? "text-red-400" : "text-emerald-400"
        )}

        {renderSnapshotCard(
          "resources",
          "Power Dice",
          `${effectiveAvailable}/${effectiveMax} Dice`,
          isHubAndSpoke ? `${sharedPoolDice}/2 Shared` : `${powerDieType} Rating`,
          <Zap className="w-3 h-3 text-amber-400" />,
          "text-amber-300"
        )}

        {renderSnapshotCard(
          "weapons",
          "Weapons",
          `${forwardWeapons.length} Forward`,
          helmAttackType === "attack_run" ? "Attack Run" : helmAttackType === "dogfight" ? "Dogfight" : "Standard Fire",
          <Crosshair className="w-3 h-3 text-cyan-neon" />,
          "text-cyan-neon"
        )}

        {renderSnapshotCard(
          "fuel",
          "Fuel Core",
          `${fuelRemaining}/${fuelMax}`,
          environment.toUpperCase(),
          <Flame className="w-3 h-3 text-amber-400" />,
          "text-amber-300"
        )}

        {renderSnapshotCard(
          "time",
          "Timeline",
          `Day ${campaignDays}`,
          astrogationStatus.label,
          <Clock className="w-3 h-3 text-slate-300" />,
          "text-slate-100"
        )}

        {renderSnapshotCard(
          "ftl",
          "FTL Vector",
          activeJourney ? "Hyperdrive" : "Sublight",
          activeJourney ? `${progressPercent}% Locked` : "No Active Jump",
          <Compass className="w-3 h-3 text-cyan-neon" />,
          activeJourney ? "text-cyan-neon animate-pulse" : "text-slate-400"
        )}

        {renderSnapshotCard(
          "mods",
          "Hardware",
          `${engineMods.length} Mods`,
          "Engine Hardware",
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
          <Sliders className="w-8 h-8 text-cyan-neon/30 mb-2 animate-pulse" />
          <p className="uppercase tracking-widest text-slate-300 font-bold">ALL CONSOLE PANELS COLLAPSED</p>
          <p className="text-[10px] mt-1 text-slate-500">Tap any card above or select a preset to expand controls.</p>
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
                      {cardId === "movement" && "Tactical Movement & Gyro"}
                      {cardId === "resources" && "Station & Shared Combat Power"}
                      {cardId === "weapons" && "Forward Hardpoint Fire Array"}
                      {cardId === "fuel" && "Engine Propulsion & Fuel Burn"}
                      {cardId === "time" && "Campaign Time & Shore Leave"}
                      {cardId === "ftl" && "Hyperdrive Vector & Astrogation"}
                      {cardId === "mods" && "Installed Engine Hardware"}
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

                {/* 1. MOVEMENT & HEADING WORKSPACE */}
                {cardId === "movement" && (
                  <div className="flex flex-col justify-between gap-3 h-full">
                    <div className="flex flex-col gap-2 bg-black/50 p-2.5 rounded border border-bridge-border/60">
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

                      <div className="flex flex-col gap-0.5 pt-1">
                        <div className="flex justify-between text-[9px] text-slate-300">
                          <span>Movement Adjuster:</span>
                          <span className="text-cyan-neon font-bold">{currentSpentMovement} ft spent</span>
                        </div>
                        <div className="flex items-center gap-2">
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
                    </div>

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
                  </div>
                )}

                {/* 2. COMBAT RESOURCES WORKSPACE */}
                {cardId === "resources" && (
                  <div className="flex flex-col gap-3">
                    <CombatResources 
                      availablePowerDice={effectiveAvailable}
                      maxPowerDice={effectiveMax}
                      powerDieType={powerDieType}
                      onConsumePowerDice={handleCustomConsume}
                      standingByUsed={standingByUsed}
                      onUseStandingBy={onUseStandingBy}
                      leafOnTheWindUsed={leafOnTheWindUsed}
                      onUseLeafOnTheWind={onUseLeafOnTheWind}
                      versatileTransportUsed={versatileTransportUsed}
                      onUpdateVersatileTransportUsed={onUpdateVersatileTransportUsed}
                      bestShipInVerseUsed={bestShipInVerseUsed}
                      onUpdateBestShipInVerseUsed={onUpdateBestShipInVerseUsed}
                      shipTier={shipConfig?.tier ?? 0}
                      shipSize={shipConfig?.size}
                    />

                    {isHubAndSpoke && (
                      <div className="flex flex-col gap-2 pt-2 border-t border-bridge-border/60 w-full">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-amber-400 font-bold tracking-wider uppercase text-[10px]">Shared Reactor Pool</span>
                          <span className="font-bold text-amber-400 text-xs">{sharedPoolDice} / 2</span>
                        </div>
                        <div className="flex items-center gap-1.5 w-full">
                          {Array.from({ length: 2 }).map((_, i) => (
                            <span
                              key={i}
                              className={`h-2.5 flex-1 rounded-xs inline-block ${
                                i < sharedPoolDice 
                                  ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" 
                                  : "bg-black/80 border border-bridge-border"
                              }`}
                            />
                          ))}
                        </div>

                        {!canSpendStation && canSpendShared && (
                          <button
                            type="button"
                            onClick={() => handleCustomConsume(1)}
                            className="w-full mt-1 rounded bg-amber-500/20 border border-amber-400/60 py-1.5 text-xs font-bold tracking-wider text-amber-300 hover:bg-amber-500/30 transition-colors shadow-[0_0_10px_rgba(251,191,36,0.2)] cursor-pointer"
                          >
                            CONSUME SHARED REACTOR DIE ({sharedPoolDice} REMAINING)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. WEAPONS WORKSPACE */}
                {cardId === "weapons" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-bridge-border/40">
                      <span className="text-[10px] uppercase font-bold text-slate-300 flex items-center gap-1">
                        <Swords className="h-3.5 w-3.5 text-cyan-neon" /> Attack Stance:
                      </span>
                      <button
                        type="button"
                        onClick={() => setHelmAttackType("standard")}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border cursor-pointer ${
                          helmAttackType === "standard"
                            ? "bg-amber-500/20 border-amber-400 text-amber-300"
                            : "bg-black/60 border-slate-800 text-slate-400"
                        }`}
                      >
                        Standard Fire
                      </button>
                      <button
                        type="button"
                        onClick={() => setHelmAttackType("attack_run")}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border cursor-pointer ${
                          helmAttackType === "attack_run"
                            ? "bg-cyan-500/20 border-cyan-neon text-cyan-neon"
                            : "bg-black/60 border-slate-800 text-slate-400"
                        }`}
                      >
                        Attack Run ({tacticalMovement.spentFeet}/150ft)
                      </button>
                      <button
                        type="button"
                        onClick={() => setHelmAttackType("dogfight")}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border cursor-pointer ${
                          helmAttackType === "dogfight"
                            ? "bg-purple-500/20 border-purple-400 text-purple-300"
                            : "bg-black/60 border-slate-800 text-slate-400"
                        }`}
                      >
                        Dogfight
                      </button>
                    </div>

                    {helmAttackType === "dogfight" && (
                      <div className="flex items-center justify-between p-2 rounded bg-purple-950/30 border border-purple-500/40 text-xs">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-purple-300 uppercase">Dogfight Maneuvering Contest:</span>
                          <span className="text-[9px] text-slate-400">Roll opposed check vs target ship</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleRollDogfightContest}
                            className="px-2 py-1 rounded bg-purple-500/20 border border-purple-400 text-purple-300 text-[10px] font-bold uppercase hover:bg-purple-500/30 cursor-pointer"
                          >
                            Roll Maneuvering
                          </button>
                          {dogfightCheckResult && (
                            <span className="text-xs font-mono font-bold text-purple-200">{dogfightCheckResult}</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                      {forwardWeapons.map((w) => {
                        const instanceKey = w.instanceId || w.id
                        const catalogDef = STARSHIP_WEAPONS.find((sw) => sw.name.toLowerCase() === w.name.toLowerCase())
                        const isOrdnance = !!w.isOrdnanceLauncher
                        const heat = (w as any).currentHeat ?? 0
                        const maxHeat = typeof w.overheat === "number" && w.overheat > 0 ? w.overheat : catalogDef?.overheat ?? 4
                        const isOverheated = heat >= maxHeat
                        const isFiredThisRound = !!(w as any).firedThisRound
                        const launcherState = isOrdnance ? getLauncherState(instanceKey, w) : null
                        const isLauncherArmed = launcherState ? launcherState.loadedCount > 0 : false
                        const armedAmmoDef = isOrdnance ? findArmedAmmoCatalog(launcherState) : null
                        const isTurret = isTurretMounted(w)

                        const rawProps = isOrdnance && armedAmmoDef?.properties
                          ? armedAmmoDef.properties
                          : (w.properties || catalogDef?.properties || [])

                        const effectiveRangeDisplay = isOrdnance
                          ? (armedAmmoDef?.range || (isLauncherArmed ? "Payload" : "Empty"))
                          : (w.range || catalogDef?.range || "Payload")

                        const rawDmgString = isOrdnance ? (launcherState?.damage || null) : (w.damage || catalogDef?.damage)
                        const effectiveAtk = computeAttackModDisplay(rawProps, !isOrdnance)
                        const effectiveDmg = computeDamageDisplay(rawDmgString, rawProps)

                        return (
                          <div
                            key={instanceKey}
                            className={`rounded-lg border bg-black/40 p-3 flex flex-col justify-between gap-2.5 transition-all ${
                              isFiredThisRound
                                ? "border-slate-800 opacity-60"
                                : isOverheated
                                ? "border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                                : "border-bridge-border/80 hover:border-cyan-neon/60"
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-start gap-1.5">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-bold text-cyan-neon tracking-wide truncate">
                                    {w.name}
                                  </h4>
                                  <span className="text-[7px] font-bold uppercase px-1 rounded border border-slate-700 text-slate-400 font-mono inline-block mt-0.5">
                                    {isTurret ? "UNMANNED TURRET (FWD)" : "BOW HARDPOINT"}
                                  </span>
                                </div>
                                <span
                                  className={`text-[8px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                                    isFiredThisRound
                                      ? "bg-slate-900 border-slate-700 text-slate-400"
                                      : isOrdnance
                                      ? isLauncherArmed
                                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                        : "bg-red-500/20 text-red-400 border-red-500/40"
                                      : isOverheated
                                      ? "bg-red-500/20 text-red-400 border-red-500/40"
                                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                  }`}
                                >
                                  {isFiredThisRound
                                    ? "FIRED"
                                    : isOrdnance
                                    ? isLauncherArmed
                                      ? "ARMED"
                                      : "EMPTY"
                                    : isOverheated
                                    ? "OVERHEAT"
                                    : "READY"}
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-1 my-2 text-center">
                                <div className="rounded border border-bridge-border/40 bg-bridge-panel/50 p-1 flex flex-col justify-between">
                                  <span className="text-[7px] text-muted-foreground uppercase">ATK</span>
                                  <span className="text-[11px] font-bold text-cyan-neon font-mono">{effectiveAtk.display}</span>
                                </div>
                                <div className="rounded border border-bridge-border/40 bg-bridge-panel/50 p-1 flex flex-col justify-between">
                                  <span className="text-[7px] text-muted-foreground uppercase">DMG</span>
                                  <span className="text-[11px] font-bold text-cyan-neon font-mono">{effectiveDmg.display}</span>
                                </div>
                                <div className="rounded border border-bridge-border/40 bg-bridge-panel/50 p-1 flex flex-col justify-between">
                                  <span className="text-[7px] text-muted-foreground uppercase">RNG</span>
                                  <span className="text-[9px] font-bold text-cyan-neon font-mono truncate px-0.5" title={effectiveRangeDisplay}>
                                    {effectiveRangeDisplay}
                                  </span>
                                </div>
                              </div>

                              {!isOrdnance ? (
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex justify-between text-[9px]">
                                    <span className="text-muted-foreground uppercase">Heat:</span>
                                    <span className={heat >= maxHeat ? "text-red-400 font-bold" : "text-cyan-neon"}>
                                      {heat}/{maxHeat}
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full bg-slate-900 rounded-sm overflow-hidden border border-bridge-border/30">
                                    <div
                                      className={`h-full transition-all ${
                                        heat >= maxHeat ? "bg-red-500" : heat >= maxHeat * 0.75 ? "bg-amber-400" : "bg-cyan-neon"
                                      }`}
                                      style={{ width: `${Math.min(100, (heat / maxHeat) * 100)}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1 rounded border border-bridge-border/60 bg-black/60 p-1.5 text-[9px] font-mono">
                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground uppercase">ARMED:</span>
                                    <span className="font-bold text-cyan-neon truncate max-w-[120px]">
                                      {launcherState?.ordnanceName ? launcherState.ordnanceName.toUpperCase() : "NONE"}
                                    </span>
                                  </div>
                                  <div className="flex gap-1 w-full my-0.5">
                                    {Array.from({ length: launcherState?.maxCapacity ?? 4 }).map((_, i) => (
                                      <span
                                        key={i}
                                        className={`h-1 flex-1 rounded-sm ${
                                          i < (launcherState?.loadedCount ?? 0)
                                            ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                                            : "bg-slate-800"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-bridge-border/40">
                              <button
                                type="button"
                                onClick={() => openWizard(w)}
                                disabled={
                                  isFiredThisRound ||
                                  (!isOrdnance ? isOverheated : !isLauncherArmed) ||
                                  (helmAttackType === "attack_run" && tacticalMovement.spentFeet < 150)
                                }
                                className={`col-span-2 rounded border py-1.5 text-[10px] font-bold tracking-wider font-mono flex items-center justify-center gap-1 transition-all ${
                                  isFiredThisRound
                                    ? "bg-slate-900 border-slate-700 text-slate-500 cursor-not-allowed"
                                    : (!isOrdnance ? isOverheated : !isLauncherArmed)
                                    ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-40"
                                    : "border-cyan-neon/60 bg-cyan-neon/20 text-cyan-neon hover:bg-cyan-neon/30 cursor-pointer shadow-[0_0_8px_rgba(0,255,255,0.2)]"
                                }`}
                              >
                                <Crosshair className="w-3 h-3 text-cyan-neon" />
                                <span>{isFiredThisRound ? "FIRED" : "ENGAGE"}</span>
                              </button>

                              {!isOrdnance ? (
                                <button
                                  type="button"
                                  onClick={() => handleCoolMountedWeapon(instanceKey)}
                                  disabled={heat === 0}
                                  className="rounded border border-bridge-border bg-black/60 py-1.5 text-[9px] font-bold text-muted-foreground hover:text-cyan-neon disabled:opacity-30 cursor-pointer"
                                >
                                  FLUSH
                                </button>
                              ) : !isLauncherArmed ? (
                                <button
                                  type="button"
                                  onClick={() => setWeaponArmModal({ weapon: w })}
                                  className="rounded border border-emerald-500/60 bg-emerald-500/20 py-1.5 text-[9px] font-bold text-emerald-400 hover:bg-emerald-500/30 cursor-pointer flex items-center justify-center gap-0.5"
                                >
                                  <PackagePlus className="w-2.5 h-2.5" /> ARM
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDisarmLauncher(instanceKey, w)}
                                  className="rounded border border-amber-500/60 bg-amber-500/20 py-1.5 text-[9px] font-bold text-amber-300 hover:bg-amber-500/30 cursor-pointer flex items-center justify-center gap-0.5"
                                >
                                  <Undo2 className="w-2.5 h-2.5" /> DISARM
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 4. FUEL & PROPULSION WORKSPACE */}
                {cardId === "fuel" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center border-b border-bridge-border/40 pb-1.5">
                      <span className="text-xs text-slate-300">Environment Calibration:</span>
                      <div className="flex rounded border border-bridge-border/60 bg-black/50 p-0.5">
                        {(["Space", "Atmosphere", "Underwater"] as FlightEnvironment[]).map((env) => (
                          <button
                            key={env}
                            onClick={() => setEnvironment(env)}
                            className={`px-2 py-0.5 text-[9px] font-bold uppercase transition-colors rounded-sm cursor-pointer ${
                              environment === env ? "bg-cyan-neon text-black font-extrabold" : "text-muted-foreground"
                            }`}
                          >
                            {env}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-black/40 p-2.5 rounded border border-bridge-border/40 flex flex-col gap-2">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="text-muted-foreground uppercase text-[10px]">Fuel Reserves:</span>
                        <span className="font-bold text-cyan-neon font-mono">{fuelRemaining} / {fuelMax} Units</span>
                      </div>
                      <div className="h-2 w-full bg-slate-900 rounded-sm overflow-hidden border border-bridge-border/30">
                        <div
                          className="h-full bg-cyan-neon transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, (fuelRemaining / fuelMax) * 100))}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => handleConsumeFuelCustom(envStats.baseUnit)}
                        className="px-2 py-1 rounded border border-cyan-neon/40 bg-cyan-neon/10 text-[9px] font-bold text-cyan-neon hover:bg-cyan-neon/20 cursor-pointer"
                      >
                        {envStats.labelStep1}
                      </button>
                      <button
                        onClick={() => handleConsumeFuelCustom(envStats.baseUnit * 3)}
                        className="px-2 py-1 rounded border border-cyan-neon/40 bg-cyan-neon/10 text-[9px] font-bold text-cyan-neon hover:bg-cyan-neon/20 cursor-pointer"
                      >
                        {envStats.labelStep5}
                      </button>
                      <button
                        onClick={() => handleRefundFuelCustom(envStats.baseUnit)}
                        className="px-2 py-1 rounded border border-amber-500/40 bg-amber-500/10 text-[9px] font-bold text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                      >
                        {envStats.labelRefund}
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. TIMELINE WORKSPACE */}
                {cardId === "time" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between bg-black/40 p-2.5 rounded border border-bridge-border/40">
                      <div>
                        <span className="text-[9px] text-muted-foreground uppercase block">Elapsed Mission Day</span>
                        <span className="text-lg font-bold text-cyan-neon font-mono">Day {campaignDays}</span>
                        <span className="text-[8px] text-muted-foreground block">Astrogation: Day {syncDay}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onUpdateDay && onUpdateDay((prev: number) => Math.max(0, prev - 1), false)}
                          className="px-2.5 py-1 rounded border border-cyan-neon/40 bg-cyan-neon/10 text-xs text-cyan-neon font-bold cursor-pointer"
                        >
                          -1D
                        </button>
                        <button
                          onClick={() => onUpdateDay && onUpdateDay((prev: number) => prev + 1, true)}
                          className="px-3 py-1 rounded border border-cyan-neon/60 bg-cyan-neon/20 text-xs text-cyan-neon font-bold cursor-pointer"
                        >
                          +1D
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-amber-950/20 border border-amber-500/30 flex items-center justify-between text-xs gap-2">
                      <span className="font-bold uppercase text-[10px] text-amber-300 flex items-center gap-1">
                        <CalendarOff className="h-3.5 w-3.5" /> Away Mission:
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={awayMissionDaysInput}
                          onChange={(e) => setAwayMissionDaysInput(e.target.value)}
                          className="w-10 text-center bg-black border border-amber-500/40 rounded text-xs text-amber-300 py-0.5"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const d = parseInt(awayMissionDaysInput, 10)
                            if (!isNaN(d) && d > 0) onUpdateDay?.((prev: number) => prev + d, false)
                          }}
                          className="px-2 py-0.5 rounded bg-amber-500/30 border border-amber-400 text-amber-200 text-xs font-bold cursor-pointer"
                        >
                          Fast-Forward
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. FTL VECTOR WORKSPACE */}
                {cardId === "ftl" && (
                  <div className="flex flex-col gap-3">
                    <div className="bg-black/40 p-3 rounded border border-bridge-border/40 flex flex-col gap-2">
                      {activeJourney ? (
                        <>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-[9px] text-muted-foreground uppercase block">Destination</span>
                              <span className="font-bold text-amber-300 font-mono">{activeJourney.destination}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] text-muted-foreground uppercase block">Progress</span>
                              <span className="font-bold text-emerald-400 font-mono">{daysInTransit}/{duration}D</span>
                            </div>
                          </div>
                          <div className="h-2 w-full bg-slate-900 rounded-sm overflow-hidden border border-bridge-border/40">
                            <div
                              className="h-full bg-cyan-neon shadow-[0_0_8px_rgba(0,255,255,0.5)] transition-all"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="py-4 text-center text-xs text-muted-foreground uppercase">
                          No Active Hyperspace Route
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate?.("navcomputer")}
                      className="w-full py-1.5 rounded border border-cyan-neon/40 bg-cyan-neon/10 hover:bg-cyan-neon/20 text-cyan-neon text-xs font-bold uppercase cursor-pointer"
                    >
                      Open Navcomputer Console →
                    </button>
                  </div>
                )}

                {/* 7. HARDWARE MODIFICATIONS WORKSPACE */}
                {cardId === "mods" && (
                  <div className="flex flex-col gap-2">
                    <StationModifications 
                      station="Engines" 
                      installedMods={installedMods} 
                      onRemoveMod={onRemoveMod} 
                    />
                  </div>
                )}

                {/* 8. SHIP ABILITY SCORES & STATISTICS WORKSPACE */}
                {cardId === "ship_stats" && (
                  <div className="flex flex-col gap-3">
                    <ShipStats shipConfig={shipConfig} proficiencyBonus={proficiencyBonus} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 6. TACTICAL CHASSIS MANEUVERS (ALWAYS READY TRAY AT BOTTOM) */}
      {shipTier >= 1 && (hasPinpointStrike || hasRetroThrusters || hasVersatileSnubfighter || hasEvasiveManeuvers || hasAdaptiveArmor) && (
        <section className="rounded-md border border-cyan-neon/40 bg-bridge-panel p-2.5 shadow-[0_0_12px_rgba(0,255,255,0.04)] flex flex-col gap-2">
          <div className="flex justify-between items-center border-b border-bridge-border/60 pb-1">
            <h3 className="text-[10px] font-bold tracking-[0.2em] text-cyan-neon uppercase">
              Chassis Tactical Maneuvers (Tier {shipTier})
            </h3>
            <button
              onClick={handleShipRecharge}
              className="rounded border border-bridge-border bg-black/60 px-2 py-0.5 text-[8px] font-mono text-muted-foreground hover:text-amber-300 uppercase cursor-pointer"
            >
              Recharge (Reset)
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {hasPinpointStrike && (
              <button
                disabled={currentPinpointUses >= pinpointMaxUses || isRollingPinpoint}
                onClick={handleActivatePinpointStrike}
                className="p-2 rounded border border-cyan-neon/50 bg-black/40 text-left hover:bg-cyan-950/40 cursor-pointer disabled:opacity-40"
              >
                <div className="flex justify-between text-[10px] font-bold text-cyan-neon">
                  <span>Pinpoint Strike</span>
                  <span>{pinpointMaxUses - currentPinpointUses}/{pinpointMaxUses}</span>
                </div>
                <span className="text-[8px] text-slate-400 block mt-0.5">
                  {lastPinpointRoll ? `Fired (+${lastPinpointRoll})` : `Fire (+${pinpointDieInfo.type})`}
                </span>
              </button>
            )}

            {hasRetroThrusters && (
              <button
                disabled={isRetroUsed}
                onClick={handleFireRetroThrusters}
                className="p-2 rounded border border-amber-400/50 bg-black/40 text-left hover:bg-amber-950/40 cursor-pointer disabled:opacity-40"
              >
                <div className="flex justify-between text-[10px] font-bold text-amber-300">
                  <span>Retro Thrusters</span>
                  <span>{isRetroUsed ? "EXP" : "RDY"}</span>
                </div>
                <span className="text-[8px] text-slate-400 block mt-0.5">Reaction: Move 50ft &amp; halve dmg</span>
              </button>
            )}

            {hasEvasiveManeuvers && (
              <button
                disabled={evasiveManeuversUsed >= evasiveMax || isRollingPinpoint}
                onClick={handleRollEvasiveManeuvers}
                className="p-2 rounded border border-amber-400/50 bg-black/40 text-left hover:bg-amber-950/40 cursor-pointer disabled:opacity-40"
              >
                <div className="flex justify-between text-[10px] font-bold text-amber-300">
                  <span>Evasive Maneuver</span>
                  <span>{evasiveMax - evasiveManeuversUsed}/{evasiveMax}</span>
                </div>
                <span className="text-[8px] text-slate-400 block mt-0.5">
                  {lastEvasiveRoll ? `Rolled (+${lastEvasiveRoll * 50}ft)` : `Roll (${evasiveDieInfo.type})`}
                </span>
              </button>
            )}

            {hasAdaptiveArmor && (
              <button
                disabled={adaptiveArmorUsed >= adaptiveMax}
                onClick={handleActivateAdaptiveArmor}
                className="p-2 rounded border border-cyan-400/50 bg-black/40 text-left hover:bg-cyan-950/40 cursor-pointer disabled:opacity-40"
              >
                <div className="flex justify-between text-[10px] font-bold text-cyan-300">
                  <span>Adaptive Armor</span>
                  <span>{adaptiveMax - adaptiveArmorUsed}/{adaptiveMax}</span>
                </div>
                <span className="text-[8px] text-slate-400 block mt-0.5">Trigger +CON AC</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* MODAL 1: STARTUP PROTOCOL */}
      {showStartupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-bridge-panel border border-cyan-neon/70 rounded-md p-5 max-w-xl w-full flex flex-col gap-4 shadow-[0_0_25px_rgba(0,255,255,0.15)] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-bridge-border/60 pb-2">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold tracking-widest text-cyan-neon uppercase">
                  Reactor Start-Up Protocol
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
                Roll Duress Check
              </button>
              <button
                onClick={handleEngageStartup}
                className="px-4 py-1.5 rounded border border-emerald-500/60 bg-emerald-500/20 text-xs font-bold text-emerald-300 uppercase cursor-pointer"
              >
                Engage Reactor
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

      {/* MODAL 2: TACTICS DATABASE */}
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
              <button onClick={() => setShowActionModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 overflow-hidden min-h-[300px]">
              <div className="flex flex-col gap-1 overflow-y-auto pr-1">
                {PILOT_ACTIONS.map((action) => (
                  <button
                    key={action.name}
                    onClick={() => setSelectedPilotAction(action)}
                    className={`flex items-center justify-between text-left px-2.5 py-1.5 rounded text-xs transition border cursor-pointer ${
                      selectedPilotAction.name === action.name
                        ? "bg-cyan-neon/20 border-cyan-neon text-cyan-neon font-bold"
                        : "bg-black/40 border-bridge-border/60 text-slate-300"
                    }`}
                  >
                    <span>{action.name}</span>
                    <span className="text-[7px] px-1 py-0.2 rounded uppercase border border-bridge-border text-muted-foreground">
                      {action.category.split(" ")[0]}
                    </span>
                  </button>
                ))}
              </div>

              <div className="md:col-span-2 bg-black/50 p-4 rounded border border-bridge-border/60 flex flex-col justify-between overflow-y-auto">
                <div>
                  <h4 className="text-sm font-bold text-cyan-neon uppercase mb-2">{selectedPilotAction.name}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{selectedPilotAction.description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ARM ORDNANCE */}
      {weaponArmModal && (() => {
        const weapon = weaponArmModal.weapon
        const family = getLauncherFamily(weapon.name)
        const availableOptions = ordnanceList.filter((o) => o.category === family && o.currentReserve > 0)

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="w-full max-w-md rounded-lg border border-cyan-neon bg-slate-950 p-5 shadow-[0_0_30px_rgba(0,255,255,0.3)] flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-bridge-border pb-2">
                <span className="text-xs font-bold text-cyan-neon uppercase">Arm Hardpoint // {weapon.name}</span>
                <button onClick={() => setWeaponArmModal(null)} className="text-muted-foreground hover:text-white cursor-pointer">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                {availableOptions.map((ordnance) => (
                  <button
                    key={ordnance.id}
                    onClick={() => executeArmLauncher(weapon, ordnance)}
                    className="p-3 rounded border border-bridge-border bg-black/60 hover:border-emerald-400 text-left flex justify-between items-center cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-100 uppercase block">{ordnance.name}</span>
                      <span className="text-[10px] text-amber-300 block">{ordnance.damage} {ordnance.damageType}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 font-mono">{ordnance.currentReserve} in Reserve</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {/* MODAL 4: 4-STEP FIRE CONTROL ATTACK WIZARD */}
      {activeWizardWeapon && (() => {
        const instanceKey = activeWizardWeapon.instanceId || activeWizardWeapon.id
        const catalogDef = STARSHIP_WEAPONS.find((sw) => sw.name.toLowerCase() === activeWizardWeapon.name.toLowerCase())
        const isOrdnance = !!activeWizardWeapon.isOrdnanceLauncher
        const launcherState = isOrdnance ? getLauncherState(instanceKey, activeWizardWeapon) : null
        const armedAmmoDef = isOrdnance ? findArmedAmmoCatalog(launcherState) : null

        const currentHeat = (activeWizardWeapon as any).currentHeat ?? 0
        const maxHeat = typeof activeWizardWeapon.overheat === "number" && activeWizardWeapon.overheat > 0
          ? activeWizardWeapon.overheat
          : catalogDef?.overheat ?? 4
        const remainingHeadroom = Math.max(0, maxHeat - currentHeat)

        const activeRawProps = (isOrdnance && armedAmmoDef?.properties)
          ? armedAmmoDef.properties
          : (activeWizardWeapon.properties || catalogDef?.properties || [])
        const props = activeRawProps.map((p: string) => p.toLowerCase())

        const isAuto = props.some((p: string) => p.includes("auto"))
        const hasBurst = props.some((p: string) => p.includes("burst")) || catalogDef?.burst !== undefined
        const hasRapid = props.some((p: string) => p.includes("rapid")) || catalogDef?.rapid !== undefined
        const burstProp = props.find((p: string) => p.includes("burst"))
        const burstRating = parseInt((burstProp || "1").replace(/[^0-9]/g, ""), 10) || (catalogDef?.burst ?? 1)
        const rapidProp = props.find((p: string) => p.includes("rapid"))
        const rapidRating = parseInt((rapidProp || "2").replace(/[^0-9]/g, ""), 10) || (activeWizardWeapon.rapid ?? catalogDef?.rapid ?? 2)

        const rangeStr = (isOrdnance && armedAmmoDef?.range)
          ? armedAmmoDef.range
          : (activeWizardWeapon.range || catalogDef?.range || "600/2400")
        const [normalRange, maxRange] = rangeStr.split("/").map((v: string) => parseInt(v.trim(), 10) || 0)

        const conProp = props.find((p: string) => p.startsWith("constitution"))
        const conReq = conProp ? parseInt(conProp.split(" ")[1], 10) || 10 : (catalogDef?.constitutionSaveDC ?? null)
        const failsCon = conReq !== null && conScore < conReq

        const hasDire = props.some((p: string) => p.includes("dire"))
        const hasPiercing = props.some((p: string) => p.includes("piercing"))
        const hasMelt = props.some((p: string) => p.includes("melt"))
        const hasSaturate = props.some((p: string) => p.includes("saturate"))
        const keenProp = props.find((p: string) => p.includes("keen"))
        const keenRating = keenProp ? parseInt(keenProp.replace(/[^0-9]/g, ""), 10) || 1 : 0
        const critThreshold = Math.max(1, 20 - keenRating)

        const baseAttackAbilityMod = hasSaturate ? Math.max(strMod, wisMod) : wisMod
        const sFoilsAtkDelta = hasSFoils && !isOrdnance ? (activeSFoilsMode === "locked" ? -2 : 1) : 0
        let attackMod = baseAttackAbilityMod + (isAttackFighter ? 1 : 0) + sFoilsAtkDelta

        if (togglePiercing) attackMod += 1
        if (toggleDire) attackMod -= 1
        if (toggleMelt) attackMod -= proficiencyBonus

        const saveDC = 8 + attackMod

        // SW5e Rules: Helm disadvantage applies only to Primary & Secondary weapons (Tertiary & Ordnance exempt)
        const isTertiary = (activeWizardWeapon.category || "").toLowerCase().includes("tertiary")
        const isHelmDisadvantaged = helmAttackType === "standard" && !isTertiary && !isOrdnance
        const hasDisadvantage = rangeBracket === "long" || failsCon || (effectiveSlowedLevel >= 3) || isHelmDisadvantaged
        const hasAdvantage = isWeaponsBoosted
        const netRollMode = resolveAdvantageMode(hasAdvantage, hasDisadvantage)

        const currentHeatCost = firingMode === "rapid" ? rapidRating : firingMode === "burst" ? burstRating : 1
        const hasSufficientHeat = isOrdnance ? (launcherState && launcherState.loadedCount > 0) : remainingHeadroom >= currentHeatCost

        const canDoStandard = (!isAuto && remainingHeadroom >= 1) || isOrdnance
        const canDoRapid = !isOrdnance && hasRapid && remainingHeadroom >= rapidRating
        const canDoBurst = !isOrdnance && hasBurst && remainingHeadroom >= burstRating

        const baseDamageRaw = isOrdnance ? (launcherState?.damage || "2d8") : (activeWizardWeapon.damage || catalogDef?.damage || "1d8")
        const dmgDetails = computeDamageDisplay(baseDamageRaw, props)
        let diceString = dmgDetails.dicePart || baseDamageRaw
        if (firingMode === "rapid") diceString = `${diceString} + ${diceString}`

        let dynamicFlat = dmgDetails.flatTotal
        if (toggleDire) dynamicFlat += 1
        if (togglePiercing) dynamicFlat -= 1
        if (toggleMelt) dynamicFlat += proficiencyBonus

        let finalDmgFormula = diceString
        if (dynamicFlat > 0) finalDmgFormula = `${diceString} + ${dynamicFlat}`
        else if (dynamicFlat < 0) finalDmgFormula = `${diceString} - ${Math.abs(dynamicFlat)}`

        const handleRollDigitalAttack = () => {
          const res = rollAttackD20({
            modifier: attackMod,
            mode: netRollMode,
            critThreshold,
          })
          setAttackRollData(res)
          setManualAttackInput(res.total.toString())

          if (res.isCrit) {
            setAttackOutcome("crit")
            const dmgRes = rollDamage({
              formula: diceString,
              isCrit: true,
              useBrutalCriticals: Boolean(shipConfig?.useBrutalCriticals),
              additionalBonus: dynamicFlat,
            })
            setDamageRollData(dmgRes)
            setManualDamageInput(dmgRes.totalDamage.toString())
          } else if (res.isFumble) {
            setAttackOutcome("miss")
          }
        }

        const handleRollDigitalDamage = (forceCrit?: boolean) => {
          const isCrit = forceCrit !== undefined ? forceCrit : (attackOutcome === "crit" || attackRollData?.isCrit === true)
          const dmgRes = rollDamage({
            formula: diceString,
            isCrit,
            useBrutalCriticals: Boolean(shipConfig?.useBrutalCriticals),
            additionalBonus: dynamicFlat,
          })
          setDamageRollData(dmgRes)
          setManualDamageInput(dmgRes.totalDamage.toString())
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="w-full max-w-xl rounded-lg border border-cyan-neon bg-slate-950 p-5 shadow-[0_0_30px_rgba(0,255,255,0.2)] flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-bridge-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-5 h-5 text-cyan-neon animate-pulse" />
                  <div>
                    <h3 className="text-sm font-bold tracking-wider text-cyan-neon uppercase">
                      Forward Fire Assistant // {activeWizardWeapon.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground uppercase">
                        Mode: {helmAttackType === "attack_run" ? "Attack Run" : helmAttackType === "dogfight" ? "Dogfight" : "Standard Fire"} • Step {wizardStep} of 4
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeWizard}
                  className="rounded p-1 text-muted-foreground hover:text-white transition-colors cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Status Alert Banners */}
              {isWeaponsBoosted && (
                <div className="p-2.5 rounded bg-cyan-950/60 border border-cyan-400 text-xs flex items-center justify-between shadow-[0_0_10px_rgba(0,255,255,0.2)] animate-pulse">
                  <span className="flex items-center gap-1.5 font-bold text-cyan-300">
                    <Sparkles className="w-4 h-4 text-cyan-neon" />
                    ENGINEERING WEAPON BOOST ACTIVE:
                  </span>
                  <span className="font-mono uppercase font-bold text-cyan-neon text-[10px]">
                    +ADVANTAGE APPLIED
                  </span>
                </div>
              )}

              {isHelmDisadvantaged && (
                <div className="p-2 rounded bg-amber-950/40 border border-amber-500/50 text-[10px] text-amber-300">
                  ⚠️ Firing primary/secondary weapons from the Helm without an Attack Run or Dogfight imposes disadvantage.
                </div>
              )}

              {/* STEP 1: FIRING MODE */}
              {wizardStep === 1 && (
                <div className="flex flex-col gap-4 py-2">
                  {!isOrdnance ? (
                    <div className="flex justify-between items-center bg-black/60 px-3 py-1.5 rounded border border-bridge-border text-xs">
                      <span className="text-muted-foreground uppercase text-[10px]">Thermal Reserve:</span>
                      <span className="font-bold text-cyan-neon">
                        {currentHeat} / {maxHeat} Heat ({remainingHeadroom} Headroom Remaining)
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center bg-black/60 px-3 py-1.5 rounded border border-bridge-border text-xs">
                      <span className="text-muted-foreground uppercase text-[10px]">Ordnance Tube:</span>
                      <span className="font-bold text-emerald-400">
                        {launcherState?.ordnanceName} ({launcherState?.loadedCount} / {launcherState?.maxCapacity} Loaded)
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-slate-300">Select the firing profile for this shot:</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      disabled={!canDoStandard}
                      onClick={() => setFiringMode("standard")}
                      className={`p-3 rounded border text-left flex flex-col justify-between gap-2 transition-all ${
                        !canDoStandard
                          ? "bg-red-950/40 border-red-500/50 text-red-400 cursor-not-allowed"
                          : firingMode === "standard"
                          ? "border-cyan-neon bg-cyan-neon/20 text-cyan-neon shadow-[0_0_10px_rgba(0,255,255,0.2)] cursor-pointer"
                          : "border-bridge-border bg-black/40 text-slate-300 hover:border-cyan-neon/40 cursor-pointer"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase block">{isOrdnance ? "Launch Payload" : "Standard Shot"}</span>
                          {!canDoStandard && <Ban className="w-3.5 h-3.5 text-red-400" />}
                        </div>
                        <span className="text-[9px] block mt-0.5">
                          {isAuto ? "[AUTO WEAPON ONLY]" : remainingHeadroom < 1 && !isOrdnance ? "[HEAT FULL]" : isOrdnance ? "Deploy 1 Warhead" : "Standard d20 Attack"}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono ${!canDoStandard ? "text-red-400 line-through font-bold" : "text-amber-300"}`}>
                        {isOrdnance ? "-1 Warhead" : (!canDoStandard ? "UNAVAILABLE" : "+1 Heat Build")}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={!canDoRapid}
                      onClick={() => setFiringMode("rapid")}
                      className={`p-3 rounded border text-left flex flex-col justify-between gap-2 transition-all ${
                        !canDoRapid
                          ? "bg-red-950/40 border-red-500/50 text-red-400 cursor-not-allowed"
                          : firingMode === "rapid"
                          ? "border-cyan-neon bg-cyan-neon/20 text-cyan-neon shadow-[0_0_10px_rgba(0,255,255,0.2)] cursor-pointer"
                          : "border-bridge-border bg-black/40 text-slate-300 hover:border-cyan-neon/40 cursor-pointer"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase block">Rapid Fire</span>
                          {!canDoRapid && <Ban className="w-3.5 h-3.5 text-red-400" />}
                        </div>
                        <span className="text-[9px] block mt-0.5">
                          {isOrdnance ? "[NOT APPLICABLE]" : !hasRapid ? "[NO RAPID]" : "Target Dex Save"}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono ${!canDoRapid ? "text-red-400 line-through font-bold" : "text-amber-300"}`}>
                        {!canDoRapid ? "UNAVAILABLE" : `+${rapidRating} Heat Build`}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={!canDoBurst}
                      onClick={() => setFiringMode("burst")}
                      className={`p-3 rounded border text-left flex flex-col justify-between gap-2 transition-all ${
                        !canDoBurst
                          ? "bg-red-950/40 border-red-500/50 text-red-400 cursor-not-allowed"
                          : firingMode === "burst"
                          ? "border-cyan-neon bg-cyan-neon/20 text-cyan-neon shadow-[0_0_10px_rgba(0,255,255,0.2)] cursor-pointer"
                          : "border-bridge-border bg-black/40 text-slate-300 hover:border-cyan-neon/40 cursor-pointer"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase block">Burst Area</span>
                          {!canDoBurst && <Ban className="w-3.5 h-3.5 text-red-400" />}
                        </div>
                        <span className="text-[9px] block mt-0.5">
                          {isOrdnance ? "[NOT APPLICABLE]" : !hasBurst ? "[NO BURST]" : "150ft Cube Dex Save"}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono ${!canDoBurst ? "text-red-400 line-through font-bold" : "text-amber-300"}`}>
                        {!canDoBurst ? "UNAVAILABLE" : `+${burstRating} Heat Build`}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: RANGE BRACKET */}
              {wizardStep === 2 && (
                <div className="flex flex-col gap-4 py-2">
                  <div className="flex justify-between items-center bg-black/50 p-2.5 rounded border border-bridge-border">
                    <span className="text-xs text-muted-foreground">Weapon Range:</span>
                    <span className="text-xs font-bold text-cyan-neon">{normalRange} ft (Normal) / {maxRange} ft (Maximum)</span>
                  </div>

                  <p className="text-xs text-slate-300">Select target distance:</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setRangeBracket("normal")}
                      className={`p-3 rounded border text-left transition-all cursor-pointer ${
                        rangeBracket === "normal"
                          ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                          : "border-bridge-border bg-black/40 text-slate-300 hover:border-emerald-400/40"
                      }`}
                    >
                      <span className="text-xs font-bold uppercase block">Normal Range</span>
                      <span className="text-[10px] block mt-1">≤ {normalRange} Feet</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRangeBracket("long")}
                      className={`p-3 rounded border text-left transition-all cursor-pointer ${
                        rangeBracket === "long"
                          ? "border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.2)]"
                          : "border-bridge-border bg-black/40 text-slate-300 hover:border-amber-400/40"
                      }`}
                    >
                      <span className="text-xs font-bold uppercase block">Long Range</span>
                      <span className="text-[10px] block mt-1">{normalRange + 1} – {maxRange} Feet</span>
                      <span className="text-[9px] text-amber-300 block mt-1">Disadvantage</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRangeBracket("out")}
                      className={`p-3 rounded border text-left transition-all cursor-pointer ${
                        rangeBracket === "out"
                          ? "border-red-500 bg-red-950/60 text-red-200"
                          : "border-red-500/40 bg-red-950/20 text-red-400 hover:bg-red-950/40"
                      }`}
                    >
                      <span className="text-xs font-bold uppercase block">Out of Range</span>
                      <span className="text-[10px] block mt-1">&gt; {maxRange} Feet</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: STANCES */}
              {wizardStep === 3 && (
                <div className="flex flex-col gap-3.5 py-2">
                  <p className="text-xs text-slate-300">Configure weapon property stances:</p>

                  <div className="space-y-2 border-t border-bridge-border/40 pt-2">
                    {hasPiercing && (
                      <label className="flex items-center justify-between p-2 rounded bg-black/40 border border-bridge-border cursor-pointer text-xs">
                        <div>
                          <span className="font-bold text-cyan-neon uppercase">Engage Piercing Stance</span>
                          <span className="text-[10px] text-muted-foreground block">+1 to Attack Roll / -1 to Damage Roll</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={togglePiercing}
                          onChange={(e) => setTogglePiercing(e.target.checked)}
                          className="w-4 h-4 accent-cyan-neon cursor-pointer"
                        />
                      </label>
                    )}

                    {hasDire && (
                      <label className="flex items-center justify-between p-2 rounded bg-black/40 border border-bridge-border cursor-pointer text-xs">
                        <div>
                          <span className="font-bold text-amber-300 uppercase">Engage Dire Stance</span>
                          <span className="text-[10px] text-muted-foreground block">-1 to Attack Roll / +1 to Damage Roll</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={toggleDire}
                          onChange={(e) => setToggleDire(e.target.checked)}
                          className="w-4 h-4 accent-cyan-neon cursor-pointer"
                        />
                      </label>
                    )}

                    {hasMelt && (
                      <label className="flex items-center justify-between p-2 rounded bg-black/40 border border-bridge-border cursor-pointer text-xs">
                        <div>
                          <span className="font-bold text-rose-400 uppercase">Engage Melt Stance</span>
                          <span className="text-[10px] text-muted-foreground block">-{proficiencyBonus} to Attack / +{proficiencyBonus} to Damage Result</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={toggleMelt}
                          onChange={(e) => setToggleMelt(e.target.checked)}
                          className="w-4 h-4 accent-cyan-neon cursor-pointer"
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: RESOLUTION */}
              {wizardStep === 4 && (
                <div className="flex flex-col gap-4 py-2">
                  {firingMode === "standard" ? (
                    <div className="flex flex-col gap-3">
                      <div className="bg-black/60 p-3 rounded border border-cyan-neon/40 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase block">Attack Roll Modifier</span>
                            <span className="text-xl font-bold text-cyan-neon font-mono">
                              1d20{attackMod >= 0 ? `+${attackMod}` : attackMod} to Hit
                            </span>
                            {netRollMode === "disadvantage" && (
                              <span className="text-[9px] font-bold text-amber-400 block mt-0.5">
                                [DISADVANTAGE ACTIVE: Roll 2d20, keep lower]
                              </span>
                            )}
                            {netRollMode === "advantage" && (
                              <span className="text-[9px] font-bold text-purple-300 block mt-0.5">
                                [ADVANTAGE ACTIVE: Roll 2d20, keep higher]
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-muted-foreground uppercase block">Critical Threshold</span>
                            <span className="text-sm font-bold text-amber-300 font-mono">
                              Natural {critThreshold}–20
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 rounded bg-black/40 border border-bridge-border">
                        <div className="flex flex-col justify-between gap-1 border-b sm:border-b-0 sm:border-r border-bridge-border/60 pb-2 sm:pb-0 sm:pr-2">
                          <span className="text-[10px] text-muted-foreground uppercase">Digital Dice Roll</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={handleRollDigitalAttack}
                              className="px-2.5 py-1 rounded border border-cyan-neon/40 bg-cyan-neon/10 text-cyan-neon text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 hover:bg-cyan-neon/20 cursor-pointer"
                            >
                              <Dices className="w-3.5 h-3.5" />
                              Roll d20
                            </button>

                            {attackRollData && (
                              <div className="text-xs font-mono">
                                {attackRollData.mode !== "normal" && attackRollData.d2 !== undefined ? (
                                  <span>
                                    Dice: [
                                    <strong className="text-cyan-neon">{attackRollData.naturalRoll}</strong>,{" "}
                                    <span className="line-through text-slate-500">{attackRollData.discardedDie}</span>
                                    ] + {attackMod} = <strong className="text-cyan-neon text-sm">{attackRollData.total}</strong>
                                  </span>
                                ) : (
                                  <span>
                                    Die: [<strong className="text-cyan-neon">{attackRollData.naturalRoll}</strong>] + {attackMod} = <strong className="text-cyan-neon text-sm">{attackRollData.total}</strong>
                                  </span>
                                )}

                                {attackRollData.isCrit && (
                                  <span className="ml-1.5 font-bold text-amber-300 animate-pulse text-[10px] uppercase bg-amber-500/20 border border-amber-500/40 px-1 py-0.2 rounded inline-flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> CRITICAL!
                                  </span>
                                )}
                                {attackRollData.isFumble && (
                                  <span className="ml-1.5 font-bold text-red-400 text-[10px] uppercase bg-red-950/40 border border-red-500/40 px-1 py-0.2 rounded">
                                    FUMBLE (1)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col justify-between gap-1">
                          <span className="text-[10px] text-muted-foreground uppercase">Manual Roll Entry</span>
                          <input
                            type="number"
                            placeholder="Roll Total"
                            value={manualAttackInput}
                            onChange={(e) => setManualAttackInput(e.target.value)}
                            className="w-28 rounded bg-black border border-slate-700 px-2 py-1 text-xs text-cyan-300 font-bold focus:outline-none focus:border-cyan-neon"
                          />
                        </div>
                      </div>

                      {attackOutcome === "pending" && (
                        <div className="grid grid-cols-3 gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => completeAttack(currentHeatCost)}
                            className="p-3 rounded border border-red-500/50 bg-red-500/10 text-red-400 font-bold uppercase text-xs flex items-center justify-center gap-2 hover:bg-red-500/20 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            Miss ({isOrdnance ? "-1 Warhead" : `+${currentHeatCost} Heat`})
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAttackOutcome("hit")
                              handleRollDigitalDamage(false)
                            }}
                            className="p-3 rounded border border-emerald-500/60 bg-emerald-500/20 text-emerald-300 font-bold uppercase text-xs flex items-center justify-center gap-2 hover:bg-emerald-500/30 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Target Hit
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAttackOutcome("crit")
                              handleRollDigitalDamage(true)
                            }}
                            className="p-3 rounded border border-amber-500/80 bg-amber-500/20 text-amber-300 font-bold uppercase text-xs flex items-center justify-center gap-1.5 hover:bg-amber-500/30 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.25)] animate-pulse"
                          >
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            Critical Hit!
                          </button>
                        </div>
                      )}

                      {(attackOutcome === "hit" || attackOutcome === "crit") && (
                        <div className={`border p-3.5 rounded flex flex-col gap-2.5 ${
                          attackOutcome === "crit"
                            ? "bg-amber-950/30 border-amber-500/70 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                            : "bg-emerald-950/30 border-emerald-500/60"
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold uppercase flex items-center gap-1.5 ${
                              attackOutcome === "crit" ? "text-amber-300" : "text-emerald-400"
                            }`}>
                              {attackOutcome === "crit" ? (
                                <>
                                  <Sparkles className="w-4 h-4 text-amber-400" />
                                  Critical Hit!
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  Hit Confirmed:
                                </>
                              )}
                            </span>
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            <span className="text-lg font-bold font-mono text-cyan-neon">
                              {finalDmgFormula} {(isOrdnance ? launcherState?.damageType : activeWizardWeapon.damageType)?.toUpperCase() || "ENERGY"} DAMAGE
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-black/60 p-2.5 rounded border border-slate-700">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleRollDigitalDamage(attackOutcome === "crit")}
                                className="px-3 py-1.5 rounded border border-cyan-neon/40 bg-cyan-neon/10 hover:bg-cyan-neon/25 text-cyan-neon text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                              >
                                <Dices className="w-4 h-4" />
                                Roll Damage
                              </button>
                              {damageRollData && (
                                <span className="text-xs font-mono font-bold text-cyan-neon">
                                  {damageRollData.breakdownString}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                placeholder="Damage"
                                value={manualDamageInput}
                                onChange={(e) => setManualDamageInput(e.target.value)}
                                className={`w-24 rounded bg-black border px-2 py-1 text-xs font-bold focus:outline-none ${
                                  attackOutcome === "crit"
                                    ? "border-amber-500/70 text-amber-300 focus:border-amber-400"
                                    : "border-slate-700 text-emerald-300 focus:border-emerald-500"
                                }`}
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => completeAttack(currentHeatCost)}
                            className={`mt-2 w-full py-2 rounded border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                              attackOutcome === "crit"
                                ? "border-amber-500/70 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                                : "border-emerald-500/60 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                            }`}
                          >
                            Complete Attack ({isOrdnance ? "-1 Warhead" : `+${currentHeatCost} Heat`})
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="bg-black/60 p-3 rounded border border-cyan-neon/40 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase block">
                              Target Dexterity Save DC
                            </span>
                            <span className="text-xl font-bold text-cyan-neon font-mono">
                              DC {saveDC}
                            </span>
                          </div>
                        </div>
                      </div>

                      {attackOutcome === "pending" && (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => completeAttack(currentHeatCost)}
                            className="p-3 rounded border border-amber-500/50 bg-amber-500/10 text-amber-400 font-bold uppercase text-xs flex items-center justify-center gap-2 hover:bg-amber-500/20 cursor-pointer"
                          >
                            Target Saved (0 Damage)
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAttackOutcome("failed")
                              handleRollDigitalDamage(false)
                            }}
                            className="p-3 rounded border border-emerald-500/60 bg-emerald-500/20 text-emerald-300 font-bold uppercase text-xs flex items-center justify-center gap-2 hover:bg-emerald-500/30 cursor-pointer"
                          >
                            Target Failed (Roll Damage)
                          </button>
                        </div>
                      )}

                      {attackOutcome === "failed" && (
                        <div className="bg-emerald-950/30 border border-emerald-500/60 p-3.5 rounded flex flex-col gap-2.5">
                          <span className="text-xs font-bold text-emerald-400 uppercase">
                            Failed Save — Report Damage:
                          </span>
                          <div className="flex flex-col gap-1">
                            <span className="text-lg font-bold font-mono text-cyan-neon">
                              {finalDmgFormula} {(isOrdnance ? launcherState?.damageType : activeWizardWeapon.damageType)?.toUpperCase() || "ENERGY"} DAMAGE
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-black/60 p-2.5 rounded border border-slate-700">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleRollDigitalDamage(false)}
                                className="px-3 py-1.5 rounded border border-cyan-neon/40 bg-cyan-neon/10 hover:bg-cyan-neon/25 text-cyan-neon text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                              >
                                <Dices className="w-4 h-4" />
                                Roll Damage
                              </button>
                              {damageRollData && (
                                <span className="text-xs font-mono font-bold text-cyan-neon">
                                  {damageRollData.breakdownString}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                placeholder="Damage"
                                value={manualDamageInput}
                                onChange={(e) => setManualDamageInput(e.target.value)}
                                className="w-24 rounded bg-black border border-slate-700 px-2 py-1 text-xs text-emerald-300 font-bold focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => completeAttack(currentHeatCost)}
                            className="mt-2 w-full py-2 rounded border border-emerald-500/60 bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider hover:bg-emerald-500/30 cursor-pointer"
                          >
                            Complete Attack (+{currentHeatCost} Heat)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Wizard Footer Navigation */}
              <div className="flex justify-between items-center pt-3 border-t border-bridge-border/40">
                {wizardStep > 1 && attackOutcome === "pending" ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep((prev) => Math.max(1, prev - 1) as any)}
                    className="px-3 py-1.5 rounded border border-bridge-border text-xs text-muted-foreground hover:text-white uppercase cursor-pointer"
                  >
                    &larr; Back
                  </button>
                ) : (
                  <div />
                )}

                {wizardStep < 4 && (
                  <button
                    type="button"
                    disabled={(wizardStep === 1 && !hasSufficientHeat) || (wizardStep === 2 && rangeBracket === "out")}
                    onClick={() => setWizardStep((prev) => Math.min(4, prev + 1) as any)}
                    className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${
                      (wizardStep === 1 && !hasSufficientHeat) || (wizardStep === 2 && rangeBracket === "out")
                        ? "bg-red-950/40 border border-red-500/50 text-red-400 cursor-not-allowed opacity-80"
                        : "bg-cyan-neon/20 border border-cyan-neon/60 text-cyan-neon hover:bg-cyan-neon/30 cursor-pointer"
                    }`}
                  >
                    Next Step →
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}