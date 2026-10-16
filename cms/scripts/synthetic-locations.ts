// Every fuzzed and withheld coordinate in the seed is invented. None of them
// is a real place, hazardous or otherwise, so nothing in a seeded development
// database points anyone at an open shaft. Each uses a repeated-digit pattern
// so a person reading the CMS can tell at a glance that it is not a survey
// reading, and so a leak check can grep for it: no two share a digit run or a
// rounded form, which means 888888, 46.89, or -81.44 turning up in the build
// can only have come from the withheld stope. Only the two exact entries in
// seed.ts carry real coordinates, and both are public places where precision
// is harmless.
//
// Kept in its own module, with no imports, so the site's
// scripts/assert-seed-canaries.mjs reads the same values the seed writes.
export const SYNTHETIC_LOCATIONS = {
  centreHillHeadframe: { lat: 46.666666, lng: -81.111111 },
  powderMagazine: { lat: 46.555555, lng: -81.222222 },
  kawarthaTug: { lat: 44.444444, lng: -78.777777 },
  collapsedStope: { lat: 46.888888, lng: -81.444444 },
}

// Seeded as withheld, so not even the rounded form may appear in a build.
export const WITHHELD_SYNTHETIC_LOCATIONS: readonly (keyof typeof SYNTHETIC_LOCATIONS)[] = [
  'collapsedStope',
]
