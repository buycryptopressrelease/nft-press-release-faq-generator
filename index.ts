#!/usr/bin/env node
/**
 * nft-press-release-faq-generator
 * NFT Press Release FAQ Generator: library and CLI.
 *
 * Type a question in plain English and get the best official answer from 50
 * NFT press release FAQs, with a match confidence score (0 to 100).
 * It can also generate the FAQ as Markdown, JSON, FAQPage JSON-LD or HTML.
 *
 *   nftpr-faq "how much does an nft press release cost"
 *   nftpr-faq --top 3 "how early should i publish before my mint"
 *   nftpr-faq --list launch
 *   nftpr-faq --export jsonld
 *
 * Built by BuyCryptoPressRelease.com (https://buycryptopressrelease.com/). MIT License.
 */

export const VERSION = "1.0.1";
export const WEBSITE = "https://buycryptopressrelease.com/nft-project-pr/";
export const SERVICE_PAGE = "https://buycryptopressrelease.com/nft-project-pr/";
export const REPO = "https://github.com/buycryptopressrelease/nft-press-release-faq-generator";

export interface FAQ {
  id: number;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
}

export interface Result {
  id: number;
  category: string;
  question: string;
  answer: string;
  confidence: number;
  band: string;
}

export type ExportFormat = "markdown" | "json" | "jsonld" | "html";

const STOPWORDS = new Set(
  ("a an the is are was were be been do does did can could will would should " +
    "i me my we our you your it its to of in on for with and or at by from as " +
    "how what which who when where why this that there their them they if so " +
    "any get got have has about into up out than then just very need want much").split(" ")
);

const SYNONYMS: Record<string, string> = {
  "cost": "price", "costs": "price", "pricing": "price", "prices": "price",
  "backlink": "link", "backlinks": "link", "hyperlink": "link", "follow": "dofollow",
  "charge": "fee", "charges": "fee", "fees": "fee",
  "remove": "removal", "removed": "removal", "removing": "removal",
  "takedown": "removal", "delete": "removal", "deleted": "removal",
  "chatgpt": "ai", "llm": "ai", "gemini": "ai", "perplexity": "ai", "geo": "ai",
  "web3": "crypto", "blockchain": "crypto", "token": "crypto", "tokens": "crypto",
  "pr": "press", "release": "press", "releases": "press",
  "refunds": "refund", "pay": "payment", "paying": "payment",
  "long": "time", "quick": "fast", "quickly": "fast", "faster": "fast",
  "article": "article", "articles": "article", "post": "article",
  "ranking": "rank", "rankings": "rank", "ranked": "rank",
  "visitors": "traffic", "visits": "traffic",
  "mistake": "error", "mistakes": "error", "typo": "error", "typos": "error",
  "contact": "support", "whatsapp": "support",
  "cancel": "refund", "money": "refund",
  "use": "benefit", "using": "benefit", "benefits": "benefit", "advantage": "benefit", "advantages": "benefit",
  "site": "outlet", "sites": "outlet", "websites": "outlet", "website": "outlet", "outlets": "outlet", "media": "outlet", "several": "multiple", "series": "multiple",
  "negotiate": "counteroffer", "bundle": "combo", "bundles": "combo", "purchase": "buy", "individual": "single", "nfts": "nft", "minting": "mint", "minted": "mint", "launching": "launch", "announce": "announcement", "announcing": "announcement", "pfp": "collection",
  "news": "announcement", "gaming": "game", "games": "game",
  "pictures": "image", "photos": "image", "photo": "image", "images": "image"
};

const WEIGHTS = { question: 2.0, keywords: 1.5, answer: 0.5 };

export const BANDS: [number, number, string, string][] = [
  [0, 30, "No match", "Rephrase the question or contact support"],
  [31, 60, "Possible match", "Answer may be related; check the question shown"],
  [61, 80, "Good match", "Answer is likely what you need"],
  [81, 100, "Strong match", "Answer directly addresses the question"],
];

export const CATEGORIES: Record<string, string> = {
  "service": "What NFT Project PR is, who it is for and what it covers",
  "launch": "Collection launches, mints, reveals, marketplace and roadmap news",
  "writing": "Writing the NFT press release, drafts, approval and content rules",
  "results": "Publication, Google indexing, dofollow links, live URLs and timing",
  "ordering": "Prices, packages, payment methods, ordering and support"
};

