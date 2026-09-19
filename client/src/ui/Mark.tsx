// The app's mark: a gold heart wearing a honey tiara, outlined like a
// sticker. Lovissimi's sister mark (its heart wears a crown). On the cards it
// sits in the corner, and again upside down in the opposite corner, the way a
// playing card mirrors its index.
export function Mark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <g stroke="var(--inchiostro)" strokeWidth="2" strokeLinejoin="round">
        <path
          fill="var(--oro)"
          d="M20 37 C12.6 30.6 5.5 25.8 5.5 18.6 C5.5 13.4 9.4 10.5 13.3 10.5 C16.2 10.5 18.7 12.2 20 14.8 C21.3 12.2 23.8 10.5 26.7 10.5 C30.6 10.5 34.5 13.4 34.5 18.6 C34.5 25.8 27.4 30.6 20 37 Z"
        />
        <path fill="var(--miele)" d="M12 13.2 L10.8 5 L16 8.8 L20 2.6 L24 8.8 L29.2 5 L28 13.2 Q20 16.4 12 13.2 Z" />
      </g>
    </svg>
  );
}
