// app/api/paprika/categories/route.ts

import { NextResponse } from "next/server";
import { PaprikaClient } from "@/lib/paprika/client";

export async function GET() {
  try {
    const email = process.env.PAPRIKA_EMAIL;
    const password = process.env.PAPRIKA_PASSWORD;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Paprika credentials not configured" },
        { status: 500 }
      );
    }

    const client = new PaprikaClient(email, password);
    await client.login();
    const categories = await client.getCategories();

    // Map to normalized format
    const normalizedCategories = categories.map((cat) => ({
      uid: cat.uid ?? "",
      name: cat.name ?? "",
      parent_uid: cat.parent_uid ?? null,
      order_flag: cat.order_flag ?? 0,
    }));

    return NextResponse.json({ categories: normalizedCategories });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

