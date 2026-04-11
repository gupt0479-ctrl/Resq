import type { MenuItem } from "@/lib/types"

/**
 * Bistro Nova — restaurant menu.
 * Categories: Starters, Mains, Sides, Desserts.
 */
export const menuItems: MenuItem[] = [
  // Starters
  { id: "menu-001", name: "Garlic Prawn Bruschetta", category: "Starter", price: 18 },
  { id: "menu-002", name: "Mushroom & Spinach Tartlet", category: "Starter", price: 16 },
  { id: "menu-003", name: "Caesar Salad", category: "Starter", price: 17 },
  { id: "menu-004", name: "Beef Carpaccio", category: "Starter", price: 22 },

  // Mains
  { id: "menu-005", name: "Pan-Seared Salmon", category: "Main", price: 42 },
  { id: "menu-006", name: "Chicken Supreme", category: "Main", price: 36 },
  { id: "menu-007", name: "Beef Tenderloin", category: "Main", price: 58 },
  { id: "menu-008", name: "Duck Confit", category: "Main", price: 46 },
  { id: "menu-009", name: "Prawn Linguine", category: "Main", price: 38 },
  { id: "menu-010", name: "Mushroom Risotto", category: "Main", price: 32 },
  { id: "menu-011", name: "Tomato & Basil Tagliatelle", category: "Main", price: 28 },

  // Sides
  { id: "menu-012", name: "Roasted Garlic Potatoes", category: "Side", price: 10 },
  { id: "menu-013", name: "Sautéed Spinach", category: "Side", price: 9 },
  { id: "menu-014", name: "Truffle Fries", category: "Side", price: 12 },

  // Desserts
  { id: "menu-015", name: "Crème Brûlée", category: "Dessert", price: 14 },
  { id: "menu-016", name: "Flourless Chocolate Cake", category: "Dessert", price: 13 },
]
