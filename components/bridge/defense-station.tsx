"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { 
  ShieldAlert, 
  ShieldCheck, 
  Users, 
  CheckCircle2, 
  Clock, 
  UserMinus,
  X,
  Maximize2,
  Minimize2,
  Layers,
  Bookmark,
  Volume2,
  VolumeX,
  Activity,
  Zap,
  Shield,
  Gauge,
  AlertTriangle,
  RotateCw,
  Sliders,
  Cpu,
  Flame,
  AlertOctagon,
  Anchor,
  Compass,
  Sparkles
} from "lucide-react"
import { CombatResources } from "./combat-resources"
import { StationModifications, Modification } from "./ship-modifications"
import { ShipStats } from "./ship-stats"
import { type ShipConfig } from "./ship-setup"
import { SHIP_SIZE_RULES, SHIP_TYPE_RULES, SHIP_TIER_PROGRESSION, ShipSize } from "@/lib/ship-rules"
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
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {})
    }

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
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {})
    }

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

export type DefenseCardId =
  | "shields"
  | "hull"
  | "armor"
  | "systemDamage"
  | "statuses"
  | "tacticalDefense"
  | "powerDice"
  | "mods"
  | "ship_stats"

interface CustomPreset {
  id: string
  name: string
  activeCards: DefenseCardId[]
}

const DEFAULT_PRESETS: CustomPreset[] = [
  { id: "shields", name: "Shields & Hull", activeCards: ["shields", "hull", "statuses", "systemDamage"] },
  { id: "tactical", name: "Tactical Defenses", activeCards: ["tacticalDefense","mods"] },
  { id: "all", name: "All Systems", activeCards: ["shields", "hull", "armor", "systemDamage", "statuses", "tacticalDefense", "powerDice", "mods", "ship_stats"] }
]

