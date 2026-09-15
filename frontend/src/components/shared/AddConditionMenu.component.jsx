import { useState } from "react";
import { Button, Menu, MenuItem, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { palette } from "../../theme/theme";
import { availableDimensions } from "./spec.helpers";

/**
 * Picking the field and typing the value are two steps. Adding a condition
 * blindly would pile up empty rows the user never asked for.
 */
export const AddConditionMenu = ({ entity, spec, onSelect, label = "Agregar condición", dark }) => {
  const [anchor, setAnchor] = useState(null);
  const options = availableDimensions(entity, spec);

  if (!options.length) {
    return (
      <Typography
        sx={{ fontSize: 12.5, color: dark ? "rgba(255,255,255,0.45)" : palette.muted, mt: 1.5 }}
      >
        No quedan campos por filtrar.
      </Typography>
    );
  }

  return (
    <>
      <Button
        onClick={(event) => setAnchor(event.currentTarget)}
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

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { maxHeight: 340, minWidth: 220 } } }}
      >
        {options.map((dimension) => (
          <MenuItem
            key={dimension.name}
            onClick={() => {
              onSelect(dimension.name);
              setAnchor(null);
            }}
            sx={{ fontSize: 13.5 }}
          >
            {dimension.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
