import { NextResponse } from "next/server";
import OpenAI from "openai";
import { isAdminAuthenticated } from "../../../../lib/auth";
import { pool } from "../../../../lib/db";

export async function POST(request: Request) {
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

    const body = await request.json();

    const question = body?.question?.trim();

    if (!question) {
      return NextResponse.json(
        {
          success: false,
          message: "Question is required.",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL;

    if (!apiKey || !model) {
      return NextResponse.json(
        {
          success: false,
          message: "AI configuration is missing.",
        },
        { status: 500 }
      );
    }

    const overviewResult = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM influencers) AS total_creators,
        (
          SELECT COUNT(*)
          FROM influencers
          WHERE status = 'active'
        ) AS active_creators,
        (
          SELECT COUNT(*)
          FROM social_accounts
          WHERE platform = 'instagram'
          AND status = 'active'
        ) AS connected_instagram
    `);

    const creatorsResult = await pool.query(`
      SELECT
        i.id,
        i.name,
        i.instagram_username,
        i.niche,
        i.city,
        i.status,

        latest.followers,
        latest.following,
        latest.media_count,
        latest.snapshot_date

      FROM influencers i

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

      ORDER BY i.created_at DESC
      LIMIT 200
    `);

    const growthResult = await pool.query(`
      SELECT
        i.id AS influencer_id,
        i.name,
        fs.snapshot_date,
        fs.followers
      FROM influencers i
      JOIN follower_snapshots fs
        ON fs.influencer_id = i.id
      WHERE fs.snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY i.id, fs.snapshot_date
      LIMIT 5000
    `);

    const context = {
      overview: overviewResult.rows[0],
      creators: creatorsResult.rows,
      followerHistory30Days: growthResult.rows,
    };

    const client = new OpenAI({
      apiKey,
    });

    const response = await client.responses.create({
      model,
      instructions: `
You are the AI analyst for an influencer analytics platform.

Answer questions using only the supplied dashboard data.

Focus on:
- creator performance
- follower growth
- creator comparisons
- Instagram connection status
- niches
- cities
- engagement-related observations only when the supplied data supports them
- operational insights

Do not invent numbers.
If the available data does not support an answer, clearly say that the data is not available.

Keep answers concise and useful for an admin dashboard.
      `,
      input: `
ADMIN QUESTION:
${question}

DASHBOARD DATA:
${JSON.stringify(context, null, 2)}
      `,
    });

    return NextResponse.json({
      success: true,
      answer: response.output_text,
    });
  } catch (error) {
    console.error("AI analyst error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "AI analyst failed to generate a response.",
      },
      { status: 500 }
    );
  }
}
