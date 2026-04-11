import type { Reservation } from "@/lib/types"

/**
 * Bistro Nova — reservation history and upcoming bookings.
 * 30 days past  (2026-03-12 → 2026-04-10) + today + 14 days ahead (2026-04-12 → 2026-04-25).
 * Today: 2026-04-11.
 *
 * Each reservation entry represents one sitting.  A busy Friday dinner service
 * might have multiple reservation entries.  menuItemIds represent the dishes
 * ordered by the table — used to derive per-item consumption totals.
 */
export const reservations: Reservation[] = [
  // ── 2026-03-12 (Thu) ──
  { id: "r-001", date: "2026-03-12", covers: 4, menuItemIds: ["menu-005","menu-006","menu-003","menu-015"] },
  { id: "r-002", date: "2026-03-12", covers: 2, menuItemIds: ["menu-007","menu-011","menu-016"] },
  { id: "r-003", date: "2026-03-12", covers: 3, menuItemIds: ["menu-009","menu-002","menu-013"] },

  // ── 2026-03-13 (Fri) ──
  { id: "r-004", date: "2026-03-13", covers: 6, menuItemIds: ["menu-005","menu-007","menu-006","menu-003","menu-015","menu-016"] },
  { id: "r-005", date: "2026-03-13", covers: 4, menuItemIds: ["menu-010","menu-009","menu-002","menu-014"] },
  { id: "r-006", date: "2026-03-13", covers: 5, menuItemIds: ["menu-008","menu-005","menu-011","menu-013","menu-015"] },
  { id: "r-007", date: "2026-03-13", covers: 3, menuItemIds: ["menu-007","menu-004","menu-016"] },

  // ── 2026-03-14 (Sat) ──
  { id: "r-008", date: "2026-03-14", covers: 8, menuItemIds: ["menu-005","menu-007","menu-006","menu-008","menu-003","menu-015","menu-016","menu-012"] },
  { id: "r-009", date: "2026-03-14", covers: 6, menuItemIds: ["menu-009","menu-010","menu-002","menu-013","menu-015","menu-016"] },
  { id: "r-010", date: "2026-03-14", covers: 4, menuItemIds: ["menu-007","menu-005","menu-014","menu-015"] },
  { id: "r-011", date: "2026-03-14", covers: 5, menuItemIds: ["menu-011","menu-009","menu-004","menu-013","menu-016"] },

  // ── 2026-03-15 (Sun) ──
  { id: "r-012", date: "2026-03-15", covers: 6, menuItemIds: ["menu-006","menu-005","menu-003","menu-012","menu-015","menu-016"] },
  { id: "r-013", date: "2026-03-15", covers: 4, menuItemIds: ["menu-008","menu-010","menu-002","menu-015"] },
  { id: "r-014", date: "2026-03-15", covers: 3, menuItemIds: ["menu-011","menu-013","menu-016"] },

  // ── 2026-03-16 (Mon) — quieter ──
  { id: "r-015", date: "2026-03-16", covers: 2, menuItemIds: ["menu-005","menu-015"] },
  { id: "r-016", date: "2026-03-16", covers: 3, menuItemIds: ["menu-011","menu-003","menu-016"] },

  // ── 2026-03-17 (Tue) ──
  { id: "r-017", date: "2026-03-17", covers: 3, menuItemIds: ["menu-006","menu-009","menu-015"] },
  { id: "r-018", date: "2026-03-17", covers: 2, menuItemIds: ["menu-010","menu-016"] },

  // ── 2026-03-18 (Wed) ──
  { id: "r-019", date: "2026-03-18", covers: 4, menuItemIds: ["menu-005","menu-007","menu-003","menu-015"] },
  { id: "r-020", date: "2026-03-18", covers: 3, menuItemIds: ["menu-009","menu-002","menu-016"] },

  // ── 2026-03-19 (Thu) ──
  { id: "r-021", date: "2026-03-19", covers: 5, menuItemIds: ["menu-007","menu-006","menu-005","menu-013","menu-015"] },
  { id: "r-022", date: "2026-03-19", covers: 3, menuItemIds: ["menu-010","menu-011","menu-016"] },

  // ── 2026-03-20 (Fri) ──
  { id: "r-023", date: "2026-03-20", covers: 7, menuItemIds: ["menu-005","menu-007","menu-006","menu-008","menu-003","menu-015","menu-014"] },
  { id: "r-024", date: "2026-03-20", covers: 5, menuItemIds: ["menu-009","menu-010","menu-002","menu-016","menu-013"] },
  { id: "r-025", date: "2026-03-20", covers: 4, menuItemIds: ["menu-007","menu-005","menu-004","menu-015"] },
  { id: "r-026", date: "2026-03-20", covers: 3, menuItemIds: ["menu-011","menu-012","menu-016"] },

  // ── 2026-03-21 (Sat) ──
  { id: "r-027", date: "2026-03-21", covers: 9, menuItemIds: ["menu-005","menu-007","menu-006","menu-008","menu-003","menu-015","menu-016","menu-012","menu-013"] },
  { id: "r-028", date: "2026-03-21", covers: 6, menuItemIds: ["menu-009","menu-010","menu-005","menu-002","menu-015","menu-016"] },
  { id: "r-029", date: "2026-03-21", covers: 4, menuItemIds: ["menu-007","menu-004","menu-014","menu-015"] },
  { id: "r-030", date: "2026-03-21", covers: 5, menuItemIds: ["menu-011","menu-009","menu-013","menu-016","menu-002"] },

  // ── 2026-03-22 (Sun) ──
  { id: "r-031", date: "2026-03-22", covers: 5, menuItemIds: ["menu-006","menu-005","menu-003","menu-015","menu-016"] },
  { id: "r-032", date: "2026-03-22", covers: 4, menuItemIds: ["menu-010","menu-008","menu-013","menu-015"] },
  { id: "r-033", date: "2026-03-22", covers: 3, menuItemIds: ["menu-011","menu-002","menu-016"] },

  // ── 2026-03-23 (Mon) ──
  { id: "r-034", date: "2026-03-23", covers: 2, menuItemIds: ["menu-005","menu-016"] },
  { id: "r-035", date: "2026-03-23", covers: 2, menuItemIds: ["menu-009","menu-015"] },

  // ── 2026-03-24 (Tue) ──
  { id: "r-036", date: "2026-03-24", covers: 3, menuItemIds: ["menu-007","menu-003","menu-015"] },
  { id: "r-037", date: "2026-03-24", covers: 2, menuItemIds: ["menu-010","menu-016"] },

  // ── 2026-03-25 (Wed) ──
  { id: "r-038", date: "2026-03-25", covers: 4, menuItemIds: ["menu-005","menu-006","menu-014","menu-015"] },
  { id: "r-039", date: "2026-03-25", covers: 3, menuItemIds: ["menu-009","menu-011","menu-016"] },

  // ── 2026-03-26 (Thu) ──
  { id: "r-040", date: "2026-03-26", covers: 5, menuItemIds: ["menu-007","menu-005","menu-006","menu-013","menu-015"] },
  { id: "r-041", date: "2026-03-26", covers: 3, menuItemIds: ["menu-010","menu-002","menu-016"] },

  // ── 2026-03-27 (Fri) ──
  { id: "r-042", date: "2026-03-27", covers: 8, menuItemIds: ["menu-005","menu-007","menu-006","menu-008","menu-003","menu-015","menu-016","menu-012"] },
  { id: "r-043", date: "2026-03-27", covers: 5, menuItemIds: ["menu-009","menu-010","menu-002","menu-015","menu-013"] },
  { id: "r-044", date: "2026-03-27", covers: 4, menuItemIds: ["menu-007","menu-005","menu-004","menu-016"] },
  { id: "r-045", date: "2026-03-27", covers: 3, menuItemIds: ["menu-011","menu-014","menu-015"] },

  // ── 2026-03-28 (Sat) ──
  { id: "r-046", date: "2026-03-28", covers: 10, menuItemIds: ["menu-005","menu-007","menu-006","menu-008","menu-009","menu-003","menu-015","menu-016","menu-014","menu-013"] },
  { id: "r-047", date: "2026-03-28", covers: 7,  menuItemIds: ["menu-010","menu-005","menu-006","menu-002","menu-015","menu-016","menu-012"] },
  { id: "r-048", date: "2026-03-28", covers: 5,  menuItemIds: ["menu-007","menu-004","menu-011","menu-016","menu-015"] },
  { id: "r-049", date: "2026-03-28", covers: 4,  menuItemIds: ["menu-009","menu-013","menu-016","menu-002"] },

  // ── 2026-03-29 (Sun) ──
  { id: "r-050", date: "2026-03-29", covers: 6, menuItemIds: ["menu-006","menu-005","menu-010","menu-015","menu-016","menu-013"] },
  { id: "r-051", date: "2026-03-29", covers: 4, menuItemIds: ["menu-008","menu-011","menu-003","menu-015"] },
  { id: "r-052", date: "2026-03-29", covers: 3, menuItemIds: ["menu-009","menu-014","menu-016"] },

  // ── 2026-03-30 (Mon) ──
  { id: "r-053", date: "2026-03-30", covers: 2, menuItemIds: ["menu-005","menu-015"] },
  { id: "r-054", date: "2026-03-30", covers: 3, menuItemIds: ["menu-011","menu-003","menu-016"] },

  // ── 2026-03-31 (Tue) ──
  { id: "r-055", date: "2026-03-31", covers: 3, menuItemIds: ["menu-006","menu-009","menu-015"] },
  { id: "r-056", date: "2026-03-31", covers: 2, menuItemIds: ["menu-010","menu-016"] },

  // ── 2026-04-01 (Wed) ──
  { id: "r-057", date: "2026-04-01", covers: 4, menuItemIds: ["menu-005","menu-007","menu-002","menu-015"] },
  { id: "r-058", date: "2026-04-01", covers: 3, menuItemIds: ["menu-009","menu-003","menu-016"] },

  // ── 2026-04-02 (Thu) ──
  { id: "r-059", date: "2026-04-02", covers: 5, menuItemIds: ["menu-007","menu-006","menu-005","menu-013","menu-015"] },
  { id: "r-060", date: "2026-04-02", covers: 4, menuItemIds: ["menu-010","menu-011","menu-002","menu-016"] },

  // ── 2026-04-03 (Fri) ──
  { id: "r-061", date: "2026-04-03", covers: 8, menuItemIds: ["menu-005","menu-007","menu-006","menu-008","menu-003","menu-015","menu-016","menu-014"] },
  { id: "r-062", date: "2026-04-03", covers: 5, menuItemIds: ["menu-009","menu-010","menu-002","menu-015","menu-012"] },
  { id: "r-063", date: "2026-04-03", covers: 4, menuItemIds: ["menu-007","menu-004","menu-013","menu-016"] },
  { id: "r-064", date: "2026-04-03", covers: 3, menuItemIds: ["menu-011","menu-014","menu-015"] },

  // ── 2026-04-04 (Sat) ──
  { id: "r-065", date: "2026-04-04", covers: 11, menuItemIds: ["menu-005","menu-007","menu-006","menu-008","menu-009","menu-003","menu-015","menu-016","menu-012","menu-013","menu-014"] },
  { id: "r-066", date: "2026-04-04", covers: 7,  menuItemIds: ["menu-010","menu-005","menu-006","menu-002","menu-015","menu-016","menu-011"] },
  { id: "r-067", date: "2026-04-04", covers: 5,  menuItemIds: ["menu-007","menu-004","menu-009","menu-016","menu-015"] },
  { id: "r-068", date: "2026-04-04", covers: 4,  menuItemIds: ["menu-009","menu-013","menu-016","menu-002"] },

  // ── 2026-04-05 (Sun) ──
  { id: "r-069", date: "2026-04-05", covers: 6, menuItemIds: ["menu-006","menu-005","menu-010","menu-015","menu-016","menu-012"] },
  { id: "r-070", date: "2026-04-05", covers: 5, menuItemIds: ["menu-008","menu-011","menu-003","menu-015","menu-013"] },
  { id: "r-071", date: "2026-04-05", covers: 3, menuItemIds: ["menu-009","menu-014","menu-016"] },

  // ── 2026-04-06 (Mon) ──
  { id: "r-072", date: "2026-04-06", covers: 2, menuItemIds: ["menu-005","menu-015"] },
  { id: "r-073", date: "2026-04-06", covers: 2, menuItemIds: ["menu-009","menu-016"] },

  // ── 2026-04-07 (Tue) ──
  { id: "r-074", date: "2026-04-07", covers: 3, menuItemIds: ["menu-006","menu-003","menu-015"] },
  { id: "r-075", date: "2026-04-07", covers: 2, menuItemIds: ["menu-010","menu-016"] },

  // ── 2026-04-08 (Wed) ──
  { id: "r-076", date: "2026-04-08", covers: 4, menuItemIds: ["menu-005","menu-007","menu-013","menu-015"] },
  { id: "r-077", date: "2026-04-08", covers: 3, menuItemIds: ["menu-009","menu-011","menu-016"] },

  // ── 2026-04-09 (Thu) ──
  { id: "r-078", date: "2026-04-09", covers: 5, menuItemIds: ["menu-007","menu-005","menu-006","menu-003","menu-015"] },
  { id: "r-079", date: "2026-04-09", covers: 4, menuItemIds: ["menu-010","menu-002","menu-013","menu-016"] },

  // ── 2026-04-10 (Fri) ──
  { id: "r-080", date: "2026-04-10", covers: 9, menuItemIds: ["menu-005","menu-007","menu-006","menu-008","menu-003","menu-015","menu-016","menu-012","menu-014"] },
  { id: "r-081", date: "2026-04-10", covers: 6, menuItemIds: ["menu-009","menu-010","menu-002","menu-015","menu-013","menu-016"] },
  { id: "r-082", date: "2026-04-10", covers: 4, menuItemIds: ["menu-007","menu-004","menu-011","menu-015"] },
  { id: "r-083", date: "2026-04-10", covers: 3, menuItemIds: ["menu-011","menu-014","menu-016"] },

  // ── 2026-04-11 (Sat — TODAY, busy weekend) ──
  { id: "r-084", date: "2026-04-11", covers: 12, menuItemIds: ["menu-005","menu-007","menu-006","menu-008","menu-009","menu-003","menu-015","menu-016","menu-012","menu-013","menu-014","menu-004"] },
  { id: "r-085", date: "2026-04-11", covers: 8,  menuItemIds: ["menu-010","menu-005","menu-006","menu-002","menu-015","menu-016","menu-011","menu-013"] },
  { id: "r-086", date: "2026-04-11", covers: 5,  menuItemIds: ["menu-007","menu-004","menu-009","menu-016","menu-015"] },
  { id: "r-087", date: "2026-04-11", covers: 4,  menuItemIds: ["menu-009","menu-013","menu-016","menu-002"] },

  // ── 2026-04-12 (Sun) ──
  { id: "r-088", date: "2026-04-12", covers: 7, menuItemIds: ["menu-006","menu-005","menu-010","menu-015","menu-016","menu-012","menu-013"] },
  { id: "r-089", date: "2026-04-12", covers: 5, menuItemIds: ["menu-008","menu-011","menu-003","menu-015","menu-013"] },
  { id: "r-090", date: "2026-04-12", covers: 3, menuItemIds: ["menu-009","menu-014","menu-016"] },

  // ── 2026-04-13 (Mon) ──
  { id: "r-091", date: "2026-04-13", covers: 2, menuItemIds: ["menu-005","menu-015"] },
  { id: "r-092", date: "2026-04-13", covers: 2, menuItemIds: ["menu-011","menu-016"] },

  // ── 2026-04-14 (Tue) ──
  { id: "r-093", date: "2026-04-14", covers: 3, menuItemIds: ["menu-006","menu-003","menu-015"] },
  { id: "r-094", date: "2026-04-14", covers: 2, menuItemIds: ["menu-010","menu-016"] },

  // ── 2026-04-15 (Wed) ──
  { id: "r-095", date: "2026-04-15", covers: 4, menuItemIds: ["menu-005","menu-007","menu-013","menu-015"] },
  { id: "r-096", date: "2026-04-15", covers: 3, menuItemIds: ["menu-009","menu-011","menu-016"] },

  // ── 2026-04-16 (Thu) ──
  { id: "r-097", date: "2026-04-16", covers: 5, menuItemIds: ["menu-007","menu-005","menu-006","menu-003","menu-015"] },
  { id: "r-098", date: "2026-04-16", covers: 4, menuItemIds: ["menu-010","menu-008","menu-013","menu-016"] },

  // ── 2026-04-17 (Fri) — busy ──
  { id: "r-099", date: "2026-04-17", covers: 10, menuItemIds: ["menu-005","menu-007","menu-006","menu-008","menu-003","menu-015","menu-016","menu-012","menu-014","menu-004"] },
  { id: "r-100", date: "2026-04-17", covers: 6,  menuItemIds: ["menu-009","menu-010","menu-002","menu-015","menu-013","menu-016"] },
  { id: "r-101", date: "2026-04-17", covers: 5,  menuItemIds: ["menu-007","menu-005","menu-011","menu-015","menu-016"] },
  { id: "r-102", date: "2026-04-17", covers: 3,  menuItemIds: ["menu-009","menu-014","menu-016"] },

  // ── 2026-04-18 (Sat) — peak weekend ──
  { id: "r-103", date: "2026-04-18", covers: 14, menuItemIds: ["menu-005","menu-007","menu-006","menu-008","menu-009","menu-003","menu-001","menu-015","menu-016","menu-012","menu-013","menu-014","menu-004","menu-011"] },
  { id: "r-104", date: "2026-04-18", covers: 9,  menuItemIds: ["menu-010","menu-005","menu-006","menu-002","menu-015","menu-016","menu-011","menu-013","menu-012"] },
  { id: "r-105", date: "2026-04-18", covers: 6,  menuItemIds: ["menu-007","menu-004","menu-009","menu-016","menu-015","menu-014"] },
  { id: "r-106", date: "2026-04-18", covers: 4,  menuItemIds: ["menu-009","menu-013","menu-016","menu-002"] },

  // ── 2026-04-19 (Sun) ──
  { id: "r-107", date: "2026-04-19", covers: 7, menuItemIds: ["menu-006","menu-005","menu-010","menu-015","menu-016","menu-012","menu-013"] },
  { id: "r-108", date: "2026-04-19", covers: 5, menuItemIds: ["menu-008","menu-007","menu-003","menu-015","menu-013"] },
  { id: "r-109", date: "2026-04-19", covers: 4, menuItemIds: ["menu-009","menu-011","menu-014","menu-016"] },

  // ── 2026-04-20 (Mon) ──
  { id: "r-110", date: "2026-04-20", covers: 2, menuItemIds: ["menu-005","menu-015"] },
  { id: "r-111", date: "2026-04-20", covers: 2, menuItemIds: ["menu-009","menu-016"] },

  // ── 2026-04-21 (Tue) ──
  { id: "r-112", date: "2026-04-21", covers: 3, menuItemIds: ["menu-006","menu-003","menu-015"] },
  { id: "r-113", date: "2026-04-21", covers: 2, menuItemIds: ["menu-010","menu-016"] },

  // ── 2026-04-22 (Wed) ──
  { id: "r-114", date: "2026-04-22", covers: 4, menuItemIds: ["menu-005","menu-007","menu-002","menu-015"] },
  { id: "r-115", date: "2026-04-22", covers: 3, menuItemIds: ["menu-009","menu-011","menu-016"] },

  // ── 2026-04-23 (Thu) ──
  { id: "r-116", date: "2026-04-23", covers: 5, menuItemIds: ["menu-007","menu-006","menu-005","menu-013","menu-015"] },
  { id: "r-117", date: "2026-04-23", covers: 3, menuItemIds: ["menu-010","menu-003","menu-016"] },

  // ── 2026-04-24 (Fri) — busy ──
  { id: "r-118", date: "2026-04-24", covers: 10, menuItemIds: ["menu-005","menu-007","menu-006","menu-008","menu-003","menu-015","menu-016","menu-012","menu-014","menu-013"] },
  { id: "r-119", date: "2026-04-24", covers: 6,  menuItemIds: ["menu-009","menu-010","menu-002","menu-015","menu-016","menu-011"] },
  { id: "r-120", date: "2026-04-24", covers: 4,  menuItemIds: ["menu-007","menu-004","menu-013","menu-015"] },
  { id: "r-121", date: "2026-04-24", covers: 3,  menuItemIds: ["menu-011","menu-014","menu-016"] },

  // ── 2026-04-25 (Sat) ──
  { id: "r-122", date: "2026-04-25", covers: 12, menuItemIds: ["menu-005","menu-007","menu-006","menu-008","menu-009","menu-003","menu-015","menu-016","menu-012","menu-013","menu-011","menu-004"] },
  { id: "r-123", date: "2026-04-25", covers: 8,  menuItemIds: ["menu-010","menu-005","menu-006","menu-002","menu-015","menu-016","menu-013","menu-014"] },
  { id: "r-124", date: "2026-04-25", covers: 5,  menuItemIds: ["menu-007","menu-004","menu-009","menu-016","menu-015"] },
  { id: "r-125", date: "2026-04-25", covers: 4,  menuItemIds: ["menu-009","menu-013","menu-016","menu-002"] },
]
