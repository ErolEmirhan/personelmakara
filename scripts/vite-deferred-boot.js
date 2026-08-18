import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Production build: JS/CSS modüllerini inline boot sonrası yükler.
 * iOS PWA'da eski bundle + yeni index çakışmasını önler.
 */
export function deferredBootPlugin() {
  const bootTemplate = fs.readFileSync(
    path.resolve(__dirname, '../src/pwa/inlineBoot.js'),
    'utf8'
  );

  return {
    name: 'makara-deferred-boot',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;

        const assets = {
          moduleScripts: [],
          stylesheets: [],
          inlineModules: [],
          legacyScripts: [],
        };

        html = html.replace(
          /<script type="module"[^>]*src="([^"]+)"[^>]*>\s*<\/script>/gi,
          (match, src) => {
            if (/assets\//i.test(src)) {
              assets.moduleScripts.push(src);
              return '';
            }
            return match;
          }
        );

        html = html.replace(
          /<script type="module">([\s\S]*?)<\/script>/gi,
          (match, content) => {
            if (
              content.includes('__vite_is_modern_browser')
              || content.includes('vite-legacy')
              || content.includes('System.import')
            ) {
              assets.inlineModules.push(content);
              return '';
            }
            return match;
          }
        );

        html = html.replace(
          /<link rel="stylesheet" crossorigin href="([^"]+)"[^>]*>/gi,
          (match, href) => {
            if (/assets\//i.test(href)) {
              assets.stylesheets.push(href);
              return '';
            }
            return match;
          }
        );

        html = html.replace(
          /<script nomodule>!function\(\)\{var e=document[\s\S]*?<\/script>/gi,
          (match) => {
            assets.legacyScripts.push({ html: match });
            return '';
          }
        );

        html = html.replace(
          /<script nomodule crossorigin id="vite-legacy-polyfill" src="([^"]+)"[^>]*>\s*<\/script>/gi,
          (_, src) => {
            assets.legacyScripts.push({ id: 'vite-legacy-polyfill', src });
            return '';
          }
        );

        html = html.replace(
          /<script nomodule crossorigin id="vite-legacy-entry" data-src="([^"]+)"[^>]*>[\s\S]*?<\/script>/gi,
          (_, dataSrc) => {
            assets.legacyScripts.push({ id: 'vite-legacy-entry', dataSrc, src: '' });
            return '';
          }
        );

        const bootScript = bootTemplate
          .replace('__MAKARA_ASSETS_JSON__', JSON.stringify(assets))
          .replace(/<\/script/gi, '<\\/script');

        html = html.replace(
          '<head>',
          `<head>\n<script>${bootScript}</script>`
        );

        return html;
      },
    },
  };
}
