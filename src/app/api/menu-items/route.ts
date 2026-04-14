import { createServerSupabaseClient } from "@/lib/db/supabase-server"

export async function GET() {
  try {
    const client = createServerSupabaseClient()
    const { data, error } = await client
      .from("menu_items")
      .select("id, name, category, price")
      .order("category")
      .order("name")

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ data: data ?? [] })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
