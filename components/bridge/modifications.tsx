"use client"

import { useEffect, useState } from "react"
import { X, Info } from "lucide-react"
import { Panel } from "./panel"
import type { Station } from "./station-sidebar"

export type ModStation = Exclude<Station, "Ship Modifications">

export type Modification = {
  name: string
  station: ModStation
  summary: string
  description: string
}

export const MODIFICATIONS: Modification[] = [
  {
    name: "Overcharged Capacitors",
    station: "Weapons",
    summary: "Boosts laser bank output at the cost of heat.",
    description:
      "Reroutes surplus reactor output directly into the laser banks. Laser attacks deal +1 damage die, but each volley adds an additional 10% to the heat gauge. If heat reaches 100%, the weapon locks for one round while it vents.",
  },
  {
    name: "Twin-Linked Torpedo Rack",
    station: "Weapons",
    summary: "Fire two torpedoes as a single action.",
    description:
      "A reinforced ordnance cradle lets the ship launch a pair of torpedoes simultaneously. Once per encounter, spend 2 torpedo capacity to make a single attack roll that resolves as two separate impacts against the same target.",
  },
  {
    name: "Ablative Plating",
    station: "Defense",
    summary: "Sacrificial armor layer absorbs the first hit.",
    description:
      "Layered ablative panels flake away to disperse incoming energy. The first time the ship takes damage each round, reduce that damage by an amount equal to the proficiency bonus. Regenerates at the start of the ship's turn.",
  },
  {
    name: "Inertial Dampener Array",
    station: "Engines",
    summary: "Improves maneuver rolls during hard burns.",
    description:
      "Advanced field generators counteract g-forces during aggressive throttle changes. Grants advantage on Maneuver checks made while executing an evasive action, and negates the disadvantage normally imposed by a full-power burn.",
  },
  {
    name: "Long-Range Sensor Suite",
    station: "Sensors",
    summary: "Extends active scan range and target lock fidelity.",
    description:
      "A phased sensor palette doubles the effective range of active scans and grants +2 to Scan checks made to establish a target lock. Also reveals one hidden property of a scanned vessel on a successful check.",
  },
  {
    name: "Encrypted Comm Relay",
    station: "Communications",
    summary: "Secures transmissions and jams enemy comms.",
    description:
      "A hardened relay encrypts all outgoing traffic and can be tuned to disrupt hostile coordination. As an action, force an enemy vessel to make a check or lose the ability to grant allies bonuses from shared comms until the start of its next turn.",
  },
  {
    name: "Predictive Astrogation Core",
    station: "Navcomputer",
    summary: "Pre-plots jump solutions for faster escapes.",
    description:
      "A dedicated computing core continuously calculates jump vectors. Reduces the time to plot an emergency jump by one round, and grants advantage on Astrogation checks made to escape a pursuing vessel.",
  },
]

export const MOD_ACCENT: Record<string, "cyan" | "amber"> = {
  Weapons: "amber",
  Defense: "cyan",
  Engines: "amber",
  Sensors: "cyan",
  Communications: "cyan",
  Navcomputer: "amber",
}

export function ModList({
  mods,
  onSelect,
}: {
  mods: Modification[]
  onSelect: (mod: Modification) => void
}) {
  return (
    <ul className="flex flex-col gap-2">
      {mods.map((mod) => (
        <li
          key={mod.name}
          className="flex items-center justify-between gap-2 rounded border border-bridge-border/60 bg-bridge-panel px-3 py-2"
        >
          <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground/90">
            {mod.name}
          </span>
          <button
            type="button"
            onClick={() => onSelect(mod)}
            aria-label={`Explain ${mod.name}`}
            className="flex shrink-0 items-center gap-1 rounded border border-cyan-neon/40 px-2 py-1 text-[10px] font-bold tracking-widest text-cyan-neon transition-colors hover:bg-cyan-neon/10 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-neon"
          >
            <Info className="h-3 w-3" aria-hidden="true" />
            INFO
          </button>
        </li>
      ))}
    </ul>
  )
}

export function ModificationDialog({
  mod,
  onClose,
}: {
  mod: Modification
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const accent = MOD_ACCENT[mod.station] ?? "cyan"
  const accentText = accent === "amber" ? "text-amber-neon" : "text-cyan-neon"
  const accentBorder =
    accent === "amber" ? "border-amber-neon/50" : "border-cyan-neon/50"

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${mod.name} details`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <div
        className={`relative z-10 w-full max-w-md rounded-md border bg-bridge-panel shadow-[0_0_40px_rgba(0,240,255,0.15)] ${accentBorder}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-bridge-border px-5 py-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground/60">
              {mod.station.toUpperCase()} MODIFICATION
            </p>
            <h2 className={`text-glow-cyan text-base font-bold tracking-wide ${accentText}`}>
              {mod.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded border border-bridge-border p-1 text-muted-foreground transition-colors hover:border-cyan-neon/50 hover:text-cyan-neon focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-neon"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="px-5 py-4">
          <p className={`mb-2 text-xs font-bold tracking-widest ${accentText}`}>
            {mod.summary}
          </p>
          <p className="text-sm leading-relaxed text-foreground/80">
            {mod.description}
          </p>
        </div>
      </div>
    </div>
  )
}

export function StationModifications({
  station,
  accent = "amber",
}: {
  station: ModStation
  accent?: "cyan" | "amber"
}) {
  const [selected, setSelected] = useState<Modification | null>(null)
  const mods = MODIFICATIONS.filter((m) => m.station === station)

  return (
    <Panel title="Installed Modifications" code="MOD-LINK" accent={accent}>
      {mods.length > 0 ? (
        <ModList mods={mods} onSelect={setSelected} />
      ) : (
        <p className="py-4 text-center text-xs tracking-widest text-muted-foreground/60">
          NO MODIFICATIONS INSTALLED
        </p>
      )}
      {selected && (
        <ModificationDialog mod={selected} onClose={() => setSelected(null)} />
      )}
    </Panel>
  )
}
