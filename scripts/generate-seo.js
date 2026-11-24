const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const siteUrl = (process.env.SITE_URL || "https://YOUR_GITHUB_USERNAME.github.io/HistoriaOS")
    .replace(/\/+$/, "");
const siteBasePath = `${new URL(siteUrl).pathname.replace(/\/+$/, "")}/`;
const pages = [
    { path: "website/", changeFrequency: "weekly", priority: "1.0" },
    { path: "website/books.html", changeFrequency: "weekly", priority: "0.8" },
    { path: "website/people.html", changeFrequency: "weekly", priority: "0.8" },
    { path: "website/events.html", changeFrequency: "weekly", priority: "0.8" },
    { path: "website/maps.html", changeFrequency: "monthly", priority: "0.7" },
    { path: "website/timeline.html", changeFrequency: "weekly", priority: "0.7" },
    { path: "website/umayyad.html", changeFrequency: "monthly", priority: "0.9" },
    { path: "website/about.html", changeFrequency: "monthly", priority: "0.5" },
    { path: "website/pricing.html", changeFrequency: "monthly", priority: "0.5" },
    { path: "website/contact.html", changeFrequency: "monthly", priority: "0.4" }
];

function escapeXml(value) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const entries = pages.map(page => `  <url>
    <loc>${escapeXml(`${siteUrl}/${page.path}`)}</loc>
    <changefreq>${page.changeFrequency}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;

fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap, "utf8");
fs.writeFileSync(
    path.join(root, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`,
    "utf8"
);
const notFoundPath = path.join(root, "404.html");
const notFoundPage = fs.readFileSync(notFoundPath, "utf8");
if (!/<meta name="site-base-path" content="[^"]*">/.test(notFoundPage)) {
    throw new Error("404.html must include the site-base-path metadata element.");
}
fs.writeFileSync(
    notFoundPath,
    notFoundPage.replace(
        /<meta name="site-base-path" content="[^"]*">/,
        `<meta name="site-base-path" content="${siteBasePath}">`
    ),
    "utf8"
);
console.log(`Generated sitemap.xml, robots.txt, and 404 links for ${siteUrl}`);
