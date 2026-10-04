import { mkdir, copyFile, cp, rm } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist");
for (const f of ["index.html", "style.css", "restrive-logo.png"])
  await copyFile(f, `dist/${f}`);
await cp("src", "dist/src", { recursive: true });
await cp("samples", "dist/samples", { recursive: true });
await mkdir("dist/vendor", { recursive: true });
for (const f of ["pdf.mjs", "pdf.worker.mjs"])
  await copyFile("node_modules/pdfjs-dist/build/" + f, "dist/vendor/" + f);
await copyFile("node_modules/pdfjs-dist/LICENSE", "dist/vendor/LICENSE-pdfjs");
console.log("Static build ready in dist");
