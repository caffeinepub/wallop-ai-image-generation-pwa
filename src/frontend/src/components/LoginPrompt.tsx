import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Download, Image as ImageIcon, Wand2 } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LoginPrompt() {
  const { login, loginStatus } = useInternetIdentity();

  const handleLogin = async () => {
    try {
      await login();
    } catch (error: any) {
      console.error("Login error:", error);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] px-4 py-12">
      <div className="container max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16 bg-black/80 backdrop-blur-md rounded-2xl p-8 border border-white/10">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center">
            <img
              src="/assets/generated/wallop-logo-bw.dim_200x200.png"
              alt="Wall Pop Logo"
              className="h-20 w-20"
            />
          </div>
          <h1 className="text-5xl font-bold mb-4 text-white">
            Welcome to Wall Pop
          </h1>
          <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
            Create stunning AI-generated images from text prompts or existing
            images. Unlimited creativity at your fingertips.
          </p>
          <Button
            onClick={handleLogin}
            disabled={loginStatus === "logging-in"}
            size="lg"
            className="text-lg px-8 py-6 h-auto bg-white text-black hover:bg-gray-200"
          >
            {loginStatus === "logging-in" ? "Connecting..." : "Get Started"}
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="border-white/20 bg-black/80 backdrop-blur-md">
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                <Wand2 className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-white">Text to Image</CardTitle>
              <CardDescription className="text-gray-300">
                Describe your vision and watch AI bring it to life with stunning
                detail
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-white/20 bg-black/80 backdrop-blur-md">
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                <ImageIcon className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-white">Image to Image</CardTitle>
              <CardDescription className="text-gray-300">
                Upload an image and transform it into new artistic variations
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-white/20 bg-black/80 backdrop-blur-md">
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                <Download className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-white">Save & Download</CardTitle>
              <CardDescription className="text-gray-300">
                Keep your creations forever with easy download and gallery
                features
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Sample Images */}
        <div className="text-center bg-black/80 backdrop-blur-md rounded-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold mb-6 text-white">
            See What's Possible
          </h2>
          <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
            <img
              src="/assets/generated/sample-art-1.dim_512x512.png"
              alt="Sample AI art 1"
              className="rounded-lg border border-white/20 w-full h-auto"
            />
            <img
              src="/assets/generated/sample-art-2.dim_512x512.png"
              alt="Sample AI art 2"
              className="rounded-lg border border-white/20 w-full h-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
