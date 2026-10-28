"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { HeaderBar } from "./header-bar"
import { StationSidebar, type Station } from "./station-sidebar"
import { WeaponsStation, type OrdnanceItem } from "./weapons-station"
import { SensorsStation } from "./sensors-station"
import { DefenseStation, type ActiveStatus } from "./defense-station"
import { ShipModifications, MASTER_MODIFICATIONS, type Modification, type InstalledSuite } from "./ship-modifications"
import { CargoStation } from "./cargo-station"
import { CrewStation } from "./crew-station"
import { CommunicationsStation } from "./communications-station"
import { EnginesStation } from "./engines-station"
import { NavcomputerStation, type JourneyData } from "./navcomputer-station"
import { FinanceStation, type Transaction } from "./finance-station"
import { EngineeringStation, type RechargeResultPayload } from "./engineering-station"
import { GmStation, type SensorContact, type CombatTurnState, type EnemyShip } from "./gm-station"
import { SuitesStation } from "./suites-station"
import { ShipSetup, type ShipConfig } from "./ship-setup"
import { SHIP_SIZE_RULES, SHIP_TYPE_RULES, ShipSize } from "@/lib/ship-rules"
import { STARSHIP_AMMUNITION } from "@/lib/starship-weapons"
import { CodexStation } from "./codex-station"
import { computeShipModifiers } from "@/lib/ship-modifiers"
import { AlertOctagon, RefreshCw, Radio, PowerOff } from "lucide-react"
import { useRoomSync } from "@/hooks/use-room-sync"
import { RoomSelector } from "./room-selector"

export type ShipStationId =
  | "helm"
  | "engineering"
  | "communications"
  | "defense"
  | "sensors"
  | "weapons"

export type ShipCompartmentId =
  | ShipStationId
  | `turret-${string}`
  | `suite-${string}`
  | "crew_quarters"
  | "passenger_lounge"
  | "cargo_bay"
  | "medical_bay"

export type CrewRoleTitle =
  | "Pilot"
  | "Copilot"
  | "Chief Engineer"
  | "Comms Officer"
  | "Defense Officer"
  | "Sensor Officer"
  | "Weapons Officer"
  | "Gunner"
  | "Suite Specialist"
  | "Support"
  | "Off Duty"
  | "Passenger"

export interface ManifestMember {
  id: string
  name: string
  isPlayer: boolean
  isPassenger: boolean
  location: ShipCompartmentId
  assignedOrder: number
  individualInitiative: number
  hasTakenTurnThisRound: boolean
  notes?: string
}

export interface TacticalMovementState {
  spentFeet: number
}

export function getCrewRole(
  member: ManifestMember,
  allMembers: ManifestMember[]
): CrewRoleTitle {
  if (member.isPassenger || member.location === "passenger_lounge") {
    return "Passenger"
  }

  if (
    member.location === "crew_quarters" ||
    member.location === "cargo_bay" ||
    member.location === "medical_bay"
  ) {
    return "Off Duty"
  }

  if (member.location.startsWith("turret-")) {
    return "Gunner"
  }

  if (member.location.startsWith("suite-")) {
    return "Suite Specialist"
  }

  const stationmates = allMembers
    .filter((m) => m.location === member.location && !m.isPassenger)
    .sort((a, b) => a.assignedOrder - b.assignedOrder)

  const slotIndex = stationmates.findIndex((m) => m.id === member.id)

  switch (member.location) {
    case "helm":
      if (slotIndex === 0) return "Pilot"
      if (slotIndex === 1) return "Copilot"
      return "Support"

    case "engineering":
      return slotIndex === 0 ? "Chief Engineer" : "Support"

    case "communications":
      return slotIndex === 0 ? "Comms Officer" : "Support"

    case "defense":
      return slotIndex === 0 ? "Defense Officer" : "Support"

    case "sensors":
      return slotIndex === 0 ? "Sensor Officer" : "Support"

    case "weapons":
      return slotIndex === 0 ? "Weapons Officer" : "Support"

    default:
      return "Support"
  }
}

const STAT_SKILLS_MAP = {
  strength: ["boost", "ram"],
  dexterity: ["hide", "maneuver"],
  constitution: ["patch", "regulation"],
  intelligence: ["astrogation", "data", "probe"],
  wisdom: ["scan"],
  charisma: ["impress", "interfere", "menace", "swindle"],
} as const

function getRawModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export interface SyncedCombatState {
  isInCombat: boolean
  round: number
  activeShipName?: string
  nextShipName?: string
  manualPlayerInitOverride: number | null
  playerShipOrderTie: number
  playerShipHasActed: boolean
  hasCycledReactorThisRound: boolean
  enemyShips: EnemyShip[]
}

export interface SyncedBridgeState {
  isPoweredOn: boolean
  maxFuel: number
  currentFuel: number
  currentDay: number
  activeJourney: JourneyData | null
  lastAstrogationDay: number
  cargoRations: number
  manifest: ManifestMember[]
  tacticalMovement: TacticalMovementState
  currentLocationPlanet: string
  targetDestinationPlanet: string
  systemDamageLevel: number
  shipStatuses: ActiveStatus[]
  isUsedCondition: boolean
  spentHullDice: number
  spentShieldDice: number
  pendingTier: number | null
  pinpointStrikesUsed: number
  versatileSnubfighterUsed: number
  evasiveManeuversUsed: number
  versatileStarshipUsed: number
  adaptiveArmorUsed: number
  bestShipInVerseUsed: boolean
  sFoilsMode: "locked" | "unlocked"
  engineSpeedBoostTurns: number
  shieldBoostTurns: number
  isWeaponsBoosted: boolean
  boostActionUsed: boolean
  selectedBoostType: "engines" | "shields" | "weapons" | null
  boostFeedback: string | null
  standingByUsed: boolean
  leafOnTheWindUsed: boolean
  ordnanceList: OrdnanceItem[]
  shipConfig: ShipConfig
  installedMods: Modification[]
  installedSuites: InstalledSuite[]
  transactions: Transaction[]
  shieldState: { current: number; max: number; temp: number }
  hullState: { current: number; max: number }
  availablePowerDice: number
  stationPools: Record<string, number>
  sharedPoolDice: number
  sensorContacts: SensorContact[]
  combatState: SyncedCombatState
}

const INITIAL_SYNCED_STATE: SyncedBridgeState = {
  isPoweredOn: true,
  maxFuel: 30,
  currentFuel: 30,
  currentDay: 1,
  activeJourney: null,
  lastAstrogationDay: 1,
  cargoRations: 60,
  manifest: [
    {
      id: "pc-1",
      name: "Captain Vance",
      isPlayer: true,
      isPassenger: false,
      location: "helm",
      assignedOrder: 1,
      individualInitiative: 12,
      hasTakenTurnThisRound: false,
      notes: "Commanding officer",
    },
    {
      id: "pc-2",
      name: "Jax Spark",
      isPlayer: true,
      isPassenger: false,
      location: "engineering",
      assignedOrder: 2,
      individualInitiative: 15,
      hasTakenTurnThisRound: false,
      notes: "Chief mechanic",
    },
    {
      id: "npc-1",
      name: "Envoy Trel",
      isPlayer: false,
      isPassenger: true,
      location: "passenger_lounge",
      assignedOrder: 3,
      individualInitiative: 0,
      hasTakenTurnThisRound: false,
      notes: "Diplomatic passenger from Coruscant",
    },
  ],
  tacticalMovement: { spentFeet: 0 },
  currentLocationPlanet: "Corellia",
  targetDestinationPlanet: "",
  systemDamageLevel: 0,
  shipStatuses: [],
  isUsedCondition: false,
  spentHullDice: 0,
  spentShieldDice: 0,
  pendingTier: null,
  pinpointStrikesUsed: 0,
  versatileSnubfighterUsed: 0,
  evasiveManeuversUsed: 0,
  versatileStarshipUsed: 0,
  adaptiveArmorUsed: 0,
  bestShipInVerseUsed: false,
  sFoilsMode: "unlocked",
  engineSpeedBoostTurns: 0,
  shieldBoostTurns: 0,
  isWeaponsBoosted: false,
  boostActionUsed: false,
  selectedBoostType: null,
  boostFeedback: null,
  standingByUsed: false,
  leafOnTheWindUsed: false,
  ordnanceList: STARSHIP_AMMUNITION.map((ammo) => ({
    id: ammo.id,
    name: ammo.name,
    category: ammo.launcherFamily,
    currentReserve: 0,
    costPerUnit: ammo.cost,
    damage: ammo.standardDamage,
    damageType: ammo.damageType,
    requisitionQty: 0,
  })),
  shipConfig: {
    name: "Queens Revenge",
    manufacturer: "Nubia Star Drives",
    model: "J-type Diplomatic (Medium)",
    size: "Medium",
    shipType: "Yacht",
    tier: 0,
    proficiencyBonus: 2,
    shipCost: 75000,
    paidAmount: 75000,
    reactorType: "Fuel Cell Reactor",
    powerCoupling: "Distributed Power Coupling",
    armorType: "Lightweight Armor",
    shieldType: "Directional Shields",
    roleSpecialization: null,
    roleMastery: null,
    extraSuiteCapacity: 0,
    useBrutalCriticals: false,
    stats: {
      strength: 10,
      dexterity: 14,
      constitution: 13,
      intelligence: 8,
      wisdom: 12,
      charisma: 15,
    },
    tierStatBoosts: {
      strength: 0,
      dexterity: 0,
      constitution: 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0,
    },
    tierRolls: {},
    saveProficiencies: {
      strength: false,
      dexterity: true,
      constitution: false,
      intelligence: false,
      wisdom: false,
      charisma: true,
    },
    skillTiers: {
      boost: "none",
      ram: "none",
      hide: "none",
      maneuver: "none",
      patch: "none",
      regulation: "none",
      astrogation: "none",
      data: "none",
      probe: "none",
      scan: "none",
      impress: "none",
      interfere: "none",
      menace: "none",
      swindle: "none",
    },
    baseHull: 33,
    baseShields: 28,
    maxShields: 28,
    maxPowerDice: 4,
    powerDieType: "d1",
    recoveryRate: 1,
    skills: {
      boost: 0,
      ram: 0,
      hide: 2,
      maneuver: 2,
      patch: 1,
      regulation: 1,
      astrogation: -1,
      data: -1,
      probe: -1,
      scan: 1,
      impress: 3,
      interfere: 3,
      menace: 3,
      swindle: 3,
    },
    savingThrows: {
      strength: 0,
      dexterity: 2,
      constitution: 3,
      intelligence: -1,
      wisdom: 1,
      charisma: 3,
    },
  },
  installedMods: [
    { ...MASTER_MODIFICATIONS[0], instanceId: "seed-fixed-hardpoint-1", location: "Bow", currentHeat: 0, firedThisRound: false },
  ],
  installedSuites: [],
  transactions: [
    {
      id: "tx-initial",
      date: "Day 1",
      description: "Initial Ship Account Balance & Baseline Registry",
      amount: 2500000,
      category: "Income",
      type: "credit",
    },
  ],
  shieldState: { current: 28, max: 28, temp: 0 },
  hullState: { current: 33, max: 33 },
  availablePowerDice: 4,
  stationPools: {
    engines: 1,
    communications: 1,
    weapons: 1,
    sensors: 1,
    defense: 1,
  },
  sharedPoolDice: 2,
  sensorContacts: [
    {
      id: "contact-seed-1",
      name: "Derelict Cargo Pod",
      classification: "Debris",
      distance: "14,200 km",
      scanDc: 10,
      isRevealed: false,
      gmNotes: "Contains 2 units of scrap metal and a cracked navigation log.",
      hullCurrent: 20,
      hullMax: 20,
      shieldsCurrent: 0,
      shieldsMax: 0,
      armorClass: 10,
      initiative: 0,
      damageReduction: 0,
      damageThreshold: 0,
    },
  ],
  combatState: {
    isInCombat: false,
    round: 1,
    manualPlayerInitOverride: null,
    playerShipOrderTie: 0,
    playerShipHasActed: false,
    hasCycledReactorThisRound: false,
    enemyShips: [],
  },
}

