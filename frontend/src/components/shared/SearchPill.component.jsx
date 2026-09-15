import { Box, CircularProgress, IconButton, InputBase } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { palette } from "../../theme/theme";

export const SearchPill = ({ value, onChange, onSubmit, onClear, busy, placeholder, autoFocus }) => (
  <Box
    component="form"
    onSubmit={(event) => {
      event.preventDefault();
      onSubmit?.(value);
    }}
    sx={{
      display: "flex",
      alignItems: "center",
      bgcolor: "#FFFFFF",
      borderRadius: 99,
      pl: 3,
      pr: 0.8,
      py: 0.8,
      boxShadow: "0 10px 30px rgba(12, 26, 51, 0.18)",
      width: "100%",
    }}
  >
    <InputBase
      value={value}
      autoFocus={autoFocus}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key !== "Enter") {
          return;
        }

        event.preventDefault();
        onSubmit?.(value);
      }}
      placeholder={placeholder}
      sx={{ flex: 1, fontSize: 17, color: palette.text, "& input::placeholder": { opacity: 0.55 } }}
    />
    {value ? (
      <IconButton size="small" onClick={onClear} aria-label="Limpiar">
        <CloseIcon sx={{ fontSize: 19, color: palette.muted }} />
      </IconButton>
    ) : null}
    <IconButton
      type="submit"
      disabled={busy}
      sx={{
        ml: 0.6,
        bgcolor: palette.accent,
        color: "#FFFFFF",
        width: 42,
        height: 42,
        "&:hover": { bgcolor: palette.accentDark },
        "&.Mui-disabled": { bgcolor: palette.accent, opacity: 0.6, color: "#FFFFFF" },
      }}
      aria-label="Consultar"
    >
      {busy ? (
        <CircularProgress size={18} sx={{ color: "#FFFFFF" }} />
      ) : (
        <SearchIcon sx={{ fontSize: 20 }} />
      )}
    </IconButton>
  </Box>
);
