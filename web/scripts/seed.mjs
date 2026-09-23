import { createClient } from "@sanity/client";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

function loadEnv(file) {
  try {
    const text = readFileSync(file, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index);
      const value = trimmed.slice(index + 1);
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Missing env file is reported below if the token is absent.
  }
}

loadEnv(resolve(root, "../.env"));

function cliToken() {
  try {
    const home = process.env.HOME;
    const config = JSON.parse(readFileSync(`${home}/.config/sanity/config.json`, "utf8"));
    return config.authToken || config.token || "";
  } catch {
    return "";
  }
}

const token = process.env.SANITY_API_WRITE_TOKEN || cliToken();
const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET || "production";

if (!token || !projectId) {
  console.error("Set PUBLIC_SANITY_PROJECT_ID in web/.env, and SANITY_API_WRITE_TOKEN or a Sanity CLI login, before seeding.");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2026-09-22",
  token,
  useCdn: false,
});

function block(key, text) {
  return {
    _type: "block",
    _key: key,
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: `${key}-span`, text, marks: [] }],
  };
}

function button(key, label, variant) {
  return {
    _type: "button",
    _key: key,
    label,
    variant,
    withArrow: true,
    link: { _type: "link", type: "external", external: "/", openInNewTab: false },
  };
}

async function logo() {
  const file = resolve(root, "../public/logos/miscreants.svg");
  const asset = await client.assets.upload("image", readFileSync(file), { filename: "miscreants.svg" });
  return Array.from({ length: 8 }, (_, index) => ({
    _type: "image",
    _key: `logo-${index}`,
    alt: "Miscreants",
    asset: { _type: "reference", _ref: asset._id },
  }));
}

const home = {
  _id: "page-home",
  _type: "page",
  title: "Home",
  slug: { _type: "slug", current: "home" },
  seo: {
    title: "Home",
    description: "This is a playground for Astro.",
  },
  sections: [
    {
      _type: "section",
      _key: "hero",
      variant: "default",
      background: "none",
      spacing: "xl",
      align: "center",
      content: [
        { _type: "heading", _key: "heading", text: "Hello World", level: "1", size: "h1", align: "center" },
        {
          _type: "richText",
          _key: "text",
          size: "text-body-lg",
          tone: "muted",
          align: "center",
          body: [block("intro", "This is a playground for Astro.")],
        },
        {
          _type: "buttonGroup",
          _key: "actions",
          align: "center",
          buttons: [button("primary", "Learn More", "primary"), button("secondary", "Get a Demo", "secondary")],
        },
      ],
    },
    {
      _type: "logoMarquee",
      _key: "logos",
      label: "Trusted by leading data companies",
      background: "none",
      logos: await logo(),
    },
    {
      _type: "section",
      _key: "features",
      variant: "wide",
      background: "none",
      spacing: "sm",
      align: "left",
      borderTop: true,
      content: [
        { _type: "heading", _key: "heading", text: "Features", level: "2", size: "h2", align: "left" },
        {
          _type: "cardGrid",
          _key: "grid",
          columns: "2",
          cards: [0, 1, 2, 3].map((index) => ({
            _type: "card",
            _key: `feature-${index}`,
            style: "featured",
            eyebrow: "Schema Builder",
            title: "Design content structures your way.",
            description:
              "Miscreants gives you full control over content with a streamlined, API-first experience — perfect for teams who want speed without sacrificing flexibility.",
            border: "none",
            align: "left",
          })),
        },
      ],
    },
    {
      _type: "section",
      _key: "stats",
      variant: "wide",
      background: "none",
      spacing: "none",
      align: "left",
      content: [
        {
          _type: "cardGrid",
          _key: "grid",
          columns: "5",
          cards: [
            ["98.3% uptime", "Proven reliability across sources with proactive monitoring", "lucide:activity"],
            ["Enterprise security", "Encryption at every step with compliance-ready infrastructure", "lucide:shield-check"],
            ["Scalable infrastructure", "Scale your workflow to hundreds of millions of daily fetches", "lucide:server"],
            ["24/7 support", "Proven reliability across sources with proactive monitoring", "lucide:headphones"],
            ["24/7 support", "Proven reliability across sources with proactive monitoring", "lucide:life-buoy"],
          ].map(([header, body, icon], index) => ({
            _type: "card",
            _key: `stat-${index}`,
            style: "icon",
            header,
            body,
            icon,
            align: "left",
          })),
        },
      ],
    },
    {
      _type: "faq",
      _key: "faq",
      heading: "Accordion Component",
      intro: "FAQ-style accordion with CSS-only animations.",
      background: "none",
      closePrevious: true,
      openByDefault: 1,
      items: [
        {
          _key: "q1",
          question: "What is Astro?",
          answer:
            "Astro is a web framework that delivers lightning-fast performance by shipping zero JavaScript by default. It uses an island architecture where only interactive components are hydrated — everything else is pure HTML.",
        },
        {
          _key: "q2",
          question: "How does it compare to Next.js?",
          answer:
            "Astro is content-focused and ships less JavaScript. Next.js is better for highly interactive apps. Astro can use React components when needed, but doesn't require a full React runtime.",
        },
        {
          _key: "q3",
          question: "Can I use my existing components?",
          answer:
            "Yes. Astro supports React, Vue, Svelte, Solid, and more — all in the same project. You can mix frameworks per component and Astro handles the rest.",
        },
      ],
    },
  ],
};

await client.createOrReplace(home);
await client.createOrReplace({
  _id: "siteSettings",
  _type: "siteSettings",
  siteTitle: "Cyber Marketing Practice",
  footerTagline: "Components and blocks for building modern websites with Astro and Tailwind.",
});

console.log("Seeded siteSettings and the home page.");
