import Image from "next/image";
import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" aria-label="Slotly, inicio" className="inline-flex shrink-0 rounded-md">
      <Image
        src="/slotly-logo.png"
        alt="Slotly"
        width={2172}
        height={724}
        sizes="(min-width: 640px) 96px, 80px"
        className="brand-logo h-auto w-20 sm:w-24"
        loading="eager"
      />
    </Link>
  );
}
