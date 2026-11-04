import Image from "next/image";

// The SliceDot logo. Two versions swap with the theme; both are rendered and CSS shows the one for the current theme.

const W = 6988;
const H = 3100;

export default function Logo({ className = "h-9", priority = false, sizes = "160px" }: { className?: string; priority?: boolean; sizes?: string }) {
  const img = (src: string, theme: string) => (
    <Image src={src} alt="SliceDot" width={W} height={H} priority={priority} sizes={sizes} className={`w-auto ${className} ${theme}`} />
  );
  return (
    <>
      {img("/assets/logo-black.png", "block dark:hidden")}
      {img("/assets/logo-white.png", "hidden dark:block")}
    </>
  );
}
