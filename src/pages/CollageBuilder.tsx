import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCollageImages } from "@/hooks/useCollageImages";
import CollageCanvas from "@/components/collage/CollageCanvas";
import { 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  Grid2x2, 
  Hexagon, 
  Circle, 
  Lock, 
  LockOpen, 
  SquareCheck,
  Download 
} from "lucide-react";
import { useImageUploadQueue } from "@/hooks/useImageUploadQueue";
import type { Pattern, CollageCanvasRef } from "@/components/collage/types";
import { Input } from "@/components/ui/input";

const MIN_PHOTO_COUNT = 10;
const MAX_PHOTO_COUNT = 50;

const PATTERNS: { key: Pattern; label: string; Icon: React.ElementType }[] = [
  { key: "grid", label: "Grid", Icon: Grid2x2 },
  { key: "hexagon", label: "Hexagon", Icon: Hexagon },
  { key: "circular", label: "Circular", Icon: Circle },
];

const getDivisions = (sideCount: number) => {
  // Returns { top, bottom, left, right } for N side photos, as balanced as possible.
  // Distribute as evenly as possible, prioritize: top, bottom, left, right
  const base = Math.floor(sideCount / 4);
  const rem = sideCount % 4;
  return {
    top: base + (rem > 0 ? 1 : 0),
    bottom: base + (rem > 1 ? 1 : 0),
    left: base + (rem > 2 ? 1 : 0),
    right: base,
  };
};

