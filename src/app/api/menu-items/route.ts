import { db } from "@/lib/db"
import { menuItems } from "@/lib/db/schema"
import { asc } from "drizzle-orm"

export async function GET() {
  try {
    const data = await db
      .select({
        id:    menuItems.id,
        name:  menuItems.name,
        price: menuItems.price,
      })
      .from(menuItems)
      .orderBy(asc(menuItems.name))

    return Response.json({ data })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
