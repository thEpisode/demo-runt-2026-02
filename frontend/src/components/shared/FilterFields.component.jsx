import { Box, Button, Stack, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { palette } from "../../theme/theme";
import { FilterValueInput } from "./FilterValueInput.component";
import { findDimension, withAddedFilter, withFilterAt, withoutFilterAt } from "./spec.helpers";

/**
 * The labelled-dropdown presentation used beside the conversation thread.
 */
export const FilterFields = ({ entity, spec, onChange, onClear }) => {
  if (!entity) {
    return null;
  }

  const filters = spec?.filters || [];

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: 15.5, fontWeight: 600 }}>Filtros de esta consulta</Typography>
        <Button size="small" onClick={onClear} sx={{ color: palette.accent, fontSize: 12.5 }}>
          Limpiar
        </Button>
      </Stack>

      <Typography variant="overline" sx={{ color: palette.muted, display: "block" }}>
        Tabla
      </Typography>
      <Box
        sx={{
          border: `1px solid ${palette.border}`,
          borderRadius: 1.5,
          px: 1.5,
          py: 1,
          fontSize: 13.5,
          mb: 2.2,
        }}
      >
        {entity.label}
      </Box>

      {filters.map((filter, index) => {
        const dimension = findDimension(entity, filter.dimension);

        return (
          <Box key={`${filter.dimension}-${index}`} sx={{ mb: 2.2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="overline" sx={{ color: palette.muted }}>
                {dimension?.label || filter.dimension}
              </Typography>
              <CloseIcon
                onClick={() => onChange(withoutFilterAt(spec, index))}
                sx={{ fontSize: 15, cursor: "pointer", color: palette.muted }}
              />
            </Stack>
            <Box sx={{ mt: 0.5 }}>
              <FilterValueInput
                dimension={dimension}
                value={filter.value}
                onChange={(value) => onChange(withFilterAt(spec, index, { value }))}
              />
            </Box>
          </Box>
        );
      })}

      {spec?.date_range ? (
        <Box sx={{ mb: 2.2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="overline" sx={{ color: palette.muted }}>
              {findDimension(entity, spec.date_range.dimension)?.label}
            </Typography>
            <CloseIcon
              onClick={() => onChange({ ...spec, date_range: null })}
              sx={{ fontSize: 15, cursor: "pointer", color: palette.muted }}
            />
          </Stack>
          <Box
            sx={{
              mt: 0.5,
              border: `1px solid ${palette.border}`,
              borderRadius: 1.5,
              px: 1.5,
              py: 1,
              fontSize: 13.5,
            }}
          >
            {spec.date_range.label || spec.date_range.preset}
          </Box>
        </Box>
      ) : null}

      <Button
        onClick={() => onChange(withAddedFilter(spec, entity))}
        sx={{ color: palette.accent, fontSize: 13, px: 0 }}
      >
        + Agregar filtro
      </Button>
    </Box>
  );
};
