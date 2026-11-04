import './winter-theme.css';

export default function WinterFrostOverlay() {
  return (
    <div aria-hidden="true" className="winter-frost-frame pointer-events-none fixed inset-0 z-30 select-none">
      <div className="winter-ice-edge absolute inset-0" />
      {['left-0 top-0', 'right-0 top-0 -scale-x-100', 'bottom-0 left-0 -scale-y-100', 'bottom-0 right-0 -scale-x-100 -scale-y-100'].map(corner => (
        <svg key={corner} viewBox="0 0 220 220" fill="none" className={`winter-ice-crystal absolute h-12 w-12 sm:h-20 sm:w-20 ${corner}`}>
          <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <path strokeWidth="1.6" d="M0 0L153 153M0 16L81 180M16 0L180 81" />
            <path d="M28 28L29 66M28 28L66 29M53 53L53 101M53 53L101 53M80 80L81 126M80 80L126 81M110 110L112 145M110 110L145 112M132 132L133 156M132 132L156 133" />
            <path strokeWidth="0.7" d="M29 45L15 60M29 45L44 57M53 77L34 95M53 77L69 92M66 29L57 44M66 29L80 17M81 104L65 119M81 104L96 119M101 53L92 69M101 53L116 39M126 81L119 96M126 81L141 69" />
            <path d="M21 58L4 77M21 58L55 70M37 91L17 115M37 91L66 102M53 123L32 147M53 123L77 130M58 21L77 4M58 21L70 55M91 37L115 17M91 37L102 66M123 53L147 32M123 53L130 77" />
            <path strokeWidth="0.6" d="M4 22L63 9M9 63L22 4M0 112L21 98M112 0L98 21M7 147L33 163M147 7L163 33" />
          </g>
        </svg>
      ))}
    </div>
  );
}
