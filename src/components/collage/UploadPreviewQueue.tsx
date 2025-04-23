
import { Button } from "@/components/ui/button";
import { Trash2, Upload } from "lucide-react";
import type { PreviewImage } from "@/hooks/useImageUploadQueue";

interface UploadPreviewQueueProps {
  queue: PreviewImage[];
  onReplace: (id: string) => void;
  onRemove: (id: string) => void;
  onUploadAll: () => Promise<void>;
  uploading: boolean;
  loading: boolean;
}

const UploadPreviewQueue = ({
  queue,
  onReplace,
  onRemove,
  onUploadAll,
  uploading,
  loading,
}: UploadPreviewQueueProps) => {
  if (queue.length === 0) return null;

  return (
    <div className="mt-6">
      <h4 className="font-semibold mb-2">Selected Photos (Preview):</h4>
      <div className="flex flex-wrap gap-4">
        {queue.map(img => (
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
                  onClick={() => onReplace(img.id)}
                  type="button"
                >
                  Replace
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="px-2 py-0.5"
                  onClick={() => onRemove(img.id)}
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
          disabled={queue.length === 0 || uploading || loading}
          onClick={onUploadAll}
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
  );
};

export default UploadPreviewQueue;
