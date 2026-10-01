import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Patterns published by ContentOps ("Astro/Git" mode): it commits
 * src/content/patterns/<slug>.md plus public/images/patterns/<slug>.jpg.
 * The frontmatter shape is fixed on the ContentOps side — keep this schema in sync with it.
 * Files are read at build time and bundled into the worker (no fs at runtime).
 */
const patterns = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/patterns' }),
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    // This site's own category slugs (src/lib/site.ts). ContentOps sends these
    // values for stitchandcrochet.com directly, so they need no mapping.
    category: z.enum(['blankets', 'hats-beanies', 'scarves', 'bags', 'home-decor', 'baby-items', 'clothing', 'accessories']),
    cover: z.string(),
    publishDate: z.coerce.date(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    difficulty: z.enum(['beginner', 'easy', 'intermediate', 'advanced']),
    hook: z.string(),
    yarnWeight: z.string(),
    yardage: z.string().optional(),
    gauge: z.string().optional(),
    time: z.string().optional(),
    sizes: z.array(z.string()).default([]),
    stitches: z.array(z.string()).default([]),
    materials: z.array(z.string()).default([]),
    colors: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
  }),
});

export const collections = { patterns };
