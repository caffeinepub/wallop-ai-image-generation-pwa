import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Download,
  Edit3,
  Loader2,
  Redo2,
  RefreshCw,
  Undo2,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob, ImageType } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useCreateImage, useGetDailyLimitReached } from "../hooks/useQueries";

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  imageType: ImageType;
  timestamp: number;
  isLoading?: boolean;
}

interface HistoryState {
  images: GeneratedImage[];
  prompt: string;
  imageType: ImageType;
  uploadedImage: File | null;
  uploadPreview: string | null;
}

export default function GenerateSection() {
  const { identity } = useInternetIdentity();
  const [prompt, setPrompt] = useState("");
  const [imageType, setImageType] = useState<ImageType>(ImageType.textToImage);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Undo/Redo state management
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const createImage = useCreateImage();
  const { data: limitReached } = useGetDailyLimitReached();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const saveToHistory = () => {
    const currentState: HistoryState = {
      images: generatedImages,
      prompt,
      imageType,
      uploadedImage,
      uploadPreview,
    };

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (canUndo) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      setGeneratedImages(state.images);
      setPrompt(state.prompt);
      setImageType(state.imageType);
      setUploadedImage(state.uploadedImage);
      setUploadPreview(state.uploadPreview);
      setHistoryIndex(newIndex);
      toast.success("Undone");
    }
  };

  const redo = () => {
    if (canRedo) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      setGeneratedImages(state.images);
      setPrompt(state.prompt);
      setImageType(state.imageType);
      setUploadedImage(state.uploadedImage);
      setUploadPreview(state.uploadPreview);
      setHistoryIndex(newIndex);
      toast.success("Redone");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      setUploadedImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const buildPollinationsUrl = (promptText: string): string => {
    const seed = Math.floor(Math.random() * 999999);
    // Map image type to style modifier
    const styleModifiers: Record<ImageType, string> = {
      [ImageType.textToImage]: "",
      [ImageType.imageToImage]: uploadedImage
        ? " (based on uploaded image style)"
        : "",
      [ImageType.classicPainting]: ", oil painting, classical art style",
      [ImageType.sketch]: ", pencil sketch, hand-drawn illustration",
      [ImageType.photo]: ", photorealistic, professional photography, 4K",
      [ImageType.mixedMedia]: ", mixed media art, experimental style",
    };

    const modifier = styleModifiers[imageType] || "";
    const fullPrompt = promptText.trim() + modifier;

    return `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=512&height=512&nologo=true&seed=${seed}`;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    saveToHistory();
    setIsGenerating(true);

    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const imageUrl = buildPollinationsUrl(prompt);

    // Add to list immediately with isLoading = true
    setGeneratedImages((prev) => [
      {
        id: imageId,
        url: imageUrl,
        prompt: prompt.trim(),
        imageType,
        timestamp: Date.now(),
        isLoading: true,
      },
      ...prev,
    ]);
  };

  const handleImageLoad = (imageId: string, imageUrl: string) => {
    setIsGenerating(false);
    // Mark image as loaded
    setGeneratedImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, isLoading: false } : img,
      ),
    );

    toast.success("Image generated!");

    // Auto-save to gallery (non-blocking)
    const callerPrincipal = identity?.getPrincipal().toString() || "anonymous";
    const externalBlob = ExternalBlob.fromURL(imageUrl);
    createImage
      .mutateAsync({
        imageId,
        form: {
          creator: callerPrincipal,
          prompt: prompt.trim(),
          description: `Generated with ${imageType}`,
          imageType,
          blobs: [externalBlob],
          tags: prompt.split(" ").slice(0, 5),
          published: true,
        },
      })
      .catch((error) => {
        console.error("Backend save error:", error);
      });
  };

  const handleImageError = (imageId: string) => {
    setIsGenerating(false);
    setGeneratedImages((prev) => prev.filter((img) => img.id !== imageId));
    toast.error(
      "Failed to generate image. Please try again with a different prompt.",
    );
  };

  const handleRegenerate = () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    saveToHistory();
    setIsGenerating(true);

    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const imageUrl = buildPollinationsUrl(prompt);

    // Replace the first image or add new
    setGeneratedImages((prev) => {
      const newImages = [...prev];
      const newImage: GeneratedImage = {
        id: imageId,
        url: imageUrl,
        prompt: prompt.trim(),
        imageType,
        timestamp: Date.now(),
        isLoading: true,
      };
      if (newImages.length > 0) {
        newImages[0] = newImage;
      } else {
        newImages.unshift(newImage);
      }
      return newImages;
    });
  };

  const handleReprompt = (image: GeneratedImage) => {
    setPrompt(image.prompt);
    setImageType(image.imageType);
    setEditingImageId(image.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDownload = (image: GeneratedImage) => {
    try {
      const a = document.createElement("a");
      a.href = image.url;
      a.download = `wallpop_${image.id}.png`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Image downloaded successfully");
    } catch (error: any) {
      console.error("Download error:", error);
      toast.error(`Failed to download: ${error.message}`);
    }
  };

  const handleRemoveImage = (imageId: string) => {
    saveToHistory();
    setGeneratedImages((prev) => prev.filter((img) => img.id !== imageId));
    toast.success("Image removed from session");
  };

  return (
    <div className="space-y-6">
      {/* Generation Controls */}
      <Card className="border-white/20 bg-black/80 backdrop-blur-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white font-bold">
                Generate Image
              </CardTitle>
              <CardDescription className="text-gray-300 font-medium">
                Create stunning AI-generated images from your prompts
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={undo}
                disabled={!canUndo}
                data-ocid="generate.undo_button"
                className="gap-2 bg-black/75 border-white/30 text-white font-bold hover:bg-white hover:text-black"
              >
                <Undo2 className="h-4 w-4" />
                Undo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={redo}
                disabled={!canRedo}
                data-ocid="generate.redo_button"
                className="gap-2 bg-black/75 border-white/30 text-white font-bold hover:bg-white hover:text-black"
              >
                <Redo2 className="h-4 w-4" />
                Redo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {limitReached && (
            <Alert
              variant="destructive"
              className="bg-red-950/80 border-red-500/50"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-white font-bold">
                Daily generation limit reached. Please try again tomorrow.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label
              htmlFor="prompt"
              className="text-white font-bold text-sm bg-black/60 px-2 py-1 rounded inline-block"
            >
              Prompt
            </Label>
            <Textarea
              id="prompt"
              data-ocid="generate.prompt_input"
              placeholder="Describe the image you want to create..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none bg-black/75 backdrop-blur-sm border-white/30 text-white font-medium placeholder:text-gray-400 focus:border-white/60"
            />
          </div>

          {/* Image Upload — always visible */}
          <div className="space-y-2">
            <Label className="text-white font-bold text-sm bg-black/60 px-2 py-1 rounded inline-block">
              Reference Image{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                data-ocid="generate.upload_button"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 bg-black/75 backdrop-blur-sm border-white/30 text-white font-bold hover:bg-white hover:text-black"
              >
                <Upload className="h-4 w-4" />
                {uploadedImage ? "Change Image" : "Upload Image"}
              </Button>
              {uploadedImage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setUploadedImage(null);
                    setUploadPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="bg-black/75 text-white hover:bg-white hover:text-black border border-white/30"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {uploadPreview && (
                <img
                  src={uploadPreview}
                  alt="Upload preview"
                  className="h-12 w-12 rounded-md border border-white/30 object-cover"
                />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            {uploadPreview && (
              <div className="mt-2">
                <p className="text-xs text-gray-400 font-medium bg-black/60 px-2 py-1 rounded inline-block">
                  {uploadedImage?.name} — will influence generation style
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="imageType"
              className="text-white font-bold text-sm bg-black/60 px-2 py-1 rounded inline-block"
            >
              Art Style
            </Label>
            <Select
              value={imageType}
              onValueChange={(value) => setImageType(value as ImageType)}
            >
              <SelectTrigger
                id="imageType"
                data-ocid="generate.style_select"
                className="bg-black/75 backdrop-blur-sm border-white/30 text-white font-bold hover:border-white/60"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black/95 backdrop-blur-md border-white/30">
                <SelectItem
                  value={ImageType.textToImage}
                  className="text-white font-medium focus:bg-white/20 focus:text-white"
                >
                  Text to Image
                </SelectItem>
                <SelectItem
                  value={ImageType.imageToImage}
                  className="text-white font-medium focus:bg-white/20 focus:text-white"
                >
                  Image to Image
                </SelectItem>
                <SelectItem
                  value={ImageType.classicPainting}
                  className="text-white font-medium focus:bg-white/20 focus:text-white"
                >
                  Classic Painting
                </SelectItem>
                <SelectItem
                  value={ImageType.sketch}
                  className="text-white font-medium focus:bg-white/20 focus:text-white"
                >
                  Sketch
                </SelectItem>
                <SelectItem
                  value={ImageType.photo}
                  className="text-white font-medium focus:bg-white/20 focus:text-white"
                >
                  Photo
                </SelectItem>
                <SelectItem
                  value={ImageType.mixedMedia}
                  className="text-white font-medium focus:bg-white/20 focus:text-white"
                >
                  Mixed Media
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-white/20" />

          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !!limitReached}
              data-ocid="generate.primary_button"
              className="flex-1 gap-2 bg-white text-black font-bold hover:bg-gray-200 hover:text-black"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
            {generatedImages.length > 0 && (
              <Button
                onClick={handleRegenerate}
                disabled={isGenerating || !!limitReached}
                variant="outline"
                data-ocid="generate.regenerate_button"
                className="gap-2 bg-black/75 backdrop-blur-sm border-white/30 text-white font-bold hover:bg-white hover:text-black"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generated Images */}
      {generatedImages.length > 0 && (
        <div className="space-y-4" data-ocid="generate.image_result">
          <div className="bg-black/80 backdrop-blur-md rounded-lg p-4 border border-white/20">
            <h3 className="text-lg font-bold mb-4 text-white">
              Generated Images
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generatedImages.map((image, index) => (
                <Card
                  key={image.id}
                  className={`overflow-hidden border-white/20 bg-black/60 backdrop-blur-sm ${
                    editingImageId === image.id ? "ring-2 ring-white" : ""
                  }`}
                >
                  <CardContent className="p-0">
                    <div className="relative aspect-square bg-black/80">
                      {/* Always render the img for loading, show spinner overlay on top */}
                      <img
                        src={image.url}
                        alt={image.prompt}
                        className={`w-full h-full object-cover transition-opacity duration-500 ${
                          image.isLoading ? "opacity-0" : "opacity-100"
                        }`}
                        onLoad={() => handleImageLoad(image.id, image.url)}
                        onError={() => handleImageError(image.id)}
                      />
                      {image.isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                          <Loader2 className="h-12 w-12 animate-spin text-white mb-3" />
                          <p className="text-white font-bold text-sm bg-black/60 px-3 py-1 rounded">
                            Processing...
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="p-4 space-y-3 bg-black/80">
                      <p className="text-sm text-white font-medium line-clamp-2">
                        {image.prompt}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(image)}
                          disabled={image.isLoading}
                          data-ocid={`generate.download_button.${index + 1}`}
                          className="flex-1 gap-2 bg-black/75 border-white/30 text-white font-bold hover:bg-white hover:text-black"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReprompt(image)}
                          disabled={image.isLoading}
                          className="flex-1 gap-2 bg-black/75 border-white/30 text-white font-bold hover:bg-white hover:text-black"
                        >
                          <Edit3 className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveImage(image.id)}
                          disabled={image.isLoading}
                          className="bg-black/75 border border-white/20 text-white font-bold hover:bg-white hover:text-black"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
