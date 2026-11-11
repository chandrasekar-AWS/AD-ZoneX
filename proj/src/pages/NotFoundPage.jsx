import ErrorPage from '../components/ErrorPage';

/** Shown for any unmatched route (client-side 404). */
export default function NotFoundPage() {
  return <ErrorPage kind={404} />;
}
