// Logo tròn "Tiếng Trung Bùi Nga" — dựng bằng SVG, không cần file ảnh
export function LogoCircle({ size = 112 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: "50%", display: "block" }}
    >
      {/* Nền tròn xanh lá */}
      <circle cx="100" cy="100" r="100" fill="#3d6b45" />

      {/* ── Cành lá trên ── */}
      <g fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
        {/* Cành trái trên */}
        <path d="M62 46 Q55 38 48 42" /><path d="M62 46 Q58 36 52 36" />
        <path d="M62 46 Q65 36 60 31" /><path d="M62 46 Q70 38 67 31" />
        <path d="M62 46 Q74 42 73 35" />
        <path d="M48 52 Q62 46 78 44" />
        {/* Cành phải trên */}
        <path d="M138 46 Q145 38 152 42" /><path d="M138 46 Q142 36 148 36" />
        <path d="M138 46 Q135 36 140 31" /><path d="M138 46 Q130 38 133 31" />
        <path d="M138 46 Q126 42 127 35" />
        <path d="M152 52 Q138 46 122 44" />
      </g>

      {/* ── Văn bản ── */}
      {/* Tiếng Trung Bùi Nga */}
      <text
        x="100" y="90"
        textAnchor="middle"
        fill="white"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="bold"
        fontSize="17"
        letterSpacing="0.5"
      >
        Tiếng Trung Bùi Nga
      </text>

      {/* Tiếng Trung cho mọi người (italic) */}
      <text
        x="100" y="112"
        textAnchor="middle"
        fill="white"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
        fontSize="11.5"
        letterSpacing="0.3"
      >
        Tiếng Trung cho mọi người
      </text>

      {/* Zalo */}
      <text
        x="100" y="133"
        textAnchor="middle"
        fill="white"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="11.5"
        letterSpacing="0.5"
      >
        Zalo: 036 800 4855
      </text>

      {/* ── Cành lá dưới ── */}
      <g fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
        {/* Trái dưới */}
        <path d="M72 158 Q65 166 58 162" /><path d="M72 158 Q68 168 62 168" />
        <path d="M72 158 Q75 168 70 173" /><path d="M72 158 Q80 166 77 173" />
        <path d="M72 158 Q84 162 83 169" />
        <path d="M58 152 Q72 158 88 160" />
        {/* Phải dưới */}
        <path d="M128 158 Q135 166 142 162" /><path d="M128 158 Q132 168 138 168" />
        <path d="M128 158 Q125 168 130 173" /><path d="M128 158 Q120 166 123 173" />
        <path d="M128 158 Q116 162 117 169" />
        <path d="M142 152 Q128 158 112 160" />
      </g>
    </svg>
  );
}
