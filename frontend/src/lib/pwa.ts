/**
 * PWA: liga o app ao service worker (public/sw.js), que permite instalar o
 * SangueConecta no celular e abri-lo sem internet. A API nunca é guardada no aparelho.
 *
 * Só em builds de produção e em http(s): no `vite dev` o service worker atrapalharia o
 * recarregamento automático, e a demonstração aberta como arquivo (file://) não pode
 * registrar um.
 */
export function setupPwa(): void {
  if (!import.meta.env.PROD || !/^https?:$/.test(window.location.protocol)) return;

  // A demonstração é publicada numa subpasta (GitHub Pages) e sempre abre pelo próprio
  // arquivo (as rotas ficam depois do #): os caminhos são relativos à página. O app
  // abre em qualquer rota (/admin/relatorios…), então usa caminhos a partir da raiz.
  const demo = import.meta.env.MODE === 'demo';
  if (demo) linkInstallFiles();
  if (!('serviceWorker' in navigator)) return;

  const scriptUrl = demo
    ? new URL('sw.js', window.location.href).href
    : `${import.meta.env.BASE_URL}sw.js`;
  const register = () => {
    navigator.serviceWorker.register(scriptUrl).catch((error: unknown) => {
      console.warn('Não foi possível ativar o modo app (service worker).', error);
    });
  };
  // Depois do carregamento, para não disputar a rede com a primeira tela.
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

/**
 * Na demonstração, o manifest e o ícone do iPhone entram por aqui: o HTML vira um
 * arquivo único e o Vite resolveria esses caminhos a partir da raiz do site.
 */
function linkInstallFiles(): void {
  const files = [
    ['manifest', 'manifest.webmanifest'],
    ['apple-touch-icon', 'icons/apple-touch-icon.png'],
  ] as const;
  for (const [rel, href] of files) {
    if (document.head.querySelector(`link[rel="${rel}"]`)) continue;
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    document.head.append(link);
  }
}
