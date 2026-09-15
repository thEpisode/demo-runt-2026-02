import { Box, Typography } from "@mui/material";
import { displayType, palette } from "../../theme/theme";

/**
 * The sentence the user reads instead of the SQL. It is regenerated from the
 * spec, so it always describes exactly what is about to run.
 */
export const RestatementCard = ({ label, text, tone = "light", editable, onChange, hint }) => {
  const dark = tone === "dark";

  return (
    <Box>
      {label ? (
        <Typography
          variant="overline"
          sx={{ color: dark ? "rgba(255,255,255,0.55)" : palette.muted, display: "block", mb: 0.8 }}
        >
          {label}
        </Typography>
      ) : null}

      {editable ? (
        <Box
          component="textarea"
          value={text}
          onChange={(event) => onChange?.(event.target.value)}
          rows={3}
          sx={{
            width: "100%",
            resize: "vertical",
            border: "none",
            outline: "none",
            bgcolor: "transparent",
            color: dark ? "#FFFFFF" : palette.text,
            ...displayType,
            fontSize: 25,
            lineHeight: 1.35,
            p: 0,
          }}
        />
      ) : (
        <Typography
          sx={{
            ...displayType,
            fontSize: dark ? 15.5 : 17,
            lineHeight: 1.5,
            color: dark ? "rgba(255,255,255,0.92)" : palette.text,
          }}
        >
          {text ? `“${text}”` : "—"}
        </Typography>
      )}

      {hint ? (
        <Typography
          sx={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.5)" : palette.muted, mt: 1 }}
        >
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
};
