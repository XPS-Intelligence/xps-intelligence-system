import type { StaticImageData } from "next/image";

export function assetSrc(asset: string | StaticImageData): string {
  return typeof asset === "string" ? asset : asset.src;
}
