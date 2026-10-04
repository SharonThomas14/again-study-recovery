import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import agent from "./api/agent.js";
import config from "./api/config.js";
const root = resolve(process.cwd());
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".wasm": "application/wasm",
};
http
  .createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (pathname === "/api/config") return config(req, res);
      if (pathname === "/api/agent") {
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 90000) {
            res.writeHead(413);
            res.end("Too large");
            return;
          }
        }
        try {
          req.body = JSON.parse(body);
        } catch {
          req.body = null;
        }
        return agent(req, res);
      }
      if (
        !/^\/(?:$|index\.html$|(?:style|design)\.css$|favicon\.svg$|(?:src|vendor|samples|assets)\/[a-zA-Z0-9_./-]+$)/.test(
          pathname,
        )
      )
        throw Error();
      if (pathname.includes("..")) throw Error();
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
    console.log("ReStrive running at http://127.0.0.1:4173"),
  );
