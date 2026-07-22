// Vercel Serverless Function
// GET /api/search?q=game
// Returns matching ticker symbols so the frontend can offer a real search box.

export default async function handler(req, res) {
  const { q } = req.query;
  if (!q || q.length < 1) {
    return res.status(400).json({ error: "q is required" });
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing TWELVE_DATA_API_KEY" });
  }

  const url = new URL("https://api.twelvedata.com/symbol_search");
  url.searchParams.set("symbol", q);
  url.searchParams.set("apikey", apiKey);

  try {
    const upstream = await fetch(url.toString());
    const data = await upstream.json();
    const matches = (data.data || [])
      .filter((d) => d.instrument_type === "Common Stock" || d.instrument_type === "ETF")
      .slice(0, 10)
      .map((d) => ({ symbol: d.symbol, name: d.instrument_name, exchange: d.exchange, country: d.country }));

    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");
    return res.status(200).json({ matches });
  } catch (err) {
    return res.status(500).json({ error: "Search failed", detail: String(err) });
  }
}
