FROM node:22-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3080
WORKDIR /app/apps/platform
COPY apps/platform/package.json apps/platform/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --chown=node:node apps/platform/src ./src
COPY --chown=node:node apps/platform/migrations ./migrations
COPY --chown=node:node assets /app/assets
COPY --chown=node:node index.html loja.html equipe-online.html manifest.webmanifest service-worker.js /app/
USER node
EXPOSE 3080
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "fetch('http://127.0.0.1:3080/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","src/main.mjs"]
