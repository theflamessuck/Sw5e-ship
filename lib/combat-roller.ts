// lib/combat-roller.ts

export type RollAdvantageMode = "normal" | "advantage" | "disadvantage"

export interface AttackRollResult {
  naturalRoll: number
  total: number
  modifier: number
  mode: RollAdvantageMode
  d1: number
  d2?: number
  discardedDie?: number
  isCrit: boolean
  isFumble: boolean
  critThreshold: number
}

export interface DamageRollBreakdown {
  diceRolls: number[]
  diceTotal: number
  maximizedBaseDiceTotal?: number
  modifier: number
  totalDamage: number
  isCrit: boolean
  isBrutalCrit: boolean
  formula: string
  breakdownString: string
}

/**
 * Resolves combined advantage and disadvantage into the net roll mode.
 * If both are true, they cancel out into "normal".
 */
export function resolveAdvantageMode(
  hasAdvantage: boolean,
  hasDisadvantage: boolean
): RollAdvantageMode {
  if (hasAdvantage && hasDisadvantage) return "normal"
  if (hasAdvantage) return "advantage"
  if (hasDisadvantage) return "disadvantage"
  return "normal"
}

/**
 * Rolls an attack check with d20, handling advantage/disadvantage,
 * dropped dice tracking, and expanded critical ranges.
 */
export function rollAttackD20({
  modifier = 0,
  mode = "normal",
  critThreshold = 20,
}: {
  modifier?: number
  mode?: RollAdvantageMode
  critThreshold?: number
}): AttackRollResult {
  const d1 = Math.floor(Math.random() * 20) + 1

  let naturalRoll = d1
  let d2: number | undefined = undefined
  let discardedDie: number | undefined = undefined

  if (mode === "advantage") {
    d2 = Math.floor(Math.random() * 20) + 1
    naturalRoll = Math.max(d1, d2)
    discardedDie = Math.min(d1, d2)
  } else if (mode === "disadvantage") {
    d2 = Math.floor(Math.random() * 20) + 1
    naturalRoll = Math.min(d1, d2)
    discardedDie = Math.max(d1, d2)
  }

  const isCrit = naturalRoll >= critThreshold
  const isFumble = naturalRoll === 1

  return {
    naturalRoll,
    total: naturalRoll + modifier,
    modifier,
    mode,
    d1,
    d2,
    discardedDie,
    isCrit,
    isFumble,
    critThreshold,
  }
}

interface ParsedDamageFormula {
  count: number
  sides: number
  modifier: number
}

/**
 * Parses formulas formatted like "2d8", "3d6+4", "1d10 - 2", or "4d12 + 6"
 */
export function parseDamageFormula(formula: string): ParsedDamageFormula {
  const cleaned = formula.replace(/\s+/g, "").toLowerCase()
  const match = cleaned.match(/^(\d+)d(\d+)([+-]\d+)?$/)

  if (!match) {
    // Fallback if formula is just a static number or unparseable
    const flatVal = parseInt(cleaned, 10)
    if (!isNaN(flatVal)) {
      return { count: 0, sides: 0, modifier: flatVal }
    }
    return { count: 1, sides: 6, modifier: 0 }
  }

  const count = parseInt(match[1], 10)
  const sides = parseInt(match[2], 10)
  const modifier = match[3] ? parseInt(match[3], 10) : 0

  return { count, sides, modifier }
}

/**
 * Calculates damage rolls with support for standard 5e crits and Brutal Criticals.
 *
 * - Non-crit: Roll count d sides + modifier
 * - Standard Crit: Roll (count * 2) d sides + modifier
 * - Brutal Crit: (count * sides) + Roll (count) d sides + modifier
 */
export function rollDamage({
  formula,
  isCrit = false,
  useBrutalCriticals = false,
  additionalBonus = 0,
}: {
  formula: string
  isCrit?: boolean
  useBrutalCriticals?: boolean
  additionalBonus?: number
}): DamageRollBreakdown {
  const parsed = parseDamageFormula(formula)
  const totalModifier = parsed.modifier + additionalBonus

  // Non-dice damage fallback
  if (parsed.count === 0 || parsed.sides === 0) {
    const finalVal = Math.max(0, totalModifier)
    return {
      diceRolls: [],
      diceTotal: 0,
      modifier: totalModifier,
      totalDamage: finalVal,
      isCrit,
      isBrutalCrit: isCrit && useBrutalCriticals,
      formula,
      breakdownString: `${finalVal}`,
    }
  }

  // 1. Normal Hit
  if (!isCrit) {
    const diceRolls: number[] = []
    for (let i = 0; i < parsed.count; i++) {
      diceRolls.push(Math.floor(Math.random() * parsed.sides) + 1)
    }
    const diceTotal = diceRolls.reduce((a, b) => a + b, 0)
    const totalDamage = Math.max(0, diceTotal + totalModifier)

    const rollsStr = `[${diceRolls.join(", ")}]`
    const modStr = totalModifier !== 0 ? ` ${totalModifier > 0 ? "+" : "-"} ${Math.abs(totalModifier)}` : ""
    const breakdownString = `${rollsStr}${modStr} = ${totalDamage}`

    return {
      diceRolls,
      diceTotal,
      modifier: totalModifier,
      totalDamage,
      isCrit: false,
      isBrutalCrit: false,
      formula,
      breakdownString,
    }
  }

  // 2. Brutal Critical: Max Base Dice + Roll Normal Dice + Modifiers
  if (useBrutalCriticals) {
    const maximizedBaseDiceTotal = parsed.count * parsed.sides
    const diceRolls: number[] = []
    for (let i = 0; i < parsed.count; i++) {
      diceRolls.push(Math.floor(Math.random() * parsed.sides) + 1)
    }
    const diceTotal = diceRolls.reduce((a, b) => a + b, 0)
    const totalDamage = Math.max(0, maximizedBaseDiceTotal + diceTotal + totalModifier)

    const rollsStr = `[${diceRolls.join(", ")}]`
    const modStr = totalModifier !== 0 ? ` ${totalModifier > 0 ? "+" : "-"} ${Math.abs(totalModifier)}` : ""
    const breakdownString = `Max: ${maximizedBaseDiceTotal} + Roll: ${rollsStr}${modStr} = ${totalDamage}`

    return {
      diceRolls,
      diceTotal,
      maximizedBaseDiceTotal,
      modifier: totalModifier,
      totalDamage,
      isCrit: true,
      isBrutalCrit: true,
      formula,
      breakdownString,
    }
  }

  // 3. Standard 5e Critical: Double the Dice + Modifiers
  const rolledDiceCount = parsed.count * 2
  const diceRolls: number[] = []
  for (let i = 0; i < rolledDiceCount; i++) {
    diceRolls.push(Math.floor(Math.random() * parsed.sides) + 1)
  }
  const diceTotal = diceRolls.reduce((a, b) => a + b, 0)
  const totalDamage = Math.max(0, diceTotal + totalModifier)

  const rollsStr = `[${diceRolls.join(", ")}]`
  const modStr = totalModifier !== 0 ? ` ${totalModifier > 0 ? "+" : "-"} ${Math.abs(totalModifier)}` : ""
  const breakdownString = `2× Dice ${rollsStr}${modStr} = ${totalDamage}`

  return {
    diceRolls,
    diceTotal,
    modifier: totalModifier,
    totalDamage,
    isCrit: true,
    isBrutalCrit: false,
    formula,
    breakdownString,
  }
}