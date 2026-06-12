export function LogoCircle({ size = 112 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Nền tròn xanh */}
      <circle cx="100" cy="100" r="100" fill="#3d6b45" />

      {/* Tiếng Trung Bùi Nga */}
      <text
        x="100" y="95"
        textAnchor="middle"
        fill="white"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="bold"
        fontSize="18"
        letterSpacing="0.3"
      >
        Tiếng Trung Bùi Nga
      </text>

      {/* Tiếng Trung cho mọi người */}
      <text
        x="100" y="116"
        textAnchor="middle"
        fill="white"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
        fontSize="11.5"
        letterSpacing="0.5"
      >
        Tiếng Trung cho mọi người
      </text>

      {/* Zalo */}
      <text
        x="100" y="136"
        textAnchor="middle"
        fill="white"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="12"
        letterSpacing="1"
      >
        Zalo: 036 800 4855
      </text>
    </svg>
  );
}
