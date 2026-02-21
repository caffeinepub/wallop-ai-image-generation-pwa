import Map "mo:core/Map";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Order "mo:core/Order";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Blob "mo:core/Blob";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // Image generation data types
  public type Image = {
    id : Text;
    creator : Text;
    prompt : Text;
    description : Text;
    timestamp : Time.Time;
    imageType : ImageType;
    blobs : [Storage.ExternalBlob];
    tags : [Text];
    published : Bool;
    views : Nat;
    downloads : Nat;
  };

  public type ImageType = {
    #textToImage;
    #imageToImage;
    #mixedMedia;
    #classicPainting;
    #sketch;
    #photo;
  };

  // Prompt data type
  public type Prompt = {
    id : Text;
    creator : Text;
    prompt : Text;
    timestamp : Time.Time;
    imageType : ImageType;
  };

  // Form data types
  public type ImageFormData = {
    creator : Text;
    prompt : Text;
    description : Text;
    imageType : ImageType;
    blobs : [Storage.ExternalBlob];
    tags : [Text];
    published : Bool;
  };

  public type PromptFormData = {
    creator : Text;
    prompt : Text;
    imageType : ImageType;
  };

  // User profile type
  public type UserProfile = {
    name : Text;
    createdAt : Time.Time;
  };

  module Image {
    public func compare(a : Image, b : Image) : Order.Order {
      if (a.timestamp < b.timestamp) { return #greater };
      if (a.timestamp > b.timestamp) { return #less };
      switch (a.creator.compare(b.creator)) {
        case (#equal) {
          Text.compare(a.prompt, b.prompt);
        };
        case (order) { order };
      };
    };
  };

  // System state
  // Persistent storage
  let activePromptsMap = Map.empty<Text, Prompt>();
  let usedPromptsMap = Map.empty<Text, Prompt>();
  let createdImagesMap = Map.empty<Text, Image>();
  let completedArtworkMap = Map.empty<Text, Image>();

  // Published images (public gallery)
  let publishedImagesMap = Map.empty<Text, Image>();

  // User profiles
  let userProfiles = Map.empty<Principal, UserProfile>();

  // Blob storage
  include MixinStorage();

  // Authorization system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // USER PROFILE FUNCTIONS ---------------------------------------------------

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  //FILTER AND SORT-----------------------------------------------------------------------------------

  func getImagesByTagInternal(tag : Text) : [Image] {
    let allImages = publishedImagesMap.values().toArray();
    let filtered = allImages.filter(
      func(image) {
        for (existingTag in image.tags.values()) {
          if (existingTag == tag) { return true };
        };
        false;
      }
    );
    filtered.sort();
  };

  // Public - anyone can search published images by tag
  public query ({ caller }) func getImagesByTag(tag : Text) : async [Image] {
    getImagesByTagInternal(tag);
  };

  func getImagesByPromptInternal(promptSubstring : Text) : [Image] {
    let allImages = publishedImagesMap.values().toArray();
    let filtered = allImages.filter(
      func(image) {
        image.prompt.contains(#text(promptSubstring));
      }
    );
    filtered.sort();
  };

  // Public - anyone can search published images by prompt
  public query ({ caller }) func getImagesByPrompt(promptSubstring : Text) : async [Image] {
    getImagesByPromptInternal(promptSubstring);
  };

  func searchImagesInternal(searchTerm : Text) : [Image] {
    let allImages = publishedImagesMap.values().toArray();
    let filtered = allImages.filter(
      func(image) {
        let inPrompt = image.prompt.contains(#text(searchTerm));
        let inTags = image.tags.any(func(tag) { tag.contains(#text(searchTerm)) });
        inPrompt or inTags;
      }
    );
    filtered.sort();
  };

  // Public - anyone can search published images
  public query ({ caller }) func searchImages(searchTerm : Text) : async [Image] {
    searchImagesInternal(searchTerm);
  };

  func filterImagesByTypeInternal(images : [Image], imageType : ImageType) : [Image] {
    images.filter(func(image) { image.imageType == imageType });
  };

  func filterPublishedImagesByTypeInternal(imageType : ImageType) : [Image] {
    filterImagesByTypeInternal(publishedImagesMap.values().toArray(), imageType);
  };

  func filterCreatedImagesByTypeInternal(imageType : ImageType) : [Image] {
    filterImagesByTypeInternal(createdImagesMap.values().toArray(), imageType);
  };

  // Public - anyone can view published image counts by type
  public query ({ caller }) func getPublishedImageCountByType() : async (Nat, Nat, Nat, Nat, Nat, Nat) {
    let textToImage = filterPublishedImagesByTypeInternal(#textToImage).size();
    let imageToImage = filterPublishedImagesByTypeInternal(#imageToImage).size();
    let mixedMedia = filterPublishedImagesByTypeInternal(#mixedMedia).size();
    let classicPainting = filterPublishedImagesByTypeInternal(#classicPainting).size();
    let sketch = filterPublishedImagesByTypeInternal(#sketch).size();
    let photo = filterPublishedImagesByTypeInternal(#photo).size();

    (textToImage, imageToImage, mixedMedia, classicPainting, sketch, photo);
  };

  // Admin only - view all created images count by type
  public query ({ caller }) func getCreatedImageCountByType() : async (Nat, Nat, Nat, Nat, Nat, Nat) {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view created image counts");
    };

    let textToImage = filterCreatedImagesByTypeInternal(#textToImage).size();
    let imageToImage = filterCreatedImagesByTypeInternal(#imageToImage).size();
    let mixedMedia = filterCreatedImagesByTypeInternal(#mixedMedia).size();
    let classicPainting = filterCreatedImagesByTypeInternal(#classicPainting).size();
    let sketch = filterCreatedImagesByTypeInternal(#sketch).size();
    let photo = filterCreatedImagesByTypeInternal(#photo).size();

    (textToImage, imageToImage, mixedMedia, classicPainting, sketch, photo);
  };

  // CREATE & STORE -----------------------------------------------------------

  // Users only - create images
  public shared ({ caller }) func createImage(imageId : Text, form : ImageFormData) : async Image {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create images");
    };

    if (createdImagesMap.containsKey(imageId)) {
      Runtime.trap("Image with id " # imageId # " already exists");
    };

    let publishedImagesCount = publishedImagesMap.size();
    let maxPublishedCount = 7500;

    let image = {
      id = imageId;
      creator = form.creator;
      prompt = form.prompt;
      description = form.description;
      timestamp = Time.now();
      imageType = form.imageType;
      blobs = form.blobs;
      tags = form.tags;
      published = publishedImagesCount < maxPublishedCount and form.published;
      views = 0;
      downloads = 0;
    };

    createdImagesMap.add(imageId, image);

    if (image.published) {
      publishedImagesMap.add(imageId, image);
    };

    image;
  };

  // Users only - create prompts
  public shared ({ caller }) func createPrompt(promptId : Text, form : PromptFormData) : async Prompt {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create prompts");
    };

    if (activePromptsMap.containsKey(promptId)) {
      Runtime.trap("Prompt with id " # promptId # " already exists");
    };

    let prompt = {
      id = promptId;
      creator = form.creator;
      prompt = form.prompt;
      timestamp = Time.now();
      imageType = form.imageType;
    };

    activePromptsMap.add(promptId, prompt);
    prompt;
  };

  // Users only - complete own prompts (or admin)
  public shared ({ caller }) func completePrompt(promptId : Text) : async Prompt {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can complete prompts");
    };

    switch (activePromptsMap.get(promptId)) {
      case (?prompt) {
        let callerPrincipal = caller.toText();
        if (prompt.creator != callerPrincipal and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only complete your own prompts");
        };
        activePromptsMap.remove(promptId);
        usedPromptsMap.add(promptId, prompt);
        prompt;
      };
      case (null) { Runtime.trap("Prompt not found") };
    };
  };

  // QUERY-------------------------------------------------------------------

  // Users only - view created images (not published)
  public query ({ caller }) func getImage(imageId : Text) : async ?Image {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view created images");
    };
    createdImagesMap.get(imageId);
  };

  // Public - anyone can view published images
  public query ({ caller }) func getPublishedImage(imageId : Text) : async ?Image {
    publishedImagesMap.get(imageId);
  };

  // Users only - view prompts
  public query ({ caller }) func getPrompt(promptId : Text) : async ?Prompt {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view prompts");
    };
    activePromptsMap.get(promptId);
  };

  // Users only - view active prompts
  public query ({ caller }) func getActivePrompts() : async [Prompt] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view active prompts");
    };
    activePromptsMap.values().toArray();
  };

  // Users only - view used prompts
  public query ({ caller }) func getUsedPrompt(promptId : Text) : async ?Prompt {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view used prompts");
    };
    usedPromptsMap.get(promptId);
  };

  // Users only - view all used prompts
  public query ({ caller }) func getUsedPrompts() : async [Prompt] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view used prompts");
    };
    usedPromptsMap.values().toArray();
  };

  //IMAGES
  // Public - anyone can view published images
  public query ({ caller }) func getPublishedImages() : async [Image] {
    publishedImagesMap.values().toArray().sort();
  };

  // Admin only - view all created images
  public query ({ caller }) func getCreatedImages() : async [Image] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all created images");
    };
    createdImagesMap.values().toArray().sort();
  };

  // Public - anyone can view published images by type
  public query ({ caller }) func getPublishedImagesByType(imageType : ImageType) : async [Image] {
    filterPublishedImagesByTypeInternal(imageType);
  };

  // Admin only - view created images by type
  public query ({ caller }) func getCreatedImagesByType(imageType : ImageType) : async [Image] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view created images by type");
    };
    filterCreatedImagesByTypeInternal(imageType);
  };

  // Public - anyone can view all tags
  public query ({ caller }) func getAllImageTags() : async [Text] {
    let tagSet = Set.empty<Text>();

    for (image in publishedImagesMap.values()) {
      for (tag in image.tags.values()) {
        tagSet.add(tag);
      };
    };

    tagSet.toArray();
  };

  // STATS -------------------------------------------------------

  // Public - anyone can view daily prompt count
  public query ({ caller }) func getDailyPromptCount() : async Nat {
    let now = Time.now();
    let dayInNanos = 24 * 60 * 60 * 1_000_000_000;
    let startOfDay = now - (now % dayInNanos);

    let activeCount = activePromptsMap.size();
    let usedCount = usedPromptsMap.values().toArray().filter(
      func(prompt) {
        prompt.timestamp >= startOfDay;
      }
    ).size();

    activeCount + usedCount;
  };

  func hasDailyPromptLimitInternal() : Bool {
    let now = Time.now();
    let dayInNanos = 24 * 60 * 60 * 1_000_000_000;
    let startOfDay = now - (now % dayInNanos);

    let activeCount = activePromptsMap.size();
    let usedCount = usedPromptsMap.values().toArray().filter(
      func(prompt) {
        prompt.timestamp >= startOfDay;
      }
    ).size();

    let dailyPromptCount = activeCount + usedCount;
    dailyPromptCount >= 25000;
  };

  // Public - anyone can check if daily prompt limit is reached
  public query ({ caller }) func hasDailyPromptLimit() : async Bool {
    hasDailyPromptLimitInternal();
  };

  // Public - anyone can view daily image count
  public query ({ caller }) func getDailyImageCount() : async Nat {
    let now = Time.now();
    let dayInNanos = 24 * 60 * 60 * 1_000_000_000;
    let startOfDay = now - (now % dayInNanos);

    let publishedCount = publishedImagesMap.values().toArray().filter(
      func(image) {
        image.timestamp >= startOfDay;
      }
    ).size();

    let createdCount = createdImagesMap.values().toArray().filter(
      func(image) {
        image.timestamp >= startOfDay;
      }
    ).size();

    publishedCount + createdCount;
  };

  func hasDailyImageLimitInternal() : Bool {
    let now = Time.now();
    let dayInNanos = 24 * 60 * 60 * 1_000_000_000;
    let startOfDay = now - (now % dayInNanos);

    let publishedCount = publishedImagesMap.values().toArray().filter(
      func(image) {
        image.timestamp >= startOfDay;
      }
    ).size();

    let createdCount = createdImagesMap.values().toArray().filter(
      func(image) {
        image.timestamp >= startOfDay;
      }
    ).size();

    let dailyImageCount = publishedCount + createdCount;
    dailyImageCount >= 7500;
  };

  // Public - anyone can check if daily image limit is reached
  public query ({ caller }) func hasDailyImageLimit() : async Bool {
    hasDailyImageLimitInternal();
  };

  // Public - anyone can check if any daily limit is reached
  public query ({ caller }) func getDailyLimitReached() : async Bool {
    let dailyPromptLimit = hasDailyPromptLimitInternal();
    let dailyImageLimit = hasDailyImageLimitInternal();
    dailyPromptLimit or dailyImageLimit;
  };

  // Public - anyone can view prompt limit info
  public query ({ caller }) func getPromptLimitInfo() : async (Nat, Nat, Bool) {
    let now = Time.now();
    let dayInNanos = 24 * 60 * 60 * 1_000_000_000;
    let startOfDay = now - (now % dayInNanos);

    let activeCount = activePromptsMap.size();
    let usedCount = usedPromptsMap.values().toArray().filter(
      func(prompt) {
        prompt.timestamp >= startOfDay;
      }
    ).size();

    let dailyPromptCount = activeCount + usedCount;
    (dailyPromptCount, 25000, dailyPromptCount >= 25000);
  };

  // Public for published count, admin only for created count
  public query ({ caller }) func getImagesCount(isPublished : Bool) : async Nat {
    if (isPublished) {
      publishedImagesMap.size();
    } else {
      if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
        Runtime.trap("Unauthorized: Only admins can view created images count");
      };
      createdImagesMap.size();
    };
  };

  // Public - anyone can view daily upload limit info
  public query ({ caller }) func getDailyUploadLimitInfo() : async (Nat, Nat, Bool) {
    let now = Time.now();
    let dayInNanos = 24 * 60 * 60 * 1_000_000_000;
    let startOfDay = now - (now % dayInNanos);

    let publishedCount = publishedImagesMap.values().toArray().filter(
      func(image) {
        image.timestamp >= startOfDay;
      }
    ).size();

    let createdCount = createdImagesMap.values().toArray().filter(
      func(image) {
        image.timestamp >= startOfDay;
      }
    ).size();

    let dailyImageCount = publishedCount + createdCount;
    (dailyImageCount, 7500, dailyImageCount >= 7500);
  };

  // UPDATE--------------------------------------------------------

  // Users only - update own images (or admin)
  public shared ({ caller }) func updatePublishedImage(imageId : Text, form : ImageFormData) : async Image {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update images");
    };

    switch (publishedImagesMap.get(imageId)) {
      case (null) { Runtime.trap("Image not found") };
      case (?existingImage) {
        let callerPrincipal = caller.toText();
        if (existingImage.creator != callerPrincipal and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only update your own images");
        };

        let updatedImage = {
          existingImage with
          creator = form.creator;
          prompt = form.prompt;
          description = form.description;
          timestamp = Time.now();
          blobs = form.blobs;
          imageType = form.imageType;
          tags = form.tags;
          published = form.published;
        };

        publishedImagesMap.add(imageId, updatedImage);
        createdImagesMap.add(imageId, updatedImage);
        updatedImage;
      };
    };
  };

  // DELETE-----------------------------------------------------------

  // Users only - delete own prompts (or admin)
  public shared ({ caller }) func deletePrompt(promptId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete prompts");
    };

    let activePrompt = activePromptsMap.get(promptId);
    let usedPrompt = usedPromptsMap.get(promptId);

    switch (activePrompt, usedPrompt) {
      case (?prompt, _) {
        let callerPrincipal = caller.toText();
        if (prompt.creator != callerPrincipal and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only delete your own prompts");
        };
        activePromptsMap.remove(promptId);
      };
      case (_, ?prompt) {
        let callerPrincipal = caller.toText();
        if (prompt.creator != callerPrincipal and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only delete your own prompts");
        };
        usedPromptsMap.remove(promptId);
      };
      case (null, null) { Runtime.trap("Prompt not found") };
    };
  };

  // Users only - delete own images (or admin)
  public shared ({ caller }) func deleteImage(imageId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete images");
    };

    let createdImage = createdImagesMap.get(imageId);
    let publishedImage = publishedImagesMap.get(imageId);

    switch (createdImage, publishedImage) {
      case (?image, _) {
        let callerPrincipal = caller.toText();
        if (image.creator != callerPrincipal and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only delete your own images");
        };
        createdImagesMap.remove(imageId);
        publishedImagesMap.remove(imageId);
      };
      case (_, ?image) {
        let callerPrincipal = caller.toText();
        if (image.creator != callerPrincipal and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only delete your own images");
        };
        publishedImagesMap.remove(imageId);
      };
      case (null, null) { Runtime.trap("Image not found") };
    };
  };

  // Admin only - unpublish images
  public shared ({ caller }) func unpublishImage(imageId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can unpublish images");
    };

    if (not publishedImagesMap.containsKey(imageId)) {
      Runtime.trap("Image not found in published images. Already unpublished?");
    };
    publishedImagesMap.remove(imageId);
  };

  // BACKUP----------------------------------------------------------

  // Admin only - get backend backup
  public query ({ caller }) func getBackendBackup() : async {
    prompts : {
      active : [Prompt];
      used : [Prompt];
    };
    images : {
      published : [Image];
      created : [Image];
    };
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can access backend backup");
    };

    {
      prompts = {
        active = activePromptsMap.values().toArray();
        used = usedPromptsMap.values().toArray();
      };
      images = {
        published = publishedImagesMap.values().toArray();
        created = createdImagesMap.values().toArray();
      };
    };
  };

  // Admin only - get content statistics
  public shared ({ caller }) func getAdminContentStats() : async {
    promptStats : {
      active : Nat;
      used : Nat;
    };
    imageStats : {
      published : Nat;
      created : Nat;
    };
    limitStats : {
      dailyPromptCapReached : Bool;
      dailyUploadCapReached : Bool;
      dailyLimitReached : Bool;
    };
    typeStats : {
      published : {
        textToImage : Nat;
        imageToImage : Nat;
        mixedMedia : Nat;
        classicPainting : Nat;
        sketch : Nat;
        photo : Nat;
      };
      created : {
        textToImage : Nat;
        imageToImage : Nat;
        mixedMedia : Nat;
        classicPainting : Nat;
        sketch : Nat;
        photo : Nat;
      };
    };
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can access content stats");
    };

    let dailyPromptLimit = hasDailyPromptLimitInternal();
    let dailyImageLimit = hasDailyImageLimitInternal();

    let publishedTextToImage = await getPublishedImagesByType(#textToImage);
    let publishedImageToImage = await getPublishedImagesByType(#imageToImage);
    let publishedMixedMedia = await getPublishedImagesByType(#mixedMedia);
    let publishedClassicPainting = await getPublishedImagesByType(#classicPainting);
    let publishedSketch = await getPublishedImagesByType(#sketch);
    let publishedPhoto = await getPublishedImagesByType(#photo);

    let createdTextToImage = filterCreatedImagesByTypeInternal(#textToImage);
    let createdImageToImage = filterCreatedImagesByTypeInternal(#imageToImage);
    let createdMixedMedia = filterCreatedImagesByTypeInternal(#mixedMedia);
    let createdClassicPainting = filterCreatedImagesByTypeInternal(#classicPainting);
    let createdSketch = filterCreatedImagesByTypeInternal(#sketch);
    let createdPhoto = filterCreatedImagesByTypeInternal(#photo);

    {
      promptStats = {
        active = activePromptsMap.size();
        used = usedPromptsMap.size();
      };
      imageStats = {
        published = publishedImagesMap.size();
        created = createdImagesMap.size();
      };
      limitStats = {
        dailyPromptCapReached = dailyPromptLimit;
        dailyUploadCapReached = dailyImageLimit;
        dailyLimitReached = dailyPromptLimit or dailyImageLimit;
      };
      typeStats = {
        published = {
          textToImage = publishedTextToImage.size();
          imageToImage = publishedImageToImage.size();
          mixedMedia = publishedMixedMedia.size();
          classicPainting = publishedClassicPainting.size();
          sketch = publishedSketch.size();
          photo = publishedPhoto.size();
        };
        created = {
          textToImage = createdTextToImage.size();
          imageToImage = createdImageToImage.size();
          mixedMedia = createdMixedMedia.size();
          classicPainting = createdClassicPainting.size();
          sketch = createdSketch.size();
          photo = createdPhoto.size();
        };
      };
    };
  };
};