export const FAQS: FAQ[] = [
  {"id": 1, "category": "service", "question": "What is NFT Project PR?", "answer": "NFT Project PR is the BuyCryptoPressRelease.com service for distributing NFT announcements, such as collection launches, mint dates, marketplace updates and Web3 campaigns, to crypto, finance, business and technology media. See https://buycryptopressrelease.com/nft-project-pr/", "keywords": ["nft", "project", "pr", "what", "service"]},
  {"id": 2, "category": "service", "question": "What is an NFT press release?", "answer": "An NFT press release is a short, factual news announcement about an NFT project, such as a new collection, a mint date, a reveal, a partnership or a marketplace listing, written in a news style so media sites can publish it.", "keywords": ["nft", "press", "release", "meaning", "definition"]},
  {"id": 3, "category": "service", "question": "What are the benefits of a press release for an NFT project?", "answer": "A press release puts your project on established news sites, gives collectors and partners a source they can check, helps your project show up in Google and AI search, and gives your community links to share.", "keywords": ["why", "need", "pr", "nft", "project", "benefits"]},
  {"id": 4, "category": "service", "question": "Who is the NFT Project PR service for?", "answer": "NFT founders, artists and creators, Web3 startups, NFT marketplaces, blockchain gaming studios, digital art businesses and NFT marketing agencies.", "keywords": ["who", "can", "use", "creators", "artists", "founders"]},
  {"id": 5, "category": "service", "question": "What types of NFT projects are supported?", "answer": "Generative art and PFP collections, digital art and photography, gaming NFTs, music NFTs, membership and utility NFTs, metaverse assets and NFT marketplaces. Each release still has to meet the editorial rules of the chosen outlets.", "keywords": ["types", "nft", "projects", "pfp", "art", "gaming"]},
  {"id": 6, "category": "service", "question": "What kinds of NFT announcements can I publish?", "answer": "Collection launches, mint announcements, reveal dates, marketplace listings, artist collaborations, partnerships, roadmap milestones, game or utility updates, community events and sold out announcements.", "keywords": ["announcements", "kinds", "news", "topics"]},
  {"id": 7, "category": "service", "question": "Which media sites publish NFT press releases?", "answer": "BuyCryptoPressRelease.com advertises a network of more than 320 crypto, finance, business and technology outlets. The exact sites depend on the single placement or combo package you choose on the website.", "keywords": ["outlets", "sites", "media", "network", "320"]},
  {"id": 8, "category": "service", "question": "Do you cover NFTs on every blockchain?", "answer": "Yes. NFT announcements are accepted whatever the chain, including Ethereum, Solana, Polygon, Base, BNB Chain and Bitcoin Ordinals. Name the chain and token standard clearly in your release.", "keywords": ["blockchains", "ethereum", "solana", "polygon", "base", "chain"]},
  {"id": 9, "category": "service", "question": "What other crypto PR services does BuyCryptoPressRelease.com offer?", "answer": "Crypto presale PR, ICO and IDO PR, token launch and listing PR, exchange listing PR, DeFi protocol PR, metaverse and Web3 PR, and cloud mining PR. See https://buycryptopressrelease.com/", "keywords": ["other", "services", "presale", "token", "metaverse"]},
  {"id": 10, "category": "service", "question": "Can I promote an NFT project before it launches?", "answer": "Yes. Pre launch announcements are common: introduce the project, the art and the team, share the planned mint window, and describe anything not yet confirmed as planned.", "keywords": ["prelaunch", "before", "launch", "early", "teaser", "upcoming", "promote"]},
  {"id": 11, "category": "launch", "question": "Can I announce a new NFT collection launch?", "answer": "Yes. A collection launch release usually covers the project name, chain, total supply, art style, mint date, mint price, marketplace and what holders get.", "keywords": ["collection", "launch", "announce", "new"]},
  {"id": 12, "category": "launch", "question": "Can I publish a mint date announcement?", "answer": "Yes. A mint announcement should give the mint date and time with time zone, the mint price, the supply, the marketplace or mint page, and any allowlist or presale phases.", "keywords": ["mint", "date", "announcement", "publish"]},
  {"id": 13, "category": "launch", "question": "How early should I publish before my mint?", "answer": "Many projects publish about one to two weeks before the mint so collectors have time to prepare, then follow up on mint day. Book a few days before your target date, because each outlet has its own publishing timeline.", "keywords": ["when", "timing", "early", "before", "mint", "book"]},
  {"id": 14, "category": "launch", "question": "Can I publish an NFT reveal announcement?", "answer": "Yes. A reveal announcement can share the reveal date, how holders see their artwork, rarity or trait highlights, and where to view the collection.", "keywords": ["reveal", "art", "announcement", "press", "release", "collection"]},
  {"id": 15, "category": "launch", "question": "Can I announce a marketplace listing?", "answer": "Yes. You can announce a listing or launch on marketplaces such as OpenSea, Magic Eden, Blur or Tensor. Include the official collection link so readers find the right page.", "keywords": ["marketplace", "listing", "opensea", "magic", "eden"]},
  {"id": 16, "category": "launch", "question": "Can I announce that my collection sold out?", "answer": "Yes, if it is true and verifiable on chain. Give the supply and the date it minted out, and avoid claims about future price or value.", "keywords": ["sold", "out", "minted", "complete"]},
  {"id": 17, "category": "launch", "question": "Can I announce an artist collaboration or partnership?", "answer": "Yes. Name both parties, explain what the collaboration includes and when it starts. Only describe a partnership as confirmed once both sides have agreed to it.", "keywords": ["partnership", "collaboration", "artist", "brand"]},
  {"id": 18, "category": "launch", "question": "Can I publish a roadmap or milestone update?", "answer": "Yes. Describe completed milestones as done, and upcoming or planned ones as scheduled or planned. Do not present plans as finished work.", "keywords": ["roadmap", "milestone", "update", "utility"]},
  {"id": 19, "category": "launch", "question": "Can blockchain gaming projects publish NFT news?", "answer": "Yes. Gaming NFT news such as character collections, beta launches and in game item releases fits NFT Project PR, and metaverse news also fits the metaverse and Web3 PR service: https://buycryptopressrelease.com/metaverse-web3-pr/", "keywords": ["gaming", "game", "nft", "metaverse", "press", "release"]},
  {"id": 20, "category": "launch", "question": "Can I publish several announcements over my launch?", "answer": "Yes. Many projects publish a series: collection announcement, mint date, mint day, reveal and a later milestone update. Each release is a separate order.", "keywords": ["multiple", "series", "several", "announcements", "nft"]},
  {"id": 21, "category": "writing", "question": "Can you write my NFT press release?", "answer": "Yes. The editorial team writes and polishes the press release at no extra cost. You can send a short brief instead of a finished draft.", "keywords": ["write", "writing", "writer", "included"]},
  {"id": 22, "category": "writing", "question": "Can I upload my own NFT press release draft?", "answer": "Yes. Upload your draft and the team reviews it and prepares it for distribution.", "keywords": ["upload", "own", "draft", "existing"]},
  {"id": 23, "category": "writing", "question": "What details should I send for my NFT release?", "answer": "Project name, chain and token standard, supply, mint price, mint and reveal dates, marketplace link, website and socials, what holders get, a short founder quote, a media contact and a logo or artwork image.", "keywords": ["brief", "information", "details", "send", "need"]},
  {"id": 24, "category": "writing", "question": "Can I review the release before it is published?", "answer": "Yes. The team shares the prepared release with you for review and approval before distribution begins.", "keywords": ["review", "approve", "before", "draft"]},
  {"id": 25, "category": "writing", "question": "Are revisions included?", "answer": "Yes. Revisions are included as part of the writing process, before you approve the final release.", "keywords": ["revisions", "edits", "changes"]},
  {"id": 26, "category": "writing", "question": "How long should an NFT press release be?", "answer": "Most NFT releases work well at about 400 to 800 words: a clear headline, a short opening paragraph with the key facts, details, a quote, and an about section.", "keywords": ["length", "words", "long"]},
  {"id": 27, "category": "writing", "question": "How do I write a good NFT press release headline?", "answer": "Lead with the project name and the news, add one concrete fact such as the supply, chain or date, and keep it factual. For example: Project Name Sets March 10 Mint Date for 5,000 Piece Collection on Ethereum.", "keywords": ["headline", "title", "tips"]},
  {"id": 28, "category": "writing", "question": "What content gets rejected?", "answer": "Guaranteed returns, price predictions, profit promises, misleading hype, unverified claims, fake partnerships and copied artwork. Keep the tone factual and newsworthy.", "keywords": ["rejected", "not", "allowed", "hype", "rules"]},
  {"id": 29, "category": "writing", "question": "Should I include a risk disclaimer?", "answer": "Yes. Add a short line saying NFTs are digital assets that carry risk and the release is not financial advice. Many crypto outlets expect it.", "keywords": ["disclaimer", "risk", "warning"]},
  {"id": 30, "category": "writing", "question": "Can I include links, images and a contract address?", "answer": "Yes. You can include your website, marketplace page, social links, artwork images and the verified contract address. Link attributes and image support depend on each outlet.", "keywords": ["links", "images", "contract", "address", "socials"]},
  {"id": 31, "category": "results", "question": "Will my NFT press release be indexed by Google?", "answer": "BuyCryptoPressRelease.com advertises Google indexed placements across its network. Indexing speed is decided by Google and can vary by outlet.", "keywords": ["google", "indexed", "indexing", "search"]},
  {"id": 32, "category": "results", "question": "Do NFT press releases include dofollow backlinks?", "answer": "The website advertises dofollow links where the outlet supports them. Link attributes depend on each publication's own policy.", "keywords": ["dofollow", "backlinks", "links", "nofollow"]},
  {"id": 33, "category": "results", "question": "Will I receive live links after publication?", "answer": "Yes. You receive verified live URLs for every confirmed placement after distribution.", "keywords": ["live", "urls", "proof", "report", "links"]},
  {"id": 34, "category": "results", "question": "How long does it take for an NFT press release to go live?", "answer": "Each outlet follows its own editorial timeline. The team tells you the expected publishing window for each outlet before distribution.", "keywords": ["how", "long", "time", "fast", "live", "days", "published", "until"]},
  {"id": 35, "category": "results", "question": "Will all sites publish on the same day?", "answer": "Not always. Each outlet has its own schedule, so publication dates can differ within a combo package.", "keywords": ["same", "day", "all", "sites", "combo", "together"]},
  {"id": 36, "category": "results", "question": "Can you publish on an exact date?", "answer": "The team shares the expected publication window for each outlet. Exact timing depends on each outlet's editorial schedule, so plan a buffer before your mint.", "keywords": ["guarantee", "date", "exact", "schedule"]},
  {"id": 37, "category": "results", "question": "Is publication guaranteed once I order?", "answer": "Your release is distributed to the outlets you choose and you get verified URLs for confirmed placements. Publication is still subject to each outlet's editorial review.", "keywords": ["guaranteed", "publication", "rejected", "outlet"]},
  {"id": 38, "category": "results", "question": "Will an NFT press release help my project in AI search?", "answer": "It can help. AI search tools often cite trusted news pages, so published coverage gives them a source about your project. No one can promise how an AI tool will answer.", "keywords": ["ai", "search", "chatgpt", "visibility"]},
  {"id": 39, "category": "results", "question": "Will a press release increase my NFT sales or floor price?", "answer": "No one can promise sales or price results. A press release builds visibility and credibility; demand still depends on the project, the art, the community and the market.", "keywords": ["sales", "price", "floor", "demand", "results"]},
  {"id": 40, "category": "results", "question": "How should I use the published links?", "answer": "Share them on X, Discord, Telegram and your website, add them to a press or media page, and use them in pitches to partners and marketplaces.", "keywords": ["share", "use", "urls", "community", "twitter", "discord"]},
  {"id": 41, "category": "ordering", "question": "How much does an NFT press release cost?", "answer": "Single outlet placements on BuyCryptoPressRelease.com start at $20. Combo packages have fixed prices that depend on the outlets included. Check https://buycryptopressrelease.com/ for current prices.", "keywords": ["price", "cost", "how", "much", "cheapest"]},
  {"id": 42, "category": "ordering", "question": "Can I buy a placement on just one website?", "answer": "Yes. Single outlet placements let you choose one publication instead of buying a package.", "keywords": ["single", "placement", "one", "website"]},
  {"id": 43, "category": "ordering", "question": "What is a combo package?", "answer": "A combo package is a prebuilt bundle of several publications at one fixed price. Its outlet list is fixed and cannot be custom mixed.", "keywords": ["combo", "package", "bundle", "multiple", "sites"]},
  {"id": 44, "category": "ordering", "question": "Which package should I choose for my NFT project?", "answer": "Pick by audience: crypto native outlets for collectors, finance and business outlets for credibility, and combos for wider reach. Compare the outlet names and prices on the website.", "keywords": ["which", "package", "choose", "best", "right"]},
  {"id": 45, "category": "ordering", "question": "What payment methods are accepted?", "answer": "Bitcoin (BTC), Ethereum (ETH), USDT on ERC20 and TRC20, Solana (SOL), and credit or debit cards through Stripe.", "keywords": ["payment", "methods", "pay", "crypto"]},
  {"id": 46, "category": "ordering", "question": "Can I pay in ETH, SOL or USDT?", "answer": "Yes. ETH, SOL, BTC and USDT on ERC20 and TRC20 are accepted, along with cards through Stripe.", "keywords": ["pay", "eth", "solana", "sol", "usdt", "bitcoin"]},
  {"id": 47, "category": "ordering", "question": "How do I order NFT Project PR?", "answer": "Choose a single placement or combo on the website, check out, send your draft or brief, then approve the prepared release. You can create an account at https://buycryptopressrelease.com/register/", "keywords": ["order", "how", "start", "account", "register", "place"]},
  {"id": 48, "category": "ordering", "question": "Can I make a counteroffer or get a bulk deal?", "answer": "Yes. The homepage invites counteroffers on packages, and agencies can ask support about bulk orders.", "keywords": ["counteroffer", "negotiate", "discount", "bulk", "agency", "price"]},
  {"id": 49, "category": "ordering", "question": "How do I contact the team?", "answer": "Telegram @indianmojojo (https://t.me/indianmojojo), WhatsApp +1 917 795 8348 (https://wa.me/19177958348), or email mojo@wewinconsultants.com.", "keywords": ["contact", "support", "telegram", "whatsapp", "email"]},
  {"id": 50, "category": "ordering", "question": "Are there free resources for writing crypto and NFT press releases?", "answer": "Yes. Free crypto press release templates (https://buycryptopressrelease.com/crypto-pr-templates), a writing guide (https://buycryptopressrelease.com/crypto-pr-writing-guide/) and a crypto PR glossary (https://buycryptopressrelease.com/crypto-pr-glossary/).", "keywords": ["templates", "guide", "glossary", "free", "resources"]},
];

