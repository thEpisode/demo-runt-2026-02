import { useState } from "react";
import { Box, Collapse, Stack, Typography } from "@mui/material";
import { SqlPanel, SqlToggle } from "./SqlBlock.component";
import { displayType, palette } from "../../theme/theme";

const formatNumber = (value) => new Intl.NumberFormat("es-CO").format(value);

export const AnswerCard = ({ answer, meta, sql, binds }) => {
  const [sqlOpen, setSqlOpen] = useState(false);

  if (!answer) {
    return null;
  }

  const facts = [
    meta?.source?.replace(/^RUNTPROD\./, ""),
    meta?.queryCount
      ? `${meta.queryCount} ${meta.queryCount === 1 ? "consulta" : "consultas"} en ${(meta.timingMs / 1000).toFixed(1)} s`
      : null,
    meta?.interpretationMs ? `interpretación ${(meta.interpretationMs / 1000).toFixed(1)} s` : null,
  ].filter(Boolean);

  return (
    <Box>
      <Typography variant="overline" sx={{ color: palette.muted }}>
        Respuesta
      </Typography>

      {/* The figure and the sentence are one statement, so they sit together
          on a single baseline instead of stacking as separate blocks. */}
      <Stack
        direction="row"
        spacing={1.2}
        alignItems="baseline"
        sx={{ mt: 0.8, flexWrap: "wrap" }}
      >
        {/* Emphasis comes from weight and depth rather than size: a large
            figure dwarfed the sentence it belongs to. */}
        <Typography
          sx={{
            ...displayType,
            fontWeight: 700,
            fontSize: 21,
            lineHeight: 1.4,
            color: palette.ink,
          }}
        >
          {formatNumber(answer.value)}
        </Typography>
        <Typography sx={{ fontSize: 17, lineHeight: 1.45, color: palette.text, maxWidth: 620 }}>
          {answer.sentence}
        </Typography>
      </Stack>

      {meta && meta.usesIndex === false ? (
        <Typography sx={{ fontSize: 12.5, color: palette.warning, mt: 1.5 }}>
          Ningún filtro usa un índice: la consulta recorre la tabla completa.
        </Typography>
      ) : null}

      {/* Provenance and the statement itself are evidence, not headline: they
          stay available but quiet. */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{ mt: 2.5, pt: 1.5, borderTop: `1px solid ${palette.border}` }}
      >
        <Typography sx={{ fontSize: 12.5, color: palette.muted }}>{facts.join(" · ")}</Typography>
        {sql ? <SqlToggle open={sqlOpen} onToggle={() => setSqlOpen((current) => !current)} /> : null}
      </Stack>

      <Collapse in={sqlOpen}>
        <Box sx={{ mt: 1.5 }}>
          <SqlPanel sql={sql} binds={binds} dense />
        </Box>
      </Collapse>
    </Box>
  );
};
