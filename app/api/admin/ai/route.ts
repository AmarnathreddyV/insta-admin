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

    // Dashboard overview
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

    // Creator information
    // IMPORTANT: created_at is included so the AI can answer
    // questions such as "Who joined recently?"
    const creatorsResult = await pool.query(`
      SELECT
        i.id,
        i.name,
        i.email,
        i.phone,
        i.instagram_username,
        i.niche,
        i.city,
        i.country,
        i.status,
        i.created_at,

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

      LIMIT 500
    `);

    // Follower history for the last 30 days
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
      currentDate: new Date().toISOString().split("T")[0],

      overview: overviewResult.rows,

      creators: creatorsResult.rows,

      followerHistory30Days: growthResult.rows,
    };

    const client = new OpenAI({
      apiKey,
    });

    const response = await client.responses.create({
      model,

      instructions: `
You are the AI Analyst for an Influencer Analytics Platform.

You answer questions using the dashboard data supplied by the application.

IMPORTANT RULES:

1. Use ONLY the supplied dashboard data.
2. Never invent creator names, dates, follower counts, or other information.
3. The "created_at" field represents when a creator joined/registered on the platform.
4. If the user asks:
   - "Who joined recently?"
   - "Who joined last?"
   - "Who are the newest creators?"
   - "Who registered recently?"
   - "Show recently joined creators"
   
   use the creator's "created_at" field.
5. Sort creators by created_at descending when answering recent/newest/joined questions.
6. Give the creator name and joining date.
7. If multiple creators joined recently, list them from newest to oldest.
8. Convert ISO timestamps into a simple readable date.
9. "created_at" is the platform registration date, not the Instagram account creation date.
10. Do not confuse follower snapshot dates with creator registration dates.
11. For follower-growth questions, use followerHistory30Days.
12. For current follower questions, use the latest follower data.
13. If the requested information isn't available, clearly say that it isn't available.
14. Keep answers concise and useful for an admin dashboard.

Today's date:
${new Date().toISOString().split("T")[0]}
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