export default function BridgeDashboard() {
  const [active, setActive] = useState<Station>("Weapons")
  const [roomCode, setRoomCode] = useState<string>("")
  const [roomPin, setRoomPin] = useState<string>("")
  const [creationKey, setCreationKey] = useState<string>("")
  const [creationKeyInput, setCreationKeyInput] = useState<string>("")
  const [isMounted, setIsMounted] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const urlRoom = params.get("room")
      const urlPin = params.get("pin")

      if (urlRoom) {
        setRoomCode(urlRoom.toUpperCase())
      } else {
        const savedRoom = localStorage.getItem("sw5e_room_code")
        if (savedRoom) setRoomCode(savedRoom.toUpperCase())
      }

      if (urlPin) {
        setRoomPin(urlPin)
      } else {
        const savedPin = localStorage.getItem("sw5e_room_pin")
        if (savedPin) setRoomPin(savedPin)
      }

      setIsMounted(true)
    }
  }, [])

  const {
    data: roomState,
    updateRoomData,
    isConnected,
    syncStatus,
    setRoomPin: updateCloudPin,
  } = useRoomSync<SyncedBridgeState>(roomCode, INITIAL_SYNCED_STATE, roomPin, creationKey)

  const handleJoinRoom = (newCode: string, newPin?: string) => {
    const code = newCode.trim().toUpperCase()
    const pin = newPin ? newPin.trim() : ""
    setRoomCode(code)
    setRoomPin(pin)

    if (typeof window !== "undefined") {
      localStorage.setItem("sw5e_room_code", code)
      if (pin) localStorage.setItem("sw5e_room_pin", pin)
      else localStorage.removeItem("sw5e_room_pin")

      const url = new URL(window.location.href)
      url.searchParams.set("room", code)
      if (pin) url.searchParams.set("pin", pin)
      else url.searchParams.delete("pin")
      window.history.replaceState({}, "", url.toString())
    }
  }

  const {
    isPoweredOn = true,
    maxFuel,
    currentFuel,
    currentDay,
    activeJourney,
    lastAstrogationDay,
    cargoRations,
    manifest,
    tacticalMovement,
    currentLocationPlanet,
    targetDestinationPlanet,
    systemDamageLevel,
    shipStatuses = [],
    isUsedCondition,
    spentHullDice,
    spentShieldDice,
    pendingTier,
    pinpointStrikesUsed,
    versatileSnubfighterUsed,
    evasiveManeuversUsed,
    versatileStarshipUsed,
    adaptiveArmorUsed,
    bestShipInVerseUsed,
    sFoilsMode,
    engineSpeedBoostTurns,
    shieldBoostTurns,
    isWeaponsBoosted = false,
    boostActionUsed,
    selectedBoostType,
    boostFeedback,
    standingByUsed,
    leafOnTheWindUsed,
    ordnanceList,
    shipConfig,
    installedMods,
    installedSuites,
    transactions,
    shieldState,
    hullState,
    availablePowerDice,
    stationPools,
    sharedPoolDice,
    sensorContacts: rawSensorContacts = [],
    combatState = {
      isInCombat: false,
      round: 1,
      manualPlayerInitOverride: null,
      playerShipOrderTie: 0,
      playerShipHasActed: false,
      hasCycledReactorThisRound: false,
      enemyShips: [],
    },
  } = roomState

  const sanitizedSensorContacts = useMemo(() => {
    const seen = new Set<string>()
    return rawSensorContacts.map((c, index) => {
      let uniqueId = c.id
      if (!uniqueId || seen.has(uniqueId)) {
        uniqueId = `contact-repaired-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`
      }
      seen.add(uniqueId)
      return {
        ...c,
        id: uniqueId,
        hullCurrent: c.hullCurrent ?? 20,
        hullMax: c.hullMax ?? 20,
        shieldsCurrent: c.shieldsCurrent ?? 0,
        shieldsMax: c.shieldsMax ?? 0,
        armorClass: c.armorClass ?? 13,
        initiative: Number(c.initiative) || 10,
        damageReduction: c.damageReduction ?? 0,
        damageThreshold: c.damageThreshold ?? 0,
      }
    })
  }, [rawSensorContacts])

  const externalPendingCharts = currentDay > lastAstrogationDay ? 150 : 0

  const handleSetPoweredOn = (powered: boolean) => {
    updateRoomData((prev) => {
      let nextStatuses = prev.shipStatuses
      if (!powered) {
        if (!nextStatuses.some((s) => s.id === "stalled-power-off")) {
          nextStatuses = [
            ...nextStatuses,
            {
              id: "stalled-power-off",
              title: "STALLED // COLD REACTOR",
              effect: "Main reactor is dark. Auxiliary emergency battery power only. Weapons, defense shields, sensors, and communications systems offline.",
              duration: "Until Reactor Online",
            },
          ]
        }
      } else {
        nextStatuses = nextStatuses.filter((s) => s.id !== "stalled-power-off")
      }

      return {
        ...prev,
        isPoweredOn: powered,
        shipStatuses: nextStatuses,
      }
    })
  }

  const handleUpdateCombatState = useCallback((
    updater:
      | Partial<SyncedCombatState>
      | ((prev: SyncedCombatState) => SyncedCombatState)
  ) => {
    updateRoomData((prev) => {
      const current = prev.combatState || {
        isInCombat: false,
        round: 1,
        manualPlayerInitOverride: null,
        playerShipOrderTie: 0,
        playerShipHasActed: false,
        hasCycledReactorThisRound: false,
        enemyShips: [],
      }
      const nextCombat =
        typeof updater === "function" ? updater(current) : { ...current, ...updater }

      if (
        current.isInCombat === nextCombat.isInCombat &&
        current.round === nextCombat.round &&
        current.activeShipName === nextCombat.activeShipName &&
        current.nextShipName === nextCombat.nextShipName &&
        current.manualPlayerInitOverride === nextCombat.manualPlayerInitOverride &&
        current.playerShipOrderTie === nextCombat.playerShipOrderTie &&
        current.playerShipHasActed === nextCombat.playerShipHasActed &&
        current.hasCycledReactorThisRound === nextCombat.hasCycledReactorThisRound &&
        current.enemyShips === nextCombat.enemyShips
      ) {
        return prev
      }

      return {
        ...prev,
        combatState: nextCombat,
      }
    })
  }, [updateRoomData])

  const handleAddMember = (
    newMember: Omit<ManifestMember, "id" | "assignedOrder" | "hasTakenTurnThisRound">
  ) => {
    const id = `manifest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const location = newMember.isPassenger
      ? "passenger_lounge"
      : (newMember.location || "crew_quarters")

    updateRoomData((prev) => ({
      ...prev,
      manifest: [
        ...prev.manifest,
        {
          ...newMember,
          id,
          location,
          assignedOrder: Date.now(),
          hasTakenTurnThisRound: false,
        },
      ],
    }))
  }

  const handleRemoveMember = (id: string) => {
    updateRoomData((prev) => ({
      ...prev,
      manifest: prev.manifest.filter((m) => m.id !== id),
    }))
  }

  const handleAssignLocation = (memberId: string, targetLocation: ShipCompartmentId) => {
    updateRoomData((prev) => {
      const member = prev.manifest.find((m) => m.id === memberId)
      if (!member || member.isPassenger) return prev

      const isTargetTurret = targetLocation.startsWith("turret-")
      const updatedManifest = prev.manifest.map((m) => {
        if (isTargetTurret && m.location === targetLocation && m.id !== memberId) {
          return {
            ...m,
            location: "crew_quarters" as ShipCompartmentId,
            assignedOrder: Date.now(),
          }
        }
        if (m.id === memberId) {
          return {
            ...m,
            location: targetLocation,
            assignedOrder: Date.now(),
          }
        }
        return m
      })

      return { ...prev, manifest: updatedManifest }
    })
  }

  const handleToggleTurnTaken = (memberId: string) => {
    updateRoomData((prev) => ({
      ...prev,
      manifest: prev.manifest.map((m) =>
        m.id === memberId ? { ...m, hasTakenTurnThisRound: !m.hasTakenTurnThisRound } : m
      ),
    }))
  }

  const handleUpdateInitiative = (memberId: string, initiative: number) => {
    updateRoomData((prev) => ({
      ...prev,
      manifest: prev.manifest.map((m) =>
        m.id === memberId ? { ...m, individualInitiative: initiative } : m
      ),
    }))
  }

  const handleSpendMovement = (feet: number) => {
    updateRoomData((prev) => ({
      ...prev,
      tacticalMovement: {
        spentFeet: Math.max(0, prev.tacticalMovement.spentFeet + feet),
      },
    }))
  }

  const handleResetMovement = () => {
    updateRoomData((prev) => ({
      ...prev,
      tacticalMovement: { spentFeet: 0 },
    }))
  }

  const handleAdvanceCampaignDay = (newDay?: number | ((prev: number) => number)) => {
    updateRoomData((prev) => {
      let resolvedTarget: number
      if (typeof newDay === "function") {
        resolvedTarget = newDay(prev.currentDay)
      } else if (typeof newDay === "number") {
        resolvedTarget = newDay
      } else {
        resolvedTarget = prev.currentDay + 1
      }

      const daysPassed = Math.max(0, resolvedTarget - prev.currentDay)
      const dailyDepletion = daysPassed > 0 ? prev.manifest.length * daysPassed : 0
      const nextRations = Math.max(0, prev.cargoRations - dailyDepletion)

      return {
        ...prev,
        currentDay: resolvedTarget,
        cargoRations: nextRations,
      }
    })
  }

  const astrogationAdvantage: "advantage" | "disadvantage" | "normal" = useMemo(() => {
    const daysSinceSync = Math.max(0, currentDay - lastAstrogationDay)
    if (daysSinceSync < 1) return "advantage"
    if (daysSinceSync >= 7) return "disadvantage"
    return "normal"
  }, [currentDay, lastAstrogationDay])

  const handleAddStatus = (newStatus: ActiveStatus) => {
    updateRoomData((prev) => ({
      ...prev,
      shipStatuses: [...prev.shipStatuses, newStatus],
    }))
  }

  const handleRemoveStatus = (statusId: string) => {
    updateRoomData((prev) => ({
      ...prev,
      shipStatuses: prev.shipStatuses.filter((s) => s.id !== statusId),
    }))
  }

  const hasStatus = (key: string) =>
    shipStatuses.some(
      (s) =>
        s.id?.toLowerCase().includes(key.toLowerCase()) ||
        s.title?.toLowerCase().includes(key.toLowerCase())
    )

  const isBlinded = hasStatus("blinded")
  const isDisabled = hasStatus("disabled")
  const isIonized = hasStatus("ionized")
  const isInvisible = hasStatus("invisible")
  const isStunned = hasStatus("stunned")
  const isTractored = hasStatus("tractored")
  const isStalled = hasStatus("stalled")
  const isUsedStatus = hasStatus("used")
  const hasGravityWarpACPenalty = hasStatus("gravity warp")

  const effectiveIsUsed = isUsedCondition || isUsedStatus || systemDamageLevel >= 5

  useEffect(() => {
    if (effectiveIsUsed && !isUsedCondition) {
      updateRoomData((prev) => ({ ...prev, isUsedCondition: true }))
    }
  }, [effectiveIsUsed, isUsedCondition, updateRoomData])

  const handleUpdateUsedConditionBridge = (used: boolean) => {
    updateRoomData((prev) => {
      let nextStatuses = prev.shipStatuses
      if (!used) {
        nextStatuses = prev.shipStatuses.filter(
          (s) =>
            !s.id?.toLowerCase().includes("used") &&
            !s.title?.toLowerCase().includes("used")
        )
      } else if (!prev.shipStatuses.some((s) => s.title.toLowerCase().includes("used"))) {
        nextStatuses = [
          ...prev.shipStatuses,
          {
            id: `used-${Date.now()}`,
            title: "USED",
            effect:
              "A used starship's value is reduced by half. When a deployed crew member on a used starship rolls a 1 on an ability check, attack roll, or saving throw, they must make a destruction saving throw. If the roll is 10 or higher, they succeed. On a failure, the ship suffers 1 level of system damage.",
            duration: "Until Overhauled",
          },
        ]
      }
      return {
        ...prev,
        isUsedCondition: used,
        shipStatuses: nextStatuses,
      }
    })
  }

  const effectiveSlowedLevel = useMemo(() => {
    let baseSlow = 0
    if (isDisabled || isStunned || isTractored || isStalled || !isPoweredOn) {
      baseSlow = 4
    }

    const manualSlows = shipStatuses
      .filter(
        (s) =>
          s.title.toLowerCase().includes("slowed") ||
          (s.id && s.id.toLowerCase().includes("slowed"))
      )
      .map((s) => s.level ?? 0)

    const maxManualSlow = manualSlows.length > 0 ? Math.max(...manualSlows) : 0
    const combinedSlow = Math.max(baseSlow, maxManualSlow)
    const systemDamageSlow = systemDamageLevel >= 2 ? 1 : 0

    return Math.min(4, combinedSlow + systemDamageSlow)
  }, [isDisabled, isStunned, isTractored, isStalled, isPoweredOn, shipStatuses, systemDamageLevel])

  const isLevel6Blackout = systemDamageLevel >= 6

  const pendingOrdnanceCost = useMemo(() => {
    return ordnanceList.reduce((acc, it) => acc + it.requisitionQty * it.costPerUnit, 0)
  }, [ordnanceList])

  const pendingOrdnanceItems = useMemo(() => {
    return ordnanceList
      .filter((it) => it.requisitionQty > 0)
      .map((it) => ({
        name: it.name,
        qty: it.requisitionQty,
        cost: it.requisitionQty * it.costPerUnit,
      }))
  }, [ordnanceList])

  const activeSizeKey = ((shipConfig.size as string)?.toLowerCase() ?? "small") as ShipSize
  const activeSizeRules = SHIP_SIZE_RULES[activeSizeKey] || SHIP_SIZE_RULES.small
  const activeTypeRules = SHIP_TYPE_RULES[shipConfig.shipType] || null

  const shipModifiers = useMemo(() => {
    return computeShipModifiers({
      shipTier: shipConfig.tier ?? 0,
      shipSize: activeSizeKey,
      installedMods,
      installedSuites,
      sFoilsMode,
      roleSpecialization: shipConfig.roleSpecialization,
      roleMastery: shipConfig.roleMastery,
    })
  }, [
    shipConfig.tier,
    activeSizeKey,
    installedMods,
    installedSuites,
    sFoilsMode,
    shipConfig.roleSpecialization,
    shipConfig.roleMastery,
  ])

  const effectiveStats = useMemo(() => {
    return {
      strength:
        shipConfig.stats.strength +
        (shipConfig.tierStatBoosts?.strength || 0) +
        (activeTypeRules?.strengthMod || 0) +
        shipModifiers.statDeltas.strength,
      dexterity:
        shipConfig.stats.dexterity +
        (shipConfig.tierStatBoosts?.dexterity || 0) +
        (activeSizeRules.dexterityMod || 0) +
        (activeTypeRules?.dexterityMod || 0) +
        shipModifiers.statDeltas.dexterity,
      constitution:
        shipConfig.stats.constitution +
        (shipConfig.tierStatBoosts?.constitution || 0) +
        (activeSizeRules.constitutionMod || 0) +
        (activeTypeRules?.constitutionMod || 0) +
        shipModifiers.statDeltas.constitution,
      intelligence:
        shipConfig.stats.intelligence +
        (shipConfig.tierStatBoosts?.intelligence || 0) +
        (activeTypeRules?.intelligenceMod || 0) +
        shipModifiers.statDeltas.intelligence,
      wisdom:
        shipConfig.stats.wisdom +
        (shipConfig.tierStatBoosts?.wisdom || 0) +
        (activeTypeRules?.wisdomMod || 0) +
        shipModifiers.statDeltas.wisdom,
      charisma:
        shipConfig.stats.charisma +
        (shipConfig.tierStatBoosts?.charisma || 0) +
        (activeTypeRules?.charismaMod || 0) +
        shipModifiers.statDeltas.charisma,
    }
  }, [shipConfig.stats, shipConfig.tierStatBoosts, activeSizeRules, activeTypeRules, shipModifiers.statDeltas])

  const effectiveSavingThrows = useMemo(() => {
    const keys = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const
    const newThrows: Record<string, number> = {}

    const isMedium = activeSizeKey === "medium"
    const isNimble = isMedium && (shipConfig.tier ?? 0) >= 2
    const halfDexMod = Math.max(1, Math.floor(getRawModifier(effectiveStats.dexterity) / 2))

    keys.forEach((key) => {
      let rawMod = getRawModifier(effectiveStats[key])
      const isProficient =
        shipConfig.saveProficiencies?.[key] || shipModifiers.savingThrowProficiencies.has(key)

      if (isNimble && key !== "dexterity") {
        rawMod += halfDexMod
      }

      newThrows[key] = rawMod + (isProficient ? shipConfig.proficiencyBonus : 0)
    })
    return newThrows as ShipConfig["savingThrows"]
  }, [
    effectiveStats,
    shipConfig.saveProficiencies,
    shipConfig.proficiencyBonus,
    shipModifiers.savingThrowProficiencies,
    activeSizeKey,
    shipConfig.tier,
  ])

  const effectiveSkills = useMemo(() => {
    const calculated: Record<string, number> = {}
    Object.entries(shipConfig.skillTiers).forEach(([skillName, tier]) => {
      const governingStat = Object.entries(STAT_SKILLS_MAP).find(([_, skills]) =>
        (skills as readonly string[]).includes(skillName)
      )?.[0] as keyof ShipConfig["stats"] | undefined
      const statScore = governingStat ? effectiveStats[governingStat] : 8
      let baseMod = getRawModifier(statScore)

      if (
        shipConfig.roleSpecialization === "Scout" &&
        (skillName === "scan" || skillName === "probe")
      ) {
        baseMod += 1
      }

      if (shipConfig.roleMastery === "Scout" && skillName === "astrogation") {
        baseMod += 2
      }

      if (shipConfig.roleMastery === "Scrambler" && skillName === "interfere") {
        baseMod += 2
      }

      const capitalizedSkill = skillName.charAt(0).toUpperCase() + skillName.slice(1)
      if (shipModifiers.skillFlatBonuses[capitalizedSkill]) {
        baseMod += shipModifiers.skillFlatBonuses[capitalizedSkill]
      }

      const pb = shipConfig.proficiencyBonus
      let effectiveTier = tier
      if (shipModifiers.skillProficiencies[capitalizedSkill]) {
        effectiveTier = shipModifiers.skillProficiencies[capitalizedSkill]
      }

      let bonusMultiplier = 0
      if (effectiveTier === "proficient") bonusMultiplier = 1
      else if (["expert", "mastery", "high-mastery", "grand-mastery"].includes(effectiveTier as string))
        bonusMultiplier = 2
      calculated[skillName] = baseMod + bonusMultiplier * pb
    })
    return calculated
  }, [shipConfig.skillTiers, shipConfig.roleSpecialization, shipConfig.roleMastery, effectiveStats, shipConfig.proficiencyBonus, shipModifiers])

  const effectiveShipConfig = useMemo(() => {
    const dexMod = getRawModifier(effectiveStats.dexterity)
    let calculatedAC = 10 + dexMod

    if (shipModifiers.armorClassOverride !== undefined) {
      if (shipModifiers.armorClassOverride >= 17) {
        calculatedAC = shipModifiers.armorClassOverride
      } else if (shipModifiers.armorClassOverride >= 14) {
        calculatedAC = shipModifiers.armorClassOverride + Math.min(dexMod, 2)
      } else {
        calculatedAC = shipModifiers.armorClassOverride + dexMod
      }
    }
    calculatedAC += shipModifiers.armorClassBonus

    // Mechanical Astrogation Mishap (6-8): Gravity Warp reduces AC by 2 until refitted
    if (hasGravityWarpACPenalty) {
      calculatedAC = Math.max(1, calculatedAC - 2)
    }

    const baseModCapacity = 30
    const finalModCapacity = baseModCapacity + shipModifiers.maxModSlotsBonus
    const calculatedMaxFuel = Math.round(30 * shipModifiers.baseFuelMultiplier)

    const baseCargoInput = shipModifiers.baseCargoOverride ?? (shipConfig.cargoCapacity ?? 25)
    const finalCargoCap = Math.round(baseCargoInput * (1 + shipModifiers.cargoBonusMultiplier))

    return {
      ...shipConfig,
      stats: effectiveStats,
      savingThrows: effectiveSavingThrows,
      skills: effectiveSkills,
      armorClass: calculatedAC,
      modSlots: finalModCapacity,
      fuelCapacity: calculatedMaxFuel,
      cargoCapacity: finalCargoCap,
      damageResistances: shipModifiers.damageResistances,
      systemDamageLevel,
      effectiveSlowedLevel,
      isIonized,
      isStalled,
      isStunned,
      isUsed: effectiveIsUsed,
      shipStatuses,
    }
  }, [
    shipConfig,
    effectiveStats,
    effectiveSavingThrows,
    effectiveSkills,
    shipModifiers,
    hasGravityWarpACPenalty,
    systemDamageLevel,
    effectiveSlowedLevel,
    isIonized,
    isStalled,
    isStunned,
    effectiveIsUsed,
    shipStatuses,
  ])

  const totalMaxShields =
    shipConfig.maxShields +
    installedMods.reduce((sum, mod) => sum + ((mod as any).shieldBonus || 0), 0)
  const totalMaxHull =
    shipConfig.baseHull +
    installedMods.reduce((sum, mod) => sum + ((mod as any).hullBonus || 0), 0)

  const totalShields = {
    current: Math.min(shieldState.current, totalMaxShields),
    max: totalMaxShields,
    temp: shieldState.temp,
  }

  const totalHull = {
    current: Math.min(hullState.current, totalMaxHull),
    max: totalMaxHull,
  }

  const setTotalShields = (
    update:
      | { current: number; max: number; temp?: number }
      | ((prev: { current: number; max: number; temp: number }) => {
          current: number
          max: number
          temp?: number
        })
  ) => {
    updateRoomData((prev) => {
      const prevShield = {
        current: prev.shieldState.current,
        max: totalMaxShields,
        temp: prev.shieldState.temp,
      }
      const res = typeof update === "function" ? update(prevShield) : update
      return {
        ...prev,
        shieldState: {
          current: Math.min(totalMaxShields, res.current),
          max: totalMaxShields,
          temp: res.temp !== undefined ? res.temp : prev.shieldState.temp,
        },
      }
    })
  }

  const setTotalHull = (
    update:
      | { current: number; max: number }
      | ((prev: { current: number; max: number }) => { current: number; max: number })
  ) => {
    updateRoomData((prev) => {
      const prevHull = { current: prev.hullState.current, max: totalMaxHull }
      const res = typeof update === "function" ? update(prevHull) : update
      return {
        ...prev,
        hullState: {
          current: Math.min(totalMaxHull, res.current),
          max: totalMaxHull,
        },
      }
    })
  }

  const handleAddTransaction = (newTx: Omit<Transaction, "id">) => {
    const txWithId = {
      ...newTx,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    }
    updateRoomData((prev) => ({
      ...prev,
      transactions: [txWithId, ...prev.transactions],
    }))
  }

  const handleCompleteOrCancelJourney = (arrivedAtDestination?: boolean) => {
    updateRoomData((prev) => ({
      ...prev,
      currentLocationPlanet:
        arrivedAtDestination && prev.activeJourney
          ? prev.activeJourney.destination
          : prev.currentLocationPlanet,
      targetDestinationPlanet: arrivedAtDestination ? "" : prev.targetDestinationPlanet,
      activeJourney: null,
    }))
  }

  const handleEmergencyDropOut = (dropoutRegion: string) => {
    const deepSpaceName = `Deep Space (${dropoutRegion})`
    updateRoomData((prev) => ({
      ...prev,
      currentLocationPlanet: deepSpaceName,
      targetDestinationPlanet: "",
      activeJourney: null,
    }))
  }

  const handleFullShipReset = (startingDay: number, startingFunds: number) => {
    updateRoomData((prev) => ({
      ...prev,
      isPoweredOn: true,
      shipConfig: {
        name: "",
        manufacturer: "",
        model: "",
        size: "Small",
        shipType: "Freighter",
        tier: 0,
        proficiencyBonus: 2,
        shipCost: 0,
        paidAmount: 0,
        powerCoupling: "Direct Power Coupling",
        armorType: "Lightweight Armor",
        baseHull: 40,
        baseShields: 24,
        maxShields: 24,
        maxPowerDice: 4,
        powerDieType: "d1",
        recoveryRate: 1,
        roleSpecialization: null,
        roleMastery: null,
        extraSuiteCapacity: 0,
        tierStatBoosts: {
          strength: 0,
          dexterity: 0,
          constitution: 0,
          intelligence: 0,
          wisdom: 0,
          charisma: 0,
        },
        tierAsiHistory: {},
        tierRolls: {},
        stats: {
          strength: 10,
          dexterity: 14,
          constitution: 13,
          intelligence: 15,
          wisdom: 12,
          charisma: 8,
        },
        saveProficiencies: {
          strength: false,
          dexterity: true,
          constitution: true,
          intelligence: false,
          wisdom: false,
          charisma: false,
        },
        skillTiers: {
          boost: "none",
          ram: "none",
          hide: "none",
          maneuver: "none",
          patch: "none",
          regulation: "none",
          astrogation: "none",
          data: "none",
          probe: "none",
          scan: "none",
          impress: "none",
          interfere: "none",
          menace: "none",
          swindle: "none",
        },
        skills: {
          boost: 0,
          ram: 0,
          hide: 0,
          maneuver: 0,
          patch: 0,
          regulation: 0,
          astrogation: 0,
          data: 0,
          probe: 0,
          scan: 0,
          impress: 0,
          interfere: 0,
          menace: 0,
          swindle: 0,
        },
        savingThrows: {
          strength: 0,
          dexterity: 0,
          constitution: 0,
          intelligence: 0,
          wisdom: 0,
          charisma: 0,
        },
      } as any,
      currentDay: startingDay,
      lastAstrogationDay: startingDay,
      cargoRations: 60,
      manifest: [],
      tacticalMovement: { spentFeet: 0 },
      activeJourney: null,
      currentLocationPlanet: "Corellia",
      targetDestinationPlanet: "",
      systemDamageLevel: 0,
      shipStatuses: [],
      isUsedCondition: false,
      spentHullDice: 0,
      spentShieldDice: 0,
      pinpointStrikesUsed: 0,
      versatileSnubfighterUsed: 0,
      evasiveManeuversUsed: 0,
      versatileStarshipUsed: 0,
      adaptiveArmorUsed: 0,
      bestShipInVerseUsed: false,
      engineSpeedBoostTurns: 0,
      shieldBoostTurns: 0,
      isWeaponsBoosted: false,
      boostActionUsed: false,
      selectedBoostType: null,
      boostFeedback: null,
      standingByUsed: false,
      leafOnTheWindUsed: false,
      sFoilsMode: "unlocked",
      currentFuel: prev.maxFuel,
      hullState: { current: 40, max: 40 },
      shieldState: { current: 24, max: 24, temp: 0 },
      availablePowerDice: 4,
      sharedPoolDice: 2,
      stationPools: { engines: 1, communications: 1, weapons: 1, sensors: 1, defense: 1 },
      ordnanceList: STARSHIP_AMMUNITION.map((ammo) => ({
        id: ammo.id,
        name: ammo.name,
        category: ammo.launcherFamily,
        currentReserve: 0,
        costPerUnit: ammo.cost,
        damage: ammo.standardDamage,
        damageType: ammo.damageType,
        requisitionQty: 0,
      })),
      transactions: [
        {
          id: `tx-reset-${Date.now()}`,
          date: `Day ${startingDay}`,
          description: "Initial Ship Account Balance",
          amount: startingFunds,
          category: "Income",
          type: "credit",
        },
      ],
      installedMods: [],
      installedSuites: [],
      combatState: {
        isInCombat: false,
        round: 1,
        manualPlayerInitOverride: null,
        playerShipOrderTie: 0,
        playerShipHasActed: false,
        hasCycledReactorThisRound: false,
        enemyShips: [],
      },
    }))
  }

  const handleInstallMod = (mod: Modification): boolean => {
    if (mod.name === "Fixed Hardpoint") {
      let maxHardpoints = 2
      switch (shipConfig.size.toLowerCase()) {
        case "tiny":
        case "small":
          maxHardpoints = 1
          break
        case "medium":
          maxHardpoints = 2
          break
        case "large":
          maxHardpoints = 3
          break
        case "huge":
          maxHardpoints = 5
          break
        default:
          maxHardpoints = 2
      }

      const consumedHardpoints = installedMods.filter((m) => m.name === "Fixed Hardpoint").length

      if (consumedHardpoints >= maxHardpoints) {
        alert(
          `Installation Failed: This ${shipConfig.size} frame supports a maximum of ${maxHardpoints} Fixed Hardpoints (${consumedHardpoints}/${maxHardpoints} in use).`
        )
        return false
      }
    }

    updateRoomData((prev) => ({
      ...prev,
      installedMods: [...prev.installedMods, mod],
      transactions: [
        {
          id: `tx-${Date.now()}`,
          date: `Day ${prev.currentDay}`,
          description: `Installed Modification: ${mod.name} (${mod.station})`,
          category: "Refit",
          amount: mod.cost,
          type: "debit",
        },
        ...prev.transactions,
      ],
    }))

    return true
  }

  const handleRemoveMod = (instanceId: string) => {
    const targetMod = installedMods.find((m) => m.instanceId === instanceId)
    const modName = targetMod?.name || "this modification"
    const refundAmount = targetMod ? Math.round(targetMod.cost * 0.5) : 0

    const confirmed = window.confirm(
      `CONFIRM UNINSTALL:\n\nAre you sure you want to uninstall "${modName}"?\n` +
      `Refund: +${refundAmount.toLocaleString()} cr (50% value).\n` +
      `Any weapons or hardware mounted to this modification will also be detached.`
    )
    if (!confirmed) return

    updateRoomData((prev) => {
      const toRemove = new Set<string>([instanceId])
      let changed = true
      while (changed) {
        changed = false
        for (const m of prev.installedMods) {
          if (
            m.instanceId &&
            m.mountedOnInstanceId &&
            toRemove.has(m.mountedOnInstanceId) &&
            !toRemove.has(m.instanceId)
          ) {
            toRemove.add(m.instanceId)
            changed = true
          }
        }
      }

      const nextMods = prev.installedMods.filter(
        (m) => !m.instanceId || !toRemove.has(m.instanceId)
      )
      const nextTx = targetMod
        ? [
            {
              id: `tx-${Date.now()}`,
              date: `Day ${prev.currentDay}`,
              description: `Refund / Uninstalled Modification: ${targetMod.name}`,
              category: "Refit",
              amount: refundAmount,
              type: "credit" as const,
            },
            ...prev.transactions,
          ]
        : prev.transactions

      return {
        ...prev,
        installedMods: nextMods,
        transactions: nextTx,
      }
    })
  }

  const handleUpdateMod = useCallback(
    (idOrInstanceId: string, updates: Partial<Modification>) => {
      updateRoomData((prev) => ({
        ...prev,
        installedMods: prev.installedMods.map((m) =>
          m.instanceId === idOrInstanceId || m.id === idOrInstanceId
            ? { ...m, ...updates }
            : m
        ),
      }))
    },
    [updateRoomData]
  )

  const handleUpdateSuites = (newSuites: InstalledSuite[]) => {
    if (newSuites.length < installedSuites.length) {
      const removedSuite = installedSuites.find((s) => !newSuites.some((n) => n.id === s.id))
      const suiteName = removedSuite?.name || "this suite"
      const confirmed = window.confirm(
        `CONFIRM SUITE DECOMMISSION:\n\nAre you sure you want to uninstall "${suiteName}"?\n` +
        `Any stationed personnel will be relocated to Crew Quarters.`
      )
      if (!confirmed) return
    }

    updateRoomData((prev) => {
      let newTransactions = prev.transactions
      if (newSuites.length > prev.installedSuites.length) {
        const addedSuite = newSuites.find((s) => !prev.installedSuites.some((e) => e.id === s.id))
        if (addedSuite && addedSuite.cost > 0) {
          newTransactions = [
            {
              id: `tx-${Date.now()}`,
              date: `Day ${prev.currentDay}`,
              description: `Installed Vessel Suite: ${addedSuite.name}`,
              category: "Refit",
              amount: addedSuite.cost,
              type: "debit",
            },
            ...prev.transactions,
          ]
        } else if (addedSuite && addedSuite.cost === 0) {
          newTransactions = [
            {
              id: `tx-${Date.now()}`,
              date: `Day ${prev.currentDay}`,
              description: `Installed Vessel Suite: ${addedSuite.name} (Free Role Allocation Claim)`,
              category: "Refit",
              amount: 0,
              type: "credit",
            },
            ...prev.transactions,
          ]
        }
      }

      return {
        ...prev,
        installedSuites: newSuites,
        transactions: newTransactions,
      }
    })
  }

  const handleSaveShipConfig = (newConfig: ShipConfig) => {
    updateRoomData((prev) => ({
      ...prev,
      shipConfig: newConfig,
      hullState: {
        current: Math.min(prev.hullState.current, newConfig.baseHull),
        max: newConfig.baseHull,
      },
      shieldState: {
        current: Math.min(prev.shieldState.current, newConfig.maxShields),
        max: newConfig.maxShields,
        temp: prev.shieldState.temp,
      },
      availablePowerDice: Math.min(prev.availablePowerDice, newConfig.maxPowerDice),
      pendingTier: null,
    }))
  }

  const handleAddContact = (newContact: Omit<SensorContact, "id">) => {
    const uniqueId = `contact-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const contactWithId = { ...newContact, id: uniqueId }
    updateRoomData((prev) => ({
      ...prev,
      sensorContacts: [...prev.sensorContacts, contactWithId],
    }))
  }

  const handleAddContacts = (newContacts: Omit<SensorContact, "id">[]) => {
    const contactsWithIds = newContacts.map((c, idx) => ({
      ...c,
      id: `contact-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 9)}`,
    }))
    updateRoomData((prev) => ({
      ...prev,
      sensorContacts: [...prev.sensorContacts, ...contactsWithIds],
    }))
  }

  const handleRemoveContact = (id: string) => {
    updateRoomData((prev) => ({
      ...prev,
      sensorContacts: prev.sensorContacts.filter((c) => c.id !== id),
    }))
  }

  const handleClearContacts = () => {
    updateRoomData((prev) => ({
      ...prev,
      sensorContacts: [],
    }))
  }

  const handleToggleReveal = (id: string) => {
    updateRoomData((prev) => ({
      ...prev,
      sensorContacts: prev.sensorContacts.map((c) =>
        c.id === id ? { ...c, isRevealed: !c.isRevealed } : c
      ),
    }))
  }

  const handleUpdateContact = (id: string, updates: Partial<SensorContact>) => {
    updateRoomData((prev) => ({
      ...prev,
      sensorContacts: prev.sensorContacts.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }))
  }

  const handleCycleReactor = (generatedAmount?: number) => {
    updateRoomData((prev) => {
      const amountToAdd =
        generatedAmount !== undefined ? generatedAmount : prev.shipConfig.recoveryRate
      const nextPower = Math.min(
        prev.shipConfig.maxPowerDice,
        prev.availablePowerDice + amountToAdd
      )

      const nextShieldTurns = Math.max(0, prev.shieldBoostTurns - 1)
      const nextTempShields =
        prev.shieldBoostTurns === 1 && nextShieldTurns === 0 ? 0 : prev.shieldState.temp

      return {
        ...prev,
        availablePowerDice: nextPower,
        manifest: prev.manifest.map((m) => ({ ...m, hasTakenTurnThisRound: false })),
        tacticalMovement: { spentFeet: 0 },
        boostActionUsed: false,
        selectedBoostType: null,
        boostFeedback: null,
        engineSpeedBoostTurns: Math.max(0, prev.engineSpeedBoostTurns - 1),
        shieldBoostTurns: nextShieldTurns,
        isWeaponsBoosted: false,
        shieldState: {
          ...prev.shieldState,
          temp: nextTempShields,
        },
        installedMods: prev.installedMods.map((m) => ({ ...m, firedThisRound: false })),
        combatState: {
          ...prev.combatState,
          hasCycledReactorThisRound: true,
        },
      }
    })
  }

  const handleConsumePowerDice = (amount: number = 1): boolean => {
    if (availablePowerDice >= amount) {
      updateRoomData((prev) => ({
        ...prev,
        availablePowerDice: Math.max(0, prev.availablePowerDice - amount),
      }))
      return true
    }
    return false
  }

  const handleConsumeStationPower = (stationKey: string, amount: number = 1): boolean => {
    const coupling = shipConfig?.powerCoupling ?? "Direct Power Coupling"
    const isHubAndSpoke = coupling === "Hub and Spoke Coupling"

    if ((stationPools[stationKey] ?? 0) >= amount) {
      updateRoomData((prev) => ({
        ...prev,
        stationPools: {
          ...prev.stationPools,
          [stationKey]: Math.max(0, (prev.stationPools[stationKey] ?? 0) - amount),
        },
      }))
      return true
    }

    if (isHubAndSpoke && sharedPoolDice >= amount) {
      updateRoomData((prev) => ({
        ...prev,
        sharedPoolDice: Math.max(0, prev.sharedPoolDice - amount),
      }))
      return true
    }

    return handleConsumePowerDice(amount)
  }

  const handleApplyFullRecharge = (payload: RechargeResultPayload) => {
    const coupling = shipConfig?.powerCoupling ?? "Direct Power Coupling"
    const isHubAndSpoke =
      coupling.toLowerCase().includes("hub") || coupling.toLowerCase().includes("spoke")
    const maxSharedPool = isHubAndSpoke ? 2 : shipConfig.maxPowerDice

    updateRoomData((prev) => ({
      ...prev,
      hullState: {
        current: Math.min(totalMaxHull, payload.newHull),
        max: totalMaxHull,
      },
      shieldState: {
        current: totalMaxShields,
        max: totalMaxShields,
        temp: 0,
      },
      spentHullDice: payload.newHullDiceSpent,
      spentShieldDice: payload.newShieldDiceSpent,
      availablePowerDice: prev.shipConfig.maxPowerDice,
      sharedPoolDice: isHubAndSpoke ? maxSharedPool : prev.sharedPoolDice,
      pinpointStrikesUsed: 0,
      engineSpeedBoostTurns: 0,
      shieldBoostTurns: 0,
      isWeaponsBoosted: false,
      boostActionUsed: false,
      selectedBoostType: null,
      boostFeedback: null,
      standingByUsed: false,
      leafOnTheWindUsed: false,
      bestShipInVerseUsed: false,
      installedMods: prev.installedMods.map((m) => ({ ...m, firedThisRound: false, currentHeat: 0 })),
      transactions: [
        {
          id: `tx-${Date.now()}`,
          date: `Day ${prev.currentDay}`,
          description: `Ship Recharge Conducted (Hull: ${payload.newHull}/${totalMaxHull} HP, Shields: 100%, Systems Refreshed, Standing By Surge Restored)`,
          category: "Operations",
          amount: 0,
          type: "credit",
        },
        ...prev.transactions,
      ],
    }))
  }

  const damageReduction =
    shipConfig.armorType === "Reinforced Armor"
      ? 6
      : shipConfig.armorType === "Deflection Armor"
      ? 3
      : 0

  if (!isMounted) {
    return (
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center p-6 font-mono text-neutral-400">
        <span className="h-8 w-8 animate-spin border-2 border-cyan-500 border-t-transparent rounded-full" />
        <p className="mt-3 text-xs tracking-widest uppercase">INITIALIZING BRIDGE SYSTEMS...</p>
      </div>
    )
  }

  const isDarkStation =
    !isPoweredOn &&
    ["Weapons", "Defense", "Sensors", "Communications"].includes(active)

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-950/80 border border-neutral-800 p-2.5 rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4] animate-pulse" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300">
            FENHAVEN STAR DRIVES // BRIDGE OS v2.4
          </span>
        </div>
        <RoomSelector
          currentRoom={roomCode}
          onJoinRoom={handleJoinRoom}
          isConnected={isConnected}
          isLocked={syncStatus.isPinRequired && !syncStatus.isUnlocked}
          hasStoredPin={syncStatus.hasStoredPin}
          onSetPin={updateCloudPin}
        />
      </div>

      {!roomCode ? (
        <div className="flex min-h-[480px] flex-col items-center justify-center gap-4 rounded-md border border-neutral-800 bg-neutral-950/90 p-8 text-center font-mono shadow-2xl">
          <div className="relative flex items-center justify-center">
            <span className="h-16 w-16 animate-pulse rotate-45 border-2 border-cyan-500/40" />
            <Radio className="absolute h-7 w-7 text-cyan-400" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-[0.25em] text-cyan-400 uppercase mt-2">
            AWAITING SIGNAL LINK // TRANSMISSION OFFLINE
          </h2>
          <p className="max-w-md text-xs tracking-wider text-neutral-400 leading-relaxed">
            No starship link is established. Enter your assigned vessel callsign into the transmission grid above and click <strong className="text-neutral-200">LINK</strong> to access tactical consoles.
          </p>
          <div className="flex items-center gap-2 text-[10px] text-neutral-600 uppercase tracking-widest mt-4">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500/50" />
            Supabase Relay Standing By
          </div>
        </div>
      ) : syncStatus.isCreationBlocked ? (
        <div className="flex min-h-[450px] flex-col items-center justify-center gap-4 rounded-md border-2 border-amber-500/80 bg-black/90 p-6 text-center font-mono shadow-[0_0_40px_rgba(245,158,11,0.2)]">
          <span className="text-4xl">🛠️</span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-widest text-amber-400 uppercase">
            RESTRICTED SHIPYARD // AUTHORIZATION REQUIRED
          </h2>
          <p className="max-w-md text-xs tracking-wider text-neutral-300 leading-relaxed">
            Vessel registration <strong className="text-amber-400">{roomCode}</strong> does not exist in the database. A Master Shipyard Authorization Key is required to commission a new vessel.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setCreationKey(creationKeyInput.trim())
            }}
            className="flex flex-col sm:flex-row items-center gap-2 mt-2"
          >
            <input
              type="password"
              placeholder="MASTER KEY"
              value={creationKeyInput}
              onChange={(e) => setCreationKeyInput(e.target.value)}
              className="bg-neutral-950 border border-neutral-700 rounded px-3 py-1.5 text-center text-xs text-neutral-100 font-mono tracking-widest focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-4 py-1.5 rounded border border-amber-400/80 bg-amber-500/20 text-xs font-bold uppercase text-amber-300 hover:bg-amber-500/30 transition cursor-pointer"
            >
              Authorize &amp; Build
            </button>
          </form>
        </div>
      ) : syncStatus.isPinRequired && !syncStatus.isUnlocked ? (
        <div className="flex min-h-[450px] flex-col items-center justify-center gap-4 rounded-md border-2 border-rose-500/80 bg-black/90 p-6 text-center font-mono shadow-[0_0_40px_rgba(244,63,94,0.3)]">
          <span className="text-4xl">🔒</span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-widest text-rose-400 uppercase">
            SECURITY LOCK ENGAGED // ACCESS RESTRICTED
          </h2>
          <p className="max-w-md text-xs tracking-wider text-rose-200 leading-relaxed">
            This vessel is protected by a security PIN. Enter the PIN in the transmission bar at the top and click <strong>LINK</strong> to authenticate.
          </p>
        </div>
      ) : (
        <>
          <HeaderBar
            shipName={shipConfig.name}
            shipModel={
              shipConfig.model ||
              (shipConfig as any).shipClass ||
              (shipConfig as any).class ||
              (shipConfig as any).type
            }
            currentDay={currentDay}
            activeJourney={activeJourney}
            totalShields={totalShields}
            totalHull={totalHull}
            systemDamageLevel={systemDamageLevel}
            shipStatuses={shipStatuses}
            isUsedCondition={effectiveIsUsed}
            isInCombat={combatState.isInCombat}
            combatRound={combatState.round}
            activeTurnShip={combatState.activeShipName}
            nextTurnShip={combatState.nextShipName}
          />
          <div className="flex flex-1 flex-col gap-4 lg:flex-row">
            <StationSidebar
              active={active}
              onSelect={setActive}
              isBlackout={isLevel6Blackout}
              manifest={manifest}
              installedSuites={installedSuites}
            />
            <main className="min-w-0 flex-1 relative">
              {isLevel6Blackout && active !== "GM Station" ? (
                <div className="flex min-h-[500px] flex-col items-center justify-center gap-4 rounded-md border-2 border-red-600 bg-black/95 p-6 text-center font-mono shadow-[0_0_50px_rgba(239,68,68,0.4)] animate-pulse">
                  <AlertOctagon className="h-16 w-16 text-red-500 animate-bounce" />
                  <h2 className="text-xl sm:text-2xl font-black text-red-400 tracking-[0.25em] uppercase">
                    🚨 CATASTROPHIC SYSTEM FAILURE // ALL PRIMARY SYSTEMS OFFLINE
                  </h2>
                  <p className="max-w-md text-xs tracking-wider text-red-200 leading-relaxed">
                    Total blackout condition. Auxiliary power grid severed. All stations are disabled.
                    Vessel is inoperable. Abandon ship protocol engaged.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setActive("GM Station")}
                      className="px-4 py-2.5 rounded border border-amber-400 bg-amber-500/20 text-xs font-bold text-amber-300 hover:bg-amber-500/30 uppercase tracking-widest cursor-pointer"
                    >
                      Access GM Terminal Override
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateRoomData((prev) => ({ ...prev, systemDamageLevel: 5 }))
                      }
                      className="px-4 py-2.5 rounded border border-red-500 bg-red-500/20 text-xs font-bold text-red-300 hover:bg-red-500/30 uppercase tracking-widest cursor-pointer flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Auxiliary Reboot (Clear to Lvl 5)
                    </button>
                  </div>
                </div>
              ) : isDarkStation ? (
                <div className="flex min-h-[460px] flex-col items-center justify-center gap-4 rounded-md border border-neutral-800 bg-black/90 p-8 text-center font-mono shadow-2xl">
                  <div className="relative flex items-center justify-center">
                    <span className="h-14 w-14 animate-pulse rotate-45 border-2 border-neutral-700" />
                    <PowerOff className="absolute h-6 w-6 text-neutral-500" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold tracking-[0.25em] text-neutral-400 uppercase mt-2">
                    {active.toUpperCase()} CONSOLE // COLD &amp; DARK
                  </h2>
                  <p className="max-w-md text-xs tracking-wider text-neutral-500 leading-relaxed">
                    Main reactor is offline. Auxiliary power grid maintains life support and emergency batteries only. Primary bus, weapons capacitor, shield emitters, and tactical comms arrays remain unpowered.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 mt-3">
                    <button
                      type="button"
                      onClick={() => setActive("Engines")}
                      className="px-4 py-2 rounded border border-cyan-500/50 bg-cyan-950/40 text-xs font-bold text-cyan-300 hover:bg-cyan-900/50 uppercase tracking-widest cursor-pointer"
                    >
                      Go to Helm / Engines &rarr;
                    </button>
                    <button
                      type="button"
                      onClick={() => setActive("Engineering")}
                      className="px-4 py-2 rounded border border-amber-500/50 bg-amber-950/40 text-xs font-bold text-amber-300 hover:bg-amber-900/50 uppercase tracking-widest cursor-pointer"
                    >
                      Go to Engineering &rarr;
                    </button>
                  </div>
                </div>
              ) : active === "Ship Setup" ? (
                <ShipSetup
                  initialConfig={shipConfig}
                  currentDay={currentDay}
                  onSaveConfig={handleSaveShipConfig}
                  onFullReset={handleFullShipReset}
                  externalPendingTier={pendingTier}
                  onClearPendingTier={() =>
                    updateRoomData((prev) => ({ ...prev, pendingTier: null }))
                  }
                />
              ) : active === "Crew" ? (
                <CrewStation
                  manifest={manifest}
                  allMembers={manifest}
                  onAddMember={handleAddMember}
                  onRemoveMember={handleRemoveMember}
                  onAssignLocation={handleAssignLocation}
                  onToggleTurn={handleToggleTurnTaken}
                  onUpdateInitiative={handleUpdateInitiative}
                  cargoRations={cargoRations}
                  installedMods={installedMods}
                />
              ) : active === "Weapons" ? (
                <WeaponsStation
                  availablePowerDice={stationPools["weapons"] ?? availablePowerDice}
                  maxPowerDice={shipConfig.maxPowerDice}
                  powerDieType={shipConfig.powerDieType}
                  onConsumePowerDice={(amt) => handleConsumeStationPower("weapons", amt)}
                  shipConfig={effectiveShipConfig}
                  installedMods={installedMods}
                  onRemoveMod={handleRemoveMod}
                  onUpdateMod={handleUpdateMod}
                  stationPools={stationPools}
                  onUpdateStationPools={(newPools) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      stationPools:
                        typeof newPools === "function" ? newPools(prev.stationPools) : newPools,
                    }))
                  }
                  sharedPoolDice={sharedPoolDice}
                  onUpdateSharedPool={(newPool) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      sharedPoolDice:
                        typeof newPool === "function" ? newPool(prev.sharedPoolDice) : newPool,
                    }))
                  }
                  standingByUsed={standingByUsed}
                  onUseStandingBy={() =>
                    updateRoomData((prev) => ({ ...prev, standingByUsed: true }))
                  }
                  leafOnTheWindUsed={leafOnTheWindUsed}
                  onUseLeafOnTheWind={() =>
                    updateRoomData((prev) => ({ ...prev, leafOnTheWindUsed: true }))
                  }
                  versatileTransportUsed={versatileStarshipUsed}
                  onUpdateVersatileTransportUsed={(val) =>
                    updateRoomData((prev) => ({ ...prev, versatileStarshipUsed: val }))
                  }
                  bestShipInVerseUsed={bestShipInVerseUsed}
                  onUpdateBestShipInVerseUsed={(val) =>
                    updateRoomData((prev) => ({ ...prev, bestShipInVerseUsed: val }))
                  }
                  ordnanceList={ordnanceList}
                  onUpdateOrdnanceList={(newList) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      ordnanceList:
                        typeof newList === "function" ? newList(prev.ordnanceList) : newList,
                    }))
                  }
                  sFoilsMode={sFoilsMode}
                  systemDamageLevel={systemDamageLevel}
                  shipStatuses={shipStatuses}
                  manifest={manifest}
                  onAssignCrew={handleAssignLocation}
                  onToggleTurn={handleToggleTurnTaken}
                  isWeaponsBoosted={isWeaponsBoosted}
                  onConsumeWeaponBoost={() =>
                    updateRoomData((prev) => ({ ...prev, isWeaponsBoosted: false }))
                  }
                />
              ) : active === "Sensors" ? (
                <SensorsStation
                  availablePowerDice={stationPools["sensors"] ?? availablePowerDice}
                  maxPowerDice={shipConfig.maxPowerDice}
                  powerDieType={shipConfig.powerDieType}
                  onConsumePowerDice={(amt) => handleConsumeStationPower("sensors", amt)}
                  contacts={sanitizedSensorContacts}
                  onUpdateContact={handleUpdateContact}
                  sensorSkillMod={effectiveSkills.scan ?? 0}
                  probeSkillMod={effectiveSkills.probe ?? 0}
                  dataSkillMod={effectiveSkills.data ?? 0}
                  shipConfig={effectiveShipConfig}
                  installedMods={installedMods}
                  onRemoveMod={handleRemoveMod}
                  stationPools={stationPools}
                  onUpdateStationPools={(newPools) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      stationPools:
                        typeof newPools === "function" ? newPools(prev.stationPools) : newPools,
                    }))
                  }
                  sharedPoolDice={sharedPoolDice}
                  onUpdateSharedPool={(newPool) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      sharedPoolDice:
                        typeof newPool === "function" ? newPool(prev.sharedPoolDice) : newPool,
                    }))
                  }
                  standingByUsed={standingByUsed}
                  onUseStandingBy={() =>
                    updateRoomData((prev) => ({ ...prev, standingByUsed: true }))
                  }
                  leafOnTheWindUsed={leafOnTheWindUsed}
                  onUseLeafOnTheWind={() =>
                    updateRoomData((prev) => ({ ...prev, leafOnTheWindUsed: true }))
                  }
                  versatileTransportUsed={versatileStarshipUsed}
                  onUpdateVersatileTransportUsed={(val) =>
                    updateRoomData((prev) => ({ ...prev, versatileStarshipUsed: val }))
                  }
                  bestShipInVerseUsed={bestShipInVerseUsed}
                  onUpdateBestShipInVerseUsed={(val) =>
                    updateRoomData((prev) => ({ ...prev, bestShipInVerseUsed: val }))
                  }
                  onRemoveContact={handleRemoveContact}
                  systemDamageLevel={systemDamageLevel}
                  isBlinded={isBlinded}
                  manifest={manifest}
                  onAssignCrew={handleAssignLocation}
                  onToggleTurn={handleToggleTurnTaken}
                />
              ) : active === "Defense" ? (
                <DefenseStation
                  availablePowerDice={stationPools["defense"] ?? availablePowerDice}
                  maxPowerDice={shipConfig.maxPowerDice}
                  powerDieType={shipConfig.powerDieType}
                  damageReduction={damageReduction}
                  onConsumePowerDice={(amt) => handleConsumeStationPower("defense", amt)}
                  onHullChange={(current, max) => setTotalHull({ current, max })}
                  onShieldChange={(current, max, temp) => setTotalShields({ current, max, temp })}
                  shipConfig={effectiveShipConfig}
                  spentHullDice={spentHullDice}
                  onSpentHullDiceChange={(val) =>
                    updateRoomData((prev) => ({ ...prev, spentHullDice: val }))
                  }
                  spentShieldDice={spentShieldDice}
                  onSpentShieldDiceChange={(val) =>
                    updateRoomData((prev) => ({ ...prev, spentShieldDice: val }))
                  }
                  installedMods={installedMods}
                  onRemoveMod={handleRemoveMod}
                  stationPools={stationPools}
                  onUpdateStationPools={(newPools) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      stationPools:
                        typeof newPools === "function" ? newPools(prev.stationPools) : newPools,
                    }))
                  }
                  sharedPoolDice={sharedPoolDice}
                  onUpdateSharedPool={(newPool) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      sharedPoolDice:
                        typeof newPool === "function" ? newPool(prev.sharedPoolDice) : newPool,
                    }))
                  }
                  currentShields={totalShields.current}
                  maxShields={totalShields.max}
                  tempShields={totalShields.temp}
                  standingByUsed={standingByUsed}
                  onUseStandingBy={() =>
                    updateRoomData((prev) => ({ ...prev, standingByUsed: true }))
                  }
                  systemDamageLevel={systemDamageLevel}
                  onUpdateSystemDamageLevel={(lvl) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      systemDamageLevel: typeof lvl === "function" ? lvl(prev.systemDamageLevel ?? 0) : lvl,
                    }))
                  }
                  statuses={shipStatuses}
                  onAddStatus={handleAddStatus}
                  onRemoveStatus={handleRemoveStatus}
                  manifest={manifest}
                  onAssignCrew={handleAssignLocation}
                  onToggleTurn={handleToggleTurnTaken}
                />
              ) : active === "Engineering" ? (
                <EngineeringStation
                  isPoweredOn={isPoweredOn}
                  onSetPoweredOn={handleSetPoweredOn}
                  maxPowerDice={shipConfig.maxPowerDice}
                  availablePowerDice={availablePowerDice}
                  powerDieType={shipConfig.powerDieType}
                  recoveryRate={shipConfig.recoveryRate}
                  onCycleReactor={handleCycleReactor}
                  hullCurrent={totalHull.current}
                  hullMax={totalHull.max}
                  shieldCurrent={totalShields.current}
                  shieldMax={totalShields.max}
                  shieldTemp={totalShields.temp}
                  onShieldChange={(current, max, temp) => setTotalShields({ current, max, temp })}
                  spentShieldDice={spentShieldDice}
                  onSpentShieldDiceChange={(val) =>
                    updateRoomData((prev) => ({ ...prev, spentShieldDice: val }))
                  }
                  spentHullDice={spentHullDice}
                  onSpentHullDiceChange={(val) =>
                    updateRoomData((prev) => ({ ...prev, spentHullDice: val }))
                  }
                  onBoostSpeed={() =>
                    updateRoomData((prev) => ({ ...prev, engineSpeedBoostTurns: 2 }))
                  }
                  onBoostShields={(rolledTemp) => {
                    updateRoomData((prev) => ({
                      ...prev,
                      shieldBoostTurns: 2,
                      shieldState: {
                        ...prev.shieldState,
                        temp: (prev.shieldState.temp || 0) + rolledTemp,
                      },
                    }))
                  }}
                  onBoostWeapons={() =>
                    updateRoomData((prev) => ({ ...prev, isWeaponsBoosted: true }))
                  }
                  boostActionUsed={boostActionUsed}
                  onBoostActionUsedChange={(val) =>
                    updateRoomData((prev) => ({ ...prev, boostActionUsed: val }))
                  }
                  selectedBoostType={selectedBoostType}
                  onSelectedBoostTypeChange={(val) =>
                    updateRoomData((prev) => ({ ...prev, selectedBoostType: val }))
                  }
                  boostFeedback={boostFeedback}
                  onBoostFeedbackChange={(val) =>
                    updateRoomData((prev) => ({ ...prev, boostFeedback: val }))
                  }
                  engineBoostTurnsRemaining={engineSpeedBoostTurns}
                  shieldBoostTurnsRemaining={shieldBoostTurns}
                  onPatchHull={(amount) => {
                    setTotalHull((prev) => ({
                      current: Math.min(totalHull.max, prev.current + amount),
                      max: totalHull.max,
                    }))
                  }}
                  onApplyFullRecharge={handleApplyFullRecharge}
                  strengthMod={getRawModifier(effectiveStats.strength)}
                  constitutionMod={getRawModifier(effectiveStats.constitution)}
                  patchSkillMod={effectiveSkills.patch ?? 0}
                  regulationSkillMod={effectiveSkills.regulation ?? 0}
                  shipConfig={effectiveShipConfig}
                  installedMods={installedMods}
                  onRemoveMod={handleRemoveMod}
                  stationPools={stationPools}
                  onUpdateStationPools={(newPools) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      stationPools:
                        typeof newPools === "function" ? newPools(prev.stationPools) : newPools,
                    }))
                  }
                  sharedPoolDice={sharedPoolDice}
                  onUpdateSharedPool={(newPool) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      sharedPoolDice:
                        typeof newPool === "function" ? newPool(prev.sharedPoolDice) : newPool,
                    }))
                  }
                  standingByUsed={standingByUsed}
                  onUseStandingBy={() =>
                    updateRoomData((prev) => ({ ...prev, standingByUsed: true }))
                  }
                  leafOnTheWindUsed={leafOnTheWindUsed}
                  onUseLeafOnTheWind={() =>
                    updateRoomData((prev) => ({ ...prev, leafOnTheWindUsed: true }))
                  }
                  versatileTransportUsed={versatileStarshipUsed}
                  onUpdateVersatileTransportUsed={(val) =>
                    updateRoomData((prev) => ({ ...prev, versatileStarshipUsed: val }))
                  }
                  bestShipInVerseUsed={bestShipInVerseUsed}
                  onUpdateBestShipInVerseUsed={(val) =>
                    updateRoomData((prev) => ({ ...prev, bestShipInVerseUsed: val }))
                  }
                  manifest={manifest}
                  onAssignCrew={handleAssignLocation}
                  onToggleTurn={handleToggleTurnTaken}
                  onAddStatus={handleAddStatus}
                  onUpdateSystemDamageLevel={(lvl) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      systemDamageLevel: typeof lvl === "function" ? lvl(prev.systemDamageLevel ?? 0) : lvl,
                    }))
                  }
                />
              ) : active === "Suites" ? (
                <SuitesStation
                  shipConfig={effectiveShipConfig}
                  installedSuites={installedSuites}
                  manifest={manifest}
                  onAssignLocation={handleAssignLocation}
                  onToggleTurn={handleToggleTurnTaken}
                />
              ) : active === "Ship Modifications" ? (
                <ShipModifications
                  installedMods={installedMods}
                  installedSuites={installedSuites}
                  onInstallMod={handleInstallMod}
                  onRemoveMod={handleRemoveMod}
                  onUpdateSuites={handleUpdateSuites}
                  shipConfig={effectiveShipConfig}
                  maxMods={effectiveShipConfig.modSlots}
                />
              ) : active === "Cargo" ? (
                <CargoStation
                  installedMods={installedMods}
                  installedSuites={installedSuites}
                  maxCapacityTons={effectiveShipConfig.cargoCapacity}
                  cargoRations={cargoRations}
                  onUpdateRations={(newRations) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      cargoRations:
                        typeof newRations === "function"
                          ? newRations(prev.cargoRations)
                          : newRations,
                    }))
                  }
                  manifest={manifest}
                  currentDay={currentDay}
                />
              ) : active === "Communications" ? (
                <CommunicationsStation
                  availablePowerDice={stationPools["communications"] ?? availablePowerDice}
                  maxPowerDice={shipConfig.maxPowerDice}
                  powerDieType={shipConfig.powerDieType}
                  onConsumePowerDice={(amt) => handleConsumeStationPower("communications", amt)}
                  impressMod={effectiveSkills.impress ?? 0}
                  interfereMod={effectiveSkills.interfere ?? 0}
                  menaceMod={effectiveSkills.menace ?? 0}
                  swindleMod={effectiveSkills.swindle ?? 0}
                  shipConfig={effectiveShipConfig}
                  installedMods={installedMods}
                  onRemoveMod={handleRemoveMod}
                  stationPools={stationPools}
                  onUpdateStationPools={(newPools) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      stationPools:
                        typeof newPools === "function" ? newPools(prev.stationPools) : newPools,
                    }))
                  }
                  sharedPoolDice={sharedPoolDice}
                  onUpdateSharedPool={(newPool) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      sharedPoolDice:
                        typeof newPool === "function" ? newPool(prev.sharedPoolDice) : newPool,
                    }))
                  }
                  standingByUsed={standingByUsed}
                  onUseStandingBy={() =>
                    updateRoomData((prev) => ({ ...prev, standingByUsed: true }))
                  }
                  leafOnTheWindUsed={leafOnTheWindUsed}
                  onUseLeafOnTheWind={() =>
                    updateRoomData((prev) => ({ ...prev, leafOnTheWindUsed: true }))
                  }
                  versatileTransportUsed={versatileStarshipUsed}
                  onUpdateVersatileTransportUsed={(val) =>
                    updateRoomData((prev) => ({ ...prev, versatileStarshipUsed: val }))
                  }
                  bestShipInVerseUsed={bestShipInVerseUsed}
                  onUpdateBestShipInVerseUsed={(val) =>
                    updateRoomData((prev) => ({ ...prev, bestShipInVerseUsed: val }))
                  }
                  systemDamageLevel={systemDamageLevel}
                  isDisabled={isDisabled}
                  manifest={manifest}
                  onAssignCrew={handleAssignLocation}
                  onToggleTurn={handleToggleTurnTaken}
                />
              ) : active === "Finance" ? (
                <FinanceStation
                  externalShipTier={shipConfig.tier}
                  onUpgradePurchased={(newTier) => {
                    updateRoomData((prev) => ({ ...prev, pendingTier: newTier }))
                    setActive("Ship Setup")
                  }}
                  onUpdateTier={(newTier) => {
                    updateRoomData((prev) => ({
                      ...prev,
                      shipConfig: {
                        ...prev.shipConfig,
                        tier: newTier,
                      },
                    }))
                  }}
                  onTierReverted={(targetTier) => {
                    updateRoomData((prev) => {
                      const updatedRolls = { ...prev.shipConfig.tierRolls }
                      for (let t = prev.shipConfig.tier; t > targetTier; t--) {
                        delete updatedRolls[t]
                      }
                      return {
                        ...prev,
                        shipConfig: {
                          ...prev.shipConfig,
                          tier: targetTier,
                          tierRolls: updatedRolls,
                          roleSpecialization:
                            targetTier < 2 ? null : prev.shipConfig.roleSpecialization,
                          roleMastery: targetTier < 4 ? null : prev.shipConfig.roleMastery,
                          extraSuiteCapacity:
                            targetTier < 2 ? 0 : prev.shipConfig.extraSuiteCapacity,
                        },
                      }
                    })
                  }}
                  onPaymentSettlement={(chartsIncluded?: boolean, ordnanceIncluded?: boolean) => {
                    updateRoomData((prev) => {
                      const updatedOrdnance = ordnanceIncluded
                        ? prev.ordnanceList.map((item) => ({
                            ...item,
                            currentReserve: item.currentReserve + item.requisitionQty,
                            requisitionQty: 0,
                          }))
                        : prev.ordnanceList

                      const nextLastAstrogation =
                        (chartsIncluded !== false && externalPendingCharts > 0) ||
                        chartsIncluded === true
                          ? prev.currentDay
                          : prev.lastAstrogationDay

                      // Clear any status tagged with 'Until Refit' (such as Astrogation mishap penalties)
                      const clearedStatuses = prev.shipStatuses.filter(
                        (s) =>
                          !s.duration?.toLowerCase().includes("refit") &&
                          !s.id?.toLowerCase().includes("mishap")
                      )

                      return {
                        ...prev,
                        spentHullDice: 0,
                        currentFuel: prev.maxFuel,
                        versatileSnubfighterUsed: 0,
                        evasiveManeuversUsed: 0,
                        versatileStarshipUsed: 0,
                        adaptiveArmorUsed: 0,
                        lastAstrogationDay: nextLastAstrogation,
                        ordnanceList: updatedOrdnance,
                        shipStatuses: clearedStatuses,
                      }
                    })
                  }}
                  transactions={transactions}
                  onAddTransaction={handleAddTransaction}
                  currentDay={currentDay}
                  installedMods={installedMods}
                  externalBaseShipCost={shipConfig.shipCost}
                  externalShipCost={shipConfig.shipCost}
                  externalPaidAmount={shipConfig.paidAmount}
                  maxHullPoints={shipConfig.baseHull}
                  spentHullDice={spentHullDice}
                  shipSize={(shipConfig.size?.toLowerCase() as any) || "medium"}
                  isUsedCondition={effectiveIsUsed}
                  onUpdateUsedCondition={handleUpdateUsedConditionBridge}
                  currentFuel={currentFuel}
                  maxFuel={effectiveShipConfig.fuelCapacity}
                  externalPendingCharts={externalPendingCharts}
                  pendingOrdnanceCost={pendingOrdnanceCost}
                  pendingOrdnanceItems={pendingOrdnanceItems}
                  onRestockRations={(qty) =>
                    updateRoomData((prev) => ({ ...prev, cargoRations: prev.cargoRations + qty }))
                  }
                />
              ) : active === "Engines" ? (
                <EnginesStation
                  isPoweredOn={isPoweredOn}
                  onSetPoweredOn={handleSetPoweredOn}
                  currentFuel={currentFuel}
                  onFuelChange={(fuel) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      currentFuel: typeof fuel === "function" ? fuel(prev.currentFuel) : fuel,
                    }))
                  }
                  maxFuel={effectiveShipConfig.fuelCapacity}
                  currentDay={currentDay}
                  onUpdateDay={handleAdvanceCampaignDay}
                  lastAstrogationSyncDay={lastAstrogationDay}
                  activeJourney={activeJourney}
                  availablePowerDice={stationPools["engines"] ?? availablePowerDice}
                  maxPowerDice={shipConfig.maxPowerDice}
                  powerDieType={shipConfig.powerDieType}
                  onConsumePowerDice={(amt) => handleConsumeStationPower("engines", amt)}
                  onNavigate={(station) => {
                    if (station.toLowerCase() === "navcomputer") {
                      setActive("Navcomputer")
                    }
                  }}
                  shipConfig={effectiveShipConfig}
                  installedMods={installedMods}
                  onRemoveMod={handleRemoveMod}
                  onUpdateMod={handleUpdateMod}
                  ordnanceList={ordnanceList}
                  onUpdateOrdnanceList={(newList) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      ordnanceList:
                        typeof newList === "function" ? newList(prev.ordnanceList) : newList,
                    }))
                  }
                  stationPools={stationPools}
                  onUpdateStationPools={(newPools) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      stationPools:
                        typeof newPools === "function" ? newPools(prev.stationPools) : newPools,
                    }))
                  }
                  sharedPoolDice={sharedPoolDice}
                  onUpdateSharedPool={(newPool) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      sharedPoolDice:
                        typeof newPool === "function" ? newPool(prev.sharedPoolDice) : newPool,
                    }))
                  }
                  pinpointStrikesUsed={pinpointStrikesUsed}
                  onUpdatePinpointStrikesUsed={(val) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      pinpointStrikesUsed:
                        typeof val === "function" ? val(prev.pinpointStrikesUsed) : val,
                    }))
                  }
                  versatileSnubfighterUsed={versatileSnubfighterUsed}
                  onUpdateVersatileSnubfighterUsed={(val) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      versatileSnubfighterUsed:
                        typeof val === "function" ? val(prev.versatileSnubfighterUsed) : val,
                    }))
                  }
                  evasiveManeuversUsed={evasiveManeuversUsed}
                  onUpdateEvasiveManeuversUsed={(val) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      evasiveManeuversUsed:
                        typeof val === "function" ? val(prev.evasiveManeuversUsed) : val,
                    }))
                  }
                  adaptiveArmorUsed={adaptiveArmorUsed}
                  onUpdateAdaptiveArmorUsed={(val) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      adaptiveArmorUsed:
                        typeof val === "function" ? val(prev.adaptiveArmorUsed) : val,
                    }))
                  }
                  onRecharge={() =>
                    updateRoomData((prev) => ({ ...prev, pinpointStrikesUsed: 0 }))
                  }
                  isEngineBoosted={engineSpeedBoostTurns > 0}
                  engineBoostTurnsRemaining={engineSpeedBoostTurns}
                  standingByUsed={standingByUsed}
                  onUseStandingBy={() =>
                    updateRoomData((prev) => ({ ...prev, standingByUsed: true }))
                  }
                  leafOnTheWindUsed={leafOnTheWindUsed}
                  onUseLeafOnTheWind={() =>
                    updateRoomData((prev) => ({ ...prev, leafOnTheWindUsed: true }))
                  }
                  sFoilsMode={sFoilsMode}
                  onToggleSFoils={(mode) =>
                    updateRoomData((prev) => ({ ...prev, sFoilsMode: mode }))
                  }
                  currentHull={totalHull.current}
                  maxHull={totalHull.max}
                  currentShields={totalShields.current}
                  maxShields={totalShields.max}
                  systemDamageLevel={systemDamageLevel}
                  onUpdateSystemDamageLevel={(lvl) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      systemDamageLevel: typeof lvl === "function" ? lvl(prev.systemDamageLevel ?? 0) : lvl,
                    }))
                  }
                  effectiveSlowedLevel={effectiveSlowedLevel}
                  manifest={manifest}
                  onAssignCrew={handleAssignLocation}
                  onToggleTurn={handleToggleTurnTaken}
                  tacticalMovement={tacticalMovement}
                  onSpendMovement={handleSpendMovement}
                  onResetMovement={handleResetMovement}
                  isWeaponsBoosted={isWeaponsBoosted}
                  onConsumeWeaponBoost={() =>
                    updateRoomData((prev) => ({ ...prev, isWeaponsBoosted: false }))
                  }
                  onAddStatus={handleAddStatus}
                />
              ) : active === "Navcomputer" ? (
                <NavcomputerStation
                  astrogationAdvantage={astrogationAdvantage}
                  astrogationSkillMod={effectiveSkills.astrogation ?? 0}
                  currentDay={currentDay}
                  lastAstrogationSyncDay={lastAstrogationDay}
                  activeJourney={activeJourney}
                  onStartJourney={(journey) => {
                    updateRoomData((prev) => ({
                      ...prev,
                      activeJourney: journey,
                      targetDestinationPlanet: journey.destination,
                    }))
                  }}
                  onCancelJourney={() => handleCompleteOrCancelJourney(false)}
                  onArriveAtDestination={() => handleCompleteOrCancelJourney(true)}
                  onEmergencyDropOut={handleEmergencyDropOut}
                  currentLocationPlanet={currentLocationPlanet}
                  onUpdateCurrentLocationPlanet={(planet) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      currentLocationPlanet:
                        typeof planet === "function" ? planet(prev.currentLocationPlanet) : planet,
                    }))
                  }
                  targetDestinationPlanet={targetDestinationPlanet}
                  onUpdateTargetDestinationPlanet={(dest) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      targetDestinationPlanet:
                        typeof dest === "function" ? dest(prev.targetDestinationPlanet) : dest,
                    }))
                  }
                  onBackToEngines={() => setActive("Engines")}
                  installedMods={installedMods}
                  onRemoveMod={handleRemoveMod}
                  onAddStatus={handleAddStatus}
                  onApplyDirectHullDamage={(amt) => {
                    setTotalHull((prev) => ({
                      current: Math.max(0, prev.current - amt),
                      max: totalHull.max,
                    }))
                  }}
                />
              ) : active === "GM Station" ? (
                <GmStation
                  contacts={sanitizedSensorContacts}
                  onAddContact={handleAddContact}
                  onAddContacts={handleAddContacts}
                  onRemoveContact={handleRemoveContact}
                  onClearContacts={handleClearContacts}
                  onToggleReveal={handleToggleReveal}
                  shipStatuses={shipStatuses}
                  onAddStatus={handleAddStatus}
                  onRemoveStatus={handleRemoveStatus}
                  manifest={manifest}
                  onToggleTurn={handleToggleTurnTaken}
                  onUpdateInitiative={handleUpdateInitiative}
                  onCycleReactor={handleCycleReactor}
                  currentHull={totalHull.current}
                  maxHull={totalHull.max}
                  onHullChange={(curr, max) => setTotalHull({ current: curr, max })}
                  currentShields={totalShields.current}
                  maxShields={totalShields.max}
                  onShieldChange={(curr, max, temp) => setTotalShields({ current: curr, max, temp })}
                  systemDamageLevel={systemDamageLevel}
                  onUpdateSystemDamageLevel={(lvl) =>
                    updateRoomData((prev) => ({
                      ...prev,
                      systemDamageLevel: typeof lvl === "function" ? lvl(prev.systemDamageLevel ?? 0) : lvl,
                    }))
                  }
                  availablePowerDice={availablePowerDice}
                  maxPowerDice={shipConfig.maxPowerDice}
                  shipConfig={effectiveShipConfig}
                  combatState={combatState}
                  onUpdateCombatState={handleUpdateCombatState}
                />
              ) : active === "Codex" ? (
                <CodexStation />
              ) : (
                <OfflineStation name={active} />
              )}
            </main>
          </div>
        </>
      )}
    </div>
  )
}

function OfflineStation({ name }: { name: Station }) {
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 rounded-md border border-bridge-border bg-bridge-panel text-center">
      <span
        className="h-10 w-10 animate-pulse rotate-45 border-2 border-cyan-neon/40"
        aria-hidden="true"
      />
      <p className="text-glow-cyan text-sm font-bold tracking-[0.2em] text-cyan-neon/80">
        {name.toUpperCase()} STATION
      </p>
      <p className="max-w-xs text-xs tracking-widest text-muted-foreground/60">
        CONSOLE STANDING BY — SELECT WEAPONS FOR ACTIVE TACTICAL FEED
      </p>
    </div>
  )
}