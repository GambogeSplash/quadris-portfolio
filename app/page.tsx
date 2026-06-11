import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-svh w-full p-[8px] text-[13px] leading-[1.4] text-gray-12 md:px-2 md:pt-2">
      <header className="flex flex-col gap-12 pb-12 md:flex-row md:gap-4">
        <p className="md:flex-1">Quadri</p>
        <p className="text-gray-7 md:flex-1">Portfolio</p>
      </header>
      <section className="flex flex-col gap-2">
        <p className="text-gray-7">Work</p>
        <Link href="/work/patch" className="cursor-pointer hover:text-gray-7">
          Patch
        </Link>
      </section>
    </main>
  );
}
