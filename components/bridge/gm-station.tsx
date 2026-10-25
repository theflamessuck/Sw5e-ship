"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import {
  ShieldAlert,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Radio,
  Bookmark,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Swords,
  Activity,
  Users,
  UserPlus,
  ChevronDown,
  ChevronRight,
  Shield,
  Crosshair,
  FileText,
  XCircle,
  Skull,
  Zap,
  Target,
  Sparkles,
  Settings,
  RotateCw,
  ListFilter,
  Search,
  Filter,
  Layers,
  ArrowUp,
  ArrowDown,
  SkipBack,
  AlertTriangle,
  Flame,
  RadioTower,
  Dices,
  Bomb,
  Wrench
} from "lucide-react"
import type { ActiveStatus } from "./defense-station"
import type { ManifestMember } from "./bridge-dashboard"
import {
  DEFAULT_NPC_SHIP_BESTIARY,
  type NpcAction,
  type NpcShipStatblock
} from "@/lib/data/npc-ship-bestiary"

export type { NpcAction, NpcShipStatblock }

export interface SensorContact {
  id: string
  name: string
  classification: string
  distance: string
  scanDc: number
  isRevealed: boolean
  gmNotes: string
  hullCurrent: number
  hullMax: number
  shieldsCurrent: number
  shieldsMax: number
  armorClass: number
  initiative: number
  damageReduction?: number
  damageThreshold?: number
  statblock?: NpcShipStatblock
}

export interface EnemyShip {
  id: string
  name: string
  initiative: number
  hullCurrent: number
  hullMax: number
  shieldsCurrent: number
  shieldsMax: number
  armorClass: number
  damageReduction?: number
  damageThreshold?: number
  hasTakenTurn: boolean
  notes?: string
  contactId?: string
  statblock?: NpcShipStatblock
  orderIndex?: number
  isExploded?: boolean
}

export interface CombatTurnState {
  isInCombat: boolean
  round: number
  activeShipName?: string
  nextShipName?: string
  manualPlayerInitOverride: number | null
  playerShipOrderTie: number
  playerShipHasActed: boolean
  enemyShips: EnemyShip[]
}

interface GmStationProps {
  contacts: SensorContact[]
  onAddContact: (contact: Omit<SensorContact, "id">) => void
  onAddContacts?: (contacts: Omit<SensorContact, "id">[]) => void
  onRemoveContact: (id: string) => void
  onClearContacts?: () => void
  onToggleReveal: (id: string) => void
  shipStatuses?: ActiveStatus[]
  onAddStatus?: (status: ActiveStatus) => void
  onRemoveStatus?: (statusId: string) => void
  manifest?: ManifestMember[]
  onToggleTurn?: (memberId: string) => void
  onUpdateInitiative?: (memberId: string, initiative: number) => void
  onCycleReactor?: (generatedAmount?: number) => void
  currentHull?: number
  maxHull?: number
  onHullChange?: (current: number, max: number) => void
  currentShields?: number
  maxShields?: number
  onShieldChange?: (current: number, max: number, temp?: number) => void
  systemDamageLevel?: number
  onUpdateSystemDamageLevel?: (level: number | ((prev: number) => number)) => void
  availablePowerDice?: number
  maxPowerDice?: number
  combatState?: CombatTurnState
  onUpdateCombatState?: (
    updater:
      | Partial<CombatTurnState>
      | ((prev: CombatTurnState) => CombatTurnState)
  ) => void
  onCombatStateChange?: (combatState: CombatTurnState) => void
}

const CALLSIGNS = [
  "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta",
  "Eta", "Theta", "Iota", "Kappa", "Lambda", "Mu"
]

// Dice roll parser for damage expressions (e.g. "2d8 + 3", "1d6+2", "4d10")
function rollDiceExpression(expr: string): { total: number; rolls: number[]; modifier: number } {
  const clean = expr.replace(/\s+/g, "").toLowerCase()
  const match = clean.match(/^(\d+)d(\d+)([+-]\d+)?/)
  if (!match) {
    const rawVal = parseInt(clean, 10) || 0
    return { total: rawVal, rolls: [rawVal], modifier: 0 }
  }

  const count = parseInt(match[1], 10)
  const sides = parseInt(match[2], 10)
  const mod = match[3] ? parseInt(match[3], 10) : 0

  const rolls: number[] = []
  let sum = 0
  for (let i = 0; i < count; i++) {
    const r = Math.floor(Math.random() * sides) + 1
    rolls.push(r)
    sum += r
  }
  return { total: Math.max(0, sum + mod), rolls, modifier: mod }
}

