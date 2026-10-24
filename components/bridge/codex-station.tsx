"use client"

import { useState } from "react"
import { 
  BookOpen, 
  Terminal, 
  ShieldAlert, 
  Wrench, 
  Sparkles, 
  ExternalLink, 
  Globe, 
  Compass, 
  Cpu, 
  History, 
  Power, 
  Key, 
  Flame 
} from "lucide-react"

type CodexCategory = "homebrew" | "combat" | "build" | "updates"

interface RuleEntry {
  id: string
  title: string
  category: CodexCategory
  tag: string
  content: string
  bullets?: string[]
}

const SW5E_EXTERNAL_LINKS = [
  {
    name: "SW5e Main Portal",
    url: "https://sw5e.com",
    label: "sw5e.com",
    icon: Globe,
    description: "Rules, character tools, assets, and compendium",
  },
  {
    name: "Starships of the Galaxy",
    url: "https://sw5e.com/rules/sotg",
    label: "SotG Rules",
    icon: Compass,
    description: "Chassis sizes, space combat, and operations",
  },
  {
    name: "Starship Modifications",
    url: "https://sw5e.com/starships",
    label: "Starship Database",
    icon: Wrench,
    description: "Hardpoints, suites, shields, and reactors",
  },
  {
    name: "Deployments",
    url: "https://sw5e.com/rules/sotg/deployments",
    label: "Crew Roles",
    icon: Cpu,
    description: "Pilot, Gunner, Technician, Mechanic, Operator",
  },
]

const CODEX_DATA: RuleEntry[] = [
  {
    id: "reactor-startup-and-scram",
    title: "Vessel Cold & Dark // Reactor SCRAM Protocol",
    category: "homebrew",
    tag: "ENGINEERING / HELM",
    content: "Official ruling on cold start procedures and main reactor emergency shutdowns:",
    bullets: [
      "Cold & Dark State: When the main reactor is unpowered, auxiliary emergency battery circuits maintain life support and non-tactical avionics. Weapons, Defense, Sensors, and Tactical Communications stations enter a cold, unpowered standby mode.",
      "Dual Control Access: Both the Helm (Engines) and Engineering consoles maintain independent command access to initiate the Start-Up Sequence or trigger an emergency SCRAM.",
      "Start-Up Mechanics: Standard initialization requires 10 procedures (or passing Duress checks under fire). A safety interlock allows forced takeoffs with risk of mishap rolls (slowed, blinded, or system damage).",
      "SCRAM Definition: An emergency reactor scram dumps control rods into the core, immediately killing primary power and forcing the vessel into cold & dark until re-ignited.",
    ],
  },
  {
    id: "boost-shields-duration-ruling",
    title: "Boost Shields Duration Adjustment",
    category: "homebrew",
    tag: "ENGINEERING / DURATION",
    content: "Official ruling revision on the duration of temporary shields granted via the Boost Shields engineering action:",
    bullets: [
      "Original Ruleset: \"You can attempt to boost your shields. When you take the Boost Shields action, you make a DC 10 Strength (Boost) check. On a success, you roll a shield die, without expending it, and gain temporary shield points equal to the result that last until the **start** of your ship’s next turn.\"",
      "Crucible Homebrew Revision: \"You can attempt to boost your shields. When you take the Boost Shields action, you make a DC 10 Strength (Boost) check. On a success, you roll a shield die, without expending it, and gain temporary shield points equal to the result that last until the **end** of your ship’s next turn.\"",
      "System Loop Integration: In dashboard mechanics, this ensures the temporary shield pool survives 1 full reactor cycle and only expires on the 2nd cycle, matching the duration curve of Boost Engines.",
      "Damage Priority: Any incoming fire depletes these temporary shield points first before standard energy shields or structural hull integrity suffer damage.",
    ],
  },
  {
    id: "shield-overdrive",
    title: "Temporary Shields & Damage Spillover",
    category: "homebrew",
    tag: "DEFENSE / ENGINEERING",
    content: "Unified rules for absorption and overflow mechanics when temporary shields are active on the vessel.",
    bullets: [
      "DC 10 Strength (Boost) Check rolls 1 Shield Die without expending it.",
      "Temporary shields absorb damage first before base energy shields deplete.",
      "Survives 1 reactor cycle and automatically dissipates on the 2nd cycle if unspent.",
      "Any unabsorbed excess damage after shields and temp shields reach 0 spills directly into Hull HP.",
    ],
  },
  {
    id: "system-damage",
    title: "Destruction Saves & System Damage Condition Matrix",
    category: "combat",
    tag: "SW5E RULES",
    content: "Resolving zero HP catastrophic conditions and breakdown saving throws.",
    bullets: [
      "At 0 HP, vessel becomes Disabled and crew must make DC 10 Destruction Saves at the start of each round.",
      "Three successes stabilize the vessel; three failures cause catastrophic loss.",
      "Every failure or critical breakdown check applies 1 level of Ship System Damage.",
      "At Level 6 System Damage, vessel enters Catastrophic Blackout: all primary stations lock out except GM Override and Auxiliary Reboot.",
    ],
  },
  {
    id: "patch-notes-latest",
    title: "Firmware Revision // Tactical Refits & Security",
    category: "updates",
    tag: "RELEASE NOTES",
    content: "Summary of recent platform improvements, bug fixes, and security patches:",
    bullets: [
      "Added Synchronized Cold & Dark / Reactor Ignition: Consoles for Weapons, Defense, Sensors, and Comms power down when main reactor is offline. Startup sequence and SCRAM controls active on Helm and Engineering.",
      "Restricted Shipyard Gate: Commissioning new vessels now requires a Master Shipyard Authorization Key (NEXT_PUBLIC_CREATION_KEY) to prevent unauthorized database room creation.",
      "Landing Standby Console: Root URL now presents an unlinked standby radar dish rather than defaulting to an open vessel.",
      "Hydration Mismatch Fix: Implemented an isMounted barrier to guarantee smooth server/client rendering with localStorage state.",
      "Real-Time Supabase Sync: PIN locking, turn taken flags, movement gauges, and reactor pools synchronize instantaneously across active player sessions.",
    ],
  },
  {
    id: "app-build-specs",
    title: "Crucible Bridge OS Architecture",
    category: "build",
    tag: "DEV NOTES",
    content: "Technical architecture specifications for this dashboard deployment.",
    bullets: [
      "Next.js App Router, React Client Component architecture, Tailwind CSS, Supabase Realtime.",
      "Elevated Cross-Station Persistence: State for unmounting tabs lives centrally inside bridge-dashboard.tsx.",
      "Coupling Engine: Dynamically routes power dice based on Direct, Distributed, or Hub and Spoke reactor couplings.",
      "Security Protocols: Multi-tenant room isolation with per-ship access PINs and Master Shipyard commissioning interlocks.",
    ],
  },
]

