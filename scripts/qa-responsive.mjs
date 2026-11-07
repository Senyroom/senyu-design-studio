import http from 'node:http';
// A real narrow browsing context when the desktop browser cannot override its viewport.
// This helper is bound to localhost and is never included in the deployed application.
http
  .createServer((req, res) => {
    const width =
      new URL(req.url, 'http://localhost').searchParams.get('width') === '820' ? 820 : 390;
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(
      `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>响应式验收</title><style>body{margin:0;background:#eceaf1;font:14px system-ui;padding:24px}nav{margin-bottom:20px}a{margin-right:20px}iframe{display:block;width:${width}px;height:844px;max-width:none;border:1px solid #bbb;background:white;box-shadow:0 10px 40px #0001}</style><nav>响应式验收 · ${width}px <a href="/?width=390">手机 390</a><a href="/?width=820">平板 820</a></nav><iframe title="实际网站响应式预览" src="http://localhost:3000/"></iframe></html>`,
    );
  })
  .listen(5180, '127.0.0.1', () => console.log('响应式验收：http://localhost:5180/'));
