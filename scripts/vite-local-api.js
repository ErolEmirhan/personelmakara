import { loadEnv } from 'vite';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Geçersiz JSON'));
      }
    });
    req.on('error', reject);
  });
}

const API_ROUTES = {
  '/api/push-announcement': 'push-announcement.js',
  '/mobile/api/push-announcement': 'push-announcement.js',
  '/api/register-push-token': 'register-push-token.js',
  '/mobile/api/register-push-token': 'register-push-token.js',
};

/** Vite dev sunucusunda Vercel API route'larını çalıştırır */
export function localApiPlugin(mode) {
  return {
    name: 'makara-local-api',
    configureServer(server) {
      const env = loadEnv(mode, process.cwd(), '');
      Object.assign(process.env, env);

      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url || '/').split('?')[0].replace(/\/+$/, '') || '/';

        if (!API_ROUTES[pathname]) {
          next();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          if (typeof res.status !== 'function') {
            res.status = function status(code) {
              this.statusCode = code;
              return this;
            };
          }

          const handlerFile = API_ROUTES[pathname];
          const handlerPath = path.join(ROOT, '..', 'api', handlerFile);
          const { default: handler } = await import(pathToFileURL(handlerPath).href);
          req.body = await readJsonBody(req);
          await handler(req, res);
        } catch (err) {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Yerel API hatası' }));
          }
        }
      });
    },
  };
}
