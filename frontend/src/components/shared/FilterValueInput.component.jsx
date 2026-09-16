import { InputBase } from "@mui/material";
import { palette } from "../../theme/theme";
import { FilterAutocomplete } from "./FilterAutocomplete.component";
import { acceptsManyValues } from "./spec.helpers";

export const FilterValueInput = ({ dimension, operator, value, onChange, dark }) => {
  const options = dimension?.values || [];
  const current = Array.isArray(value) ? value[0] || "" : value || "";

  if (acceptsManyValues(dimension, operator)) {
    const values = Array.isArray(value) ? value : [value].filter(Boolean);

    return (
      <FilterAutocomplete
        dark={dark}
        multiple
        options={options.map((option) => option.label)}
        value={values}
        onChange={onChange}
      />
    );
  }

  if (options.length) {
    return (
      <FilterAutocomplete
        dark={dark}
        options={options.map((option) => option.label)}
        value={current || null}
        onChange={onChange}
      />
    );
  }

  return (
    <InputBase
      value={current}
      onChange={(event) => onChange(event.target.value)}
      placeholder={dimension?.kind === "number" ? "0" : "Valor"}
      sx={{
        fontSize: 13.5,
        px: 1.4,
        py: 0.75,
        borderRadius: 1.5,
        width: "100%",
        color: dark ? "#FFFFFF" : palette.text,
        border: `1px solid ${dark ? "rgba(255,255,255,0.22)" : palette.border}`,
        bgcolor: dark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
      }}
    />
  );
};
