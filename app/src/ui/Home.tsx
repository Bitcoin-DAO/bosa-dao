import { useState } from 'preact/hooks';
import { refreshTreasury, useApp } from '../app';
import { fmtDate, fmtSats, t } from '../i18n';
import { Address, Footer, Header, Qr, go } from './parts';
import { Join } from './Join';

export function Home() {
  const app = useApp();
  if (!app.daoId) return <Join />;
  const cfg = app.dao!.founded!.config;
  const tr = app.treasury;
  const n = cfg.council.length;
  const m = cfg.threshold;
  const cap = cfg.rules.treasuryCapSats;
  const atCap = tr ? tr.balance >= cap : false;
  const explorer = (cfg.chainApi[0] ?? '').replace(/\/api\/?$/, '');
  return (
    <>
      <Header />
      <main>
        <section class="card">
          <span class="small" style="font-size:15px">{t('home.balance')}</span>
          {tr ? (
            <>
              <div class="balance">{fmtSats(tr.balance)} <small>sats</small></div>
              {tr.unconfirmed !== 0 && <span class="small">{t('home.unconfirmed', { amount: fmtSats(tr.unconfirmed) })}</span>}
              {cfg.network !== 'mainnet' && <span class="small">{t('home.testValue')}</span>}
            </>
          ) : app.treasuryError ? (
            <>
              <p class="error">{t('home.chainError', { msg: app.treasuryError })}</p>
              <button type="button" class="btn secondary" onClick={() => refreshTreasury()}>{t('retry')}</button>
            </>
          ) : (
            <div class="balance" aria-busy="true">…</div>
          )}
          <hr class="divider" />
          <div class="row">
            <div class="stack" style="gap:2px">
              <strong>{t('home.signatures', { m, n })}</strong>
              <span class="small">{t('home.councilKeys', { n })}</span>
            </div>
            <div class="dots" aria-hidden="true">{Array.from({ length: n }, (_, i) => <i class={i < m ? 'on' : ''} />)}</div>
          </div>
        </section>

        {tr && (atCap ? (
          <section class="card">
            <h2>{t('home.donate')}</h2>
            <p class="warn">{tr.balance > cap ? t('home.overCap', { cap: fmtSats(cap) }) : t('home.capReached', { cap: fmtSats(cap) })}</p>
          </section>
        ) : (
          <Donate address={tr.donationAddress} />
        ))}

        <section class="card">
          <h2>{t('home.proposals')}</h2>
          <p class="small">{t('home.proposalsSoon')}</p>
        </section>

        {tr && (
          <section class="card">
            <h2>{t('home.movements')}</h2>
            {tr.movements.length === 0 ? (
              <p class="small">{t('home.noMovements')}</p>
            ) : (
              <div class="list">
                {tr.movements.map(mv => (
                  <div class="row" style="align-items:flex-start">
                    <div class="stack" style="gap:2px">
                      <strong>{mv.net >= 0 ? t('home.in') : t('home.out')}</strong>
                      <span class="small">
                        {mv.time ? fmtDate(mv.time, false) : t('home.pending')}
                        {mv.net < 0 ? ` · ${t('home.feeIncl')}` : ''} ·{' '}
                        <a href={`${explorer}/tx/${mv.txid}`} target="_blank" rel="noopener">tx</a>
                      </span>
                    </div>
                    <span class={mv.net >= 0 ? 'amount-in' : 'amount-out'}>{mv.net >= 0 ? '+' : '−'}{fmtSats(Math.abs(mv.net))}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section class="card">
          <h2>{t('home.verify')}</h2>
          <p class="small">{t('home.verifyText', { m })}</p>
          <details>
            <summary class="small" style="cursor:pointer">{t('home.descriptor')}</summary>
            <p class="mono" style="font-size:12px;overflow-wrap:anywhere;margin-top:8px">{cfg.descriptor}</p>
          </details>
          <a href="#/rules" onClick={e => (e.preventDefault(), go('/rules'))}>{t('nav.rules')} →</a>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Donate({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <section class="card">
      <h2>{t('home.donate')}</h2>
      <div class="qr-wrap"><Qr text={`bitcoin:${address}`} size={200} label={address} /></div>
      <Address value={address} />
      <button type="button" class="btn dark" onClick={copy}>{copied ? t('home.copied') : t('home.copy')}</button>
      <p class="small">{t('home.donateNote')}</p>
    </section>
  );
}
