export type AuditCategory = 'security' | 'performance' | 'seo' | 'architecture';
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface AuditFinding {
  id: string;
  title: string;
  category: AuditCategory;
  severity: SeverityLevel;
  file: string;
  lines: string;
  summary: string;
  liveHostingRisk: string;
  vulnerableSnippet: string;
  remediatedSnippet: string;
  remediationSteps: string[];
  postAuditVerification: string;
}

export interface RepoFileInventory {
  path: string;
  sizeBytes: number;
  afterSizeBytes: number;
  purpose: string;
  status: 'needs-fix' | 'remove-from-webroot' | 'clean';
  postAuditStatus: 'verified-clean' | 'isolated-blocked';
  issueCount: number;
  notes: string;
  postAuditNotes: string;
}

export const REPO_INVENTORY: RepoFileInventory[] = [
  {
    path: 'vercel.json + .vercelignore',
    sizeBytes: 0,
    afterSizeBytes: 1375,
    purpose: 'Production security headers, CSP & non-webroot isolation',
    status: 'needs-fix',
    postAuditStatus: 'verified-clean',
    issueCount: 0,
    notes: 'Previously missing; left site without CSP/X-Frame-Options and exposed /os, /assignment-portal, /sm-tailoring, and /*.md.',
    postAuditNotes: 'RE-AUDIT PASS: Enforces CSP, X-Frame-Options: DENY, nosniff, Referrer-Policy, Cache-Control: no-store on /api/*, and 404 rewrites for non-production paths.'
  },
  {
    path: 'index.html',
    sizeBytes: 14062,
    afterSizeBytes: 18407,
    purpose: 'Primary SM Tailoring landing page',
    status: 'needs-fix',
    postAuditStatus: 'verified-clean',
    issueCount: 6,
    notes: 'Render-blocking loader overlay, missing og:image/og:url/twitter tags, incomplete LocalBusiness JSON-LD, missing defer on script.js, decorative CSS backgrounds instead of lazy <img>.',
    postAuditNotes: 'RE-AUDIT PASS: Validated LocalBusiness+Tailor JSON-LD (PIN 515671, Geo 14.4144, 77.7215, OfferCatalog), og:image (1200x630), 6 semantic <img loading="lazy"> cards, <noscript> fallback, and deferred script.'
  },
  {
    path: 'style.css',
    sizeBytes: 30810,
    afterSizeBytes: 18549,
    purpose: 'Main stylesheet (consolidated from 3 layers into 1)',
    status: 'needs-fix',
    postAuditStatus: 'verified-clean',
    issueCount: 5,
    notes: 'Contained 3 stacked theme layers (~40% overridden CSS), broken url("assets/hero.jpg") 404, tablet nav bug hiding links at 601-900px, and duplicate Pexels background downloads.',
    postAuditNotes: 'RE-AUDIT PASS: Reduced by 39.8% (18,549 B), 0 dead rules, 0 broken asset URLs, unified 900px mobile/tablet navigation drawer, and compositor-only cursor-glow transforms.'
  },
  {
    path: 'script.js',
    sizeBytes: 5264,
    afterSizeBytes: 4215,
    purpose: 'Frontend interactions & thread canvas animation',
    status: 'needs-fix',
    postAuditStatus: 'verified-clean',
    issueCount: 4,
    notes: 'Unpaused O(N^2) requestAnimationFrame canvas loop, layout-thrashing left/top cursor updates, synchronous getBoundingClientRect() in pointermove, and 500ms artificial loader delay.',
    postAuditNotes: 'RE-AUDIT PASS: Passes node --check syntax check; dismisses loader on DOMContentLoaded; pauses canvas via IntersectionObserver & visibilitychange; uses squared distance math.'
  },
  {
    path: 'api/chat.js',
    sizeBytes: 6149,
    afterSizeBytes: 7045,
    purpose: 'Serverless multi-provider AI tailoring assistant API',
    status: 'needs-fix',
    postAuditStatus: 'verified-clean',
    issueCount: 4,
    notes: 'No IP rate limiting, no Origin/CSRF validation, leaked env var names on 503 and internal provider telemetry on 200, unguarded JSON.parse(req.body) threw 500 on malformed JSON.',
    postAuditNotes: 'RE-AUDIT PASS: Passes node --check; enforces 10 req/60s IP rate limit (HTTP 429 + Retry-After), Origin verification, safeParseBody() (HTTP 400), and zero secret/env name leakage.'
  },
  {
    path: 'api/creative-brief.js',
    sizeBytes: 3836,
    afterSizeBytes: 5631,
    purpose: 'Serverless marketing campaign generator API',
    status: 'needs-fix',
    postAuditStatus: 'verified-clean',
    issueCount: 4,
    notes: 'Unauthenticated & unthrottled endpoint, no allowlist validation on dropdown fields enabling prompt injection, unguarded JSON.parse, no Origin check.',
    postAuditNotes: 'RE-AUDIT PASS: Passes node --check; validates service/audience/platform/language/tone against Set allowlists; wraps idea in <campaign_idea> XML tags; enforces 5 req/60s IP rate limit.'
  },
  {
    path: 'api/ai-health.js',
    sizeBytes: 972,
    afterSizeBytes: 500,
    purpose: 'Diagnostic endpoint reporting assistant readiness',
    status: 'needs-fix',
    postAuditStatus: 'verified-clean',
    issueCount: 2,
    notes: 'Publicly disclosed which upstream LLM providers and models were active in production without authentication.',
    postAuditNotes: 'RE-AUDIT PASS: Passes node --check; redacts internal provider/model enumeration and returns only boolean status ("online" | "maintenance") with Cache-Control: no-store.'
  },
  {
    path: 'ai-assistant.html',
    sizeBytes: 9136,
    afterSizeBytes: 6840,
    purpose: 'Customer-facing AI tailoring assistant UI',
    status: 'needs-fix',
    postAuditStatus: 'verified-clean',
    issueCount: 3,
    notes: 'Missing canonical/OG tags, hardcoded "Powered by Qwen3 235B" even when OpenRouter/NVIDIA answered, missing favicon & theme-color.',
    postAuditNotes: 'RE-AUDIT PASS: Includes canonical URL, OpenGraph/Twitter tags, favicon.svg, #4b0d20 theme-color, accurate "SM Tailoring Smart Guide" attribution, and graceful 429 fallback.'
  },
  {
    path: 'creative-studio.html',
    sizeBytes: 6984,
    afterSizeBytes: 4980,
    purpose: 'Internal marketing brief generator UI',
    status: 'needs-fix',
    postAuditStatus: 'verified-clean',
    issueCount: 2,
    notes: 'Publicly linked in main navbar despite being an internal marketing tool for the shop owner; lacked noindex.',
    postAuditNotes: 'RE-AUDIT PASS: Removed from public customer navbar and protected from search indexing with <meta name="robots" content="noindex, nofollow">.'
  },
  {
    path: '404.html',
    sizeBytes: 685,
    afterSizeBytes: 790,
    purpose: 'Custom 404 error page',
    status: 'needs-fix',
    postAuditStatus: 'verified-clean',
    issueCount: 1,
    notes: 'Missing <meta name="robots" content="noindex"> and theme-color.',
    postAuditNotes: 'RE-AUDIT PASS: Added <meta name="robots" content="noindex">, type="image/svg+xml" on favicon, and #4b0d20 theme-color.'
  },
  {
    path: 'sitemap.xml',
    sizeBytes: 232,
    afterSizeBytes: 455,
    purpose: 'Search engine XML sitemap',
    status: 'needs-fix',
    postAuditStatus: 'verified-clean',
    issueCount: 2,
    notes: 'Single-line XML missing <lastmod>, <changefreq>, and <priority> attributes.',
    postAuditNotes: 'RE-AUDIT PASS: Well-formed XML with <lastmod>2026-10-23</lastmod>, <changefreq>, and <priority> for / (1.0) and /ai-assistant.html (0.8).'
  },
  {
    path: 'robots.txt',
    sizeBytes: 76,
    afterSizeBytes: 194,
    purpose: 'Crawler directives',
    status: 'needs-fix',
    postAuditStatus: 'verified-clean',
    issueCount: 2,
    notes: 'Allowed indexing of /api/, /assignment-portal/, /sm-tailoring/, /os/, and internal tools.',
    postAuditNotes: 'RE-AUDIT PASS: Explicitly disallows /api/, /sm-tailoring/, /assignment-portal/, /os/, and /creative-studio.html while pointing crawlers to sitemap.xml.'
  },
  {
    path: 'manifest.webmanifest',
    sizeBytes: 273,
    afterSizeBytes: 476,
    purpose: 'Web App Manifest',
    status: 'needs-fix',
    postAuditStatus: 'verified-clean',
    issueCount: 1,
    notes: 'Theme color #5c2030 mismatched index.html (#5b1f32) and luxury CSS (#4b0d20).',
    postAuditNotes: 'RE-AUDIT PASS: Valid JSON synchronized to theme_color #4b0d20, background_color #fff8f2, and purpose "any maskable".'
  },
  {
    path: 'assignment-portal/index.html',
    sizeBytes: 17599,
    afterSizeBytes: 0,
    purpose: 'Unrelated "AssignFlow" college portal demo',
    status: 'remove-from-webroot',
    postAuditStatus: 'isolated-blocked',
    issueCount: 4,
    notes: 'Unrelated project served on live domain; contained DOM XSS in role/marks rendering, hardcoded plaintext credentials, and 4MB base64 PDF localStorage quota crash.',
    postAuditNotes: 'RE-AUDIT PASS: Removed from webroot deployment via .vercelignore and blocked with 404 rewrite in vercel.json so it cannot execute on the SM Tailoring origin.'
  },
  {
    path: 'sm-tailoring/* & os/* & /*.md',
    sizeBytes: 112187,
    afterSizeBytes: 0,
    purpose: 'Legacy duplicate site, C/ARM64 OS kernel & internal notes',
    status: 'remove-from-webroot',
    postAuditStatus: 'isolated-blocked',
    issueCount: 4,
    notes: 'Duplicate website at /sm-tailoring/ diluted SEO; 28 C/Assembly files in /os/ and 4 internal .md docs were publicly downloadable.',
    postAuditNotes: 'RE-AUDIT PASS: Excluded via .vercelignore and blocked via vercel.json rewrites (112 KB of non-production files removed from public webroot).'
  }
];

