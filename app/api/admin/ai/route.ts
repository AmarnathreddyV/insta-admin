import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/auth";
import { pool } from "../../../../lib/db";

export async function POST(request: Request) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";

  if (!apiKey) {
    return NextResponse.json(
      { success: false, message: "OPENAI_API_KEY is not configured." },
      { status: 500 }
    );
  }

  try {
    const { question } = await request.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { success: false, message: "Question is required." },
        { status: 400 }
      );
    }

    const overview = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM influencers) AS total_creators,
        (SELECT COUNT(*)::int FROM influencers WHERE status = 'active') AS active_creators,
        (SELECT COUNT(*)::int FROM social_accounts WHERE platform = 'instagram' AND status = 'active') AS connected_instagram,
        COALESCE((
          SELECT SUM(followers)::bigint
          FROM (
            SELECT DISTINCT ON (influencer_id) followers
            FROM follower_snapshots
            ORDER BY influencer_id, snapshot_date DESC
          ) x
        ), 0)::bigint AS total_followers
    `);

    const creators = await pool.query(`
      SELECT
        i.id,
        i.name,
        i.email,
        i.city,
        i.country,
        i.niche,
        i.instagram_username,
        i.status,
        COALESCE(fs.followers, 0)::bigint AS followers,
        COALESCE(fs.following, 0)::bigint AS following,
        COALESCE(fs.media_count, 0)::bigint AS media_count,
        fs.snapshot_date
      FROM influencers i
      LEFT JOIN LATERAL (
        SELECT *
        FROM follower_snapshots f
        WHERE f.influencer_id = i.id
        ORDER BY f.snapshot_date DESC
        LIMIT 1
      ) fs ON true
      ORDER BY followers DESC
      LIMIT 200
    `);

    const growth = await pool.query(`
      WITH daily AS (
        SELECT
          influencer_id,
          snapshot_date,
          followers,
          LAG(followers) OVER (
            PARTITION BY influencer_id
            ORDER BY snapshot_date
          ) AS previous_followers
        FROM follower_snapshots
        WHERE snapshot_date >= CURRENT_DATE - INTERVAL '31 days'
      )
      SELECT
        influencer_id,
        SUM(followers - COALESCE(previous_followers, followers))::bigint AS change_30d
      FROM daily
      GROUP BY influencer_id
    `);

    const dataContext = JSON.stringify({
      overview: overview.rows[0],
      creators: creators.rows,
      growth_30d: growth.rows,
    });

    const prompt = `
You are the AI Analyst for an influencer analytics administration platform.

Answer the administrator's question using ONLY the database context supplied below.
Do not invent creators, metrics, dates, or trends.
If the database does not contain enough information, say so clearly.
Give concise, business-friendly answers. Use bullets or a small table when useful.
When discussing growth, distinguish observed data from interpretation.

DATABASE CONTEXT:
${dataContext}

ADMIN QUESTION:
${question}
`;

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: prompt,
          max_output_tokens: 1200,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", result);
      return NextResponse.json(
        {
          success: false,
          message:
            result?.error?.message ||
            "AI request failed.",
        },
        { status: 500 }
      );
    }

    const answer =
      result.output_text ||
      result.output
        ?.flatMap((item: any) => item.content || [])
        ?.map((item: any) => item.text)
        ?.filter(Boolean)
        ?.join("\n") ||
      "No answer was returned.";

    return NextResponse.json({
      success: true,
      answer,
    });
  } catch (error) {
    console.error("AI route error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate AI analysis.",
      },
      { status: 500 }
    );
  }
}
