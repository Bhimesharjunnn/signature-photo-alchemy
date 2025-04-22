
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Image, Layout, Download } from "lucide-react";

const LandingPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-brand-dark-gray">
                  Create Beautiful Photo Collages Easily
                </h1>
                <p className="text-lg text-brand-neutral-gray max-w-md">
                  Upload your photos, arrange them in elegant patterns, and download high-quality collages for any occasion.
                </p>
                <div className="pt-4">
                  <Button asChild size="lg" className="bg-brand-purple hover:bg-brand-purple/90 text-white">
                    <Link to="/collage" className="flex items-center gap-2">
                      Start Your Collage <ArrowRight size={18} />
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="bg-brand-light-purple rounded-2xl p-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
                <div className="aspect-square bg-white rounded-xl shadow-lg flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-2 p-4 w-full h-full">
                    <div className="col-span-2 row-span-2 bg-brand-light-gray rounded-lg"></div>
                    <div className="bg-brand-light-gray rounded-lg"></div>
                    <div className="bg-brand-light-gray rounded-lg"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4 bg-brand-light-gray">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-brand-dark-gray">
              Simple Steps, Stunning Results
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col items-center text-center animate-fade-in" style={{ animationDelay: "0.1s" }}>
                <div className="w-16 h-16 rounded-full bg-brand-light-purple flex items-center justify-center mb-4">
                  <Image className="w-8 h-8 text-brand-purple" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-brand-dark-gray">Upload Photos</h3>
                <p className="text-brand-cool-gray">
                  Drag & drop or select up to 100 photos to include in your collage.
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col items-center text-center animate-fade-in" style={{ animationDelay: "0.2s" }}>
                <div className="w-16 h-16 rounded-full bg-brand-light-purple flex items-center justify-center mb-4">
                  <Layout className="w-8 h-8 text-brand-purple" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-brand-dark-gray">Choose Pattern</h3>
                <p className="text-brand-cool-gray">
                  Select from grid, hexagon, or circular patterns for your collage layout.
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col items-center text-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
                <div className="w-16 h-16 rounded-full bg-brand-light-purple flex items-center justify-center mb-4">
                  <Download className="w-8 h-8 text-brand-purple" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-brand-dark-gray">Download & Share</h3>
                <p className="text-brand-cool-gray">
                  Export your collage as a high-resolution PNG or PDF ready for printing.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="bg-brand-purple rounded-2xl p-8 md:p-12 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
                Ready to Create Your Signature Collage?
              </h2>
              <p className="text-white/80 max-w-xl mx-auto mb-8">
                Start creating beautiful photo arrangements with our easy-to-use tool. No sign-up required!
              </p>
              <Button asChild size="lg" variant="secondary" className="bg-white text-brand-purple hover:bg-brand-light-purple">
                <Link to="/collage">
                  Start Your Collage
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
