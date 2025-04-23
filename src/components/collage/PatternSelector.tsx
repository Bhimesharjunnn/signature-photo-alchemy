
import { Button } from "@/components/ui/button";
import { Grid2x2, Hexagon, Circle, Lock, LockOpen, SquareCheck } from "lucide-react";
import type { Pattern } from "./types";

interface PatternSelectorProps {
  selectedPattern: Pattern;
  onPatternSelect: (pattern: Pattern) => void;
  locked: boolean;
  onLockToggle: () => void;
}

const PATTERNS: { key: Pattern; label: string; Icon: React.ElementType }[] = [
  { key: "grid", label: "Grid", Icon: Grid2x2 },
  { key: "hexagon", label: "Hexagon", Icon: Hexagon },
  { key: "circular", label: "Circular", Icon: Circle },
];

const PatternSelector = ({
  selectedPattern,
  onPatternSelect,
  locked,
  onLockToggle,
}: PatternSelectorProps) => {
  return (
    <div className="flex items-center gap-4 mt-8 flex-wrap justify-center">
      {PATTERNS.map(({ key, label, Icon }) => (
        <Button
          key={key}
          variant={selectedPattern === key ? "default" : "secondary"}
          className={`flex items-center gap-2 min-w-[120px] ${
            selectedPattern === key ? "ring-2 ring-brand-purple" : ""
          }`}
          onClick={() => onPatternSelect(key)}
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
        onClick={onLockToggle}
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
  );
};

export default PatternSelector;
