import { api } from "@/lib/api";

function getFilenameFromContentDisposition(
  contentDisposition: string | undefined,
  fallback: string,
): string {
  if (!contentDisposition) {
    return fallback;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const asciiMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  if (asciiMatch?.[1]) {
    return asciiMatch[1];
  }

  return fallback;
}

export async function fetchAttachmentBlob(
  historyId: number,
  fallbackFilename = `zalacznik-${historyId}`,
): Promise<{ blob: Blob; filename: string }> {
  const response = await api.get<Blob>(`/attachments/download/${historyId}`, {
    responseType: "blob",
  });

  const filename = getFilenameFromContentDisposition(
    response.headers["content-disposition"],
    fallbackFilename,
  );

  return { blob: response.data, filename };
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

export async function downloadAttachment(
  historyId: number,
  fallbackFilename = `zalacznik-${historyId}`,
): Promise<void> {
  const { blob, filename } = await fetchAttachmentBlob(
    historyId,
    fallbackFilename,
  );
  triggerBlobDownload(blob, filename);
}

export function canPreviewAttachmentBlob(blob: Blob): boolean {
  return blob.type.startsWith("image/") || blob.type === "application/pdf";
}

export async function previewAttachment(
  historyId: number,
  fallbackFilename = `zalacznik-${historyId}`,
): Promise<void> {
  const { blob, filename } = await fetchAttachmentBlob(
    historyId,
    fallbackFilename,
  );

  if (canPreviewAttachmentBlob(blob)) {
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    return;
  }

  triggerBlobDownload(blob, filename);
}
