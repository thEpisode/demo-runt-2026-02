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

/** Dimensions that are not already filtered, for the add-condition menu. */
export const availableDimensions = (entity, spec) => {
  const used = new Set((spec?.filters || []).map((filter) => filter.dimension));

  return (entity?.dimensions || []).filter(
    (dimension) => dimension.kind !== "date" && !used.has(dimension.name),
  );
};

/**
 * Adds the dimension the user picked, with no value: choosing the field and
 * giving it a value are two separate decisions.
 */
export const withFilterForDimension = (spec, entity, dimensionName) => {
  const dimension = findDimension(entity, dimensionName);

  if (!dimension) {
    return spec;
  }

  return {
    ...spec,
    filters: [
      ...(spec?.filters || []),
      { dimension: dimension.name, operator: dimension.operators[0], value: "" },
    ],
  };
};

/** True when every condition has a value and the spec can be executed. */
export const isSpecComplete = (spec) =>
  (spec?.filters || []).every((filter) => {
    if (["is_null", "is_not_null"].includes(filter.operator)) {
      return true;
    }

    const values = Array.isArray(filter.value) ? filter.value : [filter.value];

    return values.length > 0 && values.every((value) => value !== "" && value !== null && value !== undefined);
  });
