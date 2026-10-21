"use client"

import { useState, useMemo, useEffect } from "react"
import { Shield, Heart, Zap, Check, Rocket, Cpu, Award, AlertTriangle, AlertOctagon, Power, ArrowUpCircle, Dices, Crosshair, Sparkles, Wind, Info } from "lucide-react"
import { 
  SHIP_SIZE_RULES, 
  SHIP_TYPE_RULES, 
  SHIP_TIER_PROGRESSION, 
  ShipSize, 
  ROLE_SPECIALIZATIONS,
  ParagonSnubfighter,
  PARAGON_SNUBFIGHTERS
} from "@/lib/ship-rules"
import {
  ALL_MANUFACTURERS,
  getModelsForManufacturer,
  findCatalogShip,
  StarshipCatalogEntry
} from "@/lib/starship-catalog"

export type SkillProficiencyTier = "none" | "proficient" | "expert" | "mastery" | "high-mastery" | "grand-mastery"

export type RoleSpecialization = 
  | "Attack Fighter" | "Bomber" | "Scout" | "Scrambler" | "Shuttle" | "Superiority Fighter"
  | "Courier" | "Freighter" | "Gunship" | "Missile Boat" | "Navigator" | "Yacht"

export type RoleMastery = 
  | "Attack Fighter" | "Bomber" | "Scout" | "Scrambler" | "Shuttle" | "Superiority Fighter"
  | "Courier" | "Freighter" | "Gunship" | "Missile Boat" | "Navigator" | "Yacht"

export const MEDIUM_ROLE_SPECIALIZATIONS: Record<string, { name: string; targetStation: string; summary: string; description: string }> = {
  "Courier": {
    name: "Courier",
    targetStation: "Engines",
    summary: "Your ship's flying speed increases by 50 feet.",
    description: "Your ship's flying speed increases by 50 feet."
  },
  "Freighter": {
    name: "Freighter",
    targetStation: "Cargo",
    summary: "Gain Storage Compartment mod. Base cargo capacity is 50 tons.",
    description: "Your ship gains the Storage Compartment modification at no cost. Additionally, your ship's base cargo capacity increases to 50 tons."
  },
  "Gunship": {
    name: "Gunship",
    targetStation: "Weapons",
    summary: "Gain Fixed Hardpoint mod. +1 bonus to damage rolls.",
    description: "Your ship gains a Fixed Hardpoint modification at no cost. Additionally, your ship has a +1 bonus to damage rolls with ship weapons."
  },
  "Missile Boat": {
    name: "Missile Boat",
    targetStation: "Weapons",
    summary: "Larger ships have disadvantage on saves against your ordnance.",
    description: "Starships one or more sizes larger than you have disadvantage on saving throws against your tertiary and quaternary weapons."
  },
  "Navigator": {
    name: "Navigator",
    targetStation: "Navcomputer",
    summary: "Gain Navcomputer mod. Roll twice on Hyperspace Mishaps.",
    description: "Your ship gains the Navcomputer modification at no cost. Additionally, if a crewmember must roll on the Hyperspace Mishaps table, they can roll twice and choose either total."
  },
  "Yacht": {
    name: "Yacht",
    targetStation: "Communications",
    summary: "Gain Recreation suite. Guests have disadvantage on Int/Wis checks.",
    description: "Your ship gains the Recreation suite at no cost. Additionally, while hosting guests on your ship, they have disadvantage on Intelligence and Wisdom checks."
  }
}

export const ROLE_MASTERIES: Record<string, { name: string; summary: string; description: string }> = {
  "Attack Fighter": {
    name: "Attack Fighter",
    summary: "Your ship’s shield regeneration rate is doubled.",
    description: "Doubles the regeneration rate under the Auto Shield Regeneration Protocol on the Defense Station."
  },
  "Bomber": {
    name: "Bomber",
    summary: "Enemy ships one or more sizes larger have disadvantage on saving throws against your ordnance.",
    description: "Imposes disadvantage on target saving throws against your tertiary and quaternary weapons (missiles, torpedoes, rockets, bombs, mines)."
  },
  "Scout": {
    name: "Scout",
    summary: "+2 bonus to Astrogation checks; enemy ships have disadvantage on scan checks to detect you.",
    description: "Gains +2 bonus to Intelligence (Astrogation) checks, and enemy ships suffer disadvantage on Wisdom (Scan) checks to detect your ship entering or exiting hyperspace."
  },
  "Scrambler": {
    name: "Scrambler",
    summary: "+2 bonus to Charisma (Interfere) checks.",
    description: "Ship comms arrays gain an innate +2 bonus to all Charisma (Interfere) checks."
  },
  "Shuttle": {
    name: "Shuttle",
    summary: "Gain an extra free suite (counts as 2 capacity). Size suite capacity minimum is 2.",
    description: "Gain or replace one suite system of your choice at no cost (counts as 2 suites). Your size suite capacity floor is set to a minimum of 2."
  },
  "Superiority Fighter": {
    name: "Superiority Fighter",
    summary: "Turning speed decreases by 50 ft (or +50 ft flight speed if turning would reach 0).",
    description: "Decreases turning speed by 50 ft. If this would decrease turning speed to 0, flying speed increases by 50 ft instead."
  },
  "Courier": {
    name: "Courier",
    summary: "Gain Backup Hyperdrive mod. Hyperdrive acts as one class faster.",
    description: "Your ship gains the Backup Hyperdrive modification at no cost. Any installed hyperdrive operates as one of the next faster class."
  },
  "Freighter": {
    name: "Freighter",
    summary: "Reaction on failed Str/Dex save to jettison cargo for reroll/auto-success.",
    description: "When your ship fails a Strength or Dexterity saving throw, a crewmember can use their reaction to jettison cargo. ≥50 tons = reroll. ≥75 tons = auto-succeed. Area 300x100ft behind ship becomes difficult terrain for 1 minute."
  },
  "Gunship": {
    name: "Gunship",
    summary: "Once per round on critical hit, roll weapon damage dice one additional time.",
    description: "Once per round, a crewmember can roll the weapon damage dice one additional time when determining the extra damage for a critical hit with a ship attack."
  },
  "Missile Boat": {
    name: "Missile Boat",
    summary: "Load multiple types of munitions into tertiary/quaternary weapons.",
    description: "When firing a tertiary or quaternary weapon, you can load each weapon with multiple types of munitions up to your reload number and select which to fire when taking the attack action."
  },
  "Navigator": {
    name: "Navigator",
    summary: "Resistance and advantage on saves vs environmental effects.",
    description: "Your ship has resistance to damage from environmental effects, and advantage on saving throws to resist the effects of environmental effects."
  },
  "Yacht": {
    name: "Yacht",
    summary: "Advantage on Charisma checks against those who can see your ship.",
    description: "You have advantage on Charisma checks made against those who can see your ship."
  }
}

export interface ShipConfig {
  name: string
  manufacturer: string
  model: string
  size: string
  shipType: string
  tier: number
  proficiencyBonus: number
  shipCost: number
  paidAmount: number
  reactorType: string
  powerCoupling: string
  armorType: string
  shieldType: string
  roleSpecialization?: RoleSpecialization | null
  roleMastery?: RoleMastery | null
  paragonSnubfighter?: ParagonSnubfighter | null
  paragonTransportStats?: string[] | null
  extraSuiteCapacity?: number
  stats: {
    strength: number
    dexterity: number
    constitution: number
    intelligence: number
    wisdom: number
    charisma: number
  }
  tierStatBoosts: {
    strength: number
    dexterity: number
    constitution: number
    intelligence: number
    wisdom: number
    charisma: number
  }
  tierAsiHistory?: Record<number, Record<string, number>>
  tierRolls: Record<number, { hull: number, shield: number }>
  saveProficiencies: {
    strength: boolean
    dexterity: boolean
    constitution: boolean
    intelligence: boolean
    wisdom: boolean
    charisma: boolean
  }
  skillTiers: {
    boost: SkillProficiencyTier
    ram: SkillProficiencyTier
    hide: SkillProficiencyTier
    maneuver: SkillProficiencyTier
    patch: SkillProficiencyTier
    regulation: SkillProficiencyTier
    astrogation: SkillProficiencyTier
    data: SkillProficiencyTier
    probe: SkillProficiencyTier
    scan: SkillProficiencyTier
    impress: SkillProficiencyTier
    interfere: SkillProficiencyTier
    menace: SkillProficiencyTier
    swindle: SkillProficiencyTier
  }
  baseHull: number
  baseShields: number
  maxShields: number
  maxPowerDice: number
  powerDieType: string
  recoveryRate: number
  skills: {
    [key: string]: number
  }
  savingThrows: {
    strength: number
    dexterity: number
    constitution: number
    intelligence: number
    wisdom: number
    charisma: number
  }
}

interface ShipSetupProps {
  initialConfig?: Partial<ShipConfig>
  shipsData?: any[]
  currentDay: number
  onSaveConfig: (config: ShipConfig) => void
  onFullReset: (startingDay: number, startingFunds: number) => void
  externalPendingTier?: number | null
  onClearPendingTier?: () => void
}

const SHIP_SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"]
const REACTOR_TYPES = ["Fuel Cell Reactor", "Ionization Reactor", "Power Core Reactor"]
const POWER_COUPLINGS = ["Direct Power Coupling", "Distributed Power Coupling", "Hub & Spoke Power Coupling"]
const ARMOR_TYPES = ["Lightweight Armor", "Deflection Armor", "Reinforced Armor"]
const SHIELD_TYPES = ["Directional Shields", "Fortress Shields", "Quick Charge Shields"]

const SHIELD_MULTIPLIERS: Record<string, number> = {
  "Directional Shields": 1.0,
  "Fortress Shields": 1.5,
  "Quick Charge Shields": 0.66,
}

const TIER_POWER_DIE_MAP: Record<number, string> = {
  0: "d1", 1: "d4", 2: "d6", 3: "d8", 4: "d10", 5: "d12"
}

const POINT_BUY_COSTS: Record<number, number> = { 
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 
}

const STAT_SKILLS_MAP = {
  strength: ["boost", "ram"],
  dexterity: ["hide", "maneuver"],
  constitution: ["patch", "regulation"],
  intelligence: ["astrogation", "data", "probe"],
  wisdom: ["scan"],
  charisma: ["impress", "interfere", "menace", "swindle"],
} as const

