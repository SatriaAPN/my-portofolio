import { ReactNode } from "react";

export function Container({
  children,
  className = "",
  max = 1120,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  return (
    <div
      className={`mx-auto w-full px-5 md:px-10 ${className}`}
      style={{ maxWidth: max }}
    >
      {children}
    </div>
  );
}
