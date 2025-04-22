
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

// You must connect Supabase integration in Lovable to use the client; assuming supabase client is provided as 'supabase' globally or add import if available.
import { createClient } from "@supabase/supabase-js";

// These should be set in Supabase integration (public keys are safe to use on client)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SESSION_KEY = "signature_collage_session_id";

// Generate or retrieve a session ID for temporary image grouping (persists per browser session)
function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export interface CollageImage {
  id: string;
  url: string;
  name: string;
}

export function useCollageImages() {
  const [images, setImages] = useState<CollageImage[]>([]);
  const [loading, setLoading] = useState(false);

  const sessionId = getSessionId();

  // Fetch images reference from Supabase Storage bucket/folder
  const fetchImages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.storage
      .from("collage-images")
      .list(sessionId, { limit: 100, offset: 0 });
    if (error) {
      setLoading(false);
      toast.error("Couldn't fetch images.");
      return;
    }
    if (data) {
      const urls = await Promise.all(
        data.map(async (file) => {
          const { data: signedUrlData } = await supabase.storage
            .from("collage-images")
            .createSignedUrl(`${sessionId}/${file.name}`, 60 * 60);
          return {
            id: file.id || file.name,
            url: signedUrlData?.signedUrl || "",
            name: file.name,
          };
        })
      );
      setImages(urls.filter((f) => !!f.url));
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Upload image(s) to Supabase storage within session folder
  const uploadImages = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    if (images.length + files.length > 100) {
      toast.error("You can upload up to 100 images only.");
      return;
    }
    setLoading(true);
    let uploaded = 0;
    for (const file of files) {
      const path = `${sessionId}/${file.name}`;
      // Skip if duplicate name
      if (images.find((img) => img.name === file.name)) continue;
      const { error } = await supabase.storage
        .from("collage-images")
        .upload(path, file, { upsert: false }); // prevent overwrite
      if (!error) {
        uploaded++;
      }
    }
    if (uploaded > 0) {
      toast.success(`${uploaded} image${uploaded > 1 ? "s" : ""} uploaded.`);
    }
    fetchImages();
    setLoading(false);
  };

  // Remove ALL images from Supabase storage and local state
  const clearAllImages = async () => {
    if (images.length === 0) return;
    setLoading(true);
    const paths = images.map((img) => `${sessionId}/${img.name}`);
    const { error } = await supabase.storage.from("collage-images").remove(paths);
    if (error) {
      toast.error("Error clearing images from Supabase.");
    } else {
      setImages([]);
      toast.success("All images cleared.");
    }
    setLoading(false);
  };

  return {
    images,
    loading,
    uploadImages,
    clearAllImages,
    fetchImages,
    sessionId,
  };
}