/** Lowercase, split, drop stopwords, singularise and map synonyms. */
export function tokenize(text: string): string[] {
  const t = text
    .toLowerCase()
    .split("bhmarketer.ai").join("bhmarketer")
    .split("buycryptopressrelease").join("buy crypto press release")
    .split("non fungible").join("nft");
  const out: string[] = [];
  for (let w of t.split(/[^a-z0-9]+/)) {
    if (!w || STOPWORDS.has(w)) continue;
    w = SYNONYMS[w] ?? w;
    if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
    w = SYNONYMS[w] ?? w;
    out.push(w);
  }
  return out;
}

function buildIndex(faq: FAQ): Map<string, number> {
  const idx = new Map<string, number>();
  const fields: [string, number][] = [
    [faq.question, WEIGHTS.question],
    [faq.keywords.join(" "), WEIGHTS.keywords],
    [faq.answer, WEIGHTS.answer],
  ];
  for (const [text, weight] of fields) {
    for (const tok of tokenize(text)) idx.set(tok, Math.max(idx.get(tok) ?? 0, weight));
  }
  return idx;
}

const INDEX = FAQS.map((f) => ({ idx: buildIndex(f), qtokens: new Set(tokenize(f.question)), faq: f }));

/** Return [label, meaning] for a confidence score. */
export function band(score: number): [string, string] {
  for (const [low, high, label, meaning] of BANDS) {
    if (score >= low && score <= high) return [label, meaning];
  }
  return ["No match", ""];
}

