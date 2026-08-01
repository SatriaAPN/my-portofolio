export function BrandMark({
  size = 30,
  showName = true,
  name = "Satria Nusa",
}: {
  size?: number;
  showName?: boolean;
  name?: string;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="flex flex-none items-center justify-center font-semibold text-white"
        style={{
          width: size,
          height: size,
          borderRadius: 9,
          background: "#4f5bd5",
          fontFamily: "var(--font-display)",
          fontSize: Math.round(size * 0.42),
        }}
      >
        SN
      </span>
      {showName && (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 19,
            letterSpacing: "-0.01em",
          }}
        >
          {name}
        </span>
      )}
    </span>
  );
}
