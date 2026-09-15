import { InputBase, MenuItem, Select } from "@mui/material";
import { palette } from "../../theme/theme";

const baseField = (dark) => ({
  fontSize: 13.5,
  px: 1.4,
  py: 0.75,
  borderRadius: 1.5,
  width: "100%",
  color: dark ? "#FFFFFF" : palette.text,
  border: `1px solid ${dark ? "rgba(255,255,255,0.22)" : palette.border}`,
  bgcolor: dark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
});

export const FilterValueInput = ({ dimension, value, onChange, dark }) => {
  const options = dimension?.values || [];

  if (options.length) {
    return (
      <Select
        value={Array.isArray(value) ? value[0] || "" : value || ""}
        onChange={(event) => onChange(event.target.value)}
        variant="standard"
        disableUnderline
        sx={{ ...baseField(dark), "& .MuiSelect-icon": { color: dark ? "#FFFFFF" : palette.muted } }}
        MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
      >
        {options.map((option) => (
          <MenuItem key={option.id} value={option.label} sx={{ fontSize: 13.5 }}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    );
  }

  return (
    <InputBase
      value={Array.isArray(value) ? value.join(", ") : value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder={dimension?.kind === "number" ? "0" : "Valor"}
      sx={baseField(dark)}
    />
  );
};
