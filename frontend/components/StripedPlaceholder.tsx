import { CSSProperties } from "react";

// Diagonal-stripe placeholder used wherever a user image hasn't been uploaded.
export function StripedPlaceholder({
  label,
  className = "",
  style,
  radius = 0,
}: {
  label?: string;
  className?: string;
  style?: CSSProperties;
  radius?: number;
}) {
  return (
    <div
      className={`flex items-end ${className}`}
      style={{ background: "var(--stripe)", borderRadius: radius, ...style }}
    >
      {label && (
        <span
          className="m-3"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#9098aa",
            background: "#fff",
            padding: "4px 9px",
            borderRadius: 6,
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

// Renders an uploaded image (dataURL/URL) as a cover, or the striped
// placeholder when empty.
export function CoverImage({
  src,
  label,
  className = "",
  style,
  radius = 0,
}: {
  src?: string;
  label?: string;
  className?: string;
  style?: CSSProperties;
  radius?: number;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={label || ""}
        className={`object-cover ${className}`}
        style={{ borderRadius: radius, ...style }}
      />
    );
  }
  return (
    <StripedPlaceholder label={label} className={className} style={style} radius={radius} />
  );
}
