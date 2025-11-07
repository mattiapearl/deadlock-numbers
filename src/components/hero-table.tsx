export type PreparedHero = {
  id: number;
  name: string;
  heroType?: string | null;
  role?: string | null;
  maxHealth?: number | null;
  soulsToLevel2?: number | null;
  weapon?: {
    name: string;
    bulletDamage?: number | null;
    clipSize?: number | null;
    cycleTime?: number | null;
    reloadDuration?: number | null;
    bulletsPerShot?: number | null;
  } | null;
  signatureAbilities: {
    slot: string;
    name: string;
    cooldown?: string | null;
    descriptionLabel?: string | null;
  }[];
};

type HeroTableProps = {
  heroes: PreparedHero[];
};

function formatNumber(value: number | null | undefined, options?: Intl.NumberFormatOptions) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function HeroTable({ heroes }: HeroTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Heroes Overview
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {heroes.length} heroes loaded
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full divide-y divide-zinc-200 text-left text-sm text-zinc-900 dark:divide-zinc-800 dark:text-zinc-100">
          <thead className="bg-zinc-50 uppercase tracking-wide text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            <tr>
              <th scope="col" className="px-5 py-3">Hero</th>
              <th scope="col" className="px-5 py-3">Max Health</th>
              <th scope="col" className="px-5 py-3">Weapon</th>
              <th scope="col" className="px-5 py-3">Weapon Stats</th>
              <th scope="col" className="px-5 py-3">Signature Abilities</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
            {heroes.map((hero) => (
              <tr key={hero.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                <td className="px-5 py-4 align-top">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold leading-5 text-zinc-900 dark:text-zinc-50">
                      {hero.name}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {hero.heroType && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                          {hero.heroType}
                        </span>
                      )}
                      {hero.role && <span>{hero.role}</span>}
                      {hero.soulsToLevel2 !== null && hero.soulsToLevel2 !== undefined && (
                        <span>
                          Souls → L2: {formatNumber(hero.soulsToLevel2)}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 align-top text-sm text-zinc-700 dark:text-zinc-200">
                  {formatNumber(hero.maxHealth, { maximumFractionDigits: 0 })}
                </td>
                <td className="px-5 py-4 align-top">
                  {hero.weapon ? (
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {hero.weapon.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-zinc-400">No weapon linked</span>
                  )}
                </td>
                <td className="px-5 py-4 align-top text-xs text-zinc-600 dark:text-zinc-300">
                  {hero.weapon ? (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div>
                        <dt className="font-medium uppercase tracking-wide text-[10px] text-zinc-500 dark:text-zinc-400">
                          Bullet DMG
                        </dt>
                        <dd className="text-sm text-zinc-700 dark:text-zinc-100">
                          {formatNumber(hero.weapon.bulletDamage)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium uppercase tracking-wide text-[10px] text-zinc-500 dark:text-zinc-400">
                          Clip Size
                        </dt>
                        <dd className="text-sm text-zinc-700 dark:text-zinc-100">
                          {formatNumber(hero.weapon.clipSize, { maximumFractionDigits: 0 })}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium uppercase tracking-wide text-[10px] text-zinc-500 dark:text-zinc-400">
                          Cycle Time
                        </dt>
                        <dd className="text-sm text-zinc-700 dark:text-zinc-100">
                          {(() => {
                            const value = formatNumber(hero.weapon?.cycleTime);
                            return value === "—" ? value : `${value}s`;
                          })()}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium uppercase tracking-wide text-[10px] text-zinc-500 dark:text-zinc-400">
                          Reload
                        </dt>
                        <dd className="text-sm text-zinc-700 dark:text-zinc-100">
                          {(() => {
                            const value = formatNumber(hero.weapon?.reloadDuration);
                            return value === "—" ? value : `${value}s`;
                          })()}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <span className="text-sm text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-5 py-4 align-top text-xs text-zinc-600 dark:text-zinc-300">
                  {hero.signatureAbilities.length > 0 ? (
                    <ul className="space-y-1">
                      {hero.signatureAbilities.map((ability) => (
                        <li key={ability.slot} className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/80">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {ability.name}
                          </p>
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            {ability.slot}
                          </p>
                          {ability.cooldown && (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              Cooldown: {ability.cooldown}
                            </p>
                          )}
                          {ability.descriptionLabel && (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              {ability.descriptionLabel}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-sm text-zinc-400">No signature abilities mapped</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

