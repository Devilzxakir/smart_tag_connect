import { Download, FileCode2, Loader2, QrCode, RefreshCw, Share2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadQrPng, downloadQrSvg, qrPngDataUrl, safeFilename, shareQr } from "@/lib/qr";
import { tagQrUrl, type Tag } from "@/lib/store";

type Source = "content" | "link";

export function TagQrCard({ tag }: { tag: Tag }) {
  const [source, setSource] = useState<Source>(
    tag.mode === "dynamic" || !tag.content ? "link" : "content",
  );
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(0);

  const value = source === "content" && tag.content ? tag.content : tagQrUrl(tag);
  const filename = `${safeFilename(tag.name)}-qr`;

  const build = useCallback(async () => {
    setBusy(true);
    try {
      setDataUrl(await qrPngDataUrl(value));
    } catch {
      toast.error("Could not generate the QR code.");
    } finally {
      setBusy(false);
    }
  }, [value]);

  useEffect(() => {
    void build();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [build, nonce]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <QrCode className="size-4 text-primary" />
        <p className="text-xs uppercase tracking-widest text-muted-foreground">QR code</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSource("content")}
          disabled={!tag.content || tag.mode === "dynamic"}
          className={
            source === "content"
              ? "rounded-lg border border-primary bg-primary/10 py-2 text-xs font-medium text-primary"
              : "rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground disabled:opacity-50"
          }
        >
          Tag content
        </button>
        <button
          type="button"
          onClick={() => setSource("link")}
          className={
            source === "link"
              ? "rounded-lg border border-primary bg-primary/10 py-2 text-xs font-medium text-primary"
              : "rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground"
          }
        >
          Permanent link
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center rounded-xl bg-white p-4">
        {dataUrl ? (
          <img src={dataUrl} alt={`QR code for ${tag.name}`} className="size-48" />
        ) : (
          <div className="flex size-48 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <p className="mt-3 break-all text-center font-mono text-[11px] text-muted-foreground">
        {value}
      </p>
      {source === "link" && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          This link never changes, so later you can point it somewhere new without rewriting the
          tag.
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={() => void downloadQrPng(value, filename)}>
          <Download className="mr-2 size-4" /> PNG
        </Button>
        <Button variant="outline" size="sm" onClick={() => void downloadQrSvg(value, filename)}>
          <FileCode2 className="mr-2 size-4" /> SVG
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              const r = await shareQr(value, filename, tag.name);
              if (r === "unsupported") toast.info("Sharing isn't available on this device.");
            } catch {
              /* user cancelled */
            }
          }}
        >
          <Share2 className="mr-2 size-4" /> Share
        </Button>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => setNonce((n) => n + 1)}>
          <RefreshCw className={busy ? "mr-2 size-4 animate-spin" : "mr-2 size-4"} /> Regenerate
        </Button>
      </div>
    </div>
  );
}
