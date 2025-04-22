
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCollageImages } from "@/hooks/useCollageImages";
import { Image as ImageIcon, Upload, Trash2, Grid2x2, Hexagon, Circle, Lock, LockOpen, SquareCheck } from "lucide-react";
import CollageCanvas from "@/components/CollageCanvas";

type Pattern = "grid" | "hexagon" | "circular";

const PATTERNS: { key: Pattern; label: string; Icon: React.ElementType }[] = [
  { key: "grid", label: "Grid", Icon: Grid2x2 },
  { key: "hexagon", label: "Hexagon", Icon: Hexagon },
  { key: "circular", label: "Circular", Icon: Circle },
];

const CollageBuilder = () => {
  const {
    images,
    loading,
    uploadImages,
    clearAllImages,
  } = useCollageImages();

  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Collage interaction state
  const [selectedPattern, setSelectedPattern] = useState<Pattern>("grid");
  const [mainPhotoId, setMainPhotoId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  // Set default main photo when list changes
  if (images.length && !mainPhotoId) {
    setMainPhotoId(images[0].id);
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      uploadImages(files);
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
    if (inputRef.current) inputRef.current.click();
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      uploadImages(files);
      // Reset so user can upload the same file again if needed
      event.target.value = "";
    }
  };

  // Main photo toggle/set
  const handleSetMainPhoto = (id: string) => {
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
        <div
          className={`
            flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed
            rounded-lg p-8 cursor-pointer relative
            transition-colors
            ${dragActive ? "border-brand-purple bg-brand-light-purple/30" : "border-brand-light-gray"}
          `}
          tabIndex={0}
          onClick={handleUploadClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <ImageIcon className="mb-2 text-brand-purple" size={48} />
          <p className="text-brand-cool-gray mb-2 text-center">
            Drag &amp; drop images here<br />or
          </p>
          <Button
            className="my-2 bg-brand-purple hover:bg-brand-purple/90"
            disabled={loading || images.length >= 100}
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
            max={100 - images.length}
            onChange={handleFileInputChange}
            disabled={loading || images.length >= 100}
          />
          <span className="mt-2 text-xs text-brand-cool-gray">
            Max 100 photos per session. JPEG, PNG, GIF supported.
          </span>
        </div>
        {/* Pattern picker and lock after images uploaded */}
        {images.length > 0 && (
          <>
            <div className="flex items-center gap-4 mt-8 flex-wrap justify-center">
              {PATTERNS.map(({ key, label, Icon }) => (
                <Button
                  key={key}
                  variant={selectedPattern === key ? "default" : "secondary"}
                  className={`flex items-center gap-2 min-w-[120px] ${selectedPattern === key ? "ring-2 ring-brand-purple" : ""}`}
                  onClick={() => setSelectedPattern(key)}
                  type="button"
                >
                  <Icon className="mr-1" size={20} />
                  {label}
                  {selectedPattern === key && (
                    <SquareCheck className="ml-2 text-brand-purple" size={16} />
                  )}
                </Button>
              ))}
              <Button
                variant={locked ? "destructive" : "outline"}
                className="flex items-center gap-2 ml-4"
                onClick={() => setLocked((v) => !v)}
                type="button"
              >
                {locked ? (
                  <Lock className="mr-2" size={18} />
                ) : (
                  <LockOpen className="mr-2" size={18} />
                )}
                {locked ? "Side Photos Locked" : "Lock Side Photos"}
              </Button>
            </div>
            <div className="my-6 flex flex-col items-center">
              <CollageCanvas
                images={images}
                mainPhotoId={mainPhotoId}
                pattern={selectedPattern}
                locked={locked}
              />
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
                    onClick={() => handleSetMainPhoto(img.id)}
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
        {images.length > 0 && (
          <div className="mt-8 flex justify-center">
            <Button
              variant="destructive"
              className="flex items-center gap-2"
              onClick={clearAllImages}
              disabled={loading}
              type="button"
            >
              <Trash2 size={18} className="mr-2" />
              Clear All
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollageBuilder;
