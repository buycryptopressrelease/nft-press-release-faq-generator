"""
nft_pr_faq: NFT Press Release FAQ Generator.

A small, dependency free FAQ engine for NFT Project PR by BuyCryptoPressRelease.com. Type a question in plain English and it returns the best
official answer from 50 FAQs with a match confidence score (0 to 100). It can
also generate the FAQ as Markdown, JSON, FAQPage JSON-LD or HTML.

Usage:
    python nft_pr_faq.py "how much does an nft press release cost"
    python nft_pr_faq.py --top 3 "how early should i publish before my mint"
    python nft_pr_faq.py --list launch
    python nft_pr_faq.py --categories
    python nft_pr_faq.py --json "can you write my nft press release"
    python nft_pr_faq.py --export markdown [category]

Built by BuyCryptoPressRelease.com (https://buycryptopressrelease.com/). MIT License.
"""

import html
import json
import re
import sys

__version__ = "1.0.0"

WEBSITE = "https://buycryptopressrelease.com/nft-project-pr/"
SERVICE_PAGE = "https://buycryptopressrelease.com/nft-project-pr/"
REPO = "https://github.com/buycryptopressrelease/nft-press-release-faq-generator"

STOPWORDS = set(
    "a an the is are was were be been do does did can could will would should "
    "i me my we our you your it its to of in on for with and or at by from as "
    "how what which who when where why this that there their them they if so "
    "any get got have has about into up out than then just very need want much".split()
)

SYNONYMS = {
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
    "pictures": "image", "photos": "image", "photo": "image", "images": "image",
}

WEIGHTS = {"question": 2.0, "keywords": 1.5, "answer": 0.5}

BANDS = [
    (0, 30, "No match", "Rephrase the question or contact support"),
    (31, 60, "Possible match", "Answer may be related; check the question shown"),
    (61, 80, "Good match", "Answer is likely what you need"),
    (81, 100, "Strong match", "Answer directly addresses the question"),
]

CATEGORIES = {
    "service": "What NFT Project PR is, who it is for and what it covers",
    "launch": "Collection launches, mints, reveals, marketplace and roadmap news",
    "writing": "Writing the NFT press release, drafts, approval and content rules",
    "results": "Publication, Google indexing, dofollow links, live URLs and timing",
    "ordering": "Prices, packages, payment methods, ordering and support"
}

