"use client"

import { useState, useEffect, useMemo } from "react"
import { CombatResources } from "./combat-resources"
import { StationModifications, type Modification } from "./ship-modifications"
import { ShipStats } from "./ship-stats"
import type { JourneyData } from "./navcomputer-station"
import type { ShipConfig } from "./ship-setup"
import type { OrdnanceItem } from "./weapons-station"
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
  FastForward,
  Flame,
  BookOpen,
  Lock,
  Unlock,
  X,
  Zap,
  Power,
  PowerOff,
  Crosshair,
  AlertTriangle,
  XCircle,
  Dices,
  Ban,
  PackagePlus,
  Undo2,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Swords,
  Target
} from "lucide-react"

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

function rollDiceFormula(formula: string): { individualRolls: number[]; totalDice: number } {
  const matches = [...formula.matchAll(/(\d+)d(\d+)/g)]
  const rolls: number[] = []
  let total = 0

  matches.forEach((m) => {
    const count = parseInt(m[1], 10)
    const sides = parseInt(m[2], 10)
    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * sides) + 1
      rolls.push(roll)
      total += roll
    }
  })

  return { individualRolls: rolls, totalDice: total }
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
    description: "When you move at least 150 feet towards a target, you may declare an Attack Run as an action. You must have a clear path towards your target, and nothing should hinder your path (such as difficult terrain or obstacles). If you finish this movement within range of your target, you may follow it with one of these options:\n• Fire: Make a ship weapon attack from a forward-facing limited arc without normal disadvantage.\n• Ram: Make a Ram attempt with advantage on Strength (Ram).\n• Conceal: Make a Dexterity (Hide) check to conceal your ship following Chapter 7 hiding rules."
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
  effectiveSlowedLevel?: number
  manifest?: ManifestMember[]
  onAssignCrew?: (memberId: string, targetLocation: ShipCompartmentId) => void
  onToggleTurn?: (memberId: string) => void
  tacticalMovement?: TacticalMovementState
  onSpendMovement?: (feet: number) => void
  onResetMovement?: () => void
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
  effectiveSlowedLevel = 0,
  manifest = [],
  onAssignCrew,
  onToggleTurn,
  tacticalMovement = { spentFeet: 0 },
  onSpendMovement,
  onResetMovement,
}: EnginesStationProps) {
  const [showStartupModal, setShowStartupModal] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [forcedStartupSafety, setForcedStartupSafety] = useState(false)
  const [awayMissionDaysInput, setAwayMissionDaysInput] = useState<string>("7")

  // Helm Firing Mode Selector: Standard (Disadv), Attack Run (150ft moved, straight), Dogfight (Maneuver opposed, straight)
  const [helmAttackType, setHelmAttackType] = useState<HelmAttackType>("standard")

  // Crew assignment extraction
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

  // =========================================================================
  // PILOT WEAPONS FILTER & SYNCHRONIZATION
  // =========================================================================
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

  // Forward facing limited arc: Bow-mounted OR unmanned turrets (excluding structural hardpoints)
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

  const [localLauncherStates, setLocalLauncherStates] = useState<Record<string, LauncherLoadState>>({})

  const getLauncherState = (instanceKey: string, weapon: Modification): LauncherLoadState => {
    if (localLauncherStates[instanceKey]) return localLauncherStates[instanceKey]
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

  const [weaponArmModal, setWeaponArmModal] = useState<{ weapon: Modification } | null>(null)

  const executeArmLauncher = (targetLauncher: Modification, ordnance: OrdnanceItem) => {
    const key = targetLauncher.instanceId || targetLauncher.id
    const state = getLauncherState(key, targetLauncher)

    if (state.ordnanceId && state.ordnanceId !== ordnance.id && state.loadedCount > 0) {
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

    onUpdateOrdnanceList?.((prev) =>
      prev.map((o) => (o.id === ordnance.id ? { ...o, currentReserve: o.currentReserve - transferAmount } : o))
    )

    setLocalLauncherStates((prev) => ({
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
  }

  const handleDisarmLauncher = (instanceKey: string, launcher: Modification) => {
    const state = getLauncherState(instanceKey, launcher)
    if (!state.ordnanceId || state.loadedCount <= 0) return

    const ordnanceId = state.ordnanceId
    const returnCount = state.loadedCount

    onUpdateOrdnanceList?.((prev) =>
      prev.map((o) => (o.id === ordnanceId ? { ...o, currentReserve: o.currentReserve + returnCount } : o))
    )

    setLocalLauncherStates((prev) => ({
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
  }

  // Combat Stat Modifiers
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
  
  const [digitalRoll, setDigitalRoll] = useState<number | null>(null)
  const [digitalRollPair, setDigitalRollPair] = useState<[number, number] | null>(null)
  const [digitalDamageResult, setDigitalDamageResult] = useState<{ rolls: number[]; total: number } | null>(null)
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
    setDigitalRoll(null)
    setDigitalRollPair(null)
    setDigitalDamageResult(null)
    setManualAttackInput("")
    setManualDamageInput("")
    setAttackOutcome("pending")
  }

  const openWizard = (w: Modification) => {
    if ((w as any).firedThisRound) {
      alert("Weapon Fired: This weapon has already been fired this round. It will reset once the Reactor is Cycled.")
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

    if (helmAttackType === "attack_run" && tacticalMovement.spentFeet < 150) {
      alert("Attack Run Requirement Unmet: An Attack Run requires moving at least 150 ft towards your target before firing. Spend movement first.")
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
    setDigitalRoll(null)
    setDigitalRollPair(null)
    setDigitalDamageResult(null)
    setManualAttackInput("")
    setManualDamageInput("")
    setAttackOutcome("pending")
  }

  const completeAttack = (heatCost: number) => {
    if (!activeWizardWeapon) return
    const key = activeWizardWeapon.instanceId || activeWizardWeapon.id
    const isOrdnance = !!activeWizardWeapon.isOrdnanceLauncher

    if (isOrdnance) {
      setLocalLauncherStates((prev) => {
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

  // Power Coupling Logic
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

  const slowedReductionAmount = useMemo(() => {
    if (effectiveSlowedLevel >= 4) return 9999
    if (effectiveSlowedLevel === 3) return 300
    if (effectiveSlowedLevel === 2) return 250
    if (effectiveSlowedLevel === 1) return 150
    return 0
  }, [effectiveSlowedLevel])

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
      `Check: d20 [${duressCondition !== "normal" ? `${rollA}, ${rollB} -> Kept ${keptD20}` : keptD20}] + Mod (${pilotModInput >= 0 ? `+${pilotModInput}` : pilotModInput}) = ${total} (${evalResult.label})`
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
      setMishapResultLog("✅ Optimal Start-Up: All 10 initiation procedures completed cleanly. Primary reactor online.")
      if (onSetPoweredOn) onSetPoweredOn(true)
      return
    }

    const d20 = Math.floor(Math.random() * 20) + 1
    const resultText = resolveMishapTableRoll(d20, initiationProcedures)
    setMishapResultLog(`⚠️ FORCED TAKEOFF (Roll ${d20} + ${initiationProcedures} proc): ${resultText}`)
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

      {/* 1. MASTER HEADER & INTEGRATED QUICK-ACTION ACCESS BAR */}
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
                <span>{isPoweredOn ? "Reactor: Online" : `Cold Start (${initiationProcedures}/10)`}</span>
              </button>

              {isPoweredOn && (
                <button
                  type="button"
                  onClick={handleShutdownShip}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-rose-500/50 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 transition cursor-pointer"
                  title="Emergency SCRAM / Shutdown Ship"
                >
                  <PowerOff className="h-3 w-3" />
                  <span>SCRAM</span>
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
              {isPoweredOn ? "MAIN REACTOR ACTIVE" : "COLD & DARK (AUX BATTERY)"}
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

      {/* 2. COMPACT CREW ROSTER HUD */}
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

      {/* Global Ship Stats Telemetry strip */}
      <ShipStats shipConfig={shipConfig} proficiencyBonus={proficiencyBonus} />

      {/* 3. TACTICAL MOVEMENT & COMBAT RESOURCES */}
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
        <section className="flex flex-col rounded-md border border-cyan-neon/60 bg-bridge-panel p-3 shadow-[0_0_15px_rgba(0,255,255,0.06)] justify-between gap-2.5">
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
        </section>
      </div>

      {/* ========================================================================= */}
      {/* 4. FORWARD-FACING LIMITED ARC BATTERIES & HARDPOINT FIRE CONTROLS          */}
      {/* ========================================================================= */}
      <section className="rounded-md border border-bridge-border bg-bridge-panel p-4">
        <div className="flex flex-col gap-2 mb-3 border-b border-bridge-border/60 pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-cyan-neon animate-pulse" />
              <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase">
                Forward Batteries &amp; Hardpoint Fire Controls ({forwardWeapons.length} Available)
              </h3>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Bow mounts and unmanned turrets • Max 1 firing per round per weapon
            </span>
          </div>

          {/* 3-WAY HELM FIRING SELECTOR SWITCH */}
          <div className="flex flex-wrap items-center gap-2 pt-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-300 flex items-center gap-1">
              <Swords className="h-3.5 w-3.5 text-cyan-neon" /> Attack Mode:
            </span>

            <button
              type="button"
              onClick={() => setHelmAttackType("standard")}
              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer border ${
                helmAttackType === "standard"
                  ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.3)]"
                  : "bg-black/60 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <span>Standard Fire</span>
              <span className="text-[8px] px-1 rounded bg-amber-950/60 text-amber-400 border border-amber-500/40">
                Disadv
              </span>
            </button>

            <button
              type="button"
              onClick={() => setHelmAttackType("attack_run")}
              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer border ${
                helmAttackType === "attack_run"
                  ? "bg-cyan-500/20 border-cyan-neon text-cyan-neon shadow-[0_0_8px_rgba(0,255,255,0.3)]"
                  : "bg-black/60 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <span>Attack Run</span>
              <span className={`text-[8px] px-1 rounded border ${
                tacticalMovement.spentFeet >= 150
                  ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-400"
                  : "bg-slate-900 border-slate-700 text-slate-400"
              }`}>
                {tacticalMovement.spentFeet >= 150 ? "150ft+ Moved" : `${tacticalMovement.spentFeet}/150ft`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setHelmAttackType("dogfight")}
              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer border ${
                helmAttackType === "dogfight"
                  ? "bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.3)]"
                  : "bg-black/60 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <span>Dogfight</span>
              <span className="text-[8px] px-1 rounded bg-purple-950/60 text-purple-400 border border-purple-500/40">
                Maneuver Check
              </span>
            </button>
          </div>

          {/* Tactical Mode Feedback Notice */}
          <div className="text-[10px] font-mono px-2.5 py-1.5 rounded bg-black/60 border border-bridge-border/60">
            {helmAttackType === "standard" && (
              <span className="text-amber-300">
                ⚠️ <strong>Helm Standard Fire:</strong> Firing from the helm without an Attack Run or Dogfight imposes disadvantage on the attack roll.
              </span>
            )}
            {helmAttackType === "attack_run" && (
              <span className={tacticalMovement.spentFeet >= 150 ? "text-cyan-300" : "text-amber-400 font-bold"}>
                {tacticalMovement.spentFeet >= 150 ? (
                  <>✓ <strong>Attack Run Ready:</strong> 150+ ft forward movement completed. Weapon attack made without normal helm disadvantage.</>
                ) : (
                  <>⚠️ <strong>Attack Run Blocked:</strong> Requires at least 150 ft forward movement towards target in unobstructed space (Currently spent: {tacticalMovement.spentFeet} ft).</>
                )}
              </span>
            )}
            {helmAttackType === "dogfight" && (
              <span className="text-purple-300">
                ★ <strong>Dogfight Maneuver:</strong> Make an opposed Dexterity (Maneuvering) check. If successful, notify GM that the target has disadvantage on its next attack against your ship. Fire without normal helm disadvantage.
              </span>
            )}
          </div>
        </div>

        {forwardWeapons.length === 0 ? (
          <div className="p-4 rounded border border-dashed border-bridge-border/60 text-center text-xs text-muted-foreground">
            No Bow-mounted weapons or unmanned forward turrets available.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                  className={`rounded-lg border bg-black/40 p-4 flex flex-col justify-between gap-3 relative transition-all ${
                    isFiredThisRound
                      ? "border-slate-800 opacity-60"
                      : isOverheated
                      ? "border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                      : "border-bridge-border/80 hover:border-cyan-neon/60"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-bold text-cyan-neon tracking-wide truncate">
                            {w.name}
                          </h4>
                          <span className="text-[8px] font-bold uppercase px-1 rounded border border-bridge-border text-muted-foreground shrink-0">
                            {isOrdnance ? "ORDNANCE" : (w.damageType || "ENERGY").toUpperCase()}
                          </span>
                          <span className="text-[8px] font-bold uppercase px-1.5 py-0.2 rounded border font-mono shrink-0 border-cyan-400/50 bg-cyan-950/40 text-cyan-300">
                            {isTurret ? "UNMANNED TURRET (FWD)" : "BOW HARDPOINT"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-bridge-border/40">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Compass className="w-3.5 h-3.5 text-cyan-neon shrink-0" />
                            <span className="text-[10px] font-mono tracking-wider uppercase font-bold text-cyan-neon truncate">
                              ARC: FORWARD CONE
                            </span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                          isFiredThisRound
                            ? "bg-slate-900 border-slate-700 text-slate-400"
                            : isOrdnance
                            ? isLauncherArmed
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                              : "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                            : isOverheated
                            ? "bg-red-500/20 text-red-400 border-red-500/40"
                            : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        }`}
                      >
                        {isFiredThisRound
                          ? "FIRED (ROUND LOCK)"
                          : isOrdnance
                          ? isLauncherArmed
                            ? "ARMED"
                            : "EMPTY"
                          : isOverheated
                          ? "OVERHEATED"
                          : "READY"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 my-3 text-center">
                      <div className="rounded border border-bridge-border/40 bg-bridge-panel/50 p-1.5 flex flex-col justify-between">
                        <span className="block text-[8px] text-muted-foreground uppercase">ATK MOD</span>
                        <span className="text-xs font-bold text-cyan-neon font-mono">{effectiveAtk.display}</span>
                      </div>
                      <div className="rounded border border-bridge-border/40 bg-bridge-panel/50 p-1.5 flex flex-col justify-between">
                        <span className="block text-[8px] text-muted-foreground uppercase">DAMAGE</span>
                        <span className="text-xs font-bold text-cyan-neon font-mono">{effectiveDmg.display}</span>
                      </div>
                      <div className="rounded border border-bridge-border/40 bg-bridge-panel/50 p-1.5 flex flex-col justify-between">
                        <span className="block text-[8px] text-muted-foreground uppercase">RANGE (FT)</span>
                        <span className="text-[10px] font-bold text-cyan-neon font-mono truncate px-0.5" title={effectiveRangeDisplay}>
                          {effectiveRangeDisplay}
                        </span>
                      </div>
                    </div>

                    {!isOrdnance ? (
                      <div className="flex flex-col gap-1 mb-2">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground uppercase">Thermal Buildup</span>
                          <span className={heat >= maxHeat ? "text-red-400 font-bold" : "text-cyan-neon"}>
                            {heat} / {maxHeat} Heat (Overheat {maxHeat})
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-900 rounded-sm overflow-hidden border border-bridge-border/30">
                          <div
                            className={`h-full transition-all ${
                              heat >= maxHeat ? "bg-red-500" : heat >= maxHeat * 0.75 ? "bg-amber-400" : "bg-cyan-neon"
                            }`}
                            style={{ width: `${Math.min(100, (heat / maxHeat) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5 mb-2 rounded border border-bridge-border/60 bg-black/60 p-2.5 text-[10px] font-mono">
                        <div className="flex justify-between items-center border-b border-bridge-border/40 pb-1">
                          <span className="text-muted-foreground uppercase">WARHEAD ARMED:</span>
                          <span className="font-bold text-cyan-neon">
                            {launcherState?.ordnanceName ? launcherState.ordnanceName.toUpperCase() : "NONE LOADED"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground uppercase">MAGAZINE TUBE:</span>
                          <span className={`font-bold ${isLauncherArmed ? "text-emerald-400" : "text-red-400"}`}>
                            {launcherState?.loadedCount ?? 0} / {launcherState?.maxCapacity ?? 4} LOADED
                          </span>
                        </div>

                        <div className="flex gap-1 w-full my-0.5">
                          {Array.from({ length: launcherState?.maxCapacity ?? 4 }).map((_, i) => (
                            <span
                              key={i}
                              className={`h-1.5 flex-1 rounded-sm ${
                                i < (launcherState?.loadedCount ?? 0)
                                  ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                                  : "bg-slate-800 border border-bridge-border/50"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 pt-2 border-t border-bridge-border/40">
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => openWizard(w)}
                        disabled={
                          isFiredThisRound ||
                          (!isOrdnance ? isOverheated : !isLauncherArmed) ||
                          (helmAttackType === "attack_run" && tacticalMovement.spentFeet < 150)
                        }
                        className={`col-span-2 rounded border py-2 text-xs font-bold tracking-wider font-mono flex items-center justify-center gap-1.5 transition-all ${
                          isFiredThisRound
                            ? "bg-slate-900 border-slate-700 text-slate-500 cursor-not-allowed"
                            : (!isOrdnance ? isOverheated : !isLauncherArmed)
                            ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-40"
                            : (helmAttackType === "attack_run" && tacticalMovement.spentFeet < 150)
                            ? "bg-amber-950/20 border-amber-500/40 text-amber-500 cursor-not-allowed"
                            : "border-cyan-neon/60 bg-cyan-neon/20 text-cyan-neon hover:bg-cyan-neon/30 shadow-[0_0_10px_rgba(0,255,255,0.2)] cursor-pointer"
                        }`}
                      >
                        {isFiredThisRound ? (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>FIRED THIS ROUND</span>
                          </>
                        ) : (
                          <>
                            <Crosshair className="w-3.5 h-3.5 text-cyan-neon" />
                            <span>ENGAGE TARGET</span>
                          </>
                        )}
                      </button>

                      {!isOrdnance ? (
                        <button
                          type="button"
                          onClick={() => handleCoolMountedWeapon(instanceKey)}
                          disabled={heat === 0}
                          className="rounded border border-bridge-border bg-black/60 py-2 text-xs font-bold text-muted-foreground hover:text-cyan-neon hover:border-cyan-neon/40 disabled:opacity-30 font-mono cursor-pointer"
                        >
                          FLUSH
                        </button>
                      ) : !isLauncherArmed ? (
                        <button
                          type="button"
                          onClick={() => setWeaponArmModal({ weapon: w })}
                          className="rounded border border-emerald-500/60 bg-emerald-500/20 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/30 font-mono cursor-pointer tracking-wider flex items-center justify-center gap-1"
                        >
                          <PackagePlus className="w-3 h-3" />
                          ARM
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDisarmLauncher(instanceKey, w)}
                          className="rounded border border-amber-500/60 bg-amber-500/20 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30 font-mono cursor-pointer tracking-wider flex items-center justify-center gap-1"
                        >
                          <Undo2 className="w-3 h-3" />
                          DISARM
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 5. ROW 2: PROPULSION / FUEL + CAMPAIGN TIME + HYPERSPACE VECTOR */}
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

      {/* 6. CHASSIS TACTICAL MANEUVERS */}
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

      {/* MODAL: ARM ORDNANCE */}
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
                    No compatible {family} ammunition in cargo reserves!
                  </div>
                )}
              </div>

              <button
                onClick={() => setWeaponArmModal(null)}
                className="w-full py-1.5 rounded border border-bridge-border text-xs text-muted-foreground hover:text-white uppercase cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )
      })()}

      {/* FIRE CONTROL ATTACK WIZARD MODAL */}
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
        const hasHeavy = props.some((p: string) => p.includes("heavy"))
        const hasSaturate = props.some((p: string) => p.includes("saturate"))
        const keenProp = props.find((p: string) => p.includes("keen"))
        const keenRating = keenProp ? parseInt(keenProp.replace(/[^0-9]/g, ""), 10) || 1 : 0
        const critThreshold = 20 - keenRating

        const heavyDmgBonus = hasHeavy ? Math.max(1, Math.ceil(strMod / 2)) : 0
        const baseAttackAbilityMod = hasSaturate ? Math.max(strMod, wisMod) : wisMod

        const sFoilsAtkDelta = hasSFoils && !isOrdnance ? (activeSFoilsMode === "locked" ? -2 : 1) : 0
        let attackMod = baseAttackAbilityMod + (isAttackFighter ? 1 : 0) + sFoilsAtkDelta

        const attackBreakdownParts: string[] = [
          `${baseAttackAbilityMod >= 0 ? `+${baseAttackAbilityMod}` : baseAttackAbilityMod} from ${hasSaturate ? "Strength/Wisdom" : "Wisdom"} Modifier`,
        ]
        if (isAttackFighter) attackBreakdownParts.push("+1 from Attack Fighter Role Spec")
        if (sFoilsAtkDelta !== 0) {
          attackBreakdownParts.push(`${sFoilsAtkDelta > 0 ? `+${sFoilsAtkDelta}` : sFoilsAtkDelta} from S-Foils (${activeSFoilsMode === "locked" ? "Closed / Cruise" : "Attack Position"})`)
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

        // Disadvantage evaluation: Helm Standard Fire imposes disadvantage unless Attack Run or Dogfight is selected
        const isHelmDisadvantage = helmAttackType === "standard"
        const hasDisadvConditions = rangeBracket === "long" || failsCon || (effectiveSlowedLevel >= 3) || isHelmDisadvantage
        const isDisadvantageRoll = hasDisadvConditions

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
        const damageBreakdownParts: string[] = [...(dmgDetails.sourceBreakdown || [])]

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

        const handleRollDigitalDamage = () => {
          const { individualRolls, totalDice } = rollDiceFormula(diceString)
          const finalTotal = Math.max(1, totalDice + dynamicFlat)
          setDigitalDamageResult({
            rolls: individualRolls,
            total: finalTotal,
          })
          setManualDamageInput(finalTotal.toString())
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
                        Mode: {helmAttackType === "attack_run" ? "Attack Run" : helmAttackType === "dogfight" ? "Dogfight" : "Standard Helm Fire"} • Step {wizardStep} of 4
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={closeWizard}
                  className="rounded p-1 text-muted-foreground hover:text-white transition-colors cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Tactical Mode Context Alert Banner */}
              {isHelmDisadvantage && (
                <div className="p-2 rounded bg-amber-950/40 border border-amber-500/50 text-[10px] text-amber-300">
                  ⚠️ Firing from the Helm without an Attack Run or Dogfight imposes disadvantage on the attack roll.
                </div>
              )}
              {helmAttackType === "attack_run" && (
                <div className="p-2 rounded bg-cyan-950/40 border border-cyan-neon/50 text-[10px] text-cyan-300">
                  ✓ Attack Run: 150+ ft forward movement completed. Disadvantage removed.
                </div>
              )}
              {helmAttackType === "dogfight" && (
                <div className="p-2 rounded bg-purple-950/40 border border-purple-500/50 text-[10px] text-purple-300">
                  ★ Dogfight: Disadvantage removed. On a successful Maneuvering check, notify GM that target has disadvantage on their next attack.
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
                    Select the firing profile for this helm maneuver:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
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
                    <span className="text-xs text-muted-foreground">Calibrated Weapon Range:</span>
                    <span className="text-xs font-bold text-cyan-neon">{normalRange} ft (Normal) / {maxRange} ft (Maximum)</span>
                  </div>

                  <p className="text-xs text-slate-300">Target Range Bracket:</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
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
                            {isDisadvantageRoll && (
                              <span className="text-[9px] font-bold text-amber-400 block mt-0.5">
                                [DISADVANTAGE ACTIVE: Roll 2d20, keep lower]
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
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const r1 = Math.floor(Math.random() * 20) + 1
                                const r2 = Math.floor(Math.random() * 20) + 1
                                if (isDisadvantageRoll) {
                                  setDigitalRollPair([r1, r2])
                                  setDigitalRoll(Math.min(r1, r2))
                                } else {
                                  setDigitalRollPair(null)
                                  setDigitalRoll(r1)
                                }
                              }}
                              className="px-2.5 py-1 rounded border border-cyan-neon/40 bg-cyan-neon/10 text-cyan-neon text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 hover:bg-cyan-neon/20 cursor-pointer"
                            >
                              <Dices className="w-3.5 h-3.5" />
                              Roll d20
                            </button>
                            {digitalRoll !== null && (
                              <span className="text-xs font-mono font-bold text-cyan-neon">
                                [{digitalRoll}] + {attackMod} = <strong>{digitalRoll + attackMod}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col justify-between gap-1">
                          <span className="text-[10px] text-muted-foreground uppercase">Tabletop Roll Total</span>
                          <input
                            type="number"
                            placeholder="Final Roll Total"
                            value={manualAttackInput}
                            onChange={(e) => setManualAttackInput(e.target.value)}
                            className="w-28 rounded bg-black border border-slate-700 px-2 py-1 text-xs text-cyan-300 font-bold focus:outline-none focus:border-cyan-neon"
                          />
                        </div>
                      </div>

                      {attackOutcome === "pending" && (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <button
                            onClick={() => completeAttack(currentHeatCost)}
                            className="p-3 rounded border border-red-500/50 bg-red-500/10 text-red-400 font-bold uppercase text-xs flex items-center justify-center gap-2 hover:bg-red-500/20 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            Miss ({isOrdnance ? "-1 Warhead" : `+${currentHeatCost} Heat`})
                          </button>

                          <button
                            onClick={() => setAttackOutcome("hit")}
                            className="p-3 rounded border border-emerald-500/60 bg-emerald-500/20 text-emerald-300 font-bold uppercase text-xs flex items-center justify-center gap-2 hover:bg-emerald-500/30 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Target Hit (Roll Damage)
                          </button>
                        </div>
                      )}

                      {attackOutcome === "hit" && (
                        <div className="bg-emerald-950/30 border border-emerald-500/60 p-3.5 rounded flex flex-col gap-2.5">
                          <span className="text-xs font-bold text-emerald-400 uppercase">
                            Hit Confirmed! Report Damage to GM:
                          </span>
                          
                          <div className="flex flex-col gap-1">
                            <span className="text-lg font-bold font-mono text-cyan-neon">
                              {finalDmgFormula} {(isOrdnance ? launcherState?.damageType : activeWizardWeapon.damageType)?.toUpperCase() || "ENERGY"} DAMAGE
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-black/60 p-2.5 rounded border border-slate-700">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleRollDigitalDamage}
                                className="px-3 py-1.5 rounded border border-cyan-neon/40 bg-cyan-neon/10 hover:bg-cyan-neon/25 text-cyan-neon text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                              >
                                <Dices className="w-4 h-4" />
                                Roll Damage
                              </button>
                              {digitalDamageResult && (
                                <span className="text-xs font-mono font-bold text-cyan-neon">
                                  [{digitalDamageResult.rolls.join(" + ")}]{dynamicFlat !== 0 ? ` ${dynamicFlat >= 0 ? `+ ${dynamicFlat}` : `- ${Math.abs(dynamicFlat)}`}` : ""} = <strong className="text-emerald-400 text-sm">{digitalDamageResult.total}</strong>
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
                            onClick={() => completeAttack(currentHeatCost)}
                            className="mt-2 w-full py-2 rounded border border-emerald-500/60 bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider hover:bg-emerald-500/30 cursor-pointer"
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
                            onClick={() => completeAttack(currentHeatCost)}
                            className="p-3 rounded border border-amber-500/50 bg-amber-500/10 text-amber-400 font-bold uppercase text-xs flex items-center justify-center gap-2 hover:bg-amber-500/20 cursor-pointer"
                          >
                            Target Saved (0 Damage)
                          </button>

                          <button
                            onClick={() => setAttackOutcome("failed")}
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
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleRollDigitalDamage}
                                className="px-3 py-1.5 rounded border border-cyan-neon/40 bg-cyan-neon/10 hover:bg-cyan-neon/25 text-cyan-neon text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                              >
                                <Dices className="w-4 h-4" />
                                Roll Damage
                              </button>
                              {digitalDamageResult && (
                                <span className="text-xs font-mono font-bold text-cyan-neon">
                                  [{digitalDamageResult.rolls.join(" + ")}]{dynamicFlat !== 0 ? ` ${dynamicFlat >= 0 ? `+ ${dynamicFlat}` : `- ${Math.abs(dynamicFlat)}`}` : ""} = <strong className="text-emerald-400 text-sm">{digitalDamageResult.total}</strong>
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

      {/* MODAL: DRILL-DOWN ENGINE START-UP */}
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

                <div className="flex items-center gap-2">
                  {isPoweredOn && (
                    <button
                      type="button"
                      onClick={handleShutdownShip}
                      className="px-3 py-2 rounded border border-rose-500/60 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 text-xs font-bold uppercase cursor-pointer"
                    >
                      SCRAM Reactor
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
                    {initiationProcedures >= targetProcedures ? "Engage Engines" : `Force Start (${initiationProcedures}/10)`}
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
              <button
                onClick={() => setShowActionModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 overflow-hidden min-h-[300px]">
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