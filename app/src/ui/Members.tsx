import { useApp } from '../app';
import { fmtDate, t } from '../i18n';
import { formatShortCode, shortCode } from '../core/shortcode';
import { Footer, Header } from './parts';

export function Members() {
  const app = useApp();
  const members = app.dao?.members ?? [];
  const council = members.filter(m => m.council);
  return (
    <>
      <Header />
      <main>
        <h1>{t('members.title')}</h1>
        <p class="small">{t('members.count', { n: members.length, c: council.length })}</p>
        <div class="card list">
          {[...council, ...members.filter(m => !m.council)].map(m => (
            <div class="row" style="align-items:flex-start">
              <div class="stack" style="gap:4px">
                <strong>{m.name}{m.key === app.me?.key ? ` (${t('members.you')})` : ''}</strong>
                <span class="small">
                  {m.council && <span class="chip teal">{t('members.council')}</span>} <span class="chip">{t('members.founder')}</span>{' '}
                  {m.verified === 'remote' ? t('members.remote') : t('members.inPerson')} · {fmtDate(m.since)}
                </span>
              </div>
              <span class="mono small">{formatShortCode(shortCode(m.key))}</span>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
