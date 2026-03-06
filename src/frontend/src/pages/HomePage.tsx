import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image, Wand2 } from "lucide-react";
import { useState } from "react";
import GallerySection from "../components/GallerySection";
import GenerateSection from "../components/GenerateSection";
import LoginPrompt from "../components/LoginPrompt";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function HomePage() {
  const { identity } = useInternetIdentity();
  const [activeTab, setActiveTab] = useState("generate");

  const isAuthenticated = !!identity;

  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  return (
    <div className="container max-w-6xl px-4 py-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-black/80 backdrop-blur-md rounded-lg p-2 mb-6 border border-white/20">
          <TabsList className="grid w-full grid-cols-2 bg-transparent">
            <TabsTrigger
              value="generate"
              className="gap-2 data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              <Wand2 className="h-4 w-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger
              value="gallery"
              className="gap-2 data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              <Image className="h-4 w-4" />
              Gallery
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="generate" className="mt-0">
          <GenerateSection />
        </TabsContent>

        <TabsContent value="gallery" className="mt-0">
          <GallerySection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
