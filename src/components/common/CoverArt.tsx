interface CoverArtProps {
  url: string | null;
  title: string;
  imageClassName: string;
  fallbackClassName: string;
}

export function CoverArt({
  url,
  title,
  imageClassName,
  fallbackClassName,
}: CoverArtProps) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={title}
        loading="lazy"
        className={imageClassName}
      />
    );
  }

  return <div className={fallbackClassName}>no art</div>;
}