/** Return up to `top` results, best first. */
export function search(query: string, top = 1): Result[] {
  const q = Array.from(new Set(tokenize(query)));
  if (q.length === 0) return [];
  const scored: { conf: number; cover: number; faq: FAQ }[] = [];
  for (const { idx, qtokens, faq } of INDEX) {
    let points = 0;
    for (const t of q) points += idx.get(t) ?? 0;
    if (points <= 0) continue;
    const conf = Math.min(100, Math.floor((points / (WEIGHTS.question * q.length)) * 100 + 0.5));
    let hit = 0;
    for (const t of qtokens) if (q.includes(t)) hit++;
    const cover = Math.floor((hit * 1000) / Math.max(1, qtokens.size));
    scored.push({ conf, cover, faq });
  }
  scored.sort((a, b) => b.conf - a.conf || b.cover - a.cover || a.faq.id - b.faq.id);
  return scored.slice(0, top).map(({ conf, faq }) => ({
    id: faq.id, category: faq.category, question: faq.question,
    answer: faq.answer, confidence: conf, band: band(conf)[0],
  }));
}

/** Return the single best result, or null when nothing matches. */
export function ask(query: string): Result | null {
  const r = search(query, 1);
  return r.length ? r[0] : null;
}

/** Return one FAQ by number (1 to 50), or null. */
export function getFaq(id: number): FAQ | null {
  return FAQS.find((f) => f.id === id) ?? null;
}

