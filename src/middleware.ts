import { defineMiddleware } from 'astro:middleware';
import { SITE } from './lib/site';

const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$|\.localhost$/;

/**
 * One canonical host for SEO: www.stitchandcrochet.com and the *.workers.dev address
 * permanently redirect to https://stitchandcrochet.com (same path and query).
 */
export const onRequest = defineMiddleware((context, next) => {
  const url = context.url;
  if (url.hostname !== SITE.domain && !LOCAL.test(url.hostname)) {
    return Response.redirect(`https://${SITE.domain}${url.pathname}${url.search}`, 301);
  }
  return next();
});