const DEFAULT_CONFIG: ShipConfig = {
  name: "Zeta Shuttle \"Crucible\"",
  manufacturer: "Sienar Fleet Systems (SFS)",
  model: "Zeta-class Cargo Shuttle",
  size: "Medium",
  shipType: "Freighter",
  tier: 0,
  proficiencyBonus: 2,
  shipCost: 50000,
  paidAmount: 50000,
  reactorType: "Fuel Cell Reactor",
  powerCoupling: "Direct Power Coupling",
  armorType: "Lightweight Armor",
  shieldType: "Directional Shields",
  roleSpecialization: null,
  roleMastery: null,
  paragonSnubfighter: null,
  paragonTransportStats: [],
  extraSuiteCapacity: 0,
  stats: { strength: 8, dexterity: 8, constitution: 8, intelligence: 8, wisdom: 8, charisma: 8 },
  tierStatBoosts: { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 },
  tierAsiHistory: {},
  tierRolls: {},
  saveProficiencies: { strength: false, dexterity: false, constitution: false, intelligence: false, wisdom: false, charisma: false },
  skillTiers: { boost: "none", ram: "none", hide: "none", maneuver: "none", patch: "none", regulation: "none", astrogation: "none", data: "none", probe: "none", scan: "none", impress: "none", interfere: "none", menace: "none", swindle: "none" },
  baseHull: 40, baseShields: 24, maxShields: 24, maxPowerDice: 5, powerDieType: "d8", recoveryRate: 1, skills: {},
  savingThrows: { strength: -1, dexterity: -1, constitution: -1, intelligence: -1, wisdom: -1, charisma: -1 },
}

type ResetStep = "IDLE" | "WARNING_1" | "WARNING_2" | "SETUP_NEW"

