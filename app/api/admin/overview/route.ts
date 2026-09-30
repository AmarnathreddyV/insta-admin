import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/auth";
import { pool } from "../../../../lib/db";

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM influencers) AS total_creators,
        (SELECT COUNT(*)::int FROM influencers WHERE status = 'active') AS active_creators,
        (SELECT COUNT(*)::int FROM social_accounts WHERE platform = 'instagram' AND status = 'active') AS connected_instagram,
        COALESCE((
          SELECT SUM(latest.followers)::bigint
          FROM (
            SELECT DISTINCT ON (influencer_id) followers
            FROM follower_snapshots
            ORDER BY influencer_id, snapshot_date DESC
          ) latest
        ), 0)::bigint AS total_followers
    `);

    const growth = await pool.query(`
      WITH latest AS (
        SELECT DISTINCT ON (influencer_id)
          influencer_id, followers, snapshot_date
        FROM follower_snapshots
        ORDER BY influencer_id, snapshot_date DESC
      ),
      previous AS (
        SELECT DISTINCT ON (influencer_id)
          influencer_id, followers, snapshot_date
        FROM follower_snapshots
        WHERE snapshot_date < CURRENT_DATE
        ORDER BY influencer_id, snapshot_date DESC
      )
      SELECT
        COALESCE(SUM(latest.followers - COALESCE(previous.followers, latest.followers)), 0)::bigint AS follower_change
      FROM latest
      LEFT JOIN previous USING (influencer_id)
    `);

    return NextResponse.json({
      success: true,
      stats: {
        ...stats.rows[0],
        follower_change: growth.rows[0]?.follower_change ?? 0,
      },
    });
  } catch (error) {
    console.error("Overview error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load overview." },
      { status: 500 }
    );
  }
}
