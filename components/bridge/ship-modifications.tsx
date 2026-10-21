"use client"

import { useState } from "react"
import { Panel } from "./panel"
import { type ShipConfig } from "./ship-setup"
import { SHIP_SIZE_RULES, SHIP_TYPE_RULES, ShipSize } from "@/lib/ship-rules"
import { STARSHIP_WEAPONS, getWeaponsBySize } from "@/lib/starship-weapons"
import { starshipModifications } from "@/lib/starship-modifications"

export type AbilityScoreName =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "wisdom"
  | "charisma"

export type ModificationCategory = 
  | "Operation system"
  | "Universal system"
  | "Weapon System"
  | "Engineering System"
  | "Weapon Modification"
  | "Suite system"

export type StationName = 
  | "Weapons"
  | "Engines"
  | "Defense"
  | "Navcomputer"
  | "Sensors"
  | "Engineering"
  | "Communications"
  | "Cargo"

export type MountLocation = "Bow" | "Stern" | "Port" | "Starboard" | "Ventral" | "Basal" | "Dorsal"

const ALL_LOCATIONS: MountLocation[] = ["Bow", "Stern", "Port", "Starboard", "Ventral", "Basal", "Dorsal"]

const ALL_ABILITY_SCORES: { key: AbilityScoreName; label: string }[] = [
  { key: "strength", label: "Strength (-1)" },
  { key: "dexterity", label: "Dexterity (-1)" },
  { key: "constitution", label: "Constitution (-1)" },
  { key: "intelligence", label: "Intelligence (-1)" },
  { key: "wisdom", label: "Wisdom (-1)" },
  { key: "charisma", label: "Charisma (-1)" },
]

export interface Modification {
  id: string
  instanceId?: string
  mountedOnInstanceId?: string
  name: string
  station: StationName
  category: ModificationCategory
  cost: number
  description: string
  location?: MountLocation
  selectableLocations?: MountLocation[]
  prerequisite?: string
  damage?: string | null
  damageType?: string | null
  range?: string | null
  isOrdnanceLauncher?: boolean
  overheat?: number
  rapid?: number
  burst?: number
  reload?: number
  properties?: string[]
  requiresTargetWeapon?: boolean
  targetWeaponInstanceId?: string
  penaltyStat?: AbilityScoreName
}

export interface SuiteOption {
  id: string
  name: string
  description: string
  baseCost: number
}

export interface InstalledSuite {
  id: string
  name: string
  description: string
  cost: number
  slotsUsed?: number
}