export const AUDIT_FINDINGS: AuditFinding[] = [
  {
    id: 'SEC-01',
    title: 'Unprotected Serverless AI Endpoints Enable Quota Drain & Wallet Exhaustion',
    category: 'security',
    severity: 'critical',
    file: 'api/chat.js & api/creative-brief.js',
    lines: '123–179, 37–56',
    summary: 'Both /api/chat and /api/creative-brief accepted arbitrary POST requests with zero IP rate limiting, no Origin/Referer verification, and unguarded JSON.parse(req.body).',
    liveHostingRisk: 'Automated scrapers or malicious actors could call /api/chat and /api/creative-brief in a loop, exhausting OpenRouter, NVIDIA NIM, LLM7, and Vercel AI Gateway quotas.',
    vulnerableSnippet: `export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});`,
    remediatedSnippet: `export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isAllowedOrigin(req)) return res.status(403).json({ error: "Forbidden origin" });

  const clientIp = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  if (!checkRateLimit(clientIp)) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ error: "Too many questions in a short time. Please wait a minute or continue on WhatsApp." });
  }

  const body = safeParseBody(req.body);
  if (!body) return res.status(400).json({ error: "Malformed JSON payload." });`,
    remediationSteps: [
      'Enforced per-IP sliding window rate limiting (10 req/min on /api/chat, 5 req/min on /api/creative-brief) with HTTP 429 and Retry-After headers.',
      'Validated the HTTP Origin header against PUBLIC_APP_URL so external websites cannot piggyback on the API.',
      'Replaced unguarded JSON.parse with safeParseBody() returning HTTP 400 Bad Request on malformed JSON.'
    ],
    postAuditVerification: 'VERIFIED FIXED: node --check passed on api/chat.js and api/creative-brief.js; rate limiter, Origin gate, and safeParseBody active.'
  },
  {
    id: 'SEC-02',
    title: 'Prompt Injection & Arbitrary LLM Proxy Abuse in Creative Brief API',
    category: 'security',
    severity: 'high',
    file: 'api/creative-brief.js',
    lines: '40–53',
    summary: 'Dropdown parameters (service, audience, platform, language, tone) were not validated against an allowlist and were interpolated directly into the user prompt.',
    liveHostingRisk: 'Attackers could pass arbitrary instructions in the "service" or "idea" fields to use the endpoint as a free general-purpose LLM proxy.',
    vulnerableSnippet: `const fields=["service","audience","platform","language","tone","idea"];
const brief=Object.fromEntries(fields.map(k=>[k,String(body[k]||"").trim().slice(0,700)]));
if(!brief.service)return res.status(400).json({error:"Service is required."});`,
    remediatedSnippet: `const ALLOWED_SERVICES = new Set([
  "Custom blouse stitching", "Blouse alterations", "Women's tailoring",
  "Dress stitching", "Embroidery", "Custom fitting"
]);
if (!ALLOWED_SERVICES.has(service)) {
  return res.status(400).json({ error: "Please select a valid SM Tailoring service." });
}
const idea = String(body.idea || "").replace(/[<>]/g, "").trim().slice(0, 500);`,
    remediationSteps: [
      'Validated service, audience, platform, language, and tone against strict server-side Set allowlists.',
      'Stripped angle brackets from idea and wrapped it in <campaign_idea>...</campaign_idea> XML delimiters.'
    ],
    postAuditVerification: 'VERIFIED FIXED: All 5 dropdown parameters enforced via Set.has() allowlists and free-text idea sanitized and XML-delimited.'
  },
  {
    id: 'SEC-03',
    title: 'Public Exposure of Unrelated Subprojects, Internal Docs & C Kernel Source',
    category: 'architecture',
    severity: 'critical',
    file: 'vercel.json & .vercelignore',
    lines: 'All root directories',
    summary: 'Deploying the raw repo exposed internal markdown notes, an old duplicate site (/sm-tailoring/), a college assignment app (/assignment-portal/), and 28 C/ARM64 kernel files (/os/).',
    liveHostingRisk: 'Visitors and crawlers could download AI-PROVIDERS-MASTER-NOTE.md, index duplicate /sm-tailoring/, and access vulnerable demo code on the live domain.',
    vulnerableSnippet: `# Previously missing vercel.json and .vercelignore
# Exposed: /AI-PROVIDERS-MASTER-NOTE.md, /os/*, /assignment-portal/*, /sm-tailoring/*`,
    remediatedSnippet: `// .vercelignore
os/
assignment-portal/
sm-tailoring/
*.md
.github/
// + vercel.json rewrites to /404.html`,
    remediationSteps: [
      'Created .vercelignore excluding os/, assignment-portal/, sm-tailoring/, and *.md from deployments.',
      'Added vercel.json rewrite rules routing any requests for /(os|assignment-portal|sm-tailoring) or /*.md to /404.html.'
    ],
    postAuditVerification: 'VERIFIED FIXED: 112 KB of non-webroot files excluded via .vercelignore and blocked via vercel.json rewrite rules.'
  },
  {
    id: 'SEC-04',
    title: 'Information Disclosure in /api/ai-health.js & Error Responses',
    category: 'security',
    severity: 'medium',
    file: 'api/ai-health.js & api/chat.js',
    lines: 'ai-health.js:11–24, chat.js:147–149',
    summary: '/api/ai-health publicly enumerated which API keys and models were configured, and /api/chat leaked exact environment variable names in 503 responses.',
    liveHostingRisk: 'Attackers probing the live website could query /api/ai-health to fingerprint active backend LLM providers.',
    vulnerableSnippet: `return res.status(200).json({
  service: "SM Tailoring AI Gateway",
  status: configured.length ? "configured" : "not_configured",
  providers: configured,
  free_first: true
});`,
    remediatedSnippet: `export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const isConfigured = PROVIDER_KEYS.some(key => Boolean(process.env[key]));
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    service: "SM Tailoring Assistant",
    status: isConfigured ? "online" : "maintenance"
  });
}`,
    remediationSteps: [
      'Redacted provider names and model IDs from /api/ai-health public output.',
      'Removed environment variable names from client-facing 503 error responses in api/chat.js.'
    ],
    postAuditVerification: 'VERIFIED FIXED: /api/ai-health returns only high-level online/maintenance status with Cache-Control: no-store.'
  },
  {
    id: 'SEC-05',
    title: 'DOM XSS, Plaintext Passwords & Storage DoS in /assignment-portal/index.html',
    category: 'security',
    severity: 'high',
    file: 'assignment-portal/index.html',
    lines: '19–42',
    summary: 'User roles, grading marks, and IDs were concatenated into document.body.innerHTML without escaping; demo credentials were hardcoded in plaintext; 4MB PDFs overflowed localStorage.',
    liveHostingRisk: 'Same-origin DOM XSS inside /assignment-portal/ compromised the main SM Tailoring domain.',
    vulnerableSnippet: `'<div style="color:#68738a;text-transform:capitalize">'+u.role+'</div>'`,
    remediatedSnippet: `// Isolated and removed from SM Tailoring webroot via .vercelignore and vercel.json:
{
  "source": "/(os|assignment-portal|sm-tailoring)(/.*)?",
  "destination": "/404.html"
}`,
    remediationSteps: [
      'Removed /assignment-portal/ from the SM Tailoring webroot deployment and blocked the path in vercel.json and robots.txt.'
    ],
    postAuditVerification: 'VERIFIED FIXED: /assignment-portal/ is completely isolated and excluded from the production webroot.'
  },
  {
    id: 'SEC-06',
    title: 'Missing Content-Security-Policy (CSP) & HTTP Security Headers',
    category: 'security',
    severity: 'medium',
    file: 'vercel.json',
    lines: '18–45',
    summary: 'The live site served HTML pages without Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy headers.',
    liveHostingRisk: 'Without X-Frame-Options: DENY or frame-ancestors CSP, third-party sites could embed SM Tailoring inside an iframe for clickjacking.',
    vulnerableSnippet: `# No security headers configured in repository`,
    remediatedSnippet: `{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; img-src 'self' data: https://images.pexels.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
}`,
    remediationSteps: [
      'Added vercel.json with 5 global HTTP security headers (CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy).'
    ],
    postAuditVerification: 'VERIFIED FIXED: vercel.json parsed and validated with all 5 security headers and /api/* no-store cache policy.'
  },
  {
    id: 'PERF-01',
    title: 'Full-Screen Page Loader Blocks Largest Contentful Paint (LCP) for Seconds',
    category: 'performance',
    severity: 'critical',
    file: 'index.html & script.js',
    lines: 'index.html:34, script.js:6–16',
    summary: '.page-loader covered the entire viewport until window "load" fired plus an extra 500ms setTimeout.',
    liveHostingRisk: 'On mobile networks, waiting for all external images before firing window "load" + 500ms delayed LCP by 3–6 seconds.',
    vulnerableSnippet: `window.addEventListener('load',()=>{
  document.body.classList.remove('loading');
  window.setTimeout(()=>$('.page-loader')?.classList.add('done'),500)
},{once:true});`,
    remediatedSnippet: `const dismissLoader = () => {
  document.body.classList.remove('loading');
  $('.page-loader')?.classList.add('done');
};
if (document.readyState !== 'loading') {
  requestAnimationFrame(dismissLoader);
} else {
  document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(dismissLoader), { once: true });
}
window.setTimeout(dismissLoader, 600);`,
    remediationSteps: [
      'Dismissed .page-loader immediately on DOMContentLoaded with a hard 600ms fallback ceiling.',
      'Added <noscript><style>.page-loader{display:none!important}</style></noscript> and <script src="script.js" defer></script>.'
    ],
    postAuditVerification: 'VERIFIED FIXED: Loader dismisses on DOMContentLoaded without waiting for external photography; <noscript> fallback present.'
  },
  {
    id: 'PERF-02',
    title: 'Never-Pausing O(N²) Canvas Animation Loop Drains Mobile Battery & CPU',
    category: 'performance',
    severity: 'high',
    file: 'script.js',
    lines: '63–128',
    summary: '#thread-canvas ran a 60fps requestAnimationFrame loop calculating O(N²) Math.hypot distances forever, even when scrolled out of view.',
    liveHostingRisk: 'Continuous background canvas rendering caused scroll jank and battery drain on mobile devices.',
    vulnerableSnippet: `for(let j=i+1;j<points.length;j++){
  const q=points[j];const dist=Math.hypot(p.x-q.x,p.y-q.y);
  if(dist<190){...}
}
requestAnimationFrame(draw);`,
    remediatedSnippet: `new IntersectionObserver(([entry]) => {
  isVisible = entry.isIntersecting;
  if (isVisible && !rafId) rafId = requestAnimationFrame(draw);
}).observe(canvas);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && isVisible && !rafId) rafId = requestAnimationFrame(draw);
});`,
    remediationSteps: [
      'Paused requestAnimationFrame via IntersectionObserver when the hero scrolls out of view and via visibilitychange when the tab is hidden.',
      'Replaced Math.hypot() with a squared-distance check (dx*dx + dy*dy < MAX_DIST_SQ).'
    ],
    postAuditVerification: 'VERIFIED FIXED: Canvas animation loop automatically halts when offscreen or tab-hidden.'
  },
  {
    id: 'PERF-03',
    title: 'Eager CSS Background Images Prevent Lazy Loading & Cause Duplicate Downloads',
    category: 'performance',
    severity: 'high',
    file: 'index.html & style.css',
    lines: 'index.html:142–167, style.css:185',
    summary: '6 service card images were loaded eagerly via CSS :before background-image, 2 duplicated the hero photos with different query params, and assets/hero.jpg returned 404.',
    liveHostingRisk: 'Browsers downloaded all 8 Pexels photos eagerly on initial load and logged a 404 for assets/hero.jpg.',
    vulnerableSnippet: `.hero-backdrop{background:...,url('assets/hero.jpg') center/cover no-repeat;}
.service-card:nth-child(6):before{background-image:url('...pexels-photo-6461158.jpeg?auto=compress&cs=tinysrgb&w=900')}`,
    remediatedSnippet: `<article class="service-card reveal" data-tilt>
  <img class="service-card-media" src="https://images.pexels.com/photos/5830689/pexels-photo-5830689.jpeg?auto=compress&cs=tinysrgb&w=600" alt="Custom blouse stitching and fabric measurement" width="600" height="380" loading="lazy" decoding="async">
  <span class="service-no">01</span><h3>Custom Blouse</h3>
  ...
</article>`,
    remediationSteps: [
      'Removed the broken assets/hero.jpg CSS rule and all 6 .service-card:nth-child(n):before background rules.',
      'Added semantic <img class="service-card-media" loading="lazy" decoding="async" width="600" height="380" alt="..."> elements with unique Pexels images.'
    ],
    postAuditVerification: 'VERIFIED FIXED: All 6 service cards use native lazy-loaded <img> elements with explicit width/height and descriptive alt attributes.'
  },
  {
    id: 'PERF-04',
    title: '30.8 KB Stylesheet Contained 3 Stacked Theme Overrides & Broken Tablet Nav',
    category: 'performance',
    severity: 'medium',
    file: 'style.css',
    lines: '1–215',
    summary: 'style.css concatenated 3 separate design layers and hid nav links 3, 4, and 5 at max-width:900px while only showing the hamburger toggle at 700px.',
    liveHostingRisk: 'Tablet visitors (601px–900px) could not see or open links to AI Assistant or About.',
    vulnerableSnippet: `@media(max-width:900px){
  .nav a:nth-child(3),.nav a:nth-child(4),.nav a:nth-child(5){display:none}
}`,
    remediatedSnippet: `@media (max-width: 900px) {
  .site-header { padding: 14px 5%; flex-wrap: wrap; }
  .menu-toggle { display: block; }
  .nav { display: none; width: 100%; flex-direction: column; align-items: stretch; gap: 0; padding: 12px 0 6px; }
  .nav.open { display: flex; }
}`,
    remediationSteps: [
      'Consolidated the 3 CSS layers into a single 18.5 KB stylesheet (saving 39.8% / 12.2 KB).',
      'Unified the mobile/tablet menu toggle breakpoint at 900px so no links disappear without a toggle button.'
    ],
    postAuditVerification: 'VERIFIED FIXED: Stylesheet reduced from 30,810 B to 18,549 B; tablet navigation drawer functions across all viewports <= 900px.'
  },
  {
    id: 'PERF-05',
    title: 'Pointermove Layout Thrashing on Cursor Glow & Scroll Progress Bar',
    category: 'performance',
    severity: 'medium',
    file: 'script.js & style.css',
    lines: 'script.js:32–58',
    summary: '.cursor-glow mutated style.left and style.top on every pointermove event, and .scroll-progress mutated style.width on every scroll event.',
    liveHostingRisk: 'Triggered synchronous layout & paint recalculations on every pointer and scroll tick.',
    vulnerableSnippet: `if(glow){glow.style.left=\`\${event.clientX}px\`;glow.style.top=\`\${event.clientY}px\`}`,
    remediatedSnippet: `if (glow) {
  glow.style.transform = \`translate3d(\${event.clientX - 180}px, \${event.clientY - 180}px, 0)\`;
}
if (bar) bar.style.transform = \`scaleX(\${max > 0 ? current / max : 0})\`;`,
    remediationSteps: [
      'Switched .cursor-glow to translate3d() and .scroll-progress i to scaleX() inside a requestAnimationFrame-throttled scroll listener.'
    ],
    postAuditVerification: 'VERIFIED FIXED: Only compositor-accelerated transform properties are updated on scroll and pointermove.'
  },
  {
    id: 'SEO-01',
    title: 'Missing OpenGraph Image (og:image), Canonical URLs & Twitter Cards',
    category: 'seo',
    severity: 'high',
    file: 'index.html & ai-assistant.html',
    lines: 'index.html:10–23, ai-assistant.html:8–16',
    summary: 'index.html lacked og:image, og:url, og:locale, and twitter:card tags; ai-assistant.html lacked canonical and OG tags.',
    liveHostingRisk: 'Sharing links on WhatsApp, Instagram, or X rendered plain URLs with no visual preview card.',
    vulnerableSnippet: `<meta property="og:title" content="SM Tailoring — Made for You">
<meta property="og:description" content="Custom tailoring and blouse stitching by Sivamma in Dharmavaram.">`,
    remediatedSnippet: `<meta property="og:url" content="https://sm-tailoring.vercel.app/">
<meta property="og:locale" content="en_IN">
<meta property="og:image" content="https://images.pexels.com/photos/6461151/pexels-photo-6461151.jpeg?auto=compress&cs=tinysrgb&w=1200">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">`,
    remediationSteps: [
      'Added full OpenGraph and Twitter Summary Large Image tags to index.html and ai-assistant.html.',
      'Added <meta name="robots" content="noindex, nofollow"> to creative-studio.html and 404.html.'
    ],
    postAuditVerification: 'VERIFIED FIXED: Both customer-facing pages include canonical links, og:image (1200x630), og:locale="en_IN", and twitter:card.'
  },
  {
    id: 'SEO-02',
    title: 'Incomplete LocalBusiness Schema.org Structured Data for Local Pack Ranking',
    category: 'seo',
    severity: 'high',
    file: 'index.html',
    lines: '30–81',
    summary: 'The JSON-LD LocalBusiness block omitted postalCode (515671), GeoCoordinates, openingHoursSpecification, priceRange, and OfferCatalog.',
    liveHostingRisk: 'Weakened local search visibility for "blouse tailoring in Dharmavaram" on Google Search and Maps.',
    vulnerableSnippet: `"address":{"@type":"PostalAddress","streetAddress":"PRT Street","addressLocality":"Dharmavaram","addressRegion":"Andhra Pradesh","addressCountry":"IN"}`,
    remediatedSnippet: `"@type": ["LocalBusiness", "Tailor"],
"postalCode": "515671",
"geo": { "@type": "GeoCoordinates", "latitude": 14.4144, "longitude": 77.7215 },
"openingHoursSpecification": [{ "@type": "OpeningHoursSpecification", "opens": "09:30", "closes": "20:00" }]`,
    remediationSteps: [
      'Upgraded JSON-LD schema to ["LocalBusiness", "Tailor"] with postalCode 515671, GeoCoordinates, openingHoursSpecification, image, priceRange, and a 6-item OfferCatalog.'
    ],
    postAuditVerification: 'VERIFIED FIXED: JSON.parse verified valid JSON-LD schema with all LocalBusiness and Tailor fields.'
  },
  {
    id: 'SEO-03',
    title: 'Inaccurate Model Attribution & Duplicate Content in Sitemap / Robots.txt',
    category: 'seo',
    severity: 'medium',
    file: 'ai-assistant.html, robots.txt, sitemap.xml',
    lines: 'robots.txt:1–8, sitemap.xml:1–14',
    summary: 'ai-assistant.html hardcoded "Powered by Qwen3 235B"; robots.txt allowed indexing of /sm-tailoring/ and /assignment-portal/; sitemap.xml lacked lastmod.',
    liveHostingRisk: 'Duplicate indexing of /sm-tailoring/index.html split domain authority.',
    vulnerableSnippet: `User-agent: *
Allow: /
Sitemap: https://sm-tailoring.vercel.app/sitemap.xml`,
    remediatedSnippet: `User-agent: *
Allow: /
Disallow: /api/
Disallow: /sm-tailoring/
Disallow: /assignment-portal/
Disallow: /os/
Disallow: /creative-studio.html`,
    remediationSteps: [
      'Updated robots.txt with explicit Disallow directives for non-public paths.',
      'Formatted sitemap.xml with <lastmod>2026-10-23</lastmod>, <changefreq>, and <priority>.',
      'Updated ai-assistant.html header badge to "SM Tailoring Smart Guide".'
    ],
    postAuditVerification: 'VERIFIED FIXED: robots.txt, sitemap.xml, and ai-assistant.html re-audited with 0 duplicate content or attribution issues.'
  }
];
