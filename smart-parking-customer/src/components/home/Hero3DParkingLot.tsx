interface CarData {
  id: string
  slot: string
  color: string
  windowColor: string
  isTaxi?: boolean
  type: string
}

const CARS: CarData[] = [
  // Top Row (2 cars)
  { id: "1", slot: "A-01", color: "#f97316", windowColor: "#1e293b", type: "Sport Hatch" },      // Orange
  { id: "2", slot: "A-02", color: "#06b6d4", windowColor: "#0f172a", type: "Electric Sedan" },  // Light Cyan Blue (Animated)
  // Bottom Row (2 cars)
  { id: "3", slot: "B-01", color: "#eab308", windowColor: "#1e293b", isTaxi: true, type: "City Taxi" }, // Yellow Taxi
  { id: "4", slot: "B-02", color: "#ffffff", windowColor: "#0f172a", type: "White SUV" },        // White SUV
]

/** SVG Vector Top-Down Car matching the user's reference image */
function TopDownCarSVG({ car }: { car: CarData }) {
  const isWhite = car.color === "#ffffff"

  return (
    <svg viewBox="0 0 100 180" className="w-full h-full drop-shadow-2xl transition-transform duration-300">
      {/* Car Drop Shadow */}
      <ellipse cx="50" cy="95" rx="44" ry="84" fill="rgba(0,0,0,0.4)" filter="blur(5px)" />

      {/* Main Chassis / Body */}
      <rect
        x="10"
        y="8"
        width="80"
        height="164"
        rx="28"
        ry="28"
        fill={car.color}
        stroke={isWhite ? "#cbd5e1" : "rgba(0,0,0,0.18)"}
        strokeWidth="2.5"
      />

      {/* Side Mirrors */}
      <rect x="2" y="50" width="11" height="20" rx="4" fill={car.color} />
      <rect x="87" y="50" width="11" height="20" rx="4" fill={car.color} />

      {/* Windshield Front */}
      <path
        d="M 20 54 Q 50 46 80 54 L 74 82 Q 50 86 26 82 Z"
        fill={car.windowColor}
      />
      {/* Front Windshield Highlight */}
      <path
        d="M 24 56 Q 50 50 76 56 L 73 65 Q 50 61 27 65 Z"
        fill="rgba(255,255,255,0.3)"
      />

      {/* Rear Window */}
      <path
        d="M 24 130 Q 50 136 76 130 L 80 150 Q 50 156 20 150 Z"
        fill={car.windowColor}
      />

      {/* Side Windows (Left & Right) */}
      <path d="M 16 62 L 22 62 L 20 126 L 16 126 Z" fill={car.windowColor} />
      <path d="M 84 62 L 78 62 L 80 126 L 84 126 Z" fill={car.windowColor} />

      {/* Roof Pillar / Top Roof */}
      <rect
        x="22"
        y="84"
        width="56"
        height="44"
        rx="9"
        fill={isWhite ? "#f1f5f9" : "rgba(0,0,0,0.14)"}
      />

      {/* Front Headlights (Bright Yellow/White Glow) */}
      <ellipse cx="22" cy="14" rx="9" ry="5" fill="#fef08a" />
      <ellipse cx="78" cy="14" rx="9" ry="5" fill="#fef08a" />

      {/* Rear Taillights (Red LED) */}
      <rect x="16" y="165" width="18" height="7" rx="3.5" fill="#ef4444" />
      <rect x="66" y="165" width="18" height="7" rx="3.5" fill="#ef4444" />

      {/* Taxi Special Pattern & Roof Sign */}
      {car.isTaxi && (
        <g>
          {/* Taxi Checkers Pattern on Roof */}
          <rect x="34" y="30" width="8" height="7" fill="#000" />
          <rect x="42" y="30" width="8" height="7" fill="#fff" />
          <rect x="50" y="30" width="8" height="7" fill="#000" />
          <rect x="58" y="30" width="8" height="7" fill="#fff" />

          <rect x="34" y="144" width="8" height="7" fill="#000" />
          <rect x="42" y="144" width="8" height="7" fill="#fff" />
          <rect x="50" y="144" width="8" height="7" fill="#000" />
          <rect x="58" y="144" width="8" height="7" fill="#fff" />

          {/* TAXI Roof Box */}
          <rect x="30" y="92" width="40" height="16" rx="4" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
          <text x="50" y="103" fontSize="9" fontWeight="bold" fill="#000" textAnchor="middle" dominantBaseline="middle">
            TAXI
          </text>
        </g>
      )}
    </svg>
  )
}

