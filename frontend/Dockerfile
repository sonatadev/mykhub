FROM node:20-alpine AS bundler
WORKDIR /build
COPY build/package.json .
RUN npm install --legacy-peer-deps
COPY build/tiptap-entry.js .
COPY build/sortable-entry.js .
RUN npx esbuild tiptap-entry.js \
    --bundle --format=iife --global-name=Tiptap --minify \
    --outfile=tiptap.js
RUN npx esbuild sortable-entry.js \
    --bundle --format=iife --global-name=SortableLib --minify \
    --outfile=sortable.js

FROM nginx:alpine
COPY nginx.conf       /etc/nginx/conf.d/default.conf
COPY index.html       /usr/share/nginx/html/
COPY share.html       /usr/share/nginx/html/
COPY share-space.html /usr/share/nginx/html/
COPY manifest.json    /usr/share/nginx/html/
COPY favicon.ico      /usr/share/nginx/html/
COPY icon-32.png      /usr/share/nginx/html/
COPY icon-192.png     /usr/share/nginx/html/
COPY icon-512.png     /usr/share/nginx/html/
COPY css/             /usr/share/nginx/html/css/
COPY js/              /usr/share/nginx/html/js/
COPY --from=bundler /build/tiptap.js   /usr/share/nginx/html/libs/tiptap.js
COPY --from=bundler /build/sortable.js /usr/share/nginx/html/libs/sortable.js
