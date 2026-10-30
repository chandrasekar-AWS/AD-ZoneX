import { lazy, Suspense, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SmoothScroll from './components/SmoothScroll';
import PageEffects from './components/PageEffects';
import AdminFloatBar from './admin/AdminFloatBar';
import Analytics from './components/Analytics';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import HomePage from './pages/HomePage';
import { scrollToTop } from './utils/smoothScroll';
import { useContent } from './context/ContentContext';

// Every page except Home is loaded only when it is first needed, so the first visit downloads far less.
// After the Home page has settled, the other public pages are fetched quietly in the background,
// so moving around the site feels instant.
const page = (loader) => { const C = lazy(loader); C.preload = loader; return C; };
const AboutPage = page(() => import('./pages/AboutPage'));
const ClientsPage = page(() => import('./pages/ClientsPage'));
const CareersPage = page(() => import('./pages/CareersPage'));
const ProfilePage = page(() => import('./pages/ProfilePage'));
const ServicesHubPage = page(() => import('./pages/ServicesHubPage'));
const CategoryPage = page(() => import('./pages/CategoryPage'));
const ServicePage = page(() => import('./pages/ServicePage'));
const AwsCloudPage = page(() => import('./pages/AwsCloudPage'));
const GalleryPage = page(() => import('./pages/GalleryPage'));
const ContactPage = page(() => import('./pages/ContactPage'));
const NotFoundPage = page(() => import('./pages/NotFoundPage'));
const AdminLogin = page(() => import('./admin/AdminLogin'));
const AdminDashboard = page(() => import('./admin/AdminDashboard'));
const PUBLIC_PAGES = [AboutPage, ServicesHubPage, GalleryPage, ContactPage, CategoryPage, ServicePage, ClientsPage, CareersPage, ProfilePage, AwsCloudPage];

function ScrollToTop() {
  const { pathname, search, hash } = useLocation();
  useEffect(() => {
    // Every page change starts at the top (a #hash is handled by useScrollToHash).
    if (!hash) scrollToTop(true);
  }, [pathname, search]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// Which page file belongs to which address, so a page can be fetched the moment someone points at its link.
const ROUTE_PRELOAD = [
  [/^\/about\/?$/, AboutPage], [/^\/clients\/?$/, ClientsPage], [/^\/careers\/?$/, CareersPage], [/^\/profile\/?$/, ProfilePage],
  [/^\/service\/?$/, ServicesHubPage], [/^\/service\/[^/]+\/?$/, CategoryPage],
  [/^\/services\/aws-cloud-services\/?$/, AwsCloudPage], [/^\/services\/[^/]+\/?$/, ServicePage],
  [/^\/gallery\/?$/, GalleryPage], [/^\/contact\/?$/, ContactPage],
];
const preloadPath = (path) => { const hit = ROUTE_PRELOAD.find(([re]) => re.test(path)); if (hit) hit[1].preload().catch(() => {}); };
const saveData = () => { const c = navigator.connection; return !!(c?.saveData || /(^|-)(2g|3g)$/.test(c?.effectiveType || '')); };
const whenIdle = (fn, timeout = 1200) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout }) : setTimeout(fn, 300));

/**
 * Loads pages ahead of the click so a page change never waits for anything:
 *  1. pointing at (or touching, or tabbing to) a link fetches that page straight away;
 *  2. a moment after the first screen is shown, every other public page is fetched quietly.
 * Skipped on data-saver / very slow connections.
 */
function PreloadPages() {
  const { pathname } = useLocation();
  const inAdmin = pathname.startsWith('/admin');
  useEffect(() => {
    if (inAdmin) return undefined;
    const onIntent = (e) => {
      const a = e.target instanceof Element ? e.target.closest('a[href^="/"]') : null;
      if (a) preloadPath(a.getAttribute('href').split(/[?#]/)[0]);
    };
    const evs = ['pointerover', 'touchstart', 'focusin'];
    evs.forEach((ev) => document.addEventListener(ev, onIntent, { passive: true, capture: true }));
    return () => evs.forEach((ev) => document.removeEventListener(ev, onIntent, { capture: true }));
  }, [inAdmin]);
  useEffect(() => {
    if (inAdmin || navigator.connection?.saveData) return undefined;
    const timers = [];
    const id = whenIdle(() => PUBLIC_PAGES.forEach((p, i) => timers.push(setTimeout(() => p.preload().catch(() => {}), i * 60))), 1500);
    return () => { timers.forEach(clearTimeout); if ('cancelIdleCallback' in window) cancelIdleCallback(id); };
  }, [inAdmin]);
  return null;
}

const warmed = new Set();
const warmRefs = [];
/**
 * Pictures are downloaded in the background right after the first screen is shown (a few at a time), so when someone
 * opens Services, Gallery, About, etc. the photos are already in the browser and appear instantly.
 */
function WarmImages() {
  const { pathname } = useLocation();
  const inAdmin = pathname.startsWith('/admin');
  const { sessions, gallery, clients, profile } = useContent();
  const urls = useMemo(() => {
    const set = new Set();
    const add = (u) => { if (typeof u === 'string' && u.startsWith('/')) set.add(u); };
    sessions.forEach((s) => s.services.forEach((sv) => (sv.images?.length ? sv.images : [sv.image]).forEach(add)));
    gallery.slice(0, 80).forEach((g) => add(g.image));
    profile.people.forEach((p) => add(p.photo));
    profile.works.slice(0, 12).forEach((w) => add(w.image));
    clients.slice(0, 80).forEach((c) => add(c.image));
    return [...set];
  }, [sessions, gallery, clients, profile]);
  const key = urls.join('|');
  useEffect(() => {
    if (inAdmin || saveData()) return undefined;
    let dead = false;
    let timer = 0;
    const queue = urls.filter((u) => !warmed.has(u));
    const next = () => {
      if (dead || !queue.length) return;
      queue.splice(0, 3).forEach((u) => {
        warmed.add(u);
        const im = new Image();
        im.decoding = 'async';
        im.src = u;
        warmRefs.push(im);
        if (warmRefs.length > 200) warmRefs.shift();
      });
      timer = setTimeout(() => whenIdle(next, 800), 80);
    };
    const id = whenIdle(next, 1500);
    return () => { dead = true; clearTimeout(timer); if ('cancelIdleCallback' in window) cancelIdleCallback(id); };
  }, [key, inAdmin]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Shown for a split second while a page's code arrives. */
function RouteLoading() {
  return <div className="route-loading" role="status" aria-label="Loading page"><span /></div>;
}

export default function App() {
  return (
    <>
      <SmoothScroll />
      <PageEffects />
      <ScrollToTop />
      <PreloadPages />
      <WarmImages />
      <AdminFloatBar />
      <Analytics />
      <FloatingWhatsApp />
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/service" element={<ServicesHubPage />} />
          <Route path="/service/:category" element={<CategoryPage />} />
          <Route path="/services" element={<Navigate to="/service" replace />} />
          <Route path="/services/aws-cloud-services" element={<AwsCloudPage />} />
          <Route path="/services/:slug" element={<ServicePage />} />
          <Route path="/design" element={<Navigate to="/service#design" replace />} />
          <Route path="/print" element={<Navigate to="/service#print" replace />} />
          <Route path="/signage" element={<Navigate to="/service#signage" replace />} />
          <Route path="/digital" element={<Navigate to="/service#digital" replace />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/projects" element={<Navigate to="/gallery" replace />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
