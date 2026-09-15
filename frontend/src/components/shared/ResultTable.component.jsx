import { Box, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { palette } from "../../theme/theme";
import { useQuerySpec } from "../../hooks/useQuerySpec.hook";

const COLOR_SWATCHES = {
  AMARILLO: "#F2C230",
  BLANCO: "#F4F5F7",
  NEGRO: "#20242C",
  GRIS: "#9AA3B2",
  PLATEADO: "#C8CED8",
  ROJO: "#D0392F",
  AZUL: "#2F5FD0",
  VERDE: "#2E9E5B",
  BEIGE: "#E0D2B4",
  VINOTINTO: "#7A2036",
  NARANJA: "#EA7A2C",
  CAFE: "#7A5230",
};

const STATE_TONES = {
  ACTIVO: { bg: palette.successSoft, color: palette.success },
  CANCELADO: { bg: palette.dangerSoft, color: palette.danger },
  INMOVILIZADO: { bg: palette.warningSoft, color: palette.warning },
};

const DATE_COLUMNS = ["FECHA_REGISTRO", "FECHA_CANCELACION"];

// Columns the compiler adds that have no dimension behind them.
const COMPUTED_LABELS = { TOTAL: "Total" };

const SPANISH = esES.components.MuiDataGrid.defaultProps.localeText;

const localeText = {
  ...SPANISH,
  noRowsLabel: "La consulta no devolvió registros.",
  paginationRowsPerPage: "Registros por página",
  paginationDisplayedRows: ({ from, to, count }) =>
    `${from}–${to} de ${new Intl.NumberFormat("es-CO").format(count)} registros`,
};

const StateChip = ({ value }) => {
  const tone = STATE_TONES[value] || { bg: "#EEF1F6", color: palette.muted };

  return (
    <Box
      component="span"
      sx={{
        px: 1.1,
        py: 0.3,
        borderRadius: 1,
        fontSize: 12,
        fontWeight: 500,
        bgcolor: tone.bg,
        color: tone.color,
      }}
    >
      {value}
    </Box>
  );
};

const gridStyles = {
  width: "100%",
  maxWidth: "100%",
  border: `1px solid ${palette.border}`,
  borderRadius: 2,
  bgcolor: palette.surface,
  "& .MuiDataGrid-columnHeaders": { bgcolor: "#FAFBFD" },
  "& .MuiDataGrid-columnHeaderTitle": {
    fontSize: 11,
    letterSpacing: "0.09em",
    textTransform: "uppercase",
    color: palette.muted,
    fontWeight: 600,
  },
  "& .MuiDataGrid-cell": { fontSize: 14, borderColor: palette.border },
  "& .MuiDataGrid-columnSeparator": { display: "none" },
  "& .MuiDataGrid-footerContainer": { borderColor: palette.border },
  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": { outline: "none" },
  "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": {
    outline: "none",
  },
};

/**
 * Paging is server side: the backend returns one page at a time, so the grid
 * must never assume the rows it holds are the whole result set.
 */
export const ResultTable = ({
  rows,
  total,
  paginationModel,
  onPaginationModelChange,
  loading,
}) => {
  const { entity } = useQuerySpec();

  if (!rows?.length && !loading) {
    return (
      <Typography sx={{ color: palette.muted, fontSize: 14, py: 4, textAlign: "center" }}>
        La consulta no devolvió registros.
      </Typography>
    );
  }

  // SQL aliases cannot carry accents, so the header text comes from the catalog
  // rather than from the column name.
  const labelFor = (column) =>
    COMPUTED_LABELS[column] ||
    entity?.dimensions?.find((dimension) => dimension.name.toUpperCase() === column)?.label ||
    column.replace(/_/g, " ");

  const columns = Object.keys(rows[0] || {})
    .filter((key) => key !== "ID")
    .map((key) => ({
      field: key,
      headerName: labelFor(key),
      flex: 1,
      minWidth: key === "PLACA" ? 100 : 118,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => {
        const value = params.value;

        if (value === null || value === undefined) {
          return "—";
        }

        if (key === "ESTADO") {
          return <StateChip value={value} />;
        }

        if (key === "PLACA") {
          return (
            <Box component="span" sx={{ fontWeight: 600, letterSpacing: "0.04em" }}>
              {value}
            </Box>
          );
        }

        if (key === "COLOR") {
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  bgcolor: COLOR_SWATCHES[value] || "#C8CED8",
                  border: `1px solid ${palette.border}`,
                  flexShrink: 0,
                }}
              />
              {value}
            </Box>
          );
        }

        if (DATE_COLUMNS.includes(key)) {
          return new Date(value).toLocaleDateString("es-CO", {
            year: "numeric",
            month: "short",
            day: "2-digit",
          });
        }

        if (key === "TOTAL") {
          return new Intl.NumberFormat("es-CO").format(value);
        }

        return String(value);
      },
    }));

  const serverSide = Boolean(onPaginationModelChange);
  const model = paginationModel || { page: 0, pageSize: 10 };

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      getRowId={(row) => row.ID}
      loading={loading}
      disableRowSelectionOnClick
      density="standard"
      sx={gridStyles}
      autoHeight
      pageSizeOptions={[10, 25, 50, 100]}
      paginationMode={serverSide ? "server" : "client"}
      rowCount={serverSide ? (total ?? 0) : undefined}
      paginationModel={serverSide ? model : undefined}
      onPaginationModelChange={onPaginationModelChange}
      initialState={
        serverSide ? undefined : { pagination: { paginationModel: { pageSize: 10, page: 0 } } }
      }
      localeText={localeText}
    />
  );
};
