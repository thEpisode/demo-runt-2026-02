import { useState } from "react";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "../components/shared/AppHeader.component";
import { SearchPill } from "../components/shared/SearchPill.component";
import { displayType, palette } from "../theme/theme";
import { useQuerySpec } from "../hooks/useQuerySpec.hook";

export const HomePage = () => {
  const navigate = useNavigate();
  const { catalog, catalogError, entity, ask, isBusy } = useQuerySpec();
  const [text, setText] = useState("");

  const launch = (question) => {
    if (!question?.trim()) {
      return;
    }

    navigate("/buscador");
    ask(question);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: palette.page }}>
      <AppHeader
        title="Consulta inteligente"
        subtitle="Demo interna · Registro Único Nacional de Tránsito"
      />

      <Box sx={{ maxWidth: 1000, mx: "auto", px: { xs: 2.5, md: 4 }, pt: { xs: 7, md: 11 } }}>
        <Typography
          align="center"
          sx={{ ...displayType, fontSize: { xs: 32, md: 43 }, color: palette.navy }}
        >
          ¿Qué quieres saber del RUNT hoy?
        </Typography>
        <Typography
          align="center"
          sx={{ fontSize: 15.5, color: palette.muted, mt: 1.5, maxWidth: 600, mx: "auto" }}
        >
          Escribe la pregunta en tus palabras. La convertimos en filtros y en una consulta a la base
          de datos que puedes revisar antes de confiar en el número.
        </Typography>

        <Box sx={{ mt: 5, maxWidth: 760, mx: "auto" }}>
          <SearchPill
            autoFocus
            value={text}
            onChange={setText}
            onSubmit={launch}
            onClear={() => setText("")}
            busy={isBusy}
            placeholder="Ej.: ¿cuántos vehículos de color amarillo hay activos?"
          />
          <Stack
            direction="row"
            justifyContent="space-between"
            sx={{ mt: 1.5, px: 1, fontSize: 13, color: palette.muted }}
          >
            <span>Consultar en Vehículos</span>
            <Box
              component="span"
              onClick={() => navigate("/constructor")}
              sx={{ color: palette.accent, cursor: "pointer" }}
            >
              Enter para preguntar · o construir con filtros
            </Box>
          </Stack>
        </Box>

        {catalogError ? (
          <Paper sx={{ mt: 5, p: 2.5, bgcolor: palette.dangerSoft, borderColor: palette.danger }}>
            <Typography sx={{ fontSize: 14, color: palette.danger }}>
              No hay conexión con el servicio de consultas: {catalogError}
            </Typography>
          </Paper>
        ) : null}

        <Typography variant="overline" sx={{ color: palette.muted, display: "block", mt: 6, mb: 1.5 }}>
          Preguntas de prueba
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 1.5,
          }}
        >
          {(catalog?.example_questions || []).map((example) => (
            <Paper
              key={example.text}
              onClick={() => launch(example.text)}
              sx={{
                p: 2.2,
                display: "flex",
                gap: 1.6,
                alignItems: "flex-start",
                cursor: "pointer",
                transition: "border-color .15s, transform .15s",
                "&:hover": { borderColor: palette.accent, transform: "translateY(-1px)" },
              }}
            >
              <Chip
                size="small"
                label="Vehículos"
                sx={{ bgcolor: "#E8F1FB", color: palette.navy, fontSize: 11.5 }}
              />
              <Typography sx={{ fontSize: 14.5, lineHeight: 1.45 }}>{example.text}</Typography>
            </Paper>
          ))}
        </Box>

        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          spacing={1}
          sx={{ mt: 6, pt: 2.5, borderTop: `1px solid ${palette.border}`, pb: 8 }}
        >
          <Typography sx={{ fontSize: 13, color: palette.muted }}>
            {entity ? `${entity.label} · ${entity.dimensions.length} campos` : "Cargando esquema…"}
            {"  ·  "}
            Licencias y Revisiones RTM no están incluidas en esta demo
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
};
