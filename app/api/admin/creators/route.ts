import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "../../../../lib/auth";
import { pool } from "../../../../lib/db";

export async function GET(request: Request) {
  try {
    const authenticated = await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";

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
        i.bio,
        i.status,
        i.created_at,

        sa.platform_user_id,
        sa.username AS connected_username,
        sa.account_type,
        sa.status AS social_status,
        sa.connected_at,
        sa.last_synced,

        latest.followers,
        latest.following,
        latest.media_count,
        latest.snapshot_date

      FROM influencers i

      LEFT JOIN LATERAL (
        SELECT *
        FROM social_accounts
        WHERE influencer_id = i.id
        AND platform = 'instagram'
        ORDER BY connected_at DESC
        LIMIT 1
      ) sa ON true

      LEFT JOIN LATERAL (
        SELECT
          followers,
          following,
          media_count,
          snapshot_date
        FROM follower_snapshots
        WHERE influencer_id = i.id
        ORDER BY snapshot_date DESC
        LIMIT 1
      ) latest ON true

      WHERE
        $1 = ''
        OR LOWER(i.name) LIKE LOWER('%' || $1 || '%')
        OR LOWER(i.email) LIKE LOWER('%' || $1 || '%')
        OR LOWER(i.instagram_username) LIKE LOWER('%' || $1 || '%')
        OR LOWER(i.niche) LIKE LOWER('%' || $1 || '%')

      ORDER BY i.created_at DESC
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
      {
        success: false,
        message: "Failed to load creators.",
      },
      { status: 500 }
    );
  }
}
