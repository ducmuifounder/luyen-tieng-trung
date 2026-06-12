// Logo "Tiếng Trung Bùi Nga" — vẽ lại chuẩn theo ảnh gốc
// Cành lá olive với lá hình bầu dục xếp dọc theo cành mảnh

export function LogoCircle({ size = 112 }: { size?: number }) {
  // Hàm tạo 1 lá: ellipse xoay theo góc tại vị trí (cx, cy)
  const Leaf = ({
    cx, cy, angle,
  }: {
    cx: number; cy: number; angle: number;
  }) => (
    <ellipse
      cx={cx} cy={cy}
      rx={7} ry={2.8}
      fill="white"
      transform={`rotate(${angle} ${cx} ${cy})`}
    />
  );

  // Cành trái phía trên: từ (90,54) lên (55,28), góc ~-40°
  const branchTopLeft = [
    { cx: 84, cy: 50, angle: -42, side: 1 },
    { cx: 84, cy: 50, angle: -42 + 90, side: -1 },
    { cx: 76, cy: 44, angle: -45, side: 1 },
    { cx: 76, cy: 44, angle: -45 + 90, side: -1 },
    { cx: 68, cy: 38, angle: -50, side: 1 },
    { cx: 68, cy: 38, angle: -50 + 90, side: -1 },
    { cx: 61, cy: 33, angle: -48, side: 1 },
    { cx: 61, cy: 33, angle: -48 + 90, side: -1 },
  ];

  // Cành phải phía trên: đối xứng với cành trái qua x=100
  const branchTopRight = branchTopLeft.map((l) => ({
    ...l,
    cx: 200 - l.cx,
    angle: l.side === 1 ? (180 - l.angle + 180) % 360 - 180 : (180 - (l.angle) + 180) % 360 - 180,
  }));

  // Cành dưới giữa: từ (78,152) qua (100,168) đến (122,152)
  const branchBottom = [
    // Nhánh trái
    { cx: 82,  cy: 150, angle: 42 },
    { cx: 82,  cy: 150, angle: 42 - 90 },
    { cx: 89,  cy: 157, angle: 55 },
    { cx: 89,  cy: 157, angle: 55 - 90 },
    { cx: 97,  cy: 163, angle: 80 },
    { cx: 97,  cy: 163, angle: 80 - 90 },
    // Nhánh phải (đối xứng)
    { cx: 118, cy: 150, angle: -42 },
    { cx: 118, cy: 150, angle: -42 - 90 },
    { cx: 111, cy: 157, angle: -55 },
    { cx: 111, cy: 157, angle: -55 - 90 },
    { cx: 103, cy: 163, angle: -80 },
    { cx: 103, cy: 163, angle: -80 - 90 },
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Nền tròn */}
      <circle cx="100" cy="100" r="100" fill="#3d6b45" />

      {/* ── CÀNH LÁ TRÊN TRÁI ── */}
      {/* Thân cành */}
      <path
        d="M 90,54 Q 73,43 57,29"
        stroke="white" strokeWidth="1.4" fill="none"
        strokeLinecap="round"
      />
      {/* Lá trên cành trái */}
      <Leaf cx={84} cy={50} angle={-138} />
      <Leaf cx={84} cy={50} angle={-48} />
      <Leaf cx={76} cy={44} angle={-135} />
      <Leaf cx={76} cy={44} angle={-45} />
      <Leaf cx={68} cy={38} angle={-132} />
      <Leaf cx={68} cy={38} angle={-42} />
      <Leaf cx={61} cy={33} angle={-132} />
      <Leaf cx={61} cy={33} angle={-42} />

      {/* ── CÀNH LÁ TRÊN PHẢI (đối xứng) ── */}
      <path
        d="M 110,54 Q 127,43 143,29"
        stroke="white" strokeWidth="1.4" fill="none"
        strokeLinecap="round"
      />
      <Leaf cx={116} cy={50} angle={138} />
      <Leaf cx={116} cy={50} angle={48} />
      <Leaf cx={124} cy={44} angle={135} />
      <Leaf cx={124} cy={44} angle={45} />
      <Leaf cx={132} cy={38} angle={132} />
      <Leaf cx={132} cy={38} angle={42} />
      <Leaf cx={139} cy={33} angle={132} />
      <Leaf cx={139} cy={33} angle={42} />

      {/* ── VĂN BẢN ── */}
      <text
        x="100" y="88"
        textAnchor="middle"
        fill="white"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="bold"
        fontSize="16.5"
        letterSpacing="0.3"
      >
        Tiếng Trung Bùi Nga
      </text>

      <text
        x="100" y="109"
        textAnchor="middle"
        fill="white"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
        fontSize="11"
        letterSpacing="0.5"
      >
        Tiếng Trung cho mọi người
      </text>

      <text
        x="100" y="128"
        textAnchor="middle"
        fill="white"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="11.5"
        letterSpacing="1"
      >
        Zalo: 036 800 4855
      </text>

      {/* ── CÀNH LÁ DƯỚI ── */}
      {/* Thân cành trái */}
      <path
        d="M 100,167 Q 90,158 78,150"
        stroke="white" strokeWidth="1.4" fill="none"
        strokeLinecap="round"
      />
      {/* Thân cành phải */}
      <path
        d="M 100,167 Q 110,158 122,150"
        stroke="white" strokeWidth="1.4" fill="none"
        strokeLinecap="round"
      />
      {/* Lá dưới trái */}
      <Leaf cx={95}  cy={163} angle={-110} />
      <Leaf cx={95}  cy={163} angle={-20} />
      <Leaf cx={88}  cy={157} angle={-125} />
      <Leaf cx={88}  cy={157} angle={-35} />
      <Leaf cx={82}  cy={152} angle={-135} />
      <Leaf cx={82}  cy={152} angle={-45} />
      {/* Lá dưới phải */}
      <Leaf cx={105} cy={163} angle={110} />
      <Leaf cx={105} cy={163} angle={20} />
      <Leaf cx={112} cy={157} angle={125} />
      <Leaf cx={112} cy={157} angle={35} />
      <Leaf cx={118} cy={152} angle={135} />
      <Leaf cx={118} cy={152} angle={45} />
    </svg>
  );
}
