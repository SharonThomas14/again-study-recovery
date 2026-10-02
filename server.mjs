import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
const root = resolve(process.cwd());
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};
http
  .createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (
        !/^\/(?:$|index\.html$|style\.css$|favicon\.svg$|(?:src|vendor|samples)\/[a-zA-Z0-9_.-]+$)/.test(
          pathname,
        )
      )
        throw Error();
      const routed = pathname.startsWith("/vendor/")
        ? "/dist" + pathname
        : pathname;
      const p = resolve(root, "." + (routed === "/" ? "/index.html" : routed));
      const body = await readFile(p);
      res.writeHead(200, {
        "Content-Type": types[extname(p)] || "text/plain",
        "Cache-Control": "no-store",
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(4173, "127.0.0.1", () =>
    console.log("Again running at http://127.0.0.1:4173"),
  );
