import { Box, Button, Stack, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { palette } from "../../theme/theme";
import { FilterValueInput } from "./FilterValueInput.component";
import { AddConditionMenu } from "./AddConditionMenu.component";
import { findDimension, withFilterForDimension, withFilterValueAt, withoutFilterAt } from "./spec.helpers";

/**
 * The dark sidebar of the search screen: the filters the model read out of the
 * question, editable in place.
 */
export const FilterChips = ({ entity, spec, onChange, onApply, onClear, busy }) => {
  if (!entity) {
    return null;
  }

  const filters = spec?.filters || [];

  return (
    <Box sx={{ p: 3, color: "#FFFFFF" }}>
      <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.55)" }}>
        Tabla
      </Typography>
      <Typography sx={{ fontSize: 15, fontWeight: 600, mt: 0.4, pb: 1.2, borderBottom: "1px solid rgba(255,255,255,0.18)" }}>
        {entity.label}
      </Typography>

      <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.55)", display: "block", mt: 3, mb: 1.2 }}>
        Condiciones detectadas
      </Typography>

      <Stack spacing={1.2}>
        {filters.map((filter, index) => {
          const dimension = findDimension(entity, filter.dimension);

          return (
            <Box
              key={`${filter.dimension}-${index}`}
              sx={{
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 1.5,
                px: 1.5,
                py: 1.2,
                bgcolor: "rgba(255,255,255,0.05)",
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.72)" }}>
                  {dimension?.label || filter.dimension}
                </Typography>
                <CloseIcon
                  onClick={() => onChange(withoutFilterAt(spec, index))}
                  sx={{ fontSize: 16, cursor: "pointer", color: "rgba(255,255,255,0.6)" }}
                />
              </Stack>
              <Box sx={{ mt: 0.8 }}>
                <FilterValueInput
                  dark
                  dimension={dimension}
                  operator={filter.operator}
                  value={filter.value}
                  onChange={(value) => onChange(withFilterValueAt(spec, index, value))}
                />
              </Box>
            </Box>
          );
        })}

        {spec?.date_range ? (
          <Box
            sx={{
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 1.5,
              px: 1.5,
              py: 1.2,
              bgcolor: "rgba(255,255,255,0.05)",
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.72)" }}>
                {findDimension(entity, spec.date_range.dimension)?.label}
              </Typography>
              <CloseIcon
                onClick={() => onChange({ ...spec, date_range: null })}
                sx={{ fontSize: 16, cursor: "pointer", color: "rgba(255,255,255,0.6)" }}
              />
            </Stack>
            <Typography sx={{ fontSize: 14, fontWeight: 600, mt: 0.6 }}>
              {spec.date_range.label || spec.date_range.preset}
            </Typography>
          </Box>
        ) : null}

        {!filters.length && !spec?.date_range ? (
          <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
            Sin condiciones: la consulta cubre toda la tabla.
          </Typography>
        ) : null}
      </Stack>

      <AddConditionMenu
        dark
        entity={entity}
        spec={spec}
        onSelect={(dimension) => onChange(withFilterForDimension(spec, entity, dimension))}
      />

      <Stack spacing={1.2} sx={{ mt: 3 }}>
        <Button
          fullWidth
          variant="contained"
          disabled={busy}
          onClick={onApply}
          sx={{ bgcolor: palette.accent, "&:hover": { bgcolor: palette.accentDark }, py: 1.1 }}
        >
          Aplicar filtros
        </Button>
        <Button
          fullWidth
          variant="outlined"
          onClick={onClear}
          sx={{ borderColor: "rgba(255,255,255,0.32)", color: "#FFFFFF", py: 1.1 }}
        >
          Limpiar
        </Button>
      </Stack>
    </Box>
  );
};
