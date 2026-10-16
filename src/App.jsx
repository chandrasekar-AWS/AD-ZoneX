import { lazy, Suspense, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SmoothScroll from './components/SmoothScroll';
import PageEffects from './components/PageEffects';
import AdminFloatBar from './admin/AdminFloatBar';
import Analytics from './components/Analytics';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import HomePage from './pages/HomePage';
import { scrollToTop } from './utils/smoothScroll';

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
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    document.documentElement.classList.add('nav-ready');
  }, [pathname]);
  useEffect(() => {
    // Every page change starts at the top (a #hash is handled by useScrollToHash).
    if (!hash) scrollToTop(true);
  }, [pathname, search]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Quietly loads the other pages once the browser is idle (skipped on slow or data-saving connections). */
function PreloadPages() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.startsWith('/admin')) return undefined;
    const conn = navigator.connection;
    if (conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType || '')) return undefined;
    const run = () => PUBLIC_PAGES.forEach((p, i) => setTimeout(() => p.preload().catch(() => {}), i * 150));
    const id = 'requestIdleCallback' in window ? requestIdleCallback(run, { timeout: 4000 }) : setTimeout(run, 2500);
    return () => ('cancelIdleCallback' in window ? cancelIdleCallback(id) : clearTimeout(id));
  }, [pathname]);
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
