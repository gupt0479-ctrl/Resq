import type { Shipment } from "@/lib/types"

/**
 * Bistro Nova — shipment records.
 *
 * TODAY = 2026-04-11.
 *
 * Sections:
 *  A. Current week (Apr 11–17) — the shipments page shows these.
 *  B. Historical (Mar 12–Apr 10) — used only for vendor performance analysis.
 *
 * Delivery performance patterns (intentional, for AI negotiation analysis):
 *  Ocean Fresh Co.  — frequent late deliveries (perishable risk)
 *  Farm Gate Meats  — mostly on time, occasional 1-day delay
 *  Green Valley Farms — reliable and often early
 *  Meadow Dairy     — very reliable, always on time
 *  Pantry Plus      — occasional 2-day delays, plus price spikes
 *  Vine & Cellar    — small sample, on time
 *  Kitchen Direct   — only cancelled order, no history
 */
export const shipments: Shipment[] = [

  // ══════════════════════════════════════════════════════════════════
  // A. CURRENT WEEK — shown on shipments page
  // ══════════════════════════════════════════════════════════════════

  {
    id: "shp-001",
    vendorName: "Ocean Fresh Co.",
    status: "in_transit",
    expectedDeliveryDate: "2026-04-11",
    actualDeliveryDate: null,
    orderedAt: "2026-04-09T08:30:00Z",
    trackingNumber: "OFC-7812-AU",
    trackingUrl: "https://track.oceanfreshco.com.au/OFC-7812-AU",
    notes: "Morning delivery, leave at cool-room entrance if no answer.",
    totalCost: 304.00,
    lineItems: [
      { id: "li-001-1", itemId: "inv-001", itemName: "Salmon Fillet (kg)",  quantityOrdered: 6, unitCost: 28.00, totalCost: 168.00 },
      { id: "li-001-2", itemId: "inv-004", itemName: "Tiger Prawns (kg)",   quantityOrdered: 4, unitCost: 34.00, totalCost: 136.00 },
    ],
  },
  {
    id: "shp-002",
    vendorName: "Green Valley Farms",
    status: "delivered",
    expectedDeliveryDate: "2026-04-11",
    actualDeliveryDate: "2026-04-11",
    orderedAt: "2026-04-10T07:00:00Z",
    trackingNumber: null,
    trackingUrl: null,
    notes: null,
    totalCost: 96.50,
    lineItems: [
      { id: "li-002-1", itemId: "inv-006", itemName: "Roma Tomatoes (kg)",        quantityOrdered: 8, unitCost: 3.50,  totalCost: 28.00 },
      { id: "li-002-2", itemId: "inv-007", itemName: "Baby Spinach (kg)",         quantityOrdered: 3, unitCost: 8.00,  totalCost: 24.00 },
      { id: "li-002-3", itemId: "inv-010", itemName: "Mixed Lettuce (kg)",        quantityOrdered: 3, unitCost: 7.50,  totalCost: 22.50 },
      { id: "li-002-4", itemId: "inv-008", itemName: "Portobello Mushrooms (kg)", quantityOrdered: 2, unitCost: 11.00, totalCost: 22.00 },
    ],
  },
  {
    id: "shp-003",
    vendorName: "Farm Gate Meats",
    status: "confirmed",
    expectedDeliveryDate: "2026-04-12",
    actualDeliveryDate: null,
    orderedAt: "2026-04-10T09:15:00Z",
    trackingNumber: "FGM-20260412-003",
    trackingUrl: "https://track.farmgatedispatch.com.au/FGM-20260412-003",
    notes: "Request early morning slot — chef needs protein before 7 AM prep.",
    totalCost: 582.00,
    lineItems: [
      { id: "li-003-1", itemId: "inv-002", itemName: "Chicken Breast (kg)",   quantityOrdered: 12, unitCost: 12.00, totalCost: 144.00 },
      { id: "li-003-2", itemId: "inv-003", itemName: "Beef Tenderloin (kg)",  quantityOrdered: 5,  unitCost: 62.00, totalCost: 310.00 },
      { id: "li-003-3", itemId: "inv-005", itemName: "Duck Breast (kg)",      quantityOrdered: 5,  unitCost: 24.00, totalCost: 120.00 },
      { id: "li-003-4", itemId: "inv-004", itemName: "Tiger Prawns (kg)",     quantityOrdered: 1,  unitCost: 8.00,  totalCost: 8.00   },
    ],
  },
  {
    id: "shp-004",
    vendorName: "Meadow Dairy",
    status: "confirmed",
    expectedDeliveryDate: "2026-04-12",
    actualDeliveryDate: null,
    orderedAt: "2026-04-10T10:00:00Z",
    trackingNumber: "MDR-APR12-2026",
    trackingUrl: "https://deliveries.meadowdairy.com.au/MDR-APR12-2026",
    notes: null,
    totalCost: 196.50,
    lineItems: [
      { id: "li-004-1", itemId: "inv-011", itemName: "Heavy Cream (L)",      quantityOrdered: 8,  unitCost: 4.20,  totalCost: 33.60 },
      { id: "li-004-2", itemId: "inv-012", itemName: "Parmesan Cheese (kg)", quantityOrdered: 3,  unitCost: 22.00, totalCost: 66.00 },
      { id: "li-004-3", itemId: "inv-013", itemName: "Eggs (dozen)",         quantityOrdered: 10, unitCost: 5.50,  totalCost: 55.00 },
      { id: "li-004-4", itemId: "inv-014", itemName: "Unsalted Butter (kg)", quantityOrdered: 4,  unitCost: 11.00, totalCost: 44.00 },
    ],
  },
  {
    id: "shp-005",
    vendorName: "Pantry Plus",
    status: "confirmed",
    expectedDeliveryDate: "2026-04-13",
    actualDeliveryDate: null,
    orderedAt: "2026-04-09T14:00:00Z",
    trackingNumber: "PPL-13042026-5",
    trackingUrl: "https://pantryplus.com.au/track/PPL-13042026-5",
    notes: "Check olive oil lot number — previous batch had quality issue.",
    totalCost: 327.60,
    lineItems: [
      { id: "li-005-1", itemId: "inv-019", itemName: "Extra Virgin Olive Oil (L)",      quantityOrdered: 6,  unitCost: 16.00, totalCost: 96.00  },
      { id: "li-005-2", itemId: "inv-015", itemName: "Pasta — Tagliatelle (kg)",        quantityOrdered: 8,  unitCost: 4.80,  totalCost: 38.40  },
      { id: "li-005-3", itemId: "inv-016", itemName: "Arborio Rice (kg)",               quantityOrdered: 6,  unitCost: 5.50,  totalCost: 33.00  },
      { id: "li-005-4", itemId: "inv-017", itemName: "All-Purpose Flour (kg)",          quantityOrdered: 10, unitCost: 1.80,  totalCost: 18.00  },
      { id: "li-005-5", itemId: "inv-020", itemName: "San Marzano Tomatoes (400g tin)", quantityOrdered: 24, unitCost: 3.20,  totalCost: 76.80  },
      { id: "li-005-6", itemId: "inv-023", itemName: "Chicken Stock (L)",               quantityOrdered: 10, unitCost: 3.50,  totalCost: 35.00  },
      { id: "li-005-7", itemId: "inv-018", itemName: "Panko Breadcrumbs (kg)",          quantityOrdered: 3,  unitCost: 4.00,  totalCost: 12.00  },
      { id: "li-005-8", itemId: "inv-021", itemName: "Dijon Mustard (kg)",              quantityOrdered: 2,  unitCost: 9.00,  totalCost: 18.00  },
      { id: "li-005-9", itemId: "inv-025", itemName: "Parchment Paper Roll (50m)",      quantityOrdered: 3,  unitCost: 7.50,  totalCost: 22.50  },
    ],
  },
  {
    id: "shp-006",
    vendorName: "Ocean Fresh Co.",
    status: "pending",
    expectedDeliveryDate: "2026-04-14",
    actualDeliveryDate: null,
    orderedAt: "2026-04-11T09:00:00Z",
    trackingNumber: null,
    trackingUrl: null,
    notes: "Mid-week top-up — confirm quantities after Saturday service.",
    totalCost: 228.00,
    lineItems: [
      { id: "li-006-1", itemId: "inv-001", itemName: "Salmon Fillet (kg)", quantityOrdered: 5, unitCost: 28.00, totalCost: 140.00 },
      { id: "li-006-2", itemId: "inv-004", itemName: "Tiger Prawns (kg)",  quantityOrdered: 3, unitCost: 34.00, totalCost: 102.00 },
    ],
  },
  {
    id: "shp-007",
    vendorName: "Green Valley Farms",
    status: "pending",
    expectedDeliveryDate: "2026-04-14",
    actualDeliveryDate: null,
    orderedAt: "2026-04-11T09:30:00Z",
    trackingNumber: null,
    trackingUrl: null,
    notes: null,
    totalCost: 112.50,
    lineItems: [
      { id: "li-007-1", itemId: "inv-006", itemName: "Roma Tomatoes (kg)",        quantityOrdered: 6, unitCost: 3.50,  totalCost: 21.00 },
      { id: "li-007-2", itemId: "inv-007", itemName: "Baby Spinach (kg)",         quantityOrdered: 4, unitCost: 8.00,  totalCost: 32.00 },
      { id: "li-007-3", itemId: "inv-008", itemName: "Portobello Mushrooms (kg)", quantityOrdered: 3, unitCost: 14.00, totalCost: 42.00 },
      { id: "li-007-4", itemId: "inv-009", itemName: "Garlic (kg)",               quantityOrdered: 2, unitCost: 6.00,  totalCost: 12.00 },
      { id: "li-007-5", itemId: "inv-010", itemName: "Mixed Lettuce (kg)",        quantityOrdered: 1, unitCost: 7.50,  totalCost: 7.50  },
    ],
  },
  {
    id: "shp-008",
    vendorName: "Vine & Cellar",
    status: "confirmed",
    expectedDeliveryDate: "2026-04-15",
    actualDeliveryDate: null,
    orderedAt: "2026-04-08T11:00:00Z",
    trackingNumber: "VNC-0415-BN",
    trackingUrl: "https://vine-cellar.com.au/deliveries/VNC-0415-BN",
    notes: "Weekend stock-up. Cellar temp must be below 16°C on arrival.",
    totalCost: 224.00,
    lineItems: [
      { id: "li-008-1", itemId: "inv-022", itemName: "Dry White Wine (750ml)", quantityOrdered: 16, unitCost: 14.00, totalCost: 224.00 },
    ],
  },
  {
    id: "shp-009",
    vendorName: "Farm Gate Meats",
    status: "pending",
    expectedDeliveryDate: "2026-04-16",
    actualDeliveryDate: null,
    orderedAt: "2026-04-11T10:00:00Z",
    trackingNumber: null,
    trackingUrl: null,
    notes: "Pre-weekend protein top-up. Confirm by Monday.",
    totalCost: 496.00,
    lineItems: [
      { id: "li-009-1", itemId: "inv-002", itemName: "Chicken Breast (kg)",  quantityOrdered: 10, unitCost: 12.00, totalCost: 120.00 },
      { id: "li-009-2", itemId: "inv-003", itemName: "Beef Tenderloin (kg)", quantityOrdered: 4,  unitCost: 62.00, totalCost: 248.00 },
      { id: "li-009-3", itemId: "inv-005", itemName: "Duck Breast (kg)",     quantityOrdered: 4,  unitCost: 24.00, totalCost: 96.00  },
      { id: "li-009-4", itemId: "inv-004", itemName: "Tiger Prawns (kg)",    quantityOrdered: 2,  unitCost: 34.00, totalCost: 68.00  },
    ],
  },
  {
    id: "shp-010",
    vendorName: "Kitchen Direct",
    status: "cancelled",
    expectedDeliveryDate: "2026-04-13",
    actualDeliveryDate: null,
    orderedAt: "2026-04-08T15:00:00Z",
    trackingNumber: null,
    trackingUrl: null,
    notes: "Cancelled — switched to Salon Supplies Direct for better pricing.",
    totalCost: 63.50,
    lineItems: [
      { id: "li-010-1", itemId: "inv-024", itemName: "Disposable Gloves (100pk)",  quantityOrdered: 4, unitCost: 9.00, totalCost: 36.00 },
      { id: "li-010-2", itemId: "inv-025", itemName: "Parchment Paper Roll (50m)", quantityOrdered: 3, unitCost: 7.50, totalCost: 22.50 },
      { id: "li-010-3", itemId: "inv-014", itemName: "Unsalted Butter (kg)",       quantityOrdered: 1, unitCost: 5.00, totalCost: 5.00  },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // B. HISTORICAL — past 30 days (Mar 12 – Apr 10)
  //    Used only for vendor performance analysis.
  //
  //    Performance patterns:
  //    Ocean Fresh Co.  → 5 late out of 9 (perishables at risk)
  //    Farm Gate Meats  → 2 late out of 8 (minor delays)
  //    Green Valley Farms → 1 late out of 8, 2 early (very reliable)
  //    Meadow Dairy     → 0 late out of 6 (perfect record)
  //    Pantry Plus      → 3 late out of 6 (slow dry-goods logistics)
  //    Vine & Cellar    → 0 late out of 3 (small sample, reliable)
  // ══════════════════════════════════════════════════════════════════

  // ── Ocean Fresh Co. (9 historical) ───────────────────────────────
  // late +2d
  { id: "h-ofc-01", vendorName: "Ocean Fresh Co.", status: "delivered",
    expectedDeliveryDate: "2026-03-13", actualDeliveryDate: "2026-03-15",
    orderedAt: "2026-03-11T08:00:00Z", trackingNumber: "OFC-6901-AU", trackingUrl: null, notes: null, totalCost: 196.00,
    lineItems: [{ id: "h-ofc-01-1", itemId: "inv-001", itemName: "Salmon Fillet (kg)", quantityOrdered: 7, unitCost: 26.00, totalCost: 182.00 }, { id: "h-ofc-01-2", itemId: "inv-004", itemName: "Tiger Prawns (kg)", quantityOrdered: 2, unitCost: 34.00, totalCost: 68.00 }] },
  // on time
  { id: "h-ofc-02", vendorName: "Ocean Fresh Co.", status: "delivered",
    expectedDeliveryDate: "2026-03-17", actualDeliveryDate: "2026-03-17",
    orderedAt: "2026-03-15T08:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 168.00,
    lineItems: [{ id: "h-ofc-02-1", itemId: "inv-001", itemName: "Salmon Fillet (kg)", quantityOrdered: 6, unitCost: 26.00, totalCost: 156.00 }, { id: "h-ofc-02-2", itemId: "inv-004", itemName: "Tiger Prawns (kg)", quantityOrdered: 1, unitCost: 34.00, totalCost: 34.00 }] },
  // late +1d
  { id: "h-ofc-03", vendorName: "Ocean Fresh Co.", status: "delivered",
    expectedDeliveryDate: "2026-03-20", actualDeliveryDate: "2026-03-21",
    orderedAt: "2026-03-18T08:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 182.00,
    lineItems: [{ id: "h-ofc-03-1", itemId: "inv-001", itemName: "Salmon Fillet (kg)", quantityOrdered: 5, unitCost: 26.00, totalCost: 130.00 }, { id: "h-ofc-03-2", itemId: "inv-004", itemName: "Tiger Prawns (kg)", quantityOrdered: 2, unitCost: 26.00, totalCost: 52.00 }] },
  // on time
  { id: "h-ofc-04", vendorName: "Ocean Fresh Co.", status: "delivered",
    expectedDeliveryDate: "2026-03-24", actualDeliveryDate: "2026-03-24",
    orderedAt: "2026-03-22T08:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 162.00,
    lineItems: [{ id: "h-ofc-04-1", itemId: "inv-001", itemName: "Salmon Fillet (kg)", quantityOrdered: 6, unitCost: 27.00, totalCost: 162.00 }] },
  // late +3d
  { id: "h-ofc-05", vendorName: "Ocean Fresh Co.", status: "delivered",
    expectedDeliveryDate: "2026-03-27", actualDeliveryDate: "2026-03-30",
    orderedAt: "2026-03-25T08:00:00Z", trackingNumber: null, trackingUrl: null, notes: "Late — driver called in sick, no substitute arranged.", totalCost: 244.00,
    lineItems: [{ id: "h-ofc-05-1", itemId: "inv-001", itemName: "Salmon Fillet (kg)", quantityOrdered: 5, unitCost: 28.00, totalCost: 140.00 }, { id: "h-ofc-05-2", itemId: "inv-004", itemName: "Tiger Prawns (kg)", quantityOrdered: 3, unitCost: 34.00, totalCost: 102.00 }] },
  // on time
  { id: "h-ofc-06", vendorName: "Ocean Fresh Co.", status: "delivered",
    expectedDeliveryDate: "2026-03-31", actualDeliveryDate: "2026-03-31",
    orderedAt: "2026-03-29T08:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 168.00,
    lineItems: [{ id: "h-ofc-06-1", itemId: "inv-001", itemName: "Salmon Fillet (kg)", quantityOrdered: 6, unitCost: 28.00, totalCost: 168.00 }] },
  // late +2d
  { id: "h-ofc-07", vendorName: "Ocean Fresh Co.", status: "delivered",
    expectedDeliveryDate: "2026-04-03", actualDeliveryDate: "2026-04-05",
    orderedAt: "2026-04-01T08:00:00Z", trackingNumber: null, trackingUrl: null, notes: "Late again — weekend dispatch issues.", totalCost: 236.00,
    lineItems: [{ id: "h-ofc-07-1", itemId: "inv-001", itemName: "Salmon Fillet (kg)", quantityOrdered: 5, unitCost: 28.00, totalCost: 140.00 }, { id: "h-ofc-07-2", itemId: "inv-004", itemName: "Tiger Prawns (kg)", quantityOrdered: 2, unitCost: 34.00, totalCost: 68.00 }] },
  // on time
  { id: "h-ofc-08", vendorName: "Ocean Fresh Co.", status: "delivered",
    expectedDeliveryDate: "2026-04-07", actualDeliveryDate: "2026-04-07",
    orderedAt: "2026-04-05T08:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 196.00,
    lineItems: [{ id: "h-ofc-08-1", itemId: "inv-001", itemName: "Salmon Fillet (kg)", quantityOrdered: 7, unitCost: 28.00, totalCost: 196.00 }] },
  // late +1d
  { id: "h-ofc-09", vendorName: "Ocean Fresh Co.", status: "delivered",
    expectedDeliveryDate: "2026-04-09", actualDeliveryDate: "2026-04-10",
    orderedAt: "2026-04-07T08:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 170.00,
    lineItems: [{ id: "h-ofc-09-1", itemId: "inv-001", itemName: "Salmon Fillet (kg)", quantityOrdered: 5, unitCost: 28.00, totalCost: 140.00 }, { id: "h-ofc-09-2", itemId: "inv-004", itemName: "Tiger Prawns (kg)", quantityOrdered: 1, unitCost: 34.00, totalCost: 34.00 }] },

  // ── Farm Gate Meats (8 historical) ───────────────────────────────
  // on time
  { id: "h-fgm-01", vendorName: "Farm Gate Meats", status: "delivered",
    expectedDeliveryDate: "2026-03-14", actualDeliveryDate: "2026-03-14",
    orderedAt: "2026-03-12T09:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 468.00,
    lineItems: [{ id: "h-fgm-01-1", itemId: "inv-002", itemName: "Chicken Breast (kg)", quantityOrdered: 10, unitCost: 12.00, totalCost: 120.00 }, { id: "h-fgm-01-2", itemId: "inv-003", itemName: "Beef Tenderloin (kg)", quantityOrdered: 4, unitCost: 57.00, totalCost: 228.00 }, { id: "h-fgm-01-3", itemId: "inv-005", itemName: "Duck Breast (kg)", quantityOrdered: 5, unitCost: 24.00, totalCost: 120.00 }] },
  // on time
  { id: "h-fgm-02", vendorName: "Farm Gate Meats", status: "delivered",
    expectedDeliveryDate: "2026-03-19", actualDeliveryDate: "2026-03-19",
    orderedAt: "2026-03-17T09:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 390.00,
    lineItems: [{ id: "h-fgm-02-1", itemId: "inv-002", itemName: "Chicken Breast (kg)", quantityOrdered: 12, unitCost: 12.00, totalCost: 144.00 }, { id: "h-fgm-02-2", itemId: "inv-003", itemName: "Beef Tenderloin (kg)", quantityOrdered: 4, unitCost: 59.00, totalCost: 236.00 }] },
  // late +1d
  { id: "h-fgm-03", vendorName: "Farm Gate Meats", status: "delivered",
    expectedDeliveryDate: "2026-03-24", actualDeliveryDate: "2026-03-25",
    orderedAt: "2026-03-22T09:00:00Z", trackingNumber: null, trackingUrl: null, notes: "1-day delay, cold chain maintained.", totalCost: 432.00,
    lineItems: [{ id: "h-fgm-03-1", itemId: "inv-002", itemName: "Chicken Breast (kg)", quantityOrdered: 10, unitCost: 12.00, totalCost: 120.00 }, { id: "h-fgm-03-2", itemId: "inv-003", itemName: "Beef Tenderloin (kg)", quantityOrdered: 5, unitCost: 62.00, totalCost: 310.00 }] },
  // on time
  { id: "h-fgm-04", vendorName: "Farm Gate Meats", status: "delivered",
    expectedDeliveryDate: "2026-03-28", actualDeliveryDate: "2026-03-28",
    orderedAt: "2026-03-26T09:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 408.00,
    lineItems: [{ id: "h-fgm-04-1", itemId: "inv-002", itemName: "Chicken Breast (kg)", quantityOrdered: 12, unitCost: 12.00, totalCost: 144.00 }, { id: "h-fgm-04-2", itemId: "inv-003", itemName: "Beef Tenderloin (kg)", quantityOrdered: 4, unitCost: 62.00, totalCost: 248.00 }] },
  // on time
  { id: "h-fgm-05", vendorName: "Farm Gate Meats", status: "delivered",
    expectedDeliveryDate: "2026-04-01", actualDeliveryDate: "2026-04-01",
    orderedAt: "2026-03-30T09:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 358.00,
    lineItems: [{ id: "h-fgm-05-1", itemId: "inv-002", itemName: "Chicken Breast (kg)", quantityOrdered: 10, unitCost: 12.00, totalCost: 120.00 }, { id: "h-fgm-05-2", itemId: "inv-003", itemName: "Beef Tenderloin (kg)", quantityOrdered: 4, unitCost: 62.00, totalCost: 248.00 }] },
  // late +1d
  { id: "h-fgm-06", vendorName: "Farm Gate Meats", status: "delivered",
    expectedDeliveryDate: "2026-04-04", actualDeliveryDate: "2026-04-05",
    orderedAt: "2026-04-02T09:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 382.00,
    lineItems: [{ id: "h-fgm-06-1", itemId: "inv-002", itemName: "Chicken Breast (kg)", quantityOrdered: 10, unitCost: 12.00, totalCost: 120.00 }, { id: "h-fgm-06-2", itemId: "inv-003", itemName: "Beef Tenderloin (kg)", quantityOrdered: 4, unitCost: 62.00, totalCost: 248.00 }] },
  // on time
  { id: "h-fgm-07", vendorName: "Farm Gate Meats", status: "delivered",
    expectedDeliveryDate: "2026-04-07", actualDeliveryDate: "2026-04-07",
    orderedAt: "2026-04-05T09:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 406.00,
    lineItems: [{ id: "h-fgm-07-1", itemId: "inv-002", itemName: "Chicken Breast (kg)", quantityOrdered: 12, unitCost: 12.00, totalCost: 144.00 }, { id: "h-fgm-07-2", itemId: "inv-003", itemName: "Beef Tenderloin (kg)", quantityOrdered: 4, unitCost: 62.00, totalCost: 248.00 }] },
  // on time
  { id: "h-fgm-08", vendorName: "Farm Gate Meats", status: "delivered",
    expectedDeliveryDate: "2026-04-10", actualDeliveryDate: "2026-04-10",
    orderedAt: "2026-04-08T09:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 452.00,
    lineItems: [{ id: "h-fgm-08-1", itemId: "inv-002", itemName: "Chicken Breast (kg)", quantityOrdered: 12, unitCost: 12.00, totalCost: 144.00 }, { id: "h-fgm-08-2", itemId: "inv-003", itemName: "Beef Tenderloin (kg)", quantityOrdered: 5, unitCost: 62.00, totalCost: 310.00 }] },

  // ── Green Valley Farms (8 historical) ────────────────────────────
  // early -1d
  { id: "h-gvf-01", vendorName: "Green Valley Farms", status: "delivered",
    expectedDeliveryDate: "2026-03-13", actualDeliveryDate: "2026-03-12",
    orderedAt: "2026-03-11T07:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 86.00,
    lineItems: [{ id: "h-gvf-01-1", itemId: "inv-006", itemName: "Roma Tomatoes (kg)", quantityOrdered: 8, unitCost: 3.50, totalCost: 28.00 }, { id: "h-gvf-01-2", itemId: "inv-007", itemName: "Baby Spinach (kg)", quantityOrdered: 3, unitCost: 8.00, totalCost: 24.00 }, { id: "h-gvf-01-3", itemId: "inv-010", itemName: "Mixed Lettuce (kg)", quantityOrdered: 3, unitCost: 7.50, totalCost: 22.50 }] },
  // on time
  { id: "h-gvf-02", vendorName: "Green Valley Farms", status: "delivered",
    expectedDeliveryDate: "2026-03-17", actualDeliveryDate: "2026-03-17",
    orderedAt: "2026-03-15T07:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 92.00,
    lineItems: [{ id: "h-gvf-02-1", itemId: "inv-006", itemName: "Roma Tomatoes (kg)", quantityOrdered: 8, unitCost: 3.50, totalCost: 28.00 }, { id: "h-gvf-02-2", itemId: "inv-007", itemName: "Baby Spinach (kg)", quantityOrdered: 3, unitCost: 8.00, totalCost: 24.00 }, { id: "h-gvf-02-3", itemId: "inv-008", itemName: "Portobello Mushrooms (kg)", quantityOrdered: 2, unitCost: 11.50, totalCost: 23.00 }] },
  // on time
  { id: "h-gvf-03", vendorName: "Green Valley Farms", status: "delivered",
    expectedDeliveryDate: "2026-03-21", actualDeliveryDate: "2026-03-21",
    orderedAt: "2026-03-19T07:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 88.00,
    lineItems: [{ id: "h-gvf-03-1", itemId: "inv-006", itemName: "Roma Tomatoes (kg)", quantityOrdered: 6, unitCost: 3.50, totalCost: 21.00 }, { id: "h-gvf-03-2", itemId: "inv-007", itemName: "Baby Spinach (kg)", quantityOrdered: 4, unitCost: 8.00, totalCost: 32.00 }, { id: "h-gvf-03-3", itemId: "inv-010", itemName: "Mixed Lettuce (kg)", quantityOrdered: 3, unitCost: 7.50, totalCost: 22.50 }] },
  // late +2d
  { id: "h-gvf-04", vendorName: "Green Valley Farms", status: "delivered",
    expectedDeliveryDate: "2026-03-25", actualDeliveryDate: "2026-03-27",
    orderedAt: "2026-03-23T07:00:00Z", trackingNumber: null, trackingUrl: null, notes: "Delivery delayed due to supplier issue.", totalCost: 94.00,
    lineItems: [{ id: "h-gvf-04-1", itemId: "inv-006", itemName: "Roma Tomatoes (kg)", quantityOrdered: 8, unitCost: 3.50, totalCost: 28.00 }, { id: "h-gvf-04-2", itemId: "inv-007", itemName: "Baby Spinach (kg)", quantityOrdered: 3, unitCost: 8.00, totalCost: 24.00 }, { id: "h-gvf-04-3", itemId: "inv-008", itemName: "Portobello Mushrooms (kg)", quantityOrdered: 3, unitCost: 14.00, totalCost: 42.00 }] },
  // early -1d
  { id: "h-gvf-05", vendorName: "Green Valley Farms", status: "delivered",
    expectedDeliveryDate: "2026-03-29", actualDeliveryDate: "2026-03-28",
    orderedAt: "2026-03-27T07:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 81.00,
    lineItems: [{ id: "h-gvf-05-1", itemId: "inv-006", itemName: "Roma Tomatoes (kg)", quantityOrdered: 6, unitCost: 3.50, totalCost: 21.00 }, { id: "h-gvf-05-2", itemId: "inv-007", itemName: "Baby Spinach (kg)", quantityOrdered: 3, unitCost: 8.00, totalCost: 24.00 }, { id: "h-gvf-05-3", itemId: "inv-010", itemName: "Mixed Lettuce (kg)", quantityOrdered: 3, unitCost: 7.50, totalCost: 22.50 }] },
  // on time
  { id: "h-gvf-06", vendorName: "Green Valley Farms", status: "delivered",
    expectedDeliveryDate: "2026-04-02", actualDeliveryDate: "2026-04-02",
    orderedAt: "2026-03-31T07:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 96.50,
    lineItems: [{ id: "h-gvf-06-1", itemId: "inv-006", itemName: "Roma Tomatoes (kg)", quantityOrdered: 8, unitCost: 3.50, totalCost: 28.00 }, { id: "h-gvf-06-2", itemId: "inv-007", itemName: "Baby Spinach (kg)", quantityOrdered: 3, unitCost: 8.00, totalCost: 24.00 }, { id: "h-gvf-06-3", itemId: "inv-010", itemName: "Mixed Lettuce (kg)", quantityOrdered: 3, unitCost: 7.50, totalCost: 22.50 }] },
  // on time
  { id: "h-gvf-07", vendorName: "Green Valley Farms", status: "delivered",
    expectedDeliveryDate: "2026-04-06", actualDeliveryDate: "2026-04-06",
    orderedAt: "2026-04-04T07:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 94.50,
    lineItems: [{ id: "h-gvf-07-1", itemId: "inv-006", itemName: "Roma Tomatoes (kg)", quantityOrdered: 8, unitCost: 3.50, totalCost: 28.00 }, { id: "h-gvf-07-2", itemId: "inv-007", itemName: "Baby Spinach (kg)", quantityOrdered: 3, unitCost: 8.00, totalCost: 24.00 }, { id: "h-gvf-07-3", itemId: "inv-008", itemName: "Portobello Mushrooms (kg)", quantityOrdered: 3, unitCost: 14.00, totalCost: 42.00 }] },
  // on time
  { id: "h-gvf-08", vendorName: "Green Valley Farms", status: "delivered",
    expectedDeliveryDate: "2026-04-09", actualDeliveryDate: "2026-04-09",
    orderedAt: "2026-04-07T07:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 90.00,
    lineItems: [{ id: "h-gvf-08-1", itemId: "inv-006", itemName: "Roma Tomatoes (kg)", quantityOrdered: 8, unitCost: 3.50, totalCost: 28.00 }, { id: "h-gvf-08-2", itemId: "inv-007", itemName: "Baby Spinach (kg)", quantityOrdered: 4, unitCost: 8.00, totalCost: 32.00 }, { id: "h-gvf-08-3", itemId: "inv-010", itemName: "Mixed Lettuce (kg)", quantityOrdered: 3, unitCost: 7.50, totalCost: 22.50 }] },

  // ── Meadow Dairy (6 historical — perfect record) ──────────────────
  { id: "h-mdr-01", vendorName: "Meadow Dairy", status: "delivered", expectedDeliveryDate: "2026-03-14", actualDeliveryDate: "2026-03-14", orderedAt: "2026-03-12T10:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 178.00, lineItems: [{ id: "h-mdr-01-1", itemId: "inv-011", itemName: "Heavy Cream (L)", quantityOrdered: 8, unitCost: 4.20, totalCost: 33.60 }, { id: "h-mdr-01-2", itemId: "inv-012", itemName: "Parmesan Cheese (kg)", quantityOrdered: 3, unitCost: 19.00, totalCost: 57.00 }, { id: "h-mdr-01-3", itemId: "inv-013", itemName: "Eggs (dozen)", quantityOrdered: 10, unitCost: 5.50, totalCost: 55.00 }] },
  { id: "h-mdr-02", vendorName: "Meadow Dairy", status: "delivered", expectedDeliveryDate: "2026-03-21", actualDeliveryDate: "2026-03-21", orderedAt: "2026-03-19T10:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 196.50, lineItems: [{ id: "h-mdr-02-1", itemId: "inv-011", itemName: "Heavy Cream (L)", quantityOrdered: 8, unitCost: 4.20, totalCost: 33.60 }, { id: "h-mdr-02-2", itemId: "inv-012", itemName: "Parmesan Cheese (kg)", quantityOrdered: 3, unitCost: 20.00, totalCost: 60.00 }, { id: "h-mdr-02-3", itemId: "inv-013", itemName: "Eggs (dozen)", quantityOrdered: 10, unitCost: 5.50, totalCost: 55.00 }, { id: "h-mdr-02-4", itemId: "inv-014", itemName: "Unsalted Butter (kg)", quantityOrdered: 4, unitCost: 11.00, totalCost: 44.00 }] },
  { id: "h-mdr-03", vendorName: "Meadow Dairy", status: "delivered", expectedDeliveryDate: "2026-03-26", actualDeliveryDate: "2026-03-26", orderedAt: "2026-03-24T10:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 182.60, lineItems: [{ id: "h-mdr-03-1", itemId: "inv-011", itemName: "Heavy Cream (L)", quantityOrdered: 8, unitCost: 4.20, totalCost: 33.60 }, { id: "h-mdr-03-2", itemId: "inv-012", itemName: "Parmesan Cheese (kg)", quantityOrdered: 3, unitCost: 21.00, totalCost: 63.00 }, { id: "h-mdr-03-3", itemId: "inv-013", itemName: "Eggs (dozen)", quantityOrdered: 10, unitCost: 5.50, totalCost: 55.00 }] },
  { id: "h-mdr-04", vendorName: "Meadow Dairy", status: "delivered", expectedDeliveryDate: "2026-03-31", actualDeliveryDate: "2026-03-31", orderedAt: "2026-03-29T10:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 196.50, lineItems: [{ id: "h-mdr-04-1", itemId: "inv-011", itemName: "Heavy Cream (L)", quantityOrdered: 8, unitCost: 4.20, totalCost: 33.60 }, { id: "h-mdr-04-2", itemId: "inv-012", itemName: "Parmesan Cheese (kg)", quantityOrdered: 3, unitCost: 22.00, totalCost: 66.00 }, { id: "h-mdr-04-3", itemId: "inv-013", itemName: "Eggs (dozen)", quantityOrdered: 10, unitCost: 5.50, totalCost: 55.00 }, { id: "h-mdr-04-4", itemId: "inv-014", itemName: "Unsalted Butter (kg)", quantityOrdered: 4, unitCost: 11.00, totalCost: 44.00 }] },
  { id: "h-mdr-05", vendorName: "Meadow Dairy", status: "delivered", expectedDeliveryDate: "2026-04-04", actualDeliveryDate: "2026-04-04", orderedAt: "2026-04-02T10:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 178.60, lineItems: [{ id: "h-mdr-05-1", itemId: "inv-011", itemName: "Heavy Cream (L)", quantityOrdered: 8, unitCost: 4.20, totalCost: 33.60 }, { id: "h-mdr-05-2", itemId: "inv-012", itemName: "Parmesan Cheese (kg)", quantityOrdered: 3, unitCost: 22.00, totalCost: 66.00 }, { id: "h-mdr-05-3", itemId: "inv-013", itemName: "Eggs (dozen)", quantityOrdered: 10, unitCost: 5.50, totalCost: 55.00 }] },
  { id: "h-mdr-06", vendorName: "Meadow Dairy", status: "delivered", expectedDeliveryDate: "2026-04-08", actualDeliveryDate: "2026-04-08", orderedAt: "2026-04-06T10:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 196.50, lineItems: [{ id: "h-mdr-06-1", itemId: "inv-011", itemName: "Heavy Cream (L)", quantityOrdered: 8, unitCost: 4.20, totalCost: 33.60 }, { id: "h-mdr-06-2", itemId: "inv-012", itemName: "Parmesan Cheese (kg)", quantityOrdered: 3, unitCost: 22.00, totalCost: 66.00 }, { id: "h-mdr-06-3", itemId: "inv-013", itemName: "Eggs (dozen)", quantityOrdered: 10, unitCost: 5.50, totalCost: 55.00 }, { id: "h-mdr-06-4", itemId: "inv-014", itemName: "Unsalted Butter (kg)", quantityOrdered: 4, unitCost: 11.00, totalCost: 44.00 }] },

  // ── Pantry Plus (6 historical — often delayed, price spikes) ─────
  // on time
  { id: "h-ppl-01", vendorName: "Pantry Plus", status: "delivered", expectedDeliveryDate: "2026-03-15", actualDeliveryDate: "2026-03-15", orderedAt: "2026-03-12T14:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 312.00, lineItems: [{ id: "h-ppl-01-1", itemId: "inv-019", itemName: "Extra Virgin Olive Oil (L)", quantityOrdered: 6, unitCost: 11.00, totalCost: 66.00 }, { id: "h-ppl-01-2", itemId: "inv-015", itemName: "Pasta — Tagliatelle (kg)", quantityOrdered: 10, unitCost: 4.80, totalCost: 48.00 }, { id: "h-ppl-01-3", itemId: "inv-020", itemName: "San Marzano Tomatoes (400g tin)", quantityOrdered: 24, unitCost: 3.20, totalCost: 76.80 }, { id: "h-ppl-01-4", itemId: "inv-017", itemName: "All-Purpose Flour (kg)", quantityOrdered: 10, unitCost: 1.80, totalCost: 18.00 }, { id: "h-ppl-01-5", itemId: "inv-023", itemName: "Chicken Stock (L)", quantityOrdered: 10, unitCost: 3.50, totalCost: 35.00 }] },
  // late +2d
  { id: "h-ppl-02", vendorName: "Pantry Plus", status: "delivered", expectedDeliveryDate: "2026-03-22", actualDeliveryDate: "2026-03-24", orderedAt: "2026-03-19T14:00:00Z", trackingNumber: null, trackingUrl: null, notes: "2-day delay, no advance notice from vendor.", totalCost: 298.00, lineItems: [{ id: "h-ppl-02-1", itemId: "inv-019", itemName: "Extra Virgin Olive Oil (L)", quantityOrdered: 5, unitCost: 11.00, totalCost: 55.00 }, { id: "h-ppl-02-2", itemId: "inv-015", itemName: "Pasta — Tagliatelle (kg)", quantityOrdered: 8, unitCost: 4.80, totalCost: 38.40 }, { id: "h-ppl-02-3", itemId: "inv-020", itemName: "San Marzano Tomatoes (400g tin)", quantityOrdered: 24, unitCost: 3.20, totalCost: 76.80 }] },
  // on time
  { id: "h-ppl-03", vendorName: "Pantry Plus", status: "delivered", expectedDeliveryDate: "2026-03-28", actualDeliveryDate: "2026-03-28", orderedAt: "2026-03-25T14:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 324.00, lineItems: [{ id: "h-ppl-03-1", itemId: "inv-019", itemName: "Extra Virgin Olive Oil (L)", quantityOrdered: 6, unitCost: 14.00, totalCost: 84.00 }, { id: "h-ppl-03-2", itemId: "inv-015", itemName: "Pasta — Tagliatelle (kg)", quantityOrdered: 10, unitCost: 4.80, totalCost: 48.00 }, { id: "h-ppl-03-3", itemId: "inv-020", itemName: "San Marzano Tomatoes (400g tin)", quantityOrdered: 24, unitCost: 3.20, totalCost: 76.80 }] },
  // late +3d
  { id: "h-ppl-04", vendorName: "Pantry Plus", status: "delivered", expectedDeliveryDate: "2026-04-01", actualDeliveryDate: "2026-04-04", orderedAt: "2026-03-29T14:00:00Z", trackingNumber: null, trackingUrl: null, notes: "3-day delay — warehouse staffing issue. Ran low on olive oil.", totalCost: 310.00, lineItems: [{ id: "h-ppl-04-1", itemId: "inv-019", itemName: "Extra Virgin Olive Oil (L)", quantityOrdered: 6, unitCost: 15.00, totalCost: 90.00 }, { id: "h-ppl-04-2", itemId: "inv-016", itemName: "Arborio Rice (kg)", quantityOrdered: 6, unitCost: 5.50, totalCost: 33.00 }, { id: "h-ppl-04-3", itemId: "inv-020", itemName: "San Marzano Tomatoes (400g tin)", quantityOrdered: 24, unitCost: 3.20, totalCost: 76.80 }] },
  // late +2d
  { id: "h-ppl-05", vendorName: "Pantry Plus", status: "delivered", expectedDeliveryDate: "2026-04-06", actualDeliveryDate: "2026-04-08", orderedAt: "2026-04-03T14:00:00Z", trackingNumber: null, trackingUrl: null, notes: "Late again. Price of olive oil up again on this invoice.", totalCost: 340.20, lineItems: [{ id: "h-ppl-05-1", itemId: "inv-019", itemName: "Extra Virgin Olive Oil (L)", quantityOrdered: 6, unitCost: 16.00, totalCost: 96.00 }, { id: "h-ppl-05-2", itemId: "inv-015", itemName: "Pasta — Tagliatelle (kg)", quantityOrdered: 8, unitCost: 4.80, totalCost: 38.40 }, { id: "h-ppl-05-3", itemId: "inv-020", itemName: "San Marzano Tomatoes (400g tin)", quantityOrdered: 24, unitCost: 3.20, totalCost: 76.80 }] },
  // on time
  { id: "h-ppl-06", vendorName: "Pantry Plus", status: "delivered", expectedDeliveryDate: "2026-04-10", actualDeliveryDate: "2026-04-10", orderedAt: "2026-04-08T14:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 316.80, lineItems: [{ id: "h-ppl-06-1", itemId: "inv-019", itemName: "Extra Virgin Olive Oil (L)", quantityOrdered: 5, unitCost: 16.00, totalCost: 80.00 }, { id: "h-ppl-06-2", itemId: "inv-015", itemName: "Pasta — Tagliatelle (kg)", quantityOrdered: 8, unitCost: 4.80, totalCost: 38.40 }, { id: "h-ppl-06-3", itemId: "inv-020", itemName: "San Marzano Tomatoes (400g tin)", quantityOrdered: 24, unitCost: 3.20, totalCost: 76.80 }] },

  // ── Vine & Cellar (3 historical — reliable) ───────────────────────
  { id: "h-vnc-01", vendorName: "Vine & Cellar", status: "delivered", expectedDeliveryDate: "2026-03-18", actualDeliveryDate: "2026-03-18", orderedAt: "2026-03-15T11:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 182.00, lineItems: [{ id: "h-vnc-01-1", itemId: "inv-022", itemName: "Dry White Wine (750ml)", quantityOrdered: 13, unitCost: 14.00, totalCost: 182.00 }] },
  { id: "h-vnc-02", vendorName: "Vine & Cellar", status: "delivered", expectedDeliveryDate: "2026-03-29", actualDeliveryDate: "2026-03-29", orderedAt: "2026-03-26T11:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 196.00, lineItems: [{ id: "h-vnc-02-1", itemId: "inv-022", itemName: "Dry White Wine (750ml)", quantityOrdered: 14, unitCost: 14.00, totalCost: 196.00 }] },
  { id: "h-vnc-03", vendorName: "Vine & Cellar", status: "delivered", expectedDeliveryDate: "2026-04-08", actualDeliveryDate: "2026-04-08", orderedAt: "2026-04-05T11:00:00Z", trackingNumber: null, trackingUrl: null, notes: null, totalCost: 210.00, lineItems: [{ id: "h-vnc-03-1", itemId: "inv-022", itemName: "Dry White Wine (750ml)", quantityOrdered: 15, unitCost: 14.00, totalCost: 210.00 }] },
]
