import { getCollection, type CollectionEntry } from 'astro:content';
import * as db from './db';
import type { ListOptions, Pattern, PatternCard } from './db';

/**
 * One view over both pattern sources:
 * - D1 (written from /admin)
 * - Markdown files in src/content/patterns (committed by ContentOps)
 * Sorted together by publish date. When a slug exists in both, the file wins.
 * Drafts (draft: true) are never returned.
 */

export interface FullPattern extends Pattern {
  source: 'd1' | 'file';
  gauge?: string;
  yardage?: string;
  sizes?: string[];
  stitches?: string[];
  colors?: string[];
  tags?: string[];
  featured?: boolean;
  seo_title?: string;
  seo_description?: string;
}

type FileEntry = CollectionEntry<'patterns'>;

// ContentOps difficulty values → the site's own values. Categories already
// arrive as this site's slugs (see src/content.config.ts).
const DIFFICULTY_MAP: Record<string, string> = {
  beginner: 'Beginner',
  easy: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/** Same "YYYY-MM-DD HH:MM:SS" (UTC) format D1 stores, so both sources sort and format alike. */
function toDbDate(d: Date) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function fromFile(entry: FileEntry): FullPattern {
  const d = entry.data;
  const date = toDbDate(d.publishDate);
  return {
    id: 0,
    source: 'file',
    slug: entry.id,
    title: d.title,
    excerpt: d.excerpt,
    category: d.category,
    difficulty: DIFFICULTY_MAP[d.difficulty] ?? d.difficulty,
    image: d.cover,
    image_alt: d.title,
    yarn_weight: d.yarnWeight,
    hook_size: d.hook,
    time_needed: d.time ?? '',
    materials: d.materials.join('\n'),
    content: entry.body ?? '',
    published: 1,
    published_at: date,
    updated_at: date,
    gauge: d.gauge,
    yardage: d.yardage,
    sizes: d.sizes,
    stitches: d.stitches,
    colors: d.colors,
    tags: d.tags,
    featured: d.featured,
    seo_title: d.seoTitle,
    seo_description: d.seoDescription,
  };
}

function toCard(p: FullPattern): PatternCard {
  const { slug, title, excerpt, category, difficulty, image, image_alt, published_at } = p;
  return { slug, title, excerpt, category, difficulty, image, image_alt, published_at };
}

let fileCache: FullPattern[] | undefined;

/** Published (non-draft) file patterns, newest first. Static per deploy, so computed once. */
export async function getFilePatterns() {
  if (!fileCache) {
    const entries = await getCollection('patterns', (e) => !e.data.draft);
    fileCache = entries.map(fromFile).sort(byNewest);
  }
  return fileCache;
}

function byNewest(a: { published_at: string }, b: { published_at: string }) {
  return a.published_at < b.published_at ? 1 : a.published_at > b.published_at ? -1 : 0;
}

function matches(p: FullPattern, q: string) {
  const needle = q.toLowerCase();
  return [p.title, p.excerpt, ...(p.tags ?? [])].some((s) => s.toLowerCase().includes(needle));
}

/** Every published D1 card matching the filter (D1 caches this in KV). */
async function allD1Cards(env: Env, opts: Pick<ListOptions, 'category' | 'q'>) {
  const res = await db.listPatterns(env, { ...opts, page: 1, perPage: 10000 });
  return res.items;
}

/** Merged cards for a filter, newest first, file versions replacing D1 duplicates. */
async function mergedCards(env: Env, opts: Pick<ListOptions, 'category' | 'q'> = {}) {
  const q = opts.q?.trim().slice(0, 80) ?? '';
  const [files, d1] = await Promise.all([getFilePatterns(), allD1Cards(env, { category: opts.category, q })]);
  const fileSlugs = new Set(files.map((f) => f.slug));
  const fileCards = files
    .filter((f) => (!opts.category || f.category === opts.category) && (!q || matches(f, q)))
    .map(toCard);
  return [...fileCards, ...d1.filter((c) => !fileSlugs.has(c.slug))].sort(byNewest);
}

export async function listPatterns(env: Env, opts: ListOptions = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const perPage = opts.perPage ?? 12;
  const all = await mergedCards(env, opts);
  return {
    items: all.slice((page - 1) * perPage, page * perPage),
    total: all.length,
    page,
    pages: Math.max(1, Math.ceil(all.length / perPage)),
  };
}

export async function getPattern(env: Env, slug: string): Promise<FullPattern | null> {
  const file = (await getFilePatterns()).find((p) => p.slug === slug);
  if (file) return file;
  const row = await db.getPattern(env, slug);
  return row ? { ...row, source: 'd1' } : null;
}

export async function getRelated(env: Env, category: string, excludeSlug: string, limit = 3) {
  const all = await mergedCards(env, { category });
  return all.filter((c) => c.slug !== excludeSlug).slice(0, limit);
}

export async function getCategoryCounts(env: Env) {
  const counts: Record<string, number> = {};
  for (const c of await mergedCards(env)) counts[c.category] = (counts[c.category] ?? 0) + 1;
  return counts;
}

/** Sitemap: every published slug with its last-modified date. */
export async function listForSitemap(env: Env) {
  const [files, d1] = await Promise.all([getFilePatterns(), db.listAllForAdmin(env)]);
  const fileSlugs = new Set(files.map((f) => f.slug));
  return [
    ...files.map((f) => ({ slug: f.slug, updated_at: f.updated_at, published_at: f.published_at })),
    ...d1.filter((r) => r.published === 1 && !fileSlugs.has(r.slug)),
  ].sort(byNewest);
}