export function GmStation({
  contacts = [],
  onAddContact,
  onAddContacts,
  onRemoveContact,
  onClearContacts,
  onToggleReveal,
  shipStatuses = [],
  onAddStatus,
  onRemoveStatus,
  manifest = [],
  onToggleTurn,
  onUpdateInitiative,
  onCycleReactor,
  currentHull = 40,
  maxHull = 40,
  onHullChange,
  currentShields = 24,
  maxShields = 24,
  onShieldChange,
  systemDamageLevel = 0,
  onUpdateSystemDamageLevel,
  availablePowerDice = 4,
  maxPowerDice = 4,
  combatState,
  onUpdateCombatState,
  onCombatStateChange,
}: GmStationProps) {
  // Safe initializer: flushes outdated localStorage cache if missing threatClassification
  const [bestiaryList, setBestiaryList] = useState<NpcShipStatblock[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sw5e_custom_bestiary")
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].threatClassification) {
            return parsed
          } else {
            localStorage.removeItem("sw5e_custom_bestiary")
          }
        } catch (e) {
          console.error("Failed to parse custom bestiary", e)
        }
      }
    }
    return DEFAULT_NPC_SHIP_BESTIARY
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sw5e_custom_bestiary", JSON.stringify(bestiaryList))
    }
  }, [bestiaryList])

  // Extract synced combat state with resilient fallbacks
  const enemyShips = useMemo(() => combatState?.enemyShips || [], [combatState?.enemyShips])
  const combatRound = combatState?.round || 1
  const manualPlayerInitOverride = combatState?.manualPlayerInitOverride ?? null
  const playerShipOrderTie = combatState?.playerShipOrderTie || 0
  const playerShipHasActed = combatState?.playerShipHasActed || false

  const [isCrewExpanded, setIsCrewExpanded] = useState<boolean>(true)
  const [lastDiceResult, setLastDiceResult] = useState<{
    shipName: string
    actionName: string
    type: "Hit" | "Damage"
    rollText: string
    detail: string
    isCrit?: boolean
    isFumble?: boolean
  } | null>(null)

  // Modal inspection
  const [activeInspectStatblock, setActiveInspectStatblock] = useState<{
    statblock: NpcShipStatblock
    shipId?: string
    currentHull?: number
    currentShields?: number
  } | null>(null)

  // Preset Bestiary Manager Modal state
  const [isPresetManagerOpen, setIsPresetManagerOpen] = useState<boolean>(false)
  const [managerTab, setManagerTab] = useState<"list" | "create">("list")
  const [managerTierFilter, setManagerTierFilter] = useState<string>("all")
  const [managerSearchQuery, setManagerSearchQuery] = useState<string>("")

  // Spawner Filter state
  const [spawnerTierFilter, setSpawnerTierFilter] = useState<string>("all")
  const [spawnerSearchQuery, setSpawnerSearchQuery] = useState<string>("")

  // Custom Preset Creation form state
  const [customPresetForm, setCustomPresetForm] = useState<Partial<NpcShipStatblock>>({
    name: "",
    faction: "Custom",
    tier: 1,
    tierOrCr: "CR 3 (Tier 1)",
    threatClassification: "Tactical Skirmisher (Elite)",
    size: "Small",
    shipType: "Gunship",
    classification: "Threat",
    armorClass: 14,
    hullMax: 30,
    shieldsMax: 15,
    damageReduction: 1,
    damageThreshold: 0,
    speed: "350 ft (7 hexes)",
    turningSpeed: "100 ft",
    stats: { str: 12, dex: 14, con: 12, int: 10, wis: 10, cha: 10 },
    scanDc: 12,
    distance: "15,000 km",
    defaultNotes: "Custom starship profile.",
    traits: [],
    actions: [
      {
        name: "Heavy Blaster Cannon",
        type: "Action",
        attackBonus: 4,
        range: "600/2,400 ft",
        damage: "2d8 + 2",
        damageType: "Energy",
        description: "Ranged Ship Attack: +4 to hit. Hit: 11 (2d8 + 2) energy damage."
      }
    ],
    bonusActions: [],
    reactions: []
  })

  // Sector Contact Spawner Inputs (Manual Init removed)
  const [name, setName] = useState("")
  const [spawnQuantity, setSpawnQuantity] = useState<number>(1)
  const [classification, setClassification] = useState<"Vessel" | "Threat" | "Anomaly" | "Debris" | "Station">("Threat")
  const [distance, setDistance] = useState("10,000 km")
  const [scanDc, setScanDc] = useState(12)
  const [contactHull, setContactHull] = useState<string>("20")
  const [contactShields, setContactShields] = useState<string>("0")
  const [contactAC, setContactAC] = useState<string>("13")
  const [contactDR, setContactDR] = useState<string>("0")
  const [contactDT, setContactDT] = useState<string>("0")
  const [gmNotes, setGmNotes] = useState("")
  const [activePresetObject, setActivePresetObject] = useState<NpcShipStatblock | undefined>(undefined)

  // Quick Hostile Inputs
  const [newEnemyName, setNewEnemyName] = useState("")
  const [newEnemyInit, setNewEnemyInit] = useState("14")
  const [newEnemyHull, setNewEnemyHull] = useState("20")
  const [newEnemyShields, setNewEnemyShields] = useState("0")
  const [newEnemyAC, setNewEnemyAC] = useState("13")
  const [newEnemyDR, setNewEnemyDR] = useState("0")

  // Starship Condition Toggle Handler
  const handleToggleCondition = (conditionTitle: string, defaultEffect: string) => {
    const titleLower = conditionTitle.toLowerCase()
    const existing = shipStatuses.find(
      (s) =>
        s.title.toLowerCase() === titleLower ||
        s.id?.toLowerCase().includes(titleLower)
    )

    if (existing) {
      onRemoveStatus?.(existing.id)
    } else {
      onAddStatus?.({
        id: `cond-${titleLower}-${Date.now()}`,
        title: conditionTitle.toUpperCase(),
        effect: defaultEffect,
        duration: "Until Cleared by GM",
      })
    }
  }

  const calculatedPlayerShipInit = useMemo(() => {
    const deployedMembers = manifest.filter((m) => !m.isPassenger)
    if (deployedMembers.length === 0) return 10
    const inits = deployedMembers.map((m) => Number(m.individualInitiative) || 0)
    return Math.min(...inits)
  }, [manifest])

  const effectivePlayerShipInit = Number(
    manualPlayerInitOverride !== null ? manualPlayerInitOverride : calculatedPlayerShipInit
  ) || 0

  const crewActionStats = useMemo(() => {
    const deployed = manifest.filter((m) => !m.isPassenger)
    const acted = deployed.filter((m) => m.hasTakenTurnThisRound)
    return {
      total: deployed.length,
      acted: acted.length,
      allDone: deployed.length > 0 && acted.length === deployed.length,
    }
  }, [manifest])

  // ROBUST INITIATIVE SORT: Guarantees strict numeric order & supports manual tie adjustments
  const shipQueue = useMemo(() => {
    const playerShipEntry = {
      id: "player-vessel",
      name: "Player Vessel",
      isPlayerShip: true,
      initiative: Number(effectivePlayerShipInit) || 0,
      orderTie: playerShipOrderTie,
      hasTakenTurn: playerShipHasActed || crewActionStats.allDone,
      hull: `${currentHull}/${maxHull} HP`,
      shields: `${currentShields}/${maxShields} SP`,
      armorClass: "Ship AC",
      notes: "Lowest Crew Initiative",
      damageReduction: 0,
      damageThreshold: 0,
      statblock: undefined,
      hullCurrent: currentHull,
      hullMax: maxHull,
      shieldsCurrent: currentShields,
      shieldsMax: maxShields,
      isDisabled: currentHull <= 0,
    }

    const enemies = enemyShips.map((e, idx) => ({
      id: e.id,
      name: e.name,
      isPlayerShip: false,
      initiative: Number(e.initiative) || 0,
      orderTie: e.orderIndex ?? idx,
      hasTakenTurn: e.hasTakenTurn,
      hull: `${e.hullCurrent}/${e.hullMax} HP`,
      shields: `${e.shieldsCurrent}/${e.shieldsMax} SP`,
      armorClass: `AC ${e.armorClass}`,
      damageReduction: e.damageReduction || 0,
      damageThreshold: e.damageThreshold || 0,
      notes: e.notes || "",
      statblock: e.statblock,
      hullCurrent: e.hullCurrent,
      hullMax: e.hullMax,
      shieldsCurrent: e.shieldsCurrent,
      shieldsMax: e.shieldsMax,
      isDisabled: e.hullCurrent <= 0,
      isExploded: e.isExploded || false,
    }))

    return [playerShipEntry, ...enemies].sort((a, b) => {
      const diff = b.initiative - a.initiative
      if (diff !== 0) return diff
      return (b.orderTie ?? 0) - (a.orderTie ?? 0)
    })
  }, [
    effectivePlayerShipInit,
    playerShipOrderTie,
    playerShipHasActed,
    crewActionStats.allDone,
    currentHull,
    maxHull,
    currentShields,
    maxShields,
    enemyShips
  ])

  // Combat status flags & active/next turn calculations
  const isInCombat = enemyShips.length > 0

  // Turn calculation with auto-skipping for disabled (0 HP) ships
  const { activeTurnShip, nextTurnShip } = useMemo(() => {
    if (!isInCombat || shipQueue.length === 0) {
      return { activeTurnShip: undefined, nextTurnShip: undefined }
    }

    // Active ship is the first ship that hasn't taken a turn AND is not disabled
    const activeCandidates = shipQueue.filter((s) => !s.hasTakenTurn && !s.isDisabled && !s.isExploded)
    const active = activeCandidates[0] || undefined

    // Next ship is the following non-disabled candidate, or wrap to first active in next round
    let next: typeof shipQueue[0] | undefined
    if (activeCandidates.length > 1) {
      next = activeCandidates[1]
    } else {
      const roundCandidates = shipQueue.filter((s) => !s.isDisabled && !s.isExploded)
      next = roundCandidates[0]
    }

    return { activeTurnShip: active, nextTurnShip: next }
  }, [isInCombat, shipQueue])

  // Stable sync: Updates active and next names only when a real change occurs to prevent render loops
  const lastBroadcastRef = useRef<string>("")
  useEffect(() => {
    const key = `${isInCombat}-${combatRound}-${activeTurnShip?.name}-${nextTurnShip?.name}`
    if (lastBroadcastRef.current !== key) {
      lastBroadcastRef.current = key

      if (
        combatState?.isInCombat !== isInCombat ||
        combatState?.round !== combatRound ||
        combatState?.activeShipName !== activeTurnShip?.name ||
        combatState?.nextShipName !== nextTurnShip?.name
      ) {
        onUpdateCombatState?.({
          isInCombat,
          round: combatRound,
          activeShipName: activeTurnShip?.name,
          nextShipName: nextTurnShip?.name,
        })
      }

      onCombatStateChange?.({
        isInCombat,
        round: combatRound,
        activeShipName: activeTurnShip?.name,
        nextShipName: nextTurnShip?.name,
        manualPlayerInitOverride,
        playerShipOrderTie,
        playerShipHasActed,
        enemyShips,
      })
    }
  }, [
    isInCombat,
    combatRound,
    activeTurnShip?.name,
    nextTurnShip?.name,
    combatState?.isInCombat,
    combatState?.round,
    combatState?.activeShipName,
    combatState?.nextShipName,
    manualPlayerInitOverride,
    playerShipOrderTie,
    playerShipHasActed,
    enemyShips,
    onUpdateCombatState,
    onCombatStateChange,
  ])

  // HP & SP adjustments for enemy ships
  const handleAdjustEnemyHealth = (shipId: string, type: "hull" | "shields", delta: number) => {
    const updated = enemyShips.map((e) => {
      if (e.id !== shipId) return e
      if (type === "hull") {
        const nextHull = Math.max(0, Math.min(e.hullMax, e.hullCurrent + delta))
        return { ...e, hullCurrent: nextHull }
      } else {
        const nextShields = Math.max(0, Math.min(e.shieldsMax, e.shieldsCurrent + delta))
        return { ...e, shieldsCurrent: nextShields }
      }
    })
    onUpdateCombatState?.({ enemyShips: updated })
  }

  // Set precise values for enemy health
  const handleSetEnemyHealth = (shipId: string, type: "hull" | "shields", value: number) => {
    const updated = enemyShips.map((e) => {
      if (e.id !== shipId) return e
      if (type === "hull") {
        return { ...e, hullCurrent: Math.max(0, Math.min(e.hullMax, value)) }
      } else {
        return { ...e, shieldsCurrent: Math.max(0, Math.min(e.shieldsMax, value)) }
      }
    })
    onUpdateCombatState?.({ enemyShips: updated })
  }

  // Explode / Scuttle ship manually by GM decision
  const handleExplodeEnemyShip = (shipId: string) => {
    if (confirm("Catastrophic Explosion? The vessel will be utterly destroyed and obliterated, leaving zero salvage.")) {
      const updated = enemyShips.filter((e) => e.id !== shipId)
      onUpdateCombatState?.({
        enemyShips: updated,
        isInCombat: updated.length > 0,
      })
    }
  }

  // Roll Attack "To Hit" button
  const handleRollToHit = (shipName: string, action: NpcAction) => {
    const bonus = action.attackBonus ?? 0
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + bonus
    const isCrit = d20 === 20
    const isFumble = d20 === 1

    setLastDiceResult({
      shipName,
      actionName: action.name,
      type: "Hit",
      rollText: isCrit ? `NAT 20 CRITICAL! (${total})` : isFumble ? `NAT 1 FUMBLE! (${total})` : `${total} TO HIT`,
      detail: `[d20 roll: ${d20}] + [bonus: ${bonus}] = ${total}`,
      isCrit,
      isFumble,
    })
  }

  // Roll Damage button
  const handleRollDamage = (shipName: string, action: NpcAction) => {
    if (!action.damage) return
    const res = rollDiceExpression(action.damage)
    const typeStr = action.damageType ? ` ${action.damageType}` : ""

    setLastDiceResult({
      shipName,
      actionName: action.name,
      type: "Damage",
      rollText: `${res.total}${typeStr}`,
      detail: `Dice: [${res.rolls.join(" + ")}]${res.modifier ? ` ${res.modifier >= 0 ? `+ ${res.modifier}` : `- ${Math.abs(res.modifier)}`}` : ""}`,
    })
  }

  // Handle direct initiative edits on enemy ships in combat
  const handleUpdateEnemyInitiative = (shipId: string, newInit: number) => {
    const updated = enemyShips.map((e) => (e.id === shipId ? { ...e, initiative: newInit } : e))
    onUpdateCombatState?.({ enemyShips: updated })
  }

  // Handle direct manual nudges up/down for ties
  const handleNudgeOrder = (shipId: string, direction: "up" | "down") => {
    const delta = direction === "up" ? 1 : -1
    if (shipId === "player-vessel") {
      onUpdateCombatState?.((prev) => ({
        ...prev,
        playerShipOrderTie: (prev.playerShipOrderTie || 0) + delta,
      }))
    } else {
      const updated = enemyShips.map((e) =>
        e.id === shipId ? { ...e, orderIndex: (e.orderIndex ?? 0) + delta } : e
      )
      onUpdateCombatState?.({ enemyShips: updated })
    }
  }

  const spawnerFilteredBestiary = useMemo(() => {
    return bestiaryList.filter((ship) => {
      const matchesTier = spawnerTierFilter === "all" || (ship.tier !== undefined && ship.tier.toString() === spawnerTierFilter)
      const query = spawnerSearchQuery.toLowerCase().trim()
      const matchesQuery =
        !query ||
        ship.name.toLowerCase().includes(query) ||
        (ship.faction && ship.faction.toLowerCase().includes(query)) ||
        (ship.shipType && ship.shipType.toLowerCase().includes(query)) ||
        (ship.threatClassification && ship.threatClassification.toLowerCase().includes(query))
      return matchesTier && matchesQuery
    })
  }, [bestiaryList, spawnerTierFilter, spawnerSearchQuery])

  const managerFilteredBestiary = useMemo(() => {
    return bestiaryList.filter((ship) => {
      const matchesTier = managerTierFilter === "all" || (ship.tier !== undefined && ship.tier.toString() === managerTierFilter)
      const query = managerSearchQuery.toLowerCase().trim()
      const matchesQuery =
        !query ||
        ship.name.toLowerCase().includes(query) ||
        (ship.faction && ship.faction.toLowerCase().includes(query)) ||
        (ship.threatClassification && ship.threatClassification.toLowerCase().includes(query))
      return matchesTier && matchesQuery
    })
  }, [bestiaryList, managerTierFilter, managerSearchQuery])

  // Next Turn with auto-skip past disabled (0 HP) vessels
  const handleNextTurnCycle = () => {
    // Find next ship that has not taken turn and is NOT disabled
    const nextShip = shipQueue.find((s) => !s.hasTakenTurn && !s.isDisabled && !s.isExploded)
    if (nextShip) {
      if (nextShip.isPlayerShip) {
        onUpdateCombatState?.({ playerShipHasActed: true })
      } else {
        const updated = enemyShips.map((e) =>
          e.id === nextShip.id ? { ...e, hasTakenTurn: true } : e
        )
        onUpdateCombatState?.({ enemyShips: updated })
      }
    } else {
      handleAdvanceRound()
    }
  }

  // Step back to the previous ship's turn
  const handlePreviousTurnCycle = () => {
    const actedShips = shipQueue.filter((s) => s.hasTakenTurn)

    if (actedShips.length > 0) {
      const lastActedShip = actedShips[actedShips.length - 1]
      if (lastActedShip.isPlayerShip) {
        onUpdateCombatState?.({ playerShipHasActed: false })
      } else {
        const updated = enemyShips.map((e) =>
          e.id === lastActedShip.id ? { ...e, hasTakenTurn: false } : e
        )
        onUpdateCombatState?.({ enemyShips: updated })
      }
    } else if (combatRound > 1) {
      const prevRound = combatRound - 1
      const lastShipIndex = shipQueue.length - 1
      const isPlayerLast = lastShipIndex === 0
      const updatedEnemies = enemyShips.map((e) => {
        const idx = shipQueue.findIndex((s) => s.id === e.id)
        return { ...e, hasTakenTurn: idx !== lastShipIndex }
      })

      onUpdateCombatState?.({
        round: prevRound,
        playerShipHasActed: !isPlayerLast,
        enemyShips: updatedEnemies,
      })
    }
  }

  const handleAdvanceRound = () => {
    const nextRound = combatRound + 1
    const resetEnemies = enemyShips.map((e) => ({ ...e, hasTakenTurn: false }))
    onUpdateCombatState?.({
      round: nextRound,
      playerShipHasActed: false,
      enemyShips: resetEnemies,
    })
    onCycleReactor?.()
  }

  // End Combat Protocol
  const handleEndCombat = () => {
    if (confirm("End Starship Combat? This will clear all hostile vessels from initiative and reset rounds to 1.")) {
      onUpdateCombatState?.({
        isInCombat: false,
        round: 1,
        playerShipHasActed: false,
        enemyShips: [],
        activeShipName: undefined,
        nextShipName: undefined,
      })
    }
  }

  // Clear all sensor contacts in sector
  const handleClearAllContacts = () => {
    if (confirm(`Remove all ${contacts.length} sensor contacts from the sector?`)) {
      if (onClearContacts) {
        onClearContacts()
      } else {
        contacts.forEach((c) => onRemoveContact(c.id))
      }
    }
  }

  const handleAddEnemy = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEnemyName.trim()) return

    const enemy: EnemyShip = {
      id: `enemy-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newEnemyName.trim(),
      initiative: Number(newEnemyInit) || 10,
      hullCurrent: parseInt(newEnemyHull, 10) || 20,
      hullMax: parseInt(newEnemyHull, 10) || 20,
      shieldsCurrent: parseInt(newEnemyShields, 10) || 0,
      shieldsMax: parseInt(newEnemyShields, 10) || 0,
      armorClass: parseInt(newEnemyAC, 10) || 12,
      damageReduction: parseInt(newEnemyDR, 10) || 0,
      hasTakenTurn: false,
      orderIndex: 0
    }

    const updated = [enemy, ...enemyShips]
    onUpdateCombatState?.({
      isInCombat: true,
      enemyShips: updated,
    })
    setNewEnemyName("")
  }

  const handleSelectPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTitle = e.target.value
    if (!selectedTitle) return

    const preset = bestiaryList.find((p) => p.name === selectedTitle)
    if (preset) {
      setName(preset.name)
      setClassification(preset.classification || "Threat")
      setScanDc(preset.scanDc || 12)
      setDistance(preset.distance || "15,000 km")
      setContactHull((preset.hullMax ?? 20).toString())
      setContactShields((preset.shieldsMax ?? 0).toString())
      setContactAC((preset.armorClass ?? 13).toString())
      setContactDR((preset.damageReduction ?? 0).toString())
      setContactDT((preset.damageThreshold ?? 0).toString())
      setGmNotes(preset.defaultNotes || "")
      setActivePresetObject(preset)
    }
  }

  // Atomic Batch Spawner with Automated Callsigns
  const handleSubmitContact = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const parsedHull = parseInt(contactHull, 10) || 20
    const parsedShields = parseInt(contactShields, 10) || 0
    const parsedAC = parseInt(contactAC, 10) || 12
    const parsedDR = parseInt(contactDR, 10) || 0
    const parsedDT = parseInt(contactDT, 10) || 0
    const qty = Math.max(1, Math.min(12, spawnQuantity))

    const newContactsBatch: Omit<SensorContact, "id">[] = []

    for (let i = 0; i < qty; i++) {
      const callsign = qty > 1 ? ` ${CALLSIGNS[i % CALLSIGNS.length]}` : ""

      newContactsBatch.push({
        name: `${name.trim()}${callsign}`,
        classification,
        distance,
        scanDc: Number(scanDc),
        isRevealed: false,
        gmNotes: qty > 1 ? `${gmNotes} [Wing Member ${i + 1}/${qty}]`.trim() : gmNotes,
        hullCurrent: parsedHull,
        hullMax: parsedHull,
        shieldsCurrent: parsedShields,
        shieldsMax: parsedShields,
        armorClass: parsedAC,
        damageReduction: parsedDR,
        damageThreshold: parsedDT,
        initiative: 10,
        statblock: activePresetObject,
      })
    }

    if (onAddContacts) {
      onAddContacts(newContactsBatch)
    } else {
      newContactsBatch.forEach((c) => onAddContact(c))
    }

    setName("")
    setGmNotes("")
    setSpawnQuantity(1)
    setActivePresetObject(undefined)
  }

  // Individual toggle into combat with d20 + DEX roll
  const handleToggleContactInInitiative = (contact: SensorContact) => {
    const existing = enemyShips.find((e) => e.contactId === contact.id)
    if (existing) {
      const updated = enemyShips.filter((e) => e.contactId !== contact.id)
      onUpdateCombatState?.({
        enemyShips: updated,
        isInCombat: updated.length > 0,
      })
    } else {
      const dexMod = contact.statblock?.stats?.dex !== undefined
        ? Math.floor((contact.statblock.stats.dex - 10) / 2)
        : 2
      const d20 = Math.floor(Math.random() * 20) + 1
      const rolledInit = d20 + dexMod

      const newShip: EnemyShip = {
        id: `combat-${contact.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        contactId: contact.id,
        name: contact.name,
        initiative: rolledInit,
        hullCurrent: contact.hullCurrent ?? 20,
        hullMax: contact.hullMax ?? 20,
        shieldsCurrent: contact.shieldsCurrent ?? 0,
        shieldsMax: contact.shieldsMax ?? 0,
        armorClass: contact.armorClass ?? 13,
        damageReduction: contact.damageReduction ?? 0,
        damageThreshold: contact.damageThreshold ?? 0,
        hasTakenTurn: false,
        notes: `Sector Contact (${contact.distance}) [Init: ${d20}+${dexMod}=${rolledInit}]`,
        statblock: contact.statblock,
        orderIndex: 0
      }
      const updated = [...enemyShips, newShip]
      onUpdateCombatState?.({
        enemyShips: updated,
        isInCombat: true,
      })
    }
  }

  // Mass Engage All Contacts with automatic d20 + DEX roll for each ship
  const handleEngageAllContacts = () => {
    const unengaged = contacts.filter(
      (c) => !enemyShips.some((e) => e.contactId === c.id)
    )
    if (unengaged.length === 0) return

    const additions: EnemyShip[] = unengaged.map((c, i) => {
      const dexMod = c.statblock?.stats?.dex !== undefined
        ? Math.floor((c.statblock.stats.dex - 10) / 2)
        : 2
      const d20 = Math.floor(Math.random() * 20) + 1
      const rolledInit = d20 + dexMod

      return {
        id: `combat-${c.id}-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        contactId: c.id,
        name: c.name,
        initiative: rolledInit,
        hullCurrent: c.hullCurrent ?? 20,
        hullMax: c.hullMax ?? 20,
        shieldsCurrent: c.shieldsCurrent ?? 0,
        shieldsMax: c.shieldsMax ?? 0,
        armorClass: c.armorClass ?? 13,
        damageReduction: c.damageReduction ?? 0,
        damageThreshold: c.damageThreshold ?? 0,
        hasTakenTurn: false,
        notes: `Sector Contact (${c.distance}) [Init: ${d20}+${dexMod}=${rolledInit}]`,
        statblock: c.statblock,
        orderIndex: 0
      }
    })

    const updated = [...enemyShips, ...additions]
    onUpdateCombatState?.({
      enemyShips: updated,
      isInCombat: true,
    })
  }

  const handleDeletePreset = (presetName: string) => {
    if (confirm(`Delete the "${presetName}" preset?`)) {
      setBestiaryList((prev) => prev.filter((p) => p.name !== presetName))
    }
  }

  const handleSaveCustomPreset = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customPresetForm.name?.trim()) {
      alert("Ship name is required!")
      return
    }

    const tierVal = (Number(customPresetForm.tier) || 0) as 0 | 1 | 2 | 3 | 4 | 5

    const newPreset: NpcShipStatblock = {
      name: customPresetForm.name.trim(),
      faction: customPresetForm.faction || "Custom",
      tier: tierVal,
      tierOrCr: customPresetForm.tierOrCr || `Tier ${tierVal}`,
      threatClassification: customPresetForm.threatClassification || "Combat Brawler (Mini-Boss)",
      size: customPresetForm.size || "Small",
      shipType: customPresetForm.shipType || "Starfighter",
      classification: customPresetForm.classification || "Threat",
      armorClass: Number(customPresetForm.armorClass) || 13,
      hullMax: Number(customPresetForm.hullMax) || 20,
      shieldsMax: Number(customPresetForm.shieldsMax) || 0,
      damageReduction: Number(customPresetForm.damageReduction) || 0,
      damageThreshold: Number(customPresetForm.damageThreshold) || 0,
      speed: customPresetForm.speed || "350 ft (7 hexes)",
      turningSpeed: customPresetForm.turningSpeed || "100 ft",
      stats: customPresetForm.stats || { str: 10, dex: 14, con: 12, int: 10, wis: 10, cha: 10 },
      savingThrows: customPresetForm.savingThrows,
      skills: customPresetForm.skills,
      damageResistances: customPresetForm.damageResistances,
      senses: customPresetForm.senses || "Passive Scan 12",
      scanDc: Number(customPresetForm.scanDc) || 12,
      distance: customPresetForm.distance || "15,000 km",
      defaultNotes: customPresetForm.defaultNotes || "Custom vessel profile.",
      traits: customPresetForm.traits || [],
      actions: customPresetForm.actions || [
        {
          name: "Blaster Cannon",
          type: "Action",
          attackBonus: 4,
          range: "600/2,400 ft",
          damage: "2d6 + 2",
          damageType: "Energy",
          description: "Ranged Ship Attack: +4 to hit. Hit: 9 (2d6 + 2) energy damage."
        }
      ],
      bonusActions: customPresetForm.bonusActions || [],
      reactions: customPresetForm.reactions || []
    }

    setBestiaryList((prev) => [newPreset, ...prev])
    setManagerTab("list")
    alert(`Custom preset "${newPreset.name}" added to Bestiary!`)
  }

  const handleResetDefaultBestiary = () => {
    if (confirm("Reset bestiary to default Star Wars ships? All custom presets will be overwritten.")) {
      setBestiaryList(DEFAULT_NPC_SHIP_BESTIARY)
      if (typeof window !== "undefined") {
        localStorage.removeItem("sw5e_custom_bestiary")
      }
    }
  }

  return (
    <div className="flex flex-col gap-5 font-mono">
      {/* Dynamic Header Banner: Red when in combat, amber during standard patrol */}
      <div
        className={`flex items-center justify-between border-b pb-3 flex-wrap gap-2 transition-colors duration-500 rounded p-2.5 ${
          isInCombat
            ? "border-rose-500 bg-rose-950/40 shadow-[0_0_20px_rgba(244,63,94,0.2)]"
            : "border-amber-500/40 bg-black/40"
        }`}
      >
        <div>
          <h2
            className={`text-lg font-bold tracking-[0.15em] flex items-center gap-2 ${
              isInCombat ? "text-rose-400" : "text-amber-400"
            }`}
          >
            {isInCombat ? (
              <Flame className="h-5 w-5 text-rose-500 animate-bounce" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-amber-400 animate-pulse" />
            )}
            GAME MASTER COMMAND OVERSIGHT
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`rounded px-2 py-0.5 text-[9px] font-black tracking-widest uppercase ${
                isInCombat
                  ? "bg-rose-500 text-white animate-pulse"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              }`}
            >
              {isInCombat ? "STATUS: COMBAT" : "STATUS: PATROL / STANDBY"}
            </span>
            <span className="text-[10px] tracking-[0.2em] text-muted-foreground/60 hidden sm:inline">
              ENCRYPTED GM CONSOLE // BESTIARY &amp; INITIATIVE DIRECTOR
            </span>
          </div>
        </div>

        {/* Turn HUD & Round Director */}
        <div className="flex items-center gap-2 flex-wrap">
          {isInCombat && (
            <div className="flex items-center gap-2 bg-black/70 border border-rose-500/50 rounded px-2.5 py-1 text-xs">
              <div className="flex flex-col">
                <span className="text-[8px] text-muted-foreground uppercase">Active Turn:</span>
                <span className="font-bold text-amber-300 text-xs truncate max-w-[120px] sm:max-w-[160px]">
                  {activeTurnShip?.name || "All Non-Disabled Acted"}
                </span>
              </div>
              <span className="text-slate-600">|</span>
              <div className="flex flex-col">
                <span className="text-[8px] text-muted-foreground uppercase">On Deck:</span>
                <span className="font-bold text-cyan-300 text-xs truncate max-w-[100px] sm:max-w-[140px]">
                  {nextTurnShip?.name || "—"}
                </span>
              </div>
            </div>
          )}

          <span
            className={`rounded-sm border px-3 py-1 text-[10px] font-bold tracking-[0.2em] animate-pulse ${
              isInCombat
                ? "border-rose-500/60 bg-rose-500/20 text-rose-300"
                : "border-amber-500/50 bg-amber-500/10 text-amber-400"
            }`}
          >
            ROUND {combatRound}
          </span>

          <button
            type="button"
            onClick={handleAdvanceRound}
            className="px-3 py-1 rounded border border-amber-500/60 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold uppercase transition flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            Advance Round
          </button>

          {isInCombat && (
            <button
              type="button"
              onClick={handleEndCombat}
              className="px-3 py-1 rounded border border-rose-500 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 text-xs font-bold uppercase transition flex items-center gap-1 cursor-pointer shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse"
              title="Clear all enemies and finish combat"
            >
              <Skull className="h-3.5 w-3.5" />
              End Combat
            </button>
          )}
        </div>
      </div>

      {/* Floating Tactical Dice Result Banner */}
      {lastDiceResult && (
        <div className="rounded border border-amber-500/80 bg-black/90 p-2.5 flex items-center justify-between shadow-[0_0_20px_rgba(245,158,11,0.25)] text-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="p-1 rounded bg-amber-500/20 text-amber-300">
              <Dices className="h-4 w-4" />
            </span>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase">
                {lastDiceResult.shipName} &bull; {lastDiceResult.actionName} ({lastDiceResult.type}):
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`font-black text-sm tracking-wider font-mono ${
                  lastDiceResult.isCrit
                    ? "text-emerald-400 animate-pulse text-base"
                    : lastDiceResult.isFumble
                    ? "text-rose-500 font-bold"
                    : "text-amber-300 font-bold text-base"
                }`}>
                  {lastDiceResult.rollText}
                </span>
                <span className="text-[10px] text-slate-400">
                  ({lastDiceResult.detail})
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLastDiceResult(null)}
            className="text-slate-500 hover:text-white cursor-pointer px-2 py-1 text-xs"
          >
            &times;
          </button>
        </div>
      )}

      {/* 1. SHIP-LEVEL INITIATIVE TRACKER */}
      <section
        className={`rounded-md border p-4 shadow-sm flex flex-col gap-3 transition-colors duration-500 ${
          isInCombat
            ? "border-rose-500/60 bg-rose-950/15 shadow-[0_0_15px_rgba(244,63,94,0.08)]"
            : "border-amber-500/50 bg-bridge-panel shadow-[0_0_15px_rgba(245,158,11,0.08)]"
        }`}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-bridge-border/60 pb-2 gap-2">
          <div className="flex items-center gap-2">
            <Swords className={`w-4 h-4 ${isInCombat ? "text-rose-400" : "text-amber-400"}`} />
            <h3
              className={`text-xs font-bold tracking-[0.2em] uppercase ${
                isInCombat ? "text-rose-300" : "text-amber-300"
              }`}
            >
              Ship Combat Initiative Order ({enemyShips.length + 1} Ships)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {/* PREVIOUS TURN BUTTON */}
            <button
              type="button"
              onClick={handlePreviousTurnCycle}
              className="px-2.5 py-1 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold uppercase transition flex items-center gap-1 cursor-pointer"
              title="Revert to previous ship turn"
            >
              <SkipBack className="h-3.5 w-3.5" />
              Prev Turn
            </button>

            {/* NEXT TURN BUTTON (Auto-skips disabled ships) */}
            <button
              type="button"
              onClick={handleNextTurnCycle}
              className="px-3 py-1 rounded border border-emerald-500/60 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer shadow-[0_0_8px_rgba(52,211,153,0.3)]"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Next Turn
            </button>

            {isInCombat && (
              <button
                type="button"
                onClick={handleEndCombat}
                className="px-2.5 py-1 rounded border border-rose-500/60 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-bold uppercase transition flex items-center gap-1 cursor-pointer"
                title="End combat and clear all hostiles"
              >
                <XCircle className="h-3.5 w-3.5" />
                End Combat
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {shipQueue.map((ship, shipIdx) => {
            const isCurrent = !ship.hasTakenTurn && !ship.isDisabled && !ship.isExploded && shipQueue.find((s) => !s.hasTakenTurn && !s.isDisabled)?.id === ship.id

            if (ship.isPlayerShip) {
              return (
                <div
                  key={`${ship.id}-${shipIdx}`}
                  className={`rounded border transition-all ${
                    isCurrent
                      ? "border-cyan-neon bg-cyan-neon/10 shadow-[0_0_15px_rgba(0,255,255,0.15)]"
                      : ship.hasTakenTurn
                      ? "border-slate-800 bg-black/40 opacity-60"
                      : "border-cyan-500/40 bg-black/50"
                  }`}
                >
                  <div className="p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-3">
                      {/* Interactive Player Ship Initiative Box */}
                      <div className="flex flex-col items-center">
                        <input
                          type="number"
                          value={effectivePlayerShipInit}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10)
                            onUpdateCombatState?.({
                              manualPlayerInitOverride: isNaN(val) ? 0 : val,
                            })
                          }}
                          className="h-8 w-12 text-center rounded bg-cyan-950 border border-cyan-neon/50 text-cyan-300 font-bold text-base focus:border-cyan-neon focus:outline-none"
                          title="Click to edit Player Ship Initiative"
                        />
                        <div className="flex gap-1 mt-0.5">
                          <button
                            type="button"
                            onClick={() => handleNudgeOrder("player-vessel", "up")}
                            className="text-slate-500 hover:text-cyan-300 cursor-pointer"
                            title="Nudge up order on ties"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleNudgeOrder("player-vessel", "down")}
                            className="text-slate-500 hover:text-cyan-300 cursor-pointer"
                            title="Nudge down order on ties"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-cyan-neon uppercase">
                            PLAYER VESSEL
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-cyan-neon text-black uppercase animate-pulse">
                              ACTIVE SHIP TURN
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {ship.hull} • {ship.shields} • Actions: <strong className={crewActionStats.allDone ? "text-emerald-400" : "text-amber-300"}>
                            {crewActionStats.acted} / {crewActionStats.total} Crew Acted
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setIsCrewExpanded((prev) => !prev)}
                        className="px-2 py-1 rounded bg-black/60 border border-bridge-border text-slate-300 text-xs flex items-center gap-1 hover:text-white cursor-pointer"
                      >
                        <Users className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Crew Checklist</span>
                        {isCrewExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateCombatState?.({
                            playerShipHasActed: !playerShipHasActed,
                          })
                        }
                        className={`px-3 py-1 rounded text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer ${
                          ship.hasTakenTurn
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        }`}
                      >
                        {ship.hasTakenTurn ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                        {ship.hasTakenTurn ? "Ship Acted" : "Ship Pending"}
                      </button>
                    </div>
                  </div>

                  {isCrewExpanded && (
                    <div className="p-3 bg-black/60 border-t border-cyan-neon/30 flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground uppercase border-b border-bridge-border/40 pb-1">
                        <span>Crew Member &amp; Station</span>
                        <div className="flex gap-6 pr-2">
                          <span>Init Roll</span>
                          <span>Turn Status</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {manifest.filter((m) => !m.isPassenger).map((member) => (
                          <div
                            key={member.id}
                            className={`flex items-center justify-between p-2 rounded border text-xs transition ${
                              member.hasTakenTurnThisRound
                                ? "bg-slate-950/40 border-slate-800 text-slate-400"
                                : "bg-black/60 border-slate-700 text-slate-100"
                            }`}
                          >
                            <div className="flex flex-col min-w-0 pr-1">
                              <span className="font-bold text-xs truncate text-cyan-200">
                                {member.name}
                              </span>
                              <span className="text-[9px] text-muted-foreground uppercase">
                                @ {member.location.replace("_", " ")}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <input
                                type="number"
                                value={member.individualInitiative || 0}
                                onChange={(e) => onUpdateInitiative?.(member.id, parseInt(e.target.value, 10) || 0)}
                                className="w-10 text-center rounded bg-black border border-slate-700 py-0.5 text-xs text-amber-300 font-bold"
                                title="Individual Initiative Roll"
                              />

                              <button
                                type="button"
                                onClick={() => onToggleTurn?.(member.id)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer ${
                                  member.hasTakenTurnThisRound
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                                }`}
                              >
                                {member.hasTakenTurnThisRound ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : (
                                  <Clock className="h-3 w-3" />
                                )}
                                {member.hasTakenTurnThisRound ? "Done" : "Ready"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            }

            // HOSTILE VESSEL COMBAT CARD
            return (
              <div
                key={`${ship.id}-${shipIdx}`}
                className={`rounded border p-3 flex flex-col gap-2 transition-all ${
                  ship.isDisabled
                    ? "border-slate-800 bg-slate-950/70 opacity-60"
                    : isCurrent
                    ? "border-rose-500 bg-rose-950/30 shadow-[0_0_15px_rgba(244,63,94,0.25)]"
                    : ship.hasTakenTurn
                    ? "border-slate-800 bg-black/40 opacity-75"
                    : "border-bridge-border bg-black/60"
                }`}
              >
                {/* Header Row: Init, Ship Name, Active Badge, Turn and Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-3">
                    {/* Interactive Hostile Ship Initiative Box */}
                    <div className="flex flex-col items-center">
                      <input
                        type="number"
                        value={ship.initiative}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10)
                          handleUpdateEnemyInitiative(ship.id, isNaN(val) ? 0 : val)
                        }}
                        className={`h-8 w-12 text-center rounded border font-bold text-base focus:outline-none ${
                          ship.isDisabled
                            ? "bg-slate-900 border-slate-700 text-slate-500"
                            : "bg-rose-950 border-rose-500/50 text-rose-300 focus:border-rose-400"
                        }`}
                        title="Click to edit Hostile Ship Initiative"
                      />
                      <div className="flex gap-1 mt-0.5">
                        <button
                          type="button"
                          onClick={() => handleNudgeOrder(ship.id, "up")}
                          className="text-slate-500 hover:text-rose-300 cursor-pointer"
                          title="Nudge up order on ties"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNudgeOrder(ship.id, "down")}
                          className="text-slate-500 hover:text-rose-300 cursor-pointer"
                          title="Nudge down order on ties"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            if (ship.statblock) {
                              setActiveInspectStatblock({
                                statblock: ship.statblock,
                                shipId: ship.id,
                                currentHull: ship.hullCurrent,
                                currentShields: ship.shieldsCurrent,
                              })
                            }
                          }}
                          className={`font-bold text-sm underline decoration-dotted text-left uppercase cursor-pointer ${
                            ship.isDisabled ? "text-slate-400 line-through" : "text-rose-400 hover:text-rose-200"
                          }`}
                          title="Click to view full statblock"
                        >
                          {ship.name}
                        </button>

                        {/* Status Tags */}
                        {ship.isDisabled ? (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-slate-800 text-amber-400 uppercase border border-amber-500/40 flex items-center gap-1">
                            <Wrench className="h-2.5 w-2.5" /> DISABLED // DERELICT
                          </span>
                        ) : isCurrent ? (
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-rose-500 text-white uppercase animate-pulse">
                            ACTIVE TURN
                          </span>
                        ) : null}
                      </div>

                      <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                        AC {ship.armorClass}
                        {ship.damageReduction ? ` • DR ${ship.damageReduction}` : ""}
                        {ship.damageThreshold ? ` • DT ${ship.damageThreshold}` : ""}
                        {ship.notes ? ` • ${ship.notes}` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Right side controls */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {ship.statblock && (
                      <button
                        type="button"
                        onClick={() => setActiveInspectStatblock({
                          statblock: ship.statblock!,
                          shipId: ship.id,
                          currentHull: ship.hullCurrent,
                          currentShields: ship.shieldsCurrent,
                        })}
                        className="px-2 py-1 rounded border border-rose-500/40 bg-rose-950/40 text-[10px] text-rose-300 hover:bg-rose-900/40 flex items-center gap-1 cursor-pointer font-bold uppercase"
                        title="Inspect Statblock Card"
                      >
                        <FileText className="h-3 w-3" />
                        Statblock
                      </button>
                    )}

                    {!ship.isDisabled && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = enemyShips.map((e) =>
                            e.id === ship.id ? { ...e, hasTakenTurn: !e.hasTakenTurn } : e
                          )
                          onUpdateCombatState?.({ enemyShips: updated })
                        }}
                        className={`px-3 py-1 rounded text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer ${
                          ship.hasTakenTurn
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        }`}
                      >
                        {ship.hasTakenTurn ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                        {ship.hasTakenTurn ? "Acted" : "Pending"}
                      </button>
                    )}

                    {/* Explode / Scuttle Vessel */}
                    <button
                      type="button"
                      onClick={() => handleExplodeEnemyShip(ship.id)}
                      className="px-2 py-1 rounded border border-red-500/40 bg-red-950/40 text-red-400 hover:bg-red-900/50 transition cursor-pointer text-[10px] font-bold flex items-center gap-1 uppercase"
                      title="Explode/Obliterate Vessel completely (No Salvage)"
                    >
                      <Bomb className="h-3 w-3" />
                      Explode
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = enemyShips.filter((e) => e.id !== ship.id)
                        onUpdateCombatState?.({
                          enemyShips: updated,
                          isInCombat: updated.length > 0,
                        })
                      }}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      title="Remove from initiative"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* HP & Shield Tracker Row with quick buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  {/* Shields tracker */}
                  <div className="flex items-center justify-between bg-black/60 p-1.5 rounded border border-cyan-500/30">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-cyan-300">SP:</span>
                      <input
                        type="number"
                        value={ship.shieldsCurrent}
                        onChange={(e) => handleSetEnemyHealth(ship.id, "shields", parseInt(e.target.value, 10) || 0)}
                        className="w-12 text-center rounded bg-black border border-cyan-500/50 text-cyan-200 font-bold text-xs py-0.5 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400">/ {ship.shieldsMax}</span>
                    </div>

                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleAdjustEnemyHealth(ship.id, "shields", -5)}
                        className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 text-[9px] font-bold cursor-pointer"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustEnemyHealth(ship.id, "shields", -1)}
                        className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 text-[9px] font-bold cursor-pointer"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustEnemyHealth(ship.id, "shields", +1)}
                        className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 text-[9px] font-bold cursor-pointer"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustEnemyHealth(ship.id, "shields", +5)}
                        className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 text-[9px] font-bold cursor-pointer"
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetEnemyHealth(ship.id, "shields", 0)}
                        className="px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/50 text-[9px] font-bold cursor-pointer"
                        title="Shields Down"
                      >
                        0
                      </button>
                    </div>
                  </div>

                  {/* Hull HP tracker */}
                  <div className="flex items-center justify-between bg-black/60 p-1.5 rounded border border-rose-500/30">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-rose-400">HP:</span>
                      <input
                        type="number"
                        value={ship.hullCurrent}
                        onChange={(e) => handleSetEnemyHealth(ship.id, "hull", parseInt(e.target.value, 10) || 0)}
                        className="w-12 text-center rounded bg-black border border-rose-500/50 text-rose-300 font-bold text-xs py-0.5 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400">/ {ship.hullMax}</span>
                    </div>

                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleAdjustEnemyHealth(ship.id, "hull", -5)}
                        className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 text-[9px] font-bold cursor-pointer"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustEnemyHealth(ship.id, "hull", -1)}
                        className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 text-[9px] font-bold cursor-pointer"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustEnemyHealth(ship.id, "hull", +1)}
                        className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 text-[9px] font-bold cursor-pointer"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustEnemyHealth(ship.id, "hull", +5)}
                        className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 text-[9px] font-bold cursor-pointer"
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetEnemyHealth(ship.id, "hull", 0)}
                        className="px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-500/60 text-rose-300 hover:bg-rose-900/60 text-[9px] font-bold cursor-pointer"
                        title="Set to 0 HP (Disable Vessel)"
                      >
                        0
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Attack Dice Roller Buttons directly on row */}
                {ship.statblock?.actions && ship.statblock.actions.length > 0 && !ship.isDisabled && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                      <Target className="h-3 w-3 text-rose-400" /> Attacks:
                    </span>
                    {ship.statblock.actions.map((act, aIdx) => (
                      <div key={aIdx} className="flex items-center gap-1 bg-black/60 border border-slate-700 px-2 py-0.5 rounded text-[10px]">
                        <span className="font-bold text-slate-200">{act.name}</span>
                        {act.attackBonus !== undefined && (
                          <button
                            type="button"
                            onClick={() => handleRollToHit(ship.name, act)}
                            className="px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-neon/50 text-cyan-300 hover:bg-cyan-900 font-bold uppercase cursor-pointer"
                            title={`Roll 1d20 + ${act.attackBonus}`}
                          >
                            +{act.attackBonus} Hit
                          </button>
                        )}
                        {act.damage && (
                          <button
                            type="button"
                            onClick={() => handleRollDamage(ship.name, act)}
                            className="px-1.5 py-0.2 rounded bg-amber-950 border border-amber-500/50 text-amber-300 hover:bg-amber-900 font-bold uppercase cursor-pointer"
                            title={`Roll ${act.damage}`}
                          >
                            Dmg ({act.damage})
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Quick Add Custom Hostile Vessel Bar */}
        <form onSubmit={handleAddEnemy} className="flex flex-wrap items-center gap-2 pt-2 border-t border-bridge-border/40 text-xs">
          <span className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1">
            <UserPlus className="h-3.5 w-3.5" /> + Quick Hostile:
          </span>
          <input
            type="text"
            placeholder="Ship Designation (e.g. TIE Fighter Beta)"
            value={newEnemyName}
            onChange={(e) => setNewEnemyName(e.target.value)}
            className="flex-1 min-w-[140px] rounded bg-black border border-slate-700 px-2 py-1 text-slate-200 focus:outline-none focus:border-rose-400 text-xs"
          />
          <input
            type="number"
            placeholder="Init"
            value={newEnemyInit}
            onChange={(e) => setNewEnemyInit(e.target.value)}
            className="w-12 rounded bg-black border border-slate-700 px-1.5 py-1 text-center text-amber-300 font-bold text-xs"
            title="Ship Initiative"
          />
          <input
            type="number"
            placeholder="HP"
            value={newEnemyHull}
            onChange={(e) => setNewEnemyHull(e.target.value)}
            className="w-12 rounded bg-black border border-slate-700 px-1.5 py-1 text-center text-rose-300 font-bold text-xs"
            title="Hull Points"
          />
          <input
            type="number"
            placeholder="SP"
            value={newEnemyShields}
            onChange={(e) => setNewEnemyShields(e.target.value)}
            className="w-12 rounded bg-black border border-slate-700 px-1.5 py-1 text-center text-cyan-300 font-bold text-xs"
            title="Shield Points"
          />
          <input
            type="number"
            placeholder="AC"
            value={newEnemyAC}
            onChange={(e) => setNewEnemyAC(e.target.value)}
            className="w-12 rounded bg-black border border-slate-700 px-1.5 py-1 text-center text-slate-200 font-bold text-xs"
            title="Armor Class"
          />
          <input
            type="number"
            placeholder="DR"
            value={newEnemyDR}
            onChange={(e) => setNewEnemyDR(e.target.value)}
            className="w-12 rounded bg-black border border-slate-700 px-1.5 py-1 text-center text-amber-200 font-bold text-xs"
            title="Damage Reduction"
          />
          <button
            type="submit"
            className="px-3 py-1 rounded border border-rose-500/60 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold uppercase text-xs transition cursor-pointer"
          >
            Spawn Ship
          </button>
        </form>
      </section>

      {/* 2. PLAYER VESSEL OVERRIDES & QUICK CONDITION TOGGLES */}
      <section className="rounded-md border border-bridge-border bg-bridge-panel p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-bridge-border/60 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-neon" />
            <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase">
              Player Vessel Direct Overrides
            </h3>
          </div>
          <span className="text-[10px] text-muted-foreground">
            Instantly syncs with Player Stations
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded bg-black/50 border border-bridge-border/60 flex flex-col justify-between gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase">Hull Points</span>
            <span className="text-lg font-bold text-rose-400 font-mono">
              {currentHull} / {maxHull}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onHullChange?.(Math.max(0, currentHull - 5), maxHull)}
                className="flex-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-bold text-[10px] hover:bg-slate-800 cursor-pointer"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => onHullChange?.(Math.min(maxHull, currentHull + 5), maxHull)}
                className="flex-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-bold text-[10px] hover:bg-slate-800 cursor-pointer"
              >
                +5
              </button>
              <button
                type="button"
                onClick={() => onHullChange?.(maxHull, maxHull)}
                className="px-1.5 py-0.5 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 font-bold text-[10px] hover:bg-rose-900/50 cursor-pointer"
                title="Full repair"
              >
                Max
              </button>
            </div>
          </div>

          <div className="p-2.5 rounded bg-black/50 border border-bridge-border/60 flex flex-col justify-between gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase">Shield Points</span>
            <span className="text-lg font-bold text-cyan-neon font-mono">
              {currentShields} / {maxShields}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onShieldChange?.(Math.max(0, currentShields - 5), maxShields)}
                className="flex-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-bold text-[10px] hover:bg-slate-800 cursor-pointer"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => onShieldChange?.(Math.min(maxShields, currentShields + 5), maxShields)}
                className="flex-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-bold text-[10px] hover:bg-slate-800 cursor-pointer"
              >
                +5
              </button>
              <button
                type="button"
                onClick={() => onShieldChange?.(maxShields, maxShields)}
                className="px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-neon/40 text-cyan-300 font-bold text-[10px] hover:bg-cyan-900/50 cursor-pointer"
                title="Full charge"
              >
                Max
              </button>
            </div>
          </div>

          <div className="p-2.5 rounded bg-black/50 border border-bridge-border/60 flex flex-col justify-between gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase">System Damage</span>
            <span className="text-lg font-bold text-amber-400 font-mono">
              Level {systemDamageLevel} / 6
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onUpdateSystemDamageLevel?.((prev) => Math.max(0, Number(prev) - 1))}
                className="flex-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-bold text-[10px] hover:bg-slate-800 cursor-pointer"
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => onUpdateSystemDamageLevel?.((prev) => Math.min(6, Number(prev) + 1))}
                className="flex-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-bold text-[10px] hover:bg-slate-800 cursor-pointer"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => onUpdateSystemDamageLevel?.(0)}
                className="px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] hover:bg-emerald-900/50 cursor-pointer"
                title="Clear all system damage"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="p-2.5 rounded bg-black/50 border border-bridge-border/60 flex flex-col justify-between gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase">Reactor Reserve</span>
            <span className="text-lg font-bold text-cyan-300 font-mono">
              {availablePowerDice} / {maxPowerDice} Dice
            </span>
            <button
              type="button"
              onClick={() => onCycleReactor?.()}
              className="w-full py-0.5 rounded bg-cyan-950/40 border border-cyan-neon/40 text-cyan-300 font-bold text-[10px] hover:bg-cyan-900/50 uppercase cursor-pointer"
            >
              Cycle Reactor
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 pt-2 border-t border-bridge-border/40">
          <span className="text-[10px] text-muted-foreground uppercase font-bold">
            Inflict / Cure Starship Conditions:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { title: "Blinded", effect: "Can't see; auto-fails sight checks. Attacks against ship have adv; ship attacks have disadv." },
              { title: "Disabled", effect: "Can't take actions or reactions. Speed 0. Comms restricted to 1,000 ft." },
              { title: "Ionized", effect: "Disadvantage on all d20 rolls. Power dice cannot be generated." },
              { title: "Invisible", effect: "Impossible to track visually. Attacks against have disadv; ship attacks have adv." },
              { title: "Stalled", effect: "Speed 0. Auto-fails Str/Dex saves. Attacks against ship have adv." },
              { title: "Stunned", effect: "Incapacitated. Speed 0. Auto-fails Str/Dex saves. Attacks against have adv." },
              { title: "Tractored", effect: "Speed 0. 4 levels of slowed applied." },
              { title: "Used", effect: "Rolling a 1 on check/atk/save requires DC 10 destruction save or gain 1 system damage." },
            ].map((cond) => {
              const active = shipStatuses.some(
                (s) =>
                  s.title.toLowerCase() === cond.title.toLowerCase() ||
                  s.id?.toLowerCase().includes(cond.title.toLowerCase())
              )
              return (
                <button
                  key={cond.title}
                  type="button"
                  onClick={() => handleToggleCondition(cond.title, cond.effect)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition cursor-pointer border ${
                    active
                      ? "bg-rose-500/25 border-rose-500 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.4)] animate-pulse"
                      : "bg-black/60 border-bridge-border text-slate-400 hover:text-white"
                  }`}
                >
                  {cond.title} {active ? "●" : ""}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* 3. SECTOR CONTACT SPAWNER & ACTIVE SENSOR CONTACTS LIST */}
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-md border border-amber-500/30 bg-bridge-panel p-4 flex flex-col gap-3 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold tracking-[0.2em] text-amber-400 uppercase">
                Spawn Sector Contact
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsPresetManagerOpen(true)}
              className="px-2 py-0.5 rounded border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
              title="Manage Bestiary Presets"
            >
              <Settings className="h-3 w-3" />
              Manage ({bestiaryList.length})
            </button>
          </div>

          <form onSubmit={handleSubmitContact} className="flex flex-col gap-2.5 text-xs">
            {/* Filtered Bestiary Picker Box */}
            <div className="flex flex-col gap-1.5 rounded bg-amber-500/5 border border-amber-500/20 p-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] tracking-wider text-amber-400 uppercase font-bold flex items-center gap-1.5">
                  <Bookmark className="w-3 h-3" /> Preset Bestiary
                </label>
                <div className="flex items-center gap-1">
                  <Filter className="w-3 h-3 text-muted-foreground" />
                  <select
                    value={spawnerTierFilter}
                    onChange={(e) => setSpawnerTierFilter(e.target.value)}
                    className="rounded bg-black border border-amber-500/40 text-[10px] text-amber-300 px-1 py-0.5 focus:outline-none"
                  >
                    <option value="all">All Tiers</option>
                    <option value="0">T0: Minion</option>
                    <option value="1">T1: Elite</option>
                    <option value="2">T2: Mini-Boss</option>
                    <option value="3">T3: Controller</option>
                    <option value="4">T4: Apex</option>
                    <option value="5">T5: Titan</option>
                  </select>
                </div>
              </div>

              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter by name / faction / hull..."
                  value={spawnerSearchQuery}
                  onChange={(e) => setSpawnerSearchQuery(e.target.value)}
                  className="w-full rounded bg-black/60 border border-slate-800 pl-7 pr-2 py-1 text-[11px] text-amber-200 placeholder:text-muted-foreground/40 focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                onChange={handleSelectPreset}
                defaultValue=""
                className="rounded border border-amber-500/40 bg-black/80 px-2 py-1.5 text-amber-200 focus:border-amber-500 focus:outline-none text-xs"
              >
                <option value="" disabled>-- Select ship ({spawnerFilteredBestiary.length} available) --</option>
                {spawnerFilteredBestiary.map((preset) => (
                  <option key={preset.name} value={preset.name}>
                    [T{preset.tier ?? 0}] {preset.name} — {preset.threatClassification?.split(" ")[0] ?? "Vessel"} ({preset.size})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ship / Squadron Base Name"
                className="flex-1 rounded border border-bridge-border bg-black/40 px-2.5 py-1.5 text-amber-200 placeholder:text-muted-foreground/40 focus:border-amber-500 focus:outline-none text-xs"
                required
              />
              <div className="flex items-center gap-1 bg-black/60 border border-slate-700 px-2 rounded" title="Number of ships to deploy as a wing">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Qty:</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={spawnQuantity}
                  onChange={(e) => setSpawnQuantity(Math.max(1, Math.min(12, parseInt(e.target.value, 10) || 1)))}
                  className="w-8 bg-transparent text-center font-bold text-amber-300 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value as any)}
                className="rounded border border-bridge-border bg-black/40 px-2 py-1.5 text-amber-200 focus:border-amber-500 focus:outline-none text-xs"
              >
                <option value="Threat">Threat</option>
                <option value="Vessel">Vessel</option>
                <option value="Anomaly">Anomaly</option>
                <option value="Debris">Debris</option>
                <option value="Station">Station</option>
              </select>

              <input
                type="number"
                value={scanDc}
                onChange={(e) => setScanDc(Number(e.target.value))}
                placeholder="Scan DC"
                className="rounded border border-bridge-border bg-black/40 px-2.5 py-1.5 text-amber-200 focus:border-amber-500 focus:outline-none text-xs"
                min={5}
                max={30}
              />
            </div>

            <input
              type="text"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="Distance (e.g. 15,000 km)"
              className="rounded border border-bridge-border bg-black/40 px-2.5 py-1.5 text-amber-200 placeholder:text-muted-foreground/40 focus:border-amber-500 focus:outline-none text-xs"
            />

            {/* Cleaned Combat Specs Grid (Init input removed) */}
            <div className="p-2 rounded bg-black/60 border border-slate-700 flex flex-col gap-1.5">
              <span className="text-[9px] uppercase font-bold text-muted-foreground">
                Base Combat Specifications:
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                <div>
                  <span className="text-[8px] text-muted-foreground uppercase block text-center">HP</span>
                  <input
                    type="number"
                    value={contactHull}
                    onChange={(e) => setContactHull(e.target.value)}
                    className="w-full rounded bg-black border border-slate-700 px-1 py-0.5 text-rose-300 font-bold text-center text-xs"
                  />
                </div>
                <div>
                  <span className="text-[8px] text-muted-foreground uppercase block text-center">SP</span>
                  <input
                    type="number"
                    value={contactShields}
                    onChange={(e) => setContactShields(e.target.value)}
                    className="w-full rounded bg-black border border-slate-700 px-1 py-0.5 text-cyan-300 font-bold text-center text-xs"
                  />
                </div>
                <div>
                  <span className="text-[8px] text-muted-foreground uppercase block text-center">AC</span>
                  <input
                    type="number"
                    value={contactAC}
                    onChange={(e) => setContactAC(e.target.value)}
                    className="w-full rounded bg-black border border-slate-700 px-1 py-0.5 text-slate-200 font-bold text-center text-xs"
                  />
                </div>
                <div>
                  <span className="text-[8px] text-muted-foreground uppercase block text-center">DR</span>
                  <input
                    type="number"
                    value={contactDR}
                    onChange={(e) => setContactDR(e.target.value)}
                    className="w-full rounded bg-black border border-slate-700 px-1 py-0.5 text-amber-200 font-bold text-center text-xs"
                  />
                </div>
                <div>
                  <span className="text-[8px] text-muted-foreground uppercase block text-center">DT</span>
                  <input
                    type="number"
                    value={contactDT}
                    onChange={(e) => setContactDT(e.target.value)}
                    className="w-full rounded bg-black border border-slate-700 px-1 py-0.5 text-amber-200 font-bold text-center text-xs"
                  />
                </div>
              </div>
            </div>

            <textarea
              value={gmNotes}
              onChange={(e) => setGmNotes(e.target.value)}
              placeholder="GM Secret Notes..."
              rows={2}
              className="rounded border border-bridge-border bg-black/40 px-2.5 py-1.5 text-amber-200 placeholder:text-muted-foreground/40 focus:border-amber-500 focus:outline-none resize-none text-xs"
            />

            <button
              type="submit"
              className="mt-1 flex items-center justify-center gap-1.5 rounded bg-amber-500/20 border border-amber-500/50 px-3 py-2 font-bold tracking-wider text-amber-300 hover:bg-amber-500/30 transition-all text-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {spawnQuantity > 1 ? `Deploy Squadron (${spawnQuantity} Ships)` : "Deploy Contact"}
            </button>
          </form>
        </section>

        <section className="rounded-md border border-bridge-border bg-bridge-panel p-4 flex flex-col gap-3 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-bridge-border/60 pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase">
                Deployed Contacts ({contacts.length})
              </h3>
              {contacts.length > 0 && (
                <button
                  type="button"
                  onClick={handleEngageAllContacts}
                  className="px-2.5 py-1 rounded border border-rose-500/60 bg-rose-950/50 hover:bg-rose-900/60 text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(244,63,94,0.25)] transition"
                  title="Roll d20 + DEX initiative for all contacts and engage into combat"
                >
                  <Dices className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                  Roll Initiative, Engage Combat
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {contacts.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllContacts}
                  className="px-2 py-0.5 rounded border border-rose-500/40 bg-rose-950/30 text-[9px] text-rose-400 hover:bg-rose-900/40 uppercase font-bold flex items-center gap-1 cursor-pointer"
                  title="Clear all sensor contacts from sector"
                >
                  <Trash2 className="w-3 h-3 text-rose-400" />
                  Clear All Contacts
                </button>
              )}
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                Select contacts to engage into Initiative
              </span>
            </div>
          </div>

          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 border border-dashed border-bridge-border/60 rounded-md text-muted-foreground/60 text-xs">
              No contacts currently deployed in sector.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 overflow-y-auto max-h-96 pr-1">
              {contacts.map((contact, contactIndex) => {
                const isEngagedInCombat = enemyShips.some((e) => e.contactId === contact.id)
                const dexMod = contact.statblock?.stats?.dex !== undefined
                  ? Math.floor((contact.statblock.stats.dex - 10) / 2)
                  : 2

                return (
                  <div
                    key={`${contact.id || "contact"}-${contactIndex}`}
                    className={`rounded border p-2.5 flex flex-col gap-1.5 transition-all text-xs ${
                      isEngagedInCombat
                        ? "border-rose-500/70 bg-rose-950/20 shadow-[0_0_10px_rgba(244,63,94,0.15)]"
                        : contact.isRevealed
                        ? "border-cyan-neon/50 bg-cyan-neon/5"
                        : "border-amber-500/30 bg-black/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-200">{contact.name}</span>
                        <span className="rounded px-1.5 py-0.2 text-[8px] font-bold bg-bridge-border/50 text-muted-foreground uppercase">
                          {contact.classification}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          DC {contact.scanDc} • {contact.distance}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {contact.statblock && (
                          <button
                            type="button"
                            onClick={() => setActiveInspectStatblock({
                              statblock: contact.statblock!,
                              shipId: contact.id,
                              currentHull: contact.hullCurrent,
                              currentShields: contact.shieldsCurrent,
                            })}
                            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                            title="Inspect statblock"
                          >
                            <FileText className="w-3 h-3 text-cyan-400" />
                            Card
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleToggleContactInInitiative(contact)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer border ${
                            isEngagedInCombat
                              ? "bg-rose-500/25 border-rose-500 text-rose-300 animate-pulse"
                              : "bg-slate-900 border-slate-700 text-slate-300 hover:border-amber-400 hover:text-amber-300"
                          }`}
                          title={isEngagedInCombat ? "Remove from Initiative" : "Roll d20+DEX & Add to Initiative"}
                        >
                          <Crosshair className="w-3 h-3" />
                          {isEngagedInCombat ? "In Combat" : "+ Engage"}
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleReveal(contact.id)}
                          className={`p-1 rounded border transition-all cursor-pointer ${
                            contact.isRevealed
                              ? "bg-cyan-neon/20 border-cyan-neon/50 text-cyan-neon"
                              : "bg-black/40 border-bridge-border text-muted-foreground hover:text-amber-300"
                          }`}
                          title={contact.isRevealed ? "Hide from players" : "Reveal to player sensors"}
                        >
                          {contact.isRevealed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => onRemoveContact(contact.id)}
                          className="p-1 rounded border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                          title="Delete contact"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 bg-black/40 px-2 py-1 rounded border border-bridge-border/30">
                      <span>Hull: <strong className="text-rose-300">{contact.hullCurrent ?? 20}/{contact.hullMax ?? 20} HP</strong></span>
                      <span>Shields: <strong className="text-cyan-300">{contact.shieldsCurrent ?? 0} SP</strong></span>
                      <span>Armor: <strong className="text-slate-200">AC {contact.armorClass ?? 13}</strong></span>
                      {contact.damageReduction ? <span>DR: <strong className="text-amber-200">{contact.damageReduction}</strong></span> : null}
                      {contact.damageThreshold ? <span>DT: <strong className="text-amber-200">{contact.damageThreshold}</strong></span> : null}
                      <span>DEX: <strong className="text-amber-300">{dexMod >= 0 ? `+${dexMod}` : dexMod}</strong></span>
                    </div>

                    {contact.gmNotes && (
                      <div className="text-[10px] text-amber-300/80 bg-black/40 p-1.5 rounded border border-bridge-border/40">
                        <strong>Notes:</strong> {contact.gmNotes}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* 4. MODAL: PRESET BESTIARY MANAGER */}
      {isPresetManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 font-mono">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border-2 border-amber-500 bg-slate-950 p-4 sm:p-5 shadow-[0_0_30px_rgba(245,158,11,0.3)] flex flex-col gap-3 text-xs">
            <div className="border-b border-amber-500/80 pb-2 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm sm:text-base font-black text-amber-400 tracking-wider uppercase">
                  Starship Bestiary Manager ({bestiaryList.length} Vessels)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetDefaultBestiary}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-bold uppercase hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                  title="Reset to default galaxy presets"
                >
                  <RotateCw className="h-3 w-3" />
                  Restore Defaults
                </button>
                <button
                  onClick={() => setIsPresetManagerOpen(false)}
                  className="text-muted-foreground hover:text-white cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex rounded border border-slate-800 bg-black/60 p-1 gap-1">
              <button
                type="button"
                onClick={() => setManagerTab("list")}
                className={`flex-1 py-1 text-center font-bold uppercase rounded text-[10px] transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  managerTab === "list"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ListFilter className="h-3 w-3" />
                Browse Presets ({managerFilteredBestiary.length})
              </button>
              <button
                type="button"
                onClick={() => setManagerTab("create")}
                className={`flex-1 py-1 text-center font-bold uppercase rounded text-[10px] transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  managerTab === "create"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Plus className="h-3 w-3" />
                Custom Starship Builder
              </button>
            </div>

            {managerTab === "list" && (
              <div className="flex flex-col gap-2 p-2 rounded bg-black/40 border border-bridge-border/60">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search ship name, faction, or role..."
                      value={managerSearchQuery}
                      onChange={(e) => setManagerSearchQuery(e.target.value)}
                      className="w-full rounded bg-black border border-slate-700 pl-8 pr-2.5 py-1 text-xs text-amber-200 placeholder:text-muted-foreground/40 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <select
                    value={managerTierFilter}
                    onChange={(e) => setManagerTierFilter(e.target.value)}
                    className="rounded bg-black border border-amber-500/40 px-2 py-1 text-xs text-amber-300 focus:outline-none"
                  >
                    <option value="all">All Tiers (0-5)</option>
                    <option value="0">Tier 0: Minion</option>
                    <option value="1">Tier 1: Elite</option>
                    <option value="2">Tier 2: Mini-Boss</option>
                    <option value="3">Tier 3: Controller</option>
                    <option value="4">Tier 4: Apex</option>
                    <option value="5">Tier 5: Titan</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[50vh] pr-1">
                  {managerFilteredBestiary.map((preset) => (
                    <div
                      key={preset.name}
                      className="p-2 rounded border border-slate-800 bg-slate-950/70 flex items-center justify-between gap-2 hover:border-amber-500/40 transition"
                    >
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs truncate text-amber-200">{preset.name}</span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                            T{preset.tier ?? 0}
                          </span>
                        </div>
                        <span className="text-[9px] text-muted-foreground truncate">
                          {preset.faction} • {preset.size} {preset.shipType} • {preset.hullMax} HP / {preset.shieldsMax} SP • AC {preset.armorClass}
                          {preset.damageReduction ? ` • DR ${preset.damageReduction}` : ""}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveInspectStatblock({
                            statblock: preset,
                            currentHull: preset.hullMax,
                            currentShields: preset.shieldsMax,
                          })}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-bold uppercase cursor-pointer"
                        >
                          Inspect
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePreset(preset.name)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 transition cursor-pointer"
                          title="Delete Preset"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {managerTab === "create" && (
              <form onSubmit={handleSaveCustomPreset} className="flex flex-col gap-2 p-2 rounded bg-black/40 border border-bridge-border/60 max-h-[55vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Ship Name</span>
                    <input
                      type="text"
                      placeholder="e.g. Scythe Corsair"
                      value={customPresetForm.name}
                      onChange={(e) => setCustomPresetForm({ ...customPresetForm, name: e.target.value })}
                      className="w-full rounded bg-black border border-slate-700 px-2 py-1 text-slate-200 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Faction</span>
                    <select
                      value={customPresetForm.faction}
                      onChange={(e) => setCustomPresetForm({ ...customPresetForm, faction: e.target.value as any })}
                      className="w-full rounded bg-black border border-slate-700 px-2 py-1 text-slate-200 text-xs"
                    >
                      <option value="Galactic Empire">Galactic Empire</option>
                      <option value="Pirates & Raiders">Pirates & Raiders</option>
                      <option value="Bounty Hunters">Bounty Hunters</option>
                      <option value="Syndicates">Syndicates</option>
                      <option value="Scavengers & Guilds">Scavengers & Guilds</option>
                      <option value="Republic / Separatist Surplus">Republic / Separatist Surplus</option>
                      <option value="Civilians">Civilians</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Tier (0–5)</span>
                    <select
                      value={customPresetForm.tier ?? 1}
                      onChange={(e) => setCustomPresetForm({ ...customPresetForm, tier: Number(e.target.value) as any })}
                      className="w-full rounded bg-black border border-slate-700 px-2 py-1 text-slate-200 text-xs"
                    >
                      <option value={0}>Tier 0: Minion</option>
                      <option value={1}>Tier 1: Elite</option>
                      <option value={2}>Tier 2: Mini-Boss</option>
                      <option value={3}>Tier 3: Controller</option>
                      <option value={4}>Tier 4: Apex</option>
                      <option value={5}>Tier 5: Titan</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Size</span>
                    <select
                      value={customPresetForm.size}
                      onChange={(e) => setCustomPresetForm({ ...customPresetForm, size: e.target.value as any })}
                      className="w-full rounded bg-black border border-slate-700 px-2 py-1 text-slate-200 text-xs"
                    >
                      <option value="Tiny">Tiny</option>
                      <option value="Small">Small</option>
                      <option value="Medium">Medium</option>
                      <option value="Large">Large</option>
                      <option value="Huge">Huge</option>
                      <option value="Gargantuan">Gargantuan</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Hull Type</span>
                    <input
                      type="text"
                      placeholder="e.g. Starfighter / Gunship"
                      value={customPresetForm.shipType}
                      onChange={(e) => setCustomPresetForm({ ...customPresetForm, shipType: e.target.value })}
                      className="w-full rounded bg-black border border-slate-700 px-2 py-1 text-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 bg-slate-900/40 p-2 rounded border border-slate-800">
                  <div>
                    <span className="text-[8px] uppercase font-bold text-rose-300 block">Hull HP</span>
                    <input
                      type="number"
                      value={customPresetForm.hullMax}
                      onChange={(e) => setCustomPresetForm({ ...customPresetForm, hullMax: Number(e.target.value) })}
                      className="w-full rounded bg-black border border-slate-700 px-1 py-0.5 text-rose-300 text-center font-bold text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[8px] uppercase font-bold text-cyan-300 block">Shield SP</span>
                    <input
                      type="number"
                      value={customPresetForm.shieldsMax}
                      onChange={(e) => setCustomPresetForm({ ...customPresetForm, shieldsMax: Number(e.target.value) })}
                      className="w-full rounded bg-black border border-slate-700 px-1 py-0.5 text-cyan-300 text-center font-bold text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[8px] uppercase font-bold text-slate-300 block">AC</span>
                    <input
                      type="number"
                      value={customPresetForm.armorClass}
                      onChange={(e) => setCustomPresetForm({ ...customPresetForm, armorClass: Number(e.target.value) })}
                      className="w-full rounded bg-black border border-slate-700 px-1 py-0.5 text-slate-200 text-center font-bold text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[8px] uppercase font-bold text-amber-200 block">DR</span>
                    <input
                      type="number"
                      value={customPresetForm.damageReduction}
                      onChange={(e) => setCustomPresetForm({ ...customPresetForm, damageReduction: Number(e.target.value) })}
                      className="w-full rounded bg-black border border-slate-700 px-1 py-0.5 text-amber-200 text-center font-bold text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[8px] uppercase font-bold text-amber-300 block">Scan DC</span>
                    <input
                      type="number"
                      value={customPresetForm.scanDc}
                      onChange={(e) => setCustomPresetForm({ ...customPresetForm, scanDc: Number(e.target.value) })}
                      className="w-full rounded bg-black border border-slate-700 px-1 py-0.5 text-amber-300 text-center font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-1 bg-slate-900/40 p-1.5 rounded border border-slate-800 text-center">
                  {(["str", "dex", "con", "int", "wis", "cha"] as const).map((stat) => (
                    <div key={stat}>
                      <span className="text-[8px] uppercase font-bold text-muted-foreground block">{stat}</span>
                      <input
                        type="number"
                        value={customPresetForm.stats?.[stat] ?? 10}
                        onChange={(e) => setCustomPresetForm({
                          ...customPresetForm,
                          stats: {
                            str: customPresetForm.stats?.str ?? 10,
                            dex: customPresetForm.stats?.dex ?? 10,
                            con: customPresetForm.stats?.con ?? 10,
                            int: customPresetForm.stats?.int ?? 10,
                            wis: customPresetForm.stats?.wis ?? 10,
                            cha: customPresetForm.stats?.cha ?? 10,
                            [stat]: Number(e.target.value)
                          }
                        })}
                        className="w-full rounded bg-black border border-slate-700 px-0.5 py-0.5 text-center text-xs"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Flight Speed</span>
                    <input
                      type="text"
                      placeholder="350 ft (7 hexes)"
                      value={customPresetForm.speed}
                      onChange={(e) => setCustomPresetForm({ ...customPresetForm, speed: e.target.value })}
                      className="w-full rounded bg-black border border-slate-700 px-2 py-1 text-slate-200 text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Turning Speed</span>
                    <input
                      type="text"
                      placeholder="100 ft"
                      value={customPresetForm.turningSpeed}
                      onChange={(e) => setCustomPresetForm({ ...customPresetForm, turningSpeed: e.target.value })}
                      className="w-full rounded bg-black border border-slate-700 px-2 py-1 text-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">Default Notes</span>
                  <textarea
                    rows={2}
                    value={customPresetForm.defaultNotes}
                    onChange={(e) => setCustomPresetForm({ ...customPresetForm, defaultNotes: e.target.value })}
                    className="w-full rounded bg-black border border-slate-700 px-2 py-1 text-slate-200 text-xs resize-none"
                    placeholder="Tactical overview..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 rounded bg-amber-500/20 border border-amber-500/60 text-amber-300 font-bold uppercase hover:bg-amber-500/30 text-xs cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Save Preset to Bestiary
                </button>
              </form>
            )}

            <div className="pt-2 border-t border-amber-500/40 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPresetManagerOpen(false)}
                className="px-4 py-1.5 rounded bg-amber-500/20 border border-amber-500/60 text-amber-300 hover:bg-amber-500/30 uppercase font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: 5E MONSTER MANUAL DRILL-DOWN STATBLOCK CARD */}
      {activeInspectStatblock && (() => {
        const { statblock, currentHull, currentShields, shipId } = activeInspectStatblock

        const formatMod = (score?: number) => {
          if (score === undefined) return "+0"
          const mod = Math.floor((score - 10) / 2)
          return mod >= 0 ? `+${mod}` : `${mod}`
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 font-mono">
            <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-lg border-2 border-amber-500 bg-slate-950 p-4 sm:p-6 shadow-[0_0_40px_rgba(245,158,11,0.3)] flex flex-col gap-4 text-xs">
              <div className="border-b-2 border-amber-500/80 pb-2 flex justify-between items-start">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-amber-400 tracking-wider uppercase font-serif">
                    {statblock.name}
                  </h3>
                  <div className="text-[11px] text-muted-foreground italic mt-0.5">
                    {statblock.size} {statblock.shipType}, {statblock.faction} (Tier {statblock.tier ?? 0} {statblock.threatClassification ? `• ${statblock.threatClassification}` : ""})
                  </div>
                </div>
                <button
                  onClick={() => setActiveInspectStatblock(null)}
                  className="text-muted-foreground hover:text-white cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Defense & Motive bar with DR and DT */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 py-1 text-slate-200 border-b border-amber-500/40">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-300 block">Armor Class</span>
                  <span className="text-sm sm:text-base font-bold text-slate-100">{statblock.armorClass}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-300 block">Hull HP</span>
                  <span className="text-sm sm:text-base font-bold text-rose-400">
                    {currentHull !== undefined ? currentHull : statblock.hullMax} / {statblock.hullMax}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-300 block">Shields</span>
                  <span className="text-sm sm:text-base font-bold text-cyan-300">
                    {currentShields !== undefined ? currentShields : statblock.shieldsMax} / {statblock.shieldsMax}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-300 block">DR / Threshold</span>
                  <span className="text-xs font-bold text-amber-200 block">
                    DR {statblock.damageReduction ?? 0} {statblock.damageThreshold ? `(DT ${statblock.damageThreshold})` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-300 block">Speed / Turn</span>
                  <span className="text-xs font-bold text-slate-100 block">{statblock.speed}</span>
                  <span className="text-[10px] text-muted-foreground block">{statblock.turningSpeed} Turn</span>
                </div>
              </div>

              {/* 6 Core Starship Ability Scores */}
              <div className="grid grid-cols-6 gap-1 text-center py-2 bg-amber-500/5 rounded border border-amber-500/20">
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase block">STR</span>
                  <span className="font-bold text-xs text-slate-200">{statblock.stats?.str ?? 10} ({formatMod(statblock.stats?.str)})</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase block">DEX</span>
                  <span className="font-bold text-xs text-slate-200">{statblock.stats?.dex ?? 10} ({formatMod(statblock.stats?.dex)})</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase block">CON</span>
                  <span className="font-bold text-xs text-slate-200">{statblock.stats?.con ?? 10} ({formatMod(statblock.stats?.con)})</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase block">INT</span>
                  <span className="font-bold text-xs text-slate-200">{statblock.stats?.int ?? 10} ({formatMod(statblock.stats?.int)})</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase block">WIS</span>
                  <span className="font-bold text-xs text-slate-200">{statblock.stats?.wis ?? 10} ({formatMod(statblock.stats?.wis)})</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase block">CHA</span>
                  <span className="font-bold text-xs text-slate-200">{statblock.stats?.cha ?? 10} ({formatMod(statblock.stats?.cha)})</span>
                </div>
              </div>

              {/* Saves, Skills, Resistances */}
              <div className="flex flex-col gap-1 text-[11px] text-slate-300 border-b border-amber-500/40 pb-2">
                {statblock.savingThrows && (
                  <div><strong className="text-amber-300">Saving Throws:</strong> {statblock.savingThrows}</div>
                )}
                {statblock.skills && (
                  <div><strong className="text-amber-300">Skills:</strong> {statblock.skills}</div>
                )}
                {statblock.damageResistances && (
                  <div><strong className="text-amber-300">Damage Resistances:</strong> {statblock.damageResistances}</div>
                )}
                {statblock.damageImmunities && (
                  <div><strong className="text-amber-300">Damage Immunities:</strong> {statblock.damageImmunities}</div>
                )}
                {statblock.conditionImmunities && (
                  <div><strong className="text-amber-300">Condition Immunities:</strong> {statblock.conditionImmunities}</div>
                )}
                {statblock.senses && (
                  <div><strong className="text-amber-300">Senses:</strong> {statblock.senses}</div>
                )}
              </div>

              {/* Traits & Passive Features */}
              {statblock.traits && statblock.traits.length > 0 && (
                <div className="flex flex-col gap-2 border-b border-amber-500/40 pb-3">
                  {statblock.traits.map((t, idx) => (
                    <div key={idx} className="leading-relaxed">
                      <strong className="text-amber-300 font-bold">{t.name}.</strong> {t.description}
                    </div>
                  ))}
                </div>
              )}

              {/* Actions with Interactive Dice Rolling Buttons */}
              <div className="flex flex-col gap-2.5">
                <h4 className="text-xs sm:text-sm font-bold text-amber-400 uppercase border-b border-amber-500/30 pb-0.5 tracking-wider">
                  Actions
                </h4>
                {statblock.actions?.map((act, idx) => (
                  <div key={idx} className="leading-relaxed bg-black/40 p-2.5 rounded border border-slate-800 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <strong className="text-rose-400 font-bold text-xs uppercase">{act.name}</strong>
                      <div className="flex items-center gap-1.5">
                        {act.attackBonus !== undefined && (
                          <button
                            type="button"
                            onClick={() => handleRollToHit(statblock.name, act)}
                            className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-neon/60 text-cyan-300 hover:bg-cyan-900 font-bold uppercase text-[10px] flex items-center gap-1 cursor-pointer shadow-sm"
                            title={`Roll 1d20 + ${act.attackBonus}`}
                          >
                            <Dices className="h-3 w-3" />
                            Roll To Hit (+{act.attackBonus})
                          </button>
                        )}
                        {act.damage && (
                          <button
                            type="button"
                            onClick={() => handleRollDamage(statblock.name, act)}
                            className="px-2 py-0.5 rounded bg-amber-950 border border-amber-500/60 text-amber-300 hover:bg-amber-900 font-bold uppercase text-[10px] flex items-center gap-1 cursor-pointer shadow-sm"
                            title={`Roll ${act.damage}`}
                          >
                            <Target className="h-3 w-3" />
                            Roll Dmg ({act.damage})
                          </button>
                        )}
                      </div>
                    </div>
                    {act.damage && (
                      <div className="text-[11px] text-amber-300 font-mono">
                        Damage: <strong>{act.damage}</strong> {act.damageType} &bull; Range: {act.range}
                      </div>
                    )}
                    <p className="text-[11px] text-slate-300">{act.description}</p>
                  </div>
                ))}
              </div>

              {/* Bonus Actions */}
              {statblock.bonusActions && statblock.bonusActions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-amber-300 uppercase border-b border-amber-500/30 pb-0.5 tracking-wider">
                    Bonus Actions
                  </h4>
                  {statblock.bonusActions.map((bact, idx) => (
                    <div key={idx} className="leading-relaxed bg-black/40 p-2 rounded border border-slate-800">
                      <strong className="text-amber-300 font-bold text-xs uppercase">{bact.name}.</strong>{" "}
                      <span className="text-slate-300 text-[11px]">{bact.description}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Reactions */}
              {statblock.reactions && statblock.reactions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-cyan-300 uppercase border-b border-cyan-500/30 pb-0.5 tracking-wider">
                    Reactions
                  </h4>
                  {statblock.reactions.map((react, idx) => (
                    <div key={idx} className="leading-relaxed bg-black/40 p-2 rounded border border-slate-800">
                      <strong className="text-cyan-300 font-bold text-xs uppercase">{react.name}.</strong> {react.description}
                    </div>
                  ))}
                </div>
              )}

              {/* Legendary Actions */}
              {statblock.legendaryActions && (
                <div className="flex flex-col gap-2 bg-amber-950/20 p-3 rounded border border-amber-500/40 mt-1">
                  <div className="flex items-center justify-between border-b border-amber-500/40 pb-1">
                    <h4 className="text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" /> Legendary Actions
                    </h4>
                    <span className="text-[10px] text-amber-300 font-bold">
                      {statblock.legendaryActions.actionsPerRound} / Round
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    The {statblock.name} can take {statblock.legendaryActions.actionsPerRound} legendary actions, choosing from the options below. Only one legendary action can be used at a time and only at the end of another ship&apos;s turn. It regains spent legendary actions at the start of its turn.
                  </p>
                  {statblock.legendaryActions.actions.map((lact, idx) => (
                    <div key={idx} className="leading-relaxed text-[11px] text-slate-200">
                      <strong className="text-amber-300 font-bold">{lact.name}.</strong> {lact.description}
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-amber-500/40 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveInspectStatblock(null)}
                  className="px-4 py-1.5 rounded bg-amber-500/20 border border-amber-500/60 text-amber-300 hover:bg-amber-500/30 uppercase font-bold cursor-pointer"
                >
                  Close Statblock
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}