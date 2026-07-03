import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

createServer((request, response) => {
  const url = new URL(request.url || "/", `http://localhost:${port}`);
  const safePath = normalize(url.pathname).replace(/^(\.\.[/\\])+/, "");
  const requestedPath = join(root, safePath === "/" ? "index.html" : safePath);
  const filePath =
    existsSync(requestedPath) && statSync(requestedPath).isDirectory()
      ? join(requestedPath, "index.html")
      : requestedPath;

  if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, { "content-type": types[extname(filePath)] || "application/octet-stream" });
  createReadStream(filePath)
    .on("error", () => {
      if (!response.headersSent) {
        response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      }
      response.end("Unable to read file");
    })
    .pipe(response);
}).listen(port, () => {
  console.log(`U.S. Stock Dip Sentinel available at http://localhost:${port}`);
});
