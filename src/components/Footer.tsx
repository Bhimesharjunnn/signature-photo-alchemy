
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t border-brand-light-gray py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h2 className="text-xl font-bold text-brand-dark-gray">
              Signature <span className="text-brand-purple">Collage</span> Maker
            </h2>
            <p className="text-brand-cool-gray text-sm mt-2">
              Create beautiful photo collages with ease.
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-4 md:gap-8">
            <Link to="/" className="text-brand-cool-gray hover:text-brand-purple transition-colors">
              Home
            </Link>
            <Link to="/collage" className="text-brand-cool-gray hover:text-brand-purple transition-colors">
              Create Collage
            </Link>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-brand-light-gray text-center text-brand-cool-gray text-sm">
          © {currentYear} Signature Collage Maker. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
