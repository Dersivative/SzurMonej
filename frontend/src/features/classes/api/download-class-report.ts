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

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

export async function downloadClassReport(
  classId: number,
  fallbackFilename = `raport-klasy-${classId}.pdf`,
): Promise<void> {
  const response = await api.get<Blob>(`/school-classes/${classId}/report`, {
    responseType: "blob",
  });

  const filename = getFilenameFromContentDisposition(
    response.headers["content-disposition"],
    fallbackFilename,
  );

  triggerBlobDownload(response.data, filename);
}
