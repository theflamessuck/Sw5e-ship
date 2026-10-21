"use client"

import { useState, useMemo, useEffect } from "react"
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
  ListFilter
} from "lucide-react"
import type { ActiveStatus } from "./defense-station"
import type { ManifestMember } from "./bridge-dashboard"

export interface NpcAction {
  name: string
  type: "Action" | "Bonus Action" | "Reaction" | "Legendary Action"
  description: string
  attackBonus?: number
  range?: string
  damage?: string
  damageType?: string
}

export interface NpcShipStatblock {
  name: string
  faction: "Galactic Empire" | "Pirates & Raiders" | "Bounty Hunters" | "Syndicates" | "Scavengers & Guilds" | "Civilians" | "Custom"
  tierOrCr: string
  size: "Tiny" | "Small" | "Medium" | "Large" | "Huge" | "Gargantuan"
  shipType: string
  classification: "Threat" | "Vessel" | "Anomaly" | "Debris" | "Station"
  armorClass: number
  hullMax: number
  shieldsMax: number
  speed: string
  turningSpeed: string
  stats: {
    str: number
    dex: number
    con: number
    int: number
    wis: number
    cha: number
  }
  savingThrows?: string
  skills?: string
  damageResistances?: string
  damageImmunities?: string
  conditionImmunities?: string
  senses?: string
  scanDc: number
  distance: string
  defaultNotes: string
  traits?: { name: string; description: string }[]
  actions: NpcAction[]
  reactions?: NpcAction[]
  legendaryActions?: {
    actionsPerRound: number
    actions: NpcAction[]
  }
}

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
  hasTakenTurn: boolean
  notes?: string
  contactId?: string
  statblock?: NpcShipStatblock
}

interface GmStationProps {
  contacts: SensorContact[]
  onAddContact: (contact: Omit<SensorContact, "id">) => void
  onRemoveContact: (id: string) => void
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
}

