
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface ImageUploaderProps {
  loading: boolean;
  canAdd: boolean;
  onFilesSelected: (files: FileList) => void;
}

const ImageUploader = ({ loading, canAdd, onFilesSelected }: ImageUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    onFilesSelected(event.dataTransfer.files);
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

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length) {
      onFilesSelected(event.target.files);
      event.target.value = "";
    }
  };

  return (
    <div
      className={`
        flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed
        rounded-lg p-8 cursor-pointer relative
        transition-colors
        ${dragActive ? "border-brand-purple bg-brand-light-purple/30" : "border-brand-light-gray"}
      `}
      tabIndex={0}
      onClick={() => (!loading && canAdd) ? handleUploadClick() : undefined}
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
        disabled={loading || !canAdd}
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
        onChange={handleFileInputChange}
        disabled={loading || !canAdd}
      />
      <span className="mt-2 text-xs text-brand-cool-gray">
        Max 100 photos per session. JPEG, PNG, GIF supported.
      </span>
    </div>
  );
};

export default ImageUploader;
