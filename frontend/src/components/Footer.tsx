import { Heart } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const appIdentifier = typeof window !== 'undefined' 
    ? encodeURIComponent(window.location.hostname) 
    : 'wall-pop';

  return (
    <footer className="border-t border-white/20 bg-black/80 backdrop-blur-md">
      <div className="container flex h-14 items-center justify-center px-4">
        <p className="text-sm text-gray-300 flex items-center gap-1.5 bg-black/70 px-4 py-2 rounded-lg">
          © {currentYear}. Built with <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" /> using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${appIdentifier}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-white hover:underline transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </footer>
  );
}