export const DEFAULT_NPC_SHIP_BESTIARY: NpcShipStatblock[] = [
  {
    name: "TIE/ln Space Superiority Fighter",
    faction: "Galactic Empire",
    tierOrCr: "CR 2 (Tier 1)",
    size: "Small",
    shipType: "Snubfighter",
    classification: "Threat",
    armorClass: 13,
    hullMax: 18,
    shieldsMax: 0,
    speed: "400 ft (Fly)",
    turningSpeed: "100 ft",
    stats: { str: 10, dex: 16, con: 11, int: 8, wis: 12, cha: 8 },
    skills: "Piloting +5, Scan +3",
    senses: "Passive Scan 13",
    scanDc: 14,
    distance: "12,000 km",
    defaultNotes: "Standard Imperial fighter. Fragile chassis, but swift in numbers.",
    traits: [
      {
        name: "Swarm Tactics",
        description: "Advantage on attack rolls if an allied ship is within 150 ft of the target."
      }
    ],
    actions: [
      {
        name: "L-s1 Twin Laser Cannons",
        type: "Action",
        attackBonus: 5,
        range: "600/2,400 ft",
        damage: "2d6 + 3",
        damageType: "Energy",
        description: "Ranged Ship Attack: +5 to hit. Hit: 10 (2d6 + 3) energy damage."
      }
    ]
  },
  {
    name: "TIE/in Interceptor",
    faction: "Galactic Empire",
    tierOrCr: "CR 4 (Tier 2)",
    size: "Small",
    shipType: "Interceptor",
    classification: "Threat",
    armorClass: 15,
    hullMax: 26,
    shieldsMax: 0,
    speed: "450 ft (Fly)",
    turningSpeed: "50 ft",
    stats: { str: 10, dex: 18, con: 12, int: 10, wis: 14, cha: 8 },
    savingThrows: "Dex +6, Con +3",
    skills: "Piloting +6, Scan +4",
    senses: "Passive Scan 14",
    scanDc: 16,
    distance: "15,000 km",
    defaultNotes: "High-speed fighter. Quad cannons strip shields quickly.",
    actions: [
      {
        name: "Quad Laser Cannons",
        type: "Action",
        attackBonus: 6,
        range: "600/2,400 ft",
        damage: "3d6 + 4",
        damageType: "Energy",
        description: "Ranged Ship Attack: +6 to hit. Hit: 14 (3d6 + 4) energy damage."
      }
    ],
    reactions: [
      {
        name: "Snap Jink",
        type: "Reaction",
        description: "When hit by an attack, add +3 to AC against that attack."
      }
    ]
  },
  {
    name: "Imperial Arquitens Light Cruiser",
    faction: "Galactic Empire",
    tierOrCr: "CR 9 (Tier 3)",
    size: "Huge",
    shipType: "Cruiser",
    classification: "Threat",
    armorClass: 16,
    hullMax: 120,
    shieldsMax: 80,
    speed: "250 ft (Fly)",
    turningSpeed: "200 ft",
    stats: { str: 18, dex: 12, con: 16, int: 14, wis: 14, cha: 12 },
    savingThrows: "Str +8, Con +7, Wis +6",
    damageResistances: "Kinetic and Energy from non-heavy weapons",
    senses: "Passive Scan 16",
    scanDc: 16,
    distance: "25,000 km",
    defaultNotes: "Escort cruiser with quad dual-turbolaser batteries and concussion missiles.",
    actions: [
      {
        name: "Dual Turbolaser Battery",
        type: "Action",
        attackBonus: 8,
        range: "1,200/4,800 ft",
        damage: "4d10 + 4",
        damageType: "Energy",
        description: "Ranged Ship Attack: +8 to hit. Hit: 26 (4d10 + 4) energy damage."
      },
      {
        name: "Concussion Missile Tube (Recharge 5-6)",
        type: "Action",
        range: "1,000/4,000 ft",
        damage: "6d6",
        damageType: "Kinetic",
        description: "DC 15 Dex save. Fail: 21 (6d6) kinetic damage and pushed 50 ft. Half on save."
      }
    ]
  },
  {
    name: "R-41 Starchaser Corsair",
    faction: "Pirates & Raiders",
    tierOrCr: "CR 3 (Tier 1)",
    size: "Small",
    shipType: "Fighter",
    classification: "Threat",
    armorClass: 14,
    hullMax: 24,
    shieldsMax: 12,
    speed: "350 ft (Fly)",
    turningSpeed: "100 ft",
    stats: { str: 12, dex: 15, con: 13, int: 8, wis: 10, cha: 12 },
    skills: "Menace +3, Piloting +4",
    scanDc: 12,
    distance: "14,000 km",
    defaultNotes: "Outlaw raider with light shielding and proton torpedo racks.",
    actions: [
      {
        name: "Twin Heavy Blaster Cannons",
        type: "Action",
        attackBonus: 4,
        range: "600/2,400 ft",
        damage: "2d8 + 2",
        damageType: "Energy",
        description: "Ranged Ship Attack: +4 to hit. Hit: 11 (2d8 + 2) energy damage."
      },
      {
        name: "Proton Torpedo (2 Tubes)",
        type: "Action",
        range: "800/3,200 ft",
        damage: "4d10",
        damageType: "Kinetic",
        description: "DC 13 Dex save. Fail: 22 (4d10) kinetic damage. Half on save."
      }
    ]
  },
  {
    name: "Firespray-31 Patrol Craft",
    faction: "Bounty Hunters",
    tierOrCr: "CR 7 (Tier 3)",
    size: "Medium",
    shipType: "Patrol Craft",
    classification: "Threat",
    armorClass: 16,
    hullMax: 65,
    shieldsMax: 45,
    speed: "350 ft (Fly)",
    turningSpeed: "100 ft",
    stats: { str: 16, dex: 16, con: 15, int: 12, wis: 16, cha: 12 },
    savingThrows: "Dex +6, Con +5, Wis +6",
    skills: "Scan +6, Piloting +6",
    scanDc: 17,
    distance: "18,000 km",
    defaultNotes: "Heavy pursuit craft with seismic charge racks.",
    actions: [
      {
        name: "Twin Heavy Blaster Cannons",
        type: "Action",
        attackBonus: 6,
        range: "600/2,400 ft",
        damage: "2d10 + 3",
        damageType: "Energy",
        description: "Ranged Ship Attack: +6 to hit. Hit: 14 (2d10 + 3) energy damage."
      },
      {
        name: "Seismic Charge (1/Day)",
        type: "Action",
        range: "Aft 100 ft",
        damage: "8d8",
        damageType: "Sonic/Energy",
        description: "300-ft blast. DC 16 Con save. Fail: 36 (8d8) damage and Stunned 1 turn. Half on save."
      }
    ]
  }
]

