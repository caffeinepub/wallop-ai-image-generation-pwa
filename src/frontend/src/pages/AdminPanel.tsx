import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertCircle,
  BarChart3,
  Image,
  Loader2,
  MessageSquare,
  X,
} from "lucide-react";
import { useGetAdminContentStats, useIsCallerAdmin } from "../hooks/useQueries";

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();
  const { data: stats, isLoading: statsLoading } = useGetAdminContentStats();

  if (adminLoading || statsLoading) {
    return (
      <div className="container max-w-6xl px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container max-w-6xl px-4 py-8">
        <Alert
          variant="destructive"
          className="bg-red-950/80 border-red-500/50"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-white">
            You do not have admin access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between mb-8 bg-black/80 backdrop-blur-md rounded-lg p-6 border border-white/20">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white">
            Admin Dashboard
          </h1>
          <p className="text-gray-300">Monitor and manage Wall Pop content</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {stats && (
        <div className="space-y-6">
          {/* Limit Status */}
          {stats.limitStats.dailyLimitReached && (
            <Alert
              variant="destructive"
              className="bg-red-950/80 border-red-500/50"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-white">
                Daily generation limit has been reached. New generations will be
                available tomorrow.
              </AlertDescription>
            </Alert>
          )}

          {/* Overview Stats */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-white/20 bg-black/80 backdrop-blur-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-white">Images</CardTitle>
                  <Image className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-300">Published:</span>
                    <span className="font-semibold text-white">
                      {Number(stats.imageStats.published)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-300">Created:</span>
                    <span className="font-semibold text-white">
                      {Number(stats.imageStats.created)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/20 bg-black/80 backdrop-blur-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-white">Prompts</CardTitle>
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-300">Active:</span>
                    <span className="font-semibold text-white">
                      {Number(stats.promptStats.active)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-300">Used:</span>
                    <span className="font-semibold text-white">
                      {Number(stats.promptStats.used)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/20 bg-black/80 backdrop-blur-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-white">Limits</CardTitle>
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-300">Prompt Cap:</span>
                    <span
                      className={`font-semibold ${stats.limitStats.dailyPromptCapReached ? "text-red-400" : "text-green-400"}`}
                    >
                      {stats.limitStats.dailyPromptCapReached
                        ? "Reached"
                        : "OK"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-300">Upload Cap:</span>
                    <span
                      className={`font-semibold ${stats.limitStats.dailyUploadCapReached ? "text-red-400" : "text-green-400"}`}
                    >
                      {stats.limitStats.dailyUploadCapReached
                        ? "Reached"
                        : "OK"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Type Breakdown */}
          <Card className="border-white/20 bg-black/80 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-white">
                Image Types Breakdown
              </CardTitle>
              <CardDescription className="text-gray-300">
                Distribution of images by generation type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3 text-sm text-gray-300">
                    Published Images
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-white">Text to Image:</span>
                      <span className="font-medium text-white">
                        {Number(stats.typeStats.published.textToImage)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-white">
                        Image to Image:
                      </span>
                      <span className="font-medium text-white">
                        {Number(stats.typeStats.published.imageToImage)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-white">
                        Classic Painting:
                      </span>
                      <span className="font-medium text-white">
                        {Number(stats.typeStats.published.classicPainting)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-white">Sketch:</span>
                      <span className="font-medium text-white">
                        {Number(stats.typeStats.published.sketch)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-white">Photo:</span>
                      <span className="font-medium text-white">
                        {Number(stats.typeStats.published.photo)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-white">Mixed Media:</span>
                      <span className="font-medium text-white">
                        {Number(stats.typeStats.published.mixedMedia)}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3 text-sm text-gray-300">
                    All Created Images
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-white">Text to Image:</span>
                      <span className="font-medium text-white">
                        {Number(stats.typeStats.created.textToImage)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-white">
                        Image to Image:
                      </span>
                      <span className="font-medium text-white">
                        {Number(stats.typeStats.created.imageToImage)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-white">
                        Classic Painting:
                      </span>
                      <span className="font-medium text-white">
                        {Number(stats.typeStats.created.classicPainting)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-white">Sketch:</span>
                      <span className="font-medium text-white">
                        {Number(stats.typeStats.created.sketch)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-white">Photo:</span>
                      <span className="font-medium text-white">
                        {Number(stats.typeStats.created.photo)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-white">Mixed Media:</span>
                      <span className="font-medium text-white">
                        {Number(stats.typeStats.created.mixedMedia)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
