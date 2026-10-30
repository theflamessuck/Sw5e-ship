"use client"

import { useState, useMemo, useEffect } from "react"
import { ShipStats } from "./ship-stats"
import { CombatResources } from "./combat-resources"
import { StationModifications, type Modification } from "./ship-modifications"
import { 
  Radio, 
  Trash2, 
  ShieldAlert, 
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
  Cpu,
  Radar,
  Send,
  Target,
  Sparkles,
  AlertOctagon
} from "lucide-react"
import type { SensorContact } from "./gm-station"
import type { ShipConfig } from "./ship-setup"
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

export type SensorsCardId =
  | "arrayStatus"
  | "powerDice"
  | "activeScan"
  | "sensorProbe"
  | "contacts"
  | "tacticalModules"
  | "mods"
  | "ship_stats"

interface CustomPreset {
  id: string
  name: string
  activeCards: SensorsCardId[]
}

const DEFAULT_PRESETS: CustomPreset[] = [
  { id: "radar", name: "Radar & Contacts", activeCards: ["arrayStatus", "contacts"] },
  { id: "recon", name: "Active Recon", activeCards: ["activeScan", "sensorProbe", "contacts"] },
  { id: "ew", name: "Tactical ECM", activeCards: ["tacticalModules", "powerDice", "arrayStatus"] },
  { id: "all", name: "All Sensor Systems", activeCards: ["arrayStatus", "powerDice", "activeScan", "sensorProbe", "contacts", "tacticalModules", "mods", "ship_stats"] }
]

export interface SensorsEcmState {
  flares?: number
  buzzDroids?: number
  dampener?: number
  disruptor?: number
  threatTracker?: number
}

interface SensorsStationProps {
  availablePowerDice?: number
  maxPowerDice?: number
  powerDieType?: string
  onConsumePowerDice?: (amount?: number) => boolean | void
  contacts?: SensorContact[]
  onUpdateContact?: (id: string, updates: Partial<SensorContact>) => void
  onRemoveContact?: (id: string) => void
  sensorSkillMod?: number
  probeSkillMod?: number
  shipConfig?: ShipConfig
  proficiencyBonus?: number
  installedMods?: Modification[]
  onRemoveMod?: (instanceId: string) => void
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
  systemDamageLevel?: number
  isBlinded?: boolean
  manifest?: ManifestMember[]
  onAssignCrew?: (memberId: string, targetLocation: ShipCompartmentId) => void
  onToggleTurn?: (memberId: string) => void
  ecmUses?: SensorsEcmState
  onUpdateEcmUses?: (updater: SensorsEcmState | ((prev: SensorsEcmState) => SensorsEcmState)) => void
}

