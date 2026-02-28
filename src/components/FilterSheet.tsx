import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter } from "lucide-react";

interface FilterSheetProps {
  rankFilter: string;
  roleFilter: string;
  languageFilter: string;
  onRankChange: (v: string) => void;
  onRoleChange: (v: string) => void;
  onLanguageChange: (v: string) => void;
  onClear: () => void;
}

const ranks = ["All", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Heroic"];
const roles = ["All", "Rusher", "Sniper", "Support"];
const languages = ["All", "Bangla", "English", "Hindi"];

const FilterSheet = ({ rankFilter, roleFilter, languageFilter, onRankChange, onRoleChange, onLanguageChange, onClear }: FilterSheetProps) => {
  const hasFilters = rankFilter !== "All" || roleFilter !== "All" || languageFilter !== "All";

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="relative p-2.5 rounded-lg bg-secondary border border-border transition-all hover:border-primary">
          <Filter className="w-5 h-5 text-foreground" />
          {hasFilters && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full" />
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="bg-card border-border rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="font-gaming text-foreground text-left">Filters</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4 pb-4">
          <FilterGroup label="Rank" options={ranks} value={rankFilter} onChange={onRankChange} />
          <FilterGroup label="Role" options={roles} value={roleFilter} onChange={onRoleChange} />
          <FilterGroup label="Language" options={languages} value={languageFilter} onChange={onLanguageChange} />
          {hasFilters && (
            <button onClick={onClear} className="w-full py-2 text-sm text-primary font-medium">
              Clear All Filters
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

const FilterGroup = ({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) => (
  <div>
    <p className="text-xs text-muted-foreground mb-2 font-medium">{label}</p>
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            value === opt
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:border-primary border border-border"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
);

export default FilterSheet;
