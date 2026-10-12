const notes = [
  { number: '01', label: 'Living tradition' },
  { number: '02', label: 'Geometry & pattern' },
  { number: '03', label: 'Material knowledge' },
];

export default function MithilaWriteup() {
  return (
    <section
      id="story"
      className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-20 sm:px-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24 lg:py-28"
    >
      <aside>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vermilion">
          Field notes / 01
        </p>
        <h2 className="mt-4 max-w-sm font-display text-4xl leading-tight sm:text-5xl">
          A language drawn by hand.
        </h2>
        <ul className="mt-10 space-y-4 border-t border-ink/10 pt-5">
          {notes.map(({ number, label }) => (
            <li
              className="flex items-center gap-4 text-sm text-ink/65"
              key={number}
            >
              <span className="font-mono text-xs text-vermilion">{number}</span>
              {label}
            </li>
          ))}
        </ul>
      </aside>

      <article className="prose prose-stone max-w-2xl prose-headings:font-display prose-headings:font-normal prose-headings:tracking-tight prose-p:leading-8 prose-a:text-vermilion prose-a:no-underline hover:prose-a:underline prose-blockquote:border-vermilion prose-blockquote:font-display prose-blockquote:text-xl">
        <p className="lead !mt-0 !text-lg !leading-8 !text-ink/70">
          Mithila is a region and a cultural landscape in the eastern
          subcontinent. Its visual traditions are not simply decoration: they
          are ways of recording relationships between people, place, ritual,
          and the natural world.
        </p>

        <h3>Art shaped by place</h3>
        <p>
          Often called Madhubani painting, the region&apos;s art is known for
          vivid color, rhythmic line, and surfaces filled with repeated
          motifs. Artists have traditionally worked with locally available
          materials and painted on walls, floors, and paper. Styles and
          practices vary between communities and families; the tradition
          continues to change as artists make it their own.
        </p>

        <blockquote>
          A pattern can be both an image and a record of how its maker sees
          the world.
        </blockquote>

        <h3>Pattern as a system</h3>
        <p>
          Repetition, symmetry, and carefully nested forms make this art a
          compelling starting point for thinking about design. These are
          useful connections to explore—not a claim that historical artists
          were using modern engineering methods. Looking closely at a motif
          can raise questions about proportion, structure, material, and the
          knowledge carried through practice.
        </p>

        <h3>Explore the form</h3>
        <p>
          Use the 3D study above as a place to bring those questions into
          another medium. Add a SolidWorks export to{' '}
          <code>public/models/</code>, then connect it to the viewer to make
          the object tangible from every angle.
        </p>
      </article>
    </section>
  );
}
