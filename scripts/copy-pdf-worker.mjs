
import { cp, mkdir } from "node:fs/promises";

const source = new URL(
  "../node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
);

const destinationDir = new URL("../public/", import.meta.url);

await mkdir(destinationDir, { recursive: true });

await cp(
  source,
  new URL("pdf.worker.min.mjs", destinationDir)
);

console.log("PDF.js worker copied successfully.");
