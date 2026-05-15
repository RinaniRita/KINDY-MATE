export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-sans">
      <main className="flex flex-col gap-8 row-start-2 items-center text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-primary">
          Welcome to Kindy-Mate 🎈
        </h1>
        <p className="text-xl text-foreground/80 max-w-2xl">
          Your child's AI-powered learning and safety companion.
          Bridging the gap between fun education and parental peace of mind.
        </p>
        <div className="flex gap-4 items-center flex-col sm:flex-row mt-4">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-primary text-primary-foreground gap-2 hover:bg-primary/90 text-sm sm:text-base h-12 px-8 font-bold shadow-md hover:scale-105 transform duration-200"
            href="/parent-dashboard"
          >
            Parent Portal
          </a>
          <a
            className="rounded-full border border-solid border-secondary bg-secondary/10 text-secondary transition-colors flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground text-sm sm:text-base h-12 px-8 font-bold shadow-sm hover:scale-105 transform duration-200"
            href="/kid-zone"
          >
            Enter Kid Zone
          </a>
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center text-sm text-foreground/60">
        &copy; {new Date().getFullYear()} Kindy-Mate. All rights reserved.
      </footer>
    </div>
  );
}
