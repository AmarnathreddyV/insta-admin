import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "../../../../lib/auth";
import { pool } from "../../../../lib/db";

export async function GET() {
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

    const creatorsResult = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM influencers
    `);

    const activeCreatorsResult = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM influencers
      WHERE status = 'active'
    `);

    const connectedInstagramResult = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM social_accounts
      WHERE platform = 'instagram'
      AND status = 'active'
    `);

    const followersResult = await pool.query(`
      SELECT COALESCE(SUM(latest.followers), 0)::bigint AS total
      FROM (
        SELECT DISTINCT ON (influencer_id)
          influencer_id,
          followers
        FROM follower_snapshots
        ORDER BY influencer_id, snapshot_date DESC
      ) latest
    `);

    const growthResult = await pool.query(`
      WITH latest AS (
        SELECT DISTINCT ON (influencer_id)
          influencer_id,
          followers,
          snapshot_date
        FROM follower_snapshots
        ORDER BY influencer_id, snapshot_date DESC
      ),
      previous AS (
        SELECT DISTINCT ON (influencer_id)
          influencer_id,
          followers,
          snapshot_date
        FROM follower_snapshots
        ORDER BY influencer_id, snapshot_date DESC
      )
      SELECT
        COALESCE(SUM(latest.followers), 0)::bigint AS current_followers
      FROM latest
    `);

    return NextResponse.json({
      success: true,
      metrics: {
        totalCreators: creatorsResult.rows[0]?.count ?? 0,
        activeCreators: activeCreatorsResult.rows[0]?.count ?? 0,
        connectedInstagram:
          connectedInstagramResult.rows[0]?.count ?? 0,
        totalFollowers:
          Number(followersResult.rows[0]?.total ?? 0),
        currentFollowers:
          Number(growthResult.rows[0]?.current_followers ?? 0),
      },
    });
  } catch (error) {
    console.error("Overview error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load overview.",
      },
      { status: 500 }
    );
  }
}
