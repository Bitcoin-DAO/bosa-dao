import { useState } from 'preact/hooks';
import { signOut, useApp } from '../app';
import { fmtDate, t } from '../i18n';
import { Footer, Header, PrintCard, ShortCode, go } from './parts';

export function Profile() {
  const app = useApp();
  const dao = app.site!.name;
  const [words, setWords] = useState(false);
  const me = app.me;
  if (!me) {
    return (
      <>
        <Header />
        <main>
          <h1>{t('profile.title')}</h1>
          <p class="lead">{t('profile.notMember', { dao })}</p>
          <button type="button" class="btn primary" onClick={() => go('/join')}>{t('nav.signin')}</button>
        </main>
      </>
    );
  }
  const tk = app.identity?.treasury;
  return (
    <>
      <Header />
      <main>
        <h1>{me.name}</h1>
        <div class="card">
          <div class="kv"><span>{me.council ? t('profile.council') : t('profile.member')}</span><span>{me.verified === 'remote' ? t('profile.remote') : t('profile.inPerson')}</span></div>
          <span class="small">{t('profile.since', { date: fmtDate(me.since) })}</span>
          <span class="small">{t('profile.code')}</span>
          <ShortCode pubkey={me.key} />
        </div>
        {app.secret ? <PrintCard council={me.council} /> : <p class="note">{t('profile.locked')}</p>}
        {me.council && tk && (
          <div class="card">
            <h3>{t('profile.treasuryKey')}</h3>
            <p class="small">{t('profile.treasuryKeyText', { fp: tk.fingerprint })}</p>
            <button type="button" class="btn link" style="align-self:flex-start" onClick={() => setWords(!words)}>{words ? t('profile.hideWords') : t('profile.showWords')}</button>
            {words && <p class="mono" style="font-size:15px;line-height:1.8">{tk.mnemonic}</p>}
          </div>
        )}
        {app.secret && !app.identity?.plain && (
          <button type="button" class="btn secondary" onClick={() => (signOut(), go('/'))}>{t('profile.signout')}</button>
        )}
      </main>
      <Footer />
    </>
  );
}
