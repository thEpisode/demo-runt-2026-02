import { useState } from "react";
import { Box, Button, Collapse, Stack, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { palette } from "../../theme/theme";

const KEYWORDS =
  /\b(SELECT|FROM|WHERE|AND|OR|LEFT JOIN|JOIN|ON|GROUP BY|ORDER BY|OFFSET|ROWS|FETCH|NEXT|ONLY|COUNT|DESC|ASC|IN|NOT|BETWEEN|IS|NULL|LIKE|TO_DATE|AS)\b/g;

/**
 * The SQL is the evidence the client validates against, so it is rendered as
 * text they can read and copy, not as an opaque badge.
 */
const highlight = (sql) => {
  const parts = [];
  let lastIndex = 0;

  sql.replace(KEYWORDS, (match, _group, offset) => {
    if (offset > lastIndex) {
      parts.push({ text: sql.slice(lastIndex, offset), kind: "plain" });
    }

    parts.push({ text: match, kind: "keyword" });
    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < sql.length) {
    parts.push({ text: sql.slice(lastIndex), kind: "plain" });
  }

  return parts.map((part, index) => (
    <Box
      key={index}
      component="span"
      sx={{
        color: part.kind === "keyword" ? "#7FD3F5" : "#E8EDF6",
        fontWeight: part.kind === "keyword" ? 600 : 400,
      }}
    >
      {part.text}
    </Box>
  ));
};

/** The statement itself, with no toggle. */
export const SqlPanel = ({ sql, binds, label = "SQL generado", dense }) => {
  if (!sql) {
    return null;
  }

  return (
    <Box>
      <Typography variant="overline" sx={{ color: palette.muted }}>
        {label} · solo lectura
      </Typography>
      <Box
        component="pre"
        sx={{
          mt: 0.8,
          mb: 0,
          p: dense ? 1.6 : 2.2,
          bgcolor: palette.code,
          borderRadius: 2,
          fontSize: dense ? 12 : 12.8,
          lineHeight: 1.65,
          fontFamily: "'SF Mono', Menlo, Consolas, monospace",
          overflowX: "auto",
          whiteSpace: "pre",
        }}
      >
        {highlight(sql)}
      </Box>
      {binds && Object.keys(binds).length ? (
        <Stack direction="row" spacing={0.8} sx={{ mt: 1, flexWrap: "wrap", gap: 0.8 }}>
          {Object.entries(binds).map(([name, value]) => (
            <Box
              key={name}
              sx={{
                px: 1.1,
                py: 0.35,
                borderRadius: 1,
                bgcolor: "#EEF2F8",
                fontSize: 11.5,
                fontFamily: "'SF Mono', Menlo, Consolas, monospace",
                color: palette.muted,
              }}
            >
              :{name} = {String(value)}
            </Box>
          ))}
        </Stack>
      ) : null}
    </Box>
  );
};

export const SqlBlock = ({ sql, binds, label, defaultOpen = false, dense }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  if (!sql) {
    return null;
  }

  const copy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <SqlToggle open={open} onToggle={() => setOpen((current) => !current)} />
        {open ? (
          <Button size="small" onClick={copy} sx={{ color: palette.muted, fontSize: 12.5 }}>
            {copied ? "Copiado" : "Copiar"}
          </Button>
        ) : null}
      </Stack>

      <Collapse in={open}>
        <Box sx={{ mt: 1 }}>
          <SqlPanel sql={sql} binds={binds} label={label} dense={dense} />
        </Box>
      </Collapse>
    </Box>
  );
};

/** The trigger on its own, for callers that place it away from the panel. */
export const SqlToggle = ({ open, onToggle }) => (
  <Button
    size="small"
    onClick={onToggle}
    startIcon={
      <ExpandMoreIcon
        sx={{
          fontSize: 18,
          transform: open ? "rotate(0deg)" : "rotate(-90deg)",
          transition: "transform .15s",
        }}
      />
    }
    sx={{ color: palette.muted, fontSize: 12.5, px: 0.5 }}
  >
    {open ? "Ocultar SQL" : "Ver SQL"}
  </Button>
);
