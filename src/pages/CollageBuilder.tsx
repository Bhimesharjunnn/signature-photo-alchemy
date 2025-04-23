
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCollageImages } from "@/hooks/useCollageImages";
import { useImageUploadQueue } from "@/hooks/useImageUploadQueue";
import CollageCanvas from "@/components/collage/CollageCanvas";
import ImageUploader from "@/components/collage/ImageUploader";
import PatternSelector from "@/components/collage/PatternSelector";
import ImageGallery from "@/components/collage/ImageGallery";
import UploadPreviewQueue from "@/components/collage/UploadPreviewQueue";
import type { Pattern, CollageCanvasRef } from "@/components/collage/types";

const CollageBuilder = () => {
  const {
    images,
    loading,
    uploadImages,
    clearAllImages,
    fetchImages,
    sessionId,
  } = useCollageImages();

  const [selectedPattern, setSelectedPattern] = useState<Pattern>("grid");
  const [mainPhotoId, setMainPhotoId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const {
    queue: previewQueue,
    addFiles,
    removeImage,
    replaceImage,
    upload,
    uploading,
    canAdd,
  } = useImageUploadQueue(sessionId, images.map(i => i.name));

  if (!mainPhotoId && images.length) setMainPhotoId(images[0].id);
  if (mainPhotoId && images.every(i => i.id !== mainPhotoId)) setMainPhotoId(null);

  const canvasRef = useRef<CollageCanvasRef>(null);

  const handleReplace = (id: string) => {
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = "image/*";
    picker.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) replaceImage(id, file);
    };
    picker.click();
  };

  const handleDownload = async (format: "png" | "pdf") => {
    if (!images.length) {
      toast.error("Please upload images first!");
      return;
    }
    if (!mainPhotoId) {
      toast.error("Please select a main photo!");
      return;
    }
    toast.info(`Preparing ${format.toUpperCase()} download...`);
    try {
      await canvasRef.current?.downloadCanvas(format);
      toast.success(`${format.toUpperCase()} downloaded successfully!`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error(`Failed to download ${format.toUpperCase()}`);
    }
  };

  const handleMainPhotoSelect = (id: string) => {
    if (locked && images.length > 1) {
      toast.info("Side photos are locked!");
      return;
    }
    setMainPhotoId(id);
  };

  return (
    <div className="container mx-auto max-w-6xl py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-brand-dark-gray mb-4">
          Create Your Signature Collage
        </h1>
        <p className="text-brand-cool-gray max-w-2xl mx-auto">
          Upload photos, arrange them in your preferred pattern, and download your finished collage.
        </p>
      </div>

      <div className="bg-white border border-brand-light-gray rounded-xl p-8 shadow-sm max-w-3xl mx-auto">
        <ImageUploader
          loading={loading}
          canAdd={canAdd}
          onFilesSelected={addFiles}
        />

        <UploadPreviewQueue
          queue={previewQueue}
          onReplace={handleReplace}
          onRemove={removeImage}
          onUploadAll={async () => {
            await upload();
            fetchImages();
          }}
          uploading={uploading}
          loading={loading}
        />

        {images.length > 0 && (
          <>
            <PatternSelector
              selectedPattern={selectedPattern}
              onPatternSelect={setSelectedPattern}
              locked={locked}
              onLockToggle={() => setLocked(prev => !prev)}
            />
            
            <div className="my-6 flex flex-col items-center">
              <CollageCanvas
                ref={canvasRef}
                images={images}
                mainPhotoId={mainPhotoId}
                pattern={selectedPattern}
                locked={locked}
              />
              <div className="mt-4 flex gap-3 justify-center">
                <Button
                  onClick={() => handleDownload("png")}
                  className="bg-brand-purple hover:bg-brand-purple/90"
                >
                  <Download className="mr-2" size={18} />
                  Download PNG
                </Button>
                <Button
                  onClick={() => handleDownload("pdf")}
                  variant="outline"
                  className="border-brand-purple text-brand-purple hover:bg-brand-purple/10"
                >
                  <Download className="mr-2" size={18} />
                  Download PDF (A4)
                </Button>
              </div>
            </div>

            <ImageGallery
              images={images}
              mainPhotoId={mainPhotoId}
              onMainPhotoSelect={handleMainPhotoSelect}
              locked={locked}
              onClearAll={clearAllImages}
              loading={loading}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default CollageBuilder;
