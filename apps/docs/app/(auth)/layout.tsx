import type { Metadata } from 'next';

/**
 * Auth route group layout.
 * Disables search-engine indexing for all auth pages and provides a common
 * attachment point for future shared concerns (analytics, i18n, etc.).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