export function CodexStation() {
  const [activeCategory, setActiveCategory] = useState<CodexCategory | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredEntries = CODEX_DATA.filter((item) => {
    const matchesCategory = activeCategory === "all" || item.category === activeCategory
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tag.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Helper to format inline bold Markdown (**text**)
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="text-white font-black underline decoration-cyan-neon">
            {part.slice(2, -2)}
          </strong>
        )
      }
      return part
    })
  }

  return (
    <div className="flex flex-col gap-6 font-mono">
      {/* Station Header */}
      <div className="flex flex-col justify-between gap-4 rounded-md border border-cyan-neon/40 bg-bridge-panel p-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-cyan-neon" />
            <h2 className="text-glow-cyan text-sm font-bold tracking-[0.25em] text-cyan-neon uppercase">
              Vessel Codex &amp; Tactical Reference
            </h2>
          </div>
          <p className="text-[10px] tracking-wider text-muted-foreground mt-1">
            CAMPAIGN HOMEBREW RULES • STARSHIP COMBAT LOGIC • REFIT &amp; BUILD NOTES
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/60 border border-bridge-border px-3 py-1.5 text-xs text-slate-200 rounded focus:border-cyan-neon outline-none"
          />
        </div>
      </div>

      {/* SW5E HOLONET UPLINK / EXTERNAL DOCUMENTATION LINKS */}
      <div className="rounded-md border border-bridge-border bg-bridge-panel p-3.5 space-y-2.5">
        <div className="flex items-center justify-between border-b border-bridge-border/60 pb-1.5">
          <span className="text-[10px] font-bold text-cyan-neon uppercase tracking-[0.2em] flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-cyan-neon" />
            SW5e Holonet Uplink (External Rules Compendium)
          </span>
          <span className="text-[9px] text-muted-foreground uppercase">Live Network</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {SW5E_EXTERNAL_LINKS.map((link) => {
            const Icon = link.icon
            return (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col justify-between p-2.5 rounded border border-bridge-border bg-black/40 hover:border-cyan-neon/60 hover:bg-cyan-neon/5 transition-all shadow-[0_0_8px_rgba(0,0,0,0.5)]"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-100 group-hover:text-cyan-neon mb-0.5">
                    <span className="flex items-center gap-1.5 truncate">
                      <Icon className="h-3.5 w-3.5 text-cyan-neon group-hover:scale-110 transition-transform" />
                      {link.name}
                    </span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-cyan-neon transition-colors shrink-0" />
                  </div>
                  <p className="text-[9px] text-muted-foreground line-clamp-1">{link.description}</p>
                </div>
                <span className="text-[9px] font-bold text-amber-400/90 pt-1.5 flex items-center gap-1 tracking-wider">
                  ↗ {link.label}
                </span>
              </a>
            )
          })}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "All Logs", icon: Terminal },
          { id: "updates", label: "Firmware Updates", icon: History },
          { id: "homebrew", label: "Homebrew Rules", icon: Sparkles },
          { id: "combat", label: "SW5e Combat", icon: ShieldAlert },
          { id: "build", label: "App & Build Notes", icon: Wrench },
        ].map((tab) => {
          const Icon = tab.icon
          const isSelected = activeCategory === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                isSelected
                  ? "bg-cyan-neon/20 border-cyan-neon text-cyan-neon shadow-[0_0_10px_rgba(0,255,255,0.2)]"
                  : "bg-black/40 border-bridge-border text-slate-400 hover:text-slate-200 hover:border-bridge-border/80"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Entries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-md border border-bridge-border bg-bridge-panel p-4 flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between border-b border-bridge-border/60 pb-2 mb-2">
                <span className="text-[9px] font-bold text-amber-400 tracking-widest uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  {entry.tag}
                </span>
                <span className="text-[9px] text-muted-foreground uppercase">{entry.category}</span>
              </div>
              <h3 className="text-xs font-bold text-cyan-neon tracking-wide mb-1.5">{entry.title}</h3>
              <p className="text-[11px] text-slate-300 leading-relaxed mb-3">{entry.content}</p>

              {entry.bullets && (
                <ul className="space-y-1.5 bg-black/40 p-2.5 rounded border border-bridge-border/40 text-[10px] text-slate-300">
                  {entry.bullets.map((b, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 leading-snug">
                      <span className="text-cyan-neon shrink-0">▸</span>
                      <span>{renderFormattedText(b)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}