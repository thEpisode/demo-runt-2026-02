import { Box } from "@mui/material";

export const RuntLogo = ({ size = 38 }) => (
  <Box
    sx={{
      width: size,
      height: size,
      borderRadius: "9px",
      bgcolor: "#FFFFFF",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    <Box
      component="svg"
      viewBox="0 0 24 24"
      sx={{ width: size * 0.5, height: size * 0.5, mb: "-2px" }}
      aria-hidden
    >
      <path
        d="M5 20V5h7a4.5 4.5 0 0 1 0 9H8l8 6"
        fill="none"
        stroke="#253B63"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Box>
    <Box sx={{ fontSize: size * 0.2, fontWeight: 800, color: "#253B63", letterSpacing: "0.04em" }}>
      RUNT
    </Box>
  </Box>
);
