import { Box, Button, Stack, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { palette } from "../../theme/theme";
import { FilterAutocomplete } from "./FilterAutocomplete.component";
import { FilterValueInput } from "./FilterValueInput.component";
import { AddConditionMenu } from "./AddConditionMenu.component";
import {
  OPERATOR_LABELS,
  conditionFieldOptions,
  findDimension,
  withFilterAt,
  withFilterForDimension,
  withFilterValueAt,
  withoutFilterAt,
} from "./spec.helpers";

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
                <FilterAutocomplete
                  disableClearable
                  placeholder="Campo"
                  options={conditionFieldOptions(entity, spec).map((option) =>
                    option.value === filter.dimension
                      ? { ...option, disabled: false, hint: null }
                      : option,
                  )}
                  value={
                    dimension ? { value: dimension.name, label: dimension.label } : null
                  }
                  onChange={(selected) => {
                    if (!selected?.value) {
                      return;
                    }

                    const next = findDimension(entity, selected.value);
                    onChange(
                      withFilterAt(spec, index, {
                        dimension: selected.value,
                        operator: next.operators[0],
                        value: "",
                      }),
                    );
                  }}
                />
              </Box>

              <Box sx={{ width: { xs: "100%", sm: 130 }, flexShrink: 0 }}>
                <FilterAutocomplete
                  disableClearable
                  placeholder="Operador"
                  options={(dimension?.operators || []).map((operator) => ({
                    value: operator,
                    label: OPERATOR_LABELS[operator] || operator,
                  }))}
                  value={
                    filter.operator
                      ? {
                          value: filter.operator,
                          label: OPERATOR_LABELS[filter.operator] || filter.operator,
                        }
                      : null
                  }
                  onChange={(selected) =>
                    selected?.value &&
                    onChange(withFilterAt(spec, index, { operator: selected.value }))
                  }
                />
              </Box>

              <Box sx={{ flex: 1.5, minWidth: 0 }}>
                <FilterValueInput
                  dimension={dimension}
                  operator={filter.operator}
                  value={filter.value}
                  onChange={(value) => onChange(withFilterValueAt(spec, index, value))}
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
        <AddConditionMenu
          entity={entity}
          spec={spec}
          label="Condición"
          onSelect={(dimension) => onChange(withFilterForDimension(spec, entity, dimension))}
        />
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
