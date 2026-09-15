import { Box, Button, MenuItem, Select, Stack, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { palette } from "../../theme/theme";
import { FilterValueInput } from "./FilterValueInput.component";
import {
  OPERATOR_LABELS,
  findDimension,
  withAddedFilter,
  withFilterAt,
  withoutFilterAt,
} from "./spec.helpers";

const field = {
  fontSize: 13.5,
  px: 1.4,
  py: 0.75,
  borderRadius: 1.5,
  width: "100%",
  border: `1px solid ${palette.border}`,
  bgcolor: "#FFFFFF",
};

/**
 * The builder: field, operator and value, with no model in the loop. This is
 * the path that keeps working when inference is unavailable.
 */
export const FilterRows = ({ entity, spec, onChange }) => {
  if (!entity) {
    return null;
  }

  const filters = spec?.filters || [];

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1.4} alignItems="center">
          <Box
            sx={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              bgcolor: palette.navy,
              color: "#FFFFFF",
              fontSize: 12,
              fontWeight: 700,
              display: "grid",
              placeItems: "center",
            }}
          >
            1
          </Box>
          <Typography sx={{ fontSize: 15.5, fontWeight: 600 }}>Filtros</Typography>
        </Stack>
        <Typography sx={{ fontSize: 12.5, color: palette.muted }}>
          Tabla: {entity.table?.replace(/^RUNTPROD\./, "")}
        </Typography>
      </Stack>

      <Stack spacing={1.2}>
        {filters.map((filter, index) => {
          const dimension = findDimension(entity, filter.dimension);

          return (
            <Stack
              key={`${filter.dimension}-${index}`}
              direction={{ xs: "column", sm: "row" }}
              spacing={1.2}
              alignItems={{ xs: "stretch", sm: "center" }}
              sx={{
                pb: { xs: 1.5, sm: 0 },
                borderBottom: { xs: `1px solid ${palette.border}`, sm: "none" },
              }}
            >
              <Box sx={{ flex: 1.3, minWidth: 0 }}>
                <Select
                  value={filter.dimension}
                  onChange={(event) => {
                    const next = findDimension(entity, event.target.value);
                    onChange(
                      withFilterAt(spec, index, {
                        dimension: event.target.value,
                        operator: next.operators[0],
                        value: next.values?.length ? next.values[0].label : "",
                      }),
                    );
                  }}
                  variant="standard"
                  disableUnderline
                  sx={field}
                >
                  {entity.dimensions
                    .filter((option) => option.kind !== "date")
                    .map((option) => (
                      <MenuItem key={option.name} value={option.name} sx={{ fontSize: 13.5 }}>
                        {option.label}
                      </MenuItem>
                    ))}
                </Select>
              </Box>

              <Box sx={{ width: { xs: "100%", sm: 96 }, flexShrink: 0 }}>
                <Select
                  value={filter.operator}
                  onChange={(event) =>
                    onChange(withFilterAt(spec, index, { operator: event.target.value }))
                  }
                  variant="standard"
                  disableUnderline
                  sx={field}
                >
                  {(dimension?.operators || []).map((operator) => (
                    <MenuItem key={operator} value={operator} sx={{ fontSize: 13.5 }}>
                      {OPERATOR_LABELS[operator] || operator}
                    </MenuItem>
                  ))}
                </Select>
              </Box>

              <Box sx={{ flex: 1.5, minWidth: 0 }}>
                <FilterValueInput
                  dimension={dimension}
                  value={filter.value}
                  onChange={(value) => onChange(withFilterAt(spec, index, { value }))}
                />
              </Box>

              <CloseIcon
                onClick={() => onChange(withoutFilterAt(spec, index))}
                sx={{
                  fontSize: 18,
                  cursor: "pointer",
                  color: palette.muted,
                  alignSelf: { xs: "flex-end", sm: "center" },
                  flexShrink: 0,
                }}
              />
            </Stack>
          );
        })}
      </Stack>

      <Stack direction="row" spacing={2.5} sx={{ mt: 1.5, flexWrap: "wrap", rowGap: 0.5 }}>
        <Button
          onClick={() => onChange(withAddedFilter(spec, entity))}
          sx={{ color: palette.accent, fontSize: 13, px: 0 }}
        >
          + Condición
        </Button>
        <Button
          onClick={() =>
            onChange({
              ...spec,
              group_by: spec.group_by?.length ? [] : ["color"],
            })
          }
          sx={{ color: palette.accent, fontSize: 13, px: 0 }}
        >
          {spec?.group_by?.length ? "− Agrupación" : "+ Agrupar por color"}
        </Button>
        <Button
          onClick={() =>
            onChange({
              ...spec,
              date_range: spec.date_range
                ? null
                : { dimension: "fecha_registro", preset: "this_month" },
            })
          }
          sx={{ color: palette.accent, fontSize: 13, px: 0 }}
        >
          {spec?.date_range ? "− Rango de fechas" : "+ Rango de fechas"}
        </Button>
      </Stack>

      <Typography sx={{ fontSize: 12, color: palette.muted, mt: 2 }}>
        Los filtros se limitan a los campos del esquema confirmado por el cliente.
      </Typography>
    </Box>
  );
};
