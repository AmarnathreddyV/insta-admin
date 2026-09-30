import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/auth";
import { pool } from "../../../../../lib/db";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await context.params;

  try {
    const creator = await pool.query(
      `
      SELECT
        i.*,
        COALESCE(sa.username, i.instagram_username) AS connected_username,
        sa.platform_user_id,
        sa.account_type,
        sa.status AS social_status,
        sa.connected_at,
        sa.last_synced
      FROM influencers i
      LEFT JOIN LATERAL (
        SELECT *
        FROM social_accounts s
        WHERE s.influencer_id = i.id
          AND s.platform = 'instagram'
        ORDER BY s.last_synced DESC NULLS LAST
        LIMIT 1
      ) sa ON true
      WHERE i.id = $1
      `,
      [Number(id)]
    );

    if (!creator.rows[0]) {
      return NextResponse.json(
        { success: false, message: "Creator not found." },
        { status: 404 }
      );
    }

    const snapshots = await pool.query(
      `
      SELECT snapshot_date, followers, following, media_count
      FROM follower_snapshots
      WHERE influencer_id = $1
      ORDER BY snapshot_date ASC
      LIMIT 366
      `,
      [Number(id)]
    );

    return NextResponse.json({
      success: true,
      creator: creator.rows[0],
      snapshots: snapshots.rows,
    });
  } catch (error) {
    console.error("Creator detail error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load creator." },
      { status: 500 }
    );
  }
}
