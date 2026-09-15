import { Box } from "@mui/material";
import logo from "../../assets/runt-logo.png";

export const RuntLogo = ({ size = 42 }) => (
  <Box
    component="img"
    src={logo}
    alt="RUNT"
    sx={{ width: size, height: size, borderRadius: "9px", display: "block", flexShrink: 0 }}
  />
);
