import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Image, ImageFormData, PromptFormData, Prompt, UserProfile, ImageType } from '../backend';
import { toast } from 'sonner';

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      toast.success('Profile saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save profile: ${error.message}`);
    },
  });
}

// Admin Queries
export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAdminContentStats() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['adminContentStats'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAdminContentStats();
    },
    enabled: !!actor && !isFetching,
  });
}

// Image Queries
export function useGetPublishedImages() {
  const { actor, isFetching } = useActor();

  return useQuery<Image[]>({
    queryKey: ['publishedImages'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPublishedImages();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPublishedImagesByType(imageType: ImageType) {
  const { actor, isFetching } = useActor();

  return useQuery<Image[]>({
    queryKey: ['publishedImages', imageType],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPublishedImagesByType(imageType);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSearchImages(searchTerm: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Image[]>({
    queryKey: ['searchImages', searchTerm],
    queryFn: async () => {
      if (!actor) return [];
      if (!searchTerm) return [];
      return actor.searchImages(searchTerm);
    },
    enabled: !!actor && !isFetching && !!searchTerm,
  });
}

export function useGetAllImageTags() {
  const { actor, isFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ['imageTags'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllImageTags();
    },
    enabled: !!actor && !isFetching,
  });
}

// Image Mutations
export function useCreateImage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ imageId, form }: { imageId: string; form: ImageFormData }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createImage(imageId, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publishedImages'] });
      queryClient.invalidateQueries({ queryKey: ['adminContentStats'] });
      toast.success('Image created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create image: ${error.message}`);
    },
  });
}

export function useDeleteImage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteImage(imageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publishedImages'] });
      queryClient.invalidateQueries({ queryKey: ['adminContentStats'] });
      toast.success('Image deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete image: ${error.message}`);
    },
  });
}

export function useUnpublishImage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.unpublishImage(imageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publishedImages'] });
      queryClient.invalidateQueries({ queryKey: ['adminContentStats'] });
      toast.success('Image unpublished successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to unpublish image: ${error.message}`);
    },
  });
}

// Prompt Queries
export function useGetActivePrompts() {
  const { actor, isFetching } = useActor();

  return useQuery<Prompt[]>({
    queryKey: ['activePrompts'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActivePrompts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreatePrompt() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ promptId, form }: { promptId: string; form: PromptFormData }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createPrompt(promptId, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activePrompts'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create prompt: ${error.message}`);
    },
  });
}

export function useCompletePrompt() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (promptId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.completePrompt(promptId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activePrompts'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete prompt: ${error.message}`);
    },
  });
}

// Limit Queries
export function useGetDailyLimitReached() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['dailyLimitReached'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.getDailyLimitReached();
    },
    enabled: !!actor && !isFetching,
  });
}