function ShipResetManager({ currentDay, onConfirm }: { currentDay: number, onConfirm: (day: number, funds: number) => void }) {
  const [step, setStep] = useState<ResetStep>("IDLE")
  const [newDay, setNewDay] = useState<number>(currentDay)
  const [newFunds, setNewFunds] = useState<number>(0)

  if (step === "IDLE") {
    return (
      <button onClick={() => setStep("WARNING_1")} className="flex w-full items-center justify-center gap-2 rounded border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-400 transition-all hover:bg-red-500/20 hover:shadow-[0_0_12px_rgba(239,68,68,0.3)] mt-8 cursor-pointer" type="button">
        <Power className="h-4 w-4" />
        FACTORY RESET: INITIALIZE NEW VESSEL
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border-2 border-red-900/50 bg-black p-6 shadow-2xl">
        {step === "WARNING_1" && (
          <div className="flex flex-col items-center text-center">
            <AlertTriangle className="mb-4 h-12 w-12 text-amber-500 animate-pulse" />
            <h2 className="mb-2 text-lg font-bold text-amber-500 uppercase tracking-widest">Initialize Reset?</h2>
            <p className="mb-6 text-sm text-slate-300">Do you really want to delete the current ship profile and wipe all active telemetry?</p>
            <div className="flex w-full gap-4">
              <button onClick={() => setStep("IDLE")} className="flex-1 rounded border border-bridge-border/60 bg-bridge-panel px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 cursor-pointer" type="button">ABORT</button>
              <button onClick={() => setStep("WARNING_2")} className="flex-1 rounded border border-amber-500/50 bg-amber-500/20 px-4 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/30 cursor-pointer" type="button">YES, PROCEED</button>
            </div>
          </div>
        )}

        {step === "WARNING_2" && (
          <div className="flex flex-col items-center text-center">
            <AlertOctagon className="mb-4 h-12 w-12 text-red-500 animate-pulse" />
            <h2 className="mb-2 text-lg font-bold text-red-500 uppercase tracking-widest">Critical Data Loss</h2>
            <p className="mb-6 text-sm text-slate-300">You will lose <strong className="text-red-400">EVERYTHING</strong> associated with this ship. Ledger, mods, config. Are you really, really sure?</p>
            <div className="flex w-full gap-4">
              <button onClick={() => setStep("IDLE")} className="flex-1 rounded border border-bridge-border/60 bg-bridge-panel px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 cursor-pointer" type="button">CANCEL PURGE</button>
              <button onClick={() => setStep("SETUP_NEW")} className="flex-1 rounded border border-red-500/50 bg-red-500/20 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/30 cursor-pointer" type="button">YES, DELETE IT ALL</button>
            </div>
          </div>
        )}

        {step === "SETUP_NEW" && (
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-cyan-neon uppercase tracking-widest mb-1">Initialize New Vessel</h2>
            <p className="text-xs text-muted-foreground mb-6">Previous data flagged for deletion. Enter new starting parameters.</p>
            
            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="mb-1 block text-[10px] font-bold text-cyan-neon uppercase tracking-wider">Starting Campaign Day</label>
                <input type="number" min="0" value={newDay} onChange={(e) => setNewDay(Number(e.target.value))} className="w-full rounded border border-bridge-border/60 bg-black/50 px-3 py-2 text-sm font-mono text-slate-200 outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-cyan-neon uppercase tracking-wider">Starting Available Funds (cr)</label>
                <input type="number" min="0" value={newFunds} onChange={(e) => setNewFunds(Number(e.target.value))} className="w-full rounded border border-bridge-border/60 bg-black/50 px-3 py-2 text-sm font-mono text-amber-300 outline-none" />
              </div>
            </div>

            <div className="flex w-full gap-4">
              <button onClick={() => setStep("IDLE")} className="flex-1 rounded border border-bridge-border/60 bg-bridge-panel px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 cursor-pointer" type="button">CANCEL</button>
              <button onClick={() => { onConfirm(newDay, newFunds); setStep("IDLE"); }} className="flex-1 rounded border border-cyan-neon/50 bg-cyan-neon/20 px-4 py-2 text-xs font-bold text-cyan-neon hover:bg-cyan-neon/30 cursor-pointer" type="button">FINALIZE RESET</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface LevelUpModalProps {
  newTier: number
  shipSize: ShipSize
  baseStats: ShipConfig['stats']
  currentBoosts: ShipConfig['tierStatBoosts']
  currentSpecialization?: RoleSpecialization | null
  currentMastery?: RoleMastery | null
  currentParagon?: ParagonSnubfighter | null
  currentParagonTransport?: string[] | null
  onComplete: (
    rollData: { hull: number, shield: number }, 
    sessionAsiGains: Record<string, number>,
    specializationData?: RoleSpecialization | null,
    masteryData?: RoleMastery | null,
    paragonData?: ParagonSnubfighter | null,
    paragonTransportData?: string[] | null
  ) => void
  onCancel: () => void
}

function LevelUpModal({ 
  newTier, 
  shipSize, 
  baseStats, 
  currentBoosts, 
  currentSpecialization = null,
  currentMastery = null,
  currentParagon = null,
  currentParagonTransport = null,
  onComplete, 
  onCancel 
}: LevelUpModalProps) {
  const rules = SHIP_SIZE_RULES[shipSize] || SHIP_SIZE_RULES.medium
  const hitDieSides = parseInt(rules.hitDie.match(/d(\d+)/)?.[1] ?? "8", 10)
  const averageVal = rules.avgVal

  const isMedium = shipSize.toLowerCase() === "medium"

  const [hullMode, setHullMode] = useState<"avg" | "manual" | "roll">("avg")
  const [shieldMode, setShieldMode] = useState<"avg" | "manual" | "roll">("avg")
  const [hullValue, setHullValue] = useState<number>(averageVal)
  const [shieldValue, setShieldValue] = useState<number>(averageVal)
  const [rerollOnes, setRerollOnes] = useState(false)

  const [sessionAsi, setSessionAsi] = useState<Record<string, number>>({
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0,
  })

  const tierFeatures = SHIP_TIER_PROGRESSION[shipSize]?.[newTier]?.features 
    || (newTier >= 1 ? ['Ability Score Increase'] : [])
  
  const hasRoleSpecializationFeature = tierFeatures.includes('Role Specialization') || newTier === 2
  const [selectedSpecialization, setSelectedSpecialization] = useState<RoleSpecialization | null>(currentSpecialization)

  const hasRoleMasteryFeature = tierFeatures.includes('Role Mastery') || newTier === 4
  const [selectedMastery, setSelectedMastery] = useState<RoleMastery | null>(currentMastery)

  const hasParagonSnubfighterFeature = !isMedium && (tierFeatures.includes('Paragon Snubfighter') || newTier === 5)
  const [selectedParagon, setSelectedParagon] = useState<ParagonSnubfighter | null>(currentParagon)

  const hasParagonTransportFeature = isMedium && (tierFeatures.includes('Paragon Transport') || newTier === 5)
  const [selectedParagonTransport, setSelectedParagonTransport] = useState<string[]>(currentParagonTransport || [])

  const currentRoleOptions = isMedium ? Object.keys(MEDIUM_ROLE_SPECIALIZATIONS) : Object.keys(ROLE_SPECIALIZATIONS)
  const currentMasteryOptions = isMedium ? Object.keys(MEDIUM_ROLE_SPECIALIZATIONS) : Object.keys(ROLE_MASTERIES).filter(k => !Object.keys(MEDIUM_ROLE_SPECIALIZATIONS).includes(k))

  const totalAsiPoints = Object.values(sessionAsi).reduce((acc, val) => acc + val, 0)
  const maxAsiPoints = 2
  
  const handleAsiChange = (stat: string, delta: number) => {
    const baseVal = baseStats[stat as keyof typeof baseStats]
    const priorBonus = currentBoosts[stat as keyof typeof currentBoosts] || 0
    const currentSessionBonus = sessionAsi[stat] || 0
    const newSessionBonus = currentSessionBonus + delta

    const newEffectiveTotal = baseVal + priorBonus + newSessionBonus
    
    let statCap = (shipSize === 'small' && stat === 'dexterity') ? 22 : 20
    
    if (selectedParagon && PARAGON_SNUBFIGHTERS[selectedParagon]?.boostedStat === stat) {
      statCap += 2
    }
    if (selectedParagonTransport.includes(stat)) {
      statCap += 2
    }
    
    if (newEffectiveTotal > statCap) return
    if (newSessionBonus < 0) return
    if (delta > 0 && totalAsiPoints >= maxAsiPoints) return
    
    setSessionAsi(prev => ({ ...prev, [stat]: newSessionBonus }))
  }

  const toggleParagonTransportStat = (stat: string) => {
    setSelectedParagonTransport(prev => {
      if (prev.includes(stat)) return prev.filter(s => s !== stat)
      if (prev.length >= 2) return prev
      return [...prev, stat]
    })
  }

  const rollDie = () => {
    let roll = Math.floor(Math.random() * hitDieSides) + 1
    if (roll === 1 && rerollOnes) {
      roll = Math.floor(Math.random() * hitDieSides) + 1
    }
    return roll
  }

  const handleRollHull = () => setHullValue(rollDie())
  const handleRollShield = () => setShieldValue(rollDie())

  const isFormValid = () => {
    const asiRequired = tierFeatures.includes('Ability Score Increase') || newTier >= 1
    if (asiRequired && totalAsiPoints < maxAsiPoints) return false
    if (hasRoleSpecializationFeature && !selectedSpecialization) return false
    if (hasRoleMasteryFeature && !selectedMastery) return false
    if (hasParagonSnubfighterFeature && !selectedParagon) return false
    if (hasParagonTransportFeature && selectedParagonTransport.length !== 2) return false
    return true
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-3xl rounded-lg border border-cyan-500/50 bg-bridge-panel p-6 shadow-[0_0_30px_rgba(0,200,255,0.15)] my-8 max-h-[92vh] overflow-y-auto">
        <div className="text-center mb-6 border-b border-bridge-border/60 pb-4">
          <ArrowUpCircle className="mx-auto h-12 w-12 text-cyan-400 mb-2 animate-pulse" />
          <h2 className="text-2xl font-bold text-cyan-neon uppercase tracking-widest">Vessel Promotion Protocol</h2>
          <p className="text-xs text-muted-foreground mt-1">Upgrading chassis specifications to Tier {newTier}</p>
        </div>

        <div className="mb-6">
          <h3 className="text-xs font-bold text-cyan-100 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400"/> Systems Unlocked
          </h3>
          <div className="bg-black/40 rounded p-3 border border-bridge-border/40">
             <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
               {tierFeatures.map((f, i) => (
                 <li key={i}><strong className="text-cyan-300">{f}</strong></li>
               ))}
               {isMedium && newTier === 1 && (
                 <li><strong className="text-cyan-300">Evasive Maneuvers (Tier 1 Action)</strong></li>
               )}
               {isMedium && newTier === 2 && (
                 <li><strong className="text-emerald-400">Nimble Starship (+Half Dex Mod to Non-Dex Saves)</strong></li>
               )}
               {isMedium && newTier === 3 && (
                 <>
                   <li><strong className="text-cyan-300">Versatile Transport (Reaction Advantage)</strong></li>
                   <li><strong className="text-cyan-300">Hold Together (Destruction Save at 0 HP instead of failure)</strong></li>
                 </>
               )}
               {isMedium && newTier === 4 && (
                 <li><strong className="text-cyan-300">Adaptive Armor (Reaction +Con to AC)</strong></li>
               )}
               {isMedium && newTier === 5 && (
                 <li><strong className="text-emerald-400">Best Ship in the 'Verse (Action Resistance)</strong></li>
               )}
               {!isMedium && newTier === 4 && (
                 <li><strong className="text-cyan-300">Standing By (1/Recharge Extra Action Surge)</strong></li>
               )}
               {!isMedium && newTier === 5 && (
                 <li><strong className="text-emerald-400">A Leaf on the Wind (1/Recharge: Treat d20 roll as Natural 20)</strong></li>
               )}
             </ul>
          </div>
        </div>

        {hasRoleSpecializationFeature && (
          <div className="mb-6 rounded border border-cyan-500/40 bg-black/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-cyan-neon uppercase tracking-widest flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                Role Specialization (Tier 2 Selection)
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold border ${
                selectedSpecialization 
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" 
                  : "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
              }`}>
                {selectedSpecialization ? `SELECTED: ${selectedSpecialization}` : "SELECTION REQUIRED"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3 font-mono">
              At 2nd tier, you adopt a particular style of design for your ship. Choose any one specialization regardless of your vessel&apos;s initial role.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {currentRoleOptions.map((specKey) => {
                const spec = isMedium ? MEDIUM_ROLE_SPECIALIZATIONS[specKey] : ROLE_SPECIALIZATIONS[specKey as RoleSpecialization]
                const isSelected = selectedSpecialization === specKey
                return (
                  <button
                    key={specKey}
                    type="button"
                    onClick={() => setSelectedSpecialization(specKey as RoleSpecialization)}
                    className={`flex flex-col text-left p-2.5 rounded border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-cyan-950/70 border-cyan-400 text-slate-100 shadow-[0_0_12px_rgba(0,255,255,0.2)]"
                        : "bg-black/40 border-bridge-border/60 text-slate-400 hover:border-cyan-500/40 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className={`text-xs font-bold font-mono uppercase ${isSelected ? "text-cyan-neon" : "text-slate-200"}`}>
                        {spec.name}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/60 border border-bridge-border text-muted-foreground uppercase">
                        {spec.targetStation}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-cyan-200/90 leading-tight">
                      {spec.summary}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-1 leading-normal italic">
                      {spec.description}
                    </p>
                  </button>
                )
              })}
            </div>

            {/* Display guidance for free mods if selected */}
            {selectedSpecialization && isMedium && (
              <div className="mt-3 p-2 rounded bg-cyan-950/30 border border-cyan-500/30 text-[10px] text-cyan-300 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  {selectedSpecialization === "Freighter" && "Freighter selected: You may manually install the 'Storage Compartment' suite at no cost in the Ship Modifications tab to officially lock it in."}
                  {selectedSpecialization === "Gunship" && "Gunship selected: You may manually install an additional 'Fixed Hardpoint' modification at no cost in the Ship Modifications tab."}
                  {selectedSpecialization === "Navigator" && "Navigator selected: You may manually install the 'Navcomputer' modification at no cost in the Ship Modifications tab."}
                  {selectedSpecialization === "Yacht" && "Yacht selected: You may manually install the 'Recreation' suite at no cost in the Ship Modifications tab."}
                  {(selectedSpecialization === "Courier" || selectedSpecialization === "Missile Boat") && "Bonus statistics have been automatically applied to the active matrices."}
                </span>
              </div>
            )}
          </div>
        )}

        {hasRoleMasteryFeature && (
          <div className="mb-6 rounded border border-cyan-500/40 bg-black/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-cyan-neon uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Role Mastery (Tier 4 Selection)
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold border ${
                selectedMastery 
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" 
                  : "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
              }`}>
                {selectedMastery ? `SELECTED: ${selectedMastery}` : "SELECTION REQUIRED"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3 font-mono">
              At 4th tier, you master a particular style of design for your ship. Choose any one from the following.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {currentMasteryOptions.map((masteryKey) => {
                const mastery = ROLE_MASTERIES[masteryKey as RoleMastery]
                const isSelected = selectedMastery === masteryKey
                return (
                  <button
                    key={masteryKey}
                    type="button"
                    onClick={() => setSelectedMastery(masteryKey as RoleMastery)}
                    className={`flex flex-col text-left p-2.5 rounded border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-cyan-950/70 border-cyan-400 text-slate-100 shadow-[0_0_12px_rgba(0,255,255,0.2)]"
                        : "bg-black/40 border-bridge-border/60 text-slate-400 hover:border-cyan-500/40 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className={`text-xs font-bold font-mono uppercase ${isSelected ? "text-cyan-neon" : "text-slate-200"}`}>
                        {mastery.name}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-cyan-200/90 leading-tight">
                      {mastery.summary}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-1 leading-normal italic">
                      {mastery.description}
                    </p>
                  </button>
                )
              })}
            </div>

            {selectedMastery && isMedium && selectedMastery === "Courier" && (
              <div className="mt-3 p-2 rounded bg-cyan-950/30 border border-cyan-500/30 text-[10px] text-cyan-300 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Courier Mastery selected: You may manually install the &apos;Backup Hyperdrive&apos; modification at no cost in the Ship Modifications tab.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Small Ship Paragon */}
        {hasParagonSnubfighterFeature && (
          <div className="mb-6 rounded border border-emerald-500/40 bg-black/50 p-4 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <Wind className="w-4 h-4 text-emerald-400" />
                Paragon Snubfighter (Tier 5 Selection)
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold border ${
                selectedParagon 
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                  : "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
              }`}>
                {selectedParagon ? `SELECTED: ${selectedParagon}` : "SELECTION REQUIRED"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3 font-mono">
              As of 5th tier, your starship is the best in its class. Choose any one specialization to gain +2 to that ability score and +2 to its score maximum.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {(Object.keys(PARAGON_SNUBFIGHTERS) as ParagonSnubfighter[]).map((pKey) => {
                const paragon = PARAGON_SNUBFIGHTERS[pKey]
                const isSelected = selectedParagon === pKey
                return (
                  <button
                    key={pKey}
                    type="button"
                    onClick={() => setSelectedParagon(pKey)}
                    className={`flex flex-col text-left p-2.5 rounded border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-950/70 border-emerald-400 text-slate-100 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                        : "bg-black/40 border-bridge-border/60 text-slate-400 hover:border-emerald-500/40 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className={`text-xs font-bold font-mono uppercase ${isSelected ? "text-emerald-300" : "text-slate-200"}`}>
                        {paragon.name}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/60 border border-emerald-500/40 text-emerald-300 uppercase font-mono">
                        +{paragon.boostedStat.toUpperCase().slice(0, 3)} (+2 / MAX +2)
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-emerald-200/90 leading-tight">
                      {paragon.summary}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Medium Ship Paragon */}
        {hasParagonTransportFeature && (
          <div className="mb-6 rounded border border-emerald-500/40 bg-black/50 p-4 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <Wind className="w-4 h-4 text-emerald-400" />
                Paragon Transport (Tier 5 Selection)
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold border ${
                selectedParagonTransport.length === 2 
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                  : "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
              }`}>
                {selectedParagonTransport.length === 2 ? `SELECTED: 2 STATS` : `SELECTED: ${selectedParagonTransport.length} / 2`}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3 font-mono">
              As of 5th tier, your starship is the best in its class. Select <strong>two</strong> ability scores to increase by +2 (their maximums also increase by +2).
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {Object.keys(baseStats).map((statKey) => {
                const isSelected = selectedParagonTransport.includes(statKey)
                const isDisabled = !isSelected && selectedParagonTransport.length >= 2
                return (
                  <button
                    key={statKey}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => toggleParagonTransportStat(statKey)}
                    className={`flex items-center justify-between p-2.5 rounded border transition-all ${
                      isSelected
                        ? "bg-emerald-950/70 border-emerald-400 text-slate-100 shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer"
                        : isDisabled
                        ? "bg-black/60 border-bridge-border/40 text-slate-600 cursor-not-allowed"
                        : "bg-black/40 border-bridge-border/60 text-slate-400 hover:border-emerald-500/40 hover:text-slate-200 cursor-pointer"
                    }`}
                  >
                    <span className={`text-xs font-bold font-mono uppercase ${isSelected ? "text-emerald-300" : ""}`}>
                      {statKey}
                    </span>
                    {isSelected && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/60 border border-emerald-500/40 text-emerald-300 uppercase font-mono">
                        +2
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-xs font-bold text-cyan-100 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-400"/> Hull & Shield Expansion (+1{rules.hitDie})
          </h3>
          
          <div className="flex items-center gap-2 mb-3">
             <input type="checkbox" id="reroll" checked={rerollOnes} onChange={(e) => setRerollOnes(e.target.checked)} className="rounded border-cyan-500 bg-black text-cyan-500 focus:ring-cyan-500 focus:ring-offset-black" />
             <label htmlFor="reroll" className="text-xs text-muted-foreground">House Rule: Reroll 1s once</label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-black/40 rounded p-3 border border-bridge-border/40 flex flex-col gap-2.5">
              <span className="text-xs font-bold uppercase text-slate-400">Hull Die Allocation</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setHullMode("avg"); setHullValue(averageVal) }} className={`flex-1 text-xs py-1.5 rounded border cursor-pointer ${hullMode === 'avg' ? 'bg-cyan-900/50 border-cyan-500 text-cyan-100' : 'bg-black/50 border-bridge-border text-slate-400'}`}>Average ({averageVal})</button>
                <button type="button" onClick={() => { setHullMode("manual"); setHullValue(0) }} className={`flex-1 text-xs py-1.5 rounded border cursor-pointer ${hullMode === 'manual' ? 'bg-cyan-900/50 border-cyan-500 text-cyan-100' : 'bg-black/50 border-bridge-border text-slate-400'}`}>Manual</button>
                <button type="button" onClick={() => { setHullMode("roll"); handleRollHull() }} className={`flex-1 text-xs py-1.5 rounded border flex items-center justify-center gap-1 cursor-pointer ${hullMode === 'roll' ? 'bg-cyan-900/50 border-cyan-500 text-cyan-100' : 'bg-black/50 border-bridge-border text-slate-400'}`}><Dices className="w-3 h-3"/> Roll</button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Result to Apply:</span>
                <input type="number" min="1" max={hitDieSides} value={hullValue} onChange={(e) => setHullValue(Number(e.target.value))} readOnly={hullMode !== 'manual'} className="w-16 bg-black border border-cyan-500/50 rounded px-2 py-1 text-center text-cyan-300 font-mono font-bold outline-none" />
              </div>
            </div>

            <div className="bg-black/40 rounded p-3 border border-bridge-border/40 flex flex-col gap-2.5">
              <span className="text-xs font-bold uppercase text-slate-400">Shield Die Allocation</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShieldMode("avg"); setShieldValue(averageVal) }} className={`flex-1 text-xs py-1.5 rounded border cursor-pointer ${shieldMode === 'avg' ? 'bg-cyan-900/50 border-cyan-500 text-cyan-100' : 'bg-black/50 border-bridge-border text-slate-400'}`}>Average ({averageVal})</button>
                <button type="button" onClick={() => { setShieldMode("manual"); setShieldValue(0) }} className={`flex-1 text-xs py-1.5 rounded border cursor-pointer ${shieldMode === 'manual' ? 'bg-cyan-900/50 border-cyan-500 text-cyan-100' : 'bg-black/50 border-bridge-border text-slate-400'}`}>Manual</button>
                <button type="button" onClick={() => { setShieldMode("roll"); handleRollShield() }} className={`flex-1 text-xs py-1.5 rounded border flex items-center justify-center gap-1 cursor-pointer ${shieldMode === 'roll' ? 'bg-cyan-900/50 border-cyan-500 text-cyan-100' : 'bg-black/50 border-bridge-border text-slate-400'}`}><Dices className="w-3 h-3"/> Roll</button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Result to Apply:</span>
                <input type="number" min="1" max={hitDieSides} value={shieldValue} onChange={(e) => setShieldValue(Number(e.target.value))} readOnly={shieldMode !== 'manual'} className="w-16 bg-black border border-cyan-500/50 rounded px-2 py-1 text-center text-cyan-300 font-mono font-bold outline-none" />
              </div>
            </div>
          </div>
        </div>

        {(tierFeatures.includes('Ability Score Increase') || newTier >= 1) && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
               <h3 className="text-xs font-bold text-cyan-100 uppercase tracking-widest flex items-center gap-2">
                 <Cpu className="w-4 h-4 text-emerald-400"/> Ability Score Increase
               </h3>
               <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800 px-2 py-0.5 rounded">
                 POINTS LEFT: {maxAsiPoints - totalAsiPoints}
               </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(baseStats).map(([stat, baseVal]) => {
                const priorBoost = currentBoosts[stat as keyof typeof currentBoosts] || 0
                const sessionGain = sessionAsi[stat] || 0
                const currentTotal = baseVal + priorBoost + sessionGain
                
                let statCap = (shipSize === 'small' && stat === 'dexterity') ? 22 : 20
                if (selectedParagon && PARAGON_SNUBFIGHTERS[selectedParagon]?.boostedStat === stat) {
                  statCap += 2
                }
                if (selectedParagonTransport.includes(stat)) {
                  statCap += 2
                }

                return (
                  <div key={stat} className="bg-black/40 border border-bridge-border/40 rounded p-2.5 flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex justify-between items-center">
                      <span>{stat}</span>
                      <span className="text-[8px] text-muted-foreground font-mono">CAP {statCap}</span>
                    </span>
                    <div className="flex items-center justify-between">
                      <button type="button" onClick={() => handleAsiChange(stat, -1)} disabled={sessionGain <= 0} className="w-6 h-6 rounded bg-black border border-bridge-border text-slate-300 disabled:opacity-30 hover:bg-white/10 cursor-pointer">-</button>
                      <span className="font-mono text-xs font-bold text-white flex gap-1">
                        {baseVal + priorBoost} {sessionGain > 0 && <span className="text-emerald-400">+{sessionGain}</span>}
                      </span>
                      <button type="button" onClick={() => handleAsiChange(stat, 1)} disabled={totalAsiPoints >= maxAsiPoints || currentTotal >= statCap} className="w-6 h-6 rounded bg-black border border-bridge-border text-slate-300 disabled:opacity-30 hover:bg-white/10 cursor-pointer">+</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-bridge-border/60">
           <button type="button" onClick={onCancel} className="px-5 py-2 rounded text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer">CANCEL UPGRADE</button>
           <button 
             type="button"
             onClick={() => onComplete({ hull: hullValue, shield: shieldValue }, sessionAsi, selectedSpecialization, selectedMastery, selectedParagon, selectedParagonTransport)} 
             disabled={!isFormValid()}
             className="px-6 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-widest transition-colors shadow-[0_0_15px_rgba(0,200,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              CONFIRM & INITIALIZE
           </button>
        </div>

      </div>
    </div>
  )
}

export function ShipSetup({ 
  initialConfig, 
  shipsData = [], 
  currentDay, 
  onSaveConfig, 
  onFullReset, 
  externalPendingTier, 
  onClearPendingTier 
}: ShipSetupProps) {
  const [config, setConfig] = useState<ShipConfig>(() => {
    const initialTier = initialConfig?.tier !== undefined ? initialConfig.tier : DEFAULT_CONFIG.tier
    const initialPowerDieType = initialConfig?.powerDieType ?? TIER_POWER_DIE_MAP[initialTier] ?? DEFAULT_CONFIG.powerDieType
    const initialMaxPowerDice = initialConfig?.maxPowerDice ?? DEFAULT_CONFIG.maxPowerDice
    
    const initialStats = initialConfig?.stats || DEFAULT_CONFIG.stats
    const initialBoosts = initialConfig?.tierStatBoosts || DEFAULT_CONFIG.tierStatBoosts
    const initialRolls = initialConfig?.tierRolls || {}
    const initialAsiHistory = initialConfig?.tierAsiHistory || {}
    const initialSizeKey = ((initialConfig?.size ?? DEFAULT_CONFIG.size) as string).toLowerCase() as ShipSize
    
    const sizeRules = SHIP_SIZE_RULES[initialSizeKey] || SHIP_SIZE_RULES.medium
    const typeRules = SHIP_TYPE_RULES[initialConfig?.shipType || ""] || null

    const hitDieSides = parseInt(sizeRules.hitDie.match(/d(\d+)/)?.[1] ?? "8", 10)
    const startHdCount = sizeRules.startHd
    const averageRoll = sizeRules.avgVal
    
    const effStr = initialStats.strength + initialBoosts.strength + (typeRules?.strengthMod || 0)
    const effCon = initialStats.constitution + initialBoosts.constitution + (sizeRules.constitutionMod || 0) + (typeRules?.constitutionMod || 0)

    const strengthMod = Math.floor((effStr - 10) / 2)
    const constitutionMod = Math.floor((effCon - 10) / 2)

    let totalShields = 0
    let totalHull = 0

    for (let i = 0; i < startHdCount; i++) {
      if (i === 0) {
        totalShields += hitDieSides + strengthMod
        totalHull += hitDieSides + constitutionMod
      } else {
        totalShields += averageRoll + strengthMod
        totalHull += averageRoll + constitutionMod
      }
    }

    Object.entries(initialRolls).forEach(([t, roll]) => {
      totalShields += roll.shield + strengthMod
      totalHull += roll.hull + constitutionMod
    })

    const calcBaseShields = Math.max(1, totalShields)
    const calcBaseHull = Math.max(1, totalHull)
    const shieldTypeName = initialConfig?.shieldType ?? DEFAULT_CONFIG.shieldType
    const multiplier = SHIELD_MULTIPLIERS[shieldTypeName] ?? 1.0
    const calcMaxShields = Math.max(1, Math.round(calcBaseShields * multiplier))

    return {
      ...DEFAULT_CONFIG,
      ...initialConfig,
      name: initialConfig?.name ?? DEFAULT_CONFIG.name,
      tier: initialTier,
      proficiencyBonus: initialConfig?.proficiencyBonus ?? DEFAULT_CONFIG.proficiencyBonus,
      shipCost: initialConfig?.shipCost ?? DEFAULT_CONFIG.shipCost,
      paidAmount: initialConfig?.paidAmount ?? DEFAULT_CONFIG.paidAmount,
      reactorType: initialConfig?.reactorType ?? DEFAULT_CONFIG.reactorType,
      powerCoupling: initialConfig?.powerCoupling ?? DEFAULT_CONFIG.powerCoupling,
      armorType: initialConfig?.armorType ?? DEFAULT_CONFIG.armorType,
      shieldType: shieldTypeName,
      roleSpecialization: initialConfig?.roleSpecialization ?? null,
      roleMastery: initialConfig?.roleMastery ?? null,
      paragonSnubfighter: initialConfig?.paragonSnubfighter ?? null,
      paragonTransportStats: initialConfig?.paragonTransportStats ?? [],
      extraSuiteCapacity: initialConfig?.extraSuiteCapacity ?? 0,
      baseHull: calcBaseHull,
      baseShields: calcBaseShields,
      maxShields: calcMaxShields,
      maxPowerDice: initialMaxPowerDice,
      powerDieType: initialPowerDieType,
      stats: initialStats,
      tierStatBoosts: initialBoosts,
      tierAsiHistory: initialAsiHistory,
      tierRolls: initialRolls,
      saveProficiencies: { ...DEFAULT_CONFIG.saveProficiencies, ...initialConfig?.saveProficiencies },
      skillTiers: { ...DEFAULT_CONFIG.skillTiers, ...initialConfig?.skillTiers },
      skills: initialConfig?.skills ?? DEFAULT_CONFIG.skills,
      savingThrows: { ...DEFAULT_CONFIG.savingThrows, ...initialConfig?.savingThrows },
    }
  })

  useEffect(() => {
    if (initialConfig) {
      setConfig(prev => ({
        ...prev,
        ...initialConfig,
        roleSpecialization: initialConfig.roleSpecialization ?? null,
        roleMastery: initialConfig.roleMastery ?? null,
        paragonSnubfighter: initialConfig.paragonSnubfighter ?? null,
        paragonTransportStats: initialConfig.paragonTransportStats ?? [],
        extraSuiteCapacity: initialConfig.extraSuiteCapacity ?? 0,
      }))
    }
  }, [initialConfig])

  const [savedMessage, setSavedMessage] = useState(false)
  const [internalPendingTier, setInternalPendingTier] = useState<number | null>(null)

  const activePendingTier = externalPendingTier ?? internalPendingTier

  const currentSizeKey = ((config.size as string)?.toLowerCase() ?? "medium") as ShipSize
  const activeRules = SHIP_SIZE_RULES[currentSizeKey] || SHIP_SIZE_RULES.medium
  const activeTypeRules = SHIP_TYPE_RULES[config.shipType] || null

  const getRawModifier = (score: number) => Math.floor((score - 10) / 2)

  const paragonBoost = useMemo(() => {
    const boosts = { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 }
    if (config.paragonSnubfighter && PARAGON_SNUBFIGHTERS[config.paragonSnubfighter]) {
      const stat = PARAGON_SNUBFIGHTERS[config.paragonSnubfighter].boostedStat
      boosts[stat as keyof typeof boosts] += 2
    }
    if (config.paragonTransportStats) {
      config.paragonTransportStats.forEach(stat => {
        if (stat in boosts) boosts[stat as keyof typeof boosts] += 2
      })
    }
    return boosts
  }, [config.paragonSnubfighter, config.paragonTransportStats])

  const effectiveStats = useMemo(() => {
    return {
      strength: config.stats.strength + config.tierStatBoosts.strength + paragonBoost.strength + (activeTypeRules?.strengthMod || 0),
      dexterity: config.stats.dexterity + config.tierStatBoosts.dexterity + paragonBoost.dexterity + (activeRules.dexterityMod || 0) + (activeTypeRules?.dexterityMod || 0),
      constitution: config.stats.constitution + config.tierStatBoosts.constitution + paragonBoost.constitution + (activeRules.constitutionMod || 0) + (activeTypeRules?.constitutionMod || 0),
      intelligence: config.stats.intelligence + config.tierStatBoosts.intelligence + paragonBoost.intelligence + (activeTypeRules?.intelligenceMod || 0),
      wisdom: config.stats.wisdom + config.tierStatBoosts.wisdom + paragonBoost.wisdom + (activeTypeRules?.wisdomMod || 0),
      charisma: config.stats.charisma + config.tierStatBoosts.charisma + paragonBoost.charisma + (activeTypeRules?.charismaMod || 0),
    }
  }, [config.stats, config.tierStatBoosts, paragonBoost, activeRules, activeTypeRules])

  const computedBaseShields = useMemo(() => {
    const hitDieSides = parseInt(activeRules.hitDie.match(/d(\d+)/)?.[1] ?? "8", 10)
    const startHdCount = activeRules.startHd
    const averageRoll = activeRules.avgVal
    const strengthMod = getRawModifier(effectiveStats.strength)

    let totalShields = 0
    for (let i = 0; i < startHdCount; i++) {
      if (i === 0) {
        totalShields += hitDieSides + strengthMod
      } else {
        totalShields += averageRoll + strengthMod
      }
    }

    Object.entries(config.tierRolls).forEach(([t, roll]) => {
      totalShields += roll.shield + strengthMod
    })
    
    return Math.max(1, totalShields)
  }, [activeRules.hitDie, activeRules.startHd, activeRules.avgVal, config.tierRolls, effectiveStats.strength])

  const computedBaseHull = useMemo(() => {
    const hitDieSides = parseInt(activeRules.hitDie.match(/d(\d+)/)?.[1] ?? "8", 10)
    const startHdCount = activeRules.startHd
    const averageRoll = activeRules.avgVal
    const constitutionMod = getRawModifier(effectiveStats.constitution)

    let totalHull = 0
    for (let i = 0; i < startHdCount; i++) {
      if (i === 0) {
        totalHull += hitDieSides + constitutionMod
      } else {
        totalHull += averageRoll + constitutionMod
      }
    }

    Object.entries(config.tierRolls).forEach(([t, roll]) => {
      totalHull += roll.hull + constitutionMod
    })
    
    return Math.max(1, totalHull)
  }, [activeRules.hitDie, activeRules.startHd, activeRules.avgVal, config.tierRolls, effectiveStats.constitution])

  const computedMaxShields = useMemo(() => {
    const multiplier = SHIELD_MULTIPLIERS[config.shieldType] ?? 1.0
    return Math.max(1, Math.round(computedBaseShields * multiplier))
  }, [computedBaseShields, config.shieldType])

  useEffect(() => {
    setConfig(prev => {
      if (prev.baseShields === computedBaseShields && prev.maxShields === computedMaxShields && prev.baseHull === computedBaseHull) {
        return prev
      }
      return { 
        ...prev, 
        baseHull: computedBaseHull,
        baseShields: computedBaseShields,
        maxShields: computedMaxShields 
      }
    })
  }, [computedBaseShields, computedMaxShields, computedBaseHull])

  const currentPointsSpent = useMemo(() => Object.values(config.stats).reduce((total, score) => total + (POINT_BUY_COSTS[score] ?? 0), 0), [config.stats])
  const remainingPoints = 27 - currentPointsSpent

  const computedSavingThrows = useMemo(() => {
    const keys = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const
    const newThrows = {} as ShipConfig["savingThrows"]
    
    const isMedium = currentSizeKey === "medium"
    const isNimble = isMedium && (config.tier >= 2)
    const halfDexMod = Math.max(1, Math.floor(getRawModifier(effectiveStats.dexterity) / 2))

    keys.forEach((key) => {
      let rawMod = getRawModifier(effectiveStats[key])
      const isProficient = config.saveProficiencies[key]
      
      if (isNimble && key !== "dexterity") {
        rawMod += halfDexMod
      }

      newThrows[key] = rawMod + (isProficient ? config.proficiencyBonus : 0)
    })
    return newThrows
  }, [effectiveStats, config.saveProficiencies, config.proficiencyBonus, currentSizeKey, config.tier])

  const computedSkills = useMemo(() => {
    const calculated: Record<string, number> = {}
    Object.entries(config.skillTiers).forEach(([skillName, tier]) => {
      const governingStat = Object.entries(STAT_SKILLS_MAP).find(([_, skills]) => (skills as readonly string[]).includes(skillName))?.[0] as keyof ShipConfig["stats"] | undefined
      const statScore = governingStat ? effectiveStats[governingStat] : 8
      let baseMod = getRawModifier(statScore)

      if (config.roleSpecialization === "Scout" && (skillName === "scan" || skillName === "probe")) {
        baseMod += 1
      }

      if (config.roleMastery === "Scout" && skillName === "astrogation") {
        baseMod += 2
      }

      if (config.roleMastery === "Scrambler" && skillName === "interfere") {
        baseMod += 2
      }

      const pb = config.proficiencyBonus
      let bonusMultiplier = 0
      if (tier === "proficient") bonusMultiplier = 1
      else if (["expert", "mastery", "high-mastery", "grand-mastery"].includes(tier)) bonusMultiplier = 2
      calculated[skillName] = baseMod + (bonusMultiplier * pb)
    })
    return calculated
  }, [config.skillTiers, config.roleSpecialization, config.roleMastery, effectiveStats, config.proficiencyBonus])

  // --- CATALOG-DRIVEN MANUFACTURERS AND MODELS ---
  const manufacturers = useMemo(() => {
    return ALL_MANUFACTURERS
  }, [])

  const currentModels = useMemo(() => {
    return getModelsForManufacturer(config.manufacturer)
  }, [config.manufacturer])

  const activeCatalogShip = useMemo(() => {
    return findCatalogShip(config.manufacturer, config.model)
  }, [config.manufacturer, config.model])

  const availableShipTypes = useMemo(() => {
    const matchingRoles = Object.values(SHIP_TYPE_RULES)
      .filter(rule => rule.sizeCategory === currentSizeKey)
      .map(rule => rule.name)
    
    return matchingRoles.length > 0 ? matchingRoles : ["Light Transport", "Fighter", "Freighter"]
  }, [currentSizeKey])

  const handleTierChangeRequested = (newTier: number) => {
    if (newTier < 0 || newTier > 5) return

    if (newTier > config.tier) {
      setInternalPendingTier(newTier)
    } else {
      const updatedRolls = { ...config.tierRolls }
      const updatedHistory = { ...(config.tierAsiHistory || {}) }

      for (let t = config.tier; t > newTier; t--) {
        delete updatedRolls[t]
        delete updatedHistory[t]
      }

      const newBoosts = { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 }
      Object.values(updatedHistory).forEach((historyEntry) => {
        Object.entries(historyEntry).forEach(([st, val]) => {
          if (st in newBoosts) {
            newBoosts[st as keyof typeof newBoosts] += val
          }
        })
      })

      const nextConfig: ShipConfig = {
        ...config,
        tier: newTier,
        powerDieType: TIER_POWER_DIE_MAP[newTier] || "d1",
        tierRolls: updatedRolls,
        tierAsiHistory: updatedHistory,
        tierStatBoosts: newBoosts,
        roleSpecialization: newTier < 2 ? null : config.roleSpecialization,
        roleMastery: newTier < 4 ? null : config.roleMastery,
        paragonSnubfighter: newTier < 5 ? null : config.paragonSnubfighter,
        paragonTransportStats: newTier < 5 ? [] : config.paragonTransportStats,
        extraSuiteCapacity: newTier < 2 ? 0 : config.extraSuiteCapacity,
        baseHull: computedBaseHull,
        baseShields: computedBaseShields,
        maxShields: computedMaxShields,
        savingThrows: computedSavingThrows,
        skills: computedSkills
      }

      setConfig(nextConfig)
      onSaveConfig(nextConfig)
    }
  }

  const handleLevelUpComplete = (
    rollData: { hull: number, shield: number }, 
    sessionAsiGains: Record<string, number>,
    specializationData?: RoleSpecialization | null,
    masteryData?: RoleMastery | null,
    paragonData?: ParagonSnubfighter | null,
    paragonTransportData?: string[] | null
  ) => {
    if (activePendingTier === null) return

    const tierToApply = activePendingTier

    const cleanHistory: Record<number, Record<string, number>> = {}
    Object.entries(config.tierAsiHistory || {}).forEach(([tStr, entry]) => {
      const t = Number(tStr)
      if (t < tierToApply) {
        cleanHistory[t] = entry
      }
    })
    cleanHistory[tierToApply] = sessionAsiGains

    const newTierBoosts = { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 }
    Object.values(cleanHistory).forEach((historyEntry) => {
      Object.entries(historyEntry).forEach(([st, val]) => {
        if (st in newTierBoosts) {
          newTierBoosts[st as keyof typeof newTierBoosts] += val
        }
      })
    })

    const updatedRolls = { ...config.tierRolls, [tierToApply]: rollData }
    const updatedSpecialization = specializationData !== undefined ? specializationData : config.roleSpecialization
    const updatedMastery = masteryData !== undefined ? masteryData : config.roleMastery
    const updatedParagon = paragonData !== undefined ? paragonData : config.paragonSnubfighter
    const updatedParagonTransport = paragonTransportData !== undefined ? paragonTransportData : config.paragonTransportStats

    let updatedExtraSuite = config.extraSuiteCapacity || 0
    if (updatedSpecialization === "Shuttle") {
      updatedExtraSuite = Math.max(updatedExtraSuite, 1)
    }

    const nextConfig: ShipConfig = {
      ...config,
      tier: tierToApply,
      powerDieType: TIER_POWER_DIE_MAP[tierToApply] || "d1",
      tierRolls: updatedRolls,
      tierAsiHistory: cleanHistory,
      tierStatBoosts: newTierBoosts,
      roleSpecialization: updatedSpecialization,
      roleMastery: updatedMastery,
      paragonSnubfighter: updatedParagon,
      paragonTransportStats: updatedParagonTransport || [],
      extraSuiteCapacity: updatedExtraSuite,
      baseHull: computedBaseHull,
      baseShields: computedBaseShields,
      maxShields: computedMaxShields,
      savingThrows: computedSavingThrows,
      skills: computedSkills
    }

    setConfig(nextConfig)
    onSaveConfig(nextConfig)
    
    setInternalPendingTier(null)
    if (onClearPendingTier) onClearPendingTier()
  }

  const handleLevelUpCancel = () => {
    setInternalPendingTier(null)
    if (onClearPendingTier) onClearPendingTier()
  }

  const handleManufacturerChange = (newManufacturer: string) => {
    const available = getModelsForManufacturer(newManufacturer)
    const firstShip = available[0]
    
    const newModel = firstShip?.model || ""
    const newSize = firstShip?.size || config.size
    const newSizeKey = (newSize as string).toLowerCase() as ShipSize
    
    const validRolesForNewSize = Object.values(SHIP_TYPE_RULES)
      .filter(rule => rule.sizeCategory === newSizeKey)
      .map(rule => rule.name)
    
    const nextShipType = validRolesForNewSize.includes(config.shipType) ? config.shipType : (validRolesForNewSize[0] || config.shipType)

    setConfig(prev => ({
      ...prev,
      manufacturer: newManufacturer,
      model: newModel,
      size: newSize,
      shipType: nextShipType,
    }))
  }

  const handleModelChange = (newModel: string) => {
    const matched = findCatalogShip(config.manufacturer, newModel)
    if (!matched) {
      setConfig(prev => ({ ...prev, model: newModel }))
      return
    }

    const newSize = matched.size
    const newSizeKey = (newSize as string).toLowerCase() as ShipSize

    const validRolesForNewSize = Object.values(SHIP_TYPE_RULES)
      .filter(rule => rule.sizeCategory === newSizeKey)
      .map(rule => rule.name)

    const nextShipType = validRolesForNewSize.includes(config.shipType) ? config.shipType : (validRolesForNewSize[0] || config.shipType)

    setConfig(prev => ({
      ...prev,
      model: newModel,
      size: newSize,
      shipType: nextShipType,
    }))
  }

  const handleInputChange = (field: keyof ShipConfig, value: any) => {
    setConfig(prev => {
      if (field === "size") {
        const newSizeKey = (value as string).toLowerCase() as ShipSize
        const validRolesForNewSize = Object.values(SHIP_TYPE_RULES)
          .filter(rule => rule.sizeCategory === newSizeKey)
          .map(rule => rule.name)
        
        const nextShipType = validRolesForNewSize.includes(prev.shipType) ? prev.shipType : (validRolesForNewSize[0] || prev.shipType)
        
        return { ...prev, size: value, shipType: nextShipType }
      }

      return { ...prev, [field]: value }
    })
  }

  const handleApplyRecommendedDefaults = () => {
    if (!activeTypeRules) return
    setConfig(prev => ({
      ...prev,
      reactorType: activeTypeRules.recommendedReactor || prev.reactorType,
      powerCoupling: activeTypeRules.recommendedPowerCoupling || prev.powerCoupling,
      armorType: activeTypeRules.recommendedArmor || prev.armorType,
      shieldType: activeTypeRules.recommendedShields || prev.shieldType,
    }))
  }

  const handleStatChange = (statKey: keyof ShipConfig["stats"], newScore: number) => {
    if (newScore < 8 || newScore > 15) return
    const oldScore = config.stats[statKey]
    const costDifference = (POINT_BUY_COSTS[newScore] ?? 0) - (POINT_BUY_COSTS[oldScore] ?? 0)
    if (costDifference > 0 && currentPointsSpent + costDifference > 27) return 
    setConfig(prev => ({ ...prev, stats: { ...prev.stats, [statKey]: newScore } }))
  }

  const handleProficiencyToggle = (statKey: keyof ShipConfig["saveProficiencies"]) => {
    setConfig(prev => ({ ...prev, saveProficiencies: { ...prev.saveProficiencies, [statKey]: !prev.saveProficiencies[statKey] } }))
  }

  const handleSkillTierChange = (skillKey: string, tier: SkillProficiencyTier) => {
    setConfig(prev => ({ ...prev, skillTiers: { ...prev.skillTiers, [skillKey]: tier } }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const finalConfig: ShipConfig = { 
      ...config, 
      name: config.name, 
      baseHull: computedBaseHull,
      baseShields: computedBaseShields,
      maxShields: computedMaxShields,
      savingThrows: computedSavingThrows, 
      skills: computedSkills 
    }
    onSaveConfig(finalConfig)
    setSavedMessage(true)
    setTimeout(() => setSavedMessage(false), 3000)
  }

  const handleTriggerFullReset = (day: number, funds: number) => {
    onFullReset(day, funds)
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      {activePendingTier !== null && (
        <LevelUpModal 
          newTier={activePendingTier}
          shipSize={currentSizeKey}
          baseStats={{
            strength: config.stats.strength + (activeTypeRules?.strengthMod || 0),
            dexterity: config.stats.dexterity + (activeRules.dexterityMod || 0) + (activeTypeRules?.dexterityMod || 0),
            constitution: config.stats.constitution + (activeRules.constitutionMod || 0) + (activeTypeRules?.constitutionMod || 0),
            intelligence: config.stats.intelligence + (activeTypeRules?.intelligenceMod || 0),
            wisdom: config.stats.wisdom + (activeTypeRules?.wisdomMod || 0),
            charisma: config.stats.charisma + (activeTypeRules?.charismaMod || 0),
          }}
          currentBoosts={config.tierStatBoosts}
          currentSpecialization={config.roleSpecialization}
          currentMastery={config.roleMastery}
          currentParagon={config.paragonSnubfighter}
          currentParagonTransport={config.paragonTransportStats}
          onComplete={handleLevelUpComplete}
          onCancel={handleLevelUpCancel}
        />
      )}

      <div className="flex items-center justify-between border-b border-bridge-border pb-3">
        <div>
          <h2 className="text-glow-cyan text-lg font-bold tracking-[0.15em] text-cyan-neon">MASTER SHIP SETUP & BASE SPECIFICATIONS</h2>
          <p className="text-[10px] tracking-[0.3em] text-muted-foreground/60">REGISTRY CORE // SOURCE OF TRUTH CONFIGURATION</p>
        </div>
        <div className="flex items-center gap-3">
          {savedMessage && <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold tracking-wider animate-pulse"><Check className="w-4 h-4" /> CONFIG SAVED & BROADCASTED</span>}
          <span className="rounded-sm border border-cyan-neon/50 bg-cyan-neon/10 px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] text-cyan-neon text-glow-cyan">STATUS: ACTIVE REGISTRY</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <section className="rounded-md border border-bridge-border bg-bridge-panel p-4">
          <h3 className="mb-4 text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase border-b border-bridge-border/60 pb-1 flex items-center gap-2">
            <Rocket className="w-4 h-4" /> General Vessel Identification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-widest text-muted-foreground uppercase">Ship Name</label>
              <input type="text" value={config.name} onChange={(e) => handleInputChange("name", e.target.value)} className="rounded border border-bridge-border bg-black/50 px-3 py-2 text-cyan-neon text-xs focus:outline-none focus:border-cyan-neon" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-widest text-muted-foreground uppercase">Manufacturer</label>
              <select value={config.manufacturer} onChange={(e) => handleManufacturerChange(e.target.value)} className="rounded border border-bridge-border bg-black/50 px-3 py-2 text-cyan-neon text-xs focus:outline-none focus:border-cyan-neon font-mono">
                <option value="" disabled>-- Select Manufacturer --</option>
                {manufacturers.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-widest text-muted-foreground uppercase">Ship Model</label>
              <select value={config.model} onChange={(e) => handleModelChange(e.target.value)} className="rounded border border-bridge-border bg-black/50 px-3 py-2 text-cyan-neon text-xs focus:outline-none focus:border-cyan-neon font-mono">
                <option value="" disabled>-- Select Model --</option>
                {currentModels.map((item) => (
                  <option key={item.model} value={item.model}>
                    {item.model} ({item.rawSize})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-widest text-muted-foreground uppercase">Ship Size (Auto)</label>
              <select value={config.size} onChange={(e) => handleInputChange("size", e.target.value)} className="rounded border border-bridge-border bg-black/50 px-3 py-2 text-cyan-neon text-xs focus:outline-none focus:border-cyan-neon font-mono">
                {SHIP_SIZES.map((sz) => <option key={sz} value={sz}>{sz}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-widest text-muted-foreground uppercase">Ship Role / Type</label>
              <select value={config.shipType} onChange={(e) => handleInputChange("shipType", e.target.value)} className="rounded border border-bridge-border bg-black/50 px-3 py-2 text-cyan-neon text-xs focus:outline-none focus:border-cyan-neon font-mono">
                {availableShipTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* CATALOG MODEL NOTES CARD */}
          {activeCatalogShip && (
            <div className="mt-3 flex items-start gap-2.5 rounded border border-cyan-500/30 bg-black/40 p-2.5 text-xs font-mono">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-cyan-300 uppercase tracking-wider block text-[10px]">
                  CHASSIS PROFILE: {activeCatalogShip.model} ({activeCatalogShip.rawSize})
                </span>
                <p className="text-slate-300 text-[11px] mt-0.5 leading-snug">
                  {activeCatalogShip.notes}
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-bridge-border/40 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-widest text-muted-foreground uppercase">Reactor Type</label>
              <select value={config.reactorType} onChange={(e) => handleInputChange("reactorType", e.target.value)} className="rounded border border-bridge-border bg-black/50 px-3 py-2 text-cyan-neon text-xs focus:outline-none focus:border-cyan-neon font-mono">
                <option value="" disabled>-- Select Reactor --</option>
                {REACTOR_TYPES.map((rt) => <option key={rt} value={rt}>{rt}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-widest text-muted-foreground uppercase">Power Coupling</label>
              <select value={config.powerCoupling} onChange={(e) => handleInputChange("powerCoupling", e.target.value)} className="rounded border border-bridge-border bg-black/50 px-3 py-2 text-cyan-neon text-xs focus:outline-none focus:border-cyan-neon font-mono">
                <option value="" disabled>-- Select Coupling --</option>
                {POWER_COUPLINGS.map((pc) => <option key={pc} value={pc}>{pc}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-widest text-muted-foreground uppercase">Armor Option</label>
              <select value={config.armorType} onChange={(e) => handleInputChange("armorType", e.target.value)} className="rounded border border-bridge-border bg-black/50 px-3 py-2 text-cyan-neon text-xs focus:outline-none focus:border-cyan-neon font-mono">
                <option value="" disabled>-- Select Armor --</option>
                {ARMOR_TYPES.map((at) => <option key={at} value={at}>{at}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-widest text-muted-foreground uppercase">Shield Option</label>
              <select value={config.shieldType} onChange={(e) => handleInputChange("shieldType", e.target.value)} className="rounded border border-bridge-border bg-black/50 px-3 py-2 text-cyan-neon text-xs focus:outline-none focus:border-cyan-neon font-mono">
                <option value="" disabled>-- Select Shields --</option>
                {SHIELD_TYPES.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
          </div>

          {activeTypeRules && (
            <div className="mt-3 p-2.5 rounded bg-black/50 border border-cyan-neon/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 font-mono text-[11px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1 text-cyan-neon font-bold uppercase tracking-wider text-[10px]">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Recommended Defaults ({config.shipType || "Chassis"}):
                </span>
                
                <button
                  type="button"
                  onClick={() => handleInputChange("reactorType", activeTypeRules.recommendedReactor)}
                  className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    config.reactorType === activeTypeRules.recommendedReactor
                      ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-300"
                      : "border-bridge-border/60 bg-black/60 text-slate-300 hover:border-cyan-neon/60 hover:text-cyan-neon"
                  }`}
                  title="Click to apply recommended Reactor"
                >
                  Reactor: <strong className="text-white">{activeTypeRules.recommendedReactor}</strong>
                </button>

                <button
                  type="button"
                  onClick={() => handleInputChange("powerCoupling", activeTypeRules.recommendedPowerCoupling)}
                  className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    config.powerCoupling === activeTypeRules.recommendedPowerCoupling
                      ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-300"
                      : "border-bridge-border/60 bg-black/60 text-slate-300 hover:border-cyan-neon/60 hover:text-cyan-neon"
                  }`}
                  title="Click to apply recommended Power Coupling"
                >
                  Coupling: <strong className="text-white">{activeTypeRules.recommendedPowerCoupling}</strong>
                </button>

                <button
                  type="button"
                  onClick={() => handleInputChange("armorType", activeTypeRules.recommendedArmor)}
                  className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    config.armorType === activeTypeRules.recommendedArmor
                      ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-300"
                      : "border-bridge-border/60 bg-black/60 text-slate-300 hover:border-cyan-neon/60 hover:text-cyan-neon"
                  }`}
                  title="Click to apply recommended Armor"
                >
                  Armor: <strong className="text-white">{activeTypeRules.recommendedArmor}</strong>
                </button>

                {activeTypeRules.recommendedShields && (
                  <button
                    type="button"
                    onClick={() => handleInputChange("shieldType", activeTypeRules.recommendedShields)}
                    className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      config.shieldType === activeTypeRules.recommendedShields
                        ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-300"
                        : "border-bridge-border/60 bg-black/60 text-slate-300 hover:border-cyan-neon/60 hover:text-cyan-neon"
                    }`}
                    title="Click to apply recommended Shields"
                  >
                    Shields: <strong className="text-white">{activeTypeRules.recommendedShields}</strong>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleApplyRecommendedDefaults}
                className="shrink-0 rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-cyan-neon/20 border border-cyan-neon/60 text-cyan-neon hover:bg-cyan-neon/30 transition-all cursor-pointer"
              >
                Apply Role Defaults
              </button>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-bridge-border/40 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-widest text-muted-foreground uppercase">Ship Tier / Scale (0-5)</label>
              <input 
                type="number" 
                min={0} 
                max={5} 
                value={config.tier} 
                onChange={(e) => handleTierChangeRequested(Number(e.target.value))} 
                className="rounded border border-bridge-border bg-black/50 px-3 py-2 text-cyan-neon text-xs focus:outline-none focus:border-cyan-neon font-mono" 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-widest text-muted-foreground uppercase">Proficiency Bonus</label>
              <input 
                type="number" 
                value={config.proficiencyBonus} 
                onChange={(e) => handleInputChange("proficiencyBonus", Number(e.target.value))} 
                className="rounded border border-bridge-border bg-black/50 px-3 py-2 text-cyan-neon text-xs focus:outline-none focus:border-cyan-neon font-mono" 
                min={2} 
                max={9} 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-widest text-muted-foreground uppercase">Ship Cost (Cr)</label>
              <input 
                type="number" 
                value={config.shipCost} 
                onChange={(e) => handleInputChange("shipCost", Number(e.target.value))} 
                className="rounded border border-bridge-border bg-black/50 px-3 py-2 text-cyan-neon text-xs focus:outline-none focus:border-cyan-neon font-mono" 
                min={0} 
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-widest text-muted-foreground uppercase">Amount Paid (Cr)</label>
              <input 
                type="number" 
                value={config.paidAmount} 
                onChange={(e) => handleInputChange("paidAmount", Number(e.target.value))} 
                className="rounded border border-bridge-border bg-black/50 px-3 py-2 text-cyan-neon text-xs focus:outline-none focus:border-cyan-neon font-mono" 
                min={0} 
              />
            </div>
          </div>

          {(config.roleSpecialization || config.roleMastery || config.paragonSnubfighter || (config.paragonTransportStats && config.paragonTransportStats.length > 0)) && (
            <div className="mt-4 pt-4 border-t border-bridge-border/40 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {config.roleSpecialization && (
                <div className="flex items-center gap-2 bg-black/30 p-2.5 rounded border border-cyan-500/30">
                  <Crosshair className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Tier 2 Specialization</span>
                    <span className="text-xs font-mono font-bold text-cyan-neon">{config.roleSpecialization}</span>
                  </div>
                </div>
              )}
              {config.roleMastery && (
                <div className="flex items-center gap-2 bg-black/30 p-2.5 rounded border border-cyan-500/30">
                  <Sparkles className="w-4 h-4 text-cyan-300 shrink-0" />
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Tier 4 Role Mastery</span>
                    <span className="text-xs font-mono font-bold text-cyan-neon">{config.roleMastery}</span>
                  </div>
                </div>
              )}
              {config.paragonSnubfighter && (
                <div className="flex items-center gap-2 bg-black/30 p-2.5 rounded border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                  <Wind className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-emerald-300 block">Tier 5 Paragon Snubfighter</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">{config.paragonSnubfighter}</span>
                  </div>
                </div>
              )}
              {config.paragonTransportStats && config.paragonTransportStats.length > 0 && (
                <div className="flex items-center gap-2 bg-black/30 p-2.5 rounded border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                  <Wind className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-emerald-300 block">Tier 5 Paragon Transport</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">+{config.paragonTransportStats.join(" & ").toUpperCase()}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* CORE ATTRIBUTES SECTION */}
        <section className="rounded-md border border-bridge-border bg-bridge-panel p-4">
          <div className="flex flex-col gap-3 mb-4 border-b border-bridge-border/60 pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase flex items-center gap-2">
                <Cpu className="w-4 h-4" /> Vessel Core Attributes & System Skills
              </h3>
              <div className="text-[10px] tracking-widest font-mono text-cyan-neon/80 bg-cyan-neon/10 border border-cyan-neon/30 px-2.5 py-1 rounded">
                POINTS REMAINING: <span className="font-bold text-white">{remainingPoints}</span> / 27
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(config.stats).map(([statKey, baseScore]) => {
              const isProficientSave = config.saveProficiencies[statKey as keyof ShipConfig["saveProficiencies"]]
              const associatedSkills = STAT_SKILLS_MAP[statKey as keyof typeof STAT_SKILLS_MAP] || []
              
              const effectiveScore = effectiveStats[statKey as keyof ShipConfig["stats"]]
              const sizeMod = statKey === 'dexterity' ? (activeRules.dexterityMod || 0) : statKey === 'constitution' ? (activeRules.constitutionMod || 0) : 0
              const roleMod = activeTypeRules ? ((activeTypeRules[`${statKey}Mod` as keyof typeof activeTypeRules] as number) || 0) : 0
              const tierMod = config.tierStatBoosts[statKey as keyof typeof config.tierStatBoosts] || 0
              const pMod = paragonBoost[statKey as keyof typeof paragonBoost] || 0

              const finalMod = getRawModifier(effectiveScore)
              const formattedFinalMod = finalMod >= 0 ? `+${finalMod}` : `${finalMod}`

              return (
                <div key={statKey} className="flex flex-col gap-3 rounded border border-bridge-border/60 bg-black/40 p-3">
                  <div className="flex items-center justify-between border-b border-bridge-border/40 pb-2">
                    <label className="text-xs tracking-widest text-cyan-neon uppercase font-bold">{statKey}</label>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => handleStatChange(statKey as keyof ShipConfig["stats"], baseScore - 1)} disabled={baseScore <= 8} className="w-6 h-6 rounded bg-black/60 border border-bridge-border text-cyan-neon text-xs font-bold hover:bg-cyan-neon/20 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">-</button>
                      <span className="w-6 text-center text-xs font-mono font-bold text-white">{baseScore}</span>
                      <button type="button" onClick={() => handleStatChange(statKey as keyof ShipConfig["stats"], baseScore + 1)} disabled={baseScore >= 15 || (POINT_BUY_COSTS[baseScore + 1] - POINT_BUY_COSTS[baseScore]) > remainingPoints} className="w-6 h-6 rounded bg-black/60 border border-bridge-border text-cyan-neon text-xs font-bold hover:bg-cyan-neon/20 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">+</button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 my-1 rounded bg-black/30 p-2 text-[10px] font-mono border border-bridge-border/30">
                    <div className="flex justify-between text-slate-400">
                      <span>Base Points</span>
                      <span>{baseScore}</span>
                    </div>
                    {sizeMod !== 0 && (
                      <div className={`flex justify-between ${sizeMod > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        <span>Chassis Mod</span>
                        <span>{sizeMod > 0 ? `+${sizeMod}` : sizeMod}</span>
                      </div>
                    )}
                    {roleMod !== 0 && (
                      <div className={`flex justify-between ${roleMod > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        <span>Role Mod</span>
                        <span>{roleMod > 0 ? `+${roleMod}` : roleMod}</span>
                      </div>
                    )}
                    {tierMod !== 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Tier ASI</span>
                        <span>+{tierMod}</span>
                      </div>
                    )}
                    {pMod !== 0 && (
                      <div className="flex justify-between text-emerald-300 font-bold">
                        <span>Paragon Snubfighter</span>
                        <span>+{pMod}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-bridge-border/40 pt-1 mt-1 font-bold text-cyan-100">
                      <span>Effective Score</span>
                      <span>{effectiveScore}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mt-1">
                    <span>MOD: <strong className="text-cyan-neon text-sm">{formattedFinalMod}</strong></span>
                    <div className="flex items-center gap-1.5">
                      <label htmlFor={`save-${statKey}`} className="cursor-pointer uppercase text-[9px]">Saving Throw</label>
                      <input id={`save-${statKey}`} type="checkbox" checked={isProficientSave} onChange={() => handleProficiencyToggle(statKey as keyof ShipConfig["saveProficiencies"])} className="w-3 h-3 rounded border-bridge-border bg-black/60 text-cyan-neon focus:ring-0 cursor-pointer accent-cyan-500" />
                    </div>
                  </div>

                  <div className="mt-1 flex flex-col gap-2 pt-2 border-t border-bridge-border/30">
                    <span className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-1"><Award className="w-3 h-3 text-cyan-400" /> Associated Skills</span>
                    {associatedSkills.map((skillName) => {
                      const currentTier = config.skillTiers[skillName as keyof ShipConfig["skillTiers"]] || "none"
                      const currentMod = computedSkills[skillName] ?? finalMod
                      const formattedMod = currentMod >= 0 ? `+${currentMod}` : `${currentMod}`
                      const isScoutBoosted = config.roleSpecialization === "Scout" && (skillName === "scan" || skillName === "probe")
                      const isScoutMastery = config.roleMastery === "Scout" && skillName === "astrogation"
                      const isScramblerMastery = config.roleMastery === "Scrambler" && skillName === "interfere"

                      return (
                        <div key={skillName} className="flex flex-col gap-1 rounded bg-black/50 p-2 border border-bridge-border/30">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-neon/90 flex items-center gap-1">
                              {skillName}
                              {isScoutBoosted && <span className="text-[8px] text-amber-300 font-bold">(+1 Scout)</span>}
                              {isScoutMastery && <span className="text-[8px] text-cyan-300 font-bold">(+2 Mastery)</span>}
                              {isScramblerMastery && <span className="text-[8px] text-cyan-300 font-bold">(+2 Scrambler)</span>}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-white bg-cyan-950/40 border border-cyan-800/50 px-1.5 py-0.5 rounded">{formattedMod}</span>
                          </div>
                          <select value={currentTier} onChange={(e) => handleSkillTierChange(skillName, e.target.value as SkillProficiencyTier)} className="rounded border border-bridge-border bg-black/80 px-2 py-1 text-[10px] text-cyan-neon font-mono focus:outline-none focus:border-cyan-neon">
                            <option value="none">Untrained</option>
                            <option value="proficient">Proficient (+PB)</option>
                            <option value="expert">Expert (+2×PB)</option>
                            <option value="mastery">Mastery (+2×PB, Adv)</option>
                            <option value="high-mastery">High-Mastery (+2×PB, Adv, Reroll 1)</option>
                            <option value="grand-mastery">Grand Mastery (+2×PB, Adv, Reroll Both)</option>
                          </select>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* AUTO STATS SECTION */}
        <section className="rounded-md border border-bridge-border bg-bridge-panel p-4">
          <h3 className="mb-4 text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase border-b border-bridge-border/60 pb-1 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Auto-Calculated Stats
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-widest text-muted-foreground uppercase flex items-center gap-1"><Heart className="w-3 h-3 text-rose-400" /> Base Hull Points</label>
              <input type="number" value={config.baseHull} readOnly className="rounded border border-bridge-border/40 bg-black/20 px-3 py-2 text-cyan-neon/80 text-xs font-mono cursor-not-allowed opacity-75 focus:outline-none font-bold" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-widest text-muted-foreground uppercase flex items-center gap-1"><Shield className="w-3 h-3 text-cyan-400" /> Base Shields</label>
              <input type="number" value={config.baseShields} readOnly className="rounded border border-bridge-border/40 bg-black/20 px-3 py-2 text-cyan-neon/80 text-xs font-mono cursor-not-allowed opacity-75 focus:outline-none font-bold" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-widest text-muted-foreground uppercase flex items-center gap-1"><Shield className="w-3 h-3 text-cyan-400" /> Max Shields Capacity</label>
              <input type="number" value={config.maxShields} readOnly className="rounded border border-bridge-border/40 bg-black/20 px-3 py-2 text-cyan-neon/80 text-xs font-mono cursor-not-allowed opacity-75 focus:outline-none font-bold text-cyan-300" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-widest text-muted-foreground uppercase">Max Power Dice (Fixed)</label>
              <input type="number" value={config.maxPowerDice} readOnly className="rounded border border-bridge-border/40 bg-black/20 px-3 py-2 text-cyan-neon/80 text-xs font-mono cursor-not-allowed opacity-75 focus:outline-none font-bold" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-widest text-muted-foreground uppercase">Power Die Type (Tier-Mapped)</label>
              <input type="text" value={config.powerDieType} readOnly className="rounded border border-bridge-border/40 bg-black/20 px-3 py-2 text-cyan-neon/80 text-xs font-mono cursor-not-allowed opacity-75 focus:outline-none font-bold uppercase" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-widest text-muted-foreground uppercase">Reactor Recovery Rate</label>
              <input type="number" value={config.recoveryRate} readOnly className="rounded border border-bridge-border/40 bg-black/20 px-3 py-2 text-cyan-neon/80 text-xs font-mono cursor-not-allowed opacity-75 focus:outline-none" />
            </div>
          </div>
        </section>

        {/* BOTTOM SHIP SETUP SUMMARY PANEL */}
        <div className="rounded-md border border-bridge-border bg-bridge-panel p-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-bridge-border/60 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold tracking-wider text-cyan-neon uppercase">
                Vessel Baseline Specs: {activeRules.name} {config.shipType || "Class"}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Auto-applied base rules driven by ship size and role configuration.
              </p>
            </div>
            <span className="text-[10px] px-2 py-1 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-mono">
              COST MODIFIER: x{activeRules.modifier}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded bg-black/20 border border-bridge-border/40">
              <span className="text-muted-foreground block text-[10px]">HIT DIE & START HD</span>
              <span className="text-emerald-400 font-bold text-sm">{activeRules.hitDie}</span>
              <span className="text-muted-foreground block text-[10px] mt-0.5">Start: {activeRules.startHd} HD (Avg: {activeRules.avgVal})</span>
            </div>

            <div className="p-2.5 rounded bg-black/20 border border-bridge-border/40">
              <span className="text-muted-foreground block text-[10px]">BASE SPEED</span>
              <span className="text-blue-400 font-bold text-sm">
                {(activeTypeRules?.baseSpeed || 0) + (config.roleSpecialization === "Superiority Fighter" || config.roleSpecialization === "Courier" ? 50 : 0)} ft
              </span>
              <span className="text-muted-foreground block text-[10px] mt-0.5">
                Tactical Movement {config.roleSpecialization === "Superiority Fighter" || config.roleSpecialization === "Courier" ? "(+50 ft)" : ""}
              </span>
            </div>

            <div className="p-2.5 rounded bg-black/20 border border-bridge-border/40">
              <span className="text-muted-foreground block text-[10px]">MANEUVERABILITY</span>
              <span className="text-amber-400 font-bold text-sm">
                {Math.max(0, (activeTypeRules?.turningSpeed ?? activeRules.turningSpeed) - (config.roleMastery === "Superiority Fighter" ? 50 : 0))} ft
              </span>
              <span className="text-muted-foreground block text-[10px] mt-0.5">
                Turning Speed {config.roleMastery === "Superiority Fighter" ? "(-50 ft Spec)" : ""}
              </span>
            </div>

            <div className="p-2.5 rounded bg-black/20 border border-bridge-border/40">
              <span className="text-muted-foreground block text-[10px]">REFIT DOWNTIME</span>
              <span className="text-purple-400 font-bold text-sm">{activeRules.downtime}</span>
              <span className="text-muted-foreground block text-[10px] mt-0.5">Maintenance / Upgrade</span>
            </div>

            <div className="p-2.5 rounded bg-black/20 border border-bridge-border/40">
              <span className="text-muted-foreground block text-[10px]">FUEL TANK CAPACITY</span>
              <span className="text-sky-400 font-bold text-sm">{activeRules.fuelSize} Units</span>
              <span className="text-muted-foreground block text-[10px] mt-0.5">${activeRules.fuelCostPerUnit} per unit</span>
            </div>

            <div className="p-2.5 rounded bg-black/20 border border-bridge-border/40">
              <span className="text-muted-foreground block text-[10px]">CARGO & MOD CAPACITY</span>
              <span className="text-indigo-400 font-bold text-sm">{config.roleSpecialization === "Freighter" ? "50" : activeRules.baseCargoCap} Base</span>
              <span className="text-muted-foreground block text-[10px] mt-0.5">Mod Slots: {activeRules.modCapacity}</span>
            </div>

            <div className="col-span-2 p-2.5 rounded bg-black/20 border border-bridge-border/40">
              <span className="text-muted-foreground block text-[10px]">SAVING THROW PROFICIENCIES</span>
              <span className="text-foreground/90 font-medium text-xs mt-0.5 block">{activeRules.savingThrowNotes}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="rounded px-6 py-2.5 text-xs font-bold tracking-widest bg-cyan-neon/20 text-cyan-neon border border-cyan-neon/50 hover:bg-cyan-neon/30 transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)] uppercase cursor-pointer">
            Update Vessel Registry & Broadcast Settings
          </button>
        </div>
      </form>

      <ShipResetManager currentDay={currentDay} onConfirm={handleTriggerFullReset} />
    </div>
  )
}