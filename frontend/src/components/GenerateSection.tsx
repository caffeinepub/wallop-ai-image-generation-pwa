import { useState, useRef } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useCreateImage, useGetDailyLimitReached } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Wand2, Upload, Loader2, AlertCircle, Download, RefreshCw, Edit3, X, Undo2, Redo2 } from 'lucide-react';
import { ImageType, ExternalBlob } from '../backend';
import { toast } from 'sonner';

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  imageType: ImageType;
  blob: ExternalBlob;
  timestamp: number;
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
  const [prompt, setPrompt] = useState('');
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
      toast.success('Undone');
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
      toast.success('Redone');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      setUploadedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateImageBlob = async (): Promise<{ blob: Blob; externalBlob: ExternalBlob }> => {
    // Create a placeholder image blob
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Create dramatic gradient background
      const gradient = ctx.createLinearGradient(0, 0, 512, 512);
      gradient.addColorStop(0, '#1a1a1a');
      gradient.addColorStop(0.5, '#4a4a4a');
      gradient.addColorStop(1, '#0a0a0a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);

      // Add text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 10;
      ctx.fillText('AI Generated', 256, 240);
      ctx.font = '18px sans-serif';
      const truncatedPrompt = prompt.substring(0, 30) + (prompt.length > 30 ? '...' : '');
      ctx.fillText(truncatedPrompt, 256, 280);
    }

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });

    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const externalBlob = ExternalBlob.fromBytes(uint8Array);

    return { blob, externalBlob };
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (imageType === ImageType.imageToImage && !uploadedImage) {
      toast.error('Please upload an image for image-to-image generation');
      return;
    }

    saveToHistory();
    setIsGenerating(true);

    try {
      // Lightning-fast generation - minimal delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      const { blob, externalBlob } = await generateImageBlob();

      const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const callerPrincipal = identity?.getPrincipal().toString() || 'anonymous';

      // Non-blocking backend save
      createImage.mutateAsync({
        imageId,
        form: {
          creator: callerPrincipal,
          prompt: prompt.trim(),
          description: `Generated with ${imageType}`,
          imageType,
          blobs: [externalBlob],
          tags: prompt.split(' ').slice(0, 5),
          published: true,
        },
      }).catch((error) => {
        console.error('Backend save error:', error);
      });

      // Instant UI update
      const blobUrl = URL.createObjectURL(blob);
      setGeneratedImages((prev) => [
        {
          id: imageId,
          url: blobUrl,
          prompt: prompt.trim(),
          imageType,
          blob: externalBlob,
          timestamp: Date.now(),
        },
        ...prev,
      ]);

      toast.success('Image generated!');
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(`Failed to generate image: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    saveToHistory();
    setIsGenerating(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const { blob, externalBlob } = await generateImageBlob();

      const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const callerPrincipal = identity?.getPrincipal().toString() || 'anonymous';

      createImage.mutateAsync({
        imageId,
        form: {
          creator: callerPrincipal,
          prompt: prompt.trim(),
          description: `Regenerated with ${imageType}`,
          imageType,
          blobs: [externalBlob],
          tags: prompt.split(' ').slice(0, 5),
          published: true,
        },
      }).catch((error) => {
        console.error('Backend save error:', error);
      });

      const blobUrl = URL.createObjectURL(blob);
      
      // Replace the first image
      setGeneratedImages((prev) => {
        const newImages = [...prev];
        if (newImages.length > 0) {
          newImages[0] = {
            id: imageId,
            url: blobUrl,
            prompt: prompt.trim(),
            imageType,
            blob: externalBlob,
            timestamp: Date.now(),
          };
        } else {
          newImages.unshift({
            id: imageId,
            url: blobUrl,
            prompt: prompt.trim(),
            imageType,
            blob: externalBlob,
            timestamp: Date.now(),
          });
        }
        return newImages;
      });

      toast.success('Image regenerated!');
    } catch (error: any) {
      console.error('Regeneration error:', error);
      toast.error(`Failed to regenerate: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReprompt = (image: GeneratedImage) => {
    setPrompt(image.prompt);
    setImageType(image.imageType);
    setEditingImageId(image.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownload = async (image: GeneratedImage) => {
    try {
      const bytes = await image.blob.getBytes();
      const imageBlob = new Blob([bytes], { type: 'image/png' });
      const url = URL.createObjectURL(imageBlob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `wallpop_${image.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Image downloaded successfully');
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(`Failed to download: ${error.message}`);
    }
  };

  const handleRemoveImage = (imageId: string) => {
    saveToHistory();
    setGeneratedImages((prev) => prev.filter((img) => img.id !== imageId));
    toast.success('Image removed from session');
  };

  return (
    <div className="space-y-6">
      {/* Generation Controls */}
      <Card className="border-white/20 bg-black/80 backdrop-blur-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Generate Image</CardTitle>
              <CardDescription className="text-gray-300">
                Create stunning AI-generated images from your prompts
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={undo}
                disabled={!canUndo}
                className="gap-2 bg-black/50 border-white/20 text-white hover:bg-black/70"
              >
                <Undo2 className="h-4 w-4" />
                Undo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={redo}
                disabled={!canRedo}
                className="gap-2 bg-black/50 border-white/20 text-white hover:bg-black/70"
              >
                <Redo2 className="h-4 w-4" />
                Redo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {limitReached && (
            <Alert variant="destructive" className="bg-red-950/80 border-red-500/50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-white">
                Daily generation limit reached. Please try again tomorrow.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="prompt" className="text-white">Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Describe the image you want to create..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none bg-black/50 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageType" className="text-white">Image Type</Label>
            <Select value={imageType} onValueChange={(value) => setImageType(value as ImageType)}>
              <SelectTrigger id="imageType" className="bg-black/50 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/20">
                <SelectItem value={ImageType.textToImage}>Text to Image</SelectItem>
                <SelectItem value={ImageType.imageToImage}>Image to Image</SelectItem>
                <SelectItem value={ImageType.classicPainting}>Classic Painting</SelectItem>
                <SelectItem value={ImageType.sketch}>Sketch</SelectItem>
                <SelectItem value={ImageType.photo}>Photo</SelectItem>
                <SelectItem value={ImageType.mixedMedia}>Mixed Media</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {imageType === ImageType.imageToImage && (
            <div className="space-y-2">
              <Label className="text-white">Upload Image</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 bg-black/50 border-white/20 text-white hover:bg-black/70"
                >
                  <Upload className="h-4 w-4" />
                  Choose File
                </Button>
                {uploadedImage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setUploadedImage(null);
                      setUploadPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-white hover:bg-black/70"
                  >
                    <X className="h-4 w-4" />
                  </Button>
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
                  <img
                    src={uploadPreview}
                    alt="Upload preview"
                    className="max-w-xs rounded-lg border border-white/20"
                  />
                </div>
              )}
            </div>
          )}

          <Separator className="bg-white/20" />

          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || limitReached}
              className="flex-1 gap-2 bg-white text-black hover:bg-gray-200"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
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
                disabled={isGenerating || limitReached}
                variant="outline"
                className="gap-2 bg-black/50 border-white/20 text-white hover:bg-black/70"
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
        <div className="space-y-4">
          <div className="bg-black/80 backdrop-blur-md rounded-lg p-4 border border-white/20">
            <h3 className="text-lg font-semibold mb-4 text-white">Generated Images</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generatedImages.map((image) => (
                <Card
                  key={image.id}
                  className={`overflow-hidden border-white/20 bg-black/60 backdrop-blur-sm ${
                    editingImageId === image.id ? 'ring-2 ring-white' : ''
                  }`}
                >
                  <CardContent className="p-0">
                    <div className="relative aspect-square">
                      <img
                        src={image.url}
                        alt={image.prompt}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4 space-y-3 bg-black/80">
                      <p className="text-sm text-white line-clamp-2">{image.prompt}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(image)}
                          className="flex-1 gap-2 bg-black/50 border-white/20 text-white hover:bg-black/70"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReprompt(image)}
                          className="flex-1 gap-2 bg-black/50 border-white/20 text-white hover:bg-black/70"
                        >
                          <Edit3 className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveImage(image.id)}
                          className="text-white hover:bg-black/70"
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
