import fs from "node:fs/promises";
import { load } from "cheerio";

const URL = "https://stjacademy.campus-dining.com/menus/";
const OUT = "data/menu.json";

const uniq = (arr) => [...new Set(arr.map((s) => s.trim()).filter(Boolean))];

/** Headers closer to a real browser; some CDNs/WAFs reject bare fetch defaults. */
const BROWSER_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "upgrade-insecure-requests": "1",
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  referer: "https://stjacademy.campus-dining.com/"
};

function logFailedResponse(res, body) {
  const preview = body.slice(0, 800).replace(/\s+/g, " ").trim();
  console.error(`Fetch failed: HTTP ${res.status} ${res.statusText}`);
  for (const h of ["cf-ray", "server", "www-authenticate", "x-request-id"]) {
    const v = res.headers.get(h);
    if (v) console.error(`  ${h}: ${v}`);
  }
  console.error(`  body preview (${preview.length} chars):`, preview || "(empty)");
}

async function main() {
  const res = await fetch(URL, { headers: BROWSER_HEADERS });
  const html = await res.text();

  if (!res.ok) {
    logFailedResponse(res, html);
    throw new Error(`HTTP ${res.status}`);
  }
  const $ = load(html);

  // 第一版选择器，后续可按页面结构微调
  const breakfast = uniq(
    $(".breakfast .menu-item, [data-meal='breakfast'] .menu-item")
      .map((_, el) => $(el).text())
      .get()
  );
  const lunch = uniq(
    $(".lunch .menu-item, [data-meal='lunch'] .menu-item")
      .map((_, el) => $(el).text())
      .get()
  );
  const dinner = uniq(
    $(".dinner .menu-item, [data-meal='dinner'] .menu-item")
      .map((_, el) => $(el).text())
      .get()
  );

  // 如果没抓到内容，不覆盖已有文件
  if (!breakfast.length && !lunch.length && !dinner.length) {
    console.log("No items parsed. Keep existing menu.json");
    return;
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    source: "stjacademy.campus-dining.com",
    menus: {
      Breakfast: breakfast,
      Lunch: lunch,
      Dinner: dinner
    }
  };

  await fs.writeFile(OUT, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log("menu.json updated");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
