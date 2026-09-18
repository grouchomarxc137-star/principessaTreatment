import type { HTMLAttributes, ReactNode } from "react";
import { Mark } from "./Mark.tsx";

// A playing card: the mark as index top-left, the same index turned in the
// opposite corner.
export function Card({
  children,
  className = "",
  his = false,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  his?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card ${his ? "card--his" : ""} ${className}`} {...rest}>
      <Mark className="card__index" />
      {children}
      <Mark className="card__index card__index--turned" />
    </div>
  );
}

export function CardTitle({ children }: { children: string }) {
  return <p className={`card__title ${children.length > 22 ? "card__title--long" : ""}`}>{children}</p>;
}

export function CardBack() {
  return (
    <div className="card-back">
      <Mark className="card-back__mark" />
    </div>
  );
}
