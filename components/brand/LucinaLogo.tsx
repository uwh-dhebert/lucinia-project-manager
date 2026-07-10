import Image from 'next/image';
import Link from 'next/link';

interface LucinaLogoProps {
  href?: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export function LucinaLogo({
  href = '/dashboard',
  width = 145,
  height = 44,
  className = '',
  priority = false,
}: LucinaLogoProps) {
  const image = (
    <Image
      src="/lucina-logo.svg"
      alt="Lucina"
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center hover:opacity-85 transition-opacity">
        {image}
      </Link>
    );
  }

  return image;
}