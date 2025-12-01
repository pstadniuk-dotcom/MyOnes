// ONES Logo component - white text logo for use in dark backgrounds
export function OnesLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 24" 
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text 
        x="50" 
        y="18" 
        textAnchor="middle" 
        fontFamily="Inter, -apple-system, sans-serif" 
        fontWeight="700" 
        fontSize="20"
        letterSpacing="0.05em"
      >
        ONES
      </text>
    </svg>
  );
}

// Small circular logo badge for chat avatars
export function OnesLogoBadge({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <div className={`${className} rounded-full bg-[#1B4332] flex items-center justify-center`}>
      <span className="text-white font-bold text-xs tracking-wider">ONES</span>
    </div>
  );
}

export default OnesLogo;
