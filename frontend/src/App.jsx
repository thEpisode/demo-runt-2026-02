import { CssBaseline, ThemeProvider } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import { theme } from "./theme/theme";
import { QueryProvider } from "./hooks/useQuerySpec.hook";
import { AppRoutes } from "./routes/app.routes";

export const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <QueryProvider>
        <AppRoutes />
      </QueryProvider>
    </BrowserRouter>
  </ThemeProvider>
);