const CollageBuilder = () => {
  const {
    images,
    loading,
    uploadImages, // not used now, we use our queue/hook logic
    clearAllImages,
    fetchImages,
    sessionId,
  } = useCollageImages();

  const [selectedPattern, setSelectedPattern] = useState<Pattern>("grid");
  const [mainPhotoId, setMainPhotoId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  // ***** NEW: Step 1 - Ask user how many photos *****
  const [photoLimit, setPhotoLimit] = useState<number | null>(null);

  // Validate images/pre-upload for photoLimit
  const canUploadCount = photoLimit !== null ? photoLimit - images.length - previewQueue.length : MAX_PHOTO_COUNT;

  // Use local upload queue for instant previews
  const {
    queue: previewQueue,
    addFiles,
    removeImage,
    replaceImage,
    upload,
    uploading,
    canAdd,
  } = useImageUploadQueue(sessionId, images.map(i=>i.name));

  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<CollageCanvasRef>(null);
  const [dragActive, setDragActive] = useState(false);

  // Remove mainPhotoId if associated image gone
  useEffect(() => {
    if (!mainPhotoId && images.length) setMainPhotoId(images[0].id);
    if (mainPhotoId && images.every(i => i.id !== mainPhotoId)) setMainPhotoId(null);
  }, [mainPhotoId, images]);

  // Only allow selected photos == photoLimit
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length) {
      if (photoLimit !== null) {
        const newFiles = Array.from(event.target.files).slice(0, canUploadCount);
        addFiles(newFiles);
        event.target.value = "";
      }
    }
  };

  // New: Prevent uploading more than allowed via DnD
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (photoLimit !== null) {
      const files = Array.from(event.dataTransfer.files).slice(0, canUploadCount);
      addFiles(files);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleUploadClick = () => {
    inputRef.current?.click();
  };

  // Step: allow user to change number and restart
  const handleRestart = () => {
    setPhotoLimit(null);
    clearAllImages();
    setMainPhotoId(null);
    setLocked(false);
    // Reset preview queue
    previewQueue.forEach(img => removeImage(img.id));
  };

  // Download handler
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

  // Allow remove/replace for preview images BEFORE upload
  const handleReplace = (id: string) => {
    // open new picker, replacing on select
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = "image/*";
    picker.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) replaceImage(id, file);
    };
    picker.click();
  };

  // Pattern-specific layout division, only for "grid" pattern
  let layoutConfig = null;
  if (selectedPattern === "grid" && photoLimit) {
    const total = photoLimit;
    // 1 main photo, rest sides
    const sides = total - 1;
    layoutConfig = getDivisions(sides);
  }

  // ***** STEP 1: Ask for NUMBER of photos *****
  if (photoLimit === null) {
    return (
      <div className="container mx-auto max-w-md py-12 px-4 flex flex-col items-center">
        <div className="bg-white border border-brand-light-gray rounded-xl p-8 shadow-sm w-full flex flex-col items-center">
          <h1 className="text-2xl font-bold mb-4">How many photos will you upload?</h1>
          <form
            onSubmit={e => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const val = Number((form.elements.namedItem("photoLimit") as HTMLInputElement).value);
              if (val >= MIN_PHOTO_COUNT && val <= MAX_PHOTO_COUNT) setPhotoLimit(val);
              else toast.error(`Choose between ${MIN_PHOTO_COUNT} and ${MAX_PHOTO_COUNT}`);
            }}
            className="flex flex-col items-center gap-6 w-full"
          >
            <Input
              type="number"
              name="photoLimit"
              min={MIN_PHOTO_COUNT}
              max={MAX_PHOTO_COUNT}
              step={1}
              defaultValue={MIN_PHOTO_COUNT}
              className="w-32 text-center text-lg"
              required
            />
            <Button type="submit" className="bg-brand-purple w-full">
              Continue
            </Button>
          </form>
          <div className="mt-8 text-brand-cool-gray text-sm">
            You must upload exactly <b>between {MIN_PHOTO_COUNT} and {MAX_PHOTO_COUNT}</b> photos.
          </div>
        </div>
      </div>
    );
  }

  // When preview images exist, show section for them
  const hasPreviewImages = previewQueue.length > 0;

  // ***** STEP 2: Collage workflow as before, but limit uploads *****
  return (
    <div className="container mx-auto max-w-6xl py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-brand-dark-gray mb-4">
          Create Your Signature Collage
        </h1>
        <p className="text-brand-cool-gray max-w-2xl mx-auto">
          Upload <b>{photoLimit}</b> photos to arrange your perfect collage pattern.<br />
          <Button variant="ghost" size="sm" onClick={handleRestart} className="mt-1">Change number</Button>
        </p>
      </div>

      <div className="bg-white border border-brand-light-gray rounded-xl p-8 shadow-sm max-w-3xl mx-auto">
        <div
          className={`
            flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed
            rounded-lg p-8 cursor-pointer relative
            transition-colors
            ${dragActive ? "border-brand-purple bg-brand-light-purple/30" : "border-brand-light-gray"}
          `}
          tabIndex={0}
          onClick={() => (!loading && canAdd && canUploadCount > 0) ? handleUploadClick() : undefined}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {/* Only allow uploads if not at limit */}
          <ImageIcon className="mb-2 text-brand-purple" size={48} />
          <p className="text-brand-cool-gray mb-2 text-center">
            Drag &amp; drop images here<br />or
          </p>
          <Button
            className="my-2 bg-brand-purple hover:bg-brand-purple/90"
            disabled={loading || !canAdd || canUploadCount <= 0}
            onClick={handleUploadClick}
            type="button"
          >
            <Upload className="mr-2" size={18} /> Click to Upload
          </Button>
          <input
            accept="image/*"
            type="file"
            multiple
            ref={inputRef}
            className="hidden"
            max={canUploadCount}
            onChange={handleFileInputChange}
            disabled={loading || !canAdd || canUploadCount <= 0}
          />
          <span className="mt-2 text-xs text-brand-cool-gray">
            {images.length + previewQueue.length} / {photoLimit} uploaded.<br />
            You must upload <b>exactly {photoLimit}</b> photos to continue.
          </span>
        </div>

        {/* Show PREVIEW thumbnails before upload */}
        {hasPreviewImages && (
          <div className="mt-6">
            <h4 className="font-semibold mb-2">Selected Photos (Preview):</h4>
            <div className="flex flex-wrap gap-4">
              {previewQueue.map(img => (
                <div
                  key={img.id}
                  className="w-20 h-20 relative rounded overflow-hidden flex items-center justify-center shadow border border-brand-light-gray bg-white"
                >
                  <img
                    src={img.url}
                    alt={img.file.name}
                    className="object-cover w-full h-full"
                    draggable={false}
                  />
                  {(img.status === "pending" || img.status === "error") && (
                    <div className="absolute bottom-1 left-1 flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-brand-purple text-brand-purple px-2 py-0.5"
                        onClick={() => handleReplace(img.id)}
                        type="button"
                      >
                        Replace
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="px-2 py-0.5"
                        onClick={() => removeImage(img.id)}
                        type="button"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                  {img.status === "uploading" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/40">
                      <div className="text-xs text-brand-purple animate-pulse">
                        Uploading...
                      </div>
                    </div>
                  )}
                  {img.status === "error" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-100/90">
                      <div className="text-xs text-red-600 text-center">
                        Error<br/>{img.uploadError}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                disabled={previewQueue.length === 0 || uploading || loading}
                onClick={async () => {
                  await upload();
                  fetchImages();
                }}
                className="bg-brand-purple hover:bg-brand-purple/90"
                type="button"
              >
                <Upload className="mr-2" size={18}/> Upload All
              </Button>
            </div>
            <div className="text-xs text-brand-cool-gray pt-2">
              Photos above are not yet uploaded to Supabase.<br/>
              You can remove or replace before uploading.
            </div>
          </div>
        )}

        {/* Show next step only when ALL images uploaded */}
        {images.length === photoLimit && (
          <>
            {/* Pattern section but force pattern to grid */}
            <div className="flex items-center gap-4 mt-8 flex-wrap justify-center">
              <span>Grid Pattern for {photoLimit} photos</span>
              <Button variant="ghost" size="sm" onClick={handleRestart}>Change number</Button>
              {/* Lock pattern to grid */}
            </div>
            <div className="my-6 flex flex-col items-center">
              <CollageCanvas
                ref={canvasRef}
                images={images}
                mainPhotoId={images[0]?.id ?? null}
                pattern="grid"
                locked={locked}
                layoutConfig={layoutConfig} // Pass grid arrangement to canvas for the pattern
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
              <div className="flex flex-wrap gap-4 mt-6 justify-center">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className={`w-20 h-20 relative rounded overflow-hidden flex items-center justify-center shadow border border-brand-light-gray cursor-pointer transition-all duration-150
                      ${
                        img.id === mainPhotoId
                          ? "ring-4 ring-brand-purple scale-110 z-10"
                          : "hover:ring-2 hover:ring-brand-purple/80"
                      }
                      ${locked && img.id !== mainPhotoId ? "pointer-events-none opacity-60" : ""}
                    `}
                    title={
                      img.id === mainPhotoId
                        ? `${img.name} (Main)`
                        : img.name
                    }
                    onClick={() => {
                      if (locked && images.length > 1) {
                        toast.info("Side photos are locked!");
                        return;
                      }
                      setMainPhotoId(img.id);
                    }}
                  >
                    <img
                      src={img.url}
                      alt={img.name}
                      className="object-cover w-full h-full"
                      draggable={false}
                      loading="lazy"
                    />
                    {img.id === mainPhotoId && (
                      <div className="absolute bottom-1 right-1 bg-brand-purple/80 text-white text-xs px-2 py-0.5 rounded">
                        Main
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Clear all (reset) button for emergency */}
        {images.length > 0 && (
          <div className="mt-8 flex justify-center">
            <Button
              variant="destructive"
              className="flex items-center gap-2"
              onClick={handleRestart}
              disabled={loading}
              type="button"
            >
              <Trash2 size={18} className="mr-2" />
              Restart
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollageBuilder;
