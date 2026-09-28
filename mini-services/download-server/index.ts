import { readFileSync } from "fs";
import { join } from "path";

const html = readFileSync(join("/home/z/my-project/public", "download-page.html"), "utf8");

Bun.serve({
  port: 3099,
  hostname: "0.0.0.0",
  fetch(req) {
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
});

console.log("DL server on 3099");
