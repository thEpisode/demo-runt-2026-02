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

/**
 * Every filterable field for the add-condition picker. Fields that already
 * hold a condition stay listed but disabled: a second row would AND against
 * the first, so more values go into that same condition instead.
 */
export const conditionFieldOptions = (entity, spec) => {
  const used = new Set((spec?.filters || []).map((filter) => filter.dimension));

  return (entity?.dimensions || [])
    .filter((dimension) => dimension.kind !== "date")
    .map((dimension) => ({
      value: dimension.name,
      label: dimension.label,
      disabled: used.has(dimension.name),
      hint: used.has(dimension.name) ? "Ya está en las condiciones" : null,
    }));
};

const MULTI_OPERATOR = { eq: "in", ne: "not_in" };
const SINGLE_OPERATOR = { in: "eq", not_in: "ne" };

/** True when the condition can hold several values of a closed list. */
export const acceptsManyValues = (dimension, operator) =>
  Boolean(dimension?.values?.length) &&
  Boolean(dimension?.operators?.includes("in")) &&
  ["eq", "ne", "in", "not_in"].includes(operator);

/**
 * Sets the value of a condition, keeping the operator in step with how many
 * values it holds: one value is "=", several are "en".
 */
export const withFilterValueAt = (spec, index, value) => {
  if (!Array.isArray(value)) {
    return withFilterAt(spec, index, { value });
  }

  const operator = spec.filters[index]?.operator;

  if (value.length > 1) {
    return withFilterAt(spec, index, { value, operator: MULTI_OPERATOR[operator] || operator });
  }

  return withFilterAt(spec, index, {
    value: value[0] ?? "",
    operator: SINGLE_OPERATOR[operator] || operator,
  });
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
