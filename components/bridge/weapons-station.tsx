"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Crosshair,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Dices,
  Ban,
  PackagePlus,
  ArrowDownToLine,
  Undo2,
  Compass,
  Eye,
  Users,
  UserMinus,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Sparkles,
  Flame,
  X,
  Maximize2,
  Minimize2,
  Layers,
  Bookmark,
  Volume2,
  VolumeX,
  Activity,
  Zap,
  Gauge,
  Cpu
} from "lucide-react"
import { ShipStats } from "./ship-stats"
import { CombatResources } from "./combat-resources"
import { StationModifications, Modification } from "./ship-modifications"
import { type ShipConfig } from "./ship-setup"
import { STARSHIP_AMMUNITION, STARSHIP_WEAPONS } from "@/lib/starship-weapons"
import type { ActiveStatus } from "./defense-station"
import type { ManifestMember, ShipCompartmentId } from "./bridge-dashboard"
import { getCrewRole } from "./bridge-dashboard"
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

export type WeaponsCardId =
  | "masterArm"
  | "powerDice"
  | "batteries"
  | "ordnance"
  | "stances"
  | "chassisSurges"
  | "mods"
  | "telemetry"

interface CustomPreset {
  id: string
  name: string
  activeCards: WeaponsCardId[]
}

const DEFAULT_PRESETS: CustomPreset[] = [
  { id: "gunnery", name: "Battery Gunnery", activeCards: ["masterArm", "batteries", "powerDice"] },
  { id: "ordnance", name: "Ordnance & Silos", activeCards: ["batteries", "ordnance", "powerDice"] },
  { id: "combat", name: "Combat Stations", activeCards: ["masterArm", "batteries", "stances", "chassisSurges"] },
  { id: "all", name: "All Weapons Systems", activeCards: ["masterArm", "powerDice", "batteries", "ordnance", "stances", "chassisSurges", "mods", "telemetry"] }
]

type LauncherFamily = "Missile launcher" | "Cluster pod" | "Torpedo launcher" | "Quaternary Ammunition"

export interface OrdnanceItem {
  id: string
  name: string
  category: LauncherFamily
  currentReserve: number
  costPerUnit: number
  damage: string
  damageType: string
  requisitionQty: number
}

interface LauncherLoadState {
  ordnanceId: string | null
  ordnanceName: string | null
  loadedCount: number
  maxCapacity: number
  damage: string | null
  damageType: string | null
}

