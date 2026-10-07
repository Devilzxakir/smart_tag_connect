import QRCode from "qrcode";

const OPTIONS = {
  errorCorrectionLevel: "M" as const,
  margin: 2,
  color: { dark: "#0b1a33", light: "#ffffff" },
};

export async function qrPngDataUrl(value: string, width = 640): Promise<string> {
  return QRCode.toDataURL(value, { ...OPTIONS, width });
}

export async function qrSvgString(value: string): Promise<string> {
  return QRCode.toString(value, { ...OPTIONS, type: "svg", width: 640 });
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function downloadQrPng(value: string, filename: string) {
  triggerDownload(await qrPngDataUrl(value, 1024), `${filename}.png`);
}

export async function downloadQrSvg(value: string, filename: string) {
  const svg = await qrSvgString(value);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  triggerDownload(url, `${filename}.svg`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function canShareFiles(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    !!navigator.share
  );
}

export async function shareQr(value: string, filename: string, title: string) {
  const dataUrl = await qrPngDataUrl(value, 1024);
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], `${filename}.png`, { type: "image/png" });
  if (canShareFiles() && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title, text: value });
    return "shared" as const;
  }
  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({ title, text: value });
    return "shared" as const;
  }
  return "unsupported" as const;
}

export function safeFilename(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "nfc-tag"
  );
}
