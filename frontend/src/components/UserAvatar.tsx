import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { isDefaultAvatar } from "@/lib/is-default-avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  src?: string | null;
  initials: string;
  alt: string;
  sizeClassName?: string;
  fallbackClassName?: string;
  className?: string;
}

export function UserAvatar({
  src,
  initials,
  alt,
  sizeClassName = "size-14",
  fallbackClassName = "text-base",
  className,
}: UserAvatarProps) {
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    if (!src) {
      setShowImage(false);
      return;
    }

    let cancelled = false;
    const image = new Image();

    image.onload = async () => {
      if (cancelled) {
        return;
      }

      const isDefault = await isDefaultAvatar(src);
      if (!cancelled) {
        setShowImage(!isDefault);
      }
    };

    image.onerror = () => {
      if (!cancelled) {
        setShowImage(false);
      }
    };

    image.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <Avatar
      className={cn(
        "relative cursor-pointer after:border-0",
        sizeClassName,
        className,
      )}
    >
      {showImage && src ? (
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 z-10 size-full cursor-pointer rounded-full object-cover"
          onError={() => setShowImage(false)}
        />
      ) : null}
      <AvatarFallback
        className={cn(
          "bg-violet-600 font-semibold text-white",
          fallbackClassName,
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
