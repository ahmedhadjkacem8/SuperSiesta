import { useEffect, useState, type ImgHTMLAttributes, type SyntheticEvent } from "react";
import { getImageUrl, getResponsiveImageSrcSet, getResponsiveImageUrl } from "@/utils/imageUtils";

type ResponsiveImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
  imagePath: string | null | undefined;
  width: number;
  widths: number[];
  intrinsicWidth?: number;
  intrinsicHeight?: number;
};

export default function ResponsiveImage({
  imagePath,
  width,
  widths,
  intrinsicWidth,
  intrinsicHeight,
  onError,
  ...imageProps
}: ResponsiveImageProps) {
  const [useOriginal, setUseOriginal] = useState(false);
  const originalUrl = getImageUrl(imagePath);
  const optimizedUrl = getResponsiveImageUrl(imagePath, width);

  useEffect(() => {
    setUseOriginal(false);
  }, [imagePath]);

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    onError?.(event);
    if (useOriginal || !imagePath || optimizedUrl === originalUrl) return;

    event.currentTarget.closest("picture")
      ?.querySelectorAll("source")
      .forEach((source) => {
        source.removeAttribute("srcset");
        source.removeAttribute("sizes");
      });
    event.currentTarget.removeAttribute("srcset");
    setUseOriginal(true);
  };

  return (
    <img
      {...imageProps}
      width={intrinsicWidth}
      height={intrinsicHeight}
      src={useOriginal ? originalUrl : optimizedUrl}
      srcSet={useOriginal ? undefined : getResponsiveImageSrcSet(imagePath, widths)}
      onError={handleError}
    />
  );
}
