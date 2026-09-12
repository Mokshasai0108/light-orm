import type { TodoFilter } from "../api.js";

const OPTIONS: { value: TodoFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

interface Props {
  value: TodoFilter;
  onChange: (filter: TodoFilter) => void;
}

export function FilterTabs({ value, onChange }: Props) {
  return (
    <div className="filter-tabs" role="tablist" aria-label="Filter todos">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={value === opt.value}
          className={value === opt.value ? "filter-tab filter-tab--active" : "filter-tab"}
          onClick={() => onChange(opt.value)}
          type="button"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
