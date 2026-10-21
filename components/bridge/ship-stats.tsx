"use client"

import { Panel } from "./panel"
import { type ShipConfig, type SkillProficiencyTier } from "./ship-setup"
import { SHIP_SIZE_RULES, SHIP_TYPE_RULES, ShipSize, PARAGON_SNUBFIGHTERS } from "@/lib/ship-rules"

const ABILITY_MAP = [
  { abbr: "STR", key: "strength" as const, name: "Strength", skills: ["boost", "ram"] },
  { abbr: "DEX", key: "dexterity" as const, name: "Dexterity", skills: ["hide", "maneuver"] },
  { abbr: "CON", key: "constitution" as const, name: "Constitution", skills: ["patch", "regulation"] },
  { abbr: "INT", key: "intelligence" as const, name: "Intelligence", skills: ["astrogation", "data", "probe"] },
  { abbr: "WIS", key: "wisdom" as const, name: "Wisdom", skills: ["scan"] },
  { abbr: "CHA", key: "charisma" as const, name: "Charisma", skills: ["impress", "interfere", "menace", "swindle"] },
]

function modifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

function getTierAbbr(tier?: SkillProficiencyTier | string): string {
  if (!tier || tier === "none") return ""
  switch (tier) {
    case "proficient": return "P"
    case "expert": return "E"
    case "mastery": return "M"
    case "high-mastery": return "HM"
    case "grand-mastery": return "GM"
    default: return ""
  }
}

function getSkillCalculation(
  baseMod: number, 
  tier: SkillProficiencyTier | undefined, 
  proficiencyBonus: number,
  isScoutBoosted: boolean = false,
  isScoutMastery: boolean = false,
  isScramblerMastery: boolean = false
) {
  const code = getTierAbbr(tier)
  const extraAdd = (isScoutBoosted ? 1 : 0) + (isScoutMastery ? 2 : 0) + (isScramblerMastery ? 2 : 0)

  if (!code) {
    const total = baseMod + extraAdd
    return { display: formatMod(total), tooltip: null, code: null }
  }

  let total = baseMod + extraAdd
  let label = ""
  switch (code) {
    case "P":
      total = baseMod + proficiencyBonus + extraAdd
      label = `Proficient: Base ${formatMod(baseMod)} + ${proficiencyBonus}${extraAdd > 0 ? ` + ${extraAdd} (Mastery/Spec)` : ""}`
      break
    case "E":
    case "M":
    case "HM":
    case "GM":
      total = baseMod + (proficiencyBonus * 2) + extraAdd
      label = `${code}: Base ${formatMod(baseMod)} + (${proficiencyBonus} × 2)${extraAdd > 0 ? ` + ${extraAdd} (Mastery/Spec)` : ""}`
      break
  }
  return { display: formatMod(total), tooltip: label, code }
}

interface AbilityBlockProps {
  abilityDef: typeof ABILITY_MAP[number]
  effectiveScore: number
  shipConfig?: ShipConfig
  proficiencyBonus: number
  strMod: number
  isIonized?: boolean
  isStalled?: boolean
  isStunned?: boolean
}