export function GmStation({
  contacts,
  onAddContact,
  onRemoveContact,
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
}: GmStationProps) {
  const [bestiaryList, setBestiaryList] = useState<NpcShipStatblock[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sw5e_custom_bestiary")
      if (saved) {
        try {
          return JSON.parse(saved)
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

  const [combatRound, setCombatRound] = useState<number>(1)
  const [manualShipInitOverride, setManualShipInitOverride] = useState<number | null>(null)
  const [playerShipHasActed, setPlayerShipHasActed] = useState<boolean>(false)
  const [isCrewExpanded, setIsCrewExpanded] = useState<boolean>(true)
  const [enemyShips, setEnemyShips] = useState<EnemyShip[]>([])

  const [activeInspectStatblock, setActiveInspectStatblock] = useState<{
    statblock: NpcShipStatblock
    currentHull?: number
    currentShields?: number
  } | null>(null)

  const [isPresetManagerOpen, setIsPresetManagerOpen] = useState<boolean>(false)
  const [managerTab, setManagerTab] = useState<"list" | "create">("list")

  const [customPresetForm, setCustomPresetForm] = useState<Partial<NpcShipStatblock>>({
    name: "",
    faction: "Custom",
    tierOrCr: "CR 3 (Tier 1)",
    size: "Small",
    shipType: "Gunship",
    classification: "Threat",
    armorClass: 14,
    hullMax: 30,
    shieldsMax: 15,
    speed: "350 ft (Fly)",
    turningSpeed: "100 ft",
    stats: { str: 12, dex: 14, con: 12, int: 10, wis: 10, cha: 10 },
    scanDc: 12,
    distance: "15,000 km",
    defaultNotes: "Custom vessel profile.",
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
    ]
  })

  const [name, setName] = useState("")
  const [classification, setClassification] = useState<"Vessel" | "Threat" | "Anomaly" | "Debris" | "Station">("Vessel")
  const [distance, setDistance] = useState("10,000 km")
  const [scanDc, setScanDc] = useState(12)
  const [contactHull, setContactHull] = useState<string>("20")
  const [contactShields, setContactShields] = useState<string>("0")
  const [contactAC, setContactAC] = useState<string>("13")
  const [contactInit, setContactInit] = useState<string>("12")
  const [gmNotes, setGmNotes] = useState("")
  const [activePresetObject, setActivePresetObject] = useState<NpcShipStatblock | undefined>(undefined)

  const [newEnemyName, setNewEnemyName] = useState("")
  const [newEnemyInit, setNewEnemyInit] = useState("14")
  const [newEnemyHull, setNewEnemyHull] = useState("20")
  const [newEnemyShields, setNewEnemyShields] = useState("0")
  const [newEnemyAC, setNewEnemyAC] = useState("13")

  const handleToggleCondition = (conditionTitle: string, defaultEffect: string) => {
    const existing = shipStatuses.find((s) => s.title.toLowerCase() === conditionTitle.toLowerCase())
    if (existing) {
      onRemoveStatus?.(existing.id)
    } else {
      onAddStatus?.({
        id: `cond-${conditionTitle.toLowerCase()}-${Date.now()}`,
        title: conditionTitle.toUpperCase(),
        effect: defaultEffect,
        duration: "Until Cleared by GM",
      })
    }
  }

  const calculatedPlayerShipInit = useMemo(() => {
    const deployedMembers = manifest.filter((m) => !m.isPassenger)
    if (deployedMembers.length === 0) return 10
    const inits = deployedMembers.map((m) => m.individualInitiative || 0)
    return Math.min(...inits)
  }, [manifest])

  const effectivePlayerShipInit = manualShipInitOverride !== null 
    ? manualShipInitOverride 
    : calculatedPlayerShipInit

  const crewActionStats = useMemo(() => {
    const deployed = manifest.filter((m) => !m.isPassenger)
    const acted = deployed.filter((m) => m.hasTakenTurnThisRound)
    return {
      total: deployed.length,
      acted: acted.length,
      allDone: deployed.length > 0 && acted.length === deployed.length,
    }
  }, [manifest])

  const shipQueue = useMemo(() => {
    const playerShipEntry = {
      id: "player-vessel",
      name: "Player Vessel",
      isPlayerShip: true,
      initiative: effectivePlayerShipInit,
      hasTakenTurn: playerShipHasActed || crewActionStats.allDone,
      hull: `${currentHull}/${maxHull} HP`,
      shields: `${currentShields}/${maxShields} SP`,
      armorClass: "Ship AC",
      notes: "Lowest Crew Initiative",
      statblock: undefined,
      hullCurrent: currentHull,
      shieldsCurrent: currentShields,
    }

    const enemies = enemyShips.map((e) => ({
      id: e.id,
      name: e.name,
      isPlayerShip: false,
      initiative: e.initiative,
      hasTakenTurn: e.hasTakenTurn,
      hull: `${e.hullCurrent}/${e.hullMax} HP`,
      shields: `${e.shieldsCurrent}/${e.shieldsMax} SP`,
      armorClass: `AC ${e.armorClass}`,
      notes: e.notes || "",
      statblock: e.statblock,
      hullCurrent: e.hullCurrent,
      shieldsCurrent: e.shieldsCurrent,
    }))

    return [playerShipEntry, ...enemies].sort((a, b) => b.initiative - a.initiative)
  }, [
    effectivePlayerShipInit,
    playerShipHasActed,
    crewActionStats.allDone,
    currentHull,
    maxHull,
    currentShields,
    maxShields,
    enemyShips
  ])

  const handleNextTurnCycle = () => {
    const nextShip = shipQueue.find((s) => !s.hasTakenTurn)
    if (nextShip) {
      if (nextShip.isPlayerShip) {
        setPlayerShipHasActed(true)
      } else {
        setEnemyShips((prev) =>
          prev.map((e) => (e.id === nextShip.id ? { ...e, hasTakenTurn: true } : e))
        )
      }
    } else {
      handleAdvanceRound()
    }
  }

  const handleAdvanceRound = () => {
    setCombatRound((prev) => prev + 1)
    setPlayerShipHasActed(false)
    setEnemyShips((prev) => prev.map((e) => ({ ...e, hasTakenTurn: false })))
    onCycleReactor?.()
  }

  const handleAddEnemy = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEnemyName.trim()) return

    const enemy: EnemyShip = {
      id: `enemy-${Date.now()}`,
      name: newEnemyName.trim(),
      initiative: parseInt(newEnemyInit, 10) || 10,
      hullCurrent: parseInt(newEnemyHull, 10) || 20,
      hullMax: parseInt(newEnemyHull, 10) || 20,
      shieldsCurrent: parseInt(newEnemyShields, 10) || 0,
      shieldsMax: parseInt(newEnemyShields, 10) || 0,
      armorClass: parseInt(newEnemyAC, 10) || 12,
      hasTakenTurn: false,
    }

    setEnemyShips((prev) => [enemy, ...prev])
    setNewEnemyName("")
  }

  const handleSelectPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTitle = e.target.value
    if (!selectedTitle) return

    const preset = bestiaryList.find((p) => p.name === selectedTitle)
    if (preset) {
      setName(preset.name)
      setClassification(preset.classification)
      setScanDc(preset.scanDc)
      setDistance(preset.distance)
      setContactHull(preset.hullMax.toString())
      setContactShields(preset.shieldsMax.toString())
      setContactAC(preset.armorClass.toString())
      setContactInit(Math.floor((preset.stats.dex - 10) / 2 + 10).toString())
      setGmNotes(preset.defaultNotes)
      setActivePresetObject(preset)
    }
  }

  const handleSubmitContact = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const parsedHull = parseInt(contactHull, 10) || 20
    const parsedShields = parseInt(contactShields, 10) || 0
    const parsedAC = parseInt(contactAC, 10) || 12
    const parsedInit = parseInt(contactInit, 10) || 10

    onAddContact({
      name,
      classification,
      distance,
      scanDc: Number(scanDc),
      isRevealed: false,
      gmNotes,
      hullCurrent: parsedHull,
      hullMax: parsedHull,
      shieldsCurrent: parsedShields,
      shieldsMax: parsedShields,
      armorClass: parsedAC,
      initiative: parsedInit,
      statblock: activePresetObject,
    })

    setName("")
    setGmNotes("")
    setActivePresetObject(undefined)
  }

  const handleToggleContactInInitiative = (contact: SensorContact) => {
    const existing = enemyShips.find((e) => e.contactId === contact.id || e.name === contact.name)
    if (existing) {
      setEnemyShips((prev) => prev.filter((e) => e.id !== existing.id))
    } else {
      const newShip: EnemyShip = {
        id: `combat-${contact.id}`,
        contactId: contact.id,
        name: contact.name,
        initiative: contact.initiative ?? 10,
        hullCurrent: contact.hullCurrent ?? 20,
        hullMax: contact.hullMax ?? 20,
        shieldsCurrent: contact.shieldsCurrent ?? 0,
        shieldsMax: contact.shieldsMax ?? 0,
        armorClass: contact.armorClass ?? 13,
        hasTakenTurn: false,
        notes: `Sector Contact (${contact.distance})`,
        statblock: contact.statblock,
      }
      setEnemyShips((prev) => [...prev, newShip])
    }
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

    const newPreset: NpcShipStatblock = {
      name: customPresetForm.name.trim(),
      faction: customPresetForm.faction || "Custom",
      tierOrCr: customPresetForm.tierOrCr || "CR 2 (Tier 1)",
      size: customPresetForm.size || "Small",
      shipType: customPresetForm.shipType || "Fighter",
      classification: customPresetForm.classification || "Threat",
      armorClass: Number(customPresetForm.armorClass) || 13,
      hullMax: Number(customPresetForm.hullMax) || 20,
      shieldsMax: Number(customPresetForm.shieldsMax) || 0,
      speed: customPresetForm.speed || "350 ft (Fly)",
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
      ]
    }

    setBestiaryList((prev) => [newPreset, ...prev])
    setManagerTab("list")
    alert(`Custom preset "${newPreset.name}" added to Bestiary!`)
    setCustomPresetForm({
      name: "",
      faction: "Custom",
      tierOrCr: "CR 3 (Tier 1)",
      size: "Small",
      shipType: "Gunship",
      classification: "Threat",
      armorClass: 14,
      hullMax: 30,
      shieldsMax: 15,
      speed: "350 ft (Fly)",
      turningSpeed: "100 ft",
      stats: { str: 12, dex: 14, con: 12, int: 10, wis: 10, cha: 10 },
      scanDc: 12,
      distance: "15,000 km",
      defaultNotes: "Custom vessel profile.",
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
      ]
    })
  }

  const handleResetDefaultBestiary = () => {
    if (confirm("Reset bestiary to default Star Wars ships? All custom presets will be overwritten.")) {
      setBestiaryList(DEFAULT_NPC_SHIP_BESTIARY)
    }
  }

  return (
    <div className="flex flex-col gap-5 font-mono">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-amber-500/40 pb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-[0.15em] text-amber-400 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400 animate-pulse" />
            GAME MASTER COMMAND OVERSIGHT
          </h2>
          <p className="text-[10px] tracking-[0.3em] text-muted-foreground/60">
            ENCRYPTED GM CONSOLE // BESTIARY &amp; INITIATIVE DIRECTOR
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-sm border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-amber-400 animate-pulse">
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
        </div>
      </div>

      {/* 1. SHIP-LEVEL INITIATIVE TRACKER */}
      <section className="rounded-md border border-amber-500/50 bg-bridge-panel p-4 shadow-[0_0_15px_rgba(245,158,11,0.08)] flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-amber-500/30 pb-2 gap-2">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold tracking-[0.2em] text-amber-300 uppercase">
              Ship Combat Initiative Order
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <span>Player Ship Init:</span>
              <input
                type="number"
                value={effectivePlayerShipInit}
                onChange={(e) => setManualShipInitOverride(parseInt(e.target.value, 10) || 0)}
                className="w-12 text-center rounded bg-black border border-cyan-500/60 text-cyan-300 font-bold py-0.5 text-xs focus:outline-none"
                title="Override Player Ship Initiative"
              />
              <span className="text-[9px] text-muted-foreground">(Lowest Crew Roll)</span>
            </div>
            <button
              type="button"
              onClick={handleNextTurnCycle}
              className="px-3 py-1 rounded border border-emerald-500/60 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer shadow-[0_0_8px_rgba(52,211,153,0.3)]"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Next Ship Turn
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {shipQueue.map((ship) => {
            const isCurrent = !ship.hasTakenTurn && shipQueue.find((s) => !s.hasTakenTurn)?.id === ship.id

            if (ship.isPlayerShip) {
              return (
                <div
                  key={ship.id}
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
                      <div className="flex items-center justify-center h-8 w-10 bg-cyan-950 border border-cyan-neon/50 rounded text-cyan-300 font-bold text-base">
                        {ship.initiative}
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
                        onClick={() => setPlayerShipHasActed((prev) => !prev)}
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

            return (
              <div
                key={ship.id}
                className={`rounded border p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition-all ${
                  isCurrent
                    ? "border-rose-500 bg-rose-950/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                    : ship.hasTakenTurn
                    ? "border-slate-800 bg-black/40 opacity-60"
                    : "border-bridge-border bg-black/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-10 bg-rose-950 border border-rose-500/50 rounded text-rose-300 font-bold text-base">
                    {ship.initiative}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (ship.statblock) {
                            setActiveInspectStatblock({
                              statblock: ship.statblock,
                              currentHull: ship.hullCurrent,
                              currentShields: ship.shieldsCurrent,
                            })
                          }
                        }}
                        className="font-bold text-sm text-rose-400 hover:text-rose-200 underline decoration-dotted text-left uppercase cursor-pointer"
                        title="Click to view statblock"
                      >
                        {ship.name}
                      </button>
                      {isCurrent && (
                        <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-rose-500 text-white uppercase animate-pulse">
                          ACTIVE TURN
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                      {ship.hull} • {ship.shields} • {ship.armorClass} {ship.notes ? `• ${ship.notes}` : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {ship.statblock && (
                    <button
                      type="button"
                      onClick={() => setActiveInspectStatblock({
                        statblock: ship.statblock!,
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

                  <button
                    type="button"
                    onClick={() => {
                      setEnemyShips((prev) =>
                        prev.map((e) => (e.id === ship.id ? { ...e, hasTakenTurn: !e.hasTakenTurn } : e))
                      )
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

                  <button
                    type="button"
                    onClick={() => setEnemyShips((prev) => prev.filter((e) => e.id !== ship.id))}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 transition cursor-pointer"
                    title="Remove vessel from encounter"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
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
            className="w-14 rounded bg-black border border-slate-700 px-1.5 py-1 text-center text-amber-300 font-bold text-xs"
            title="Ship Initiative"
          />
          <input
            type="number"
            placeholder="HP"
            value={newEnemyHull}
            onChange={(e) => setNewEnemyHull(e.target.value)}
            className="w-14 rounded bg-black border border-slate-700 px-1.5 py-1 text-center text-rose-300 font-bold text-xs"
            title="Hull Points"
          />
          <input
            type="number"
            placeholder="SP"
            value={newEnemyShields}
            onChange={(e) => setNewEnemyShields(e.target.value)}
            className="w-14 rounded bg-black border border-slate-700 px-1.5 py-1 text-center text-cyan-300 font-bold text-xs"
            title="Shield Points"
          />
          <input
            type="number"
            placeholder="AC"
            value={newEnemyAC}
            onChange={(e) => setNewEnemyAC(e.target.value)}
            className="w-14 rounded bg-black border border-slate-700 px-1.5 py-1 text-center text-slate-200 font-bold text-xs"
            title="Armor Class"
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
              const active = shipStatuses.some((s) => s.title.toLowerCase() === cond.title.toLowerCase())
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
              Manage Presets
            </button>
          </div>

          <form onSubmit={handleSubmitContact} className="flex flex-col gap-2.5 text-xs">
            <div className="flex flex-col gap-1 rounded bg-amber-500/5 border border-amber-500/20 p-2">
              <label className="text-[10px] tracking-wider text-amber-400 uppercase font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Bookmark className="w-3 h-3" /> Preset Ship Bestiary
                </span>
                <span className="text-[9px] text-muted-foreground">{bestiaryList.length} ships</span>
              </label>
              <select
                onChange={handleSelectPreset}
                defaultValue=""
                className="rounded border border-amber-500/40 bg-black/60 px-2 py-1 text-amber-200 focus:border-amber-500 focus:outline-none text-xs"
              >
                <option value="" disabled>-- Select ship from bestiary --</option>
                {bestiaryList.map((preset) => (
                  <option key={preset.name} value={preset.name}>
                    {preset.name} [{preset.faction}] ({preset.tierOrCr})
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contact Name / Identifier"
              className="rounded border border-bridge-border bg-black/40 px-2.5 py-1.5 text-amber-200 placeholder:text-muted-foreground/40 focus:border-amber-500 focus:outline-none text-xs"
              required
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value as any)}
                className="rounded border border-bridge-border bg-black/40 px-2 py-1.5 text-amber-200 focus:border-amber-500 focus:outline-none text-xs"
              >
                <option value="Vessel">Vessel</option>
                <option value="Anomaly">Anomaly</option>
                <option value="Debris">Debris</option>
                <option value="Station">Station</option>
                <option value="Threat">Threat</option>
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

            <div className="p-2 rounded bg-black/60 border border-slate-700 flex flex-col gap-1.5">
              <span className="text-[9px] uppercase font-bold text-muted-foreground">
                Combat Specifications:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                <div>
                  <span className="text-[8px] text-muted-foreground uppercase block">HP</span>
                  <input
                    type="number"
                    value={contactHull}
                    onChange={(e) => setContactHull(e.target.value)}
                    className="w-full rounded bg-black border border-slate-700 px-1 py-0.5 text-rose-300 font-bold text-center text-xs"
                  />
                </div>
                <div>
                  <span className="text-[8px] text-muted-foreground uppercase block">SP</span>
                  <input
                    type="number"
                    value={contactShields}
                    onChange={(e) => setContactShields(e.target.value)}
                    className="w-full rounded bg-black border border-slate-700 px-1 py-0.5 text-cyan-300 font-bold text-center text-xs"
                  />
                </div>
                <div>
                  <span className="text-[8px] text-muted-foreground uppercase block">AC</span>
                  <input
                    type="number"
                    value={contactAC}
                    onChange={(e) => setContactAC(e.target.value)}
                    className="w-full rounded bg-black border border-slate-700 px-1 py-0.5 text-slate-200 font-bold text-center text-xs"
                  />
                </div>
                <div>
                  <span className="text-[8px] text-muted-foreground uppercase block">Init</span>
                  <input
                    type="number"
                    value={contactInit}
                    onChange={(e) => setContactInit(e.target.value)}
                    className="w-full rounded bg-black border border-slate-700 px-1 py-0.5 text-amber-300 font-bold text-center text-xs"
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
              Deploy Contact
            </button>
          </form>
        </section>

        <section className="rounded-md border border-bridge-border bg-bridge-panel p-4 flex flex-col gap-3 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-bridge-border/60 pb-2">
            <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase">
              Deployed Contacts ({contacts.length})
            </h3>
            <span className="text-[10px] text-muted-foreground">
              Select contacts to inspect statblocks or engage into Initiative
            </span>
          </div>

          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 border border-dashed border-bridge-border/60 rounded-md text-muted-foreground/60 text-xs">
              No contacts currently deployed in sector.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 overflow-y-auto max-h-96 pr-1">
              {contacts.map((contact) => {
                const isEngagedInCombat = enemyShips.some(
                  (e) => e.contactId === contact.id || e.name === contact.name
                )

                return (
                  <div
                    key={contact.id}
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
                          title={isEngagedInCombat ? "Remove from Initiative" : "Add to Initiative"}
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
                      <span>Init: <strong className="text-amber-300">+{contact.initiative ?? 10}</strong></span>
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
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-lg border-2 border-amber-500 bg-slate-950 p-4 sm:p-5 shadow-[0_0_30px_rgba(245,158,11,0.3)] flex flex-col gap-3 text-xs">
            <div className="border-b border-amber-500/80 pb-2 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm sm:text-base font-black text-amber-400 tracking-wider uppercase">
                  Bestiary Manager
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
                  Reset
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
                Manage Presets ({bestiaryList.length})
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
                Create New Ship
              </button>
            </div>

            {managerTab === "list" && (
              <div className="flex flex-col gap-2 p-2 rounded bg-black/40 border border-bridge-border/60">
                <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[50vh] pr-1">
                  {bestiaryList.map((preset) => (
                    <div
                      key={preset.name}
                      className="p-2 rounded border border-slate-800 bg-slate-950/70 flex items-center justify-between gap-2"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs truncate text-amber-200">{preset.name}</span>
                        <span className="text-[9px] text-muted-foreground truncate">
                          {preset.faction} • {preset.tierOrCr} • {preset.hullMax} HP • AC {preset.armorClass}
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
                          View
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
                      placeholder="e.g. Scythe Raider"
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
                      <option value="Civilians">Civilians</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">CR / Tier</span>
                    <input
                      type="text"
                      placeholder="CR 3 (Tier 1)"
                      value={customPresetForm.tierOrCr}
                      onChange={(e) => setCustomPresetForm({ ...customPresetForm, tierOrCr: e.target.value })}
                      className="w-full rounded bg-black border border-slate-700 px-2 py-1 text-slate-200 text-xs"
                    />
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
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Type</span>
                    <input
                      type="text"
                      placeholder="e.g. Gunship"
                      value={customPresetForm.shipType}
                      onChange={(e) => setCustomPresetForm({ ...customPresetForm, shipType: e.target.value })}
                      className="w-full rounded bg-black border border-slate-700 px-2 py-1 text-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 bg-slate-900/40 p-2 rounded border border-slate-800">
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
                      placeholder="350 ft (Fly)"
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
        const { statblock, currentHull, currentShields } = activeInspectStatblock

        const formatMod = (score: number) => {
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
                    {statblock.size} {statblock.shipType}, {statblock.faction} ({statblock.tierOrCr})
                  </div>
                </div>
                <button
                  onClick={() => setActiveInspectStatblock(null)}
                  className="text-muted-foreground hover:text-white cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1 text-slate-200 border-b border-amber-500/40">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-300 block">Armor Class</span>
                  <span className="text-sm sm:text-base font-bold text-slate-100">{statblock.armorClass}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-300 block">Hull Points</span>
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
                  <span className="text-[10px] uppercase font-bold text-amber-300 block">Speed / Turn</span>
                  <span className="text-xs font-bold text-slate-100 block">{statblock.speed}</span>
                  <span className="text-[10px] text-muted-foreground block">{statblock.turningSpeed} Turn</span>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-1 text-center py-2 bg-amber-500/5 rounded border border-amber-500/20">
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase block">STR</span>
                  <span className="font-bold text-xs text-slate-200">{statblock.stats.str} ({formatMod(statblock.stats.str)})</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase block">DEX</span>
                  <span className="font-bold text-xs text-slate-200">{statblock.stats.dex} ({formatMod(statblock.stats.dex)})</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase block">CON</span>
                  <span className="font-bold text-xs text-slate-200">{statblock.stats.con} ({formatMod(statblock.stats.con)})</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase block">INT</span>
                  <span className="font-bold text-xs text-slate-200">{statblock.stats.int} ({formatMod(statblock.stats.int)})</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase block">WIS</span>
                  <span className="font-bold text-xs text-slate-200">{statblock.stats.wis} ({formatMod(statblock.stats.wis)})</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase block">CHA</span>
                  <span className="font-bold text-xs text-slate-200">{statblock.stats.cha} ({formatMod(statblock.stats.cha)})</span>
                </div>
              </div>

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

              {statblock.traits && statblock.traits.length > 0 && (
                <div className="flex flex-col gap-2 border-b border-amber-500/40 pb-3">
                  {statblock.traits.map((t, idx) => (
                    <div key={idx} className="leading-relaxed">
                      <strong className="text-amber-300 font-bold">{t.name}.</strong> {t.description}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                <h4 className="text-xs sm:text-sm font-bold text-amber-400 uppercase border-b border-amber-500/30 pb-0.5 tracking-wider">
                  Actions
                </h4>
                {statblock.actions.map((act, idx) => (
                  <div key={idx} className="leading-relaxed bg-black/40 p-2 rounded border border-slate-800">
                    <div className="flex items-center justify-between">
                      <strong className="text-rose-400 font-bold text-xs uppercase">{act.name}</strong>
                      {act.attackBonus !== undefined && (
                        <span className="text-[10px] text-cyan-300 font-bold">
                          +{act.attackBonus} to Hit • {act.range}
                        </span>
                      )}
                    </div>
                    {act.damage && (
                      <div className="text-[11px] text-amber-300 font-mono mt-0.5">
                        Damage: <strong>{act.damage}</strong> {act.damageType}
                      </div>
                    )}
                    <p className="text-[11px] text-slate-300 mt-1">{act.description}</p>
                  </div>
                ))}
              </div>

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