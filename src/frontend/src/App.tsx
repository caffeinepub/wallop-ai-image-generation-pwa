import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import Header from './components/Header';
import Footer from './components/Footer';
import ProfileSetup from './components/ProfileSetup';
import HomePage from './pages/HomePage';
import AdminPanel from './pages/AdminPanel';
import { useState } from 'react';

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const [showAdmin, setShowAdmin] = useState(false);

  const isAuthenticated = !!identity;
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  if (isInitializing) {
    return (
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center bg-black/80 backdrop-blur-md rounded-lg p-8 border border-white/20">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent mx-auto" />
            <p className="text-white">Loading Wall Pop...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <div className="flex min-h-screen flex-col bg-background bg-skull-flames bg-cover bg-center bg-fixed">
        <Header onAdminClick={() => setShowAdmin(!showAdmin)} showAdmin={showAdmin} />
        <main className="flex-1">
          {showProfileSetup ? (
            <ProfileSetup />
          ) : showAdmin ? (
            <AdminPanel onClose={() => setShowAdmin(false)} />
          ) : (
            <HomePage />
          )}
        </main>
        <Footer />
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
