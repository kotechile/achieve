# Build stage
FROM node:lts-alpine AS build
WORKDIR /app

# curl is used for the pre-build CMS reachability check below
RUN apk add --no-cache curl

# Explicit lockfile copy: `npm ci` requires it, and naming it means a missing/stale lockfile
# fails loudly here instead of silently falling back to an unpinned resolution.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build-time public configuration.
# Astro inlines `import.meta.env.PUBLIC_*` into the bundle at build time, so these MUST be set
# during `npm run build`. Supplying them only at container runtime produces a site that has
# already shipped its fallback values (wrong canonical host, wrong app links, no analytics).
# Defaults are the live production values so a bare `docker build` still works.
ARG PUBLIC_SITE_URL=https://aichieve.net
ARG PUBLIC_WORDPRESS_API_BASE=https://cms.giniloh.com
ARG PUBLIC_APPS_BASE=https://apps.aichieve.net
ARG PUBLIC_ANALYTICS_SRC=
ARG PUBLIC_ANALYTICS_WEBSITE_ID=
ARG PUBLIC_ANALYTICS_DOMAINS=aichieve.net,www.aichieve.net
ARG PUBLIC_GOOGLE_SITE_VERIFICATION=
ARG PUBLIC_BING_SITE_VERIFICATION=

ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL \
    PUBLIC_WORDPRESS_API_BASE=$PUBLIC_WORDPRESS_API_BASE \
    PUBLIC_APPS_BASE=$PUBLIC_APPS_BASE \
    PUBLIC_ANALYTICS_SRC=$PUBLIC_ANALYTICS_SRC \
    PUBLIC_ANALYTICS_WEBSITE_ID=$PUBLIC_ANALYTICS_WEBSITE_ID \
    PUBLIC_ANALYTICS_DOMAINS=$PUBLIC_ANALYTICS_DOMAINS \
    PUBLIC_GOOGLE_SITE_VERIFICATION=$PUBLIC_GOOGLE_SITE_VERIFICATION \
    PUBLIC_BING_SITE_VERIFICATION=$PUBLIC_BING_SITE_VERIFICATION

# Some hosts have trouble with their own SSL certificate during the build
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

# Verify the CMS is reachable before the build. Informational only: the site degrades to
# hosted-empty states rather than failing, so a miss here must not break the image.
RUN echo "Checking connection to $PUBLIC_WORDPRESS_API_BASE..." && \
    curl -sS -I "$PUBLIC_WORDPRESS_API_BASE/wp-json/wp/v2/posts" || echo "Connection check failed, but proceeding with build..."

RUN npm run build

# Production stage
FROM nginx:stable-alpine

# curl for Coolify's healthcheck compatibility
RUN apk add --no-cache curl

COPY default.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80 3000

CMD ["nginx", "-g", "daemon off;"]
