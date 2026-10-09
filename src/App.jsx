import { useEffect } from 'react';
import SmoothScroll from './components/SmoothScroll';
import PageEffects from './components/PageEffects';
import ClientsPage from './pages/ClientsPage';
import CareersPage from './pages/CareersPage';
import { scrollToTop } from './utils/smoothScroll';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import SiteHeader from './components/SiteHeader';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ServicePage from './pages/ServicePage';
import AboutPage from './pages/AboutPage';
import GalleryPage from './pages/GalleryPage';
import ContactPage from './pages/ContactPage';
import NotFoundPage from './pages/NotFoundPage';
import ServicesHubPage from './pages/ServicesHubPage';
import CategoryPage from './pages/CategoryPage';
import AdminLogin from './admin/AdminLogin';
import AdminDashboard from './admin/AdminDashboard';
import AdminFloatBar from './admin/AdminFloatBar';
import Analytics from './components/Analytics';


function ScrollToTop() {
  const { pathname, search, hash } = useLocation();
  useEffect(() => {
    // Every page change starts at the top (a #hash is handled by useScrollToHash).
    if (!hash) scrollToTop(true);
  }, [pathname, search]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function App() {
  return (
    <>
    <SmoothScroll />
    <PageEffects />
    <ScrollToTop />
    <AdminFloatBar />
    <Analytics />
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/clients" element={<ClientsPage />} />
      <Route path="/careers" element={<CareersPage />} />
      <Route path="/service" element={<ServicesHubPage />} />
      <Route path="/service/:category" element={<CategoryPage />} />
      <Route path="/services" element={<Navigate to="/service" replace />} />
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
    </>
  );
}
