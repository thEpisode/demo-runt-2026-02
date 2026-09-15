import { createTheme } from "@mui/material/styles";

export const palette = {
  navy: "#253B63",
  navyDeep: "#1C2E4F",
  navySoft: "#32496F",
  accent: "#29A3DB",
  accentDark: "#1B85B8",
  page: "#F1F4F9",
  surface: "#FFFFFF",
  border: "#E1E7F0",
  text: "#1F2A44",
  muted: "#66748F",
  success: "#1E7A4A",
  successSoft: "#E6F4EC",
  warning: "#946200",
  warningSoft: "#FDF3D9",
  danger: "#B3261E",
  dangerSoft: "#FCEBEA",
  code: "#16233D",
};

// One sans stack for the whole interface. No webfont: the demo runs on the
// client's machine behind a VPN, so the type must resolve locally.
const sans = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: palette.navy, dark: palette.navyDeep, contrastText: "#FFFFFF" },
    secondary: { main: palette.accent, dark: palette.accentDark, contrastText: "#FFFFFF" },
    background: { default: palette.page, paper: palette.surface },
    text: { primary: palette.text, secondary: palette.muted },
    divider: palette.border,
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: sans,
    h1: { fontWeight: 600, letterSpacing: "-0.02em" },
    h2: { fontWeight: 600, letterSpacing: "-0.015em" },
    h3: { fontWeight: 600, letterSpacing: "-0.01em" },
    button: { textTransform: "none", fontWeight: 600 },
    overline: { letterSpacing: "0.12em", fontWeight: 600, fontSize: 11 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none", border: `1px solid ${palette.border}` },
      },
    },
    MuiButton: { styleOverrides: { root: { boxShadow: "none" } } },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontSize: 11,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: palette.muted,
          fontWeight: 600,
          borderBottom: `1px solid ${palette.border}`,
        },
        body: { fontSize: 14, borderBottom: `1px solid ${palette.border}` },
      },
    },
  },
});

// Display type is the same family, set tighter and heavier. Figures are
// tabular so a changing count does not shift the layout.
export const displayType = {
  fontFamily: sans,
  fontWeight: 600,
  letterSpacing: "-0.03em",
  fontVariantNumeric: "tabular-nums",
};
