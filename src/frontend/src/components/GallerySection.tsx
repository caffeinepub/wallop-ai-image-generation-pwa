import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Image } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useDeleteImage, useGetPublishedImages } from "../hooks/useQueries";

export default function GallerySection() {
  const { identity } = useInternetIdentity();
  const { data: images, isLoading } = useGetPublishedImages();
  const deleteImage = useDeleteImage();
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);

  const callerPrincipal = identity?.getPrincipal().toString();

  const handleDownload = async (image: Image) => {
    try {
      if (image.blobs.length === 0) {
        toast.error("No image data available");
        return;
      }

      const blob = image.blobs[0];
      const directUrl = blob.getDirectURL();

      // Use a direct anchor download for external URLs
      const a = document.createElement("a");
      a.href = directUrl;
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

  const handleDelete = async (imageId: string) => {
    if (confirm("Are you sure you want to delete this image?")) {
      await deleteImage.mutateAsync(imageId);
      setSelectedImage(null);
    }
  };

  const isOwner = (image: Image) => {
    return image.creator === callerPrincipal;
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-12"
        data-ocid="gallery.loading_state"
      >
        <div className="bg-black/80 backdrop-blur-md rounded-xl p-8 flex flex-col items-center gap-3 border border-white/20">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-white font-bold">Loading gallery...</p>
        </div>
      </div>
    );
  }

  if (!images || images.length === 0) {
    return (
      <Card
        className="border-white/20 bg-black/80 backdrop-blur-md"
        data-ocid="gallery.empty_state"
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="bg-black/60 rounded-full p-6 mb-4 border border-white/20">
            <ImageIcon className="h-12 w-12 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-white">No Images Yet</h3>
          <p className="text-gray-300 font-medium text-center">
            Start generating images to see them appear in your gallery
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image, index) => (
          <Card
            key={image.id}
            data-ocid={`gallery.item.${index + 1}`}
            className="group cursor-pointer overflow-hidden border-white/20 bg-black/80 backdrop-blur-md hover:border-white/50 transition-all"
            onClick={() => setSelectedImage(image)}
          >
            <CardContent className="p-0">
              <div className="relative aspect-square overflow-hidden bg-black/60">
                {image.blobs.length > 0 ? (
                  <img
                    src={image.blobs[0].getDirectURL()}
                    alt={image.prompt}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="p-4 space-y-2 bg-black/80">
                <p className="text-sm font-bold line-clamp-2 text-white">
                  {image.prompt}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="text-xs bg-white/10 text-white border-white/20 font-bold"
                    >
                      {image.imageType}
                    </Badge>
                    {isOwner(image) && (
                      <Badge
                        variant="outline"
                        className="text-xs border-white/30 text-white font-bold"
                      >
                        Yours
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(image);
                    }}
                    data-ocid={`gallery.download_button.${index + 1}`}
                    className="gap-1 bg-black/75 border-white/30 text-white font-bold hover:bg-white hover:text-black text-xs px-2 py-1 h-7"
                  >
                    <Download className="h-3 w-3" />
                    Save
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedImage && (
        <Dialog
          open={!!selectedImage}
          onOpenChange={() => setSelectedImage(null)}
        >
          <DialogContent
            className="max-w-4xl bg-black/95 backdrop-blur-md border-white/20 text-white"
            data-ocid="gallery.dialog"
          >
            <DialogHeader>
              <DialogTitle className="text-white font-bold">
                Image Details
              </DialogTitle>
              <DialogDescription className="text-gray-300 font-medium">
                {selectedImage.prompt}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-black/60 border border-white/20">
                {selectedImage.blobs.length > 0 ? (
                  <img
                    src={selectedImage.blobs[0].getDirectURL()}
                    alt={selectedImage.prompt}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <ImageIcon className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedImage.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-white/10 text-white border-white/20 font-bold"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleDownload(selectedImage)}
                  data-ocid="gallery.download_button"
                  className="flex-1 gap-2 bg-white text-black font-bold hover:bg-gray-200"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                {isOwner(selectedImage) && (
                  <Button
                    onClick={() => handleDelete(selectedImage.id)}
                    variant="destructive"
                    data-ocid="gallery.delete_button"
                    className="gap-2 bg-red-900/80 border-red-500/50 text-white font-bold hover:bg-red-800"
                    disabled={deleteImage.isPending}
                  >
                    {deleteImage.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
