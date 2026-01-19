import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const appId = process.env.STEAM_APP_ID;

  if (!appId || appId === "YOUR_APP_ID_HERE") {
    return NextResponse.json({ error: "STEAM_APP_ID not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "stats";
  const cursor = searchParams.get("cursor") || "*";

  try {
    if (action === "reviews") {
      // Fetch paginated reviews
      const reviewsRes = await fetch(
        `https://store.steampowered.com/appreviews/${appId}?json=1&language=all&cursor=${encodeURIComponent(cursor)}&num_per_page=20&filter=recent`
      );
      const reviewsData = await reviewsRes.json();

      const reviews = (reviewsData?.reviews || []).map((r: any) => ({
        id: r.recommendationid,
        positive: r.voted_up,
        text: r.review,
        hoursPlayed: Math.round((r.author?.playtime_forever || 0) / 60),
        hoursAtReview: Math.round((r.author?.playtime_at_review || 0) / 60),
        posted: r.timestamp_created,
        updated: r.timestamp_updated,
        votesUp: r.votes_up,
        votesFunny: r.votes_funny,
        steamDeck: r.primarily_steam_deck,
        earlyAccess: r.written_during_early_access,
        language: r.language,
      }));

      return NextResponse.json({
        reviews,
        cursor: reviewsData?.cursor || null,
        hasMore: reviews.length === 20,
      });
    }

    // Default: fetch stats
    const [playersRes, reviewsRes, detailsRes] = await Promise.all([
      fetch(`https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`),
      fetch(`https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all`),
      fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`),
    ]);

    const playersData = await playersRes.json();
    const reviewsData = await reviewsRes.json();
    const detailsData = await detailsRes.json();

    const currentPlayers = playersData?.response?.player_count ?? null;

    const reviewSummary = reviewsData?.query_summary || {};
    const reviews = {
      total: reviewSummary.total_reviews || 0,
      positive: reviewSummary.total_positive || 0,
      negative: reviewSummary.total_negative || 0,
      score: reviewSummary.review_score || 0,
      scoreDesc: reviewSummary.review_score_desc || "No reviews",
    };

    const appDetails = detailsData?.[appId]?.data || {};

    return NextResponse.json({
      appId,
      currentPlayers,
      reviews,
      name: appDetails.name || "Unknown",
      headerImage: appDetails.header_image || null,
      price: appDetails.price_overview?.final_formatted || (appDetails.is_free ? "Free" : null),
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Steam Stats API error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch" }, { status: 500 });
  }
}
