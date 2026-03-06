import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useIsCallerAdmin } from "../hooks/useQueries";

interface HeaderProps {
  onAdminClick: () => void;
  showAdmin: boolean;
}

export default function Header({ onAdminClick, showAdmin }: HeaderProps) {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const { data: isAdmin } = useIsCallerAdmin();
  const queryClient = useQueryClient();

  const isAuthenticated = !!identity;
  const disabled = loginStatus === "logging-in";
  const buttonText =
    loginStatus === "logging-in"
      ? "Connecting..."
      : isAuthenticated
        ? "Logout"
        : "Login";

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (error: any) {
        console.error("Login error:", error);
        if (error.message === "User is already authenticated") {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-black/90 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3 bg-black/70 px-4 py-2 rounded-lg border border-white/10">
          <div className="flex h-10 w-10 items-center justify-center">
            <img
              src="/assets/generated/wallop-logo-bw.dim_200x200.png"
              alt="Wall Pop Logo"
              className="h-10 w-10"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              Wall Pop
            </h1>
            <p className="text-xs text-gray-300 font-medium">
              AI Image Generation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant={showAdmin ? "default" : "outline"}
              size="sm"
              onClick={onAdminClick}
              className={`gap-2 font-bold border-white/30 ${
                showAdmin
                  ? "bg-white text-black hover:bg-gray-200"
                  : "bg-black/75 text-white hover:bg-white hover:text-black"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          )}
          <Button
            onClick={handleAuth}
            disabled={disabled}
            size="sm"
            className={`font-bold border border-white/30 ${
              isAuthenticated
                ? "bg-black/75 text-white hover:bg-white hover:text-black"
                : "bg-white text-black hover:bg-gray-200"
            }`}
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </header>
  );
}
