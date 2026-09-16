import { Box, Stack, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { RuntLogo } from "./RuntLogo.component";
import { palette } from "../../theme/theme";

const SURFACES = [
  { label: "Buscador", path: "/buscador" },
  { label: "Asistente", path: "/asistente" },
  { label: "Constructor", path: "/constructor" },
];

export const AppHeader = ({ title, subtitle, children, showSurfaces = true }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box sx={{ bgcolor: palette.navy, color: "#FFFFFF", pb: children ? 4 : 0 }}>
      <Box sx={{ maxWidth: 1320, mx: "auto", px: { xs: 2.5, md: 4 }, pt: 2.5 }}>
        <Stack direction="row" spacing={1.8} alignItems="center">
          <Box sx={{ cursor: "pointer" }} onClick={() => navigate("/")}>
            <RuntLogo />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 19, fontWeight: 700, lineHeight: 1.2 }}>{title}</Typography>
            <Typography sx={{ fontSize: 12.5, color: "rgba(255,255,255,0.68)" }}>
              {subtitle}
            </Typography>
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={{ xs: 2, sm: 3 }}
          sx={{ mt: 2.5, flexWrap: "wrap", rowGap: 1.2 }}
          alignItems="center"
        >
          {showSurfaces ? (
            <Stack direction="row" spacing={0.6} sx={{ pb: 0.6 }}>
              {SURFACES.map((surface) => {
                const active = location.pathname === surface.path;

                return (
                  <Box
                    key={surface.path}
                    onClick={() => navigate(surface.path)}
                    sx={{
                      px: 1.6,
                      py: 0.5,
                      borderRadius: 99,
                      fontSize: 12.5,
                      cursor: "pointer",
                      color: active ? palette.navy : "rgba(255,255,255,0.8)",
                      bgcolor: active ? "#FFFFFF" : "rgba(255,255,255,0.1)",
                      fontWeight: active ? 700 : 500,
                      "&:hover": { bgcolor: active ? "#FFFFFF" : "rgba(255,255,255,0.2)" },
                    }}
                  >
                    {surface.label}
                  </Box>
                );
              })}
            </Stack>
          ) : null}
        </Stack>

        {children}
      </Box>
    </Box>
  );
};
