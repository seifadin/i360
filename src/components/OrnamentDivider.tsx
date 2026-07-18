import { useId } from 'react'

// Thin horizontal divider strip: 22.5°-rotated khatam (8-pointed) stars,
// spaced so adjacent stars touch at exactly two points with no overlap —
// the exact spacing/rotation agreed on in the mockup round. Sized close to
// ScienceMinor's text-base (16px) rather than a flat guess. Named
// generically (OrnamentDivider, not KhatamDivider) since a motif swap is
// considered reasonably likely — the khatam pattern itself is still the
// only one implemented; this is a naming choice, not added flexibility.
export default function OrnamentDivider() {
  const patternId = useId()

  return (
    <svg width="100%" height="18" aria-hidden="true">
      <defs>
        <pattern id={patternId} width="14.4" height="18" patternUnits="userSpaceOnUse">
          <g transform="rotate(22.5 7.2 9)" fill="none" stroke="#0010CF" strokeWidth="0.6">
            <rect x="1.7" y="3.5" width="11" height="11" />
            <rect x="1.7" y="3.5" width="11" height="11" transform="rotate(45 7.2 9)" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="18" fill="#FAF7F2" />
      <rect width="100%" height="18" fill={`url(#${patternId})`} />
    </svg>
  )
}
