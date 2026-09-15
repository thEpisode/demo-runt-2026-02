import { Box, Button, InputBase, Stack, Typography } from "@mui/material";
import { palette } from "../../theme/theme";

/**
 * The client's acceptance criterion is "the number matches what we already
 * know", so comparing against a known value is part of the product, not a
 * side note.
 */
export const ValidationBox = ({ expected, onExpectedChange, total, validation }) => (
  <Box>
    <Typography variant="overline" sx={{ color: palette.muted, display: "block", mb: 1 }}>
      Validación manual
    </Typography>

    <Stack direction="row" spacing={1}>
      <InputBase
        value={expected}
        onChange={(event) => onExpectedChange(event.target.value)}
        placeholder="Valor conocido por el equipo"
        sx={{
          flex: 1,
          px: 1.6,
          py: 0.9,
          fontSize: 13.5,
          border: `1px solid ${palette.border}`,
          borderRadius: 1.5,
        }}
      />
      <Button variant="outlined" size="small" sx={{ borderColor: palette.border, color: palette.text }}>
        Comparar
      </Button>
    </Stack>

    {validation.expected && total !== null && total !== undefined ? (
      <Typography sx={{ fontSize: 12.5, color: palette.muted, mt: 1 }}>
        Última: {new Intl.NumberFormat("es-CO").format(total)} vs{" "}
        {new Intl.NumberFormat("es-CO").format(validation.expected)} ·{" "}
        <Box
          component="span"
          sx={{
            color: validation.state === "match" ? palette.success : palette.danger,
            fontWeight: 600,
          }}
        >
          {validation.state === "match" ? "coincide" : "no coincide"}
        </Box>
      </Typography>
    ) : null}
  </Box>
);
