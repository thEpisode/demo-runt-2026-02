import { useState } from "react";
import { Alert, Box, Button, Divider, IconButton, InputBase, Paper, Stack, Typography } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { AppHeader } from "../components/shared/AppHeader.component";
import { FilterFields } from "../components/shared/FilterFields.component";
import { RestatementCard } from "../components/shared/RestatementCard.component";
import { ValidationBox } from "../components/shared/ValidationBox.component";
import { SqlBlock } from "../components/shared/SqlBlock.component";
import { ResultTable } from "../components/shared/ResultTable.component";
import { displayType, palette } from "../theme/theme";
import { useQuerySpec } from "../hooks/useQuerySpec.hook";

const formatNumber = (value) => new Intl.NumberFormat("es-CO").format(value);

const Bubble = ({ text }) => (
  <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
    <Box
      sx={{
        bgcolor: palette.navy,
        color: "#FFFFFF",
        px: 2.4,
        py: 1.3,
        borderRadius: "18px 18px 4px 18px",
        fontSize: 14.5,
        maxWidth: "75%",
      }}
    >
      {text}
    </Box>
  </Box>
);

export const AssistantPage = () => {
  const {
    entity,
    spec,
    updateSpec,
    result,
    error,
    ask,
    runSpec,
    reset,
    history,
    expected,
    setExpected,
    validation,
    isBusy,
    pagination,
    changePagination,
    canRun,
  } = useQuerySpec();
  const [text, setText] = useState("");

  const send = () => {
    if (!text.trim()) {
      return;
    }

    ask(text, { refine: Boolean(spec) });
    setText("");
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: palette.page }}>
      <AppHeader title="Asistente de consultas" subtitle="Demo interna · RUNT" />

      <Box sx={{ display: "flex", alignItems: "stretch" }}>
        <Box sx={{ flex: 1, minWidth: 0, p: { xs: 2.5, md: 4 }, minHeight: "70vh" }}>
          {!history.length ? (
            <Paper sx={{ p: 6, textAlign: "center" }}>
              <Typography sx={{ color: palette.muted, fontSize: 14.5 }}>
                Pregunta algo sobre el registro de vehículos para iniciar el hilo.
              </Typography>
            </Paper>
          ) : null}

          {history.map((turn, index) => (
            <Box key={index} sx={{ mb: 3.5 }}>
              {turn.manual ? (
                <Typography sx={{ fontSize: 13, color: palette.muted, mb: 1.5 }}>
                  ↳ Filtros ajustados a mano: {turn.payload.restatement}
                </Typography>
              ) : (
                <Bubble text={turn.question} />
              )}

              {turn.payload.needs_clarification ? (
                <Alert severity="info">{turn.payload.clarification}</Alert>
              ) : (
                <Paper sx={{ p: 2.8, maxWidth: "88%" }}>
                  <Stack direction="row" spacing={2} alignItems="baseline">
                    <Typography
                      sx={{ ...displayType, fontSize: 40, color: palette.navy, lineHeight: 1 }}
                    >
                      {formatNumber(turn.payload.answer?.value ?? 0)}
                    </Typography>
                    <Typography sx={{ fontSize: 14.5, color: palette.text }}>
                      {turn.payload.answer?.sentence}
                    </Typography>
                  </Stack>

                  {index === history.length - 1 ? (
                    <Box sx={{ mt: 2 }}>
                      <SqlBlock
                        sql={
                          turn.payload.groups?.length ? turn.payload.group_sql : turn.payload.sql
                        }
                        binds={turn.payload.binds}
                      />
                    </Box>
                  ) : null}
                </Paper>
              )}
            </Box>
          ))}

          {error ? <Alert severity="error">{error}</Alert> : null}

          {result.groups?.length ? (
            <Box sx={{ mt: 1, maxWidth: "100%" }}>
              <ResultTable rows={result.groups.map((group, index) => ({ ID: index, ...group }))} />
            </Box>
          ) : result.rows?.length ? (
            <Box sx={{ mt: 1, maxWidth: "100%" }}>
              <ResultTable
                rows={result.rows}
                total={result.total}
                paginationModel={pagination}
                onPaginationModelChange={changePagination}
                loading={isBusy}
              />
            </Box>
          ) : null}

          <Paper sx={{ mt: 4, p: 1.2, display: "flex", alignItems: "center", gap: 1 }}>
            <InputBase
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && send()}
              placeholder="Escribe otra pregunta o ajusta los filtros a la derecha…"
              sx={{ flex: 1, px: 1.5, fontSize: 14.5 }}
            />
            <IconButton
              onClick={send}
              disabled={isBusy || !text.trim()}
              sx={{
                bgcolor: palette.accent,
                color: "#FFFFFF",
                "&:hover": { bgcolor: palette.accentDark },
                "&.Mui-disabled": { bgcolor: "#C9D4E2", color: "#FFFFFF" },
              }}
            >
              <ArrowUpwardIcon sx={{ fontSize: 19 }} />
            </IconButton>
          </Paper>
        </Box>

        <Box
          sx={{
            width: 360,
            flexShrink: 0,
            bgcolor: "#FFFFFF",
            borderLeft: `1px solid ${palette.border}`,
            p: 3,
            display: { xs: "none", lg: "block" },
          }}
        >
          <FilterFields entity={entity} spec={spec} onChange={updateSpec} onClear={reset} />

          <Divider sx={{ my: 3 }} />

          <RestatementCard
            label="Traducción a lenguaje natural"
            text={result.restatement}
            hint="Se actualiza al cambiar cualquier filtro. Esta frase describe exactamente lo que se va a ejecutar."
          />

          <Button
            fullWidth
            variant="contained"
            disabled={!canRun || isBusy}
            onClick={() => runSpec(spec)}
            sx={{ mt: 2.5, bgcolor: palette.navy, "&:hover": { bgcolor: palette.navyDeep }, py: 1.2 }}
          >
            Ejecutar consulta
          </Button>

          <Divider sx={{ my: 3 }} />

          <ValidationBox
            expected={expected}
            onExpectedChange={setExpected}
            total={result.total}
            validation={validation}
          />
        </Box>
      </Box>
    </Box>
  );
};
