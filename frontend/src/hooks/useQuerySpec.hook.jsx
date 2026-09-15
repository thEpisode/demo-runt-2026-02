import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { queryService } from "../services/query.service";

const QueryContext = createContext(null);

const EMPTY_RESULT = {
  restatement: "",
  sql: null,
  rowsSql: null,
  groupSql: null,
  binds: null,
  answer: null,
  rows: [],
  total: null,
  groups: null,
  clarification: null,
  meta: null,
};

/**
 * One query, four surfaces. The question writes the spec, the filter panel
 * edits it in place, and the restatement is regenerated from whichever of the
 * two moved last. Every screen reads from here.
 */
export const QueryProvider = ({ children }) => {
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState(null);
  const [question, setQuestion] = useState("");
  const [spec, setSpec] = useState(null);
  const [result, setResult] = useState(EMPTY_RESULT);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [expected, setExpected] = useState("");
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });
  const restateTimer = useRef(null);

  useEffect(() => {
    queryService.getCatalog().then((response) => {
      if (!response.ok) {
        setCatalogError(response.message);
        return;
      }

      setCatalog(response.data);
    });
  }, []);

  const applyPayload = useCallback((payload) => {
    setSpec(payload.spec);
    setResult((current) => ({
      restatement: payload.restatement || "",
      sql: payload.sql,
      rowsSql: payload.rows_sql,
      groupSql: payload.group_sql,
      binds: payload.binds,
      answer: payload.answer ?? current.answer,
      rows: payload.rows || [],
      // A page turn skips the count to avoid re-running it, so the total the
      // first query established is carried forward.
      total: payload.total ?? current.total,
      groups: payload.groups,
      clarification: payload.clarification || null,
      meta: {
        interpretationMs: payload.interpretation_ms,
        timingMs: payload.timing_ms,
        usesIndex: payload.uses_index,
        queryCount: payload.query_count,
        source: payload.source,
      },
    }));
  }, []);

  const ask = useCallback(
    async (text, { refine = false } = {}) => {
      if (!text?.trim()) {
        return;
      }

      // A refinement is a fragment ("y solo los de servicio público"), not a
      // question. Showing it in the search box would read as if it had replaced
      // the query, so the box waits for the merged restatement instead.
      if (!refine) {
        setQuestion(text);
      }

      setStatus("interpreting");
      setError(null);
      setPagination((current) => ({ ...current, page: 0 }));

      const response = await queryService.ask({
        question: text,
        spec: refine && spec ? spec : undefined,
        page_size: pagination.pageSize,
      });

      if (!response.ok) {
        setStatus("error");
        setError(response.message);
        return;
      }

      applyPayload(response.data);
      setStatus(response.data.needs_clarification ? "clarify" : "done");

      if (refine) {
        setQuestion(response.data.restatement || text);
      }

      setHistory((current) => [
        ...current,
        { question: text, payload: response.data, at: new Date() },
      ]);
    },
    [applyPayload, spec, pagination.pageSize],
  );

  const runSpec = useCallback(
    async (nextSpec, options = {}) => {
      setStatus("executing");
      setError(null);

      const { keepPage, ...requestOptions } = options;

      if (!keepPage && !options.dry_run) {
        setPagination((current) => ({ ...current, page: 0 }));
      }

      const response = await queryService.execute({
        spec: nextSpec,
        page: keepPage ? undefined : 1,
        page_size: pagination.pageSize,
        ...requestOptions,
      });

      if (!response.ok) {
        setStatus("error");
        setError(response.message);
        return;
      }

      applyPayload(response.data);
      setStatus("done");

      // Applying edited filters makes the restatement the live question, so the
      // search box keeps describing what was actually run.
      if (!options.dry_run && response.data.restatement) {
        setQuestion(response.data.restatement);
      }

      // A hand-edited run is a turn in the thread too, otherwise the
      // conversation keeps showing the number the question produced.
      if (!options.dry_run) {
        setHistory((current) => [
          ...current,
          { question: null, manual: true, payload: response.data, at: new Date() },
        ]);
      }
    },
    [applyPayload, pagination.pageSize],
  );

  /**
   * Turning a page re-runs only the row query: the total is already known, and
   * on the real table recounting would be the slowest part of the interaction.
   */
  const changePagination = useCallback(
    async (model) => {
      setPagination(model);

      if (!spec) {
        return;
      }

      setStatus("executing");

      const response = await queryService.execute({
        spec,
        page: model.page + 1,
        page_size: model.pageSize,
        skip_count: true,
      });

      if (!response.ok) {
        setStatus("error");
        setError(response.message);
        return;
      }

      applyPayload(response.data);
      setStatus("done");
    },
    [applyPayload, spec],
  );

  // Editing a filter rewrites the sentence immediately. No model call: the
  // panel has to keep up with typing, and the phrasing must be reproducible.
  const updateSpec = useCallback((nextSpec) => {
    setSpec(nextSpec);

    if (restateTimer.current) {
      clearTimeout(restateTimer.current);
    }

    restateTimer.current = setTimeout(async () => {
      const response = await queryService.restate({ spec: nextSpec });

      if (response.ok) {
        setResult((current) => ({ ...current, restatement: response.data.restatement }));
      }
    }, 150);
  }, []);

  const reset = useCallback(() => {
    setQuestion("");
    setSpec(null);
    setResult(EMPTY_RESULT);
    setStatus("idle");
    setError(null);
    setExpected("");
    setPagination({ page: 0, pageSize: 10 });
  }, []);

  const entity = useMemo(() => catalog?.entities?.vehiculo || null, [catalog]);

  const validation = useMemo(() => {
    if (!expected || result.total === null || result.total === undefined) {
      return { state: "pending", expected: null };
    }

    const parsed = Number(String(expected).replace(/[^\d]/g, ""));

    if (!parsed) {
      return { state: "pending", expected: null };
    }

    return { state: parsed === result.total ? "match" : "mismatch", expected: parsed };
  }, [expected, result.total]);

  const value = {
    catalog,
    catalogError,
    entity,
    question,
    setQuestion,
    spec,
    updateSpec,
    result,
    status,
    error,
    ask,
    runSpec,
    reset,
    pagination,
    changePagination,
    expected,
    setExpected,
    validation,
    history,
    isBusy: status === "interpreting" || status === "executing",
  };

  return <QueryContext.Provider value={value}>{children}</QueryContext.Provider>;
};

export const useQuerySpec = () => {
  const context = useContext(QueryContext);

  if (!context) {
    throw new Error("useQuerySpec must be used inside QueryProvider");
  }

  return context;
};
