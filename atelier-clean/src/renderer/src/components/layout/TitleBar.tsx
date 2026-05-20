import { useEffect, useState } from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const off = window.atelier.window.onMaximized(setIsMaximized)
    window.atelier.window.isMaximized().then(setIsMaximized)
    return () => off()
  }, [])

  return (
    <div className="titlebar h-10 flex items-center justify-between leather-bg select-none">
      <div className="flex items-center gap-3 pl-4">
        <div className="flex items-center gap-2">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 19L18 5M4 19L8 22M4 19L1 16M18 5C20 3 22 5 20 7L11 16L7 17L8 13L18 5Z"
              stroke="#C4A35A"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            className="font-display text-[15px] tracking-wider"
            style={{ color: '#C4A35A', fontStyle: 'italic' }}
          >
            Atelier
          </span>
        </div>
        <span className="text-[11px] text-amber-100/40 ml-2 font-ui italic">
          Kişisel yazı atölyesi
        </span>
      </div>
      <div className="flex items-center">
        <button
          onClick={() => window.atelier.window.minimize()}
          className="h-10 w-12 flex items-center justify-center text-amber-100/60 hover:bg-amber-100/5 hover:text-amber-200 transition"
        >
          <Minus size={14} strokeWidth={1.5} />
        </button>
        <button
          onClick={() => window.atelier.window.maximize()}
          className="h-10 w-12 flex items-center justify-center text-amber-100/60 hover:bg-amber-100/5 hover:text-amber-200 transition"
        >
          {isMaximized ? (
            <Copy size={12} strokeWidth={1.5} />
          ) : (
            <Square size={12} strokeWidth={1.5} />
          )}
        </button>
        <button
          onClick={() => window.atelier.window.close()}
          className="h-10 w-12 flex items-center justify-center text-amber-100/60 hover:bg-[#8B2635] hover:text-white transition"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}
