import type { MenuItemInventoryUsage } from "@/lib/types"

/**
 * Maps each menu item → the inventory items it consumes per order.
 * Units match the inventory item's unit (kg, L, dozen, tin, etc.).
 */
export const menuInventoryUsage: MenuItemInventoryUsage[] = [
  // menu-001: Garlic Prawn Bruschetta
  { menuItemId: "menu-001", itemId: "inv-004", unitsUsedPerOrder: 0.15 }, // Tiger Prawns
  { menuItemId: "menu-001", itemId: "inv-009", unitsUsedPerOrder: 0.02 }, // Garlic
  { menuItemId: "menu-001", itemId: "inv-019", unitsUsedPerOrder: 0.03 }, // Olive Oil
  { menuItemId: "menu-001", itemId: "inv-017", unitsUsedPerOrder: 0.05 }, // Flour (toast base)

  // menu-002: Mushroom & Spinach Tartlet
  { menuItemId: "menu-002", itemId: "inv-008", unitsUsedPerOrder: 0.1 },  // Portobello Mushrooms
  { menuItemId: "menu-002", itemId: "inv-007", unitsUsedPerOrder: 0.05 }, // Baby Spinach
  { menuItemId: "menu-002", itemId: "inv-013", unitsUsedPerOrder: 0.08 }, // Eggs
  { menuItemId: "menu-002", itemId: "inv-011", unitsUsedPerOrder: 0.04 }, // Heavy Cream
  { menuItemId: "menu-002", itemId: "inv-017", unitsUsedPerOrder: 0.08 }, // Flour

  // menu-003: Caesar Salad
  { menuItemId: "menu-003", itemId: "inv-010", unitsUsedPerOrder: 0.12 }, // Mixed Lettuce
  { menuItemId: "menu-003", itemId: "inv-012", unitsUsedPerOrder: 0.04 }, // Parmesan
  { menuItemId: "menu-003", itemId: "inv-013", unitsUsedPerOrder: 0.08 }, // Eggs (dressing)
  { menuItemId: "menu-003", itemId: "inv-019", unitsUsedPerOrder: 0.02 }, // Olive Oil
  { menuItemId: "menu-003", itemId: "inv-018", unitsUsedPerOrder: 0.02 }, // Panko (croutons)

  // menu-004: Beef Carpaccio
  { menuItemId: "menu-004", itemId: "inv-003", unitsUsedPerOrder: 0.1 },  // Beef Tenderloin
  { menuItemId: "menu-004", itemId: "inv-012", unitsUsedPerOrder: 0.03 }, // Parmesan
  { menuItemId: "menu-004", itemId: "inv-019", unitsUsedPerOrder: 0.02 }, // Olive Oil
  { menuItemId: "menu-004", itemId: "inv-021", unitsUsedPerOrder: 0.01 }, // Dijon Mustard

  // menu-005: Pan-Seared Salmon
  { menuItemId: "menu-005", itemId: "inv-001", unitsUsedPerOrder: 0.22 }, // Salmon Fillet
  { menuItemId: "menu-005", itemId: "inv-014", unitsUsedPerOrder: 0.03 }, // Butter
  { menuItemId: "menu-005", itemId: "inv-009", unitsUsedPerOrder: 0.02 }, // Garlic
  { menuItemId: "menu-005", itemId: "inv-019", unitsUsedPerOrder: 0.02 }, // Olive Oil
  { menuItemId: "menu-005", itemId: "inv-007", unitsUsedPerOrder: 0.04 }, // Baby Spinach (bed)

  // menu-006: Chicken Supreme
  { menuItemId: "menu-006", itemId: "inv-002", unitsUsedPerOrder: 0.25 }, // Chicken Breast
  { menuItemId: "menu-006", itemId: "inv-011", unitsUsedPerOrder: 0.06 }, // Heavy Cream (sauce)
  { menuItemId: "menu-006", itemId: "inv-009", unitsUsedPerOrder: 0.02 }, // Garlic
  { menuItemId: "menu-006", itemId: "inv-014", unitsUsedPerOrder: 0.02 }, // Butter
  { menuItemId: "menu-006", itemId: "inv-023", unitsUsedPerOrder: 0.1 },  // Chicken Stock

  // menu-007: Beef Tenderloin
  { menuItemId: "menu-007", itemId: "inv-003", unitsUsedPerOrder: 0.3 },  // Beef Tenderloin
  { menuItemId: "menu-007", itemId: "inv-014", unitsUsedPerOrder: 0.04 }, // Butter
  { menuItemId: "menu-007", itemId: "inv-009", unitsUsedPerOrder: 0.02 }, // Garlic
  { menuItemId: "menu-007", itemId: "inv-021", unitsUsedPerOrder: 0.015 }, // Dijon Mustard

  // menu-008: Duck Confit
  { menuItemId: "menu-008", itemId: "inv-005", unitsUsedPerOrder: 0.28 }, // Duck Breast
  { menuItemId: "menu-008", itemId: "inv-009", unitsUsedPerOrder: 0.02 }, // Garlic
  { menuItemId: "menu-008", itemId: "inv-019", unitsUsedPerOrder: 0.03 }, // Olive Oil

  // menu-009: Prawn Linguine
  { menuItemId: "menu-009", itemId: "inv-004", unitsUsedPerOrder: 0.2 },  // Tiger Prawns
  { menuItemId: "menu-009", itemId: "inv-015", unitsUsedPerOrder: 0.12 }, // Pasta (sub tagliatelle)
  { menuItemId: "menu-009", itemId: "inv-006", unitsUsedPerOrder: 0.08 }, // Roma Tomatoes
  { menuItemId: "menu-009", itemId: "inv-009", unitsUsedPerOrder: 0.02 }, // Garlic
  { menuItemId: "menu-009", itemId: "inv-019", unitsUsedPerOrder: 0.03 }, // Olive Oil
  { menuItemId: "menu-009", itemId: "inv-022", unitsUsedPerOrder: 0.05 }, // White Wine

  // menu-010: Mushroom Risotto
  { menuItemId: "menu-010", itemId: "inv-016", unitsUsedPerOrder: 0.1 },  // Arborio Rice
  { menuItemId: "menu-010", itemId: "inv-008", unitsUsedPerOrder: 0.12 }, // Portobello Mushrooms
  { menuItemId: "menu-010", itemId: "inv-012", unitsUsedPerOrder: 0.04 }, // Parmesan
  { menuItemId: "menu-010", itemId: "inv-014", unitsUsedPerOrder: 0.03 }, // Butter
  { menuItemId: "menu-010", itemId: "inv-023", unitsUsedPerOrder: 0.2 },  // Chicken Stock
  { menuItemId: "menu-010", itemId: "inv-022", unitsUsedPerOrder: 0.05 }, // White Wine

  // menu-011: Tomato & Basil Tagliatelle
  { menuItemId: "menu-011", itemId: "inv-015", unitsUsedPerOrder: 0.12 }, // Pasta
  { menuItemId: "menu-011", itemId: "inv-020", unitsUsedPerOrder: 0.25 }, // San Marzano Tomatoes
  { menuItemId: "menu-011", itemId: "inv-009", unitsUsedPerOrder: 0.02 }, // Garlic
  { menuItemId: "menu-011", itemId: "inv-019", unitsUsedPerOrder: 0.02 }, // Olive Oil
  { menuItemId: "menu-011", itemId: "inv-012", unitsUsedPerOrder: 0.03 }, // Parmesan

  // menu-012: Roasted Garlic Potatoes (side)
  { menuItemId: "menu-012", itemId: "inv-009", unitsUsedPerOrder: 0.03 }, // Garlic
  { menuItemId: "menu-012", itemId: "inv-019", unitsUsedPerOrder: 0.02 }, // Olive Oil

  // menu-013: Sautéed Spinach (side)
  { menuItemId: "menu-013", itemId: "inv-007", unitsUsedPerOrder: 0.08 }, // Baby Spinach
  { menuItemId: "menu-013", itemId: "inv-009", unitsUsedPerOrder: 0.01 }, // Garlic
  { menuItemId: "menu-013", itemId: "inv-019", unitsUsedPerOrder: 0.01 }, // Olive Oil

  // menu-014: Truffle Fries (side)
  { menuItemId: "menu-014", itemId: "inv-019", unitsUsedPerOrder: 0.015 }, // Olive Oil

  // menu-015: Crème Brûlée
  { menuItemId: "menu-015", itemId: "inv-011", unitsUsedPerOrder: 0.1 },  // Heavy Cream
  { menuItemId: "menu-015", itemId: "inv-013", unitsUsedPerOrder: 0.17 }, // Eggs

  // menu-016: Flourless Chocolate Cake
  { menuItemId: "menu-016", itemId: "inv-013", unitsUsedPerOrder: 0.17 }, // Eggs
  { menuItemId: "menu-016", itemId: "inv-014", unitsUsedPerOrder: 0.04 }, // Butter
  { menuItemId: "menu-016", itemId: "inv-011", unitsUsedPerOrder: 0.05 }, // Heavy Cream
]
