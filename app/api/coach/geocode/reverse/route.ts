import { NextRequest, NextResponse } from "next/server";
import { requireCoach } from "@/lib/auth";

/** Reverse geocode via OSM Nominatim (server-side; coach-only). */
export async function GET(req: NextRequest) {
  try {
    await requireCoach();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lat = req.nextUrl.searchParams.get("lat");
  const lon = req.nextUrl.searchParams.get("lon");
  if (lat == null || lon === "" || lon == null || lat === "") {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  const latN = Number(lat);
  const lonN = Number(lon);
  if (!Number.isFinite(latN) || !Number.isFinite(lonN)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(String(latN))}&lon=${encodeURIComponent(String(lonN))}`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "CrosCalGym/1.0 (coach address picker)",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Geocoding service unavailable" }, { status: 502 });
    }
    const data = (await res.json()) as { display_name?: string };
    return NextResponse.json({ displayName: data.display_name ?? "" });
  } catch {
    return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
  }
}