/** Return all FAQs in a category. */
export function byCategory(category: string): FAQ[] {
  return FAQS.filter((f) => f.category === category);
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

/** FAQPage JSON-LD for a list of FAQs. */
export function toJsonLd(faqs: FAQ[]): string {
  return JSON.stringify({
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question", name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  }, null, 2);
}

/** Generate the FAQ (all or one category) as markdown, json, jsonld or html. */
export function exportFaq(format: ExportFormat = "markdown", category?: string): string {
  const faqs = category ? byCategory(category) : FAQS;
  const title = "NFT Press Release FAQ";
  if (format === "json") {
    return JSON.stringify(faqs.map((f) => ({ question: f.question, answer: f.answer })), null, 2) + "\n";
  }
  if (format === "jsonld") return toJsonLd(faqs) + "\n";
  if (format === "html") {
    const items = faqs.map((f) => `  <h3>${esc(f.question)}</h3>\n  <p>${esc(f.answer)}</p>`).join("\n");
    return `<section class="nftpr-faq">\n  <h2>${esc(title)}</h2>\n${items}\n</section>\n` +
      `<script type="application/ld+json">\n${toJsonLd(faqs)}\n</script>\n`;
  }
  const lines = [`# ${title}`, ""];
  for (const f of faqs) lines.push(`## ${f.id}. ${f.question}`, "", f.answer, "");
  lines.push(`*Generated by the NFT Press Release FAQ Generator. Learn more: ${SERVICE_PAGE}*`);
  return lines.join("\n") + "\n";
}

const USAGE = `NFT Press Release FAQ Generator v${VERSION}

Usage:
  nftpr-faq "how much does an nft press release cost"
  nftpr-faq --top 3 "how early should i publish before my mint"
  nftpr-faq --json "can you write my nft press release"
  nftpr-faq --list [category]
  nftpr-faq --id 41
  nftpr-faq --categories
  nftpr-faq --export markdown|json|jsonld|html [category]
  nftpr-faq --version`;

export function main(argv: string[] = process.argv.slice(2)): number {
  let args = [...argv];
  const print = (s: string) => console.log(s);
  if (!args.length || args[0] === "-h" || args[0] === "--help") { print(USAGE); return 0; }
  if (args[0] === "--version") { print(VERSION); return 0; }
  if (args[0] === "--categories") {
    for (const [c, d] of Object.entries(CATEGORIES)) {
      print(`${c.padEnd(18)} ${String(byCategory(c).length).padStart(2)}  ${d}`);
    }
    return 0;
  }
  if (args[0] === "--list") {
    const items = args.length > 1 ? byCategory(args[1]) : FAQS;
    if (!items.length) { print("Unknown category. Try --categories"); return 1; }
    for (const f of items) print(`${String(f.id).padStart(2)}. ${f.question}`);
    return 0;
  }
  if (args[0] === "--id") {
    const f = args.length > 1 && /^\d+$/.test(args[1]) ? getFaq(parseInt(args[1], 10)) : null;
    if (!f) { print("FAQ number must be 1 to 50"); return 1; }
    print(`Q${f.id}. ${f.question}\n${f.answer}`);
    return 0;
  }
  if (args[0] === "--export") {
    const fmt = (args[1] ?? "markdown") as ExportFormat;
    const cat = args[2];
    if (!["markdown", "json", "jsonld", "html"].includes(fmt) || (cat && !(cat in CATEGORIES))) {
      print("Use: --export markdown|json|jsonld|html [category]");
      return 1;
    }
    process.stdout.write(exportFaq(fmt, cat));
    return 0;
  }

  let asJson = false;
  let top = 1;
  if (args[0] === "--json") { asJson = true; args = args.slice(1); }
  if (args[0] === "--top") { top = parseInt(args[1], 10); args = args.slice(2); }
  const query = args.join(" ");
  const results = search(query, top);

  if (asJson) {
    print(JSON.stringify({ query, results }, null, 2));
    return results.length ? 0 : 1;
  }
  if (!results.length) {
    print("No matching FAQ found. Try --list to browse all 50 questions,");
    print(`or contact support: https://buycryptopressrelease.com/contact/`);
    return 1;
  }
  for (const r of results) {
    print(`Q${r.id}. ${r.question}  [${r.category}]`);
    print(`   ${r.answer}`);
    print(`   Confidence: ${r.confidence}/100 (${r.band})\n`);
  }
  print(`NFT Press Release FAQ Generator v${VERSION}  |  ${SERVICE_PAGE}`);
  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}
