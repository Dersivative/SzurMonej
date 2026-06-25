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

export async function downloadAttachment(
  historyId: number,
  fallbackFilename = `zalacznik-${historyId}`,
): Promise<void> {
  const response = await api.get<Blob>(`/attachments/download/${historyId}`, {
    responseType: "blob",
  });

  const filename = getFilenameFromContentDisposition(
    response.headers["content-disposition"],
    fallbackFilename,
  );

  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}
