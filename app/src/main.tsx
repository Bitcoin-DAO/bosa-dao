import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import './styles.css';
import { init, useApp } from './app';
import { t } from './i18n';
import { Home } from './ui/Home';
import { Join } from './ui/Join';
import { Founder } from './ui/Founder';
import { Setup } from './ui/Setup';
import { Restore } from './ui/Restore';
import { Profile } from './ui/Profile';
import { Members } from './ui/Members';
import { Rules } from './ui/Rules';
import { Header } from './ui/parts';

const routes: Record<string, () => preact.JSX.Element> = {
  '/': Home,
  '/join': Join,
  '/founder': Founder,
  '/setup': Setup,
  '/restore': Restore,
  '/profile': Profile,
  '/members': Members,
  '/rules': Rules,
};

const currentPath = () => location.hash.replace(/^#/, '') || '/';

function App() {
  const app = useApp();
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const on = () => setPath(currentPath());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  useEffect(() => {
    document.documentElement.lang = app.lang;
  }, [app.lang]);
  useEffect(() => {
    if (app.site) document.title = app.site.name;
  }, [app.site?.name]);

  if (app.loadError) {
    return (
      <div class="app">
        <Header />
        <main>
          <p class="warnbox">{t('error.load', { msg: app.loadError })}</p>
          <button type="button" class="btn secondary" onClick={() => location.reload()}>{t('retry')}</button>
        </main>
      </div>
    );
  }
  if (app.loading || !app.site) {
    return (
      <div class="app">
        <Header />
        <main><p class="small" aria-busy="true">{t('loading')}</p></main>
      </div>
    );
  }
  const Screen = routes[path] ?? Home;
  return <div class="app"><Screen /></div>;
}

render(<App />, document.getElementById('root')!);
void init();
