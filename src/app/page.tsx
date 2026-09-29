import { SpeedTestPanel } from "@/components/speedtest/speed-test-panel";

/**
 * Home.
 *
 * The speed test is the product, so the page is just the meter. The design
 * system documentation that used to live here has been removed.
 */
export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <SpeedTestPanel />
    </div>
  );
}
