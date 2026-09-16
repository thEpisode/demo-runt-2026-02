import { Autocomplete, Box, TextField } from "@mui/material";
import { palette } from "../../theme/theme";

/**
 * Every filter control is a searchable combo: the parameter tables can hold
 * hundreds of values in production, and scrolling a plain select to find a
 * colour is not something a demo should ask of anyone.
 */
export const FilterAutocomplete = ({
  options,
  value,
  onChange,
  placeholder = "Selecciona un valor",
  dark,
  freeSolo,
  disableClearable,
  multiple,
  autoFocus,
  onClose,
}) => (
  <Autocomplete
    options={options}
    value={value ?? (multiple ? [] : null)}
    onChange={(_event, next) => onChange(next ?? (multiple ? [] : ""))}
    onInputChange={
      freeSolo ? (_event, next, reason) => reason === "input" && onChange(next) : undefined
    }
    onClose={onClose}
    freeSolo={freeSolo}
    disableClearable={disableClearable}
    multiple={multiple}
    filterSelectedOptions={multiple}
    openOnFocus={autoFocus}
    autoHighlight
    selectOnFocus
    handleHomeEndKeys
    getOptionLabel={(option) => (typeof option === "string" ? option : option?.label || "")}
    getOptionDisabled={(option) => Boolean(option?.disabled)}
    isOptionEqualToValue={(option, selected) =>
      (typeof option === "string" ? option : option.value) ===
      (typeof selected === "string" ? selected : selected?.value)
    }
    noOptionsText="Sin coincidencias"
    slotProps={{
      paper: { sx: { fontSize: 13.5 } },
      listbox: { sx: { fontSize: 13.5, maxHeight: 280 } },
      chip: { size: "small" },
    }}
    renderOption={(props, option) => {
      const { key, ...rest } = props;
      const label = typeof option === "string" ? option : option.label;

      return (
        <Box
          component="li"
          key={key}
          {...rest}
          sx={{ fontSize: 13.5, flexDirection: "column", alignItems: "flex-start !important" }}
        >
          {label}
          {option?.hint ? (
            <Box component="span" sx={{ fontSize: 11.5, color: palette.muted }}>
              {option.hint}
            </Box>
          ) : null}
        </Box>
      );
    }}
    renderInput={(params) => (
      <TextField
        {...params}
        autoFocus={autoFocus}
        placeholder={multiple && value?.length ? "" : placeholder}
        variant="standard"
        slotProps={{
          input: {
            ...params.InputProps,
            disableUnderline: true,
            sx: {
              fontSize: 13.5,
              px: 1.4,
              py: 0.35,
              borderRadius: 1.5,
              color: dark ? "#FFFFFF" : palette.text,
              border: `1px solid ${dark ? "rgba(255,255,255,0.22)" : palette.border}`,
              bgcolor: dark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
              "& input::placeholder": { opacity: dark ? 0.55 : 0.6 },
              "& .MuiAutocomplete-endAdornment": { right: 6 },
              "& .MuiSvgIcon-root": { color: dark ? "rgba(255,255,255,0.7)" : palette.muted },
              "& .MuiChip-root": {
                fontSize: 12.5,
                color: dark ? "#FFFFFF" : palette.text,
                bgcolor: dark ? "rgba(255,255,255,0.14)" : palette.page,
              },
            },
          },
        }}
      />
    )}
  />
);
