import { useEffect } from "react";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import { AppHeader } from "../components/shared/AppHeader.component";
import { FilterRows } from "../components/shared/FilterRows.component";
import { SqlBlock } from "../components/shared/SqlBlock.component";
import { ResultTable } from "../components/shared/ResultTable.component";
import { EMPTY_SPEC } from "../components/shared/spec.helpers";
import { displayType, palette } from "../theme/theme";
import { useQuerySpec } from "../hooks/useQuerySpec.hook";

const formatNumber = (value) => new Intl.NumberFormat("es-CO").format(value);

const StepBadge = ({ number, label, dark }) => (
  <Stack direction="row" spacing={1.4} alignItems="center">
    <Box
      sx={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        bgcolor: dark ? "rgba(255,255,255,0.22)" : palette.navy,
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: 700,
        display: "grid",
        placeItems: "center",
      }}
    >
      {number}
    </Box>
    <Typography sx={{ fontSize: 15.5, fontWeight: 600, color: dark ? "#FFFFFF" : palette.text }}>
      {label}
    </Typography>
  </Stack>
);

export const BuilderPage = () => {
  const { entity, spec, updateSpec, result, error, runSpec, isBusy, status, pagination, changePagination, canRun } =
    useQuerySpec();

  useEffect(() => {
    if (!spec && entity) {
      updateSpec({
        ...EMPTY_SPEC,
        filters: [{ dimension: "estado", operator: "eq", value: "ACTIVO" }],
      });
    }
  }, [entity, spec, updateSpec]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: palette.page }}>
      <AppHeader title="Constructor de consultas" subtitle="Demo · datos reales · solo lectura" />

      <Box sx={{ maxWidth: 1320, mx: "auto", px: { xs: 2.5, md: 4 }, py: 4 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
            gap: 2.5,
          }}
        >
          <Paper sx={{ p: 3 }}>
            <FilterRows entity={entity} spec={spec} onChange={updateSpec} />
          </Paper>

          <Paper sx={{ p: 3, bgcolor: palette.navy, borderColor: palette.navy }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <StepBadge number={2} label="Pregunta redactada" dark />
              <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                generada desde los filtros
              </Typography>
            </Stack>

            <Typography
              sx={{
                ...displayType,
                fontSize: { xs: 22, md: 27 },
                lineHeight: 1.35,
                color: "#FFFFFF",
                mt: 2.5,
                minHeight: 92,
              }}
            >
              {result.restatement || "Agrega condiciones para redactar la pregunta."}
            </Typography>

            <Typography sx={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", mt: 2 }}>
              Esta frase se arma sin llamar al modelo: es la misma consulta, escrita en palabras.
            </Typography>

            <Stack direction="row" spacing={1.4} sx={{ mt: 2.5 }}>
              <Button
                variant="contained"
                disabled={!canRun || isBusy}
                onClick={() => runSpec(spec)}
                sx={{ bgcolor: palette.accent, "&:hover": { bgcolor: palette.accentDark }, px: 2.5 }}
              >
                Generar y ejecutar
              </Button>
              <Button
                variant="outlined"
                disabled={!canRun || isBusy}
                onClick={() => runSpec(spec, { dry_run: true })}
                sx={{ borderColor: "rgba(255,255,255,0.4)", color: "#FFFFFF", px: 2.5 }}
              >
                Solo ver SQL
              </Button>
            </Stack>
          </Paper>
        </Box>

        <Paper sx={{ mt: 2.5, p: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
            <StepBadge number={3} label="Resultado" />
            {result.meta?.timingMs ? (
              <Typography sx={{ fontSize: 12.5, color: palette.muted }}>
                {result.meta.queryCount} consultas · {(result.meta.timingMs / 1000).toFixed(1)} s
              </Typography>
            ) : null}
          </Stack>

          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "300px 1fr" },
              gap: 3,
              alignItems: "start",
            }}
          >
            <Box>
              {result.answer ? (
                <>
                  <Typography
                    sx={{ ...displayType, fontSize: 52, color: palette.navy, lineHeight: 1 }}
                  >
                    {formatNumber(result.answer.value)}
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: palette.muted, mt: 1 }}>
                    {result.answer.sentence}
                  </Typography>
                </>
              ) : (
                <Typography sx={{ fontSize: 14, color: palette.muted }}>
                  {status === "done" ? "Consulta compilada, sin ejecutar." : "Aún sin ejecutar."}
                </Typography>
              )}

              {result.meta && result.meta.usesIndex === false ? (
                <Alert severity="warning" sx={{ mt: 2, fontSize: 12.5 }}>
                  Ningún filtro usa un índice: la consulta recorre la tabla completa.
                </Alert>
              ) : null}

              <Box sx={{ mt: 2.5 }}>
                <SqlBlock sql={result.sql} binds={result.binds} defaultOpen dense />
              </Box>
            </Box>

            <Box>
              {result.groups?.length ? (
                <ResultTable rows={result.groups.map((group, index) => ({ ID: index, ...group }))} />
              ) : (
                <ResultTable
                  rows={result.rows}
                  total={result.total}
                  paginationModel={pagination}
                  onPaginationModelChange={changePagination}
                  loading={isBusy}
                />
              )}
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};
