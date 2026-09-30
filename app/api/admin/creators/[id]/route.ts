import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "../../../../../lib/auth";
import { pool } from "../../../../../lib/db";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
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

    const { id } = await context.params;

    const creatorId = Number(id);

    if (!Number.isInteger(creatorId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid creator ID.",
        },
        { status: 400 }
      );
    }

    const creatorResult = await pool.query(
      `
      SELECT
        i.*,

        sa.platform_user_id,
        sa.username AS connected_username,
        sa.account_type,
        sa.status AS social_status,
        sa.connected_at,
        sa.last_synced

      FROM influencers i

      LEFT JOIN LATERAL (
        SELECT *
        FROM social_accounts
        WHERE influencer_id = i.id
        AND platform = 'instagram'
        ORDER BY connected_at DESC
        LIMIT 1
      ) sa ON true

      WHERE i.id = $1
      `,
      [creatorId]
    );

    if (creatorResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Creator not found.",
        },
        { status: 404 }
      );
    }

    const historyResult = await pool.query(
      `
      SELECT
        snapshot_date,
        followers,
        following,
        media_count
      FROM follower_snapshots
      WHERE influencer_id = $1
      ORDER BY snapshot_date ASC
      `,
      [creatorId]
    );

    return NextResponse.json({
      success: true,
      creator: creatorResult.rows[0],
      history: historyResult.rows,
    });
  } catch (error) {
    console.error("Creator detail error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load creator.",
      },
      { status: 500 }
    );
  }
}