// Dynamically extract and normalize all suites from the starshipModifications source file
export const DYNAMIC_SUITE_OPTIONS: SuiteOption[] = starshipModifications
  .filter((sm) => {
    const sys = (sm.system || "").trim().toLowerCase()
    const typ = (sm.type || "").trim().toLowerCase()
    const nm = (sm.name || "").trim().toLowerCase()
    return sys === "suite" || typ === "suite system" || nm.includes("suite")
  })
  .map((sm) => ({
    id: `suite-${sm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: sm.name.toUpperCase(),
    description: sm.description,
    baseCost: sm.baseCost || 10000,
  }))

// Only retain custom structural mount points for weapons
export const BASE_SYSTEM_MODIFICATIONS: Modification[] = [
  { 
    id: "mod-fixed-hardpoint", 
    name: "Fixed Hardpoint", 
    station: "Weapons", 
    category: "Weapon Modification", 
    cost: 3000, 
    description: "Provides a rigid structural mount point on the hull for mounting weapons.", 
    selectableLocations: ALL_LOCATIONS 
  },
  { 
    id: "mod-turret-hardpoint", 
    name: "Turret Hardpoint", 
    station: "Weapons", 
    category: "Weapon Modification", 
    cost: 3000, 
    description: "Modifies a Fixed Hardpoint to grant a 360-degree rotational tracking arc.", 
    prerequisite: "Fixed Hardpoint" 
  }
]

export const MASTER_MODIFICATIONS = BASE_SYSTEM_MODIFICATIONS

const STATIONS: StationName[] = [
  "Weapons", "Engines", "Defense", "Navcomputer", "Sensors", "Engineering", "Communications", "Cargo"
]

const getCostMultiplier = (size: ShipSize): number => {
  switch (size) {
    case "tiny": return 0.5
    case "small": return 1
    case "medium": return 2
    case "large": return 5
    case "huge": return 50
    case "gargantuan": return 500
    default: return 1
  }
}

interface ShipModificationsProps {
  installedMods?: Modification[]
  installedSuites?: InstalledSuite[]
  maxMods?: number
  onInstallMod: (mod: Modification) => boolean
  onRemoveMod: (instanceId: string) => void
  onUpdateSuites?: (suites: InstalledSuite[]) => void
  shipConfig?: ShipConfig
}

export function ShipModifications({
  installedMods = [],
  installedSuites: externalInstalledSuites,
  maxMods = 30,
  onInstallMod,
  onRemoveMod,
  onUpdateSuites,
  shipConfig,
}: ShipModificationsProps) {
  const [selectedStation, setSelectedStation] = useState<StationName>("Weapons")
  const [selectedModId, setSelectedModId] = useState<string>("")
  const [selectedLocation, setSelectedLocation] = useState<MountLocation | "">("")
  const [selectedSlotInstanceId, setSelectedSlotInstanceId] = useState<string>("")
  const [selectedTargetWeaponInstanceId, setSelectedTargetWeaponInstanceId] = useState<string>("")
  const [selectedPenaltyStat, setSelectedPenaltyStat] = useState<AbilityScoreName | "">("")

  const sizeKey = (shipConfig?.size?.toLowerCase() ?? "small") as ShipSize
  const costMultiplier = getCostMultiplier(sizeKey)
  
  // Available suites using starshipModifications data scaled to hull size
  const availableSuites: SuiteOption[] = DYNAMIC_SUITE_OPTIONS.length > 0 
    ? DYNAMIC_SUITE_OPTIONS.map((s) => ({ ...s, baseCost: s.baseCost * costMultiplier }))
    : [
        {
          id: "suite-standard",
          name: "GENERAL AUXILIARY SUITE",
          description: "Auxiliary compartment outfitted for crew quarters, storage, or operational support.",
          baseCost: 10000 * costMultiplier,
        }
      ]

  const [selectedSuiteId, setSelectedSuiteId] = useState<string>(availableSuites[0]?.id ?? "")

  const sizeRules = SHIP_SIZE_RULES[sizeKey] || SHIP_SIZE_RULES.small
  const roleRules = shipConfig?.shipType ? SHIP_TYPE_RULES[shipConfig.shipType] : null

  const rawCon = shipConfig?.stats?.constitution ?? 10
  const tierConBoost = shipConfig?.tierStatBoosts?.constitution ?? 0
  const chassisConMod = sizeRules.constitutionMod || 0
  const roleConMod = roleRules?.constitutionMod || 0
  const effectiveCon = rawCon + tierConBoost + chassisConMod + roleConMod
  const conMod = Math.floor((effectiveCon - 10) / 2)

  const computeBaseSuiteCapacity = (size: ShipSize, conModifier: number): number => {
    switch (size) {
      case "tiny":
      case "small":
        return -1 + conModifier
      case "medium":
        return 3 + conModifier
      case "large":
        return 3 + (2 * conModifier)
      case "huge":
        return 6 + (3 * conModifier)
      case "gargantuan":
        return 10 + (4 * conModifier)
      default:
        return 3 + conModifier
    }
  }

  let rawCalculatedCap = Math.max(1, computeBaseSuiteCapacity(sizeKey, conMod))
  const isShuttleSpec = shipConfig?.roleSpecialization === "Shuttle"
  const isShuttleMastery = shipConfig?.roleMastery === "Shuttle"

  if (isShuttleMastery) {
    rawCalculatedCap = Math.max(2, rawCalculatedCap)
  }

  const extraSuiteCapacity = shipConfig?.extraSuiteCapacity ?? (isShuttleSpec ? 1 : 0)
  const maxSuites = rawCalculatedCap + extraSuiteCapacity

  const [internalSuites, setInternalSuites] = useState<InstalledSuite[]>([])
  const installedSuites = externalInstalledSuites ?? internalSuites

  const currentSlotsUsed = installedSuites.reduce((sum, s) => sum + (s.slotsUsed || 1), 0)
  const freeClaimsCount = installedSuites.filter((s) => s.cost === 0).length
  const maxFreeClaims = isShuttleMastery ? 2 : isShuttleSpec ? 1 : 0
  const canClaimFreeSuite = freeClaimsCount < maxFreeClaims

  const handleInstallSuite = (isFreeClaim: boolean = false) => {
    const slotsNeeded = isFreeClaim && isShuttleMastery && freeClaimsCount >= 1 ? 2 : 1
    if (currentSlotsUsed + slotsNeeded > maxSuites) return

    const suiteTemplate = availableSuites.find((s) => s.id === selectedSuiteId) || availableSuites[0]
    if (!suiteTemplate) return

    const newSuite: InstalledSuite = {
      id: crypto.randomUUID(),
      name: suiteTemplate.name,
      description: suiteTemplate.description,
      cost: isFreeClaim ? 0 : suiteTemplate.baseCost,
      slotsUsed: slotsNeeded,
    }

    const updated = [...installedSuites, newSuite]
    if (onUpdateSuites) onUpdateSuites(updated)
    else setInternalSuites(updated)
  }

  const handleRemoveSuite = (id: string) => {
    const updated = installedSuites.filter((s) => s.id !== id)
    if (onUpdateSuites) onUpdateSuites(updated)
    else setInternalSuites(updated)
  }

  const totalInstalled = installedMods.length
  const isAtCapacity = totalInstalled >= maxMods

  // Physical hardpoint slots for mounting weapons
  const getOpenMountSlots = (prerequisiteName: string) =>
    installedMods.filter(
      (m) =>
        (m.name === prerequisiteName || (prerequisiteName === "Fixed Hardpoint" && m.name === "Turret Hardpoint")) &&
        !installedMods.some((other) => other.mountedOnInstanceId === m.instanceId)
    )
  
  // Base hardpoints scale with size multiplier
  const scaledBaseMods = BASE_SYSTEM_MODIFICATIONS.map((bm) => ({
    ...bm,
    cost: bm.cost * costMultiplier,
  }))

  const mappedCSVMods: Modification[] = starshipModifications
    .filter((sm) => {
      const cleanSystem = (sm.system || "").trim().toLowerCase()
      const cleanType = (sm.type || "").trim().toLowerCase()
      const cleanName = (sm.name || "").trim().toLowerCase()

      // Exclude suite modules (governed exclusively in Suites Bay)
      if (cleanSystem === "suite" || cleanType === "suite system" || cleanName.includes("suite")) {
        return false
      }

      // Strip all hardpoints from the CSV/dataset to ensure only scaledBaseMods provides them
      if (cleanName.includes("hardpoint")) {
        return false
      }

      // Strip Droid Brains and Remote Overrides (Filtered per bridge guidelines)
      if (cleanName.includes("droid brain") || cleanName.includes("remote override")) {
        return false
      }

      return true
    })
    .map((sm) => {
      let stationMap: StationName = "Engineering"
      
      const cleanType = (sm.type || "").trim().toLowerCase()
      const cleanSystem = (sm.system || "").trim()

      if (
        cleanType === "weapon system" || 
        cleanType === "weapon modification" || 
        cleanSystem.toLowerCase() === "weapons"
      ) {
        stationMap = "Weapons"
      } else if (STATIONS.includes(cleanSystem as StationName)) {
        stationMap = cleanSystem as StationName
      }

      return {
        id: `mod-${sm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name: sm.name,
        station: stationMap,
        category: sm.type as ModificationCategory,
        cost: sm.baseCost * costMultiplier,
        description: sm.description,
        prerequisite: sm.prerequisite && sm.prerequisite !== "None" ? sm.prerequisite : undefined,
        requiresTargetWeapon: sm.requiresTargetWeapon,
      }
    })

  const applicableWeapons = getWeaponsBySize(sizeKey)
  const weaponModifications: Modification[] = applicableWeapons.map((w) => ({
    id: `weapon-${w.id}`,
    name: w.name,
    station: "Weapons",
    category: "Weapon System",
    cost: w.cost,
    description: `${w.slotType}: ${w.damage ? `${w.damage}${w.damageType}` : "Ordnance Launcher"}${w.range ? `, Range ${w.range} ft` : ""}. ${w.properties.join(", ")}`,
    prerequisite: "Fixed Hardpoint",
    damage: w.damage,
    damageType: w.damageType,
    range: w.range,
    isOrdnanceLauncher: w.isOrdnanceLauncher,
    overheat: w.overheat,
    rapid: w.rapid,
    burst: w.burst,
    reload: w.reload,
    properties: w.properties,
  }))

  // Deduplicate against scaled base hardpoints
  const baseModIds = new Set(scaledBaseMods.map((m) => m.id))
  const filteredCSVMods = mappedCSVMods.filter((m) => !baseModIds.has(m.id))

  const allAvailableMods: Modification[] = [
    ...scaledBaseMods,
    ...filteredCSVMods,
    ...weaponModifications,
  ]

  const selectedMod = allAvailableMods.find((m) => m.id === selectedModId)
  
  // Check if prerequisite is a physical mount slot or a prior system prerequisite
  const isPhysicalMountPrerequisite = selectedMod?.prerequisite === "Fixed Hardpoint" || selectedMod?.prerequisite === "Turret Hardpoint" || selectedMod?.prerequisite === "Hardpoint"
  const openMountSlots = isPhysicalMountPrerequisite && selectedMod?.prerequisite ? getOpenMountSlots(selectedMod.prerequisite) : []
  
  const installedWeapons = installedMods.filter(
    (m) => m.category === "Weapon System" && (m.damage || m.isOrdnanceLauncher)
  )

  // Identify if selected mod is a Makeshift system requiring DM stat decrement
  const isMakeshiftCoreSystem = 
    !!selectedMod && 
    (selectedMod.name.toUpperCase().endsWith("MAKESHIFT") || selectedMod.name.toUpperCase().includes("MAKESHIFT")) &&
    (selectedMod.name.toUpperCase().includes("REACTOR") ||
     selectedMod.name.toUpperCase().includes("THRUSTERS") ||
     selectedMod.name.toUpperCase().includes("FRAME") ||
     selectedMod.name.toUpperCase().includes("DATA CORE") ||
     selectedMod.name.toUpperCase().includes("SENSOR ARRAY") ||
     selectedMod.name.toUpperCase().includes("TRANSMITTERS"))

  const getMakeshiftPrimaryStat = (modName: string): AbilityScoreName | null => {
    const nm = modName.toUpperCase()
    if (nm.includes("REACTOR")) return "strength"
    if (nm.includes("THRUSTERS")) return "dexterity"
    if (nm.includes("FRAME")) return "constitution"
    if (nm.includes("DATA CORE")) return "intelligence"
    if (nm.includes("SENSOR ARRAY")) return "wisdom"
    if (nm.includes("TRANSMITTERS")) return "charisma"
    return null
  }
  const primaryBoostStat = selectedMod ? getMakeshiftPrimaryStat(selectedMod.name) : null
  const availablePenaltyStats = ALL_ABILITY_SCORES.filter((s) => s.key !== primaryBoostStat)

  // Filter compatible weapons for modifications with damage type or slot constraints
  const getCompatibleWeapons = (mod: Modification | undefined) => {
    if (!mod) return []
    const cleanModName = mod.name.toUpperCase()

    return installedWeapons.filter((w) => {
      const dmgType = (w.damageType || "").toLowerCase()
      const desc = (w.description || "").toLowerCase()

      if (cleanModName === "BLINDING ROUNDS") {
        return dmgType.includes("fire") || desc.includes("fire")
      }
      if (cleanModName === "IONIZING ROUNDS") {
        return dmgType.includes("energy") || desc.includes("energy")
      }
      if (cleanModName === "SHOCKING ROUNDS") {
        return dmgType.includes("kinetic") || desc.includes("kinetic")
      }
      if (cleanModName === "STUNNING ROUNDS") {
        return dmgType.includes("ion") || desc.includes("ion")
      }
      if (cleanModName === "EXPANDED PAYLOAD" || cleanModName === "EXPLOSIVE PAYLOAD") {
        return w.isOrdnanceLauncher || desc.includes("tertiary") || desc.includes("quaternary")
      }
      return true
    })
  }

  const compatibleWeapons = getCompatibleWeapons(selectedMod)

  // System validation check helper
  const meetsSystemPrerequisite = (mod: Modification): boolean => {
    if (!mod.prerequisite) return true

    // Hardpoint physical mounting
    if (mod.prerequisite === "Fixed Hardpoint" || mod.prerequisite === "Turret Hardpoint" || mod.prerequisite === "Hardpoint") {
      return getOpenMountSlots("Fixed Hardpoint").length > 0
    }

    // Size checks
    const pLower = mod.prerequisite.toLowerCase()
    if (pLower.includes("size large or larger")) {
      return ["large", "huge", "gargantuan"].includes(sizeKey)
    }
    if (pLower.includes("size medium or larger")) {
      return ["medium", "large", "huge", "gargantuan"].includes(sizeKey)
    }
    if (pLower.includes("size small or smaller")) {
      return ["tiny", "small"].includes(sizeKey)
    }
    if (pLower.includes("size medium or smaller")) {
      return ["tiny", "small", "medium"].includes(sizeKey)
    }

    // Other upgrades (requires matching prior version installed)
    const reqNormalized = mod.prerequisite.trim().toLowerCase()
    return installedMods.some((im) => im.name.trim().toLowerCase() === reqNormalized)
  }

  const availableToAdd = allAvailableMods.filter((m) => {
    const isHardpoint = m.name.toLowerCase().includes("hardpoint")
    const isWeaponRelated = 
      isHardpoint || 
      m.category === "Weapon System" || 
      m.category === "Weapon Modification" || 
      m.station === "Weapons"

    // Absolute isolation: non-Weapons stations can NEVER display hardpoints or weapon systems/mods
    if (selectedStation !== "Weapons" && isWeaponRelated) {
      return false
    }

    // Must match the currently selected station tab
    if (m.station !== selectedStation) {
      return false
    }

    return meetsSystemPrerequisite(m)
  })

  const needsLocationChoice = !!selectedMod?.selectableLocations
  const needsSlotChoice = isPhysicalMountPrerequisite && openMountSlots.length > 1
  const needsTargetWeaponChoice = !!selectedMod?.requiresTargetWeapon
  const needsPenaltyStatChoice = isMakeshiftCoreSystem

  const canInstall =
    !!selectedMod &&
    !isAtCapacity &&
    (!needsLocationChoice || !!selectedLocation) &&
    (!needsSlotChoice || !!selectedSlotInstanceId) &&
    (!needsTargetWeaponChoice || (!!selectedTargetWeaponInstanceId && compatibleWeapons.some(w => w.instanceId === selectedTargetWeaponInstanceId))) &&
    (!needsPenaltyStatChoice || !!selectedPenaltyStat) &&
    meetsSystemPrerequisite(selectedMod)

  const resetSelections = () => {
    setSelectedModId("")
    setSelectedLocation("")
    setSelectedSlotInstanceId("")
    setSelectedTargetWeaponInstanceId("")
    setSelectedPenaltyStat("")
  }

  const handleAddModification = () => {
    if (!selectedMod || !canInstall) return

    let mountedOnInstanceId: string | undefined
    let location: MountLocation | undefined = selectedMod.location

    if (isPhysicalMountPrerequisite) {
      const targetSlot = openMountSlots.length === 1 ? openMountSlots[0] : openMountSlots.find((s) => s.instanceId === selectedSlotInstanceId)
      if (!targetSlot) return
      mountedOnInstanceId = targetSlot.instanceId
      location = targetSlot.location
    } else if (needsLocationChoice) {
      location = selectedLocation as MountLocation
    }

    const newInstance: Modification = {
      ...selectedMod,
      instanceId: crypto.randomUUID(),
      mountedOnInstanceId,
      location,
      targetWeaponInstanceId: needsTargetWeaponChoice ? selectedTargetWeaponInstanceId : undefined,
      penaltyStat: needsPenaltyStatChoice ? (selectedPenaltyStat as AbilityScoreName) : undefined
    }

    if (onInstallMod(newInstance)) {
      resetSelections()
    }
  }

  const activeSuiteTemplate = availableSuites.find((s) => s.id === selectedSuiteId) || availableSuites[0]

  return (
    <Panel title="Ship Modifications Registry" code="MOD-REGISTRY" accent="cyan">
      <div className="flex flex-col gap-6">
        {/* VESSEL SUITES BAY SECTION */}
        <div className="rounded-md border border-bridge-border bg-black/40 p-4 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-bridge-border/50 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase">
                  Vessel Suites Bay ({currentSlotsUsed} / {maxSuites} Capacity Used)
                </h3>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60 text-cyan-300">
                  Capacity Floor: {rawCalculatedCap} (Con {conMod >= 0 ? `+${conMod}` : conMod})
                </span>
              </div>
              {isShuttleMastery && (
                <span className="text-[10px] text-cyan-300 font-mono block mt-0.5">
                  ★ Shuttle Role Mastery: Capacity floor is at least 2. Free suite counts as 2 slots.
                </span>
              )}
            </div>
            <span className="text-xs font-mono text-cyan-neon font-bold">
              {installedSuites.reduce((sum, s) => sum + s.cost, 0).toLocaleString()} CR Total Value
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedSuiteId}
              onChange={(e) => setSelectedSuiteId(e.target.value)}
              className="flex-1 bg-slate-900 border border-bridge-border text-xs text-cyan-neon font-mono rounded px-3 py-1.5 focus:outline-none"
            >
              {availableSuites.map((suite) => (
                <option key={suite.id} value={suite.id}>
                  {suite.name} ({suite.baseCost.toLocaleString()} CR)
                </option>
              ))}
            </select>
            
            <button
              onClick={() => handleInstallSuite(false)}
              disabled={currentSlotsUsed >= maxSuites}
              className="rounded bg-cyan-neon/20 border border-cyan-neon/50 px-4 py-1.5 text-xs font-bold text-cyan-neon hover:bg-cyan-neon/30 disabled:opacity-30 transition-all cursor-pointer"
            >
              INSTALL SUITE (1 SLOT)
            </button>

            {canClaimFreeSuite && (
              <button
                onClick={() => handleInstallSuite(true)}
                disabled={currentSlotsUsed >= maxSuites}
                className="rounded bg-amber-500/20 border border-amber-400/60 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 disabled:opacity-30 transition-all cursor-pointer animate-pulse"
              >
                CLAIM FREE SUITE (0 CR)
              </button>
            )}
          </div>

          {activeSuiteTemplate && (
            <div className="rounded bg-slate-950/70 border border-bridge-border/40 p-2.5">
              <span className="text-[10px] font-bold text-cyan-300 font-mono uppercase block mb-0.5">
                {activeSuiteTemplate.name} Specifications:
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                {activeSuiteTemplate.description}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {installedSuites.length > 0 ? (
              installedSuites.map((suite) => (
                <div key={suite.id} className="flex flex-col justify-between p-2.5 rounded border border-bridge-border/60 bg-bridge-panel/40 text-xs gap-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-200">{suite.name}</span>
                      <button
                        onClick={() => handleRemoveSuite(suite.id)}
                        className="text-[9px] font-mono text-red-400 hover:text-red-300 uppercase tracking-wider cursor-pointer"
                      >
                        [REMOVE]
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-relaxed mb-1">{suite.description}</p>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground">
                    <span>{suite.cost === 0 ? "FREE (SHUTTLE)" : `${suite.cost.toLocaleString()} CR`}</span>
                    <span>{suite.slotsUsed === 2 ? "2 SLOTS" : "1 SLOT"}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-2 text-center text-[10px] text-muted-foreground/60 italic">
                No auxiliary suites installed. Select a module above to equip your vessel.
              </div>
            )}
          </div>
        </div>

        {/* MODIFICATIONS REGISTRY SECTION */}
        <div className="rounded-md border border-bridge-border bg-black/40 p-4 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-bridge-border/50 pb-3">
            <span className="text-[11px] text-muted-foreground uppercase tracking-widest">
              Total Installed Capacity
            </span>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className={isAtCapacity ? "text-amber-400 font-bold" : "text-cyan-neon font-bold"}>
                {totalInstalled} / {maxMods}
              </span>
              <span className="text-[9px] text-muted-foreground">Slots Used</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-1">
                Target Station
              </label>
              <select
                value={selectedStation}
                onChange={(e) => {
                  setSelectedStation(e.target.value as StationName)
                  resetSelections()
                }}
                className="w-full bg-slate-900 border border-bridge-border rounded px-3 py-1.5 text-xs text-cyan-neon font-mono"
              >
                {STATIONS.map((station) => (
                  <option key={station} value={station}>{station.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="flex-[2] w-full">
              <label className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-1">
                Available Systems &amp; Weapons (Filtered)
              </label>
              <select
                value={selectedModId}
                onChange={(e) => {
                  setSelectedModId(e.target.value)
                  setSelectedLocation("")
                  setSelectedSlotInstanceId("")
                  setSelectedTargetWeaponInstanceId("")
                  setSelectedPenaltyStat("")
                }}
                className="w-full bg-slate-900 border border-bridge-border rounded px-3 py-1.5 text-xs text-cyan-neon font-mono"
              >
                <option value="">-- Select Item to Install --</option>
                {availableToAdd.map((mod) => (
                  <option key={mod.id} value={mod.id}>
                    {mod.name} [{mod.category}] - {mod.cost.toLocaleString()} cr
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleAddModification}
              disabled={!canInstall}
              className="w-full md:w-auto rounded bg-cyan-neon/20 border border-cyan-neon/50 px-4 py-1.5 text-xs font-bold text-cyan-neon hover:bg-cyan-neon/30 disabled:opacity-30 transition-all cursor-pointer"
            >
              INSTALL
            </button>
          </div>

          {/* ACTIVE PREVIEW CARD FOR SELECTED MODIFICATION */}
          {selectedMod && (
            <div className="rounded border border-cyan-neon/40 bg-slate-950/80 p-3 flex flex-col gap-2 font-mono text-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-bridge-border/60 pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-cyan-neon uppercase text-sm">{selectedMod.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold uppercase">
                    {selectedMod.category}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-200">
                  {selectedMod.cost.toLocaleString()} CR
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                {selectedMod.description}
              </p>

              {/* Weapon Stats Preview Grid if Weapon System */}
              {(selectedMod.damage || selectedMod.isOrdnanceLauncher || selectedMod.range) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-bridge-border/40 text-[10px]">
                  {selectedMod.damage && (
                    <div className="bg-black/50 p-1.5 rounded border border-bridge-border/40">
                      <span className="text-muted-foreground uppercase block text-[8px]">Damage</span>
                      <strong className="text-amber-300">{selectedMod.damage} {selectedMod.damageType || "Energy"}</strong>
                    </div>
                  )}
                  {selectedMod.range && (
                    <div className="bg-black/50 p-1.5 rounded border border-bridge-border/40">
                      <span className="text-muted-foreground uppercase block text-[8px]">Range</span>
                      <strong className="text-cyan-neon">{selectedMod.range} ft</strong>
                    </div>
                  )}
                  {selectedMod.properties && selectedMod.properties.length > 0 && (
                    <div className="col-span-2 bg-black/50 p-1.5 rounded border border-bridge-border/40 truncate" title={selectedMod.properties.join(", ")}>
                      <span className="text-muted-foreground uppercase block text-[8px]">Properties</span>
                      <strong className="text-slate-200">{selectedMod.properties.join(", ")}</strong>
                    </div>
                  )}
                </div>
              )}

              {selectedMod.prerequisite && (
                <div className="text-[10px] text-muted-foreground pt-1">
                  Prerequisite: <span className="text-amber-300 font-bold">{selectedMod.prerequisite}</span>
                </div>
              )}
            </div>
          )}

          {isAtCapacity && (
            <p className="text-[10px] text-amber-400 font-mono">
              Maximum modification capacity reached ({maxMods}/{maxMods}). Uninstall modules to free up slot space.
            </p>
          )}

          {/* Conditional Dropdowns based on Module Requirements */}
          <div className="flex flex-col md:flex-row gap-4 flex-wrap">
            {needsLocationChoice && (
              <div className="w-full md:w-64">
                <label className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-1">
                  Mount Location
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value as MountLocation)}
                  className="w-full bg-slate-900 border border-bridge-border rounded px-3 py-1.5 text-xs text-cyan-neon font-mono"
                >
                  <option value="">-- Select Location --</option>
                  {ALL_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            )}

            {needsSlotChoice && (
              <div className="w-full md:w-64">
                <label className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-1">
                  Mount On Specific Slot
                </label>
                <select
                  value={selectedSlotInstanceId}
                  onChange={(e) => setSelectedSlotInstanceId(e.target.value)}
                  className="w-full bg-slate-900 border border-bridge-border rounded px-3 py-1.5 text-xs text-cyan-neon font-mono"
                >
                  <option value="">-- Select {selectedMod?.prerequisite} --</option>
                  {openMountSlots.map((slot) => (
                    <option key={slot.instanceId} value={slot.instanceId}>
                      {slot.name} ({slot.location ?? "unspecified location"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Target Weapon Selector with compatibility gating */}
            {needsTargetWeaponChoice && (
              <div className="w-full md:w-72">
                <label className="text-[10px] text-amber-400 uppercase tracking-widest block mb-1">
                  Select Compatible Weapon
                </label>
                <select
                  value={selectedTargetWeaponInstanceId}
                  onChange={(e) => setSelectedTargetWeaponInstanceId(e.target.value)}
                  className="w-full bg-amber-950/30 border border-amber-500/50 rounded px-3 py-1.5 text-xs text-amber-300 font-mono focus:outline-none"
                >
                  <option value="">-- Select Installed Weapon --</option>
                  {compatibleWeapons.map((weapon) => (
                    <option key={weapon.instanceId} value={weapon.instanceId}>
                      {weapon.name} {weapon.damageType ? `(${weapon.damageType})` : ""} {weapon.location ? `[${weapon.location}]` : ""}
                    </option>
                  ))}
                </select>
                {compatibleWeapons.length === 0 && (
                  <p className="text-[9px] text-red-400 mt-1">
                    No compatible weapon installed matching this modification's criteria.
                  </p>
                )}
              </div>
            )}

            {/* Makeshift Core System Penalty Selector */}
            {needsPenaltyStatChoice && (
              <div className="w-full md:w-72">
                <label className="text-[10px] text-rose-400 uppercase tracking-widest block mb-1">
                  DM Decrement: Ability Score (-1)
                </label>
                <select
                  value={selectedPenaltyStat}
                  onChange={(e) => setSelectedPenaltyStat(e.target.value as AbilityScoreName)}
                  className="w-full bg-rose-950/30 border border-rose-500/50 rounded px-3 py-1.5 text-xs text-rose-300 font-mono focus:outline-none"
                >
                  <option value="">-- Select Score Chosen by DM --</option>
                  {availablePenaltyStats.map((stat) => (
                    <option key={stat.key} value={stat.key}>
                      {stat.label}
                    </option>
                  ))}
                </select>
                <span className="text-[9px] text-rose-400/80 block mt-0.5">
                  Makeshift system flaw: one score other than boosted stat decreases by 1.
                </span>
              </div>
            )}
          </div>

          {isPhysicalMountPrerequisite && openMountSlots.length === 0 && !isAtCapacity && (
            <p className="text-[10px] text-amber-400 font-mono">
              No available Fixed Hardpoint slots open to mount this on — install and keep a Fixed Hardpoint clear first.
            </p>
          )}
        </div>

        {/* INSTALLED MODIFICATIONS DISPLAY GRID */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STATIONS.map((station) => {
            const modsForStation = installedMods.filter((m) => m.station === station)
            return (
              <div key={station} className="rounded-md border border-bridge-border bg-black/30 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-3 border-b border-bridge-border/60 pb-1">
                    <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase">{station}</h3>
                    <span className="text-[9px] font-mono text-muted-foreground">{modsForStation.length} Installed</span>
                  </div>

                  {modsForStation.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground/60 italic py-2">
                      No systems installed under {station}.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {modsForStation.map((mod) => (
                        <div key={mod.instanceId} className="rounded border border-bridge-border/60 bg-bridge-panel/40 p-2.5 flex flex-col gap-1 text-xs">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-slate-200">{mod.name}</span>
                            <button
                              onClick={() => mod.instanceId && onRemoveMod(mod.instanceId)}
                              className="text-[9px] text-red-400 hover:text-red-300 font-mono cursor-pointer"
                            >
                              [UNINSTALL]
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[9px] text-muted-foreground">
                            <span className="text-amber-300">{mod.category}</span>
                            <span>Cost: {mod.cost.toLocaleString()} cr</span>
                            {mod.location && <span>Loc: {mod.location}</span>}
                          </div>
                          {mod.prerequisite && (
                            <span className="text-[9px] text-cyan-neon/80 italic">Mount: {mod.prerequisite}</span>
                          )}
                          {mod.targetWeaponInstanceId && (
                            <span className="text-[9px] text-purple-400 italic">
                              Target: {installedMods.find(m => m.instanceId === mod.targetWeaponInstanceId)?.name || "Unknown Weapon"}
                            </span>
                          )}
                          {mod.penaltyStat && (
                            <span className="text-[9px] text-rose-400 italic">
                              Flaw: -1 {mod.penaltyStat.toUpperCase()}
                            </span>
                          )}
                          <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">{mod.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Panel>
  )
}

interface StationModificationsProps {
  station: StationName
  installedMods?: Modification[]
  onRemoveMod?: (instanceId: string) => void
  allowRemoval?: boolean
}

export function StationModifications({
  station,
  installedMods = [],
  onRemoveMod,
  allowRemoval = true,
}: StationModificationsProps) {
  const stationMods = installedMods.filter((m) => m.station === station)

  return (
    <div className="flex flex-col gap-3">
      {stationMods.length === 0 ? (
        <p className="text-[10px] text-muted-foreground/60 italic">
          No modifications currently active on the {station} station. Visit the Ship Modifications Registry to install modules.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stationMods.map((mod) => (
            <div
              key={mod.instanceId}
              className="rounded border border-cyan-neon/30 bg-cyan-neon/5 p-3 flex flex-col justify-between text-xs"
            >
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-cyan-neon">{mod.name}</span>
                  <span className="text-[9px] font-mono text-amber-300 uppercase px-1.5 py-0.5 rounded bg-amber-500/10">
                    {mod.category}
                  </span>
                </div>

                <div className="flex gap-3 text-[9px] text-muted-foreground mb-2">
                  <span>Cost: <strong className="text-slate-200">{mod.cost.toLocaleString()} cr</strong></span>
                  {mod.location && <span>Location: <strong className="text-slate-200">{mod.location}</strong></span>}
                  {mod.prerequisite && <span>Mount: <strong className="text-cyan-neon">{mod.prerequisite}</strong></span>}
                  {mod.targetWeaponInstanceId && (
                    <span>Target: <strong className="text-purple-400">{installedMods.find(m => m.instanceId === mod.targetWeaponInstanceId)?.name || "Unknown"}</strong></span>
                  )}
                  {mod.penaltyStat && (
                    <span>Penalty: <strong className="text-rose-400">-1 {mod.penaltyStat}</strong></span>
                  )}
                </div>

                <p className="text-[10px] text-slate-300 leading-relaxed">
                  {mod.description}
                </p>
              </div>

              {allowRemoval && (
                <div className="mt-3 pt-2 border-t border-bridge-border/40 flex justify-end">
                  <button
                    onClick={() => mod.instanceId && onRemoveMod?.(mod.instanceId)}
                    className="text-[9px] font-mono text-red-400 hover:text-red-300 tracking-wider uppercase cursor-pointer"
                  >
                    [UNINSTALL]
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}