FAQS = [
    {"id": 1, "category": "service", "question": "What is NFT Project PR?", "answer": "NFT Project PR is the BuyCryptoPressRelease.com service for distributing NFT announcements, such as collection launches, mint dates, marketplace updates and Web3 campaigns, to crypto, finance, business and technology media. See https://buycryptopressrelease.com/nft-project-pr/", "keywords": ["nft", "project", "pr", "what", "service"]},
    {"id": 2, "category": "service", "question": "What is an NFT press release?", "answer": "An NFT press release is a short, factual news announcement about an NFT project, such as a new collection, a mint date, a reveal, a partnership or a marketplace listing, written in a news style so media sites can publish it.", "keywords": ["nft", "press", "release", "meaning", "definition"]},
    {"id": 3, "category": "service", "question": "What are the benefits of a press release for an NFT project?", "answer": "A press release puts your project on established news sites, gives collectors and partners a source they can check, helps your project show up in Google and AI search, and gives your community links to share.", "keywords": ["why", "need", "pr", "nft", "project", "benefits"]},
    {"id": 4, "category": "service", "question": "Who is the NFT Project PR service for?", "answer": "NFT founders, artists and creators, Web3 startups, NFT marketplaces, blockchain gaming studios, digital art businesses and NFT marketing agencies.", "keywords": ["who", "can", "use", "creators", "artists", "founders"]},
    {"id": 5, "category": "service", "question": "What types of NFT projects are supported?", "answer": "Generative art and PFP collections, digital art and photography, gaming NFTs, music NFTs, membership and utility NFTs, metaverse assets and NFT marketplaces. Each release still has to meet the editorial rules of the chosen outlets.", "keywords": ["types", "nft", "projects", "pfp", "art", "gaming"]},
    {"id": 6, "category": "service", "question": "What kinds of NFT announcements can I publish?", "answer": "Collection launches, mint announcements, reveal dates, marketplace listings, artist collaborations, partnerships, roadmap milestones, game or utility updates, community events and sold out announcements.", "keywords": ["announcements", "kinds", "news", "topics"]},
    {"id": 7, "category": "service", "question": "Which media sites publish NFT press releases?", "answer": "BuyCryptoPressRelease.com advertises a network of more than 320 crypto, finance, business and technology outlets. The exact sites depend on the single placement or combo package you choose on the website.", "keywords": ["outlets", "sites", "media", "network", "320"]},
    {"id": 8, "category": "service", "question": "Do you cover NFTs on every blockchain?", "answer": "Yes. NFT announcements are accepted whatever the chain, including Ethereum, Solana, Polygon, Base, BNB Chain and Bitcoin Ordinals. Name the chain and token standard clearly in your release.", "keywords": ["blockchains", "ethereum", "solana", "polygon", "base", "chain"]},
    {"id": 9, "category": "service", "question": "What other crypto PR services does BuyCryptoPressRelease.com offer?", "answer": "Crypto presale PR, ICO and IDO PR, token launch and listing PR, exchange listing PR, DeFi protocol PR, metaverse and Web3 PR, and cloud mining PR. See https://buycryptopressrelease.com/", "keywords": ["other", "services", "presale", "token", "metaverse"]},
    {"id": 10, "category": "service", "question": "Is there a free tool to plan my NFT announcement?", "answer": "Yes. The free NFT Collection Announcement Analyzer turns your supply, traits, mint dates and milestones into announcement angles, headline ideas and a press release outline: https://buycryptopressrelease.github.io/nft-collection-announcement-analyzer/", "keywords": ["free", "tool", "analyzer", "headline", "ideas", "angles"]},
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
]


def tokenize(text):
    """Lowercase, split, drop stopwords, singularise and map synonyms."""
    text = text.lower().replace("bhmarketer.ai", "bhmarketer")
    text = text.replace("buycryptopressrelease", "buy crypto press release").replace("non fungible", "nft")
    out = []
    for w in re.split(r"[^a-z0-9]+", text):
        if not w or w in STOPWORDS:
            continue
        w = SYNONYMS.get(w, w)
        if len(w) > 3 and w.endswith("s") and not w.endswith("ss"):
            w = w[:-1]
        w = SYNONYMS.get(w, w)
        out.append(w)
    return out


def _index(faq):
    idx = {}
    for field, weight in WEIGHTS.items():
        text = " ".join(faq[field]) if isinstance(faq[field], list) else faq[field]
        for t in tokenize(text):
            idx[t] = max(idx.get(t, 0.0), weight)
    return idx


_INDEX = [(_index(f), set(tokenize(f["question"])), f) for f in FAQS]


def band(score):
    """Return (label, meaning) for a confidence score."""
    for low, high, label, meaning in BANDS:
        if low <= score <= high:
            return label, meaning
    return "No match", ""


def search(query, top=1):
    """Return up to `top` results: dicts with id, category, question, answer, confidence, band."""
    q = list(dict.fromkeys(tokenize(query)))
    if not q:
        return []
    scored = []
    for idx, qtokens, faq in _INDEX:
        points = sum(idx.get(t, 0.0) for t in q)
        if points <= 0:
            continue
        conf = min(100, int(points / (WEIGHTS["question"] * len(q)) * 100 + 0.5))
        cover = int(sum(1 for t in qtokens if t in q) * 1000 / max(1, len(qtokens)))
        scored.append((conf, cover, faq))
    scored.sort(key=lambda s: (-s[0], -s[1], s[2]["id"]))
    out = []
    for conf, _c, faq in scored[:top]:
        label, _m = band(conf)
        out.append({"id": faq["id"], "category": faq["category"], "question": faq["question"],
                    "answer": faq["answer"], "confidence": conf, "band": label})
    return out


def ask(query):
    """Return the single best result, or None when nothing matches."""
    r = search(query, 1)
    return r[0] if r else None


