import { CornerFrame, Panel } from "./panel"

const CONTACTS = [
  { id: "TGT-01", x: 68, y: 30, hostile: true },
  { id: "TGT-02", x: 40, y: 62, hostile: true },
  { id: "TGT-03", x: 24, y: 38, hostile: false },
]

export function TargetLocking() {
  return (
    <Panel title="Target Locking System" code="TLS-01">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="relative mx-auto aspect-square w-full max-w-[240px]">
          <CornerFrame />
          <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="Radar target readout">
            <defs>
              <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#00F0FF" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#00F0FF" stopOpacity="0" />
                <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.35" />
              </linearGradient>
            </defs>

            <circle cx="100" cy="100" r="96" fill="url(#radarGlow)" />
            {[32, 60, 88].map((r) => (
              <circle
                key={r}
                cx="100"
                cy="100"
                r={r}
                fill="none"
                stroke="#1c2735"
                strokeWidth="1"
              />
            ))}
            <line x1="100" y1="4" x2="100" y2="196" stroke="#1c2735" strokeWidth="1" />
            <line x1="4" y1="100" x2="196" y2="100" stroke="#1c2735" strokeWidth="1" />

            <g style={{ transformOrigin: "100px 100px" }}>
              <path d="M100 100 L100 4 A96 96 0 0 1 175 55 Z" fill="url(#sweep)">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 100 100"
                  to="360 100 100"
                  dur="4s"
                  repeatCount="indefinite"
                />
              </path>
            </g>

            {CONTACTS.map((c) => {
              const px = (c.x / 100) * 200
              const py = (c.y / 100) * 200
              const color = c.hostile ? "#FF3B52" : "#FFB000"
              return (
                <g key={c.id}>
                  <circle cx={px} cy={py} r="3.5" fill={color}>
                    <animate
                      attributeName="opacity"
                      values="1;0.3;1"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle cx={px} cy={py} r="7" fill="none" stroke={color} strokeWidth="0.75" opacity="0.5" />
                </g>
              )
            })}
          </svg>
        </div>

        <div className="flex flex-col justify-center gap-3 sm:w-44">
          <Readout label="LOCK" value="TGT-01" state="alert" />
          <Readout label="RANGE" value="4.2 KKM" />
          <Readout label="BEARING" value="047 MK-3" />
          <Readout label="VELOCITY" value="1.8 KM/S" />
          <Readout label="CONTACTS" value="03 ACTIVE" state="amber" />
        </div>
      </div>
    </Panel>
  )
}

function Readout({
  label,
  value,
  state = "cyan",
}: {
  label: string
  value: string
  state?: "cyan" | "amber" | "alert"
}) {
  const color =
    state === "alert"
      ? "text-red-alert"
      : state === "amber"
        ? "text-amber-neon"
        : "text-cyan-neon"
  return (
    <div className="flex items-center justify-between border-b border-bridge-border pb-1.5">
      <span className="text-[10px] tracking-[0.2em] text-muted-foreground/70">
        {label}
      </span>
      <span className={`text-sm font-bold tabular-nums tracking-wider ${color}`}>
        {value}
      </span>
    </div>
  )
}
