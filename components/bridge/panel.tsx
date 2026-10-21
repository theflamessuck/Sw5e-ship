import type { ReactNode } from "react"

export function Panel({
  title,
  code,
  accent = "cyan",
  className,
  children,
}: {
  title: string
  code?: string
  accent?: "cyan" | "amber"
  className?: string
  children: ReactNode
}) {
  const accentText = accent === "amber" ? "text-amber-neon" : "text-cyan-neon"
  const accentBorder =
    accent === "amber" ? "border-amber-neon/30" : "border-cyan-neon/30"
  return (
    <section
      className={[
        "flex flex-col rounded-md border bg-bridge-panel",
        accentBorder,
        className ?? "",
      ].join(" ")}
    >
      <header className="flex items-center justify-between border-b border-bridge-border px-4 py-2.5">
        <h2 className={`text-xs font-bold tracking-[0.2em] ${accentText}`}>
          {title.toUpperCase()}
        </h2>
        {code && (
          <span className="text-[10px] tracking-[0.2em] text-muted-foreground/60">
            {code}
          </span>
        )}
      </header>
      <div className="flex-1 p-4">{children}</div>
    </section>
  )
}

export function CornerFrame() {
  const corners = [
    "left-0 top-0 border-l-2 border-t-2",
    "right-0 top-0 border-r-2 border-t-2",
    "left-0 bottom-0 border-l-2 border-b-2",
    "right-0 bottom-0 border-r-2 border-b-2",
  ]
  return (
    <>
      {corners.map((c) => (
        <span
          key={c}
          aria-hidden="true"
          className={`pointer-events-none absolute h-3 w-3 border-cyan-neon/60 ${c}`}
        />
      ))}
    </>
  )
}
