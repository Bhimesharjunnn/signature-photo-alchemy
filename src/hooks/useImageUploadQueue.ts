
import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

function randomId() {
  return crypto.randomUUID();
}

export interface PreviewImage {
  id: string;
  file: File;
  url: string;
  status: "pending" | "uploading" | "uploaded" | "error";
  uploadError?: string;
}

export function useImageUploadQueue(sessionId: string, uploadedImageNames: string[], maxImages=100) {
  const [queue, setQueue] = useState<PreviewImage[]>([]);
  const uploading = useRef(false);

  // On file select: Add previews to the queue
  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (!arr.length) return;
    if (queue.length + uploadedImageNames.length + arr.length > maxImages) {
      toast.error(`You can upload up to ${maxImages} images only.`);
      return;
    }
    const filtered = arr.filter(f => 
      !queue.find(q => q.file.name === f.name) && 
      !uploadedImageNames.includes(f.name)
    );
    const newPreviews = filtered.map((file) => ({
      id: randomId(),
      file,
      url: URL.createObjectURL(file),
      status: "pending" as const,
    }));
    setQueue(q => [...q, ...newPreviews]);
  };

  // Remove preview from the queue
  const removeImage = (id: string) => {
    setQueue(q => {
      const img = q.find(x => x.id === id);
      if (img) {
        URL.revokeObjectURL(img.url);
      }
      return q.filter(x => x.id !== id);
    });
  };

  // Replace a file given a preview id
  const replaceImage = (id: string, file: File) => {
    setQueue(q => q.map(img => 
      img.id === id 
        ? { ...img, file, url: URL.createObjectURL(file), status: "pending", uploadError: undefined }
        : img
    ));
  };

  // Upload all "pending" images
  const upload = async () => {
    if (uploading.current) return;
    uploading.current = true;

    let uploadedCount = 0;
    setQueue((prevQueue) =>
      prevQueue.map(p => (p.status === "pending" ? { ...p, status: "uploading" } : p))
    );
    for (const p of queue) {
      if (p.status !== "pending") continue;
      const path = `${sessionId}/${p.file.name}`;
      // Make sure not duplicate name
      if (uploadedImageNames.includes(p.file.name)) {
        setQueue(q => q.map(img =>
          img.id === p.id ? { ...img, status: "error", uploadError: "Duplicate file name." } : img
        ));
        continue;
      }
      const { error } = await supabase.storage.from("collage-images").upload(path, p.file, { upsert: false });
      if (error) {
        setQueue(q => q.map(img =>
          img.id === p.id ? { ...img, status: "error", uploadError: error.message } : img
        ));
      } else {
        uploadedCount++;
        setQueue(q => q.map(img =>
          img.id === p.id ? { ...img, status: "uploaded" } : img
        ));
      }
    }
    if (uploadedCount) {
      toast.success(`${uploadedCount} image${uploadedCount > 1 ? "s" : ""} uploaded.`);
    }
    uploading.current = false;
    // Remove uploaded
    setQueue(q => q.filter(img => img.status !== "uploaded"));
  };

  // Cleanup URLs on unmount
  React.useEffect(() => {
    return () => {
      queue.forEach(img => URL.revokeObjectURL(img.url));
    };
  }, [queue]);

  return {
    queue,
    addFiles,
    removeImage,
    replaceImage,
    upload,
    uploading: uploading.current,
    canAdd: queue.length + uploadedImageNames.length < maxImages,
  };
}
