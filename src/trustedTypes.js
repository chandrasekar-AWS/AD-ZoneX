// Trusted Types: the site's security headers ask the browser to block "string to script" injection (a common XSS route).
// The only script the site ever creates itself is Google Analytics (optional) and that must come from our own origin
// or Google Tag Manager. Anything else is refused. This file must be the FIRST import in main.jsx.
if (typeof window !== 'undefined' && window.trustedTypes?.createPolicy) {
  try {
    window.trustedTypes.createPolicy('default', {
      createScriptURL(url) {
        const u = new URL(url, window.location.href);
        if (u.origin === window.location.origin || ['https://www.googletagmanager.com', 'https://challenges.cloudflare.com'].includes(u.origin)) return u.href;
        throw new TypeError('Blocked script URL: ' + u.origin);
      },
    });
  } catch { /* policy already exists (hot reload) */ }
}