function Hero3DParkingLot() {
  return (
    <div className="relative w-full max-w-md sm:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto p-2 sm:p-4 pointer-events-none">
      {/* Inline Keyframe Style for Car Parking & Empty Slot Radar Animation */}
      <style>{`
        @keyframes parkIntoSlot2Col {
          0% {
            transform: translate(-260%, 108%) rotate(90deg);
            opacity: 0;
          }
          6% {
            opacity: 1;
            transform: translate(-240%, 108%) rotate(90deg);
          }
          38% {
            /* Driving from far left edge across center lane to slot A-02 */
            transform: translate(0%, 108%) rotate(90deg);
          }
          50% {
            /* Smooth turn into slot A-02 */
            transform: translate(0%, 35%) rotate(0deg);
          }
          58%, 82% {
            /* Perfectly parked inside slot A-02 */
            transform: translate(0%, 0%) rotate(0deg);
            opacity: 1;
          }
          92% {
            opacity: 0;
            transform: translate(0%, 0%) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translate(-260%, 108%) rotate(90deg);
          }
        }

        @media (max-width: 640px) {
          @keyframes parkIntoSlot2Col {
            0% {
              transform: translate(-250%, 104%) rotate(90deg);
              opacity: 0;
            }
            6% {
              opacity: 1;
              transform: translate(-230%, 104%) rotate(90deg);
            }
            38% {
              transform: translate(0%, 104%) rotate(90deg);
            }
            50% {
              transform: translate(0%, 32%) rotate(0deg);
            }
            58%, 82% {
              transform: translate(0%, 0%) rotate(0deg);
              opacity: 1;
            }
            92% {
              opacity: 0;
              transform: translate(0%, 0%) rotate(0deg);
            }
            100% {
              opacity: 0;
              transform: translate(-250%, 104%) rotate(90deg);
            }
          }
        }

        .animated-car-parking-2col {
          animation: parkIntoSlot2Col 7.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        /* Empty Target Slot Animation (Active when slot is empty, stops when car parks) */
        @keyframes targetSlotGlowSync {
          0%, 42% {
            opacity: 1;
            transform: scale(1);
          }
          48%, 88% {
            opacity: 0;
            transform: scale(0.8);
          }
          94%, 100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes emptySlotRadarPulse {
          0% {
            transform: scale(0.85);
            opacity: 0.9;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.3;
          }
          100% {
            transform: scale(0.85);
            opacity: 0.9;
          }
        }
        /* Border Color Animation for Slot A-02 (Green when empty -> Solid Primary Amber when car parks) */
        @keyframes slotBorderColorSync {
          0%, 42% {
            border-color: #34d399;
            box-shadow: none;
            background-color: transparent;
          }
          48%, 88% {
            border-color: #fbbf24;
            box-shadow: none;
            background-color: transparent;
          }
          94%, 100% {
            border-color: #34d399;
            box-shadow: none;
            background-color: transparent;
          }
        }
        .empty-slot-pulse-indicator {
          animation: targetSlotGlowSync 7.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .empty-slot-radar-ring {
          animation: emptySlotRadarPulse 2s ease-in-out infinite;
        }
        .animated-slot-border-sync {
          animation: slotBorderColorSync 7.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }


      `}</style>

      {/* ── Outer layout wrapper: relative so absolute lane overlay works ── */}
      <div className="relative w-full aspect-[4/3.5] p-2 sm:p-4 flex flex-col justify-between overflow-visible">

        {/* Top Row (Slots A-01 and A-02) */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:gap-8 relative z-30 overflow-visible">
          {CARS.slice(0, 2).map((car) => {
            const isAnimatedSlot = car.slot === "A-02"
            return (
              <div
                key={car.id}
                className={`relative flex flex-col items-center justify-center p-2 sm:p-3 rounded-t-2xl border-t-[3px] border-l-[3px] border-r-[3px] border-solid h-34 sm:h-42 lg:h-50 xl:h-56 bg-transparent transition-all duration-300 ${
                  isAnimatedSlot
                    ? "animated-slot-border-sync z-40 overflow-visible"
                    : "border-amber-400/90 bg-transparent z-10"
                }`}
              >
                {isAnimatedSlot && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none empty-slot-pulse-indicator z-10">
                    <div className="absolute w-16 h-16 sm:w-22 sm:h-22 rounded-full border-2 border-dashed border-emerald-400/80 bg-emerald-500/10 empty-slot-radar-ring" />
                    <div className="absolute w-10 h-10 sm:w-14 sm:h-14 rounded-full border border-emerald-400/60 bg-emerald-400/10" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                )}
                <div className="w-[58%] sm:w-[62%] h-24 sm:h-32 lg:h-38 xl:h-44 flex items-center justify-center p-1 relative z-50 overflow-visible">
                  {isAnimatedSlot ? (
                    <div className="w-full h-full animated-car-parking-2col relative z-50 overflow-visible">
                      <TopDownCarSVG car={car} />
                    </div>
                  ) : (
                    <TopDownCarSVG car={car} />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Center Aisle Spacer */}
        <div className="py-10 sm:py-14 lg:py-18" />

        {/* Bottom Row (Slots B-01 and B-02) */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:gap-8 relative z-10">
          {CARS.slice(2, 4).map((car) => (
            <div
              key={car.id}
              className="relative flex flex-col items-center justify-center p-2 sm:p-3 rounded-b-2xl border-b-[3px] border-l-[3px] border-r-[3px] border-solid border-amber-400/90 bg-transparent h-34 sm:h-42 lg:h-50 xl:h-56 relative z-10"
            >
              <div className="w-[58%] sm:w-[62%] h-24 sm:h-32 lg:h-38 xl:h-44 flex items-center justify-center p-1 rotate-180 relative z-20">
                <TopDownCarSVG car={car} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Hero3DParkingLot;
