import { useEffect, useState } from "react";
import { Alert, Box, Button, InputBase, Paper, Stack, Typography } from "@mui/material";
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight";
import { AppHeader } from "../components/shared/AppHeader.component";
import { SearchPill } from "../components/shared/SearchPill.component";
import { FilterChips } from "../components/shared/FilterChips.component";
import { AnswerCard } from "../components/shared/AnswerCard.component";
import { ResultTable } from "../components/shared/ResultTable.component";
import { palette } from "../theme/theme";
import { useQuerySpec } from "../hooks/useQuerySpec.hook";

export const SearchPage = () => {
  const {
    catalog,
    entity,
    question,
    spec,
    updateSpec,
    result,
    status,
    error,
    ask,
    runSpec,
    reset,
    validation,
    isBusy,
    pagination,
    changePagination,
    expected,
    setExpected,
  } = useQuerySpec();
  const [text, setText] = useState(question);
  const [refinement, setRefinement] = useState("");

  useEffect(() => setText(question), [question]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: palette.page }}>
      <AppHeader
        title="Consulta inteligente"
        subtitle="Demo interna · Registro Único Nacional de Tránsito"
      >
        <Box sx={{ maxWidth: 860, mx: "auto", mt: 3.5 }}>
          <SearchPill
            value={text}
            onChange={setText}
            onSubmit={(value) => ask(value)}
            onClear={() => {
              setText("");
              reset();
            }}
            busy={isBusy}
            placeholder="Escribe tu pregunta…"
          />
          <Stack
            direction="row"
            spacing={1.2}
            justifyContent="center"
            sx={{ mt: 2, flexWrap: "wrap", gap: 1.2 }}
          >
            <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.6)", pt: 0.5 }}>
              Ejemplos:
            </Typography>
            {(catalog?.example_questions || []).slice(0, 3).map((example) => (
              <Box
                key={example.text}
                onClick={() => {
                  setText(example.text);
                  ask(example.text);
                }}
                sx={{
                  px: 1.8,
                  py: 0.55,
                  borderRadius: 99,
                  fontSize: 12.5,
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(255,255,255,0.26)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
                }}
              >
                {example.text.replace(/^¿|\?$/g, "")}
              </Box>
            ))}
          </Stack>
        </Box>
      </AppHeader>

      <Box sx={{ display: "flex", alignItems: "stretch", minHeight: "60vh" }}>
        <Box
          sx={{
            width: 300,
            flexShrink: 0,
            bgcolor: palette.navyDeep,
            display: { xs: "none", md: "block" },
          }}
        >
          <Typography
            sx={{ fontSize: 14.5, fontWeight: 600, color: "#FFFFFF", px: 3, pt: 3, pb: 0 }}
          >
            Filtros interpretados
          </Typography>
          <FilterChips
            entity={entity}
            spec={spec}
            busy={isBusy}
            onChange={updateSpec}
            onApply={() => runSpec(spec)}
            onClear={reset}
          />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, p: { xs: 2.5, md: 4 }, maxWidth: 1020 }}>
          {error ? (
            <Alert severity="error" sx={{ mb: 2.5 }}>
              {error}
            </Alert>
          ) : null}

          {status === "clarify" && result.clarification ? (
            <Alert severity="info" sx={{ mb: 2.5 }}>
              {result.clarification}
            </Alert>
          ) : null}

          {result.answer ? (
            <>
              <Paper sx={{ p: { xs: 2.5, md: 3.5 } }}>
                <AnswerCard
                  answer={result.answer}
                  meta={result.meta}
                  validation={validation}
                  expected={expected}
                  onExpectedChange={setExpected}
                  sql={result.groups?.length ? result.groupSql : result.sql}
                  binds={result.binds}
                />
              </Paper>

              <Paper
                sx={{
                  mt: 2.5,
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  flexWrap: "wrap",
                }}
              >
                <SubdirectoryArrowRightIcon sx={{ color: palette.accent, fontSize: 20 }} />
                <InputBase
                  value={refinement}
                  onChange={(event) => setRefinement(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && refinement.trim()) {
                      ask(refinement, { refine: true });
                      setRefinement("");
                    }
                  }}
                  placeholder="Refinar: “¿y solo los de servicio público?”, “agrúpalos por color”…"
                  sx={{ flex: 1, minWidth: 200, fontSize: 14.5 }}
                />
                <Button
                  variant="outlined"
                  disabled={isBusy || !refinement.trim()}
                  onClick={() => {
                    ask(refinement, { refine: true });
                    setRefinement("");
                  }}
                  sx={{ borderColor: palette.border, color: palette.text }}
                >
                  Refinar
                </Button>
              </Paper>

              <Box sx={{ mt: 3 }}>
                {result.groups?.length ? (
                  <ResultTable
                    rows={result.groups.map((group, index) => ({ ID: index, ...group }))}
                  />
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
            </>
          ) : status === "clarify" ? null : (
            <Paper sx={{ p: 6, textAlign: "center" }}>
              <Typography sx={{ color: palette.muted, fontSize: 14.5 }}>
                {isBusy ? "Interpretando la pregunta…" : "Escribe una pregunta para comenzar."}
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
};
