
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { CollageImage } from "@/hooks/useCollageImages";

interface ImageGalleryProps {
  images: CollageImage[];
  mainPhotoId: string | null;
  onMainPhotoSelect: (id: string) => void;
  locked: boolean;
  onClearAll: () => void;
  loading: boolean;
}

const ImageGallery = ({
  images,
  mainPhotoId,
  onMainPhotoSelect,
  locked,
  onClearAll,
  loading,
}: ImageGalleryProps) => {
  return (
    <>
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
            title={img.id === mainPhotoId ? `${img.name} (Main)` : img.name}
            onClick={() => onMainPhotoSelect(img.id)}
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
      {images.length > 0 && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="destructive"
            className="flex items-center gap-2"
            onClick={onClearAll}
            disabled={loading}
            type="button"
          >
            <Trash2 size={18} className="mr-2" />
            Clear All
          </Button>
        </div>
      )}
    </>
  );
};

export default ImageGallery;