export function SensorsStation({
  availablePowerDice = 4,
  maxPowerDice = 4,
  powerDieType,
  onConsumePowerDice = () => false,
  contacts = [],
  onUpdateContact,
  onRemoveContact,
  sensorSkillMod,
  probeSkillMod,
  shipConfig,
  proficiencyBonus = 2,
  installedMods = [],
  onRemoveMod = () => {},
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
  systemDamageLevel = 0,
  isBlinded = false,
  manifest = [],
  onAssignCrew,
  onToggleTurn,
  ecmUses: externalEcmUses,
  onUpdateEcmUses,
}: SensorsStationProps) {
  // --- MFD MODULAR DECK STATE (PER-CLIENT PERSISTENCE) ---
  const [openCards, setOpenCards] = useState<SensorsCardId[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sw5e_sensors_open_cards")
        if (saved) return JSON.parse(saved)
      } catch {}
    }
    return ["activeScan", "contacts", "powerDice"]
  })

  const [maximizedCard, setMaximizedCard] = useState<SensorsCardId | null>(null)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sw5e_sensors_open_cards", JSON.stringify(openCards))
      } catch {}
    }
  }, [openCards])

  const toggleCard = (id: SensorsCardId) => {
    if (soundEnabled) {
      playFlatGlassClick()
      triggerTactilePulse("tap")
    }
    setOpenCards((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const applyPreset = (cards: SensorsCardId[]) => {
    if (soundEnabled) {
      playSubtleEngage()
      triggerTactilePulse("heavy")
    }
    setOpenCards(cards)
    setMaximizedCard(null)
  }

  const handleSaveCustomPreset = () => {
    const name = window.prompt("Enter name for this custom sensors layout:", "Custom Sensors Setup")
    if (!name) return
    if (typeof window !== "undefined") {
      try {
        const key = `sw5e_sensors_preset_${Date.now()}`
        localStorage.setItem(key, JSON.stringify({ id: key, name, activeCards: openCards }))
        alert(`Preset '${name}' saved to this device!`)
      } catch {}
    }
  }

  // --- CREW ASSIGNMENT EXTRACTION ---
  const assignedCrew = useMemo(() => {
    return manifest
      .filter((m) => m.location === "sensors" && !m.isPassenger)
      .sort((a, b) => a.assignedOrder - b.assignedOrder)
  }, [manifest])

  const availablePersonnel = useMemo(() => {
    return manifest.filter((m) => m.location !== "sensors" && !m.isPassenger)
  }, [manifest])

  const sensorsMods = useMemo(() => {
    return installedMods.filter(
      (m) => m.station?.toLowerCase() === "sensors"
    )
  }, [installedMods])

  const shipTier = typeof shipConfig?.tier === "number" ? shipConfig.tier : 0
  const shipSize = (shipConfig?.size || "small").toLowerCase()
  const isSmallOrTiny = shipSize === "small" || shipSize === "tiny"
  const isMedium = shipSize === "medium"
  const tierUses = Math.max(1, shipTier)

  // Chassis Surge Gating
  const hasStandingBy = isSmallOrTiny && shipTier >= 4
  const hasLeafOnTheWind = isSmallOrTiny && shipTier >= 5
  const hasVersatileTransport = isMedium && shipTier >= 3
  const versatileMaxUses = 2 * shipTier
  const hasBestShip = isMedium && shipTier >= 5

  // Scan States & Mastery Choice workflow
  const [activeScan, setActiveScan] = useState(false)
  const [scanDice, setScanDice] = useState<[number, number]>([10, 10])
  const [scanState, setScanState] = useState<"idle" | "choice" | "reroll_preview" | "manual" | "done">("idle")
  const [scanRerollLabel, setScanRerollLabel] = useState<string>("")
  const [manualScanInput, setManualScanInput] = useState<string>("")
  const [lastRollResult, setLastRollResult] = useState<{
    roll: number
    total: number
    discoveredCount: number
    tierUsed: string
  } | null>(null)

  // Probe States & Mastery Choice workflow
  const [activeProbe, setActiveProbe] = useState(false)
  const [probeDice, setProbeDice] = useState<[number, number]>([10, 10])
  const [probeState, setProbeState] = useState<"idle" | "choice" | "reroll_preview" | "done">("idle")
  const [rerollActionLabel, setRerollActionLabel] = useState<string>("")
  const [probeFinalResult, setProbeFinalResult] = useState<{
    roll: number
    total: number
    tierUsed: string
  } | null>(null)

  // Clear Contact Warning State
  const [clearingContactId, setClearingContactId] = useState<string | null>(null)

  // Hardware Feature Detection
  const hasScannerPremium = installedMods.some((m) => m.name.toUpperCase().includes("SCANNER, PREMIUM"))
  const hasScannerPrototype = installedMods.some((m) => m.name.toUpperCase().includes("SCANNER, PROTOTYPE"))
  const hasScannerRenowned = installedMods.some((m) => m.name.toUpperCase().includes("SCANNER, RENOWNED"))
  const hasFlarePods = installedMods.some((m) => m.name.toUpperCase().includes("FLARE PODS"))
  const hasBuzzDroids = installedMods.some((m) => m.name.toUpperCase().includes("BUZZ DROID CLOUD"))
  const hasSensorDampener = installedMods.some((m) => m.name.toUpperCase().includes("SENSOR DAMPENER"))
  const hasShieldDisruptor = installedMods.some((m) => m.name.toUpperCase().includes("SHIELD DISRUPTOR"))
  const hasThreatTracker = installedMods.some((m) => m.name.toUpperCase().includes("THREAT TRACKER"))
  const hasStealthDevice = installedMods.some((m) => m.name.toUpperCase().includes("STEALTH DEVICE"))
  const hasActiveCamouflage = installedMods.some((m) => m.name.toUpperCase().includes("ACTIVE CAMOUFLAGE"))
  const hasCloakingDevice = installedMods.some((m) => m.name.toUpperCase().includes("CLOAKING DEVICE"))

  // Synchronized or Local Tactical Sensor Charge Trackers
  const [localEcmUses, setLocalEcmUses] = useState<SensorsEcmState>({
    flares: 0,
    buzzDroids: 0,
    dampener: 0,
    disruptor: 0,
    threatTracker: 0,
  })

  const currentEcmUses = externalEcmUses ?? localEcmUses
  const updateEcmUses = onUpdateEcmUses ?? setLocalEcmUses

  const [stealthActive, setStealthActive] = useState<boolean>(false)
  const [tacticalFeedback, setTacticalFeedback] = useState<string | null>(null)

  const powerCoupling = shipConfig?.powerCoupling ?? shipConfig?.couplingType ?? "Direct Power Coupling"
  const isDistributed = powerCoupling.toLowerCase().includes("distributed")
  const isHubAndSpoke = powerCoupling.toLowerCase().includes("hub") || powerCoupling.toLowerCase().includes("spoke")
  const isDirect = !isDistributed && !isHubAndSpoke

  const currentStationDice = stationPools["sensors"] ?? (isHubAndSpoke ? 1 : isDistributed ? 2 : availablePowerDice)

  const effectiveMax = isDirect ? maxPowerDice : (isDistributed ? 2 : 1)
  const rawEffectiveAvailable = isDirect ? availablePowerDice : currentStationDice
  const effectiveAvailable = Math.min(rawEffectiveAvailable, effectiveMax)

  const handleCustomConsume = (amount: number = 1) => {
    if (isDirect) {
      return onConsumePowerDice?.(amount)
    }

    if (currentStationDice >= amount) {
      if (onUpdateStationPools) {
        onUpdateStationPools((prev) => ({
          ...prev,
          sensors: Math.max(0, (prev["sensors"] ?? (isHubAndSpoke ? 1 : 2)) - amount),
        }))
      }
      return true
    } else if (isHubAndSpoke && sharedPoolDice >= amount) {
      if (onUpdateSharedPool) {
        onUpdateSharedPool((prev) => Math.max(0, prev - amount))
      }
      return true
    }

    return !!onConsumePowerDice?.(amount)
  }

  const canSpendStation = effectiveAvailable > 0
  const canSpendShared = isHubAndSpoke && sharedPoolDice > 0

  const configAny = shipConfig as any

  const rawWisdom = 
    configAny?.attributes?.Wisdom ?? 
    configAny?.attributes?.wisdom ?? 
    configAny?.stats?.Wisdom ?? 
    configAny?.stats?.wisdom ?? 
    configAny?.Wisdom ?? 
    configAny?.wisdom ?? 
    10
  const wisMod = rawWisdom <= 5 && rawWisdom >= -5 ? rawWisdom : Math.floor((rawWisdom - 10) / 2)

  const rawIntelligence = 
    configAny?.attributes?.Intelligence ?? 
    configAny?.attributes?.intelligence ?? 
    configAny?.stats?.Intelligence ?? 
    configAny?.stats?.intelligence ?? 
    configAny?.Intelligence ?? 
    configAny?.intelligence ?? 
    10
  const intMod = rawIntelligence <= 5 && rawIntelligence >= -5 ? rawIntelligence : Math.floor((rawIntelligence - 10) / 2)

  const rawCharisma = 
    configAny?.attributes?.Charisma ?? 
    configAny?.attributes?.charisma ?? 
    configAny?.stats?.Charisma ?? 
    configAny?.stats?.charisma ?? 
    configAny?.Charisma ?? 
    configAny?.charisma ?? 
    10
  const chaMod = rawCharisma <= 5 && rawCharisma >= -5 ? rawCharisma : Math.floor((rawCharisma - 10) / 2)

  const profBonus = proficiencyBonus ?? 2

  const isScout = shipConfig?.roleSpecialization === "Scout"
  const scoutBonus = isScout ? 1 : 0

  const interfereBonus = (shipConfig?.skills?.interfere ?? (chaMod + profBonus)) + (shipConfig?.roleMastery === "Scrambler" ? 2 : 0)

  const rawScanTier = shipConfig?.skillTiers?.scan || configAny?.skillTiers?.scan || ""
  const normalizedScanTier = String(rawScanTier).toLowerCase().trim()

  const isGrandMasteryScan = normalizedScanTier === "grand-mastery" || normalizedScanTier === "gm" || normalizedScanTier === "3"
  const isHighMasteryScan = normalizedScanTier === "high-mastery" || normalizedScanTier === "hm" || normalizedScanTier === "2"
  const isMasteryScan = isGrandMasteryScan || isHighMasteryScan || normalizedScanTier === "mastery" || normalizedScanTier === "m" || normalizedScanTier === "1" || normalizedScanTier === "true"

  let scanMasteryBadge = ""
  if (isGrandMasteryScan) {
    scanMasteryBadge = "GM"
  } else if (isHighMasteryScan) {
    scanMasteryBadge = "HM"
  } else if (isMasteryScan) {
    scanMasteryBadge = "M"
  }

  const rawProbeTier = shipConfig?.skillTiers?.probe || configAny?.skillTiers?.probe || ""
  const normalizedProbeTier = String(rawProbeTier).toLowerCase().trim()

  const isGrandMasteryProbe = normalizedProbeTier === "grand-mastery" || normalizedProbeTier === "gm" || normalizedProbeTier === "3"
  const isHighMasteryProbe = normalizedProbeTier === "high-mastery" || normalizedProbeTier === "hm" || normalizedProbeTier === "2"
  const isMasteryProbe = isGrandMasteryProbe || isHighMasteryProbe || normalizedProbeTier === "mastery" || normalizedProbeTier === "m" || normalizedProbeTier === "1" || normalizedProbeTier === "true"

  let probeMasteryBadge = ""
  if (isGrandMasteryProbe) {
    probeMasteryBadge = "GM"
  } else if (isHighMasteryProbe) {
    probeMasteryBadge = "HM"
  } else if (isMasteryProbe) {
    probeMasteryBadge = "M"
  }

  const baseScanSkill = shipConfig?.skills?.scan ?? sensorSkillMod ?? (wisMod + profBonus)
  const calculatedScanSkill = baseScanSkill + scoutBonus

  const baseProbeSkill = shipConfig?.skills?.probe ?? probeSkillMod ?? (intMod + profBonus)
  const calculatedProbeSkill = baseProbeSkill + scoutBonus

  const handleInitiateActiveScan = () => {
    if (activeScan || isBlinded) return

    setActiveScan(true)
    const roll1 = Math.floor(Math.random() * 20) + 1
    const roll2 = Math.floor(Math.random() * 20) + 1

    setTimeout(() => {
      setActiveScan(false)
      setScanDice([roll1, roll2])

      if (hasScannerRenowned || isGrandMasteryScan || isHighMasteryScan) {
        setScanState("choice")
      } else if (isMasteryScan) {
        const bestRoll = Math.max(roll1, roll2)
        applyScanFinalResult(bestRoll, "Mastery (2d20 Take Highest)")
      } else {
        applyScanFinalResult(roll1, "Standard (1d20)")
      }
    }, 1000)
  }

  const applyScanFinalResult = (finalRoll: number, tierUsed: string) => {
    const total = finalRoll + calculatedScanSkill

    let discoveredCount = 0
    contacts.forEach((contact) => {
      if (!contact.isRevealed && total >= contact.scanDc) {
        if (onUpdateContact) {
          onUpdateContact(contact.id, { isRevealed: true })
        }
        discoveredCount++
      }
    })

    setLastRollResult({
      roll: finalRoll,
      total,
      discoveredCount,
      tierUsed,
    })
    setScanState("done")
  }

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isBlinded) {
      alert("Sensors Offline: Sight and scanner checks automatically fail while the vessel has the Blinded condition.")
      return
    }
    const parsedTotal = parseInt(manualScanInput, 10)
    if (isNaN(parsedTotal)) return

    const derivedRoll = Math.max(1, Math.min(20, parsedTotal - calculatedScanSkill))

    let discoveredCount = 0
    contacts.forEach((contact) => {
      if (!contact.isRevealed && parsedTotal >= contact.scanDc) {
        if (onUpdateContact) {
          onUpdateContact(contact.id, { isRevealed: true })
        }
        discoveredCount++
      }
    })

    setLastRollResult({
      roll: derivedRoll,
      total: parsedTotal,
      discoveredCount,
      tierUsed: "Manual Physical Dice Roll",
    })
    setManualScanInput("")
    setScanState("done")
  }

  const handleHighMasteryScanRerollLowest = () => {
    const [d1, d2] = scanDice
    const lowestIndex = d1 <= d2 ? 0 : 1
    const newRoll = Math.floor(Math.random() * 20) + 1
    const updatedDice: [number, number] = lowestIndex === 0 ? [newRoll, d2] : [d1, newRoll]

    setScanDice(updatedDice)
    setScanRerollLabel("High Mastery (HM - Rerolled Lowest Die)")
    setScanState("reroll_preview")
  }

  const handleGrandMasteryScanRerollSpecific = (targetIndex: number, label: string) => {
    const [d1, d2] = scanDice
    const newRoll = Math.floor(Math.random() * 20) + 1
    const updatedDice: [number, number] = targetIndex === 0 ? [newRoll, d2] : [d1, newRoll]

    setScanDice(updatedDice)
    setScanRerollLabel(label)
    setScanState("reroll_preview")
  }

  const handleGrandMasteryScanRerollBoth = () => {
    const newRoll1 = Math.floor(Math.random() * 20) + 1
    const newRoll2 = Math.floor(Math.random() * 20) + 1
    setScanDice([newRoll1, newRoll2])
    setScanRerollLabel("Grand Mastery (GM - Rerolled Both Dice)")
    setScanState("reroll_preview")
  }

  const handleKeepCurrentScanDice = (tierLabel: string) => {
    const [d1, d2] = scanDice
    const bestRoll = (isMasteryScan || hasScannerRenowned) ? Math.max(d1, d2) : d1
    applyScanFinalResult(bestRoll, tierLabel)
  }

  const handleFinalizeScanReroll = () => {
    const [d1, d2] = scanDice
    const bestRoll = Math.max(d1, d2)
    applyScanFinalResult(bestRoll, scanRerollLabel)
  }

  const handleLaunchProbe = () => {
    if (activeProbe || isBlinded) return

    setActiveProbe(true)
    const roll1 = Math.floor(Math.random() * 20) + 1
    const roll2 = Math.floor(Math.random() * 20) + 1

    setTimeout(() => {
      setActiveProbe(false)
      setProbeDice([roll1, roll2])

      if (hasScannerRenowned || isGrandMasteryProbe || isHighMasteryProbe) {
        setProbeState("choice")
      } else if (isMasteryProbe) {
        const bestRoll = Math.max(roll1, roll2)
        setProbeFinalResult({
          roll: bestRoll,
          total: bestRoll + calculatedProbeSkill,
          tierUsed: "Mastery (2d20 Take Highest)",
        })
        setProbeState("done")
      } else {
        setProbeFinalResult({
          roll: roll1,
          total: roll1 + calculatedProbeSkill,
          tierUsed: "Standard (1d20)",
        })
        setProbeState("done")
      }
    }, 1000)
  }

  const handleHighMasteryRerollLowest = () => {
    const [d1, d2] = probeDice
    const lowestIndex = d1 <= d2 ? 0 : 1
    const newRoll = Math.floor(Math.random() * 20) + 1
    const updatedDice: [number, number] = lowestIndex === 0 ? [newRoll, d2] : [d1, newRoll]

    setProbeDice(updatedDice)
    setRerollActionLabel("High Mastery (HM - Rerolled Lowest Die)")
    setProbeState("reroll_preview")
  }

  const handleGrandMasteryRerollSpecific = (targetIndex: number, label: string) => {
    const [d1, d2] = probeDice
    const newRoll = Math.floor(Math.random() * 20) + 1
    const updatedDice: [number, number] = targetIndex === 0 ? [newRoll, d2] : [d1, newRoll]

    setProbeDice(updatedDice)
    setRerollActionLabel(label)
    setProbeState("reroll_preview")
  }

  const handleGrandMasteryRerollBoth = () => {
    const newRoll1 = Math.floor(Math.random() * 20) + 1
    const newRoll2 = Math.floor(Math.random() * 20) + 1
    setProbeDice([newRoll1, newRoll2])
    setRerollActionLabel("Grand Mastery (GM - Rerolled Both Dice)")
    setProbeState("reroll_preview")
  }

  const handleKeepCurrentDice = (tierLabel: string) => {
    const [d1, d2] = probeDice
    const bestRoll = (isMasteryProbe || hasScannerRenowned) ? Math.max(d1, d2) : d1
    setProbeFinalResult({
      roll: bestRoll,
      total: bestRoll + calculatedProbeSkill,
      tierUsed: tierLabel,
    })
    setProbeState("done")
  }

  const handleFinalizeReroll = () => {
    const [d1, d2] = probeDice
    const bestRoll = Math.max(d1, d2)
    setProbeFinalResult({
      roll: bestRoll,
      total: bestRoll + calculatedProbeSkill,
      tierUsed: rerollActionLabel,
    })
    setProbeState("done")
  }

  const handleTriggerFlares = () => {
    const current = currentEcmUses.flares ?? 0
    if (current >= tierUses) return
    updateEcmUses((prev) => ({ ...prev, flares: current + 1 }))
    setTacticalFeedback("Countermeasure Flares Deployed: Advantage granted on Dexterity saving throw against triggering attack or missile!")
  }

  const handleDeployBuzzDroids = () => {
    const current = currentEcmUses.buzzDroids ?? 0
    if (current >= tierUses) return
    updateEcmUses((prev) => ({ ...prev, buzzDroids: current + 1 }))
    setTacticalFeedback("Buzz Droid Cloud Deployed: 200-ft sphere created within 1,500 ft. Area is difficult terrain; deals 2d4 kinetic hull damage per 50 ft travelled!")
  }

  const handleTriggerSensorDampener = () => {
    const current = currentEcmUses.dampener ?? 0
    if (current >= tierUses) return
    updateEcmUses((prev) => ({ ...prev, dampener: current + 1 }))
    const dc = 8 + interfereBonus
    setTacticalFeedback(`Sensor Dampener Engaged: Target within 1,000 ft must succeed on a DC ${dc} Wisdom saving throw or be blinded for 1 minute!`)
  }

  const handleTriggerShieldDisruptor = () => {
    const current = currentEcmUses.disruptor ?? 0
    if (current >= tierUses) return
    updateEcmUses((prev) => ({ ...prev, disruptor: current + 1 }))
    setTacticalFeedback(`Shield Disruptor Activated: Make Charisma (Interfere) check (+${interfereBonus}) contested by target's Constitution (Regulate) check. On failure, target shield capacity & regen rate are halved for 1 minute!`)
  }

  const handleTriggerThreatTracker = () => {
    const maxUses = Math.max(1, wisMod)
    const current = currentEcmUses.threatTracker ?? 0
    if (current >= maxUses) return
    updateEcmUses((prev) => ({ ...prev, threatTracker: current + 1 }))
    setTacticalFeedback(`Threat Tracker Activated: Substituted Wisdom saving throw for Dexterity saving throw (${maxUses - (current + 1)} uses remaining)!`)
  }

  const handleToggleStealth = () => {
    const nextState = !stealthActive
    setStealthActive(nextState)
    if (nextState) {
      if (hasCloakingDevice) {
        setTacticalFeedback("Cloaking Device Active: Vessel is INVISIBLE. Advantage on Dexterity (Hide) checks!")
      } else if (hasActiveCamouflage) {
        setTacticalFeedback("Active Camouflage Active: Scanner penalties removed. No mishap roll before hyperspace!")
      } else {
        setTacticalFeedback("Stealth Mode Active: Advantage on Hide checks relying on scanners. Disadvantage on Scan/Probe checks!")
      }
    } else {
      setTacticalFeedback("Stealth Mode Deactivated: Normal sensor signatures restored.")
    }
  }

  // RENDER DOCKED SNAPSHOT CARD TILE
  const renderSnapshotCard = (
    id: SensorsCardId,
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
            <h2 className="text-glow-cyan text-base md:text-lg font-bold tracking-[0.1em] text-cyan-neon flex items-center gap-2">
              <Radar className="h-5 w-5 text-cyan-neon" />
              SENSOR ARRAY &amp; SCANNER CONTROL
            </h2>
          </div>
          <p className="text-[10px] tracking-[0.3em] text-muted-foreground/60 mt-0.5">
            {shipConfig?.name?.toUpperCase() || "VESSEL"} // LONG-RANGE DETECTION //{" "}
            <span className={isBlinded ? "text-red-400 font-bold animate-pulse" : "text-emerald-400 font-bold"}>
              {isBlinded ? "ARRAY JAMMED (BLINDED)" : "ACTIVE DETECTION GRID NOMINAL"}
            </span>
          </p>
        </div>

        {/* Tactical Status Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {isBlinded && (
            <span className="rounded border border-red-500/80 bg-red-950/60 px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider text-red-300 animate-pulse">
              ⚠️ BLINDED
            </span>
          )}

          {hasScannerRenowned ? (
            <span className="rounded border border-purple-400/50 bg-purple-950/40 px-2 py-0.5 text-[9px] font-mono font-bold text-purple-300">
              TRUESIGHT (1000 FT)
            </span>
          ) : hasScannerPremium ? (
            <span className="rounded border border-cyan-400/50 bg-cyan-950/40 px-2 py-0.5 text-[9px] font-mono font-bold text-cyan-300">
              BLINDSIGHT (1000 FT)
            </span>
          ) : null}

          {isScout && (
            <span className="rounded border border-amber-400/50 bg-amber-950/40 px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider text-amber-300">
              SCOUT SPEC (+1 SCAN/PROBE)
            </span>
          )}

          <span className={`rounded-sm border px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase font-mono ${
            isBlinded
              ? "border-red-500/80 bg-red-950/60 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse"
              : "border-cyan-neon/50 bg-cyan-neon/10 text-cyan-neon text-glow-cyan"
          }`}>
            ARRAY: {isBlinded ? "BLINDED" : "ONLINE"}
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
            <span>Sensors Console Personnel:</span>
          </div>

          {assignedCrew.length === 0 ? (
            <span className="text-xs text-amber-300 italic px-2 py-0.5 border border-amber-500/30 bg-amber-950/20 rounded">
              Console Uncrewed — Assign Sensor Officer
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
                    {isLead ? "Sensor Officer" : "Support"}
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
                if (e.target.value) onAssignCrew(e.target.value, "sensors")
              }}
              className="rounded bg-slate-950 border border-slate-700 px-2 py-0.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-neon cursor-pointer"
            >
              <option value="" disabled>+ Assign Sensor Crew...</option>
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
          "arrayStatus",
          "Array Status",
          isBlinded ? "BLINDED" : hasScannerRenowned ? "Truesight" : hasScannerPremium ? "Blindsight" : "Standard",
          isBlinded ? "Sensors Jammed" : "Detection Ready",
          <Radar className="w-3 h-3 text-cyan-neon" />,
          isBlinded ? "text-red-400 animate-pulse" : "text-cyan-neon"
        )}

        {renderSnapshotCard(
          "powerDice",
          "Sensors Power",
          isDistributed ? `${currentStationDice}/2 Dice` : `${effectiveAvailable}/${effectiveMax} Dice`,
          isHubAndSpoke ? `${sharedPoolDice}/2 Shared` : powerCoupling.replace(" Power Coupling", ""),
          <Zap className="w-3 h-3 text-amber-400" />,
          "text-amber-300"
        )}

        {renderSnapshotCard(
          "activeScan",
          "Active Scan",
          `+${calculatedScanSkill} Mod`,
          scanMasteryBadge ? `Tier: ${scanMasteryBadge}` : "Standard Sweep",
          <Target className="w-3 h-3 text-cyan-neon" />,
          "text-cyan-neon"
        )}

        {renderSnapshotCard(
          "sensorProbe",
          "Sensor Probe",
          `+${calculatedProbeSkill} Mod`,
          probeMasteryBadge ? `Tier: ${probeMasteryBadge}` : "Recon Probe",
          <Send className="w-3 h-3 text-amber-400" />,
          "text-amber-300"
        )}

        {renderSnapshotCard(
          "contacts",
          "Sector Contacts",
          `${contacts.filter(c => c.isRevealed).length} Revealed`,
          `${contacts.length} Tracked`,
          <Radio className="w-3 h-3 text-cyan-neon" />,
          contacts.filter(c => c.isRevealed).length > 0 ? "text-cyan-neon font-bold" : "text-slate-400"
        )}

        {renderSnapshotCard(
          "tacticalModules",
          "ECM & Stealth",
          hasFlarePods || hasBuzzDroids || hasSensorDampener || hasShieldDisruptor ? "Active ECM" : "Standard",
          stealthActive ? "Cloaked" : "ECM Ready",
          <ShieldAlert className="w-3 h-3 text-purple-400" />,
          stealthActive ? "text-purple-300 animate-pulse" : "text-purple-300"
        )}

        {renderSnapshotCard(
          "mods",
          "Hardware",
          `${sensorsMods.length} Mods`,
          "Sensors Hardware",
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
          <Radar className="w-8 h-8 text-cyan-neon/30 mb-2 animate-pulse" />
          <p className="uppercase tracking-widest text-slate-300 font-bold">ALL SENSORS CONSOLE PANELS COLLAPSED</p>
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
                      {cardId === "arrayStatus" && "Sensor Array Calibration & Range"}
                      {cardId === "powerDice" && "Sensors Power Coupling Matrix"}
                      {cardId === "activeScan" && "Active Sensor Sweep System"}
                      {cardId === "sensorProbe" && "Deep-Space Sensor Probe Launch"}
                      {cardId === "contacts" && "Detected Sector Contacts & Radar"}
                      {cardId === "tacticalModules" && "Active Tactical Sensor Countermeasures"}
                      {cardId === "mods" && "Installed Sensor Hardware Modifications"}
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

                {/* 1. ARRAY STATUS WORKSPACE */}
                {cardId === "arrayStatus" && (
                  <div className="flex flex-col gap-3">
                    {isBlinded && (
                      <div className="p-2.5 rounded border border-red-500/80 bg-red-950/60 text-xs text-red-200 flex items-center gap-2">
                        <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />
                        <span>SENSORS BLINDED: Optical and radar instruments offline. Automatic failure on sight/sensor checks.</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded border border-bridge-border bg-black/40">
                        <span className="text-[9px] text-muted-foreground uppercase block">Sensor Resolution</span>
                        <span className="font-bold text-cyan-neon font-mono">
                          {hasScannerRenowned ? "Truesight (1,000 ft)" : hasScannerPremium ? "Blindsight (1,000 ft)" : "Standard Radar"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded border border-bridge-border bg-black/40">
                        <span className="text-[9px] text-muted-foreground uppercase block">Array Operational Mode</span>
                        <span className={`font-bold font-mono ${isBlinded ? "text-red-400" : "text-emerald-400"}`}>
                          {isBlinded ? "BLINDED (LOCKED)" : "ACTIVE DETECTION GRID"}
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Main sensor array sweeps surrounding local space for navigational hazards, active electronic signatures, and hostile vessels.
                    </p>
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

                {/* 3. ACTIVE SCAN WORKSPACE */}
                {cardId === "activeScan" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded border border-cyan-neon/30 bg-black/40">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-cyan-neon uppercase">Active Sensor Sweep</span>
                          {isMasteryScan && scanMasteryBadge && (
                            <span className="rounded bg-cyan-500/20 border border-cyan-400/50 px-1.5 py-0.2 text-[9px] font-mono font-bold text-cyan-300">
                              {scanMasteryBadge}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                          Formula: <strong>d20 + {calculatedScanSkill}</strong> (Wis Mod + Prof{isScout ? " + Scout" : ""})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isBlinded && (
                          <button
                            type="button"
                            onClick={() => setScanState(scanState === "manual" ? "idle" : "manual")}
                            className="rounded px-2.5 py-1 text-[10px] font-bold bg-black/60 text-cyan-neon border border-cyan-neon/40 hover:bg-cyan-neon/10 transition-all cursor-pointer"
                          >
                            {scanState === "manual" ? "Cancel Manual" : "Manual Roll Entry"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleInitiateActiveScan}
                          disabled={isBlinded || activeScan || scanState === "choice" || scanState === "reroll_preview" || scanState === "manual"}
                          className={`rounded px-3 py-1 text-xs font-bold font-mono uppercase tracking-wider transition-all border ${
                            isBlinded
                              ? "bg-red-950/60 border-red-500/60 text-red-400 cursor-not-allowed opacity-60"
                              : "bg-cyan-neon/10 text-cyan-neon border-cyan-neon/40 hover:bg-cyan-neon/20 shadow-[0_0_10px_rgba(0,240,255,0.15)] cursor-pointer"
                          }`}
                        >
                          {isBlinded ? "BLINDED" : activeScan ? "SWEEPING..." : "ROLL SCAN"}
                        </button>
                      </div>
                    </div>

                    {scanState === "manual" && !isBlinded && (
                      <form onSubmit={handleManualScanSubmit} className="rounded border border-cyan-neon/50 bg-cyan-neon/10 p-2.5 text-xs flex items-center gap-2">
                        <input
                          type="number"
                          value={manualScanInput}
                          onChange={(e) => setManualScanInput(e.target.value)}
                          placeholder={`Enter total (Mod: +${calculatedScanSkill})`}
                          className="flex-1 rounded bg-black/80 border border-cyan-neon/40 px-2.5 py-1 text-cyan-neon font-mono text-xs focus:outline-none focus:border-cyan-neon"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={!manualScanInput.trim()}
                          className="rounded bg-cyan-neon/20 border border-cyan-neon/60 px-3 py-1 text-xs font-bold text-cyan-neon hover:bg-cyan-neon/30 cursor-pointer"
                        >
                          Apply
                        </button>
                      </form>
                    )}

                    {scanState === "choice" && !isBlinded && (isMasteryScan || hasScannerRenowned) && (
                      <div className="rounded border border-cyan-neon/50 bg-cyan-neon/10 p-2.5 text-xs flex flex-col gap-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-cyan-neon uppercase">Mastery Review</span>
                          <span className="text-muted-foreground">Die 1: <strong>{scanDice[0]}</strong> | Die 2: <strong>{scanDice[1]}</strong></span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          {isHighMasteryScan && (
                            <button
                              type="button"
                              onClick={handleHighMasteryScanRerollLowest}
                              className="rounded bg-cyan-neon/20 border border-cyan-neon/60 px-2 py-0.5 text-[10px] font-bold text-cyan-neon cursor-pointer"
                            >
                              Reroll Lowest
                            </button>
                          )}
                          {isGrandMasteryScan && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleGrandMasteryScanRerollSpecific(0, "Rerolled Die 1")}
                                className="rounded bg-cyan-neon/20 border border-cyan-neon/60 px-2 py-0.5 text-[10px] font-bold text-cyan-neon cursor-pointer"
                              >
                                Reroll Die 1 ({scanDice[0]})
                              </button>
                              <button
                                type="button"
                                onClick={() => handleGrandMasteryScanRerollSpecific(1, "Rerolled Die 2")}
                                className="rounded bg-cyan-neon/20 border border-cyan-neon/60 px-2 py-0.5 text-[10px] font-bold text-cyan-neon cursor-pointer"
                              >
                                Reroll Die 2 ({scanDice[1]})
                              </button>
                              <button
                                type="button"
                                onClick={handleGrandMasteryScanRerollBoth}
                                className="rounded bg-cyan-neon/20 border border-cyan-neon/60 px-2 py-0.5 text-[10px] font-bold text-cyan-neon cursor-pointer"
                              >
                                Reroll Both
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleKeepCurrentScanDice("Kept Roll")}
                            className="rounded bg-amber-400/20 border border-amber-400/60 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 cursor-pointer"
                          >
                            Keep ({Math.max(scanDice[0], scanDice[1])})
                          </button>
                        </div>
                      </div>
                    )}

                    {scanState === "reroll_preview" && !isBlinded && (
                      <div className="rounded border border-cyan-neon/50 bg-cyan-neon/10 p-2.5 text-xs flex justify-between items-center">
                        <span className="text-[10px] text-cyan-neon font-bold">Rerolled: [{scanDice[0]}, {scanDice[1]}]</span>
                        <button
                          type="button"
                          onClick={handleFinalizeScanReroll}
                          className="rounded bg-cyan-neon/20 border border-cyan-neon/60 px-3 py-1 text-xs font-bold text-cyan-neon cursor-pointer"
                        >
                          Finalize ({Math.max(scanDice[0], scanDice[1])} + {calculatedScanSkill})
                        </button>
                      </div>
                    )}

                    {scanState === "done" && lastRollResult && !isBlinded && (
                      <div className="rounded border border-cyan-neon/30 bg-cyan-neon/5 p-2.5 text-xs flex flex-col gap-1">
                        <div className="flex justify-between items-center font-mono">
                          <span className="text-muted-foreground">Scan Result:</span>
                          <span className="font-bold text-cyan-neon">Total: {lastRollResult.total}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-muted-foreground">Discovered Contacts:</span>
                          <span className="font-bold text-amber-300">{lastRollResult.discoveredCount} contact(s) revealed</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setScanState("idle")}
                          className="text-[9px] text-cyan-neon underline self-end mt-1 cursor-pointer"
                        >
                          Clear Result
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. SENSOR PROBE WORKSPACE */}
                {cardId === "sensorProbe" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded border border-amber-400/30 bg-black/40">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-400 uppercase">Deploy Sensor Probe</span>
                          {isMasteryProbe && probeMasteryBadge && (
                            <span className="rounded bg-amber-500/20 border border-amber-400/50 px-1.5 py-0.2 text-[9px] font-mono font-bold text-amber-300">
                              {probeMasteryBadge}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                          Formula: <strong>d20 + {calculatedProbeSkill}</strong> (Int Mod + Prof{isScout ? " + Scout" : ""})
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleLaunchProbe}
                        disabled={isBlinded || activeProbe || probeState === "choice" || probeState === "reroll_preview"}
                        className={`rounded px-3 py-1 text-xs font-bold font-mono uppercase tracking-wider transition-all border ${
                          isBlinded
                            ? "bg-red-950/60 border-red-500/60 text-red-400 cursor-not-allowed opacity-60"
                            : "bg-amber-400/10 text-amber-400 border border-amber-400/40 hover:bg-amber-400/20 shadow-[0_0_10px_rgba(251,191,36,0.15)] cursor-pointer"
                        }`}
                      >
                        {isBlinded ? "PROBE LOCKED" : activeProbe ? "DEPLOYING..." : "LAUNCH PROBE"}
                      </button>
                    </div>

                    {probeState === "choice" && !isBlinded && (isMasteryProbe || hasScannerRenowned) && (
                      <div className="rounded border border-amber-400/50 bg-amber-400/10 p-2.5 text-xs flex flex-col gap-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-amber-300 uppercase">Probe Mastery Review</span>
                          <span className="text-muted-foreground">Die 1: <strong>{probeDice[0]}</strong> | Die 2: <strong>{probeDice[1]}</strong></span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          {isHighMasteryProbe && (
                            <button
                              type="button"
                              onClick={handleHighMasteryRerollLowest}
                              className="rounded bg-amber-500/20 border border-amber-400/60 px-2 py-0.5 text-[10px] font-bold text-amber-300 cursor-pointer"
                            >
                              Reroll Lowest
                            </button>
                          )}
                          {isGrandMasteryProbe && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleGrandMasteryRerollSpecific(0, "Rerolled Die 1")}
                                className="rounded bg-amber-500/20 border border-amber-400/60 px-2 py-0.5 text-[10px] font-bold text-amber-300 cursor-pointer"
                              >
                                Reroll Die 1 ({probeDice[0]})
                              </button>
                              <button
                                type="button"
                                onClick={() => handleGrandMasteryRerollSpecific(1, "Rerolled Die 2")}
                                className="rounded bg-amber-500/20 border border-amber-400/60 px-2 py-0.5 text-[10px] font-bold text-amber-300 cursor-pointer"
                              >
                                Reroll Die 2 ({probeDice[1]})
                              </button>
                              <button
                                type="button"
                                onClick={handleGrandMasteryRerollBoth}
                                className="rounded bg-amber-500/20 border border-amber-400/60 px-2 py-0.5 text-[10px] font-bold text-amber-300 cursor-pointer"
                              >
                                Reroll Both
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleKeepCurrentDice("Kept Roll")}
                            className="rounded bg-cyan-neon/20 border border-cyan-neon/60 px-2.5 py-0.5 text-[10px] font-bold text-cyan-neon cursor-pointer"
                          >
                            Keep ({Math.max(probeDice[0], probeDice[1])})
                          </button>
                        </div>
                      </div>
                    )}

                    {probeState === "reroll_preview" && !isBlinded && (
                      <div className="rounded border border-amber-400/50 bg-amber-400/10 p-2.5 text-xs flex justify-between items-center">
                        <span className="text-[10px] text-amber-300 font-bold">Rerolled: [{probeDice[0]}, {probeDice[1]}]</span>
                        <button
                          type="button"
                          onClick={handleFinalizeReroll}
                          className="rounded bg-amber-400/20 border border-amber-400/60 px-3 py-1 text-xs font-bold text-amber-300 cursor-pointer"
                        >
                          Finalize ({Math.max(probeDice[0], probeDice[1])} + {calculatedProbeSkill})
                        </button>
                      </div>
                    )}

                    {probeState === "done" && probeFinalResult && !isBlinded && (
                      <div className="rounded border border-amber-400/30 bg-amber-400/5 p-2.5 text-xs flex flex-col gap-1">
                        <div className="flex justify-between items-center font-mono">
                          <span className="text-muted-foreground">Probe Deployment:</span>
                          <span className="font-bold text-amber-400">Total: {probeFinalResult.total}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground/80 italic">
                          Probe active in sector. Awaiting GM feedback.
                        </span>
                        <button
                          type="button"
                          onClick={() => setProbeState("idle")}
                          className="text-[9px] text-amber-400 underline self-end mt-1 cursor-pointer"
                        >
                          Clear Result
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. CONTACTS WORKSPACE */}
                {cardId === "contacts" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center border-b border-bridge-border/40 pb-1.5">
                      <span className="text-xs text-muted-foreground">Revealed Sector Contacts</span>
                      <span className="text-[10px] font-mono text-cyan-neon font-bold">
                        {contacts.filter(c => c.isRevealed).length} / {contacts.length} Discovered
                      </span>
                    </div>

                    {isBlinded ? (
                      <div className="p-4 rounded border border-dashed border-red-500/40 text-center text-xs text-red-300">
                        Tactical radar scrambled. Clear Blinded condition from Defense console.
                      </div>
                    ) : contacts.filter(c => c.isRevealed).length === 0 ? (
                      <div className="p-4 rounded border border-dashed border-bridge-border/40 text-center text-xs text-muted-foreground">
                        No active sector contacts discovered. Run an Active Scan or deploy a Probe.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                        {contacts.filter(c => c.isRevealed).map((contact) => (
                          <div key={contact.id} className="p-2.5 rounded border border-cyan-neon/40 bg-black/40 flex justify-between items-center gap-2">
                            <div>
                              <span className="text-xs font-bold text-cyan-neon font-mono block">{contact.name}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                Type: <strong className="text-amber-300">{contact.classification}</strong> • Range: <strong className="text-amber-300">{contact.distance}</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-cyan-neon/10 border border-cyan-neon/30 px-1.5 py-0.2 text-[9px] font-mono font-bold text-cyan-neon">
                                DC {contact.scanDc}
                              </span>
                              {onRemoveContact && (
                                <button
                                  type="button"
                                  onClick={() => setClearingContactId(contact.id)}
                                  className="p-1 rounded bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 cursor-pointer"
                                  title="Clear contact"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {clearingContactId && (
                      <div className="rounded bg-red-950/40 border border-red-500/50 p-2.5 flex items-center justify-between gap-2 text-xs">
                        <span className="text-red-200">Remove contact from sensors?</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setClearingContactId(null)}
                            className="px-2 py-0.5 rounded bg-black/60 border border-bridge-border text-slate-300 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onRemoveContact?.(clearingContactId)
                              setClearingContactId(null)
                            }}
                            className="px-2.5 py-0.5 rounded bg-red-600 border border-red-500 text-white font-bold cursor-pointer"
                          >
                            Confirm
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. TACTICAL MODULES WORKSPACE */}
                {cardId === "tacticalModules" && (
                  <div className="flex flex-col gap-3">
                    {(hasFlarePods || hasBuzzDroids || hasSensorDampener || hasShieldDisruptor || hasThreatTracker || hasStealthDevice) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {hasFlarePods && (
                          <div className="p-2.5 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-1.5">
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="font-bold text-amber-300 uppercase">Flare Pods</span>
                                <span className="text-[8px] font-mono px-1 py-0.2 rounded border bg-amber-950/40 text-amber-300 border-amber-500/40 font-bold">
                                  {tierUses - (currentEcmUses.flares ?? 0)}/{tierUses}
                                </span>
                              </div>
                              <p className="text-[9px] text-muted-foreground leading-relaxed">
                                Reaction: Grant advantage on Dexterity saving throw. Recharges on maintenance refit.
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={(currentEcmUses.flares ?? 0) >= tierUses}
                              onClick={handleTriggerFlares}
                              className={`w-full py-1 rounded text-[9px] font-bold uppercase border cursor-pointer ${
                                (currentEcmUses.flares ?? 0) >= tierUses ? "bg-slate-800 border-slate-700 text-slate-500" : "bg-amber-500/20 border-amber-400 text-amber-300 hover:bg-amber-500/30"
                              }`}
                            >
                              Fire Flares
                            </button>
                          </div>
                        )}

                        {hasBuzzDroids && (
                          <div className="p-2.5 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-1.5">
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="font-bold text-rose-400 uppercase">Buzz Droids</span>
                                <span className="text-[8px] font-mono px-1 py-0.2 rounded border bg-rose-950/40 text-rose-300 border-rose-500/40 font-bold">
                                  {tierUses - (currentEcmUses.buzzDroids ?? 0)}/{tierUses}
                                </span>
                              </div>
                              <p className="text-[9px] text-muted-foreground leading-relaxed">
                                200-ft sphere (1500 ft): 2d4 hull kinetic damage per 50 ft. Recharges on maintenance refit.
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={(currentEcmUses.buzzDroids ?? 0) >= tierUses}
                              onClick={handleDeployBuzzDroids}
                              className={`w-full py-1 rounded text-[9px] font-bold uppercase border cursor-pointer ${
                                (currentEcmUses.buzzDroids ?? 0) >= tierUses ? "bg-slate-800 border-slate-700 text-slate-500" : "bg-rose-500/20 border-rose-400 text-rose-300 hover:bg-rose-500/30"
                              }`}
                            >
                              Deploy Cloud
                            </button>
                          </div>
                        )}

                        {hasSensorDampener && (
                          <div className="p-2.5 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-1.5">
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="font-bold text-cyan-neon uppercase">Sensor Dampener</span>
                                <span className="text-[8px] font-mono px-1 py-0.2 rounded border bg-cyan-950/40 text-cyan-300 border-cyan-500/40 font-bold">
                                  {tierUses - (currentEcmUses.dampener ?? 0)}/{tierUses}
                                </span>
                              </div>
                              <p className="text-[9px] text-muted-foreground leading-relaxed">
                                DC {8 + interfereBonus} Wis save: Target blinded 1 min. Recharges on maintenance refit.
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={(currentEcmUses.dampener ?? 0) >= tierUses}
                              onClick={handleTriggerSensorDampener}
                              className={`w-full py-1 rounded text-[9px] font-bold uppercase border cursor-pointer ${
                                (currentEcmUses.dampener ?? 0) >= tierUses ? "bg-slate-800 border-slate-700 text-slate-500" : "bg-cyan-500/20 border-cyan-neon text-cyan-neon hover:bg-cyan-500/30"
                              }`}
                            >
                              Engage Dampener
                            </button>
                          </div>
                        )}

                        {hasShieldDisruptor && (
                          <div className="p-2.5 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-1.5">
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="font-bold text-cyan-300 uppercase">Shield Disruptor</span>
                                <span className="text-[8px] font-mono px-1 py-0.2 rounded border bg-cyan-950/40 text-cyan-300 border-cyan-500/40 font-bold">
                                  {tierUses - (currentEcmUses.disruptor ?? 0)}/{tierUses}
                                </span>
                              </div>
                              <p className="text-[9px] text-muted-foreground leading-relaxed">
                                Contested Interfere vs Regulate: Halve target shield cap/regen 1 min. Recharges on maintenance refit.
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={(currentEcmUses.disruptor ?? 0) >= tierUses}
                              onClick={handleTriggerShieldDisruptor}
                              className={`w-full py-1 rounded text-[9px] font-bold uppercase border cursor-pointer ${
                                (currentEcmUses.disruptor ?? 0) >= tierUses ? "bg-slate-800 border-slate-700 text-slate-500" : "bg-cyan-500/20 border-cyan-neon text-cyan-neon hover:bg-cyan-500/30"
                              }`}
                            >
                              Trigger Disruptor
                            </button>
                          </div>
                        )}

                        {hasThreatTracker && (
                          <div className="p-2.5 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-1.5">
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="font-bold text-slate-100 uppercase">Threat Tracker</span>
                                <span className="text-[8px] font-mono px-1 py-0.2 rounded border bg-black/60 text-slate-300 border-bridge-border font-bold">
                                  {Math.max(1, wisMod) - (currentEcmUses.threatTracker ?? 0)}/{Math.max(1, wisMod)}
                                </span>
                              </div>
                              <p className="text-[9px] text-muted-foreground leading-relaxed">
                                Reaction: Substitute Wisdom saving throw for Dexterity saving throw.
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={(currentEcmUses.threatTracker ?? 0) >= Math.max(1, wisMod)}
                              onClick={handleTriggerThreatTracker}
                              className={`w-full py-1 rounded text-[9px] font-bold uppercase border cursor-pointer ${
                                (currentEcmUses.threatTracker ?? 0) >= Math.max(1, wisMod) ? "bg-slate-800 border-slate-700 text-slate-500" : "bg-cyan-500/20 border-cyan-neon text-cyan-neon hover:bg-cyan-500/30"
                              }`}
                            >
                              Swap to Wisdom Save
                            </button>
                          </div>
                        )}

                        {(hasStealthDevice || hasActiveCamouflage || hasCloakingDevice) && (
                          <div className="p-2.5 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-1.5">
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="font-bold text-purple-300 uppercase">
                                  {hasCloakingDevice ? "Cloaking Device" : hasActiveCamouflage ? "Active Camo" : "Stealth Device"}
                                </span>
                                <span className={`text-[8px] font-mono px-1 py-0.2 rounded border font-bold uppercase ${
                                  stealthActive ? "bg-purple-500/30 text-purple-200 border-purple-400 animate-pulse" : "bg-black/60 text-slate-400 border-bridge-border"
                                }`}>
                                  {stealthActive ? "CLOAKED" : "OFFLINE"}
                                </span>
                              </div>
                              <p className="text-[9px] text-muted-foreground leading-relaxed">
                                Toggle stealth signature. Advantage on Hide checks against scanners.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleToggleStealth}
                              className={`w-full py-1 rounded text-[9px] font-bold uppercase border cursor-pointer ${
                                stealthActive
                                  ? "bg-purple-600/30 border-purple-400 text-purple-200 shadow-[0_0_8px_rgba(192,132,252,0.4)]"
                                  : "bg-purple-950/40 border-purple-500/40 text-purple-300 hover:bg-purple-500/20"
                              }`}
                            >
                              {stealthActive ? "Disengage Stealth" : "Engage Stealth Grid"}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded border border-dashed border-bridge-border/60 text-center text-xs text-muted-foreground">
                        No tactical sensor countermeasures installed.
                      </div>
                    )}

                    {tacticalFeedback && (
                      <div className="p-2 rounded bg-black/60 border border-bridge-border text-xs text-cyan-neon font-mono">
                        {tacticalFeedback}
                      </div>
                    )}
                  </div>
                )}

                {/* 7. HARDWARE MODS WORKSPACE */}
                {cardId === "mods" && (
                  <div className="flex flex-col gap-2">
                    <StationModifications 
                      station="Sensors" 
                      installedMods={installedMods} 
                      onRemoveMod={onRemoveMod} 
                    />
                  </div>
                )}

                {/* 8. SHIP ABILITY SCORES & STATISTICS WORKSPACE */}
                {cardId === "ship_stats" && (
                  <div className="flex flex-col gap-3">
                    <ShipStats shipConfig={shipConfig} proficiencyBonus={proficiencyBonus} systemDamageLevel={systemDamageLevel} />
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