interface WeaponsStationProps {
  availablePowerDice?: number
  maxPowerDice?: number
  powerDieType?: string
  onConsumePowerDice?: (amount: number) => boolean
  shipConfig?: ShipConfig
  installedMods?: Modification[]
  onRemoveMod?: (instanceId: string) => void
  onUpdateMod?: (instanceId: string, updates: Partial<Modification>) => void
  stationPools?: Record<string, number>
  onUpdateStationPools?: React.Dispatch<React.SetStateAction<Record<string, number>>>
  sharedPoolDice?: number
  onUpdateSharedPool?: React.Dispatch<React.SetStateAction<number>>
  standingByUsed?: boolean
  onUseStandingBy?: () => void
  leafOnTheWindUsed?: boolean
  onUseLeafOnTheWind?: () => void
  versatileTransportUsed?: number
  onUpdateVersatileTransportUsed?: (count: number | ((prev: number) => number)) => void
  bestShipInVerseUsed?: boolean
  onUpdateBestShipInVerseUsed?: (used: boolean | ((prev: boolean) => boolean)) => void
  ordnanceList?: OrdnanceItem[]
  onUpdateOrdnanceList?: React.Dispatch<React.SetStateAction<OrdnanceItem[]>>
  sFoilsMode?: "locked" | "unlocked"
  systemDamageLevel?: number
  shipStatuses?: ActiveStatus[]
  manifest?: ManifestMember[]
  onAssignCrew?: (memberId: string, targetLocation: ShipCompartmentId) => void
  onToggleTurn?: (memberId: string) => void
  isWeaponsBoosted?: boolean
  onConsumeWeaponBoost?: () => void
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

export function WeaponsStation({
  availablePowerDice = 4,
  maxPowerDice = 4,
  powerDieType,
  onConsumePowerDice = () => false,
  shipConfig,
  installedMods = [],
  onRemoveMod,
  onUpdateMod,
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
  standingByUsed = false,
  onUseStandingBy,
  leafOnTheWindUsed = false,
  onUseLeafOnTheWind,
  versatileTransportUsed = 0,
  onUpdateVersatileTransportUsed,
  bestShipInVerseUsed = false,
  onUpdateBestShipInVerseUsed,
  ordnanceList: externalOrdnanceList,
  onUpdateOrdnanceList,
  sFoilsMode = "unlocked",
  systemDamageLevel = 0,
  shipStatuses = [],
  manifest = [],
  onAssignCrew,
  onToggleTurn,
  isWeaponsBoosted = false,
  onConsumeWeaponBoost,
}: WeaponsStationProps) {
  // --- MFD MODULAR DECK STATE (PER-CLIENT PERSISTENCE) ---
  const [openCards, setOpenCards] = useState<WeaponsCardId[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sw5e_weapons_open_cards")
        if (saved) return JSON.parse(saved)
      } catch {}
    }
    return ["batteries", "powerDice"]
  })

  const [maximizedCard, setMaximizedCard] = useState<WeaponsCardId | null>(null)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sw5e_weapons_open_cards", JSON.stringify(openCards))
      } catch {}
    }
  }, [openCards])

  const toggleCard = (id: WeaponsCardId) => {
    if (soundEnabled) {
      playFlatGlassClick()
      triggerTactilePulse("tap")
    }
    setOpenCards((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const applyPreset = (cards: WeaponsCardId[]) => {
    if (soundEnabled) {
      playSubtleEngage()
      triggerTactilePulse("heavy")
    }
    setOpenCards(cards)
    setMaximizedCard(null)
  }

  const handleSaveCustomPreset = () => {
    const name = window.prompt("Enter name for this custom weapons layout:", "Custom Weapons Setup")
    if (!name) return
    if (typeof window !== "undefined") {
      try {
        const key = `sw5e_weapons_preset_${Date.now()}`
        localStorage.setItem(key, JSON.stringify({ id: key, name, activeCards: openCards }))
        alert(`Preset '${name}' saved to this device!`)
      } catch {}
    }
  }

  const [isArmed, setIsArmed] = useState<boolean>(false)

  const assignedConsoleCrew = useMemo(() => {
    return manifest
      .filter((m) => m.location === "weapons" && !m.isPassenger)
      .sort((a, b) => a.assignedOrder - b.assignedOrder)
  }, [manifest])

  const availablePersonnel = useMemo(() => {
    return manifest.filter((m) => !m.isPassenger)
  }, [manifest])

  const hasSFoils = installedMods.some((m) => m.name.toUpperCase().trim() === "S-FOILS")

  const powerCoupling = shipConfig?.powerCoupling ?? shipConfig?.couplingType ?? "Direct Power Coupling"
  const isDistributed = powerCoupling.toLowerCase().includes("distributed")
  const isHubAndSpoke = powerCoupling.toLowerCase().includes("hub") || powerCoupling.toLowerCase().includes("spoke")
  const isDirect = !isDistributed && !isHubAndSpoke

  const currentStationDice = stationPools["weapons"] ?? 0
  const effectiveMax = isDirect ? maxPowerDice : (isDistributed ? 2 : 1)
  const rawAvailable = isDirect ? availablePowerDice : currentStationDice
  const effectiveAvailable = Math.min(rawAvailable, effectiveMax)

  // --- STRICT CHASSIS & TIER IDENTIFICATION ---
  const shipSize = (shipConfig?.size || "medium").toLowerCase()
  const isSmall = shipSize === "small"
  const isMedium = shipSize === "medium"
  const shipTier = typeof shipConfig?.tier === "number" ? shipConfig.tier : 0

  // Small Ship Progression
  const hasStandingBy = isSmall && shipTier >= 4
  const hasLeafOnTheWind = isSmall && shipTier >= 5

  // Medium Ship Progression
  const hasVersatileTransport = isMedium && shipTier >= 3
  const versatileMaxUses = 2 * shipTier
  const hasBestShip = isMedium && shipTier >= 5

  const hasAnyChassisSurge = hasStandingBy || hasLeafOnTheWind || hasVersatileTransport || hasBestShip

  const specialization = shipConfig?.roleSpecialization
  const mastery = shipConfig?.roleMastery
  
  const isAttackFighter = specialization === "Attack Fighter"
  const isBomber = specialization === "Bomber"
  const isGunshipSpec = specialization === "Gunship"
  const isMissileBoatSpec = specialization === "Missile Boat"
  
  const hasBomberRoleMastery = mastery === "Bomber"
  const isGunshipMastery = mastery === "Gunship"
  const isMissileBoatMastery = mastery === "Missile Boat"

  const rawWis = shipConfig?.stats?.wisdom ?? 10
  const wisBoost = shipConfig?.tierStatBoosts?.wisdom ?? 0
  const wisMod = Math.floor((rawWis + wisBoost - 10) / 2)

  const rawStr = shipConfig?.stats?.strength ?? 10
  const strBoost = shipConfig?.tierStatBoosts?.strength ?? 0
  const strMod = Math.floor((rawStr + strBoost - 10) / 2)

  const rawCon = shipConfig?.stats?.constitution ?? 10
  const conBoost = shipConfig?.tierStatBoosts?.constitution ?? 0
  const conScore = rawCon + conBoost

  const proficiencyBonus = shipConfig?.proficiencyBonus ?? 2

  const isBlinded = shipStatuses.some((s) => s.title.toLowerCase().includes("blinded"))
  const isIonized = shipStatuses.some((s) => s.title.toLowerCase().includes("ionized"))
  const isInvisible = shipStatuses.some((s) => s.title.toLowerCase().includes("invisible"))
  const hasSystemDamageAtkDisadv = systemDamageLevel >= 3

  const handleCustomConsume = (amount: number = 1) => {
    if (isDirect) {
      return onConsumePowerDice(amount)
    }

    if (currentStationDice >= amount) {
      if (onUpdateStationPools) {
        onUpdateStationPools((prev) => ({
          ...prev,
          weapons: Math.max(0, (prev["weapons"] ?? 0) - amount),
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

  const mountedWeapons = installedMods.filter(
    (m) => m.category === "Weapon System" && m.name !== "Fixed Hardpoint" && m.name !== "Turret Hardpoint"
  )

  const [launcherStates, setLauncherStates] = useState<Record<string, LauncherLoadState>>({})

  const [localOrdnanceList, setLocalOrdnanceList] = useState<OrdnanceItem[]>(() =>
    STARSHIP_AMMUNITION.map((ammo) => ({
      id: ammo.id,
      name: ammo.name,
      category: ammo.launcherFamily,
      currentReserve: 0,
      costPerUnit: ammo.cost,
      damage: ammo.standardDamage,
      damageType: ammo.damageType,
      requisitionQty: 0,
    }))
  )

  const ordnanceList = externalOrdnanceList ?? localOrdnanceList
  const setOrdnanceList = onUpdateOrdnanceList ?? setLocalOrdnanceList

  const [weaponArmModal, setWeaponArmModal] = useState<{ weapon: Modification } | null>(null)
  const [ordnanceArmModal, setOrdnanceArmModal] = useState<{ ordnance: OrdnanceItem } | null>(null)
  const [ordnanceDisarmModal, setOrdnanceDisarmModal] = useState<{ ordnance: OrdnanceItem } | null>(null)

  const isTurretMounted = (w: Modification): boolean => {
    if (w.mountedOnInstanceId) {
      const parent = installedMods.find((m) => m.instanceId === w.mountedOnInstanceId || m.id === w.mountedOnInstanceId)
      if (parent && parent.name.toLowerCase().includes("turret")) return true
    }
    const loc = (w.location || "").toLowerCase()
    return loc.includes("turret")
  }

  const getAssignedGunner = (w: Modification): ManifestMember | null => {
    const isTurret = isTurretMounted(w)
    if (!isTurret) return null
    const turretCompartmentId: ShipCompartmentId = `turret-${w.instanceId || w.id}`
    return manifest.find((m) => m.location === turretCompartmentId && !m.isPassenger) || null
  }

  const getLauncherState = (instanceKey: string, weapon: Modification): LauncherLoadState => {
    if (launcherStates[instanceKey]) return launcherStates[instanceKey]
    const catalogDef = STARSHIP_WEAPONS.find((sw) => sw.name.toLowerCase() === weapon.name.toLowerCase())
    const capacity = weapon.reload || catalogDef?.reload || 4
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

  const executeArmLauncher = (targetLauncher: Modification, ordnance: OrdnanceItem) => {
    const key = targetLauncher.instanceId || targetLauncher.id
    const state = getLauncherState(key, targetLauncher)

    if (state.ordnanceId && state.ordnanceId !== ordnance.id && state.loadedCount > 0) {
      if (isMissileBoatMastery) {
        alert("Missile Boat Mastery allows mixed munitions, but full UI integration for multi-loading is pending. Please load one ordnance type at a time for now.")
        return
      }
      alert(`Cannot mix warheads! ${targetLauncher.name} already contains ${state.ordnanceName}. Disarm it first.`)
      return
    }

    if (ordnance.currentReserve <= 0) {
      alert(`No ${ordnance.name} available in reserve!`)
      return
    }

    const needed = state.maxCapacity - state.loadedCount
    if (needed <= 0) {
      alert(`${targetLauncher.name} is already at full capacity (${state.maxCapacity}/${state.maxCapacity}).`)
      return
    }

    const transferAmount = Math.min(needed, ordnance.currentReserve)
    const newLoadedTotal = state.loadedCount + transferAmount

    setOrdnanceList((prev) =>
      prev.map((o) => (o.id === ordnance.id ? { ...o, currentReserve: o.currentReserve - transferAmount } : o))
    )

    setLauncherStates((prev) => ({
      ...prev,
      [key]: {
        ordnanceId: ordnance.id,
        ordnanceName: ordnance.name,
        loadedCount: newLoadedTotal,
        maxCapacity: state.maxCapacity,
        damage: ordnance.damage,
        damageType: ordnance.damageType,
      },
    }))

    setWeaponArmModal(null)
    setOrdnanceArmModal(null)
  }

  const handleDisarmLauncher = (instanceKey: string) => {
    const state = launcherStates[instanceKey]
    if (!state || !state.ordnanceId || state.loadedCount <= 0) return

    const ordnanceId = state.ordnanceId
    const returnCount = state.loadedCount

    setOrdnanceList((prev) =>
      prev.map((o) => (o.id === ordnanceId ? { ...o, currentReserve: o.currentReserve + returnCount } : o))
    )

    setLauncherStates((prev) => ({
      ...prev,
      [instanceKey]: {
        ordnanceId: null,
        ordnanceName: null,
        loadedCount: 0,
        maxCapacity: state.maxCapacity,
        damage: null,
        damageType: null,
      },
    }))

    setOrdnanceDisarmModal(null)
  }

  const computeAttackModDisplay = (weaponProperties: string[] = [], isPrimary: boolean = true) => {
    const isSaturate = weaponProperties.some((p) => p.toLowerCase().includes("saturate"))
    const baseMod = isSaturate ? Math.max(wisMod, strMod) : wisMod
    
    const sFoilsAtkDelta = hasSFoils && isPrimary ? (sFoilsMode === "locked" ? -2 : 1) : 0
    const boosted = baseMod + (isAttackFighter ? 1 : 0) + sFoilsAtkDelta

    const sourceBreakdowns: string[] = []
    sourceBreakdowns.push(`${baseMod >= 0 ? `+${baseMod}` : baseMod} from ${isSaturate ? "Strength/Wisdom" : "Wisdom"} Modifier`)
    if (isAttackFighter) {
      sourceBreakdowns.push("+1 from Attack Fighter Role Spec")
    }
    if (sFoilsAtkDelta !== 0) {
      sourceBreakdowns.push(`${sFoilsAtkDelta > 0 ? `+${sFoilsAtkDelta}` : sFoilsAtkDelta} from S-Foils (${sFoilsMode === "locked" ? "Closed" : "Attack"})`)
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
    if (strMod !== 0) {
      sourceBreakdown.push(`${strMod >= 0 ? `+${strMod}` : strMod} from Strength Modifier`)
    }
    if (isHeavy) {
      sourceBreakdown.push(`+${heavyBonus} from Heavy Weapon Trait`)
    }
    if (isBomber) {
      sourceBreakdown.push("+1 from Bomber Role Spec")
    }
    if (isGunshipSpec) {
      sourceBreakdown.push("+1 from Gunship Role Spec")
    }
    if (innateFlat !== 0) {
      sourceBreakdown.push(`${innateFlat >= 0 ? `+${innateFlat}` : innateFlat} weapon innate`)
    }

    const note = sourceBreakdown.length > 0 ? sourceBreakdown.join(", ") : null

    return { display, note, flatTotal: finalFlat, dicePart, sourceBreakdown }
  }

  // --- ATTACK WIZARD STATE ---
  const [activeWizardWeapon, setActiveWizardWeapon] = useState<Modification | null>(null)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1)
  const [firingMode, setFiringMode] = useState<"standard" | "rapid" | "burst">("standard")
  const [rangeBracket, setRangeBracket] = useState<"normal" | "long" | "out">("normal")
  const [togglePiercing, setTogglePiercing] = useState<boolean>(false)
  const [toggleMelt, setToggleMelt] = useState<boolean>(false)
  const [toggleDire, setToggleDire] = useState<boolean>(false)
  
  // Roller states
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
    if (!isArmed) {
      alert("Firing Circuit Locked: Weapons are currently set to SAFE. Arm weapons before opening fire controls.")
      return
    }

    if ((w as any).firedThisRound) {
      alert("Weapon Fired: Each ship weapon can only be fired once per round. It will reset when the Reactor is Cycled.")
      return
    }

    const isOrdnance = !!w.isOrdnanceLauncher
    const key = w.instanceId || w.id
    if (isOrdnance) {
      const state = getLauncherState(key, w)
      if (state.loadedCount <= 0) {
        alert(`${w.name} has no warheads loaded! Arm it with ordnance before engaging.`)
        return
      }
    }

    setActiveWizardWeapon(w)
    setWizardStep(1)
    const currentHeat = (w as any).currentHeat ?? 0
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
      setLauncherStates((prev) => {
        const state = prev[key]
        if (!state) return prev
        const newCount = Math.max(0, state.loadedCount - 1)
        return {
          ...prev,
          [key]: {
            ...state,
            loadedCount: newCount,
            ordnanceId: newCount === 0 ? null : state.ordnanceId,
            ordnanceName: newCount === 0 ? null : state.ordnanceName,
            damage: newCount === 0 ? null : state.damage,
            damageType: newCount === 0 ? null : state.damageType,
          },
        }
      })
      onUpdateMod?.(key, { firedThisRound: true } as any)
    } else {
      const currentHeat = (activeWizardWeapon as any).currentHeat ?? 0
      const catalogDef = STARSHIP_WEAPONS.find((sw) => sw.name.toLowerCase() === activeWizardWeapon.name.toLowerCase())
      const maxHeat = typeof activeWizardWeapon.overheat === "number" && activeWizardWeapon.overheat > 0
        ? activeWizardWeapon.overheat
        : catalogDef?.overheat ?? 4
      const nextHeat = Math.min(maxHeat, currentHeat + heatCost)
      onUpdateMod?.(key, { currentHeat: nextHeat, firedThisRound: true } as any)
    }
    closeWizard()
  }

  const handleRequisitionChange = (id: string, qty: number) => {
    setOrdnanceList((prev) =>
      prev.map((o) => (o.id === id ? { ...o, requisitionQty: Math.max(0, qty) } : o))
    )
  }

  const totalRequisitionCost = ordnanceList.reduce(
    (acc, item) => acc + item.requisitionQty * item.costPerUnit,
    0
  )

  // RENDER DOCKED SNAPSHOT CARD TILE
  const renderSnapshotCard = (
    id: WeaponsCardId,
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
          <span>CONSOLE</span>
          <span className={isOpen ? "text-cyan-neon font-bold" : ""}>
            {isOpen ? "ACTIVE ▲" : "STANDBY ▼"}
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
              <Crosshair className="h-5 w-5 text-cyan-neon" />
              TACTICAL WEAPONS CONTROL
            </h2>
            <button
              type="button"
              onClick={() => setIsArmed((prev) => !prev)}
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono border transition-all cursor-pointer flex items-center gap-1.5 ${
                isArmed
                  ? "bg-red-500/20 border-red-500 text-red-300 hover:bg-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse"
                  : "bg-emerald-500/20 border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/30 shadow-[0_0_8px_rgba(52,211,153,0.2)]"
              }`}
            >
              {isArmed ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  <span>DISARM (SAFE)</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ARM WEAPONS</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] tracking-[0.3em] text-muted-foreground/60 mt-0.5">
            {shipConfig?.name?.toUpperCase() || "VESSEL"} // GUNNERY &amp; FIRE DIRECTORS //{" "}
            <span className={isArmed ? "text-red-alert font-bold animate-pulse" : "text-emerald-400 font-bold"}>
              {isArmed ? "CIRCUITS HOT (ARMED)" : "CIRCUITS SAFE (DISARMED)"}
            </span>
          </p>
        </div>

        {/* Global Tactical Status Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {shipConfig?.useBrutalCriticals && (
            <span className="rounded border border-amber-500/80 bg-amber-950/60 px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider text-amber-300 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" />
              BRUTAL CRITS
            </span>
          )}

          {isWeaponsBoosted && (
            <span className="rounded border border-cyan-400/80 bg-cyan-950/60 px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider text-cyan-300 flex items-center gap-1 animate-pulse shadow-[0_0_8px_rgba(0,255,255,0.4)]">
              <Sparkles className="w-3 h-3 text-cyan-neon" />
              BOOST ACTIVE (+ADV)
            </span>
          )}

          {isBlinded && (
            <span className="rounded border border-red-500/80 bg-red-950/60 px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider text-red-300 animate-pulse">
              ⚠️ BLINDED
            </span>
          )}

          {isIonized && (
            <span className="rounded border border-red-500/80 bg-red-950/60 px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider text-red-300 animate-pulse">
              ⚠️ IONIZED
            </span>
          )}

          {hasSFoils && (
            <span
              className={`rounded border px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider ${
                sFoilsMode === "unlocked"
                  ? "border-cyan-400 bg-cyan-950/40 text-cyan-300 shadow-[0_0_8px_rgba(0,255,255,0.4)]"
                  : "border-amber-400 bg-amber-950/40 text-amber-300"
              }`}
            >
              {sFoilsMode === "unlocked" ? "S-FOILS: ATK (+1)" : "S-FOILS: CRUISE (-2)"}
            </span>
          )}

          <span className={`rounded-sm border px-2.5 py-0.5 text-[9px] font-bold tracking-wider ${
            isArmed ? "border-red-alert/80 bg-red-alert/20 text-red-alert animate-pulse" : "border-emerald-500/80 bg-emerald-950/40 text-emerald-400"
          }`}>
            WEAPONS: {isArmed ? "HOT" : "SAFE"}
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
            onClick={handleSaveCustomPreset}
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-amber-400/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 flex items-center gap-1 cursor-pointer"
            title="Save current layout to local browser"
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

      {/* 3. COMPACT CREW ROSTER HUD */}
      <div className="rounded border border-cyan-neon/40 bg-black/40 px-3 py-1.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 shadow-[0_0_12px_rgba(0,255,255,0.04)]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs font-bold text-cyan-neon uppercase tracking-wider mr-1">
            <Users className="h-3.5 w-3.5" />
            <span>Weapons Console Personnel:</span>
          </div>

          {assignedConsoleCrew.length === 0 ? (
            <span className="text-xs text-amber-300 italic px-2 py-0.5 border border-amber-500/30 bg-amber-950/20 rounded">
              Console Uncrewed — Assign Weapons Officer
            </span>
          ) : (
            assignedConsoleCrew.map((member, idx) => {
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
                    {isLead ? "Weapons Officer" : "Support"}
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
                if (e.target.value) onAssignCrew(e.target.value, "weapons")
              }}
              className="rounded bg-slate-950 border border-slate-700 px-2 py-0.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-neon cursor-pointer"
            >
              <option value="" disabled>+ Assign Weapons Crew...</option>
              {availablePersonnel
                .filter((p) => p.location !== "weapons")
                .map((p) => (
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
          "masterArm",
          "Weapon Safety",
          isArmed ? "WEAPONS HOT" : "WEAPONS SAFE",
          isArmed ? "Firing Circuits Live" : "Interlocks Engaged",
          isArmed ? <ShieldAlert className="w-3 h-3 text-red-alert" /> : <ShieldCheck className="w-3 h-3 text-emerald-400" />,
          isArmed ? "text-red-alert animate-pulse" : "text-emerald-400"
        )}

        {renderSnapshotCard(
          "powerDice",
          "Weapons Power",
          isDistributed ? `${currentStationDice}/2 Dice` : `${effectiveAvailable}/${effectiveMax} Dice`,
          isHubAndSpoke ? `${sharedPoolDice}/2 Shared` : powerCoupling.replace(" Power Coupling", ""),
          <Zap className="w-3 h-3 text-amber-400" />,
          "text-amber-300"
        )}

        {renderSnapshotCard(
          "batteries",
          "Active Batteries",
          `${mountedWeapons.length} Mounted`,
          `${mountedWeapons.filter((w) => isTurretMounted(w)).length} Turrets`,
          <Crosshair className="w-3 h-3 text-cyan-neon" />,
          "text-cyan-neon"
        )}

        {renderSnapshotCard(
          "ordnance",
          "Ordnance Silos",
          `${ordnanceList.reduce((acc, o) => acc + o.currentReserve, 0)} In Reserve`,
          totalRequisitionCost > 0 ? `${totalRequisitionCost.toLocaleString()} cr Req` : "Magazines Stocked",
          <PackagePlus className="w-3 h-3 text-amber-400" />,
          "text-amber-300"
        )}

        {renderSnapshotCard(
          "stances",
          "Targeting Stance",
          hasSFoils ? (sFoilsMode === "unlocked" ? "S-Foils: Attack" : "S-Foils: Cruise") : "Standard Aim",
          isAttackFighter ? "+1 Role Bonus" : hasSFoils ? (sFoilsMode === "unlocked" ? "+1 Hit" : "-2 Hit") : "Nominal",
          <Compass className="w-3 h-3 text-cyan-neon" />,
          sFoilsMode === "unlocked" ? "text-cyan-neon" : "text-amber-300"
        )}

        {renderSnapshotCard(
          "chassisSurges",
          "Tactical Surges",
          !hasAnyChassisSurge
            ? `Locked (Tier ${shipTier})`
            : isSmall
            ? (standingByUsed ? "Used (Recharge)" : "Surges Ready")
            : isMedium
            ? `${versatileMaxUses - versatileTransportUsed} Uses (Refit)`
            : "Chassis Surges",
          !hasAnyChassisSurge
            ? `${shipSize.toUpperCase()} Chassis`
            : isSmall
            ? (leafOnTheWindUsed ? "Nat 20 Expended" : "Surges Active")
            : isMedium
            ? (bestShipInVerseUsed ? "Best Ship Active" : "Transport Ready")
            : "Nominal",
          <Sparkles className="w-3 h-3 text-purple-400" />,
          !hasAnyChassisSurge
            ? "text-slate-500"
            : (standingByUsed || leafOnTheWindUsed || bestShipInVerseUsed)
            ? "text-amber-300"
            : "text-purple-300"
        )}

        {renderSnapshotCard(
          "mods",
          "Hardware",
          `${installedMods.length} Mods`,
          "Weapons Station",
          <Cpu className="w-3 h-3 text-purple-400" />,
          "text-purple-300"
        )}

        {renderSnapshotCard(
          "telemetry",
          "Telemetry",
          `${shipConfig?.stats?.wisdom ?? 10} WIS`,
          `${shipConfig?.stats?.strength ?? 10} STR`,
          <Activity className="w-3 h-3 text-cyan-neon" />,
          "text-cyan-neon"
        )}
      </section>

      {/* 5. EXPANDABLE DYNAMIC WORKSPACE GRID (RESPONSIVE 2-COLUMN) */}
      {openCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 border border-dashed border-bridge-border/60 rounded bg-black/40 text-center text-xs text-muted-foreground my-2">
          <Crosshair className="w-8 h-8 text-cyan-neon/30 mb-2 animate-pulse" />
          <p className="uppercase tracking-widest text-slate-300 font-bold">ALL WEAPONS CONSOLE DRAWERS COLLAPSED</p>
          <p className="text-[10px] mt-1 text-slate-500">Tap any of the status cards above or choose an operational preset.</p>
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
                      {cardId === "masterArm" && "Weapon Safety & Master Arm Controls"}
                      {cardId === "powerDice" && "Weapons Power Coupling Matrix"}
                      {cardId === "batteries" && "Active Batteries & Hardpoint Controls"}
                      {cardId === "ordnance" && "Ordnance Magazine & Requisition"}
                      {cardId === "stances" && "Tactical Targeting & Firing Stances"}
                      {cardId === "chassisSurges" && "Tactical Chassis Surges & Reactions"}
                      {cardId === "mods" && "Installed Weapon Modifications"}
                      {cardId === "telemetry" && "Ship Core Telemetry & Gunnery Modifiers"}
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
                      title="Collapse Drawer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 1. MASTER ARM WORKSPACE */}
                {cardId === "masterArm" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-center justify-between p-3 rounded border border-bridge-border/60 bg-black/40 gap-3">
                      <div>
                        <span className="text-xs font-bold uppercase text-slate-200 block mb-0.5">
                          Master Circuit Interlock Status
                        </span>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Weapons cannot be fired while set to SAFE. Arm the weapons to engage firing computers, targeting reticles, and ordnance chamber tubes.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsArmed((prev) => !prev)}
                        className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider font-mono border transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                          isArmed
                            ? "bg-red-500/20 border-red-500 text-red-300 hover:bg-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse"
                            : "bg-emerald-500/20 border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/30 shadow-[0_0_8px_rgba(52,211,153,0.2)]"
                        }`}
                      >
                        {isArmed ? (
                          <>
                            <ShieldAlert className="w-4 h-4 text-red-400" />
                            <span>SET TO SAFE</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span>ARM WEAPONS HOT</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. POWER MATRIX WORKSPACE */}
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

                {/* 3. BATTERIES WORKSPACE */}
                {cardId === "batteries" && (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                      {mountedWeapons.map((w) => {
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
                        const turretCompartmentId: ShipCompartmentId = `turret-${instanceKey}`
                        const assignedGunner = getAssignedGunner(w)
                        const isManned = isTurret ? !!assignedGunner : true

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
                                : isTurret
                                ? isManned
                                  ? "border-cyan-neon/80 shadow-[0_0_15px_rgba(0,255,255,0.12)]"
                                  : "border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.08)]"
                                : "border-bridge-border/80"
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-start gap-1.5">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-bold text-cyan-neon tracking-wide truncate">
                                    {w.name}
                                  </h4>
                                  <span className="text-[7px] font-bold uppercase px-1 rounded border border-slate-700 text-slate-400 font-mono inline-block mt-0.5">
                                    {isTurret ? (isManned ? "TURRET (MANNED)" : "TURRET (UNMANNED)") : (w.damageType || "ENERGY").toUpperCase()}
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

                              {isTurret && (
                                <div className="flex flex-col gap-1 bg-slate-950/80 p-1.5 rounded border border-bridge-border/60 mb-2">
                                  <div className="flex items-center justify-between text-[9px]">
                                    <span className="text-muted-foreground uppercase">Gunner:</span>
                                    <span className={assignedGunner ? "text-cyan-300 font-bold" : "text-amber-400 italic"}>
                                      {assignedGunner ? assignedGunner.name : "Unassigned"}
                                    </span>
                                  </div>
                                  {!assignedGunner && onAssignCrew && (
                                    <select
                                      value=""
                                      onChange={(e) => {
                                        if (e.target.value) onAssignCrew(e.target.value, turretCompartmentId)
                                      }}
                                      className="w-full rounded bg-black border border-slate-700 px-1.5 py-0.5 text-[10px] text-cyan-300"
                                    >
                                      <option value="" disabled>+ Deploy Gunner...</option>
                                      {availablePersonnel
                                        .filter((p) => p.location !== turretCompartmentId)
                                        .map((p) => (
                                          <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                  )}
                                </div>
                              )}

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
                                disabled={!isArmed || isFiredThisRound || (!isOrdnance ? isOverheated : !isLauncherArmed)}
                                className={`col-span-2 rounded border py-1.5 text-[10px] font-bold tracking-wider font-mono flex items-center justify-center gap-1 transition-all ${
                                  !isArmed
                                    ? "bg-slate-900 border-slate-700 text-slate-500 cursor-not-allowed opacity-60"
                                    : isFiredThisRound
                                    ? "bg-slate-900 border-slate-700 text-slate-500 cursor-not-allowed"
                                    : (!isOrdnance ? isOverheated : !isLauncherArmed)
                                    ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-40"
                                    : "border-cyan-neon/60 bg-cyan-neon/20 text-cyan-neon hover:bg-cyan-neon/30 cursor-pointer shadow-[0_0_8px_rgba(0,255,255,0.2)]"
                                }`}
                              >
                                <Crosshair className="w-3 h-3 text-cyan-neon" />
                                <span>{isFiredThisRound ? "FIRED" : !isArmed ? "SAFE" : "ENGAGE"}</span>
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
                                  onClick={() => handleDisarmLauncher(instanceKey)}
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

                {/* 4. ORDNANCE WORKSPACE */}
                {cardId === "ordnance" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center border-b border-bridge-border/60 pb-1.5">
                      <span className="text-[10px] text-muted-foreground">Warhead Reserve &amp; Requisition Catalog</span>
                      <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                        Total Req: {totalRequisitionCost.toLocaleString()} cr
                      </span>
                    </div>

                    <div className="overflow-x-auto max-h-72 overflow-y-auto border border-bridge-border/40 rounded">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-slate-950 border-b border-bridge-border/60 text-[9px] uppercase text-muted-foreground">
                          <tr>
                            <th className="p-1.5">Ordnance</th>
                            <th className="p-1.5">Damage</th>
                            <th className="p-1.5">In Reserve</th>
                            <th className="p-1.5">Action</th>
                            <th className="p-1.5">Req Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-bridge-border/20 text-cyan-neon/90 text-[11px]">
                          {ordnanceList.map((item) => {
                            const matchingInstalled = mountedWeapons.filter((w) => getLauncherFamily(w.name) === item.category)
                            const hasMatchingLauncher = matchingInstalled.length > 0
                            const isArmedInAnyWeapon = matchingInstalled.some((w) => {
                              const key = w.instanceId || w.id
                              const state = getLauncherState(key, w)
                              return state.ordnanceId === item.id && state.loadedCount > 0
                            })

                            return (
                              <tr key={item.id} className="hover:bg-cyan-neon/5 transition-colors">
                                <td className="p-1.5 font-medium text-cyan-neon truncate max-w-[120px]">{item.name}</td>
                                <td className="p-1.5 text-amber-300 font-mono text-[10px]">{item.damage} {item.damageType}</td>
                                <td className="p-1.5 font-bold font-mono">{item.currentReserve}</td>
                                <td className="p-1.5">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setWeaponArmModal({ weapon: matchingInstalled[0] })}
                                      disabled={!hasMatchingLauncher || item.currentReserve <= 0}
                                      className={`px-1.5 py-0.5 rounded border text-[8px] font-bold uppercase transition-all flex items-center gap-0.5 ${
                                        !hasMatchingLauncher || item.currentReserve <= 0
                                          ? "bg-red-950/20 border-red-500/30 text-slate-500 cursor-not-allowed opacity-40"
                                          : "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30 cursor-pointer"
                                      }`}
                                    >
                                      <ArrowDownToLine className="w-2.5 h-2.5" /> Arm
                                    </button>
                                    {isArmedInAnyWeapon && (
                                      <button
                                        type="button"
                                        onClick={() => setOrdnanceDisarmModal({ ordnance: item })}
                                        className="px-1.5 py-0.5 rounded border border-amber-500/50 bg-amber-500/10 text-[8px] font-bold text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                                      >
                                        Unload
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.requisitionQty}
                                    onChange={(e) => handleRequisitionChange(item.id, parseInt(e.target.value) || 0)}
                                    className="w-12 rounded bg-black/60 border border-bridge-border px-1 py-0.5 text-[10px] text-cyan-neon text-center"
                                  />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 5. STANCES WORKSPACE */}
                {cardId === "stances" && (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {hasSFoils && (
                        <div className="p-3 bg-black/40 rounded border border-cyan-400/40 flex flex-col gap-1">
                          <span className="font-bold text-cyan-neon uppercase">S-Foils Operational Mode</span>
                          <span className="text-[10px] text-slate-300">
                            Current: <strong>{sFoilsMode === "unlocked" ? "Attack Position (+1 to hit)" : "Closed / Cruise (-2 to hit)"}</strong>
                          </span>
                        </div>
                      )}

                      {isAttackFighter && (
                        <div className="p-3 bg-black/40 rounded border border-cyan-400/40 flex flex-col gap-1">
                          <span className="font-bold text-cyan-300 uppercase">Attack Fighter Trait</span>
                          <span className="text-[10px] text-slate-300">Automated +1 bonus to all attack rolls and save DCs.</span>
                        </div>
                      )}

                      {isBomber && (
                        <div className="p-3 bg-black/40 rounded border border-amber-500/40 flex flex-col gap-1">
                          <span className="font-bold text-amber-300 uppercase">Bomber Trait</span>
                          <span className="text-[10px] text-slate-300">Automated +1 bonus to all weapon damage rolls.</span>
                        </div>
                      )}

                      {isGunshipSpec && (
                        <div className="p-3 bg-black/40 rounded border border-cyan-400/40 flex flex-col gap-1">
                          <span className="font-bold text-cyan-neon uppercase">Gunship Role Spec</span>
                          <span className="text-[10px] text-slate-300">Automated +1 flat bonus to all weapon damage rolls.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 6. CHASSIS SURGES WORKSPACE (GUARDED STRICTLY BY SIZE AND TIER) */}
                {cardId === "chassisSurges" && (
                  <div className="flex flex-col gap-3">
                    {!hasAnyChassisSurge ? (
                      <div className="p-4 rounded border border-dashed border-bridge-border/60 text-center text-xs text-muted-foreground font-mono">
                        No chassis surges unlocked for this {shipConfig?.size || "Medium"} hull at Tier {shipTier}.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {/* SMALL CHASSIS: Standing By (Tier 4) */}
                        {hasStandingBy && (
                          <button
                            type="button"
                            disabled={standingByUsed}
                            onClick={onUseStandingBy}
                            className={`p-2.5 rounded border text-left transition cursor-pointer ${
                              standingByUsed
                                ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                                : "bg-black/40 border-cyan-neon/50 text-cyan-neon hover:bg-cyan-950/40"
                            }`}
                          >
                            <div className="flex justify-between items-center font-bold">
                              <span>Standing By (Small Tier 4)</span>
                              <span>{standingByUsed ? "USED" : "READY"}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Surge: Take 1 Extra Action (Recharge)</span>
                          </button>
                        )}

                        {/* SMALL CHASSIS: Leaf on the Wind (Tier 5) */}
                        {hasLeafOnTheWind && (
                          <button
                            type="button"
                            disabled={leafOnTheWindUsed}
                            onClick={onUseLeafOnTheWind}
                            className={`p-2.5 rounded border text-left transition cursor-pointer ${
                              leafOnTheWindUsed
                                ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                                : "bg-black/40 border-emerald-500/50 text-emerald-400 hover:bg-emerald-950/40"
                            }`}
                          >
                            <div className="flex justify-between items-center font-bold">
                              <span>Leaf on the Wind (Small Tier 5)</span>
                              <span>{leafOnTheWindUsed ? "USED" : "READY"}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Reaction: Treat roll as Nat 20 (Recharge)</span>
                          </button>
                        )}

                        {/* MEDIUM CHASSIS: Versatile Transport (Tier 3) */}
                        {hasVersatileTransport && (
                          <button
                            type="button"
                            disabled={versatileTransportUsed >= versatileMaxUses}
                            onClick={() => {
                              onUpdateVersatileTransportUsed?.((prev) => Math.min(versatileMaxUses, (Number(prev) || 0) + 1))
                            }}
                            className={`p-2.5 rounded border text-left transition cursor-pointer ${
                              versatileTransportUsed >= versatileMaxUses
                                ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                                : "bg-black/40 border-cyan-400/50 text-cyan-300 hover:bg-cyan-950/40"
                            }`}
                          >
                            <div className="flex justify-between items-center font-bold">
                              <span>Versatile Transport (Med Tier 3)</span>
                              <span>{versatileMaxUses - versatileTransportUsed}/{versatileMaxUses}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Reaction: Trigger Advantage on check, attack, or save (Refit)</span>
                          </button>
                        )}

                        {/* MEDIUM CHASSIS: Best Ship in the 'Verse (Tier 5) */}
                        {hasBestShip && (
                          <button
                            type="button"
                            disabled={bestShipInVerseUsed}
                            onClick={() => onUpdateBestShipInVerseUsed?.(true)}
                            className={`p-2.5 rounded border text-left transition cursor-pointer ${
                              bestShipInVerseUsed
                                ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                                : "bg-black/40 border-amber-400/50 text-amber-300 hover:bg-amber-950/40"
                            }`}
                          >
                            <div className="flex justify-between items-center font-bold">
                              <span>Best Ship in 'Verse (Med Tier 5)</span>
                              <span>{bestShipInVerseUsed ? "EXP" : "READY"}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Action: Un-enhanced Damage Resistance for 1 min (Recharge)</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 7. HARDWARE MODS WORKSPACE */}
                {cardId === "mods" && (
                  <div className="flex flex-col gap-2">
                    <StationModifications 
                      station="Weapons" 
                      installedMods={installedMods} 
                      onRemoveMod={onRemoveMod} 
                    />
                  </div>
                )}

                {/* 8. CORE TELEMETRY WORKSPACE */}
                {cardId === "telemetry" && (
                  <div className="flex flex-col gap-3">
                    <ShipStats shipConfig={shipConfig} systemDamageLevel={systemDamageLevel} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL 1: ARM FROM WEAPON CARD DIRECTLY */}
      {weaponArmModal && (() => {
        const weapon = weaponArmModal.weapon
        const key = weapon.instanceId || weapon.id
        const state = getLauncherState(key, weapon)
        const family = getLauncherFamily(weapon.name)
        const availableOptions = ordnanceList.filter((o) => o.category === family && o.currentReserve > 0)

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="w-full max-w-md rounded-lg border border-cyan-neon bg-slate-950 p-5 shadow-[0_0_30px_rgba(0,255,255,0.3)] flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-bridge-border pb-2">
                <div className="flex items-center gap-2">
                  <PackagePlus className="w-4 h-4 text-cyan-neon" />
                  <h3 className="text-xs font-bold tracking-wider text-cyan-neon uppercase">
                    Arm Hardpoint // {weapon.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setWeaponArmModal(null)}
                  className="text-muted-foreground hover:text-white cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-300">
                <p>Select which warhead payload to chamber into this tube (Max: {state.maxCapacity}):</p>
                <span className="text-[10px] text-muted-foreground uppercase block mt-1">
                  Chamber Category: <strong className="text-cyan-neon">{family}</strong>
                </span>
              </div>

              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                {availableOptions.length > 0 ? (
                  availableOptions.map((ordnance) => (
                    <button
                      key={ordnance.id}
                      type="button"
                      onClick={() => executeArmLauncher(weapon, ordnance)}
                      className="p-3 rounded border border-bridge-border bg-black/60 hover:border-emerald-400 hover:bg-emerald-500/10 text-left flex justify-between items-center transition-all cursor-pointer group"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-100 group-hover:text-emerald-400 uppercase block">
                          {ordnance.name}
                        </span>
                        <span className="text-[10px] text-amber-300 block">
                          Payload: {ordnance.damage} {ordnance.damageType}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-400 block font-mono">
                          {ordnance.currentReserve} in Reserve
                        </span>
                        <span className="text-[9px] text-muted-foreground block uppercase">
                          Click to Arm
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center rounded border border-bridge-border/40 bg-black/40 text-xs text-amber-300">
                    No compatible {family} ammunition in cargo reserves! Requisition warheads in the Ordnance tab.
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setWeaponArmModal(null)}
                className="w-full py-1.5 rounded border border-bridge-border text-xs text-muted-foreground hover:text-white uppercase cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )
      })()}

      {/* MODAL 2: ARM FROM ORDNANCE TABLE TO A SPECIFIC WEAPON */}
      {ordnanceArmModal && (() => {
        const ordnance = ordnanceArmModal.ordnance
        const compatibleLaunchers = mountedWeapons.filter((w) => getLauncherFamily(w.name) === ordnance.category)

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="w-full max-w-md rounded-lg border border-cyan-neon bg-slate-950 p-5 shadow-[0_0_30px_rgba(0,255,255,0.3)] flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-bridge-border pb-2">
                <div className="flex items-center gap-2">
                  <PackagePlus className="w-4 h-4 text-cyan-neon" />
                  <h3 className="text-xs font-bold tracking-wider text-cyan-neon uppercase">
                    Arm Warhead // {ordnance.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setOrdnanceArmModal(null)}
                  className="text-muted-foreground hover:text-white cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300">
                Choose which launch system to arm with <strong>{ordnance.name}</strong> ({ordnance.currentReserve} Available):
              </p>

              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                {compatibleLaunchers.map((launcher) => {
                  const key = launcher.instanceId || launcher.id
                  const state = getLauncherState(key, launcher)
                  const isMixed = state.ordnanceId && state.ordnanceId !== ordnance.id && state.loadedCount > 0
                  const isFull = state.loadedCount >= state.maxCapacity

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={(Boolean(isMixed) && !isMissileBoatMastery) || isFull}
                      onClick={() => executeArmLauncher(launcher, ordnance)}
                      className={`p-3 rounded border text-left flex justify-between items-center transition-all ${
                        (isMixed && !isMissileBoatMastery) || isFull
                          ? "bg-red-950/20 border-red-500/30 text-slate-500 cursor-not-allowed opacity-60"
                          : "bg-black/60 border-bridge-border hover:border-emerald-400 hover:bg-emerald-500/10 text-cyan-neon cursor-pointer"
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold uppercase block text-slate-100">{launcher.name}</span>
                        <span className="text-[10px] text-muted-foreground block">
                          Location: {launcher.location || "Bow"} Arc
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold block">
                          {state.loadedCount} / {state.maxCapacity} Loaded
                        </span>
                        <span className="text-[9px] text-amber-300 block">
                          {isMixed && !isMissileBoatMastery ? `Contains ${state.ordnanceName}` : isFull ? "Tube Full" : "Ready to Arm"}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={() => setOrdnanceArmModal(null)}
                className="w-full py-1.5 rounded border border-bridge-border text-xs text-muted-foreground hover:text-white uppercase cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )
      })()}

      {/* MODAL 3: UNLOAD / DISARM SPECIFIC ORDNANCE FROM WEAPON */}
      {ordnanceDisarmModal && (() => {
        const ordnance = ordnanceDisarmModal.ordnance
        const armedLaunchers = mountedWeapons.filter((w) => {
          const key = w.instanceId || w.id
          const state = getLauncherState(key, w)
          return state.ordnanceId === ordnance.id && state.loadedCount > 0
        })

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="w-full max-w-md rounded-lg border border-amber-500 bg-slate-950 p-5 shadow-[0_0_30px_rgba(251,191,36,0.3)] flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-bridge-border pb-2">
                <div className="flex items-center gap-2">
                  <Undo2 className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold tracking-wider text-amber-300 uppercase">
                    Disarm // {ordnance.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setOrdnanceDisarmModal(null)}
                  className="text-muted-foreground hover:text-white cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300">
                Select which weapon tube to unload <strong>{ordnance.name}</strong> from. All warheads will return to your cargo reserve:
              </p>

              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                {armedLaunchers.map((launcher) => {
                  const key = launcher.instanceId || launcher.id
                  const state = getLauncherState(key, launcher)

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleDisarmLauncher(key)}
                      className="p-3 rounded border border-amber-500/40 bg-black/60 hover:border-amber-400 hover:bg-amber-500/20 text-left flex justify-between items-center transition-all cursor-pointer"
                    >
                      <div>
                        <span className="text-xs font-bold uppercase block text-slate-100">{launcher.name}</span>
                        <span className="text-[10px] text-muted-foreground block">
                          Location: {launcher.location || "Bow"} Arc
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-amber-300 block">
                          Unload {state.loadedCount} Warhead{state.loadedCount > 1 ? "s" : ""}
                        </span>
                        <span className="text-[9px] text-muted-foreground block uppercase">
                          Click to Return
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={() => setOrdnanceDisarmModal(null)}
                className="w-full py-1.5 rounded border border-bridge-border text-xs text-muted-foreground hover:text-white uppercase cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )
      })()}

      {/* MODAL 4: FIRE CONTROL ATTACK WIZARD */}
      {activeWizardWeapon && (() => {
        const instanceKey = activeWizardWeapon.instanceId || activeWizardWeapon.id
        const catalogDef = STARSHIP_WEAPONS.find((sw) => sw.name.toLowerCase() === activeWizardWeapon.name.toLowerCase())
        const isOrdnance = !!activeWizardWeapon.isOrdnanceLauncher
        const launcherState = isOrdnance ? getLauncherState(instanceKey, activeWizardWeapon) : null
        const armedAmmoDef = isOrdnance ? findArmedAmmoCatalog(launcherState) : null

        const isTurret = isTurretMounted(activeWizardWeapon)
        const assignedGunner = getAssignedGunner(activeWizardWeapon)
        const isManned = isTurret ? !!assignedGunner : true

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
        const hasHeavy = props.some((p: string) => p.includes("heavy"))
        const hasSaturate = props.some((p: string) => p.includes("saturate"))
        const keenProp = props.find((p: string) => p.includes("keen"))
        const keenRating = keenProp ? parseInt(keenProp.replace(/[^0-9]/g, ""), 10) || 1 : 0
        const critThreshold = Math.max(1, 20 - keenRating)

        const baseAttackAbilityMod = hasSaturate ? Math.max(strMod, wisMod) : wisMod
        const sFoilsAtkDelta = hasSFoils && !isOrdnance ? (sFoilsMode === "locked" ? -2 : 1) : 0
        let attackMod = baseAttackAbilityMod + (isAttackFighter ? 1 : 0) + sFoilsAtkDelta

        const attackBreakdownParts: string[] = [
          `${baseAttackAbilityMod >= 0 ? `+${baseAttackAbilityMod}` : baseAttackAbilityMod} from ${hasSaturate ? "Strength/Wisdom" : "Wisdom"} Modifier`,
        ]
        if (isAttackFighter) {
          attackBreakdownParts.push("+1 from Attack Fighter Role Spec")
        }
        if (sFoilsAtkDelta !== 0) {
          attackBreakdownParts.push(`${sFoilsAtkDelta > 0 ? `+${sFoilsAtkDelta}` : sFoilsAtkDelta} from S-Foils (${sFoilsMode === "locked" ? "Closed / Cruise" : "Attack Position"})`)
        }

        if (togglePiercing) {
          attackMod += 1
          attackBreakdownParts.push("+1 from Piercing Stance")
        }
        if (toggleDire) {
          attackMod -= 1
          attackBreakdownParts.push("-1 from Dire Stance")
        }
        if (toggleMelt) {
          attackMod -= proficiencyBonus
          attackBreakdownParts.push(`-${proficiencyBonus} from Melt Stance`)
        }

        const saveDC = 8 + attackMod

        const hasAdvantage = isInvisible || isWeaponsBoosted
        const hasDisadvantage = rangeBracket === "long" || failsCon || hasSystemDamageAtkDisadv || isBlinded || isIonized || (!isManned && isTurret)
        const netRollMode = resolveAdvantageMode(hasAdvantage, hasDisadvantage)

        const currentHeatCost = firingMode === "rapid" ? rapidRating : firingMode === "burst" ? burstRating : 1
        const hasSufficientHeat = isOrdnance ? (launcherState && launcherState.loadedCount > 0) : remainingHeadroom >= currentHeatCost

        const canDoStandard = (!isAuto && remainingHeadroom >= 1) || isOrdnance
        const canDoRapid = !isOrdnance && hasRapid && remainingHeadroom >= rapidRating
        const canDoBurst = !isOrdnance && hasBurst && remainingHeadroom >= burstRating

        const baseDamageRaw = isOrdnance ? (launcherState?.damage || "2d8") : (activeWizardWeapon.damage || catalogDef?.damage || "1d8")
        const dmgDetails = computeDamageDisplay(baseDamageRaw, props)
        let diceString = dmgDetails.dicePart || baseDamageRaw
        if (firingMode === "rapid") {
          diceString = `${diceString} + ${diceString}`
        }

        let dynamicFlat = dmgDetails.flatTotal
        const damageBreakdownParts: string[] = [...dmgDetails.sourceBreakdown]

        if (toggleDire) {
          dynamicFlat += 1
          damageBreakdownParts.push("+1 from Dire Stance")
        }
        if (togglePiercing) {
          dynamicFlat -= 1
          damageBreakdownParts.push("-1 from Piercing Stance")
        }
        if (toggleMelt) {
          dynamicFlat += proficiencyBonus
          damageBreakdownParts.push(`+${proficiencyBonus} from Melt Stance`)
        }

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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-xl rounded-lg border border-cyan-neon bg-slate-950 p-5 shadow-[0_0_30px_rgba(0,255,255,0.2)] flex flex-col gap-4 font-mono max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-bridge-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-5 h-5 text-cyan-neon animate-pulse" />
                  <div>
                    <h3 className="text-sm font-bold tracking-wider text-cyan-neon uppercase">
                      Fire Control Assistant // {activeWizardWeapon.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground uppercase">
                        Step {wizardStep} of 4: {
                          wizardStep === 1 ? "Select Firing Mode" :
                          wizardStep === 2 ? "Range & Arc Bracket" :
                          wizardStep === 3 ? "Combat Stances & Modifiers" : "Attack Resolution"
                        }
                      </span>
                      {!isOrdnance ? (
                        <span className="text-[10px] text-cyan-300">
                          • Heat: {currentHeat} / {maxHeat} ({remainingHeadroom} Available)
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-300">
                          • Armed: {launcherState?.ordnanceName} ({launcherState?.loadedCount} Left)
                        </span>
                      )}
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
                <div className="p-2.5 rounded border border-cyan-400 bg-cyan-950/60 text-xs flex items-center justify-between font-mono animate-pulse shadow-[0_0_10px_rgba(0,255,255,0.3)]">
                  <span className="flex items-center gap-2 text-cyan-300 font-bold">
                    <Sparkles className="w-4 h-4 text-cyan-neon" />
                    ENGINEERING WEAPON BOOST ACTIVE
                  </span>
                  <span className="text-[10px] font-bold text-cyan-neon uppercase">
                    +ADVANTAGE ON NEXT ATTACK ROLL
                  </span>
                </div>
              )}

              {!isManned && isTurret && (
                <div className="p-2.5 rounded border border-amber-500/80 bg-amber-950/60 text-xs flex items-center justify-between font-mono animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                  <span className="flex items-center gap-2 text-amber-300 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    UNMANNED TURRET
                  </span>
                  <span className="text-[10px] font-bold text-amber-300 uppercase">
                    FORWARD ARC ONLY • DISADVANTAGE ON ATTACKS
                  </span>
                </div>
              )}

              {isBlinded && (
                <div className="p-2.5 rounded border border-red-500/80 bg-red-950/60 text-xs flex items-center justify-between font-mono animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                  <span className="flex items-center gap-2 text-red-300 font-bold">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    BLINDED CONDITION ACTIVE
                  </span>
                  <span className="text-[10px] font-bold text-red-400 uppercase">
                    ALL WEAPON ATTACKS AT DISADVANTAGE
                  </span>
                </div>
              )}

              {isIonized && (
                <div className="p-2.5 rounded border border-red-500/80 bg-red-950/60 text-xs flex items-center justify-between font-mono animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.4)]">
                  <span className="flex items-center gap-2 text-red-300 font-bold">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    IONIZED CONDITION ACTIVE
                  </span>
                  <span className="text-[10px] font-bold text-red-400 uppercase">
                    ALL ATTACK ROLLS AT DISADVANTAGE
                  </span>
                </div>
              )}

              {isInvisible && (
                <div className="p-2.5 rounded border border-purple-500/80 bg-purple-950/60 text-xs flex items-center justify-between font-mono animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                  <span className="flex items-center gap-2 text-purple-300 font-bold">
                    <Eye className="w-4 h-4 text-purple-400 shrink-0" />
                    INVISIBLE STATUS ACTIVE
                  </span>
                  <span className="text-[10px] font-bold text-purple-300 uppercase">
                    ATTACKS GAIN ADVANTAGE
                  </span>
                </div>
              )}

              {hasSystemDamageAtkDisadv && (
                <div className="p-2.5 rounded border border-red-500/80 bg-red-950/60 text-xs flex items-center justify-between font-mono animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                  <span className="flex items-center gap-2 text-red-300 font-bold">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    SYSTEM DAMAGE LEVEL {systemDamageLevel} ACTIVE
                  </span>
                  <span className="text-[10px] font-bold text-red-400 uppercase">
                    ALL ATTACKS AT DISADVANTAGE
                  </span>
                </div>
              )}

              {hasSFoils && !isOrdnance && (
                <div
                  className={`p-2.5 rounded border text-xs flex items-center justify-between font-mono ${
                    sFoilsMode === "unlocked"
                      ? "bg-cyan-950/40 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(0,255,255,0.2)]"
                      : "bg-amber-950/40 border-amber-500/50 text-amber-300"
                  }`}
                >
                  <span>
                    ⚡ S-FOILS STANCE: <strong>{sFoilsMode === "unlocked" ? "ATTACK POSITION" : "CLOSED / CRUISE"}</strong>
                  </span>
                  <span className="font-bold">
                    {sFoilsMode === "unlocked" ? "+1 TO HIT APPLIED" : "-2 TO HIT APPLIED"}
                  </span>
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

                  <p className="text-xs text-slate-300">
                    Select the firing profile for this engagement sequence:
                  </p>

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
                          {isOrdnance
                            ? "[NOT APPLICABLE]"
                            : !hasRapid
                            ? "[NO RAPID PROPERTY]"
                            : remainingHeadroom < rapidRating
                            ? `[NEED ${rapidRating} HEAT, HAVE ${remainingHeadroom}]`
                            : "Target Dex Save"}
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
                          {isOrdnance
                            ? "[NOT APPLICABLE]"
                            : !hasBurst
                            ? "[NO BURST PROPERTY]"
                            : remainingHeadroom < burstRating
                            ? `[NEED ${burstRating} HEAT, HAVE ${remainingHeadroom}]`
                            : "150ft Cube Dex Save"}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono ${!canDoBurst ? "text-red-400 line-through font-bold" : "text-amber-300"}`}>
                        {!canDoBurst ? "UNAVAILABLE" : `+${burstRating} Heat Build`}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: RANGE & ARC VERIFICATION */}
              {wizardStep === 2 && (
                <div className="flex flex-col gap-4 py-2">
                  <div className="flex justify-between items-center bg-black/50 p-2.5 rounded border border-bridge-border">
                    <span className="text-xs text-muted-foreground">Calibrated Weapon Range:</span>
                    <span className="text-xs font-bold text-cyan-neon">{normalRange} ft (Normal) / {maxRange} ft (Maximum)</span>
                  </div>

                  <div
                    className={`p-2.5 rounded border flex items-center justify-between gap-2 text-xs font-mono ${
                      isManned
                        ? "bg-cyan-950/40 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,255,255,0.2)]"
                        : "bg-amber-950/40 border-amber-500/50 text-amber-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Compass className={`w-4 h-4 ${isManned ? "text-cyan-neon" : "text-amber-400"}`} />
                      <span>
                        Firing Arc: <strong>{isManned ? "UNLIMITED (360° SPHERE)" : "FORWARD CONE ONLY (UNMANNED)"}</strong>
                      </span>
                    </div>
                    {isTurret && (
                      <span className="text-[10px] font-bold">
                        {isManned ? `★ Gunner: ${assignedGunner?.name}` : "⚠️ Disadvantage Active"}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300">What is the distance to your target?</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setRangeBracket("normal")}
                      className={`p-3 rounded border text-left transition-all cursor-pointer ${
                        rangeBracket === "normal"
                          ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                          : "border-bridge-border bg-black/40 text-slate-300 hover:border-emerald-400/40"
                      }`}
                    >
                      <span className="text-xs font-bold uppercase block">Normal Range</span>
                      <span className="text-[10px] block mt-1">≤ {normalRange} Feet</span>
                      <span className="text-[9px] text-muted-foreground block mt-1">
                        {netRollMode === "disadvantage" ? "Disadvantage Active" : netRollMode === "advantage" ? "Advantage Active" : "Normal Roll"}
                      </span>
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
                      <span className="text-[9px] text-amber-300 block mt-1">Imposes Disadvantage</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRangeBracket("out")}
                      className={`p-3 rounded border text-left transition-all cursor-pointer ${
                        rangeBracket === "out"
                          ? "border-red-500 bg-red-950/60 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                          : "border-red-500/40 bg-red-950/20 text-red-400 hover:bg-red-950/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase block">Out of Range</span>
                        <Ban className="w-3.5 h-3.5 text-red-400" />
                      </div>
                      <span className="text-[10px] block mt-1">&gt; {maxRange} Feet</span>
                      <span className="text-[9px] font-bold text-red-400 block mt-1">[CANNOT TARGET]</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: STANCES & MODIFIERS */}
              {wizardStep === 3 && (
                <div className="flex flex-col gap-3.5 py-2">
                  <p className="text-xs text-slate-300">
                    Review automated conditions and configure optional firing property stances:
                  </p>

                  {isWeaponsBoosted && (
                    <div className="p-2.5 rounded bg-cyan-950/60 border border-cyan-400 text-[10px] text-cyan-200 flex items-center justify-between shadow-[0_0_10px_rgba(0,255,255,0.2)] animate-pulse">
                      <span className="flex items-center gap-1.5 font-bold">
                        <Sparkles className="w-4 h-4 text-cyan-neon" />
                        Engineering Weapon Boost Active:
                      </span>
                      <span className="font-mono uppercase font-bold text-cyan-neon">
                        +ADVANTAGE APPLIED
                      </span>
                    </div>
                  )}

                  {!isManned && isTurret && (
                    <div className="p-2.5 rounded bg-amber-950/50 border border-amber-500 text-[10px] text-amber-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        <strong>Unmanned Turret:</strong> No dedicated gunner stationed. Disadvantage imposed on all attack rolls.
                      </span>
                    </div>
                  )}

                  {isBlinded && (
                    <div className="p-2.5 rounded bg-red-950/50 border border-red-500 text-[10px] text-red-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span><strong>Blinded Condition Active:</strong> Disadvantage on all weapon attack rolls.</span>
                    </div>
                  )}

                  {isIonized && (
                    <div className="p-2.5 rounded bg-red-950/50 border border-red-500 text-[10px] text-red-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span><strong>Ionized Condition Active:</strong> Disadvantage on all attack rolls.</span>
                    </div>
                  )}

                  {isInvisible && (
                    <div className="p-2.5 rounded bg-purple-950/50 border border-purple-500 text-[10px] text-purple-300 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-purple-400 shrink-0" />
                      <span><strong>Invisible Status Active:</strong> Advantage on all weapon attack rolls.</span>
                    </div>
                  )}

                  {hasSystemDamageAtkDisadv && (
                    <div className="p-2.5 rounded bg-red-950/50 border border-red-500 text-[10px] text-red-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span><strong>System Damage Level {systemDamageLevel} Active:</strong> All ship attacks suffer disadvantage.</span>
                    </div>
                  )}

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

                  <div className={`p-2.5 rounded border text-center text-[11px] ${
                    netRollMode === "disadvantage" 
                      ? "bg-amber-950/40 border-amber-500/60 text-amber-300" 
                      : netRollMode === "advantage" 
                      ? "bg-purple-950/40 border-purple-500/60 text-purple-300"
                      : "bg-black/60 border-bridge-border text-emerald-400"
                  }`}>
                    Roll Trait: <strong>
                      {netRollMode === "disadvantage" 
                        ? `DISADVANTAGE (Roll 2d20, Take Lower) — Source: ${[
                            !isManned && isTurret ? "Unmanned Turret" : null,
                            isBlinded ? "Blinded" : null,
                            isIonized ? "Ionized" : null,
                            hasSystemDamageAtkDisadv ? `System Damage Lvl ${systemDamageLevel}` : null,
                            rangeBracket === "long" ? "Long Range" : null,
                            failsCon ? "Constitution Penalty" : null,
                          ].filter(Boolean).join(", ")}`
                        : netRollMode === "advantage" 
                        ? `ADVANTAGE (Roll 2d20, Take Higher) — Source: ${[
                            isWeaponsBoosted ? "Engineering Weapons Boost" : null,
                            isInvisible ? "Invisibility" : null,
                          ].filter(Boolean).join(", ")}`
                        : hasAdvantage && hasDisadvantage 
                        ? "STRAIGHT ROLL (Advantage & Disadvantage Cancel Out)" 
                        : "NORMAL ATTACK ROLL (1d20)"}
                    </strong>
                  </div>
                </div>
              )}

              {/* STEP 4: ATTACK RESOLUTION & ROLL ENTRY */}
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

                        <div className="pt-2 border-t border-bridge-border/40 text-[10px] text-slate-300 flex flex-wrap gap-x-3 gap-y-1">
                          <span className="text-muted-foreground">Bonus Sources:</span>
                          {attackBreakdownParts.map((part, i) => (
                            <span key={i} className="text-cyan-300 font-mono bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/30">
                              {part}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Dice Rolling Panel */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 rounded bg-black/40 border border-bridge-border">
                        <div className="flex flex-col justify-between gap-1 border-b sm:border-b-0 sm:border-r border-bridge-border/60 pb-2 sm:pb-0 sm:pr-2">
                          <span className="text-[10px] text-muted-foreground uppercase">Digital Dice Roller</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={handleRollDigitalAttack}
                              className="px-2.5 py-1 rounded border border-cyan-neon/40 bg-cyan-neon/10 text-cyan-neon text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 hover:bg-cyan-neon/20 cursor-pointer shadow-sm transition"
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
                          <span className="text-[10px] text-muted-foreground uppercase">Physical Tabletop Roll Entry</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              placeholder="Final Total"
                              value={manualAttackInput}
                              onChange={(e) => setManualAttackInput(e.target.value)}
                              className="w-28 rounded bg-black border border-slate-700 px-2 py-1 text-xs text-cyan-300 font-bold focus:outline-none focus:border-cyan-neon"
                            />
                            <span className="text-[9px] text-slate-500">Includes Mods</span>
                          </div>
                        </div>
                      </div>

                      {/* Outcome Selection Buttons */}
                      {attackOutcome === "pending" && (
                        <div className="grid grid-cols-3 gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => completeAttack(currentHeatCost)}
                            className="p-3 rounded border border-red-500/50 bg-red-500/10 text-red-400 font-bold uppercase text-xs flex items-center justify-center gap-1.5 hover:bg-red-500/20 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            Miss ({isOrdnance ? "1 Warhead" : `+${currentHeatCost} Heat`})
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAttackOutcome("hit")
                              handleRollDigitalDamage(false)
                            }}
                            className="p-3 rounded border border-emerald-500/60 bg-emerald-500/20 text-emerald-300 font-bold uppercase text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-500/30 cursor-pointer"
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

                      {/* Hit or Critical Damage Resolution Panel */}
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
                                  Critical Hit Confirmed! {shipConfig?.useBrutalCriticals ? "(Brutal Critical Formula Active)" : "(Standard 5e Critical)"}
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  Hit Confirmed! Report Damage to GM:
                                </>
                              )}
                            </span>
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            <span className="text-lg font-bold font-mono text-cyan-neon">
                              {finalDmgFormula} {(isOrdnance ? launcherState?.damageType : activeWizardWeapon.damageType)?.toUpperCase() || "ENERGY"} DAMAGE
                            </span>
                            {damageBreakdownParts.length > 0 && (
                              <span className="text-[11px] text-amber-300/90 font-mono">
                                ({damageBreakdownParts.join(", ")})
                              </span>
                            )}
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
                              <span className="text-[10px] text-muted-foreground uppercase shrink-0">
                                Total:
                              </span>
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
                          <span className="text-[10px] font-mono text-amber-300">
                            {firingMode === "burst" ? "150-ft Cube Target Area" : "Single Concentrated Target"}
                          </span>
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
                            Failed Save! Report Damage to GM:
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