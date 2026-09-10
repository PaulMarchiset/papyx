/**
 * The Papyx lockup: the P, then the name set in the app's own serif.
 *
 * The mark is filled with `currentColor` under `text-accent`, so it is the one
 * piece of vermilion in the header; the name is left in `text-fg` and follows
 * the theme. The wordmark used to be supplied as outlines — it is live text
 * now, which is what lets it share a baseline with the mark at any size and
 * puts the lockup in the same serif as the headline underneath it.
 *
 * The viewBox is cropped to the artwork's own ink (x 153-396.69, y 114-435 of
 * the 550 source box), so the element carries no invisible padding. That crop
 * is what makes the alignment below work: the flat foot of the P *is* the
 * bottom of the box.
 */
export function PapyxLogo({ height = 28 }: { height?: number }) {
  return (
    // items-baseline, not items-center: an inline replaced element sits on the
    // text baseline by its bottom edge, and the bottom edge of that cropped
    // viewBox is the P's foot. The mark therefore stands on the name's own
    // line at any size, with nothing to nudge by hand — which is what the
    // header test checks. The badge beside the lockup is a filled capsule, a
    // box rather than a run of text, and is simply centred against it.
    <span className="inline-flex items-baseline gap-2">
      <svg
        viewBox="153 114 243.687 321"
        height={height}
        width={(height * 243.687) / 321}
        className="text-accent"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M279 114C287.426 114 296.982 114.815 307.353 116.111C318.047 117.084 328.741 119.514 339.436 123.403C350.454 126.968 358.501 132.315 367.575 139.444C376.973 146.574 382.426 155.973 387.936 167.64C393.769 179.306 396.686 193.889 396.687 211.389C396.687 227.916 393.931 241.852 388.422 253.194C382.913 264.213 377.621 273.125 368.547 279.931C359.797 286.736 352.561 291.922 342.839 295.486C333.117 298.727 323.881 300.996 315.131 302.292C306.381 303.264 299.25 303.75 293.741 303.75H240.27V378.462C240.417 392.313 242.521 403.456 246.581 411.889C250.47 420.963 259.706 425.5 274.289 425.5H283.789V435H153V425.5H162.5C177.083 425.5 186.319 420.963 190.208 411.889C194.421 403.139 196.527 391.472 196.527 376.889L196.52 172.5C196.52 157.917 194.413 146.25 190.2 137.5C186.311 128.426 177.075 123.89 162.492 123.89H153V114H279ZM276.728 131.181C270.57 131.181 264.089 131.666 257.283 132.639C250.802 133.611 245.131 134.746 240.27 136.042V286.736H276.728C283.533 286.736 291.149 285.44 299.575 282.848C308.001 280.255 316.265 275.88 324.367 269.723C332.469 263.565 339.112 255.625 344.297 245.902C349.482 235.856 352.075 223.541 352.075 208.958C352.075 194.375 349.482 182.222 344.297 172.5C339.112 162.454 332.469 154.352 324.367 148.194C316.265 142.037 308.001 137.662 299.575 135.069C291.149 132.477 283.533 131.181 276.728 131.181Z"
          fill="currentColor"
        />
      </svg>
      <span className="font-serif text-2xl leading-none text-fg">Papyx</span>
    </span>
  );
}

/**
 * The mark on its own, for square contexts (a tab icon, an empty state). Same
 * artwork, in its uncropped source box, which is where the glyph is centred.
 */
export function PapyxMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 550 550"
      width={size}
      height={size}
      className="text-accent"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M279 114C287.426 114 296.982 114.815 307.353 116.111C318.047 117.084 328.741 119.514 339.436 123.403C350.454 126.968 358.501 132.315 367.575 139.444C376.973 146.574 382.426 155.973 387.936 167.64C393.769 179.306 396.686 193.889 396.687 211.389C396.687 227.916 393.931 241.852 388.422 253.194C382.913 264.213 377.621 273.125 368.547 279.931C359.797 286.736 352.561 291.922 342.839 295.486C333.117 298.727 323.881 300.996 315.131 302.292C306.381 303.264 299.25 303.75 293.741 303.75H240.27V378.462C240.417 392.313 242.521 403.456 246.581 411.889C250.47 420.963 259.706 425.5 274.289 425.5H283.789V435H153V425.5H162.5C177.083 425.5 186.319 420.963 190.208 411.889C194.421 403.139 196.527 391.472 196.527 376.889L196.52 172.5C196.52 157.917 194.413 146.25 190.2 137.5C186.311 128.426 177.075 123.89 162.492 123.89H153V114H279ZM276.728 131.181C270.57 131.181 264.089 131.666 257.283 132.639C250.802 133.611 245.131 134.746 240.27 136.042V286.736H276.728C283.533 286.736 291.149 285.44 299.575 282.848C308.001 280.255 316.265 275.88 324.367 269.723C332.469 263.565 339.112 255.625 344.297 245.902C349.482 235.856 352.075 223.541 352.075 208.958C352.075 194.375 349.482 182.222 344.297 172.5C339.112 162.454 332.469 154.352 324.367 148.194C316.265 142.037 308.001 137.662 299.575 135.069C291.149 132.477 283.533 131.181 276.728 131.181Z"
        fill="currentColor"
      />
    </svg>
  );
}
