export const metadata = {
  title: "Contact — Flightly",
  description: "Get in touch with the Flightly team.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-black text-white sm:text-4xl">Contact</h1>
      <p className="mt-2 max-w-2xl text-white/70">
        Questions, feedback, partnerships, or API access — send a message and we’ll reply.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        {/* Form card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-extrabold text-white">Send a message</h2>

          {/* Server-safe demo form (no onSubmit) */}
          <form className="mt-4 grid gap-4" action="#" method="post">
            <Field label="Name">
              <input
                name="name"
                required
                placeholder="Your full name"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-white/20"
              />
            </Field>

            <Field label="Email">
              <input
                name="email"
                required
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-white/20"
              />
            </Field>

            <Field label="Topic">
              <select
                name="topic"
                required
                defaultValue=""
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
              >
                <option value="" disabled>
                  Select a topic
                </option>
                <option value="support">Support</option>
                <option value="feedback">Product feedback</option>
                <option value="partnership">Partnership</option>
                <option value="api">API / Data</option>
              </select>
            </Field>

            <Field label="Message">
              <textarea
                name="message"
                required
                placeholder="Write your message..."
                rows={6}
                className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-white/20"
              />
            </Field>

            <button
              type="submit"
              className="rounded-xl border border-white/15 bg-white px-4 py-3 font-extrabold text-zinc-950 hover:bg-white/90"
            >
              Send Message
            </button>

            <p className="text-xs text-white/50">
              Demo form right now. Next step: connect this to a Next.js API route.
            </p>
          </form>
        </div>

        {/* Info card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-extrabold text-white">Contact details</h2>

          <div className="mt-4 grid gap-4 text-white/85">
            <div>
              <div className="text-sm font-bold text-white">Email</div>
              <div className="text-sm text-white/65">support@flightly.app (placeholder)</div>
            </div>

            <div>
              <div className="text-sm font-bold text-white">Response time</div>
              <div className="text-sm text-white/65">Within 24–48 hours</div>
            </div>

            <div>
              <div className="text-sm font-bold text-white">Notes</div>
              <div className="text-sm text-white/65">
                For API issues, include the flight number/route and timestamp.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-white/90">{label}</span>
      {children}
    </label>
  );
}