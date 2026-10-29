"use client";

import React, { useState } from "react";
import { 
  Wrench, 
  RefreshCw, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  ChevronRight,
  Flame
} from "lucide-react";

export interface ShipRechargeProps {
  shipTier: number;
  shipConMod: number;
  hullDieSize: string; // e.g., "d8", "d10", "d12"
  currentHull: number;
  maxHull: number;
  currentShields: number;
  maxShields: number;
  currentHullDice: number;
  maxHullDice: number;
  currentShieldDice: number;
  maxShieldDice: number;
  onApplyRecharge: (updates: {
    newShields: number;
    newShieldDice: number;
    newHull: number;
    newHullDice: number;
  }) => void;
  onResetSystemCharges?: () => void;
}

type CheckBracket = "low" | "mid" | "high";

export const ShipRechargeProtocol: React.FC<ShipRechargeProps> = ({
  shipTier,
  shipConMod,
  hullDieSize,
  currentHull,
  maxHull,
  currentShields,
  maxShields,
  currentHullDice,
  maxHullDice,
  currentShieldDice,
  maxShieldDice,
  onApplyRecharge,
  onResetSystemCharges,
}) => {
  const [isCycleActive, setIsCycleActive] = useState<boolean>(false);
  const [sessionHull, setSessionHull] = useState<number>(currentHull);
  const [sessionHullDice, setSessionHullDice] = useState<number>(currentHullDice);
  const [checkBracket, setCheckBracket] = useState<CheckBracket>("mid");
  const [manualDieRoll, setManualDieRoll] = useState<number | "">("");
  const [lastRestored, setLastRestored] = useState<number | null>(null);

  // Maximum die value from string (e.g. "d8" -> 8)
  const dieMax = parseInt(hullDieSize.replace("d", ""), 10) || 8;

  // Compute immediate Shield Dice restore: half of max shield dice
  const shieldDiceRestored = Math.max(1, Math.floor(maxShieldDice / 2));
  const newShieldDice = Math.min(maxShieldDice, currentShieldDice + shieldDiceRestored);

  const startRechargeCycle = () => {
    setIsCycleActive(true);
    setSessionHull(currentHull);
    setSessionHullDice(currentHullDice);
    setLastRestored(null);
    setManualDieRoll("");

    if (onResetSystemCharges) {
      onResetSystemCharges();
    }
  };

  const handleSpendHullDie = (dieValue: number) => {
    if (sessionHullDice <= 0 || sessionHull >= maxHull) return;

    const clampedDie = Math.min(dieMax, Math.max(1, dieValue));
    const totalGained = Math.max(1, clampedDie + shipConMod);
    const updatedHull = Math.min(maxHull, sessionHull + totalGained);

    setSessionHull(updatedHull);
    setSessionHullDice((prev) => prev - 1);
    setLastRestored(totalGained);
    setManualDieRoll("");
  };

  const rollInAppDie = () => {
    const rollOnce = () => Math.floor(Math.random() * dieMax) + 1;
    let chosen = rollOnce();

    if (checkBracket === "low") {
      const second = rollOnce();
      chosen = Math.min(chosen, second);
    } else if (checkBracket === "high") {
      const second = rollOnce();
      chosen = Math.max(chosen, second);
    }

    handleSpendHullDie(chosen);
  };

  const handleCompleteRecharge = () => {
    onApplyRecharge({
      newShields: maxShields,
      newShieldDice: newShieldDice,
      newHull: sessionHull,
      newHullDice: sessionHullDice,
    });
    setIsCycleActive(false);
  };

  return (
    <div className="bg-[#0b131e]/90 border border-cyan-500/30 rounded-lg p-4 shadow-lg backdrop-blur-md relative overflow-hidden">
      {/* Decorative Cyber Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-full pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
        <div className="flex items-center space-x-2.5">
          <RefreshCw className={`w-5 h-5 text-cyan-400 ${isCycleActive ? "animate-spin" : ""}`} />
          <div>
            <h3 className="text-sm font-bold tracking-wider uppercase text-cyan-100">
              Ship Recharge Protocol
            </h3>
            <span className="text-[11px] text-cyan-400/70">
              1-Hour Maintenance Cycle & Makeshift Field Repairs
            </span>
          </div>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-mono tracking-widest uppercase bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 rounded">
          Short Rest
        </span>
      </div>

      {!isCycleActive ? (
        /* Standby State */
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
          <div className="text-xs text-slate-300 space-y-1">
            <p className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Restores <span className="text-white font-medium">100% Shield Points</span> and{" "}
              <span className="text-white font-medium">+{shieldDiceRestored} Shield Dice</span>.
            </p>
            <p className="flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-cyan-400" />
              Allows spending <span className="text-white font-medium">Hull Dice ({hullDieSize})</span> via Mechanic’s Kit checks.
            </p>
            <p className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              Resets power coupling reserves and Tier {shipTier} ability cooldowns.
            </p>
          </div>

          <button
            type="button"
            onClick={startRechargeCycle}
            className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-widest rounded border border-cyan-300/40 shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-all flex items-center justify-center gap-2 group"
          >
            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
            <span>Initiate 1-Hr Recharge</span>
          </button>
        </div>
      ) : (
        /* Active Protocol Workspace */
        <div className="space-y-4 pt-1">
          {/* Automatic Restores Readout */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-900/80 border border-emerald-500/30 p-2.5 rounded flex items-center justify-between">
              <span className="text-slate-400">Shields Reset:</span>
              <span className="text-emerald-400 font-bold">{maxShields} / {maxShields} SP</span>
            </div>
            <div className="bg-slate-900/80 border border-emerald-500/30 p-2.5 rounded flex items-center justify-between">
              <span className="text-slate-400">Shield Dice Restored:</span>
              <span className="text-emerald-400 font-bold">+{shieldDiceRestored} ({newShieldDice}/{maxShieldDice})</span>
            </div>
          </div>

          {/* Hull Dice Spending Section */}
          <div className="bg-slate-950/70 border border-cyan-500/30 p-3.5 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-cyan-200 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-cyan-400" />
                Makeshift Hull Repairs
              </div>
              <div className="text-xs font-mono">
                <span className="text-slate-400">Remaining Hull Dice: </span>
                <span className="text-cyan-300 font-bold">{sessionHullDice} / {maxHullDice} ({hullDieSize})</span>
              </div>
            </div>

            {/* Mechanic's Kit Tier Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-300">
                Engineer Intelligence (Mechanic&apos;s Kit) Check:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCheckBracket("low")}
                  className={`px-2.5 py-1.5 rounded text-[11px] font-mono border transition-all ${
                    checkBracket === "low"
                      ? "bg-rose-950/80 border-rose-500 text-rose-200 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                      : "bg-slate-900/60 border-slate-700/60 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <div className="font-bold">≤ 10</div>
                  <div className="text-[9px] text-slate-400">Roll 2x, take lower</div>
                </button>

                <button
                  type="button"
                  onClick={() => setCheckBracket("mid")}
                  className={`px-2.5 py-1.5 rounded text-[11px] font-mono border transition-all ${
                    checkBracket === "mid"
                      ? "bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                      : "bg-slate-900/60 border-slate-700/60 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <div className="font-bold">11 – 20</div>
                  <div className="text-[9px] text-slate-400">Roll normally</div>
                </button>

                <button
                  type="button"
                  onClick={() => setCheckBracket("high")}
                  className={`px-2.5 py-1.5 rounded text-[11px] font-mono border transition-all ${
                    checkBracket === "high"
                      ? "bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                      : "bg-slate-900/60 border-slate-700/60 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <div className="font-bold">≥ 21</div>
                  <div className="text-[9px] text-slate-400">Roll 2x, take higher</div>
                </button>
              </div>
            </div>

            {/* Die Spending Controls */}
            {sessionHullDice > 0 && sessionHull < maxHull ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {/* Method A: In-App Roll */}
                <button
                  type="button"
                  onClick={rollInAppDie}
                  className="px-3 py-2 bg-cyan-900/40 hover:bg-cyan-800/50 border border-cyan-500/50 rounded text-cyan-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Flame className="w-3.5 h-3.5 text-cyan-400" />
                  Auto-Roll {hullDieSize} + {shipConMod} Con
                </button>

                {/* Method B: Manual Input from Physical Dice */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={dieMax}
                    value={manualDieRoll}
                    onChange={(e) => setManualDieRoll(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder={`1-${dieMax}`}
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-center text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    disabled={manualDieRoll === ""}
                    onClick={() => {
                      if (manualDieRoll !== "") handleSpendHullDie(Number(manualDieRoll));
                    }}
                    className="flex-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-600 rounded text-xs font-medium text-slate-200 transition-colors"
                  >
                    Apply Manual Roll
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 rounded bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                <AlertCircle className="w-4 h-4 text-cyan-400" />
                {sessionHull >= maxHull
                  ? "Hull integrity is at 100% capacity."
                  : "No remaining Hull Dice available for this cycle."}
              </div>
            )}

            {/* Current Hull Ticker */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
              <span className="text-slate-400">
                Hull Progress:{" "}
                <span className="text-white font-bold">{sessionHull}</span> / {maxHull} HP
              </span>
              {lastRestored !== null && (
                <span className="text-emerald-400 font-mono text-[11px] animate-pulse">
                  +{lastRestored} HP restored!
                </span>
              )}
            </div>
          </div>

          {/* Finalize Action */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCompleteRecharge}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded border border-emerald-400/40 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Finalize Recharge & Sync Systems
            </button>
          </div>
        </div>
      )}
    </div>
  );
};