import MithilaViewer from './components/MithilaViewer.jsx';
import MithilaWriteup from './components/MithilaWriteup.jsx';

export default function App() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="flex items-center justify-between border-b border-ink/10 px-6 py-5 sm:px-10">
        <a
          className="font-display text-xl font-semibold tracking-tight"
          href="#home"
          aria-label="Mithila home"
        >
          mithila<span className="text-vermilion">.</span>
        </a>
        <span className="hidden text-xs font-medium uppercase tracking-[0.22em] text-ink/55 sm:block">
          Culture in form
        </span>
        <a
          className="text-sm font-medium text-ink/70 transition hover:text-vermilion"
          href="#story"
        >
          Explore the story <span aria-hidden="true">↗</span>
        </a>
      </header>

      <section
        id="home"
        className="mx-auto grid min-h-[calc(100vh-73px)] max-w-[1600px] grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]"
      >
        <div className="relative flex min-h-[52vh] flex-col justify-center overflow-hidden border-b border-ink/10 px-6 py-10 sm:px-10 lg:min-h-0 lg:border-b-0 lg:border-r lg:px-14">
          <div className="pointer-events-none absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full border border-vermilion/10 sm:h-96 sm:w-96" />
          <div className="pointer-events-none absolute -left-12 top-1/2 h-52 w-52 -translate-y-1/2 rounded-full border border-vermilion/10 sm:h-72 sm:w-72" />
          <div className="relative z-10 mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-vermilion">
            <span className="h-px w-8 bg-vermilion" />
            An interactive cultural study
          </div>
          <h1 className="relative z-10 max-w-2xl font-display text-5xl leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
            Where every line
            <br />
            <span className="text-vermilion">holds a story.</span>
          </h1>
          <p className="relative z-10 mt-6 max-w-lg text-base leading-7 text-ink/65 sm:text-lg">
            A closer look at Mithila: a living tradition shaped by art, place, and
            the knowledge passed from one generation to the next.
          </p>
          <a
            className="relative z-10 mt-8 inline-flex w-fit items-center gap-3 rounded-full border border-ink/20 px-5 py-3 text-sm font-medium transition hover:border-vermilion hover:text-vermilion"
            href="#story"
          >
            Read the field notes <span aria-hidden="true">↓</span>
          </a>
          <span className="absolute bottom-8 left-6 text-xs tracking-[0.16em] text-ink/45 sm:left-10 lg:left-14">
            01 — MITHILA, BIHAR
          </span>
        </div>

        <div className="flex min-h-[55vh] flex-col bg-[#eee9df] lg:min-h-0">
          <div className="flex items-center justify-between px-6 pt-6 sm:px-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/50">
                Form study
              </p>
              <p className="mt-1 font-display text-lg">A canvas for your model</p>
            </div>
            <span className="rounded-full border border-ink/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/55">
              3D / interactive
            </span>
          </div>
          <div className="min-h-[360px] flex-1 p-3 sm:p-6">
            <MithilaViewer />
          </div>
          <div className="flex items-center justify-between px-6 pb-5 text-xs text-ink/50 sm:px-10">
            <span>Drag to orbit · Scroll to zoom</span>
            <span>GLB ready</span>
          </div>
        </div>
      </section>

      <MithilaWriteup />

      <footer className="flex flex-col gap-2 border-t border-ink/10 px-6 py-6 text-xs text-ink/50 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <span>Mithila — a study of culture, craft, and form.</span>
        <span>Designed as an evolving cultural archive.</span>
      </footer>
    </main>
  );
}
