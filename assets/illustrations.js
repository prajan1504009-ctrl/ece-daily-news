/**
 * Colorful Vector Illustration Generators for ECE Domains
 * Renders high-fidelity, vibrant SVG artwork for semiconductors, 6G, photonics, and quantum hardware.
 */
const ECEIllustrations = {
  photonics: () => `
    <svg viewBox="0 0 600 340" class="w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="optBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#090d16" />
          <stop offset="50%" stop-color="#111827" />
          <stop offset="100%" stop-color="#1e1035" />
        </linearGradient>
        <linearGradient id="laserBeam" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.9" />
          <stop offset="40%" stop-color="#a855f7" stop-opacity="1" />
          <stop offset="80%" stop-color="#ec4899" stop-opacity="1" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="1" />
        </linearGradient>
        <radialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.8" />
          <stop offset="60%" stop-color="#3b82f6" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
        </radialGradient>
        <filter id="glowPhotons" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="600" height="340" fill="url(#optBg)" />
      
      <!-- Silicon Substrate Grid -->
      <g stroke="rgba(255,255,255,0.05)" stroke-width="1">
        <line x1="50" y1="50" x2="550" y2="50" /><line x1="50" y1="120" x2="550" y2="120" />
        <line x1="50" y1="190" x2="550" y2="190" /><line x1="50" y1="260" x2="550" y2="260" />
        <line x1="120" y1="30" x2="120" y2="310" /><line x1="260" y1="30" x2="260" y2="310" />
        <line x1="400" y1="30" x2="400" y2="310" /><line x1="520" y1="30" x2="520" y2="310" />
      </g>

      <!-- Optical Waveguide Paths -->
      <path d="M 60 170 L 220 170 Q 250 170 260 140 Q 270 110 300 110 L 460 110" fill="none" stroke="#1e293b" stroke-width="12" stroke-linecap="round" />
      <path d="M 60 170 L 220 170 Q 250 170 260 140 Q 270 110 300 110 L 460 110" fill="none" stroke="url(#laserBeam)" stroke-width="4" filter="url(#glowPhotons)" />
      
      <!-- Micro-ring Resonator -->
      <circle cx="340" cy="180" r="45" fill="none" stroke="#1e293b" stroke-width="10" />
      <circle cx="340" cy="180" r="45" fill="none" stroke="#ec4899" stroke-width="3.5" filter="url(#glowPhotons)" stroke-dasharray="10 4" />
      <circle cx="340" cy="180" r="30" fill="url(#ringGlow)" />
      
      <!-- Photonic Transceiver Die -->
      <rect x="440" y="80" width="100" height="180" rx="8" fill="#0f172a" stroke="#00f0ff" stroke-width="2" />
      <text x="490" y="150" fill="#00f0ff" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">1.6 Tbps</text>
      <text x="490" y="170" fill="#94a3b8" font-family="monospace" font-size="9" text-anchor="middle">CPO ENGINE</text>

      <!-- Laser Emitter Module -->
      <rect x="40" y="145" width="50" height="50" rx="6" fill="#1e1b4b" stroke="#a855f7" stroke-width="2" />
      <circle cx="65" cy="170" r="8" fill="#ffffff" filter="url(#glowPhotons)" />
      
      <!-- Traveling Photons -->
      <circle cx="150" cy="170" r="5" fill="#00f0ff" filter="url(#glowPhotons)" />
      <circle cx="210" cy="170" r="5" fill="#a855f7" filter="url(#glowPhotons)" />
      <circle cx="390" cy="110" r="5" fill="#ec4899" filter="url(#glowPhotons)" />
      
      <!-- Spectrum Band Indicator -->
      <rect x="30" y="275" width="220" height="35" rx="6" fill="rgba(15,23,42,0.85)" stroke="#334155" />
      <text x="42" y="297" fill="#38bdf8" font-family="sans-serif" font-size="11" font-weight="bold">λ = 1310 nm / 1550 nm O-Band</text>
    </svg>
  `,

  telecom: () => `
    <svg viewBox="0 0 600 340" class="w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="telBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#06121e" />
          <stop offset="100%" stop-color="#0d2b3a" />
        </linearGradient>
        <linearGradient id="beamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#00f0ff" stop-opacity="0.1" />
        </linearGradient>
        <filter id="telGlow">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="600" height="340" fill="url(#telBg)" />

      <!-- Radiating RF Beam Waves -->
      <path d="M 120 220 Q 300 80 520 120 L 540 240 Q 300 160 120 220 Z" fill="url(#beamGradient)" />
      
      <!-- Concentric Phased Array Wavefronts -->
      <circle cx="120" cy="220" r="70" fill="none" stroke="#10b981" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.6" />
      <circle cx="120" cy="220" r="130" fill="none" stroke="#10b981" stroke-width="1.5" stroke-dasharray="8 6" opacity="0.4" />
      <circle cx="120" cy="220" r="200" fill="none" stroke="#00f0ff" stroke-width="1" stroke-dasharray="10 8" opacity="0.3" />
      <circle cx="120" cy="220" r="280" fill="none" stroke="#00f0ff" stroke-width="1" stroke-dasharray="12 10" opacity="0.2" />

      <!-- 5G / 6G Small Cell Antenna Tower -->
      <g transform="translate(80, 100)">
        <polygon points="40,20 10,140 70,140" fill="#0f172a" stroke="#10b981" stroke-width="2" />
        <line x1="40" y1="20" x2="40" y2="0" stroke="#00f0ff" stroke-width="4" />
        <!-- Antenna Elements Array -->
        <rect x="25" y="10" width="30" height="20" rx="3" fill="#1e293b" stroke="#10b981" stroke-width="1.5" />
        <circle cx="40" cy="0" r="6" fill="#10b981" filter="url(#telGlow)" />
        <line x1="20" y1="60" x2="60" y2="60" stroke="#334155" stroke-width="2" />
        <line x1="15" y1="100" x2="65" y2="100" stroke="#334155" stroke-width="2" />
      </g>

      <!-- Constellation Diagram (QAM-64) -->
      <g transform="translate(420, 40)">
        <rect width="140" height="140" rx="8" fill="rgba(15,23,42,0.9)" stroke="#10b981" stroke-width="1.5" />
        <line x1="70" y1="15" x2="70" y2="125" stroke="#334155" stroke-width="1" />
        <line x1="15" y1="70" x2="125" y2="70" stroke="#334155" stroke-width="1" />
        <!-- Constellation Points -->
        <circle cx="45" cy="45" r="3" fill="#00f0ff" filter="url(#telGlow)" />
        <circle cx="95" cy="45" r="3" fill="#00f0ff" filter="url(#telGlow)" />
        <circle cx="45" cy="95" r="3" fill="#00f0ff" filter="url(#telGlow)" />
        <circle cx="95" cy="95" r="3" fill="#00f0ff" filter="url(#telGlow)" />
        <circle cx="30" cy="30" r="2" fill="#10b981" /><circle cx="60" cy="30" r="2" fill="#10b981" />
        <circle cx="80" cy="30" r="2" fill="#10b981" /><circle cx="110" cy="30" r="2" fill="#10b981" />
        <text x="70" y="135" fill="#10b981" font-family="monospace" font-size="9" text-anchor="middle">256-QAM BEAMFORMING</text>
      </g>

      <!-- O-RAN Specification Badge -->
      <rect x="350" y="270" width="210" height="40" rx="6" fill="rgba(15,23,42,0.9)" stroke="#00f0ff" stroke-width="1" />
      <text x="365" y="295" fill="#34d399" font-family="sans-serif" font-size="12" font-weight="bold">O-RAN mmWave 28 GHz</text>
    </svg>
  `,

  cleanroom: () => `
    <svg viewBox="0 0 600 340" class="w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="crBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0b1329" />
          <stop offset="100%" stop-color="#04223d" />
        </linearGradient>
        <radialGradient id="waferGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#e0f2fe" />
          <stop offset="35%" stop-color="#38bdf8" />
          <stop offset="65%" stop-color="#818cf8" />
          <stop offset="90%" stop-color="#c084fc" />
          <stop offset="100%" stop-color="#0284c7" />
        </radialGradient>
        <linearGradient id="euvLaser" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#c084fc" stop-opacity="1" />
          <stop offset="50%" stop-color="#a855f7" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.9" />
        </linearGradient>
        <filter id="cleanGlow">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="600" height="340" fill="url(#crBg)" />

      <!-- ISO Class 1 Cleanroom Flow Vectors -->
      <g stroke="rgba(56, 189, 248, 0.15)" stroke-width="1.5">
        <line x1="80" y1="20" x2="80" y2="100" stroke-dasharray="6 6" />
        <line x1="160" y1="20" x2="160" y2="100" stroke-dasharray="6 6" />
        <line x1="240" y1="20" x2="240" y2="100" stroke-dasharray="6 6" />
        <line x1="360" y1="20" x2="360" y2="100" stroke-dasharray="6 6" />
        <line x1="480" y1="20" x2="480" y2="100" stroke-dasharray="6 6" />
      </g>

      <!-- 300mm Silicon Wafer with Iridescent Die Grid -->
      <g transform="translate(180, 110)">
        <ellipse cx="120" cy="110" rx="140" ry="85" fill="url(#waferGrad)" stroke="#38bdf8" stroke-width="2" />
        <!-- Wafer Flat Notch -->
        <path d="M 110 25 L 130 25" stroke="#0f172a" stroke-width="4" />
        
        <!-- Die Patterns on Wafer -->
        <g stroke="rgba(15, 23, 42, 0.45)" stroke-width="1">
          <line x1="30" y1="90" x2="210" y2="90" /><line x1="20" y1="110" x2="220" y2="110" /><line x1="40" y1="130" x2="200" y2="130" />
          <line x1="70" y1="50" x2="70" y2="170" /><line x1="100" y1="40" x2="100" y2="180" />
          <line x1="130" y1="40" x2="130" y2="180" /><line x1="160" y1="50" x2="160" y2="170" />
        </g>
      </g>

      <!-- EUV / DUV Lithography Objective Lens & Beam -->
      <polygon points="280,20 320,20 310,150 290,150" fill="url(#euvLaser)" filter="url(#cleanGlow)" />
      <ellipse cx="300" cy="155" rx="18" ry="6" fill="#ffffff" filter="url(#cleanGlow)" />
      
      <!-- Stepper Objective Lens Housing -->
      <rect x="260" y="10" width="80" height="35" rx="4" fill="#1e293b" stroke="#00f0ff" stroke-width="1.5" />
      <text x="300" y="32" fill="#38bdf8" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">EUV 13.5nm</text>

      <!-- Spec Banner -->
      <rect x="40" y="270" width="220" height="42" rx="6" fill="rgba(15,23,42,0.9)" stroke="#38bdf8" stroke-width="1" />
      <text x="55" y="295" fill="#38bdf8" font-family="sans-serif" font-size="12" font-weight="bold">Class 100 Cleanroom • CAST</text>
    </svg>
  `,

  chip: () => `
    <svg viewBox="0 0 600 340" class="w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="chipBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0c0a1a" />
          <stop offset="100%" stop-color="#1e1438" />
        </linearGradient>
        <linearGradient id="dieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e293b" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
      </defs>
      <rect width="600" height="340" fill="url(#chipBg)" />

      <!-- Outer IC Package Pins -->
      <g stroke="#f59e0b" stroke-width="4" stroke-linecap="round">
        <line x1="160" y1="50" x2="160" y2="70" /><line x1="200" y1="50" x2="200" y2="70" /><line x1="240" y1="50" x2="240" y2="70" />
        <line x1="280" y1="50" x2="280" y2="70" /><line x1="320" y1="50" x2="320" y2="70" /><line x1="360" y1="50" x2="360" y2="70" />
        <line x1="400" y1="50" x2="400" y2="70" /><line x1="440" y1="50" x2="440" y2="70" />
        <!-- Bottom pins -->
        <line x1="160" y1="270" x2="160" y2="290" /><line x1="200" y1="270" x2="200" y2="290" /><line x1="240" y1="270" x2="240" y2="290" />
        <line x1="280" y1="270" x2="280" y2="290" /><line x1="320" y1="270" x2="320" y2="290" /><line x1="360" y1="270" x2="360" y2="290" />
        <line x1="400" y1="270" x2="400" y2="290" /><line x1="440" y1="270" x2="440" y2="290" />
      </g>

      <!-- Silicon Die Package -->
      <rect x="130" y="70" width="340" height="200" rx="10" fill="url(#dieGrad)" stroke="#f59e0b" stroke-width="2" />
      
      <!-- Core Architecture Blocks -->
      <rect x="155" y="95" width="130" height="70" rx="4" fill="#1e1b4b" stroke="#818cf8" stroke-width="1.5" />
      <text x="220" y="130" fill="#a5b4fc" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">RISC-V RV64GC</text>
      <text x="220" y="150" fill="#64748b" font-family="sans-serif" font-size="9" text-anchor="middle">Out-of-Order Core</text>

      <rect x="155" y="175" width="130" height="70" rx="4" fill="#064e3b" stroke="#34d399" stroke-width="1.5" />
      <text x="220" y="210" fill="#6ee7b7" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">ASIL-D LOCKSTEP</text>
      <text x="220" y="230" fill="#64748b" font-family="sans-serif" font-size="9" text-anchor="middle">Automotive Safety</text>

      <rect x="315" y="95" width="130" height="150" rx="4" fill="#3b0764" stroke="#d8b4fe" stroke-width="1.5" />
      <text x="380" y="140" fill="#e9d5ff" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">NPU MATRIX</text>
      <text x="380" y="160" fill="#c084fc" font-family="monospace" font-size="10" text-anchor="middle">16 TOPS Edge AI</text>
      <circle cx="380" cy="195" r="18" fill="none" stroke="#e9d5ff" stroke-width="1" stroke-dasharray="4 2" />
      <text x="380" y="200" fill="#e9d5ff" font-family="monospace" font-size="10" text-anchor="middle">SRAM</text>
    </svg>
  `,

  circuit_flag: () => `
    <svg viewBox="0 0 600 340" class="w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="inBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a101f" />
          <stop offset="100%" stop-color="#141c2e" />
        </linearGradient>
        <linearGradient id="triGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ff9933" />
          <stop offset="50%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#138808" />
        </linearGradient>
      </defs>
      <rect width="600" height="340" fill="url(#inBg)" />

      <!-- Tricolor Circuit Traces -->
      <path d="M 40 80 L 160 80 L 220 140 L 400 140" fill="none" stroke="#ff9933" stroke-width="4" />
      <circle cx="40" cy="80" r="7" fill="#ff9933" />
      <path d="M 40 170 L 180 170 L 240 170 L 400 170" fill="none" stroke="#ffffff" stroke-width="4" />
      <circle cx="40" cy="170" r="7" fill="#ffffff" />
      <path d="M 40 260 L 160 260 L 220 200 L 400 200" fill="none" stroke="#138808" stroke-width="4" />
      <circle cx="40" cy="260" r="7" fill="#138808" />

      <!-- India Semiconductor Mission Mega Fab Emblem -->
      <g transform="translate(420, 90)">
        <rect width="140" height="160" rx="8" fill="#0f172a" stroke="url(#triGrad)" stroke-width="3" />
        <!-- Ashoka Chakra Microchip Core -->
        <circle cx="70" cy="65" r="32" fill="none" stroke="#38bdf8" stroke-width="2" />
        <circle cx="70" cy="65" r="6" fill="#38bdf8" />
        <!-- 24 Spokes (simplified) -->
        <line x1="70" y1="35" x2="70" y2="95" stroke="#38bdf8" stroke-width="1.5" />
        <line x1="40" y1="65" x2="100" y2="65" stroke="#38bdf8" stroke-width="1.5" />
        <line x1="48" y1="43" x2="92" y2="87" stroke="#38bdf8" stroke-width="1.5" />
        <line x1="48" y1="87" x2="92" y2="43" stroke="#38bdf8" stroke-width="1.5" />

        <text x="70" y="125" fill="#f8fafc" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">SEMICON 2.0</text>
        <text x="70" y="145" fill="#fbbf24" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">₹1,27,500 CR</text>
      </g>
    </svg>
  `,

  quantum_space: () => `
    <svg viewBox="0 0 600 340" class="w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="spBg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#020617" />
          <stop offset="60%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#0369a1" />
        </linearGradient>
        <linearGradient id="qkdBeam" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ec4899" stop-opacity="0.9" />
          <stop offset="50%" stop-color="#a855f7" stop-opacity="0.7" />
          <stop offset="100%" stop-color="#00f0ff" stop-opacity="0.9" />
        </linearGradient>
      </defs>
      <rect width="600" height="340" fill="url(#spBg)" />

      <!-- Earth Atmosphere Curve -->
      <ellipse cx="300" cy="420" rx="380" ry="140" fill="#0284c7" opacity="0.4" />
      <ellipse cx="300" cy="440" rx="350" ry="120" fill="#0f172a" />

      <!-- ISRO Quantum Satellite -->
      <g transform="translate(240, 40)">
        <!-- Solar Panels -->
        <rect x="-80" y="15" width="70" height="35" rx="3" fill="#1e3a8a" stroke="#60a5fa" stroke-width="1.5" />
        <rect x="70" y="15" width="70" height="35" rx="3" fill="#1e3a8a" stroke="#60a5fa" stroke-width="1.5" />
        <!-- Satellite Body -->
        <rect x="0" y="5" width="60" height="55" rx="6" fill="#cbd5e1" stroke="#f59e0b" stroke-width="2" />
        <!-- Transmitter Lens -->
        <circle cx="30" cy="55" r="10" fill="#ec4899" />
      </g>

      <!-- Entangled Photon Beam -->
      <polygon points="266,95 274,95 315,275 285,275" fill="url(#qkdBeam)" opacity="0.75" />
      
      <!-- Ground Optical Receiver Station -->
      <g transform="translate(270, 260)">
        <path d="M 10 30 Q 30 5 50 30 Z" fill="#1e293b" stroke="#38bdf8" stroke-width="2" />
        <line x1="30" y1="5" x2="30" y2="0" stroke="#00f0ff" stroke-width="3" />
        <circle cx="30" cy="0" r="4" fill="#00f0ff" />
      </g>

      <!-- Quantum Entanglement Label -->
      <rect x="370" y="160" width="190" height="40" rx="6" fill="rgba(15,23,42,0.9)" stroke="#ec4899" stroke-width="1" />
      <text x="382" y="185" fill="#f472b6" font-family="monospace" font-size="11" font-weight="bold">|ψ⟩ = (|00⟩ + |11⟩)/√2</text>
    </svg>
  `,

  gaafet: () => `
    <svg viewBox="0 0 600 340" class="w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gaaBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0b0f19" />
          <stop offset="100%" stop-color="#1f1135" />
        </linearGradient>
      </defs>
      <rect width="600" height="340" fill="url(#gaaBg)" />

      <!-- Source and Drain Pillars -->
      <rect x="100" y="90" width="70" height="160" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2" />
      <text x="135" y="175" fill="#38bdf8" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">SOURCE</text>

      <rect x="430" y="90" width="70" height="160" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2" />
      <text x="465" y="175" fill="#38bdf8" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">DRAIN</text>

      <!-- 3 Vertically Stacked Nanosheet Channels -->
      <rect x="170" y="110" width="260" height="22" rx="3" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5" />
      <rect x="170" y="160" width="260" height="22" rx="3" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5" />
      <rect x="170" y="210" width="260" height="22" rx="3" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5" />

      <!-- All-Around Gate Dielectric Wrap (Translucent High-k Metal Gate) -->
      <rect x="250" y="70" width="100" height="200" rx="8" fill="rgba(168, 85, 247, 0.45)" stroke="#c084fc" stroke-width="2.5" />
      <text x="300" y="60" fill="#e9d5ff" font-family="monospace" font-size="13" font-weight="bold" text-anchor="middle">2nm GAAFET GATE</text>

      <!-- Electron Current Flow Arrows -->
      <g stroke="#00f0ff" stroke-width="2" stroke-linecap="round">
        <line x1="200" y1="121" x2="225" y2="121" /><polyline points="220,117 226,121 220,125" />
        <line x1="200" y1="171" x2="225" y2="171" /><polyline points="220,167 226,171 220,175" />
        <line x1="200" y1="221" x2="225" y2="221" /><polyline points="220,217 226,221 220,225" />
      </g>

      <!-- Backside Power Delivery Network (BSPDN) -->
      <rect x="100" y="280" width="400" height="24" rx="4" fill="#854d0e" stroke="#f59e0b" stroke-width="1.5" />
      <text x="300" y="296" fill="#fef08a" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">BACKSIDE POWER DELIVERY (BSPDN)</text>
    </svg>
  `,

  sub_thz: () => `
    <svg viewBox="0 0 600 340" class="w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="thzBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#080e1c" />
          <stop offset="100%" stop-color="#1e1b4b" />
        </linearGradient>
      </defs>
      <rect width="600" height="340" fill="url(#thzBg)" />

      <!-- Sub-THz High-Frequency Wave Packets -->
      <path d="M 60 170 Q 90 120 120 170 T 180 170 T 240 170 T 300 170 T 360 170 T 420 170 T 480 170 T 540 170" fill="none" stroke="#a855f7" stroke-width="3" />
      <path d="M 60 170 Q 75 140 90 170 T 120 170 T 150 170 T 180 170 T 210 170 T 240 170 T 270 170 T 300 170 T 330 170 T 360 170 T 390 170 T 420 170 T 450 170 T 480 170 T 510 170 T 540 170" fill="none" stroke="#00f0ff" stroke-width="1.5" opacity="0.8" />

      <!-- Horn Antenna Emitter -->
      <polygon points="60,110 140,140 140,200 60,230" fill="#1e293b" stroke="#38bdf8" stroke-width="2" />
      
      <!-- Lens Array -->
      <ellipse cx="280" cy="170" rx="15" ry="70" fill="rgba(56, 189, 248, 0.25)" stroke="#38bdf8" stroke-width="2" />

      <!-- Eye Diagram Metric Overlay -->
      <g transform="translate(380, 50)">
        <rect width="180" height="90" rx="6" fill="rgba(15,23,42,0.9)" stroke="#a855f7" stroke-width="1.5" />
        <!-- Eye pattern curves -->
        <path d="M 20 45 Q 65 15 110 45 Q 155 75 160 45" fill="none" stroke="#00f0ff" stroke-width="2" />
        <path d="M 20 45 Q 65 75 110 45 Q 155 15 160 45" fill="none" stroke="#ec4899" stroke-width="2" />
        <text x="90" y="80" fill="#c084fc" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">> 100 Gbps 300 GHz</text>
      </g>
    </svg>
  `
};