def get_faq(faq_id):
    """Return one FAQ by number (1 to 50), or None."""
    for f in FAQS:
        if f["id"] == int(faq_id):
            return dict(f)
    return None


def by_category(category):
    """Return all FAQs in a category."""
    return [dict(f) for f in FAQS if f["category"] == category]


def to_jsonld(faqs):
    """FAQPage JSON-LD for a list of FAQs."""
    return json.dumps({"@context": "https://schema.org", "@type": "FAQPage",
                       "mainEntity": [{"@type": "Question", "name": f["question"],
                                       "acceptedAnswer": {"@type": "Answer", "text": f["answer"]}} for f in faqs]},
                      indent=2, ensure_ascii=False)


def export(fmt="markdown", category=None):
    """Generate the FAQ (all or one category) as markdown, json, jsonld or html."""
    faqs = by_category(category) if category else [dict(f) for f in FAQS]
    title = "NFT Press Release FAQ"
    if fmt == "json":
        return json.dumps([{"question": f["question"], "answer": f["answer"]} for f in faqs], indent=2, ensure_ascii=False) + "\n"
    if fmt == "jsonld":
        return to_jsonld(faqs) + "\n"
    if fmt == "html":
        items = "\n".join(f"  <h3>{html.escape(f['question'])}</h3>\n  <p>{html.escape(f['answer'])}</p>" for f in faqs)
        return (f"<section class=\"nftpr-faq\">\n  <h2>{html.escape(title)}</h2>\n{items}\n</section>\n"
                f"<script type=\"application/ld+json\">\n{to_jsonld(faqs)}\n</script>\n")
    lines = [f"# {title}", ""]
    for f in faqs:
        lines += [f"## {f['id']}. {f['question']}", "", f["answer"], ""]
    lines.append(f"*Generated by the NFT Press Release FAQ Generator. Learn more: {SERVICE_PAGE}*")
    return "\n".join(lines) + "\n"


USAGE = __doc__


def main(argv=None):
    args = sys.argv[1:] if argv is None else list(argv)
    if not args or args[0] in ("-h", "--help"):
        print(USAGE)
        return 0
    if args[0] == "--version":
        print(__version__)
        return 0
    if args[0] == "--categories":
        for c, d in CATEGORIES.items():
            print(f"{c:18} {len(by_category(c)):>2}  {d}")
        return 0
    if args[0] == "--list":
        items = by_category(args[1]) if len(args) > 1 else FAQS
        if not items:
            print("Unknown category. Try --categories")
            return 1
        for f in items:
            print(f"{f['id']:>2}. {f['question']}")
        return 0
    if args[0] == "--id":
        f = get_faq(args[1]) if len(args) > 1 and args[1].isdigit() else None
        if not f:
            print("FAQ number must be 1 to 50")
            return 1
        print(f"Q{f['id']}. {f['question']}\n{f['answer']}")
        return 0
    if args[0] == "--export":
        fmt = args[1] if len(args) > 1 else "markdown"
        cat = args[2] if len(args) > 2 else None
        if fmt not in ("markdown", "json", "jsonld", "html") or (cat and cat not in CATEGORIES):
            print("Use: --export markdown|json|jsonld|html [category]")
            return 1
        sys.stdout.write(export(fmt, cat))
        return 0

    as_json = False
    top = 1
    if args[0] == "--json":
        as_json, args = True, args[1:]
    if args and args[0] == "--top":
        top, args = int(args[1]), args[2:]
    query = " ".join(args)
    results = search(query, top)

    if as_json:
        print(json.dumps({"query": query, "results": results}, indent=2, ensure_ascii=False))
        return 0 if results else 1
    if not results:
        print("No matching FAQ found. Try --list to browse all 50 questions,")
        print(f"or contact support: https://buycryptopressrelease.com/contact/")
        return 1
    for r in results:
        print(f"Q{r['id']}. {r['question']}  [{r['category']}]")
        print(f"   {r['answer']}")
        print(f"   Confidence: {r['confidence']}/100 ({r['band']})\n")
    print(f"NFT Press Release FAQ Generator v{__version__}  |  {SERVICE_PAGE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
