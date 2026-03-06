import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export type Time = bigint;
export interface ImageFormData {
    creator: string;
    imageType: ImageType;
    published: boolean;
    tags: Array<string>;
    description: string;
    blobs: Array<ExternalBlob>;
    prompt: string;
}
export interface PromptFormData {
    creator: string;
    imageType: ImageType;
    prompt: string;
}
export interface Image {
    id: string;
    creator: string;
    imageType: ImageType;
    views: bigint;
    published: boolean;
    tags: Array<string>;
    description: string;
    timestamp: Time;
    blobs: Array<ExternalBlob>;
    prompt: string;
    downloads: bigint;
}
export interface Prompt {
    id: string;
    creator: string;
    imageType: ImageType;
    timestamp: Time;
    prompt: string;
}
export interface UserProfile {
    name: string;
    createdAt: Time;
}
export enum ImageType {
    mixedMedia = "mixedMedia",
    classicPainting = "classicPainting",
    textToImage = "textToImage",
    imageToImage = "imageToImage",
    photo = "photo",
    sketch = "sketch"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    completePrompt(promptId: string): Promise<Prompt>;
    createImage(imageId: string, form: ImageFormData): Promise<Image>;
    createPrompt(promptId: string, form: PromptFormData): Promise<Prompt>;
    deleteImage(imageId: string): Promise<void>;
    deletePrompt(promptId: string): Promise<void>;
    getActivePrompts(): Promise<Array<Prompt>>;
    getAdminContentStats(): Promise<{
        typeStats: {
            created: {
                mixedMedia: bigint;
                classicPainting: bigint;
                textToImage: bigint;
                imageToImage: bigint;
                photo: bigint;
                sketch: bigint;
            };
            published: {
                mixedMedia: bigint;
                classicPainting: bigint;
                textToImage: bigint;
                imageToImage: bigint;
                photo: bigint;
                sketch: bigint;
            };
        };
        promptStats: {
            active: bigint;
            used: bigint;
        };
        limitStats: {
            dailyLimitReached: boolean;
            dailyPromptCapReached: boolean;
            dailyUploadCapReached: boolean;
        };
        imageStats: {
            created: bigint;
            published: bigint;
        };
    }>;
    getAllImageTags(): Promise<Array<string>>;
    getBackendBackup(): Promise<{
        prompts: {
            active: Array<Prompt>;
            used: Array<Prompt>;
        };
        images: {
            created: Array<Image>;
            published: Array<Image>;
        };
    }>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCreatedImageCountByType(): Promise<[bigint, bigint, bigint, bigint, bigint, bigint]>;
    getCreatedImages(): Promise<Array<Image>>;
    getCreatedImagesByType(imageType: ImageType): Promise<Array<Image>>;
    getDailyImageCount(): Promise<bigint>;
    getDailyLimitReached(): Promise<boolean>;
    getDailyPromptCount(): Promise<bigint>;
    getDailyUploadLimitInfo(): Promise<[bigint, bigint, boolean]>;
    getImage(imageId: string): Promise<Image | null>;
    getImagesByPrompt(promptSubstring: string): Promise<Array<Image>>;
    getImagesByTag(tag: string): Promise<Array<Image>>;
    getImagesCount(isPublished: boolean): Promise<bigint>;
    getPrompt(promptId: string): Promise<Prompt | null>;
    getPromptLimitInfo(): Promise<[bigint, bigint, boolean]>;
    getPublishedImage(imageId: string): Promise<Image | null>;
    getPublishedImageCountByType(): Promise<[bigint, bigint, bigint, bigint, bigint, bigint]>;
    getPublishedImages(): Promise<Array<Image>>;
    getPublishedImagesByType(imageType: ImageType): Promise<Array<Image>>;
    getUsedPrompt(promptId: string): Promise<Prompt | null>;
    getUsedPrompts(): Promise<Array<Prompt>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    hasDailyImageLimit(): Promise<boolean>;
    hasDailyPromptLimit(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchImages(searchTerm: string): Promise<Array<Image>>;
    unpublishImage(imageId: string): Promise<void>;
    updatePublishedImage(imageId: string, form: ImageFormData): Promise<Image>;
}
