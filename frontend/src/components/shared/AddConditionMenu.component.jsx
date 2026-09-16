import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { palette } from "../../theme/theme";
import { FilterAutocomplete } from "./FilterAutocomplete.component";
import { conditionFieldOptions } from "./spec.helpers";

/**
 * Picking the field and typing the value are two steps. Adding a condition
 * blindly would pile up empty rows the user never asked for.
 */
export const AddConditionMenu = ({ entity, spec, onSelect, label = "Agregar condición", dark }) => {
  const [picking, setPicking] = useState(false);
  const options = conditionFieldOptions(entity, spec);

  if (options.every((option) => option.disabled)) {
    return (
      <Typography
        sx={{ fontSize: 12.5, color: dark ? "rgba(255,255,255,0.45)" : palette.muted, mt: 1.5 }}
      >
        No quedan campos por filtrar.
      </Typography>
    );
  }

  if (picking) {
    return (
      <Box sx={{ mt: dark ? 1.5 : 0, width: dark ? "100%" : 260, maxWidth: "100%" }}>
        <FilterAutocomplete
          dark={dark}
          autoFocus
          disableClearable
          placeholder="Busca un campo"
          options={options}
          value={null}
          onClose={() => setPicking(false)}
          onChange={(selected) => {
            setPicking(false);

            if (selected?.value) {
              onSelect(selected.value);
            }
          }}
        />
      </Box>
    );
  }

  return (
    <Button
      onClick={() => setPicking(true)}
      startIcon={<AddIcon sx={{ fontSize: 17 }} />}
      sx={{
        color: dark ? "#7FD3F5" : palette.accent,
        fontSize: 13,
        px: 0,
        mt: dark ? 1.5 : 0,
      }}
    >
      {label}
    </Button>
  );
};
