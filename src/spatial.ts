export function placeSpatialCard(
  x: number,
  y: number,
  width: number,
  height: number,
  cardHeight: number,
) {
  const narrow = width < 700,
    margin = narrow ? 14 : 24
  const cardWidth = Math.min(narrow ? 344 : 312, width - margin * 2)
  const maxY = Math.max(112, height - cardHeight - 168)
  const preferredX = x + 54
  const rightEdge = width - cardWidth - (narrow ? margin : 84)
  const left = narrow
    ? (width - cardWidth) / 2
    : Math.max(
        margin,
        Math.min(
          rightEdge,
          preferredX > rightEdge ? x - cardWidth - 54 : preferredX,
        ),
      )
  const top = narrow
    ? maxY
    : Math.max(118, Math.min(maxY, y - cardHeight * 0.38))
  const attachX = Math.max(left + 18, Math.min(left + cardWidth - 18, x))
  const attachY = Math.max(top + 18, Math.min(top + cardHeight - 18, y))
  return {
    x: left,
    y: top,
    width: cardWidth,
    tetherLength: Math.hypot(attachX - x, attachY - y),
    tetherAngle: (Math.atan2(attachY - y, attachX - x) * 180) / Math.PI,
  }
}

export interface SpatialPin {
  key: string
  viewportWidth: number
  viewportHeight: number
  x: number
  y: number
  width: number
  tetherLength: number
  tetherAngle: number
}

// The anchor moves in the world; actionable controls stay where they opened.
export function pinSpatialCard(
  previous: SpatialPin | null,
  key: string,
  x: number,
  y: number,
  width: number,
  height: number,
  cardHeight: number,
): SpatialPin {
  const fresh = placeSpatialCard(x, y, width, height, cardHeight)
  const same =
    previous?.key === key &&
    previous.viewportWidth === width &&
    previous.viewportHeight === height
  const left = same ? previous.x : fresh.x
  const top = same
    ? Math.max(112, Math.min(previous.y, height - cardHeight - 168))
    : fresh.y
  const attachX = Math.max(left + 18, Math.min(left + fresh.width - 18, x))
  const attachY = Math.max(top + 18, Math.min(top + cardHeight - 18, y))
  return {
    key,
    viewportWidth: width,
    viewportHeight: height,
    x: left,
    y: top,
    width: fresh.width,
    tetherLength: Math.hypot(attachX - x, attachY - y),
    tetherAngle: (Math.atan2(attachY - y, attachX - x) * 180) / Math.PI,
  }
}
