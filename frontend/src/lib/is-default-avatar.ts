let defaultAvatarBytes: Uint8Array | null = null;

async function getDefaultAvatarBytes(): Promise<Uint8Array> {
  if (defaultAvatarBytes) {
    return defaultAvatarBytes;
  }

  const response = await fetch("/default-avatar.png");
  if (!response.ok) {
    throw new Error("Nie udało się wczytać domyślnego avatara.");
  }

  defaultAvatarBytes = new Uint8Array(await response.arrayBuffer());
  return defaultAvatarBytes;
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

export async function isDefaultAvatar(src: string): Promise<boolean> {
  try {
    const [imageResponse, defaultBytes] = await Promise.all([
      fetch(src),
      getDefaultAvatarBytes(),
    ]);

    if (!imageResponse.ok) {
      return false;
    }

    const imageBytes = new Uint8Array(await imageResponse.arrayBuffer());
    return bytesEqual(imageBytes, defaultBytes);
  } catch {
    return false;
  }
}
