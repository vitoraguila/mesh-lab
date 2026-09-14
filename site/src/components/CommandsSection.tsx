import { Reveal } from './ui/Reveal'

type Group = { name: string; span: string; cols?: boolean; items: [string, string][] }

const GROUPS: Group[] = [
  {
    name: 'Every day',
    span: 'lg:col-span-5',
    items: [
      ['make port-forward ENV=stg', 'the studio, starting at :3000'],
      ['make grafana ENV=stg', 'dashboards, starting at :3200'],
      ['make tokens ENV=stg', 'print the local demo credentials'],
      ['make status ENV=stg', 'pods, services and routes'],
      ['make use ENV=stg', 'point kubectl at this namespace'],
    ],
  },
  {
    name: 'Change something',
    span: 'lg:col-span-7',
    items: [
      ['make deploy ENV=stg', 'apply manifest, config and policy changes'],
      ['make build APP=catalog', 'build and load only catalog:dev'],
      ['make restart APP=catalog ENV=stg', 'needed when deliberately reusing a tag'],
      ['make watch ENV=stg', 'redeploy on save, foreground, Ctrl+C stops'],
      ['make render ENV=prd', 'full manifests with dummy credentials'],
    ],
  },
  {
    name: 'Check something',
    span: 'lg:col-span-12',
    cols: true,
    items: [
      ['make test', 'Go race tests, typecheck, catalog fixtures'],
      ['make lint', 'both catalogs and both environment charts'],
      ['make smoke ENV=stg', 'allow, deny, bypass and a brief authz outage'],
      ['make smoke-all', 'both environments plus isolation checks'],
      ['make logs APP=catalog ENV=stg', 'application logs'],
      ['make analyze ENV=stg', 'istioctl analysis of the namespace'],
    ],
  },
]

export function CommandsSection() {
  return (
    <section className="border-b border-line bg-sunken py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <Reveal>
          <h2 className="max-w-[24ch] text-[clamp(1.9rem,4.2vw,3.1rem)] leading-[1.05] font-medium tracking-[-0.03em] text-ink">
            The commands worth remembering
          </h2>
          <p className="mt-5 max-w-[58ch] text-[16px] leading-relaxed text-muted">
            Every target takes ENV=stg or ENV=prd, and most take APP=name to narrow the work to one
            service.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
          {GROUPS.map((g, gi) => (
            <Reveal
              key={g.name}
              as="article"
              delay={gi * 0.07}
              className={`${g.span} rounded-2xl border border-line bg-raised p-6 lg:p-8`}
            >
              <h3 className="font-mono text-[11px] tracking-[0.16em] text-faint uppercase">{g.name}</h3>
              <dl
                className={`mt-6 grid gap-x-8 gap-y-5 ${g.cols ? 'sm:grid-cols-2' : 'grid-cols-1'}`}
              >
                {g.items.map(([cmd, what]) => (
                  <div key={cmd} className="min-w-0">
                    <dt className="overflow-x-auto">
                      <code className="font-mono text-[13px] whitespace-nowrap text-ink">{cmd}</code>
                    </dt>
                    <dd className="mt-1 text-[13px] leading-snug text-faint">{what}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
