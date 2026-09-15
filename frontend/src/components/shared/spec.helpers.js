export const OPERATOR_LABELS = {
  eq: "=",
  ne: "≠",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  in: "en",
  not_in: "no en",
  like: "contiene",
  between: "entre",
  is_null: "vacío",
  is_not_null: "con dato",
};

export const EMPTY_SPEC = {
  entity: "vehiculo",
  intent: "count",
  filters: [],
  date_range: null,
  group_by: [],
  order_by: null,
  limit: 24,
};

export const findDimension = (entity, name) =>
  entity?.dimensions?.find((dimension) => dimension.name === name) || null;

export const displayValue = (filter) =>
  Array.isArray(filter.value) ? filter.value.join(" · ") : String(filter.value ?? "");

export const withFilterAt = (spec, index, patch) => ({
  ...spec,
  filters: spec.filters.map((filter, position) =>
    position === index ? { ...filter, ...patch } : filter,
  ),
});

export const withoutFilterAt = (spec, index) => ({
  ...spec,
  filters: spec.filters.filter((_, position) => position !== index),
});

export const withAddedFilter = (spec, entity) => {
  const used = new Set(spec.filters.map((filter) => filter.dimension));
  const available = entity.dimensions.filter(
    (dimension) => dimension.kind !== "date" && !used.has(dimension.name),
  );

  // Prefer a dimension that has a closed list, so the new row is valid the
  // moment it appears instead of showing an error until the user types.
  const next =
    available.find((dimension) => dimension.values?.length) ||
    available[0] ||
    entity.dimensions[0];

  return {
    ...spec,
    filters: [
      ...spec.filters,
      {
        dimension: next.name,
        operator: next.operators[0],
        value: next.values?.length ? next.values[0].label : "",
      },
    ],
  };
};
