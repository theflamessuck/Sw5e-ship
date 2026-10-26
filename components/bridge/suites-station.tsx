"use client"

import React from "react"
import type { ShipConfig } from "./ship-setup"
import type { ManifestMember, ShipCompartmentId } from "./bridge-dashboard"
import { getCrewRole } from "./bridge-dashboard"
import {
  Layers,
  HeartPulse,
  FlaskConical,
  Wrench,
  BedDouble,
  ShieldAlert,
  Sparkles,
  Users,
  CheckCircle2,
  Clock,
  UserMinus,
  Sparkle,
  Building2,
  UserPlus
} from "lucide-react"

export interface InstalledSuite {
  id: string
  name: string
  type?: "medical" | "science" | "workshop" | "living" | "security" | "recreation" | "hangar" | "cargo" | "other" | string
  tier?: number
  capacity?: number
  description: string
  passiveBonus?: string
  activeAbilities?: {
    name: string
    description: string
    checkDC?: number
    skillCheck?: string
    cost?: string
  }[]
  cost?: number
  systemCategory?: string
}

interface SuitesStationProps {
  shipConfig?: ShipConfig
  installedSuites?: InstalledSuite[]
  manifest?: ManifestMember[]
  onAssignLocation?: (memberId: string, targetLocation: ShipCompartmentId) => void
  onToggleTurn?: (memberId: string) => void
}

const SUITE_TYPE_THEMES: Record<
  string,
  { color: string; border: string; bg: string; icon: React.ElementType }
> = {
  medical: {
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-950/20",
    icon: HeartPulse,
  },
  science: {
    color: "text-cyan-400",
    border: "border-cyan-500/30",
    bg: "bg-cyan-950/20",
    icon: FlaskConical,
  },
  workshop: {
    color: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-950/20",
    icon: Wrench,
  },
  living: {
    color: "text-indigo-400",
    border: "border-indigo-500/30",
    bg: "bg-indigo-950/20",
    icon: BedDouble,
  },
  security: {
    color: "text-rose-400",
    border: "border-rose-500/30",
    bg: "bg-rose-950/20",
    icon: ShieldAlert,
  },
  recreation: {
    color: "text-fuchsia-400",
    border: "border-fuchsia-500/30",
    bg: "bg-fuchsia-950/20",
    icon: Sparkles,
  },
  hangar: {
    color: "text-sky-400",
    border: "border-sky-500/30",
    bg: "bg-sky-950/20",
    icon: Layers,
  },
  cargo: {
    color: "text-slate-400",
    border: "border-slate-500/30",
    bg: "bg-slate-900/30",
    icon: Layers,
  },
  other: {
    color: "text-cyan-neon",
    border: "border-cyan-neon/30",
    bg: "bg-cyan-950/20",
    icon: Building2,
  },
}

export function SuitesStation({
  shipConfig,
  installedSuites = [],
  manifest = [],
  onAssignLocation,
  onToggleTurn,
}: SuitesStationProps) {
  // Available crew not currently stationed in this specific suite
  const getAvailableForSuite = (suiteLocId: ShipCompartmentId) => {
    return manifest.filter((m) => m.location !== suiteLocId && !m.isPassenger)
  }

  return (
    <div className="flex flex-col gap-6 w-full font-mono">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-bridge-border pb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-glow-cyan text-lg font-bold tracking-[0.15em] text-cyan-neon">
            VESSEL COMPARTMENTS &amp; SUITES
          </h2>
          <p className="text-[10px] tracking-[0.3em] text-muted-foreground/60">
            {shipConfig?.name?.toUpperCase() || "VESSEL"} // INTERNAL SUITES &amp; FACILITY MANNING
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded border border-cyan-400/60 bg-cyan-950/40 px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider text-cyan-300">
            TOTAL SUITES: {installedSuites.length}
          </span>
          <span className="rounded-sm border border-cyan-neon/50 bg-cyan-neon/10 px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] text-cyan-neon">
            STATUS: NOMINAL
          </span>
        </div>
      </div>

      {/* Installed Suites Deck */}
      {installedSuites.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-bridge-border/60 rounded-md bg-bridge-panel text-xs text-muted-foreground">
          No suites installed on this vessel. Configure and install suites in the Ship Modifications terminal.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {installedSuites.map((suite) => {
            const suiteLocId: ShipCompartmentId = `suite-${suite.id}`
            const assignedCrew = manifest
              .filter((m) => m.location === suiteLocId && !m.isPassenger)
              .sort((a, b) => a.assignedOrder - b.assignedOrder)
            const availablePersonnel = getAvailableForSuite(suiteLocId)

            const sType = (suite.type || "other").toLowerCase()
            const theme = SUITE_TYPE_THEMES[sType] || SUITE_TYPE_THEMES.other
            const SuiteIcon = theme.icon

            return (
              <div
                key={suite.id}
                className="rounded-md border border-bridge-border bg-bridge-panel p-4 flex flex-col gap-3 shadow-sm"
              >
                {/* Suite Header Info */}
                <div className="flex items-start justify-between border-b border-bridge-border/60 pb-3 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded border ${theme.bg} ${theme.border} ${theme.color} shrink-0`}>
                      <SuiteIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                          {suite.name}
                        </h3>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-slate-700 bg-slate-900 text-cyan-300 uppercase">
                          {suite.type || "Compartment"} {suite.tier ? `• TIER ${suite.tier}` : ""}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                        {suite.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Passive Facility Bonus */}
                {suite.passiveBonus && (
                  <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
                    <Sparkle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-200">
                      <span className="font-bold uppercase tracking-wider">Facility Bonus: </span>
                      {suite.passiveBonus}
                    </div>
                  </div>
                )}

                {/* Individual Suite Manning HUD */}
                <div className="rounded border border-cyan-neon/30 bg-black/40 p-2.5 mt-1 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-neon uppercase tracking-wider">
                      <Users className="h-3.5 w-3.5 text-cyan-neon" />
                      <span>Stationed Personnel:</span>
                    </div>

                    {assignedCrew.length === 0 ? (
                      <span className="text-xs text-slate-500 italic bg-slate-900/60 border border-slate-800 px-2.5 py-1 rounded">
                        Uncrewed — Select personnel to station
                      </span>
                    ) : (
                      assignedCrew.map((member, idx) => {
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
                              {isLead ? "Lead" : "Staff"}
                            </span>

                            <span className="font-bold text-xs">{member.name}</span>

                            {/* Turn Toggle */}
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

                            {/* Vacate / Return to Quarters */}
                            <button
                              type="button"
                              onClick={() => onAssignLocation && onAssignLocation(member.id, "crew_quarters")}
                              className="text-slate-500 hover:text-rose-400 transition ml-1 cursor-pointer"
                              title="Vacate Suite (Return to Quarters)"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Deploy dropdown for this suite */}
                  {availablePersonnel.length > 0 && onAssignLocation && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1">
                        <UserPlus className="h-3 w-3 text-cyan-neon" />
                        Station Crew:
                      </span>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            onAssignLocation(e.target.value, suiteLocId)
                          }
                        }}
                        className="rounded bg-slate-950 border border-slate-700 px-2 py-1 text-xs text-cyan-300 focus:outline-none focus:border-cyan-neon cursor-pointer"
                      >
                        <option value="" disabled>
                          + Deploy to {suite.name}...
                        </option>
                        {availablePersonnel.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({getCrewRole(p, manifest)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}