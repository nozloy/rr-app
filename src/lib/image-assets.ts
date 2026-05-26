import { readFile } from "fs/promises";
import path from "path";

export async function getAssetDataUrl(assetPath: string) {
  const filePath = path.join(
    process.cwd(),
    "public",
    assetPath.replace(/^\//, ""),
  );
  const content = await readFile(filePath);
  const extension = path.extname(assetPath).toLowerCase();

  const mimeType =
    extension === ".png"
      ? "image/png"
      : extension === ".webp"
        ? "image/webp"
        : "image/jpeg";

  return `data:${mimeType};base64,${content.toString("base64")}`;
}
