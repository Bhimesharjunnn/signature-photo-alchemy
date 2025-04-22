
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="bg-white border-b border-brand-light-gray shadow-sm py-4">
      <div className="container mx-auto flex items-center justify-between px-4">
        <Link to="/" className="flex items-center">
          <h1 className="text-2xl font-bold text-brand-dark-gray">
            Signature <span className="text-brand-purple">Collage</span> Maker
          </h1>
        </Link>
        <nav className="hidden md:flex items-center space-x-6">
          <Link to="/" className="text-brand-dark-gray hover:text-brand-purple transition-colors">
            Home
          </Link>
          <Link to="/collage" className="text-brand-dark-gray hover:text-brand-purple transition-colors">
            Create Collage
          </Link>
          <Button asChild variant="outline" className="border-brand-purple text-brand-purple hover:bg-brand-light-purple">
            <Link to="/collage">
              Start Your Collage
            </Link>
          </Button>
        </nav>
        <Button asChild variant="outline" className="md:hidden border-brand-purple text-brand-purple hover:bg-brand-light-purple">
          <Link to="/collage">
            Create
          </Link>
        </Button>
      </div>
    </header>
  );
};

export default Header;