export interface ActiveStatus {
  id: string
  title: string
  effect: string
  duration: string
  level?: number
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

const getFeedbackDieBySize = (size?: string): string => {
  switch (size?.toLowerCase()) {
    case "tiny": return "1d4"
    case "small": return "1d6"
    case "medium": return "1d8"
    case "large": return "1d10"
    case "huge": return "1d12"
    case "gargantuan": return "1d20"
    default: return "1d6"
  }
}

const SYSTEM_DAMAGE_LEVEL_DEFINITIONS: Record<number, { title: string; effect: string }> = {
  0: {
    title: "Nominal Operations (Level 0)",
    effect: "All ship systems operating within normal parameters. No penalties active."
  },
  1: {
    title: "Level 1 Damage",
    effect: "Disadvantage on ability checks utilizing ship systems."
  },
  2: {
    title: "Level 2 Damage",
    effect: "Disadvantage on ability checks; +1 Slowed Level applied."
  },
  3: {
    title: "Level 3 Damage",
    effect: "Disadvantage on Attack Rolls and Saving Throws (plus prior level penalties)."
  },
  4: {
    title: "Level 4 Damage",
    effect: "Hit point maximum, Shield Point maximum, and Shield Regeneration rate halved."
  },
  5: {
    title: "Level 5 Damage",
    effect: "Ship becomes permanently 'Used' (breakdown risks active, resale value halved)."
  },
  6: {
    title: "Level 6: Catastrophic Power Failure",
    effect: "All primary systems fail. Total blackout. Vessel is disabled and inoperable."
  }
}

const SHIP_STATUS_OPTIONS = [
  { 
    id: "blinded", 
    title: "BLINDED", 
    defaultEffect: "A blinded ship can't see and automatically fails any ability check that relies on sight or the ship's sensors. Attack rolls against the ship have advantage, and the ship's attack rolls have disadvantage." 
  },
  { 
    id: "disabled", 
    title: "DISABLED", 
    defaultEffect: "A disabled ship can't communicate with external sources more than 1,000 feet away. A disabled ship can't take actions or reactions. A disabled ship has 4 slowed levels." 
  },
  { 
    id: "ionized", 
    title: "IONIZED", 
    defaultEffect: "An ionized starship has disadvantage on attack rolls and ability checks." 
  },
  { 
    id: "invisible", 
    title: "INVISIBLE", 
    defaultEffect: "An invisible starship is impossible to see without the aid of powers or a special sense. For the purpose of hiding, the starship is heavily obscured. The starship's location can be detected by any noise it makes or any tracks it leaves. Attack rolls against the creature have disadvantage, and the creature's attack rolls have advantage." 
  },
  { 
    id: "shocked", 
    title: "SHOCKED", 
    defaultEffect: "A shocked starship can't take reactions. On its turn, a shocked starship can take either an action or a bonus action, but not both." 
  },
  { 
    id: "slowed", 
    hasLevels: true,
    title: "SLOWED", 
    defaultEffect: "Some abilities, effects, and hazards can lead to a special condition called slowed. Slowed is measured in four levels. An effect can give a ship one or more levels of slowed, as specified in the effect's description.",
    levels: {
      1: "Speed reduced by 150 feet",
      2: "Speed reduced by 250 feet",
      3: "Speed reduced by 300 feet",
      4: "Speed reduced to 0, and can't benefit from any bonus to speed"
    }
  },
  { 
    id: "stalled", 
    title: "STALLED", 
    defaultEffect: "A stalled ship is disabled. Any active features controlled by the ship, such as a Tractor Beam or Gravity Well Projector, automatically end. The ship automatically fails Strength and Dexterity saving throws. Attack rolls against the ship have advantage." 
  },
  { 
    id: "stunned", 
    title: "STUNNED", 
    defaultEffect: "A stunned ship has 4 slowed levels. The ship automatically fails Strength and Dexterity saving throws. Attack rolls against the ship have advantage." 
  },
  { 
    id: "tractored", 
    title: "TRACTORED", 
    defaultEffect: "A tractored ship has 4 slowed levels. The condition ends if the tractoring ship is disabled. The condition also ends if an effect removes the tractored ship from the reach of the tractoring ship or effect." 
  },
  { 
    id: "used", 
    title: "USED", 
    defaultEffect: "A used starship's value is reduced by half. When a deployed crew member on a used starship rolls a 1 on an ability check, attack roll, or saving throw, they must make a destruction saving throw. If the roll is 10 or higher, they succeed. On a failure, the ship suffers 1 level of system damage." 
  },
]

interface DefenseStationProps {
  onHullChange?: (current: number, max: number, ac: number) => void
  onShieldChange?: (current: number, max: number, temp: number) => void
  availablePowerDice?: number
  maxPowerDice?: number
  powerDieType?: string
  onConsumePowerDice?: (amount: number) => boolean | void
  shipConfig?: ShipConfig
  spentHullDice?: number
  onSpentHullDiceChange?: (spent: number) => void
  spentShieldDice?: number
  onSpentShieldDiceChange?: React.Dispatch<React.SetStateAction<number>> | ((spent: number | ((prev: number) => number)) => void)
  installedMods?: Modification[]
  onRemoveMod?: (instanceId: string) => void
  stationPools?: Record<string, number>
  onUpdateStationPools?: React.Dispatch<React.SetStateAction<Record<string, number>>>
  sharedPoolDice?: number
  onUpdateSharedPool?: React.Dispatch<React.SetStateAction<number>>
  damageReduction: number
  currentShields?: number
  maxShields?: number
  tempShields?: number
  standingByUsed?: boolean
  onUseStandingBy?: () => void
  leafOnTheWindUsed?: boolean
  onUseLeafOnTheWind?: () => void
  versatileTransportUsed?: number
  onUpdateVersatileTransportUsed?: (count: number | ((prev: number) => number)) => void
  bestShipInVerseUsed?: boolean
  onUpdateBestShipInVerseUsed?: (used: boolean | ((prev: boolean) => boolean)) => void
  systemDamageLevel?: number
  onUpdateSystemDamageLevel?: (level: number | ((prev: number) => number)) => void
  statuses?: ActiveStatus[]
  onAddStatus?: (status: ActiveStatus) => void
  onRemoveStatus?: (statusId: string) => void
  manifest?: ManifestMember[]
  onAssignCrew?: (memberId: string, targetLocation: ShipCompartmentId) => void
  onToggleTurn?: (memberId: string) => void
}

export function DefenseStation({
  onHullChange,
  onShieldChange,
  availablePowerDice = 4,
  maxPowerDice = 5,
  powerDieType = "d8",
  onConsumePowerDice = () => false,
  shipConfig,
  spentHullDice = 0,
  onSpentHullDiceChange,
  spentShieldDice = 0,
  onSpentShieldDiceChange,
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
  damageReduction,
  currentShields,
  maxShields,
  tempShields,
  standingByUsed = false,
  onUseStandingBy,
  leafOnTheWindUsed = false,
  onUseLeafOnTheWind,
  versatileTransportUsed = 0,
  onUpdateVersatileTransportUsed,
  bestShipInVerseUsed = false,
  onUpdateBestShipInVerseUsed,
  systemDamageLevel: rawSystemDamageLevel = 0,
  onUpdateSystemDamageLevel,
  statuses = [],
  onAddStatus,
  onRemoveStatus,
  manifest = [],
  onAssignCrew,
  onToggleTurn,
}: DefenseStationProps) {
  const isInitialMount = useRef(true)

  // --- MFD MODULAR DECK STATE (PER-CLIENT PERSISTENCE) ---
  const [openCards, setOpenCards] = useState<DefenseCardId[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sw5e_defense_open_cards")
        if (saved) return JSON.parse(saved)
      } catch {}
    }
    return ["shields", "hull", "powerDice"]
  })

  const [maximizedCard, setMaximizedCard] = useState<DefenseCardId | null>(null)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sw5e_defense_open_cards", JSON.stringify(openCards))
      } catch {}
    }
  }, [openCards])

  const toggleCard = (id: DefenseCardId) => {
    if (soundEnabled) {
      playFlatGlassClick()
      triggerTactilePulse("tap")
    }
    setOpenCards((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const applyPreset = (cards: DefenseCardId[]) => {
    if (soundEnabled) {
      playSubtleEngage()
      triggerTactilePulse("heavy")
    }
    setOpenCards(cards)
    setMaximizedCard(null)
  }

  const handleSaveCustomPreset = () => {
    const name = window.prompt("Enter name for this custom defense layout:", "Custom Defense Setup")
    if (!name) return
    if (typeof window !== "undefined") {
      try {
        const key = `sw5e_defense_preset_${Date.now()}`
        localStorage.setItem(key, JSON.stringify({ id: key, name, activeCards: openCards }))
        alert(`Preset '${name}' saved to this device!`)
      } catch {}
    }
  }

  const numericSystemDamageLevel = useMemo(() => {
    if (typeof rawSystemDamageLevel === "number") return rawSystemDamageLevel
    if (typeof rawSystemDamageLevel === "string") {
      const parsed = parseInt(rawSystemDamageLevel, 10)
      return isNaN(parsed) ? 0 : parsed
    }
    return 0
  }, [rawSystemDamageLevel])

  const assignedCrew = useMemo(() => {
    return manifest
      .filter((m) => m.location === "defense" && !m.isPassenger)
      .sort((a, b) => a.assignedOrder - b.assignedOrder)
  }, [manifest])

  const availablePersonnel = useMemo(() => {
    return manifest.filter((m) => m.location !== "defense" && !m.isPassenger)
  }, [manifest])

  const defenseMods = useMemo(() => {
    return installedMods.filter(
      (m) => m.station?.toLowerCase() === "defense"
    )
  }, [installedMods])

  const isNavigatorMastery = shipConfig?.roleMastery === "Navigator"

  const shipSize = (shipConfig?.size || "small").toLowerCase()
  const isSmallOrTiny = shipSize === "small" || shipSize === "tiny"
  const isMedium = shipSize === "medium"
  const shipTier = typeof shipConfig?.tier === "number" ? shipConfig.tier : 0
  const hasHoldTogether = isMedium && shipTier >= 3

  // Chassis Surge Gating
  const hasStandingBy = isSmallOrTiny && shipTier >= 4
  const hasLeafOnTheWind = isSmallOrTiny && shipTier >= 5
  const hasVersatileTransport = isMedium && shipTier >= 3
  const versatileMaxUses = 2 * shipTier
  const hasBestShip = isMedium && shipTier >= 5

  const isLevel4Damage = numericSystemDamageLevel >= 4

  const hasFeedbackShield = installedMods.some((m) => m.name.toUpperCase().includes("FEEDBACK SHIELD"))
  const hasInvulnerabilityDrive = installedMods.some((m) => m.name.toUpperCase().includes("INVULNERABILITY DRIVE"))

  const [invulnerabilityRounds, setInvulnerabilityRounds] = useState<number>(0)
  const [invulnerabilityUsed, setInvulnerabilityUsed] = useState<boolean>(false)
  const [feedbackRollLog, setFeedbackRollLog] = useState<string | null>(null)

  const feedbackDie = getFeedbackDieBySize(shipConfig?.size)

  const handleTriggerFeedbackShield = () => {
    const maxVal = parseInt(feedbackDie.replace(/[^0-9]/g, ""), 10) || 6
    const roll = Math.floor(Math.random() * maxVal) + 1
    setFeedbackRollLog(`Retaliation Triggered: ${roll} damage reflected back to attacker (${feedbackDie} roll).`)
  }

  const handleActivateInvulnerabilityDrive = () => {
    if (invulnerabilityUsed) return
    const rounds = Math.floor(Math.random() * 4) + 1
    setInvulnerabilityRounds(rounds)
    setInvulnerabilityUsed(true)
  }

  const handleEndInvulnerabilityDrive = () => {
    setInvulnerabilityRounds(0)
    handleRollDestructionSave()
  }

  const [currentShieldType, setCurrentShieldType] = useState(shipConfig?.shieldType || "Standard Energy Shield")

  useEffect(() => {
    if (shipConfig?.shieldType) {
      setCurrentShieldType(shipConfig.shieldType)
    }
  }, [shipConfig?.shieldType])

  const powerCoupling = shipConfig?.powerCoupling ?? shipConfig?.couplingType ?? "Direct Power Coupling"
  const isDistributed = powerCoupling.toLowerCase().includes("distributed")
  const isHubAndSpoke = powerCoupling.toLowerCase().includes("hub") || powerCoupling.toLowerCase().includes("spoke")
  const isDirect = !isDistributed && !isHubAndSpoke

  const currentStationDice = stationPools["defense"] ?? (isHubAndSpoke ? 1 : isDistributed ? 2 : availablePowerDice)
  const effectiveMax = isDirect ? maxPowerDice : (isDistributed ? 2 : 1)
  const effectiveAvailable = Math.min(effectiveMax, isDirect ? availablePowerDice : currentStationDice)

  const handleCustomConsume = (amount: number = 1) => {
    if (isDirect) {
      return onConsumePowerDice(amount)
    }

    if (currentStationDice >= amount) {
      if (onUpdateStationPools) {
        onUpdateStationPools((prev) => ({
          ...prev,
          defense: Math.max(0, (prev["defense"] ?? (isHubAndSpoke ? 1 : 2)) - amount),
        }))
      }
      return true
    } else if (isHubAndSpoke && sharedPoolDice >= amount) {
      if (onUpdateSharedPool) {
        onUpdateSharedPool((prev) => Math.max(0, prev - amount))
      }
      return true
    }

    return !!onConsumePowerDice(amount)
  }

  const sizeKey = ((shipConfig?.size || "small").toLowerCase()) as ShipSize
  const sizeRules = SHIP_SIZE_RULES[sizeKey] || SHIP_SIZE_RULES.small
  const roleRules = shipConfig?.shipType ? SHIP_TYPE_RULES[shipConfig.shipType] : null

  const rawDex = shipConfig?.stats?.dexterity ?? 10
  const dexTierBoost = shipConfig?.tierStatBoosts?.dexterity ?? 0
  const dexChassisMod = sizeRules.dexterityMod || 0
  const dexRoleMod = roleRules?.dexterityMod || 0
  const effectiveDexScore = rawDex + dexTierBoost + dexChassisMod + dexRoleMod
  const effectiveDexMod = Math.floor((effectiveDexScore - 10) / 2)

  const armorType = shipConfig?.armorType ?? "Lightweight Armor"
  const normalizedArmor = armorType.toLowerCase()

  let appliedDexMod = effectiveDexMod
  let dexLimitLabel = "Full DEX"
  if (normalizedArmor.includes("reinforced")) {
    appliedDexMod = 0
    dexLimitLabel = "No DEX (Reinforced)"
  } else if (normalizedArmor.includes("deflection")) {
    appliedDexMod = Math.min(2, effectiveDexMod)
    dexLimitLabel = "Max +2 DEX (Deflection)"
  }

  const hasGravityWarpMishap = statuses.some((s) => 
    s.id?.toLowerCase().includes("gravity warp") || 
    s.title?.toLowerCase().includes("gravity warp")
  )
  const gravityWarpACPenalty = hasGravityWarpMishap ? -2 : 0

  const tierACBonus = SHIP_TIER_PROGRESSION[sizeKey]?.[shipTier]?.acUpgrade ?? (shipTier >= 2 ? shipTier - 1 : 0)
  const modsACBonus = installedMods.reduce((sum, mod) => sum + ((mod as any).acBonus || 0), 0)
  
  const unpenalizedAC = (shipConfig as any)?.baseArmorClass ?? (10 + appliedDexMod + tierACBonus + modsACBonus)
  const dynamicAC = Math.max(1, unpenalizedAC + gravityWarpACPenalty)

  const baseDiceCount = getBaseDiceBySize(shipConfig?.size)
  const tierDiceBonus = shipConfig?.tier ?? 0
  const calculatedTotalDice = baseDiceCount + tierDiceBonus

  const resistances = (shipConfig as any)?.damageResistances ?? {}
  const hullResistancesList: string[] = []
  if (resistances.hullEnergy) hullResistancesList.push("Energy (Ablative)")
  if (resistances.hullKinetic) hullResistancesList.push("Kinetic (Reactive)")
  if (resistances.rammingKinetic) hullResistancesList.push("Ramming Kinetic (Shock Absorbers)")
  if (isNavigatorMastery) hullResistancesList.push("Environmental Effects (Navigator Mastery)")

  const shieldResistancesList: string[] = []
  if (resistances.shieldsEnergy) shieldResistancesList.push("Energy (Reactive Compensator)")
  if (resistances.shieldsKinetic) shieldResistancesList.push("Kinetic (Absorptive)")

  const baseMaxHull = (shipConfig as any)?.hull?.max ?? shipConfig?.baseHull ?? (shipConfig as any)?.hullMax ?? 40
  const baseMaxShields = maxShields ?? (shipConfig as any)?.shields?.max ?? shipConfig?.maxShields ?? (shipConfig as any)?.shieldMax ?? 24

  const effectiveMaxHull = isLevel4Damage ? Math.floor(baseMaxHull / 2) : baseMaxHull
  const effectiveMaxShields = isLevel4Damage ? Math.floor(baseMaxShields / 2) : baseMaxShields

  const getInitialHull = () => {
    const current = (shipConfig as any)?.hull?.current ?? (shipConfig as any)?.currentHull ?? baseMaxHull
    const armorRating = (shipConfig as any)?.armorRating ?? (shipConfig as any)?.armor?.rating ?? 0
    const totalHD = (shipConfig as any)?.hull?.totalHD ?? (shipConfig as any)?.totalHitDice ?? calculatedTotalDice
    const hdType = (shipConfig as any)?.hull?.hdType ?? (shipConfig as any)?.hullDiceType ?? "d6"
    return { current: Math.min(effectiveMaxHull, current), max: baseMaxHull, ac: dynamicAC, armorType, armorRating, totalHD, hdType, resistances: hullResistancesList }
  }

  const getInitialShields = () => {
    const current = currentShields ?? (shipConfig as any)?.shields?.current ?? (shipConfig as any)?.currentShields ?? baseMaxShields
    const temp = tempShields ?? (shipConfig as any)?.shields?.temp ?? (shipConfig as any)?.tempShields ?? 0
    const totalSD = (shipConfig as any)?.shields?.totalSD ?? (shipConfig as any)?.totalShieldDice ?? calculatedTotalDice
    const sdType = (shipConfig as any)?.shields?.sdType ?? (shipConfig as any)?.shieldDieType ?? "d6"
    const shieldRegen = (shipConfig as any)?.shields?.regen ?? "1 Shield Die"
    const shieldTypeName = (shipConfig as any)?.shields?.typeName ?? shipConfig?.shieldType ?? "Standard Energy Shields"
    return { current: Math.min(effectiveMaxShields, current), max: baseMaxShields, temp, totalSD, sdType, shieldRegen, shieldTypeName, resistances: shieldResistancesList }
  }

  const [hull, setHull] = useState(getInitialHull)
  const [shipShields, setShipShields] = useState(getInitialShields)

  useEffect(() => {
    if (isLevel4Damage) {
      if (hull.current > effectiveMaxHull) {
        setHull((prev) => ({ ...prev, current: effectiveMaxHull }))
        onHullChange?.(effectiveMaxHull, baseMaxHull, dynamicAC)
      }
      if (shipShields.current > effectiveMaxShields) {
        setShipShields((prev) => ({ ...prev, current: effectiveMaxShields }))
        onShieldChange?.(effectiveMaxShields, baseMaxShields, shipShields.temp)
      }
    }
  }, [isLevel4Damage, effectiveMaxHull, effectiveMaxShields, dynamicAC, baseMaxHull, baseMaxShields, onHullChange, onShieldChange, shipShields.temp, hull.current, shipShields.current])

  useEffect(() => {
    if (currentShields !== undefined || maxShields !== undefined || tempShields !== undefined) {
      setShipShields((prev) => {
        const nextCurrent = currentShields !== undefined ? (isLevel4Damage ? Math.min(effectiveMaxShields, currentShields) : currentShields) : prev.current
        return {
          ...prev,
          current: nextCurrent,
          max: maxShields !== undefined ? maxShields : prev.max,
          temp: tempShields !== undefined ? tempShields : prev.temp,
        }
      })
    }
  }, [currentShields, maxShields, tempShields, isLevel4Damage, effectiveMaxShields])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    setHull((prev) => {
      if (prev.ac === dynamicAC) return prev
      onHullChange?.(prev.current, prev.max, dynamicAC)
      return { ...prev, ac: dynamicAC }
    })
  }, [dynamicAC, onHullChange])

  useEffect(() => {
    if (shipConfig) {
      setHull(getInitialHull())
      setShipShields(getInitialShields())
    }
  }, [shipConfig])

  const [destructionSaves, setDestructionSaves] = useState({
    successes: 0,
    failures: 0,
    isStable: false,
    lastRoll: null as number | null,
    lastResultText: "",
  })

  const strModifier = Math.floor((-10 + (shipConfig?.stats?.strength ?? (shipConfig as any)?.str ?? 10)) / 2)
  const boostCheckBonus = shipConfig?.skills?.boost ?? (strModifier + 2)

  const [hasRegeneratedThisTurn, setHasRegeneratedThisTurn] = useState<boolean>(false)
  const [regenLog, setRegenLog] = useState<string>("")
  const [manualRollInput, setManualRollInput] = useState<string>("")

  const [selectedStatusId, setSelectedStatusId] = useState<string>("disabled")
  const [selectedSlowLevel, setSelectedSlowLevel] = useState<number>(1)
  const [customDuration, setCustomDuration] = useState<string>("1 Round")

  const handleAdjustTotalShields = (delta: number) => {
    if (invulnerabilityRounds > 0 && delta < 0) {
      alert("Invulnerability Drive is active! Ship is immune to all damage.")
      return
    }

    if (delta > 0) {
      const ceiling = isLevel4Damage ? effectiveMaxShields : shipShields.max
      const newCurrent = Math.min(ceiling, shipShields.current + delta)
      setShipShields((prev) => ({ ...prev, current: newCurrent }))
      onShieldChange?.(newCurrent, shipShields.max, shipShields.temp)
    } else {
      let damageRemaining = Math.abs(delta)
      let newTemp = shipShields.temp
      let newCurrent = shipShields.current

      if (newTemp > 0) {
        const absorbedByTemp = Math.min(newTemp, damageRemaining)
        newTemp -= absorbedByTemp
        damageRemaining -= absorbedByTemp
      }

      if (damageRemaining > 0 && newCurrent > 0) {
        const absorbedByCurrent = Math.min(newCurrent, damageRemaining)
        newCurrent -= absorbedByCurrent
        damageRemaining -= absorbedByCurrent
      }

      setShipShields((prev) => ({ ...prev, current: newCurrent, temp: newTemp }))
      onShieldChange?.(newCurrent, shipShields.max, newTemp)

      if (damageRemaining > 0) {
        handleAdjustHull(-damageRemaining)
      }
    }
  }

  const handleAdjustHull = (delta: number) => {
    if (invulnerabilityRounds > 0 && delta < 0) {
      alert("Invulnerability Drive is active! Ship is immune to all damage.")
      return
    }

    const incomingDamage = delta < 0
    const ceiling = isLevel4Damage ? effectiveMaxHull : hull.max
    const newCurrent = Math.max(0, Math.min(ceiling, hull.current + delta))

    // SW5e Rules: Damage suffered while at 0 HP incurs a failed destruction saving throw
    if (hull.current === 0 && incomingDamage) {
      setDestructionSaves((prev) => {
        const newFailures = prev.failures + 1
        return {
          ...prev,
          failures: newFailures,
          isStable: false,
          lastResultText: `Damage at 0 HP: Incurred 1 failed destruction save (${newFailures} Failures).`,
        }
      })
    }

    setHull((prev) => ({ ...prev, current: newCurrent }))
    onHullChange?.(newCurrent, hull.max, dynamicAC)
  }

  const ceilingShieldMax = isLevel4Damage ? effectiveMaxShields : shipShields.max
  const missingShieldPoints = Math.max(0, ceilingShieldMax - shipShields.current)
  const targetDC = Math.max(10, Math.floor(missingShieldPoints / 2))

  const handleExecuteShieldRegeneration = (isManual: boolean, manualValue?: number) => {
    if (hasRegeneratedThisTurn) return

    const d20Roll = Math.floor(Math.random() * 20) + 1
    const totalCheck = d20Roll + boostCheckBonus
    const isSuccess = totalCheck >= targetDC

    let rawHealAmount = 0
    let rollDetails = ""

    const dieSides = parseInt(shipShields.sdType.replace(/[^0-9]/g, ""), 10) || 8

    if (isManual && manualValue !== undefined) {
      rawHealAmount = Math.max(1, manualValue)
      rollDetails = `Manual Shield Roll: +${rawHealAmount} SP`
    } else {
      const roll1 = Math.floor(Math.random() * dieSides) + 1
      if (!isSuccess) {
        const roll2 = Math.floor(Math.random() * dieSides) + 1
        rawHealAmount = Math.min(roll1, roll2)
        rollDetails = `Failed check (Rolled ${d20Roll}+${boostCheckBonus}=${totalCheck} vs DC ${targetDC}). Rolled 2${shipShields.sdType} [${roll1}, ${roll2}], took lesser: +${rawHealAmount} SP`
      } else {
        rawHealAmount = roll1
        rollDetails = `Successful check (Rolled ${d20Roll}+${boostCheckBonus}=${totalCheck} vs DC ${targetDC}). Rolled ${shipShields.sdType} [${roll1}]: +${rawHealAmount} SP`
      }
    }

    const finalHealAmount = isLevel4Damage ? Math.max(1, Math.floor(rawHealAmount / 2)) : rawHealAmount
    if (isLevel4Damage) {
      rollDetails += ` -> Halved to +${finalHealAmount} SP (System Damage Lvl 4)`
    }

    const ceiling = isLevel4Damage ? effectiveMaxShields : shipShields.max
    const newCurrent = Math.min(ceiling, shipShields.current + finalHealAmount)

    setShipShields((prev) => ({ ...prev, current: newCurrent }))
    onShieldChange?.(newCurrent, shipShields.max, shipShields.temp)

    setHasRegeneratedThisTurn(true)
    setRegenLog(rollDetails)
    setManualRollInput("")
  }

  const handleResetRegenTurn = () => {
    setHasRegeneratedThisTurn(false)
    setRegenLog("")
  }

  const handleRollDestructionSave = () => {
    const roll = Math.floor(Math.random() * 20) + 1

    if (roll === 20) {
      // Natural 20 restores 1 HP
      handleAdjustHull(1)
      setDestructionSaves((prev) => ({
        ...prev,
        successes: 3,
        isStable: true,
        lastRoll: 20,
        lastResultText: "NATURAL 20! Ship regains 1 HP and stabilizes instantly.",
      }))
      return
    }

    if (roll === 1) {
      // Natural 1 counts as two failures
      setDestructionSaves((prev) => {
        const newFailures = prev.failures + 2
        return {
          ...prev,
          failures: newFailures,
          lastRoll: 1,
          lastResultText: `NATURAL 1! Critical failure (+2 failures, total: ${newFailures}).`,
        }
      })
      return
    }

    const isSuccess = roll >= 10

    setDestructionSaves((prev) => {
      const newSuccesses = isSuccess ? Math.min(3, prev.successes + 1) : prev.successes
      const newFailures = !isSuccess ? prev.failures + 1 : prev.failures
      const nowStable = newSuccesses >= 3

      return {
        ...prev,
        successes: newSuccesses,
        failures: newFailures,
        isStable: nowStable,
        lastRoll: roll,
        lastResultText: isSuccess 
          ? `Rolled ${roll}: SUCCESS (${newSuccesses}/3)` 
          : `Rolled ${roll}: FAILURE (${newFailures} Failures)`,
      }
    })
  }

  const handleResetDestructionSaves = () => {
    setDestructionSaves({
      successes: 0,
      failures: 0,
      isStable: false,
      lastRoll: null,
      lastResultText: "",
    })
  }

  const handleAddStatusLocal = () => {
    const statusDef = SHIP_STATUS_OPTIONS.find((s) => s.id === selectedStatusId)
    if (!statusDef) return

    let effectText = statusDef.defaultEffect || ""
    let titleText = statusDef.title
    let levelVal: number | undefined = undefined

    if (statusDef.hasLevels && statusDef.levels) {
      levelVal = selectedSlowLevel
      const levelEffectText = statusDef.levels[selectedSlowLevel as keyof typeof statusDef.levels]
      effectText = `${statusDef.defaultEffect} [Level ${selectedSlowLevel}: ${levelEffectText}]`
      titleText = `SLOWED (LVL ${selectedSlowLevel})`
    }

    const timestamp = Date.now()
    const newStatusEntry: ActiveStatus = {
      id: `${timestamp}-${statusDef.id}`,
      title: titleText,
      effect: effectText,
      duration: customDuration || "Until Cleared",
      level: levelVal,
    }

    onAddStatus?.(newStatusEntry)

    if (statusDef.id === "disabled" || statusDef.id === "stunned" || statusDef.id === "tractored") {
      const hasSlowed4 = statuses.some((s) => s.title.includes("SLOWED") && s.level === 4)
      if (!hasSlowed4) {
        const slowedEntry: ActiveStatus = {
          id: `${timestamp}-slowed-auto`,
          title: "SLOWED (LVL 4)",
          effect: `Speed reduced to 0 ft (Source: ${statusDef.title} condition).`,
          duration: customDuration || "Until Cleared",
          level: 4,
        }
        onAddStatus?.(slowedEntry)
      }
    }
  }

  const handleRemoveStatusLocal = (statusId: string) => {
    const target = statuses.find((s) => s.id === statusId)
    onRemoveStatus?.(statusId)

    if (target && (target.id.includes("disabled") || target.title.includes("DISABLED") || target.id.includes("stunned") || target.title.includes("STUNNED") || target.id.includes("tractored") || target.title.includes("TRACTORED"))) {
      const autoSlowed = statuses.find((s) => s.id.includes("slowed-auto"))
      if (autoSlowed) {
        onRemoveStatus?.(autoSlowed.id)
      }
    }
  }

  const fullMaxShields = shipShields.max || 1
  const fullMaxHull = hull.max || 1

  const tempPercent = fullMaxShields > 0 ? Math.max(0, Math.min(100, (shipShields.temp / fullMaxShields) * 100)) : 0
  const regularPercent = fullMaxShields > 0 ? Math.max(0, Math.min(100 - tempPercent, (shipShields.current / fullMaxShields) * 100)) : 0
  const totalEffectivePercent = regularPercent + tempPercent

  const hullPercent = fullMaxHull > 0 ? Math.max(0, Math.min(100, (hull.current / fullMaxHull) * 100)) : 0

  const getBarColor = (pct: number) => {
    if (pct <= 0) return "bg-red-600 animate-pulse"
    if (pct <= 25) return "bg-red-500"
    if (pct <= 60) return "bg-amber-400"
    return "bg-cyan-neon"
  }

  const getHullBarColor = (pct: number) => {
    if (pct <= 0) return "bg-red-600 animate-pulse"
    if (pct <= 25) return "bg-red-500"
    if (pct <= 60) return "bg-amber-400"
    return "bg-emerald-500"
  }

  const currentDamageDefinition = SYSTEM_DAMAGE_LEVEL_DEFINITIONS[numericSystemDamageLevel] || SYSTEM_DAMAGE_LEVEL_DEFINITIONS[0]

  // RENDER DOCKED SNAPSHOT CARD TILE
  const renderSnapshotCard = (
    id: DefenseCardId,
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
            <h2 className="text-glow-cyan text-base md:text-lg font-bold tracking-[0.15em] text-cyan-neon flex items-center gap-2">
              <Shield className="h-5 w-5 text-cyan-neon" />
              DEFENSE, SHIELDS &amp; DAMAGE CONTROL
            </h2>
          </div>
          <p className="text-[10px] tracking-[0.3em] text-muted-foreground/60 mt-0.5">
            {shipConfig?.name?.toUpperCase() || "VESSEL"} // ARMOR &amp; SHIELD MITIGATION //{" "}
            <span className={hull.current === 0 ? "text-red-500 font-bold animate-pulse" : (shipShields.current === 0 && shipShields.temp === 0) ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
              {hull.current === 0 ? "HULL DEPLETED (DESTRUCTION SAVES)" : (shipShields.current === 0 && shipShields.temp === 0) ? "SHIELDS DOWN" : "SHIELDS ONLINE"}
            </span>
          </p>
        </div>

        {/* Tactical Status Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {hasGravityWarpMishap && (
            <span className="rounded border border-red-500/80 bg-red-950/60 px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider text-red-300 animate-pulse">
              ⚠️ GRAVITY WARP (-2 AC)
            </span>
          )}

          {isLevel4Damage && (
            <span className="rounded border border-red-500/80 bg-red-950/60 px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider text-red-300 animate-pulse">
              ⚠️ LVL 4: 50% HP/SP CAP
            </span>
          )}

          <span className="rounded-sm border border-cyan-neon/50 bg-cyan-neon/10 px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-cyan-neon">
            AC {dynamicAC} • DR {damageReduction}
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
            title="Collapse all active console drawers"
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
            <span>Defense Console Personnel:</span>
          </div>

          {assignedCrew.length === 0 ? (
            <span className="text-xs text-amber-300 italic px-2 py-0.5 border border-amber-500/30 bg-amber-950/20 rounded">
              Console Uncrewed — Assign Defense Officer
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
                        : "bg-sky-500/20 text-sky-400 border-sky-500/40"
                    }`}
                  >
                    {isLead ? "Defense Officer" : "Support"}
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
                if (e.target.value) onAssignCrew(e.target.value, "defense")
              }}
              className="rounded bg-slate-950 border border-slate-700 px-2 py-0.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-neon cursor-pointer"
            >
              <option value="" disabled>+ Assign Defense Crew...</option>
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
          "shields",
          "Shield Grid",
          `${shipShields.current}/${isLevel4Damage ? effectiveMaxShields : fullMaxShields} SP`,
          shipShields.temp > 0 ? `+${shipShields.temp} Temp SP` : "Shields Online",
          <Shield className="w-3 h-3 text-cyan-neon" />,
          shipShields.current === 0 && shipShields.temp === 0 ? "text-red-400 animate-pulse" : "text-cyan-neon"
        )}

        {renderSnapshotCard(
          "hull",
          "Hull Structure",
          `${hull.current}/${isLevel4Damage ? effectiveMaxHull : fullMaxHull} HP`,
          hull.current === 0 ? "Destruction Save" : "Plating Intact",
          <Anchor className="w-3 h-3 text-emerald-400" />,
          hull.current === 0 ? "text-red-500 animate-pulse" : "text-emerald-400"
        )}

        {renderSnapshotCard(
          "armor",
          "Armor & DR",
          `AC ${dynamicAC} • DR ${damageReduction}`,
          hasGravityWarpMishap ? "Warped (-2 AC)" : armorType.replace(" Armor", ""),
          <ShieldAlert className="w-3 h-3 text-cyan-neon" />,
          hasGravityWarpMishap ? "text-red-400" : "text-cyan-neon"
        )}

        {renderSnapshotCard(
          "systemDamage",
          "System Damage",
          `Level ${numericSystemDamageLevel} / 6`,
          numericSystemDamageLevel === 0 ? "Nominal Ops" : `Penalties Active`,
          <AlertOctagon className="w-3 h-3 text-amber-400" />,
          numericSystemDamageLevel === 0 ? "text-emerald-400" : numericSystemDamageLevel <= 2 ? "text-amber-400" : "text-red-400 animate-pulse"
        )}

        {renderSnapshotCard(
          "statuses",
          "Conditions",
          `${statuses.length} Condition${statuses.length === 1 ? "" : "s"}`,
          statuses.length > 0 ? statuses[0].title : "Clear Grid",
          <AlertTriangle className="w-3 h-3 text-amber-400" />,
          statuses.length > 0 ? "text-amber-300" : "text-slate-400"
        )}

        {renderSnapshotCard(
          "tacticalDefense",
          "Tactical Grid",
          invulnerabilityRounds > 0 ? `${invulnerabilityRounds} Rnds Invuln` : hasFeedbackShield ? "Feedback Ready" : "Standard",
          "Defense Hardware",
          <Zap className="w-3 h-3 text-purple-400" />,
          invulnerabilityRounds > 0 ? "text-purple-300 animate-pulse" : "text-purple-300"
        )}

        {renderSnapshotCard(
          "mods",
          "Hardware",
          `${defenseMods.length} Mods`,
          "Defense Hardware",
          <Cpu className="w-3 h-3 text-purple-400" />,
          "text-purple-300"
        )}

        {renderSnapshotCard(
          "ship_stats",
          "Ship Stats",
          `AC ${dynamicAC}`,
          "Armor Class",
          <Activity className="w-3 h-3 text-cyan-neon" />,
          "text-cyan-neon"
        )}
      </section>

      {/* 5. EXPANDABLE DYNAMIC WORKSPACE GRID (RESPONSIVE 2-COLUMN) */}
      {openCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 border border-dashed border-bridge-border/60 rounded bg-black/40 text-center text-xs text-muted-foreground my-2">
          <Shield className="w-8 h-8 text-cyan-neon/30 mb-2 animate-pulse" />
          <p className="uppercase tracking-widest text-slate-300 font-bold">ALL DEFENSE CONSOLE PANELS COLLAPSED</p>
          <p className="text-[10px] mt-1 text-slate-500">Tap any status card above or choose an operational preset.</p>
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
                      {cardId === "shields" && "Energy Shields & Regeneration Systems"}
                      {cardId === "hull" && "Hull Integrity & Destruction Saves"}
                      {cardId === "armor" && "Armor Class & Damage Reduction"}
                      {cardId === "systemDamage" && "System Damage & Blackout Progression"}
                      {cardId === "statuses" && "Active Conditions & Status Modifiers"}
                      {cardId === "tacticalDefense" && "Active Tactical Defense Modules"}
                      {cardId === "powerDice" && "Defense Power Coupling Matrix"}
                      {cardId === "mods" && "Installed Defense Hardware"}
                      {cardId === "ship_stats" && "Ship Ability Scores & Statistics"}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setMaximizedCard((prev) => (prev === cardId ? null : cardId))}
                      className="p-1 rounded text-slate-400 hover:text-cyan-neon hover:bg-black/40 cursor-pointer"
                      title={isMax ? "Restore Multi-Window" : "Maximize to Full-Width"}
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

                {/* 1. SHIELDS WORKSPACE */}
                {cardId === "shields" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground uppercase text-[10px]">
                        Emitter Type: <strong className="text-cyan-neon">{currentShieldType}</strong>
                      </span>
                      <span className={`text-xs font-mono font-bold ${totalEffectivePercent === 0 ? "text-red-400" : shipShields.temp > 0 ? "text-white" : regularPercent <= 60 ? "text-amber-300" : "text-cyan-neon"}`}>
                        {shipShields.current} / {isLevel4Damage ? `${effectiveMaxShields} (Base ${fullMaxShields})` : fullMaxShields} SP {shipShields.temp > 0 && <span className="text-white font-extrabold">(+{shipShields.temp} Temp)</span>}
                      </span>
                    </div>

                    {/* Shield Gauge Bar */}
                    <div className="space-y-1">
                      <div className="relative h-2.5 w-full bg-slate-950 rounded-sm overflow-hidden border border-bridge-border/40 flex">
                        <div
                          className={`h-full transition-all duration-300 ${getBarColor(totalEffectivePercent)}`}
                          style={{ width: `${regularPercent}%` }}
                        />
                        {shipShields.temp > 0 && (
                          <div
                            className="h-full transition-all duration-300"
                            style={{ 
                              width: `${tempPercent}%`,
                              backgroundColor: "#ffffff",
                              boxShadow: "0 0 10px #ffffff, 0 0 4px #00ffff",
                              borderLeft: "2px solid #00ffff"
                            }}
                          />
                        )}
                        {isLevel4Damage && (
                          <div
                            className="absolute right-0 top-0 bottom-0 pointer-events-none"
                            style={{
                              width: "50%",
                              background: "repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.4), rgba(239, 68, 68, 0.4) 4px, rgba(0, 0, 0, 0.8) 4px, rgba(0, 0, 0, 0.8) 8px)",
                              borderLeft: "2px solid #ef4444"
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Shield Steppers */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAdjustTotalShields(-5)}
                        className="flex-1 rounded border border-red-500/40 bg-red-500/10 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/20 font-mono cursor-pointer"
                      >
                        -5 SP
                      </button>
                      <button
                        onClick={() => handleAdjustTotalShields(-1)}
                        className="flex-1 rounded border border-red-500/40 bg-red-500/10 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/20 font-mono cursor-pointer"
                      >
                        -1 SP
                      </button>
                      <button
                        onClick={() => handleAdjustTotalShields(1)}
                        className="flex-1 rounded border border-cyan-neon/40 bg-cyan-neon/10 py-1 text-[10px] font-bold text-cyan-neon hover:bg-cyan-neon/20 font-mono cursor-pointer"
                      >
                        +1 SP
                      </button>
                      <button
                        onClick={() => handleAdjustTotalShields(5)}
                        className="flex-1 rounded border border-cyan-neon/40 bg-cyan-neon/10 py-1 text-[10px] font-bold text-cyan-neon hover:bg-cyan-neon/20 font-mono cursor-pointer"
                      >
                        +5 SP
                      </button>
                    </div>

                    {/* Temp Shield Buttons */}
                    <div className="flex items-center justify-between bg-black/40 px-3 py-1.5 rounded border border-bridge-border/40 text-xs font-mono">
                      <span className="text-[10px] text-white uppercase font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#00ffff]" />
                        Temp SP: {shipShields.temp}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            const newTemp = Math.max(0, shipShields.temp - 5)
                            setShipShields(prev => ({ ...prev, temp: newTemp }))
                            onShieldChange?.(shipShields.current, shipShields.max, newTemp)
                          }}
                          className="px-2 py-0.5 text-[9px] bg-slate-800 hover:bg-slate-700 rounded text-slate-200 cursor-pointer"
                        >
                          -5
                        </button>
                        <button
                          onClick={() => {
                            const newTemp = Math.max(0, shipShields.temp - 1)
                            setShipShields(prev => ({ ...prev, temp: newTemp }))
                            onShieldChange?.(shipShields.current, shipShields.max, newTemp)
                          }}
                          className="px-2 py-0.5 text-[9px] bg-slate-800 hover:bg-slate-700 rounded text-slate-200 cursor-pointer"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => {
                            const newTemp = shipShields.temp + 1
                            setShipShields(prev => ({ ...prev, temp: newTemp }))
                            onShieldChange?.(shipShields.current, shipShields.max, newTemp)
                          }}
                          className="px-2 py-0.5 text-[9px] bg-cyan-950 hover:bg-cyan-900 border border-cyan-200/40 rounded text-white font-bold cursor-pointer"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => {
                            const newTemp = shipShields.temp + 5
                            setShipShields(prev => ({ ...prev, temp: newTemp }))
                            onShieldChange?.(shipShields.current, shipShields.max, newTemp)
                          }}
                          className="px-2 py-0.5 text-[9px] bg-cyan-950 hover:bg-cyan-900 border border-cyan-200/40 rounded text-white font-bold cursor-pointer"
                        >
                          +5
                        </button>
                      </div>
                    </div>

                    {/* REGENERATE SHIELDS ACTION */}
                    <div className="bg-cyan-950/20 p-2.5 rounded border border-cyan-neon/40 space-y-2">
                      <div className="flex justify-between items-center border-b border-cyan-neon/30 pb-1">
                        <span className="text-[10px] font-mono font-bold text-cyan-neon uppercase">
                          ⚡ Regenerate Shields (Action)
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-muted-foreground">DC: <strong className="text-cyan-neon">{targetDC}</strong></span>
                          {hasRegeneratedThisTurn && (
                            <button
                              onClick={handleResetRegenTurn}
                              className="text-[8px] font-mono text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/30 cursor-pointer"
                            >
                              Reset Turn
                            </button>
                          )}
                        </div>
                      </div>

                      {hasRegeneratedThisTurn ? (
                        <div className="bg-black/60 p-1.5 rounded border border-bridge-border/40 text-[9px] font-mono text-amber-300 text-center">
                          {regenLog}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleExecuteShieldRegeneration(false)}
                              className="rounded border border-cyan-neon/60 bg-cyan-neon/20 py-1 text-[10px] font-bold text-cyan-neon hover:bg-cyan-neon/30 uppercase font-mono cursor-pointer"
                            >
                              🎲 Auto Roll
                            </button>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                placeholder={`Manual ${shipShields.sdType}`}
                                value={manualRollInput}
                                onChange={(e) => setManualRollInput(e.target.value)}
                                className="w-full bg-black border border-bridge-border text-[9px] font-mono text-slate-200 rounded px-1.5 py-0.5 text-center"
                              />
                              <button
                                onClick={() => {
                                  const val = parseInt(manualRollInput, 10)
                                  if (!isNaN(val)) handleExecuteShieldRegeneration(true, val)
                                }}
                                className="px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-[9px] font-bold text-emerald-400 hover:bg-emerald-500/20 uppercase font-mono cursor-pointer"
                              >
                                Set
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. HULL WORKSPACE */}
                {cardId === "hull" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground uppercase text-[10px]">
                        Frame: <strong className="text-emerald-400">{shipConfig?.size || "Medium"}</strong>
                      </span>
                      <span className={`text-xs font-mono font-bold ${hullPercent === 0 ? "text-red-500" : hullPercent <= 60 ? "text-amber-400" : "text-emerald-400"}`}>
                        {hull.current} / {isLevel4Damage ? `${effectiveMaxHull} (Base ${fullMaxHull})` : fullMaxHull} HP
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="relative h-2.5 w-full bg-slate-950 rounded-sm overflow-hidden border border-bridge-border/40 flex">
                        <div
                          className={`h-full transition-all duration-300 ${getHullBarColor(hullPercent)}`}
                          style={{ width: `${hullPercent}%` }}
                        />
                        {isLevel4Damage && (
                          <div
                            className="absolute right-0 top-0 bottom-0 pointer-events-none"
                            style={{
                              width: "50%",
                              background: "repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.4), rgba(239, 68, 68, 0.4) 4px, rgba(0, 0, 0, 0.8) 4px, rgba(0, 0, 0, 0.8) 8px)",
                              borderLeft: "2px solid #ef4444"
                            }}
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAdjustHull(-5)}
                        className="flex-1 rounded border border-red-500/40 bg-red-500/10 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/20 font-mono cursor-pointer"
                      >
                        -5 HP
                      </button>
                      <button
                        onClick={() => handleAdjustHull(-1)}
                        className="flex-1 rounded border border-red-500/40 bg-red-500/10 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/20 font-mono cursor-pointer"
                      >
                        -1 HP
                      </button>
                      <button
                        onClick={() => handleAdjustHull(1)}
                        className="flex-1 rounded border border-emerald-500/40 bg-emerald-500/10 py-1 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20 font-mono cursor-pointer"
                      >
                        +1 HP
                      </button>
                      <button
                        onClick={() => handleAdjustHull(5)}
                        className="flex-1 rounded border border-emerald-500/40 bg-emerald-500/10 py-1 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20 font-mono cursor-pointer"
                      >
                        +5 HP
                      </button>
                    </div>

                    {/* DESTRUCTION SAVES BLOCK */}
                    {hull.current === 0 && (
                      <div className="bg-red-950/40 border-2 border-red-500/70 p-3 rounded space-y-2 animate-pulse">
                        <div className="flex justify-between items-center border-b border-red-500/30 pb-1">
                          <span className="text-[10px] font-bold text-red-400 uppercase font-mono">
                            Destruction Saves (0 HP)
                          </span>
                          <button
                            onClick={handleResetDestructionSaves}
                            className="text-[8px] font-mono text-slate-400 hover:text-slate-200 bg-black/40 px-1.5 py-0.2 rounded border border-bridge-border cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>

                        {hasHoldTogether && (
                          <div className="text-[9px] font-mono text-emerald-300">
                            ★ Hold Together Active: Make save instead of auto-failing on damage!
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px]">
                          <span>Successes: {destructionSaves.successes}/3</span>
                          <span>Failures: {destructionSaves.failures}</span>
                        </div>

                        <button
                          onClick={handleRollDestructionSave}
                          disabled={destructionSaves.isStable}
                          className="w-full rounded border border-red-500/60 bg-red-500/20 py-1.5 text-[9px] font-bold text-red-300 hover:bg-red-500/30 disabled:opacity-30 uppercase font-mono cursor-pointer"
                        >
                          🎲 Roll Destruction Save (10+)
                        </button>

                        {destructionSaves.lastRoll !== null && (
                          <div className="text-[9px] text-center text-slate-200 font-mono">
                            {destructionSaves.lastResultText}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. ARMOR & DR WORKSPACE */}
                {cardId === "armor" && (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-black/60 p-2.5 rounded border border-cyan-neon/40 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-cyan-neon/20 border border-cyan-neon flex items-center justify-center font-bold text-cyan-neon">
                          {dynamicAC}
                        </div>
                        <div>
                          <span className="font-bold text-slate-100 block">Armor Class</span>
                          <span className="text-[9px] text-muted-foreground">{dexLimitLabel}</span>
                        </div>
                      </div>

                      <div className="bg-black/60 p-2.5 rounded border border-cyan-neon/40 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-cyan-neon/20 border border-cyan-neon flex items-center justify-center font-bold text-cyan-neon">
                          {damageReduction}
                        </div>
                        <div>
                          <span className="font-bold text-slate-100 block">Damage Reduction</span>
                          <span className="text-[9px] text-muted-foreground">Threshold</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[9px] font-mono text-cyan-300 space-y-1 bg-black/40 p-2 rounded border border-bridge-border/40">
                      <p>• Base 10 + {appliedDexMod >= 0 ? `+${appliedDexMod}` : appliedDexMod} (Dex) + {tierACBonus} (Tier {shipTier}) {hasGravityWarpMishap ? "- 2 (Gravity Warp)" : ""} = <strong>{dynamicAC} AC</strong></p>
                      {hasGravityWarpMishap && (
                        <p className="text-red-400 font-bold">• ⚠️ Structural gravity warp active (-2 AC). Refit required to clear.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. SYSTEM DAMAGE WORKSPACE */}
                {cardId === "systemDamage" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center border-b border-bridge-border/40 pb-1.5">
                      <div>
                        <span className="text-xs font-bold text-white block">{currentDamageDefinition.title}</span>
                        <span className="text-[9px] text-muted-foreground">System Damage Level</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onUpdateSystemDamageLevel?.((prev) => Math.max(0, (Number(prev) || 0) - 1))}
                          disabled={numericSystemDamageLevel <= 0}
                          className="w-7 h-7 rounded bg-black/60 border border-bridge-border text-xs font-bold font-mono text-slate-200 hover:text-cyan-neon disabled:opacity-30 cursor-pointer"
                        >
                          -1
                        </button>
                        <span className="w-8 text-center font-bold text-sm text-cyan-neon font-mono">
                          {numericSystemDamageLevel}
                        </span>
                        <button
                          onClick={() => onUpdateSystemDamageLevel?.((prev) => Math.min(6, (Number(prev) || 0) + 1))}
                          disabled={numericSystemDamageLevel >= 6}
                          className="w-7 h-7 rounded bg-black/60 border border-bridge-border text-xs font-bold font-mono text-slate-200 hover:text-red-400 disabled:opacity-30 cursor-pointer"
                        >
                          +1
                        </button>
                      </div>
                    </div>

                    <div className="p-2 rounded bg-black/40 border border-bridge-border/40 text-[10px] text-slate-300 leading-relaxed">
                      {currentDamageDefinition.effect}
                    </div>

                    <div className="grid grid-cols-6 gap-1">
                      {[1, 2, 3, 4, 5, 6].map((lvl) => (
                        <span
                          key={lvl}
                          onClick={() => onUpdateSystemDamageLevel?.(lvl === numericSystemDamageLevel ? lvl - 1 : lvl)}
                          className={`h-2 rounded-xs cursor-pointer transition-all ${
                            lvl <= numericSystemDamageLevel
                              ? lvl <= 2 ? "bg-amber-400" : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]"
                              : "bg-slate-900 border border-bridge-border/40"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. STATUSES WORKSPACE */}
                {cardId === "statuses" && (
                  <div className="flex flex-col gap-3">
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {statuses.length > 0 ? (
                        statuses.map((st) => (
                          <div key={st.id} className="flex items-center justify-between bg-black/50 p-2 rounded border border-bridge-border/60 text-xs">
                            <div>
                              <span className="font-bold text-amber-300 uppercase block">{st.title}</span>
                              <span className="text-[9px] text-slate-400 block">{st.duration}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveStatusLocal(st.id)}
                              className="px-2 py-0.5 rounded border border-red-500/40 bg-red-500/10 text-[9px] text-red-400 hover:bg-red-500/20 cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground py-2 text-center">No active conditions.</p>
                      )}
                    </div>

                    {/* Apply Status Widget */}
                    <div className="p-2 bg-black/40 rounded border border-bridge-border/60 flex flex-col gap-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <select
                          value={selectedStatusId}
                          onChange={(e) => setSelectedStatusId(e.target.value)}
                          className="bg-black border border-bridge-border text-[9px] text-slate-200 rounded px-1.5 py-1 uppercase"
                        >
                          {SHIP_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.title}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={customDuration}
                          onChange={(e) => setCustomDuration(e.target.value)}
                          placeholder="Duration"
                          className="bg-black border border-bridge-border text-[9px] text-slate-200 rounded px-1.5 py-1"
                        />
                      </div>
                      <button
                        onClick={handleAddStatusLocal}
                        className="w-full py-1 rounded border border-cyan-neon/40 bg-cyan-neon/10 text-[9px] font-bold text-cyan-neon hover:bg-cyan-neon/20 uppercase cursor-pointer"
                      >
                        + Apply Condition
                      </button>
                    </div>
                  </div>
                )}

                {/* 6. TACTICAL DEFENSE WORKSPACE */}
                {cardId === "tacticalDefense" && (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {hasFeedbackShield && (
                        <div className="p-2.5 rounded border border-bridge-border bg-black/40 flex flex-col justify-between gap-1.5">
                          <span className="font-bold text-cyan-neon uppercase">Feedback Shield</span>
                          <p className="text-[9px] text-muted-foreground leading-relaxed">
                            Reaction: Retaliate with {feedbackDie} damage matching attack type.
                          </p>
                          <button
                            onClick={handleTriggerFeedbackShield}
                            className="w-full py-1 rounded border border-cyan-neon bg-cyan-neon/20 hover:bg-cyan-neon/30 text-cyan-neon text-[9px] font-bold uppercase cursor-pointer"
                          >
                            ⚡ Retaliate ({feedbackDie})
                          </button>
                          {feedbackRollLog && (
                            <span className="text-[8px] text-amber-300 font-mono">{feedbackRollLog}</span>
                          )}
                        </div>
                      )}

                      {hasInvulnerabilityDrive && (
                        <div className="p-2.5 rounded border border-purple-500/40 bg-black/40 flex flex-col justify-between gap-1.5">
                          <span className="font-bold text-purple-300 uppercase">Invulnerability Drive</span>
                          <p className="text-[9px] text-muted-foreground leading-relaxed">
                            Damage immunity for 1d4 rounds. Halves flight speed, doubles turn speed.
                          </p>
                          {invulnerabilityRounds > 0 ? (
                            <button
                              onClick={handleEndInvulnerabilityDrive}
                              className="w-full py-1 rounded border border-red-500 bg-red-500/20 text-red-300 text-[9px] font-bold uppercase cursor-pointer"
                            >
                              End Immunity &amp; Save
                            </button>
                          ) : (
                            <button
                              disabled={invulnerabilityUsed}
                              onClick={handleActivateInvulnerabilityDrive}
                              className="w-full py-1 rounded border border-purple-500 bg-purple-500/20 text-purple-300 text-[9px] font-bold uppercase cursor-pointer disabled:opacity-40"
                            >
                              {invulnerabilityUsed ? "Expended" : "Engage Immunity"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 7. POWER MATRIX WORKSPACE */}
                {cardId === "powerDice" && (
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

                {/* 8. HARDWARE MODS WORKSPACE */}
                {cardId === "mods" && (
                  <div className="flex flex-col gap-2">
                    <StationModifications 
                      station="Defense" 
                      installedMods={installedMods} 
                      onRemoveMod={onRemoveMod} 
                    />
                  </div>
                )}

                {/* 9. SHIP ABILITY SCORES & STATISTICS WORKSPACE */}
                {cardId === "ship_stats" && (
                  <div className="flex flex-col gap-3">
                    <ShipStats 
                      shipConfig={shipConfig} 
                      systemDamageLevel={numericSystemDamageLevel} 
                      statuses={statuses}
                    />
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
                disabled={versatileTransportUsed >= versatileMaxUses}
                onClick={() => {
                  onUpdateVersatileTransportUsed?.((prev) => Math.min(versatileMaxUses, (Number(prev) || 0) + 1))
                }}
                className={`p-2 rounded border text-left transition cursor-pointer ${
                  versatileTransportUsed >= versatileMaxUses
                    ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-black/40 border-cyan-400/50 text-cyan-300 hover:bg-cyan-950/40"
                }`}
              >
                <div className="flex justify-between text-[10px] font-bold">
                  <span>Versatile Transport</span>
                  <span>{versatileMaxUses - versatileTransportUsed}/{versatileMaxUses}</span>
                </div>
                <span className="text-[8px] text-slate-400 block mt-0.5">Reaction: Grant Advantage</span>
              </button>
            )}

            {isMedium && hasBestShip && (
              <button
                type="button"
                disabled={bestShipInVerseUsed}
                onClick={() => onUpdateBestShipInVerseUsed?.(true)}
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
    </div>
  )
}