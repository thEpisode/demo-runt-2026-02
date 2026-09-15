import { useState } from "react";
import { Box, Button, Collapse, InputBase, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { SqlPanel, SqlToggle } from "./SqlBlock.component";
import { displayType, palette } from "../../theme/theme";

const formatNumber = (value) => new Intl.NumberFormat("es-CO").format(value);

/**
 * Validation is an action, not a status: asking the user to compare against a
 * figure they already know is the client's acceptance criterion, so it reads as
 * a question rather than as a badge that never resolves.
 */
const Validation = ({ expected, onExpectedChange, total, validation }) => {
  const [open, setOpen] = useState(false);

  if (validation.state === "match" || validation.state === "mismatch") {
    const matched = validation.state === "match";
    const Icon = matched ? CheckCircleIcon : ErrorOutlineIcon;
    const color = matched ? palette.success : palette.danger;

    return (
      <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 2.5 }}>
        <Icon sx={{ fontSize: 17, color }} />
        <Typography sx={{ fontSize: 13.5, color }}>
          {matched
            ? `Coincide con el dato esperado (${formatNumber(validation.expected)})`
            : `No coincide: esperabas ${formatNumber(validation.expected)}`}
        </Typography>
        <Button
          size="small"
          onClick={() => onExpectedChange("")}
          sx={{ color: palette.muted, fontSize: 12.5, minWidth: 0 }}
        >
          Cambiar
        </Button>
      </Stack>
    );
  }

  if (!open) {
    return (
      <Button
        size="small"
        onClick={() => setOpen(true)}
        sx={{ mt: 2, px: 0, color: palette.accent, fontSize: 13 }}
      >
        Contrastar con un dato que ya conoces
      </Button>
    );
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2, maxWidth: 380 }}>
      <InputBase
        autoFocus
        value={expected}
        onChange={(event) => onExpectedChange(event.target.value)}
        placeholder={`¿Cuántos esperabas? (obtuvimos ${formatNumber(total)})`}
        sx={{
          flex: 1,
          px: 1.6,
          py: 0.8,
          fontSize: 13.5,
          border: `1px solid ${palette.border}`,
          borderRadius: 1.5,
        }}
      />
    </Stack>
  );
};

export const AnswerCard = ({
  answer,
  meta,
  validation,
  expected,
  onExpectedChange,
  sql,
  binds,
}) => {
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
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 0.5, sm: 2.5 }}
        alignItems={{ xs: "flex-start", sm: "baseline" }}
        sx={{ mt: 0.8 }}
      >
        <Typography
          sx={{ ...displayType, fontSize: { xs: 42, md: 52 }, lineHeight: 1, color: palette.navy }}
        >
          {formatNumber(answer.value)}
        </Typography>
        <Typography sx={{ fontSize: 16, lineHeight: 1.45, color: palette.text, maxWidth: 520 }}>
          {answer.sentence}
        </Typography>
      </Stack>

      <Validation
        expected={expected}
        onExpectedChange={onExpectedChange}
        total={answer.value}
        validation={validation}
      />

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
        sx={{ mt: 3, pt: 1.5, borderTop: `1px solid ${palette.border}` }}
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
