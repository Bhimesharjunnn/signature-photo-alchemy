
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const CollageBuilder = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleStartCollage = () => {
    setIsLoading(true);
    // This will be implemented in the next phase
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Ready to build your collage!");
    }, 1000);
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
        <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-brand-light-gray rounded-lg p-8">
          <p className="text-brand-cool-gray mb-6 text-center">
            Your collage workspace will appear here in the next phase of development.
          </p>
          <Button 
            className="bg-brand-purple hover:bg-brand-purple/90"
            onClick={handleStartCollage}
            disabled={isLoading}
          >
            {isLoading ? "Preparing..." : "Start Your Collage"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CollageBuilder;
