/**
 * Premium section divider — seamless gradient fade between sections.
 * No ugly waves. Just a smooth, elegant transition.
 */

interface SectionDividerProps {
  from?: "cream" | "white";
  to?: "cream" | "white";
  className?: string;
}

const colors = {
  cream: "#ede8e2",
  white: "#ffffff",
};

export default function SectionDivider({
  from = "cream",
  to = "white",
  className = "",
}: SectionDividerProps) {
  const topColor = colors[from];
  const bottomColor = colors[to];

  return (
    <div
      className={`relative w-full h-24 md:h-32 ${className}`}
      style={{
        background: `linear-gradient(to bottom, ${topColor} 0%, ${bottomColor} 100%)`,
      }}
    >
      {/* Subtle center accent line */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
        <div className="w-48 h-px bg-gradient-to-r from-transparent via-[#054700]/[0.06] to-transparent" />
      </div>
    </div>
  );
}
