
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCollageImages } from "@/hooks/useCollageImages";
import { Image as ImageIcon, Upload, Trash2 } from "lucide-react";

const CollageBuilder = () => {
  const {
    images,
    loading,
    uploadImages,
    clearAllImages,
  } = useCollageImages();

  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
        <div className="flex flex-wrap gap-4 mt-6 justify-center">
          {images.length > 0 &&
            images.map((img) => (
              <div
                key={img.id}
                className="w-20 h-20 relative bg-brand-light-purple rounded overflow-hidden flex items-center justify-center shadow border border-brand-light-gray"
                title={img.name}
              >
                <img
                  src={img.url}
                  alt={img.name}
                  className="object-cover w-full h-full"
                  draggable={false}
                  loading="lazy"
                />
              </div>
            ))}
        </div>
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