function AbilityBlock({ 
  abilityDef, 
  effectiveScore, 
  shipConfig, 
  proficiencyBonus, 
  strMod, 
  isIonized = false, 
  isStalled = false,
  isStunned = false
}: AbilityBlockProps) {
  const mod = modifier(effectiveScore)
  const isScoutSpec = shipConfig?.roleSpecialization === "Scout"
  const isScoutMastery = shipConfig?.roleMastery === "Scout"
  const isScramblerMastery = shipConfig?.roleMastery === "Scrambler"
  const isWis = abilityDef.abbr === "WIS"
  const isDex = abilityDef.abbr === "DEX"
  const isStr = abilityDef.abbr === "STR"

  const shipTier = typeof shipConfig?.tier === "number" ? shipConfig.tier : 0
  const shipSize = (shipConfig?.size || "small").toLowerCase()

  const hasAutoThrusters = isDex && shipSize === "small" && shipTier >= 3
  const autoThrustersBonus = hasAutoThrusters ? Math.max(1, Math.floor(strMod / 2)) : 0

  const isSaveProficient = shipConfig?.saveProficiencies?.[abilityDef.key] ?? false
  const effectiveSave = mod + (isSaveProficient ? proficiencyBonus : 0) + autoThrustersBonus

  const isAutoFailSave = (isStalled || isStunned) && (isStr || isDex)

  let passivePerception = 10
  let passiveLabel = ""
  if (isWis) {
    const scanTier = String(shipConfig?.skillTiers?.scan || "").toLowerCase().trim()
    const scoutAdd = isScoutSpec ? 1 : 0
    const isExpertiseOrMastery = ["expert", "mastery", "high-mastery", "grand-mastery", "e", "m", "hm", "gm"].includes(scanTier)
    const isProf = scanTier === "proficient" || scanTier === "p"
    
    const scanBonus = mod + (isExpertiseOrMastery ? proficiencyBonus * 2 : isProf ? proficiencyBonus : 0) + scoutAdd

    let masteryAdd = 0
    if (scanTier === "grand-mastery" || scanTier === "gm" || scanTier === "3") {
      masteryAdd = 15
      passiveLabel = "+15 GM"
    } else if (scanTier === "high-mastery" || scanTier === "hm" || scanTier === "2") {
      masteryAdd = 10
      passiveLabel = "+10 HM"
    } else if (scanTier === "mastery" || scanTier === "m" || scanTier === "1") {
      masteryAdd = 5
      passiveLabel = "+5 M"
    }

    passivePerception = 10 + scanBonus + masteryAdd
  }

  return (
    <div className={`flex flex-col justify-between rounded-sm border transition-colors ${
      isAutoFailSave
        ? "border-amber-400 bg-amber-950/25"
        : isIonized 
        ? "border-amber-400/70 bg-amber-950/20" 
        : "border-bridge-border bg-bridge-panel/60"
    }`}>
      <div>
        <div className="flex flex-col items-center gap-1 border-b border-bridge-border px-2 py-2 text-center">
          <span className="text-[9px] font-bold tracking-[0.2em] text-cyan-neon">
            {abilityDef.abbr}
          </span>
          <span className="text-glow-cyan text-2xl font-bold leading-none text-cyan-neon">
            {formatMod(mod)}
          </span>
          <span className="text-[9px] tracking-[0.15em] text-muted-foreground/70">
            SCORE {effectiveScore}
          </span>
        </div>

        <div className={`flex items-center justify-between border-b px-2 py-1.5 ${
          isAutoFailSave 
            ? "border-amber-400/50 bg-amber-950/50" 
            : "border-bridge-border/60 bg-black/40"
        }`}>
          <div className="flex items-center gap-1 truncate">
            <span className={`text-[8.5px] uppercase tracking-wider font-mono ${
              isAutoFailSave ? "text-amber-300 font-bold" : "text-muted-foreground"
            }`}>
              SAVE
            </span>
            {isSaveProficient && (
              <span className="text-[8px] font-mono font-bold px-1 rounded bg-cyan-neon/20 border border-cyan-neon/50 text-cyan-neon">
                P
              </span>
            )}
            {hasAutoThrusters && (
              <span className="text-[7px] font-mono font-bold px-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-300">
                +{autoThrustersBonus}
              </span>
            )}
          </div>
          <span className={`text-[11px] font-bold font-mono ${
            isAutoFailSave 
              ? "text-amber-300 font-black animate-pulse" 
              : "text-cyan-neon text-glow-cyan"
          }`}>
            {isAutoFailSave ? "AUTO-FAIL" : formatMod(effectiveSave)}
          </span>
        </div>

        <ul className="flex flex-col gap-1 px-2 py-2">
          {abilityDef.skills.map((skillKey) => {
            const skillDisplayName = skillKey.charAt(0).toUpperCase() + skillKey.slice(1)
            const tier = shipConfig?.skillTiers?.[skillKey as keyof ShipConfig["skillTiers"]]
            const isScoutBoosted = isScoutSpec && (skillKey === "scan" || skillKey === "probe")
            const isScoutAstrogation = isScoutMastery && skillKey === "astrogation"
            const isScramblerInterfere = isScramblerMastery && skillKey === "interfere"
            
            const calc = getSkillCalculation(mod, tier, proficiencyBonus, isScoutBoosted, isScoutAstrogation, isScramblerInterfere)

            return (
              <li
                key={skillKey}
                title={calc.tooltip ? `${calc.tooltip}${isIonized ? " (Disadvantage: Ionized)" : ""}` : (isIonized ? "Disadvantage: Ionized" : undefined)}
                className="flex items-center justify-between gap-1 text-[10px] tracking-[0.08em] cursor-default"
              >
                <div className="flex items-center gap-1 truncate">
                  <span className={`truncate ${isIonized ? "text-amber-300 font-bold" : "text-foreground/80"}`}>
                    {skillDisplayName}
                  </span>
                  {isScoutBoosted && <span className="text-[7px] text-amber-300 font-mono font-bold">(+1)</span>}
                  {isScoutAstrogation && <span className="text-[7px] text-cyan-300 font-mono font-bold">(+2)</span>}
                  {isScramblerInterfere && <span className="text-[7px] text-cyan-300 font-mono font-bold">(+2)</span>}
                  {calc.code && (
                    <span className="text-[8px] px-1 rounded bg-black/40 border border-bridge-border/60 text-cyan-neon/80 font-mono">
                      {calc.code}
                    </span>
                  )}
                  {isIonized && (
                    <span className="text-[7px] font-mono font-black text-amber-400 bg-amber-500/20 px-0.5 rounded border border-amber-400/40">
                      DIS
                    </span>
                  )}
                </div>
                <span className={`shrink-0 font-mono ${isIonized ? "text-amber-300 font-bold" : "text-amber-neon"}`}>
                  {calc.display}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      {isWis && (
        <div className="mx-2 mb-2 px-1.5 py-1 rounded border border-cyan-neon/30 bg-black/50 flex flex-col items-center justify-center text-center">
          <span className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground/80 font-mono whitespace-nowrap block">
            PASSIVE PERCEPTION
          </span>
          <span className="text-2xl font-black font-mono leading-tight text-cyan-neon text-glow-cyan my-0.5">
            {passivePerception}
          </span>
          {passiveLabel ? (
            <span className="text-[7.5px] font-mono font-semibold text-amber-300 tracking-wider">
              ({passiveLabel})
            </span>
          ) : (
            <span className="text-[7px] font-mono text-muted-foreground/60 uppercase tracking-widest">
              BASE + SCAN
            </span>
          )}
        </div>
      )}
    </div>
  )
}

interface ShipStatsProps {
  shipConfig?: ShipConfig
  proficiencyBonus?: number
  systemDamageLevel?: number
  isIonized?: boolean
  isStalled?: boolean
  isStunned?: boolean
  statuses?: { id?: string; title?: string }[]
}

export function ShipStats({ 
  shipConfig, 
  proficiencyBonus, 
  systemDamageLevel: propDamageLevel,
  isIonized: propIsIonized,
  isStalled: propIsStalled,
  isStunned: propIsStunned,
  statuses
}: ShipStatsProps) {
  const pb = shipConfig?.proficiencyBonus ?? proficiencyBonus ?? 2

  // Resolves from direct prop OR from the elevated shipConfig object
  const effectiveDamageLevel = propDamageLevel !== undefined 
    ? propDamageLevel 
    : ((shipConfig as any)?.systemDamageLevel ?? 0)

  // Resolves Ionized condition
  const effectiveIsIonized = Boolean(
    propIsIonized ||
    (shipConfig as any)?.isIonized ||
    statuses?.some((s) => s.id?.toLowerCase().includes("ionized") || s.title?.toLowerCase().includes("ionized")) ||
    (shipConfig as any)?.shipStatuses?.some((s: any) => s.id?.toLowerCase().includes("ionized") || s.title?.toLowerCase().includes("ionized"))
  )

  // Resolves Stalled condition
  const effectiveIsStalled = Boolean(
    propIsStalled ||
    (shipConfig as any)?.isStalled ||
    statuses?.some((s) => s.id?.toLowerCase().includes("stalled") || s.title?.toLowerCase().includes("stalled")) ||
    (shipConfig as any)?.shipStatuses?.some((s: any) => s.id?.toLowerCase().includes("stalled") || s.title?.toLowerCase().includes("stalled"))
  )

  // Resolves Stunned condition
  const effectiveIsStunned = Boolean(
    propIsStunned ||
    (shipConfig as any)?.isStunned ||
    statuses?.some((s) => s.id?.toLowerCase().includes("stunned") || s.title?.toLowerCase().includes("stunned")) ||
    (shipConfig as any)?.shipStatuses?.some((s: any) => s.id?.toLowerCase().includes("stunned") || s.title?.toLowerCase().includes("stunned"))
  )

  const sizeKey = (shipConfig?.size?.toLowerCase() ?? "small") as ShipSize
  const sizeRules = SHIP_SIZE_RULES[sizeKey] || SHIP_SIZE_RULES.small
  const roleRules = shipConfig?.shipType ? SHIP_TYPE_RULES[shipConfig.shipType] : null

  const getParagonBoost = (key: (typeof ABILITY_MAP)[number]["key"]): number => {
    if (shipConfig?.paragonSnubfighter && PARAGON_SNUBFIGHTERS[shipConfig.paragonSnubfighter]) {
      return PARAGON_SNUBFIGHTERS[shipConfig.paragonSnubfighter].boostedStat === key ? 2 : 0
    }
    return 0
  }

  const getEffectiveScore = (key: (typeof ABILITY_MAP)[number]["key"]) => {
    const rawScore = shipConfig?.stats?.[key] ?? 10
    const tierBoost = shipConfig?.tierStatBoosts?.[key] ?? 0
    const paragonBoost = getParagonBoost(key)
    const chassisMod = key === "dexterity" ? (sizeRules.dexterityMod || 0) : key === "constitution" ? (sizeRules.constitutionMod || 0) : 0
    const roleMod = roleRules ? ((roleRules[`${key}Mod` as keyof typeof roleRules] as number) || 0) : 0

    return rawScore + tierBoost + paragonBoost + chassisMod + roleMod
  }

  const effectiveStr = getEffectiveScore("strength")
  const strMod = modifier(effectiveStr)

  const isScoutMastery = shipConfig?.roleMastery === "Scout"

  return (
    <Panel title="Ship Statistics" code="ATTR // SKILLS" className="lg:col-span-2">
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ABILITY_MAP.map((abilityDef) => (
            <AbilityBlock 
              key={abilityDef.abbr} 
              abilityDef={abilityDef} 
              effectiveScore={getEffectiveScore(abilityDef.key)}
              shipConfig={shipConfig} 
              proficiencyBonus={pb}
              strMod={strMod}
              isIonized={effectiveIsIonized}
              isStalled={effectiveIsStalled}
              isStunned={effectiveIsStunned}
            />
          ))}
        </div>

        {/* Stunned Status Notice: Automatically fail Str and Dex saves */}
        {effectiveIsStunned && (
          <div className="mt-1 rounded bg-amber-950/50 border border-amber-400 p-2 text-center shadow-[0_0_12px_rgba(251,191,36,0.35)] animate-pulse">
            <span className="text-[10px] font-mono text-amber-300 font-black tracking-wider uppercase">
              ⚡ Stunned: Automatically fail Strength and Dexterity saving throws
            </span>
          </div>
        )}

        {/* Stalled Status Notice: Automatically fail Str and Dex saves */}
        {effectiveIsStalled && (
          <div className="mt-1 rounded bg-amber-950/50 border border-amber-400 p-2 text-center shadow-[0_0_12px_rgba(251,191,36,0.35)] animate-pulse">
            <span className="text-[10px] font-mono text-amber-300 font-black tracking-wider uppercase">
              ⚡ Stalled: Automatically fail Strength and Dexterity saving throws
            </span>
          </div>
        )}

        {/* Ionized Status Notice: Disadvantage on ability checks */}
        {effectiveIsIonized && (
          <div className="mt-1 rounded bg-amber-950/50 border border-amber-400 p-2 text-center shadow-[0_0_12px_rgba(251,191,36,0.35)] animate-pulse">
            <span className="text-[10px] font-mono text-amber-300 font-black tracking-wider uppercase">
              ⚡ Ionized: All ship ability checks are at disadvantage
            </span>
          </div>
        )}

        {/* Level 1+ System Damage Notice: Disadvantage on ability checks */}
        {effectiveDamageLevel >= 1 && (
          <div className="mt-1 rounded bg-red-950/40 border border-red-500/60 p-2 text-center animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.25)]">
            <span className="text-[10px] font-mono text-red-300 font-bold tracking-wide">
              ⚠️ SYSTEM DAMAGE LEVEL {effectiveDamageLevel}: Disadvantage on all ability checks utilizing ship stats.
            </span>
          </div>
        )}

        {/* Scout Role Mastery Notice */}
        {isScoutMastery && (
          <div className="mt-1 rounded bg-black/50 border border-cyan-500/40 p-2 text-center">
            <span className="text-[10px] font-mono text-cyan-300 font-bold tracking-wide">
              ⚡ Enemy ships have disadvantage on Wisdom (scan) checks to detect your ship entering and exiting hyperspace — Scout Role Mastery
            </span>
          </div>
        )}
      </div>
    </Panel>
  )
}