import fs from "node:fs/promises";
import { load } from "cheerio";

const URL = "https://stjacademy.campus-dining.com/menus/";
const OUT = "data/menu.json";

const uniq = (arr) => [...new Set(arr.map((s) => s.trim()).filter(Boolean))];

async function main() {
  const res = await fetch(URL, {
    headers: {
      "user-agent": "Mozilla/5.0",
      "accept-language": "en-US,en;q=0.9"
    }
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const html = await res.text();
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
