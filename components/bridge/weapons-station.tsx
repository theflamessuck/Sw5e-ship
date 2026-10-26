"use client"

import { useState, useMemo } from "react"
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
  Flame
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
  versatileTransportUsed,
  onUpdateVersatileTransportUsed,
  bestShipInVerseUsed,
  onUpdateBestShipInVerseUsed,
  ordnanceList: externalOrdnanceList,
  onUpdateOrdnanceList,
  sFoilsMode = "unlocked",
  systemDamageLevel = 0,
  shipStatuses = [],
  manifest = [],
  onAssignCrew,
  onToggleTurn,
}: WeaponsStationProps) {
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

  return (
    <div className="flex flex-col gap-6 w-full font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-bridge-border pb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-glow-cyan text-lg font-bold tracking-[0.15em] text-cyan-neon">
            TACTICAL WEAPONS CONTROL
          </h2>
          <p className="text-[10px] tracking-[0.3em] text-muted-foreground/60">
            {shipConfig?.name?.toUpperCase() || "VESSEL"} // GUNNERY &amp; FIRE DIRECTORS
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {shipConfig?.useBrutalCriticals && (
            <span className="rounded-sm border border-amber-500/80 bg-amber-950/60 px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider text-amber-300 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" />
              BRUTAL CRITICALS ACTIVE
            </span>
          )}

          {isBlinded && (
            <span className="rounded-sm border border-red-500/80 bg-red-950/60 px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider text-red-300 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.4)]">
              ⚠️ BLINDED: ATTACKS AT DISADVANTAGE
            </span>
          )}

          {isIonized && (
            <span className="rounded-sm border border-red-500/80 bg-red-950/60 px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider text-red-300 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.4)]">
              ⚠️ IONIZED: ATTACKS AT DISADVANTAGE
            </span>
          )}

          {isInvisible && (
            <span className="rounded-sm border border-purple-500/80 bg-purple-950/60 px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider text-purple-300 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.4)]">
              ⚡ INVISIBLE: ATTACKS AT ADVANTAGE
            </span>
          )}

          {hasSystemDamageAtkDisadv && (
            <span className="rounded-sm border border-red-500/80 bg-red-950/60 px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider text-red-300 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.4)]">
              ⚠️ SYSTEM DAMAGE LVL {systemDamageLevel}: ATTACKS AT DISADVANTAGE
            </span>
          )}

          {hasSFoils && (
            <span
              className={`rounded-sm border px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider ${
                sFoilsMode === "unlocked"
                  ? "border-cyan-400 bg-cyan-950/40 text-cyan-300 shadow-[0_0_8px_rgba(0,255,255,0.4)]"
                  : "border-amber-400 bg-amber-950/40 text-amber-300"
              }`}
            >
              {sFoilsMode === "unlocked"
                ? "S-FOILS: ATTACK POSITION (+1 TO HIT)"
                : "S-FOILS: CLOSED / CRUISE (-2 TO HIT)"}
            </span>
          )}

          {isAttackFighter && (
            <span className="rounded-sm border border-cyan-400/60 bg-cyan-950/40 px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider text-cyan-300">
              ROLE SPEC: ATTACK FIGHTER (+1 ATK / SAVE DC)
            </span>
          )}
          {isBomber && (
            <span className="rounded-sm border border-amber-400/60 bg-amber-950/40 px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider text-amber-300">
              ROLE SPEC: BOMBER (+1 WEAPON DMG)
            </span>
          )}
          {isGunshipSpec && (
            <span className="rounded-sm border border-cyan-400/60 bg-cyan-950/40 px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider text-cyan-300">
              ROLE SPEC: GUNSHIP (+1 WEAPON DMG)
            </span>
          )}
          {isMissileBoatSpec && (
            <span className="rounded-sm border border-amber-400/60 bg-amber-950/40 px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider text-amber-300">
              ROLE SPEC: MISSILE BOAT (DISADV ON ORDNANCE SAVES)
            </span>
          )}
          {hasBomberRoleMastery && (
            <span className="rounded-sm border border-rose-500/60 bg-rose-950/40 px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider text-rose-300">
              ROLE MASTERY: BOMBER (DISADV ON SAVES FOR LARGER TARGETS)
            </span>
          )}
          {isGunshipMastery && (
            <span className="rounded-sm border border-cyan-500/60 bg-cyan-950/40 px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider text-cyan-300">
              ROLE MASTERY: GUNSHIP (EXTRA CRIT DIE)
            </span>
          )}
          {isMissileBoatMastery && (
            <span className="rounded-sm border border-amber-500/60 bg-amber-950/40 px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider text-amber-300">
              ROLE MASTERY: MISSILE BOAT (MIXED MUNITIONS)
            </span>
          )}
          
          {isArmed ? (
            <span className="rounded-sm border border-red-alert/80 bg-red-alert/20 px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] text-red-alert text-glow-amber animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.4)]">
              WEAPONS: HOT
            </span>
          ) : (
            <span className="rounded-sm border border-emerald-500/80 bg-emerald-950/40 px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.2)]">
              WEAPONS: SAFE
            </span>
          )}
        </div>
      </div>

      {/* STATION CREW ASSIGNMENT & COMBAT TURN HUD */}
      <div className="rounded-md border border-cyan-neon/40 bg-black/40 p-3 shadow-[0_0_15px_rgba(0,255,255,0.05)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-neon uppercase tracking-wider">
              <Users className="h-4 w-4 text-cyan-neon" />
              <span>Console Personnel:</span>
            </div>

            {assignedConsoleCrew.length === 0 ? (
              <span className="text-xs text-slate-500 italic bg-slate-900/60 border border-slate-800 px-3 py-1 rounded">
                Console Uncrewed — Select personnel to assign
              </span>
            ) : (
              assignedConsoleCrew.map((member, idx) => {
                const isLead = idx === 0
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
                      className="text-slate-500 hover:text-rose-400 transition ml-1 cursor-pointer"
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
                    onAssignCrew(e.target.value, "weapons")
                  }
                }}
                className="rounded bg-slate-950 border border-slate-700 px-2 py-1 text-xs text-cyan-300 focus:outline-none focus:border-cyan-neon"
              >
                <option value="" disabled>
                  + Assign Weapons Crew...
                </option>
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
      </div>

      {/* CORE SHIP STATS & COMBAT RESOURCES */}
      <div className="grid gap-4 grid-cols-1 w-full">
        <ShipStats shipConfig={shipConfig} systemDamageLevel={systemDamageLevel} />
        <div className="flex flex-col rounded-md border border-bridge-border bg-bridge-panel p-4 gap-4 w-full">
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
            <div className="flex flex-col gap-3 pt-3 border-t border-bridge-border/60 w-full">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-400 font-bold tracking-wider uppercase">Shared Reactor Pool</span>
                <span className="font-bold text-amber-400">{sharedPoolDice} / 2</span>
              </div>
              <div className="flex items-center gap-1.5 w-full">
                {Array.from({ length: 2 }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-3 flex-1 rounded-sm inline-block ${
                      i < sharedPoolDice 
                        ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" 
                        : "bg-black/80 border border-bridge-border"
                    }`}
                  />
                ))}
              </div>

              {!canSpendStation && canSpendShared && (
                <button
                  onClick={() => handleCustomConsume(1)}
                  className="w-full mt-1 rounded bg-amber-500/20 border border-amber-400/60 py-2 text-xs font-bold tracking-wider text-amber-300 hover:bg-amber-500/30 transition-colors shadow-[0_0_10px_rgba(251,191,36,0.2)] cursor-pointer"
                >
                  CONSUME SHARED REACTOR DIE ({sharedPoolDice} REMAINING)
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* INSTALLED STATION MODIFICATIONS */}
      <section className="rounded-md border border-bridge-border bg-bridge-panel p-4">
        <h3 className="mb-3 text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase border-b border-bridge-border/60 pb-1">
          INSTALLED STATION MODIFICATIONS
        </h3>
        <StationModifications 
          station="Weapons" 
          installedMods={installedMods} 
          onRemoveMod={onRemoveMod} 
        />
      </section>

      {/* DYNAMIC WEAPON BATTERIES & LAUNCHERS */}
      <section className="rounded-md border border-bridge-border bg-bridge-panel p-4">
        <div className="flex items-center justify-between mb-3 border-b border-bridge-border/60 pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase">
              Active Batteries &amp; Hardpoint Fire Controls ({mountedWeapons.length} Mounted)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsArmed((prev) => !prev)}
              className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider font-mono border transition-all cursor-pointer flex items-center gap-1.5 ${
                isArmed
                  ? "bg-red-500/20 border-red-500 text-red-300 hover:bg-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse"
                  : "bg-emerald-500/20 border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/30 shadow-[0_0_8px_rgba(52,211,153,0.2)]"
              }`}
              title={isArmed ? "Click to set weapons to SAFE" : "Click to ARM weapons (WEAPONS HOT)"}
            >
              {isArmed ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  <span>DISARM (SET SAFE)</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ARM WEAPONS (HOT)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Alerts Summary Line */}
        {(isAttackFighter || isBomber || hasBomberRoleMastery || hasSFoils || isGunshipSpec || isMissileBoatSpec || hasSystemDamageAtkDisadv || isBlinded || isIonized || isInvisible) && (
          <div className="text-[10px] font-mono text-cyan-300 mb-3 bg-black/40 p-2 rounded border border-bridge-border/40">
            {isBlinded && <strong className="text-red-400">Blinded (Disadv) | </strong>}
            {isIonized && <strong className="text-red-400">Ionized (Disadv) | </strong>}
            {isInvisible && <strong className="text-purple-300">Invisible (Adv) | </strong>}
            {hasSystemDamageAtkDisadv && <strong className="text-red-400">System Damage Lvl {systemDamageLevel} (Disadv) | </strong>}
            {hasSFoils && (sFoilsMode === "unlocked" ? "S-Foils: +1 to hit" : "S-Foils: -2 to hit")}
            {isAttackFighter && " | Attack Fighter: +1 to attack rolls and save DCs"}
            {isBomber && " | Bomber: +1 to damage rolls"}
            {isGunshipSpec && " | Gunship: +1 to damage rolls"}
            {hasBomberRoleMastery && " | Bomber Mastery: Target Save Disadvantage"}
            {isMissileBoatSpec && " | Missile Boat: Target Save Disadvantage"}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                className={`rounded-lg border bg-black/40 p-4 flex flex-col justify-between gap-3 relative transition-all ${
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
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-cyan-neon tracking-wide truncate">
                          {w.name}
                        </h4>
                        <span className="text-[8px] font-bold uppercase px-1 rounded border border-bridge-border text-muted-foreground shrink-0">
                          {isOrdnance ? "ORDNANCE" : (w.damageType || "ENERGY").toUpperCase()}
                        </span>
                        {isTurret && (
                          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.2 rounded border font-mono shrink-0 ${
                            isManned
                              ? "border-cyan-400/50 bg-cyan-950/40 text-cyan-300"
                              : "border-amber-400/50 bg-amber-950/40 text-amber-300 animate-pulse"
                          }`}>
                            {isManned ? "TURRET (MANNED)" : "TURRET (UNMANNED)"}
                          </span>
                        )}
                      </div>

                      {/* Turret Arc & Crew Assignment Row */}
                      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-bridge-border/40">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Compass className={`w-3.5 h-3.5 shrink-0 ${isManned ? "text-cyan-neon" : "text-amber-400"}`} />
                            <span
                              className={`text-[10px] font-mono tracking-wider uppercase font-bold truncate ${
                                isManned ? "text-cyan-neon" : "text-amber-400"
                              }`}
                            >
                              {isManned ? "ARC: 360° UNLIMITED" : "ARC: FORWARD ONLY"}
                            </span>
                          </div>

                          {!isManned && isTurret && (
                            <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-pulse shrink-0">
                              DISADVANTAGE
                            </span>
                          )}
                        </div>

                        {isTurret && (
                          <div className="flex flex-col gap-1.5 bg-slate-950/80 p-2 rounded border border-bridge-border/60">
                            <div className="flex items-center justify-between text-[10px]">
                              <div className="flex items-center gap-1.5">
                                <Crosshair className="h-3 w-3 text-cyan-400 shrink-0" />
                                <span className="font-bold text-muted-foreground uppercase tracking-wider">
                                  Stationed Gunner:
                                </span>
                              </div>
                              <span className={`font-bold ${assignedGunner ? "text-cyan-300" : "text-amber-400 italic"}`}>
                                {assignedGunner ? assignedGunner.name : "Unassigned"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 pt-1 border-t border-bridge-border/30">
                              {assignedGunner ? (
                                <div className="flex items-center justify-between w-full">
                                  <button
                                    type="button"
                                    onClick={() => onToggleTurn && onToggleTurn(assignedGunner.id)}
                                    className="flex items-center gap-1 text-[10px] transition cursor-pointer"
                                  >
                                    {assignedGunner.hasTakenTurnThisRound ? (
                                      <>
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                        <span className="text-emerald-400 font-bold">Turn Taken</span>
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="h-3.5 w-3.5 text-amber-400" />
                                        <span className="text-amber-400 font-bold">Turn Pending</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onAssignCrew && onAssignCrew(assignedGunner.id, "crew_quarters")}
                                    className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-950/40 border border-rose-500/40 text-rose-300 hover:bg-rose-900/50 transition cursor-pointer"
                                  >
                                    Vacate
                                  </button>
                                </div>
                              ) : (
                                onAssignCrew && (
                                  <select
                                    value=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        onAssignCrew(e.target.value, turretCompartmentId)
                                      }
                                    }}
                                    className="w-full rounded bg-black border border-slate-700 px-2 py-1 text-xs text-cyan-300 focus:outline-none focus:border-cyan-neon cursor-pointer"
                                  >
                                    <option value="" disabled>
                                      + Deploy Gunner to Turret...
                                    </option>
                                    {availablePersonnel
                                      .filter((p) => p.location !== turretCompartmentId)
                                      .map((p) => (
                                        <option key={p.id} value={p.id}>
                                          {p.name}
                                        </option>
                                      ))}
                                  </select>
                                )
                              )}
                            </div>
                          </div>
                        )}
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
                      onClick={() => openWizard(w)}
                      disabled={!isArmed || isFiredThisRound || (!isOrdnance ? isOverheated : !isLauncherArmed)}
                      className={`col-span-2 rounded border py-2 text-xs font-bold tracking-wider font-mono flex items-center justify-center gap-1.5 transition-all ${
                        !isArmed
                          ? "bg-slate-900 border-slate-700 text-slate-500 cursor-not-allowed opacity-60"
                          : isFiredThisRound
                          ? "bg-slate-900 border-slate-700 text-slate-500 cursor-not-allowed"
                          : (!isOrdnance ? isOverheated : !isLauncherArmed)
                          ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-40"
                          : "border-cyan-neon/60 bg-cyan-neon/20 text-cyan-neon hover:bg-cyan-neon/30 shadow-[0_0_10px_rgba(0,255,255,0.2)] cursor-pointer"
                      }`}
                      title={
                        !isArmed
                          ? "Weapons are SAFE. Click 'ARM WEAPONS' above to enable fire controls."
                          : isFiredThisRound
                          ? "Weapon already fired this round. Locks until Reactor is Cycled."
                          : "Engage target fire controls"
                      }
                    >
                      {isFiredThisRound ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>FIRED THIS ROUND</span>
                        </>
                      ) : (
                        <>
                          <Crosshair className="w-3.5 h-3.5 text-cyan-neon" />
                          <span>{!isArmed ? "SAFE (ARM REQ)" : "ENGAGE TARGET"}</span>
                        </>
                      )}
                    </button>

                    {!isOrdnance ? (
                      <button
                        onClick={() => handleCoolMountedWeapon(instanceKey)}
                        disabled={heat === 0}
                        className="rounded border border-bridge-border bg-black/60 py-2 text-xs font-bold text-muted-foreground hover:text-cyan-neon hover:border-cyan-neon/40 disabled:opacity-30 font-mono cursor-pointer"
                      >
                        FLUSH
                      </button>
                    ) : !isLauncherArmed ? (
                      <button
                        onClick={() => setWeaponArmModal({ weapon: w })}
                        className="rounded border border-emerald-500/60 bg-emerald-500/20 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/30 font-mono cursor-pointer tracking-wider flex items-center justify-center gap-1"
                      >
                        <PackagePlus className="w-3 h-3" />
                        ARM
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDisarmLauncher(instanceKey)}
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
      </section>

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
                    No compatible {family} ammunition in cargo reserves! Requisition or scavenge warheads in the magazine below.
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
                onClick={() => setOrdnanceDisarmModal(null)}
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

        // Advantage/Disadvantage net calculation via combat-roller
        const hasAdvantage = isInvisible
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

        // Trigger digital d20 roll via combat-roller
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
            // Auto calculate critical damage
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

        // Trigger damage roll via combat-roller
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
                  onClick={closeWizard}
                  className="rounded p-1 text-muted-foreground hover:text-white transition-colors cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Status Alert Banners */}
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
                <div className="p-2.5 rounded border border-red-500/80 bg-red-950/60 text-xs flex items-center justify-between font-mono animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]">
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
                        ? "ADVANTAGE (Roll 2d20, Take Higher) — Source: Invisibility"
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
                            onClick={() => completeAttack(currentHeatCost)}
                            className="p-3 rounded border border-red-500/50 bg-red-500/10 text-red-400 font-bold uppercase text-xs flex items-center justify-center gap-1.5 hover:bg-red-500/20 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            Miss ({isOrdnance ? "1 Warhead" : `+${currentHeatCost} Heat`})
                          </button>

                          <button
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
                            onClick={() => completeAttack(currentHeatCost)}
                            className="p-3 rounded border border-amber-500/50 bg-amber-500/10 text-amber-400 font-bold uppercase text-xs flex items-center justify-center gap-2 hover:bg-amber-500/20 cursor-pointer"
                          >
                            Target Saved (0 Damage)
                          </button>

                          <button
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

      {/* ORDNANCE CATALOG */}
      <section className="rounded-md border border-bridge-border bg-bridge-panel p-4">
        <div className="flex justify-between items-center mb-3 border-b border-bridge-border/60 pb-2">
          <div>
            <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase">
              Ordnance Reserve, Hardpoint Arming &amp; Requisition
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Magazines &amp; Launch Silos // Arming fills launcher to capacity (4 max) in 1 min. Disarming returns warheads to reserve in 1 min.
            </p>
          </div>
          <span className="text-xs text-amber-300 font-semibold bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded">
            Requisition Total: {totalRequisitionCost.toLocaleString()} cr
          </span>
        </div>

        <div className="overflow-x-auto max-h-[440px] overflow-y-auto border border-bridge-border/40 rounded">
          <table className="w-full text-left text-xs relative">
            <thead className="sticky top-0 bg-slate-950 border-b border-bridge-border/60 text-[10px] uppercase text-muted-foreground z-10">
              <tr>
                <th className="p-2">Ordnance Type</th>
                <th className="p-2">Category</th>
                <th className="p-2">Payload (Standard)</th>
                <th className="p-2">In Reserve</th>
                <th className="p-2">Magazine Actions</th>
                <th className="p-2">Order Qty</th>
                <th className="p-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bridge-border/20 text-cyan-neon/90">
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
                    <td className="p-2 font-medium text-cyan-neon">{item.name}</td>
                    <td className="p-2 text-[10px] text-muted-foreground">{item.category}</td>
                    <td className="p-2 text-[10px] text-amber-300 font-mono">{item.damage} {item.damageType}</td>
                    <td className="p-2 font-bold">{item.currentReserve}</td>

                    <td className="p-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setWeaponArmModal({ weapon: matchingInstalled[0] })}
                          disabled={!hasMatchingLauncher || item.currentReserve <= 0}
                          className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase transition-all flex items-center gap-1 ${
                            !hasMatchingLauncher || item.currentReserve <= 0
                              ? "bg-red-950/20 border-red-500/30 text-slate-500 cursor-not-allowed opacity-40"
                              : "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30 cursor-pointer"
                          }`}
                          title="Select a compatible launcher to arm with this ordnance"
                        >
                          <ArrowDownToLine className="w-2.5 h-2.5" />
                          Arm Full
                        </button>

                        {isArmedInAnyWeapon && (
                          <button
                            onClick={() => setOrdnanceDisarmModal({ ordnance: item })}
                            className="px-2 py-0.5 rounded border border-amber-500/50 bg-amber-500/10 text-[9px] font-bold text-amber-300 hover:bg-amber-500/20 uppercase transition-all flex items-center gap-1 cursor-pointer"
                            title="Unload this ordnance from armed weapon tubes back into reserve"
                          >
                            <Undo2 className="w-2.5 h-2.5" />
                            Unload
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        value={item.requisitionQty}
                        onChange={(e) => handleRequisitionChange(item.id, parseInt(e.target.value) || 0)}
                        className="w-14 rounded bg-black/60 border border-bridge-border px-1.5 py-0.5 text-xs text-cyan-neon text-center focus:outline-none focus:border-cyan-neon"
                      />
                    </td>

                    <td className="p-2 text-right font-semibold text-amber-300">
                      {(item.requisitionQty * item.costPerUnit).toLocaleString()} cr
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}