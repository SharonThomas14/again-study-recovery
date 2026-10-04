import { mkdir, copyFile, cp, rm, readFile, writeFile } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist");
for (const f of ["index.html", "style.css", "design.css", "favicon.svg"])
  await copyFile(f, `dist/${f}`);
await cp("assets", "dist/assets", { recursive: true });
await cp("src", "dist/src", { recursive: true });
await cp("samples", "dist/samples", { recursive: true });
await mkdir("dist/vendor", { recursive: true });
for (const f of ["pdf.mjs", "pdf.worker.mjs"])
  await copyFile(
    "node_modules/pdfjs-dist/legacy/build/" + f,
    "dist/vendor/" + f,
  );
await copyFile("node_modules/pdfjs-dist/LICENSE", "dist/vendor/LICENSE-pdfjs");
console.log("Static build ready in dist");

await copyFile("node_modules/docx/dist/index.mjs", "dist/vendor/docx.mjs");
await copyFile(
  "node_modules/pptxgenjs/dist/pptxgen.bundle.js",
  "dist/vendor/pptxgen.bundle.js",
);
await copyFile("node_modules/ical.js/dist/ical.js", "dist/vendor/ical.js");
await writeFile(
  "dist/vendor/calendar-core.js",
  (await readFile("src/calendar-core.js", "utf8")).replace(
    /from ['"]ical\.js['"]/,
    "from './ical.js'",
  ),
);
await writeFile(
  "dist/vendor/export-core.js",
  (await readFile("src/export-core.js", "utf8"))
    .replace(/from ['"]docx['"]/, "from './docx.mjs'")
    .replace(
      /import pptxgen from ['"]pptxgenjs['"];?/,
      `if(!window.PptxGenJS){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('./pptxgen.bundle.js',import.meta.url).href;script.onload=resolve;script.onerror=()=>reject(Error('Export library could not load.'));document.head.append(script);});}
const pptxgen=window.PptxGenJS;`,
    ),
);
for (const [pkg, file] of [
  ["docx", "LICENSE"],
  ["pptxgenjs", "LICENSE"],
  ["ical.js", "LICENSE"],
]) {
  try {
    await copyFile(
      "node_modules/" + pkg + "/" + file,
      "dist/vendor/LICENSE-" + pkg,
    );
  } catch {}
}
console.log("Document and calendar libraries ready");
await cp("node_modules/@wllama/wllama/esm", "dist/vendor/wllama", {
  recursive: true,
});
await copyFile(
  "node_modules/@wllama/wllama/LICENCE",
  "dist/vendor/LICENSE-wllama",
);

// Version our browser modules so existing visitors receive the complete release.
const {createHash}=await import('node:crypto');
const {readdir}=await import('node:fs/promises');
const modules=(await readdir('dist/src')).filter(f=>f.endsWith('.js'));
const hash=createHash('sha256');
for(const f of ['index.html','style.css','design.css',...modules.map(f=>'src/'+f)])hash.update(await readFile(f));
const release=hash.digest('hex').slice(0,12);
for(const f of modules){
 const path='dist/src/'+f;
 const content=(await readFile(path,'utf8')).replace(/(["'])(\.{1,2}\/[^"']+\.(?:js|mjs))(\?[^"']*)?\1/g,(_match,q,url,query)=>q+url+(query?query+'&':'?')+'release='+release+q);
 await writeFile(path,content);
}
let html=await readFile('dist/index.html','utf8');
html=html.replace(/(href|src)="(\.\/(?:style\.css|design\.css|src\/app\.js))"/g,(_,attr,url)=>`${attr}="${url}?release=${release}"`).replace('</head>',`<meta name="restrive-build" content="${release}"></head>`);
await writeFile('dist/index.html',html);
console.log('ReStrive release '+release);
