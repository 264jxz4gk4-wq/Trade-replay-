// Vercel Serverless Function
// GET /api/history?symbol=GME&start=2021-01-01&end=2021-02-01&interval=1day
//
// Keeps the Twelve Data API key on the server only -- it is never sent to
// the browser. Set TWELVE_DATA_API_KEY in Vercel's Environment Variables,
// do not hardcode it here.

export default async function handler(req, res) {
  const { symbol, start, end, interval = "1day" } = req.query;

  if (!symbol || !start || !end) {
    return res.status(400).json({ error: "symbol, start, and end are required" });
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing TWELVE_DATA_API_KEY" });
  }

  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("start_date", start);
  url.searchParams.set("end_date", end);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("format", "JSON");
  url.searchParams.set("order", "ASC");

  try {
    const upstream = await fetch(url.toString());
    const data = await upstream.json();

    if (data.status === "error") {
      return res.status(400).json({ error: data.message || "Twelve Data error" });
    }
    if (!data.values) {
      return res.status(404).json({ error: "No data returned for that symbol/range" });
    }

    const bars = data.values.map((v) => ({
      date: v.datetime,
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
      volume: Number(v.volume || 0),
    }));

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    return res.status(200).json({ symbol, interval, bars });
  } catch (err) {
    return res.status(500).json({ error: "Fetch to Twelve Data failed", detail: String(err) });
  }
}
