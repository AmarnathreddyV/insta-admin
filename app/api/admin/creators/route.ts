import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/auth";
import { pool } from "../../../../lib/db";

export async function GET(request: Request) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").trim();

  try {
    const result = await pool.query(
      `
      SELECT
        i.id,
        i.name,
        i.email,
        i.phone,
        i.city,
        i.country,
        i.niche,
        i.instagram_username,
        i.status,
        i.created_at,
        COALESCE(sa.username, i.instagram_username) AS connected_username,
        CASE WHEN sa.id IS NOT NULL AND sa.status = 'active'
          THEN true ELSE false END AS instagram_connected,
        COALESCE(fs.followers, 0)::bigint AS followers,
        COALESCE(fs.following, 0)::bigint AS following,
        COALESCE(fs.media_count, 0)::bigint AS media_count,
        fs.snapshot_date
      FROM influencers i
      LEFT JOIN LATERAL (
        SELECT *
        FROM social_accounts s
        WHERE s.influencer_id = i.id
          AND s.platform = 'instagram'
        ORDER BY s.last_synced DESC NULLS LAST
        LIMIT 1
      ) sa ON true
      LEFT JOIN LATERAL (
        SELECT *
        FROM follower_snapshots f
        WHERE f.influencer_id = i.id
        ORDER BY f.snapshot_date DESC
        LIMIT 1
      ) fs ON true
      WHERE
        $1 = ''
        OR i.name ILIKE '%' || $1 || '%'
        OR i.email ILIKE '%' || $1 || '%'
        OR i.instagram_username ILIKE '%' || $1 || '%'
        OR i.city ILIKE '%' || $1 || '%'
      ORDER BY i.created_at DESC
      LIMIT 200
      `,
      [search]
    );

    return NextResponse.json({
      success: true,
      creators: result.rows,
    });
  } catch (error) {
    console.error("Creators error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load creators." },
      { status: 500 }
    );
  }
}
