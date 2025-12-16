from flask import Flask, jsonify, render_template, request, Response
from flask_cors import CORS
import urllib.parse
from sqlalchemy import create_engine, text
import pandas as pd
import os
import io
from datetime import datetime, timedelta
import traceback
import logging

# Basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cache configuration for monthly stats
MONTHLY_STATS_CACHE = {
    'data': None,
    'timestamp': None,
    'ttl_minutes': 1440  # Cache expires after 24 hours
}

app = Flask(__name__, static_folder='frontend/dist/assets', template_folder='frontend/dist', static_url_path='/assets')
CORS(app)

# ---------- CONFIGURATION ----------
# SQL Server connection params (update if necessary)
# If you prefer to use environment variables, set them and read them here.
USE_DB = True  # Set to False to force mock mode while testing frontend

params = urllib.parse.quote_plus(
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=165.136.18.251;"
    "DATABASE=MetlifeDMS;"
    "UID=DMSAdmin;"
    "PWD=MetlifeDMS1$;"
)

# Second Database (INSDTA) params
params_insdta = urllib.parse.quote_plus(
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=165.136.18.251;"
    "DATABASE=INSDTA;"
    "UID=ins_import;"
    "PWD=%130z@3!mk*;"
)

# SQLAlchemy engines
engine = None
engine_insdta = None
DB_AVAILABLE = False
INSDTA_AVAILABLE = False
INSDTA_ERROR = None

# Configuration: table and schema
TABLE_SCHEMA = "dbo"
# Default table (for backward compatibility or default view)
DEFAULT_TABLE = "Tbl_MetLifeDL_AllTasks_Monthly"

# Mapping of report types to database tables
REPORT_TABLES = {
    "claims": "Tbl_MetLifeDL_AllTasks_Monthly",
    "cea": "Tbl_MetLifeDL_CEAClaims_Monthly",
    "complaints": "Tbl_MetLifeDL_Complaints_Monthly",
    "connected_benefits": "Tbl_MetLife_Enrollments_Monthly"
}

# Mapping of report types to their date column
# TODO: Verify date column for connected_benefits
REPORT_DATE_COLUMNS = {
    "claims": "Close Date",
    "cea": "Date Reviewed",
    "complaints": "Date Received at NTT",
    "connected_benefits": "Enrollment Date" # Provisional, will verify
}

# Default Name of the date column (fallback)
DATE_COLUMN = "Close Date"

# ---------- FALLBACK / MOCK DATA ----------
# If the DB cannot be reached, we will use a small in-memory sample DataFrame so the UI still works.
FALLBACK_DF = pd.DataFrame(
    [
        {
            "Task Process": "Process A",
            "Task Step": "Step 1",
            "Insurance Type": "Accident",
            "Task ID": f"TID-{i}",
            "Pend Date": "2025-01-10",
            "Policy Number": f"PN-{1000+i}",
            "Open Date": "2025-01-01",
            "Close Date": (pd.to_datetime("2025-01-01") + pd.Timedelta(days=i)).strftime("%Y-%m-%d"),
            "Sender OPID": "SENDER1",
        }
        for i in range(1, 11)
    ]
)


def try_create_engine():
    global engine, engine_insdta, DB_AVAILABLE, INSDTA_AVAILABLE, INSDTA_ERROR
    
    if not USE_DB:
        logger.info("USE_DB is False — running in fallback/mock mode.")
        DB_AVAILABLE = False
        INSDTA_AVAILABLE = False
        engine = None
        engine_insdta = None
        return

    # User DB (MetlifeDMS)
    try:
        engine = create_engine(f"mssql+pyodbc:///?odbc_connect={params}", connect_args={"timeout": 5})
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        DB_AVAILABLE = True
        logger.info("Primary Database (MetlifeDMS) connection established successfully.")
    except Exception as e:
        DB_AVAILABLE = False
        engine = None
        logger.warning("Primary Database connection failed. Error: %s", str(e))

    # INSDTA DB
    try:
        engine_insdta = create_engine(f"mssql+pyodbc:///?odbc_connect={params_insdta}", connect_args={"timeout": 5})
        with engine_insdta.connect() as conn:
            conn.execute(text("SELECT 1"))
        INSDTA_AVAILABLE = True
        INSDTA_ERROR = None
        logger.info("Secondary Database (INSDTA) connection established successfully.")
    except Exception as e:
        INSDTA_AVAILABLE = False
        engine_insdta = None
        INSDTA_ERROR = str(e)
        logger.warning("Secondary Database (INSDTA) connection failed. Error: %s", str(e))

# Initialize engine / test connectivity at startup
try_create_engine()

def get_db_context(report_type):
    """
    Returns (engine, available) for the given report type.
    """
    if report_type == "connected_benefits":
        return engine_insdta, INSDTA_AVAILABLE
    return engine, DB_AVAILABLE

def get_table_name(report_type):
    """Helper to get table name from report type, defaulting to claims table."""
    return REPORT_TABLES.get(report_type, DEFAULT_TABLE)

@app.route("/api/retry-db", methods=["POST", "GET"])
def retry_db():
    """
    Forces a reconnection attempt to databases.
    """
    try_create_engine()
    return api_status()


@app.route("/api/status", methods=["GET"])
def api_status():
    """
    Returns the current backend status (DB available or not).
    """
    return jsonify({
        "db_available": DB_AVAILABLE,
        "insdta_available": INSDTA_AVAILABLE,
        "insdta_error": INSDTA_ERROR,
        "tables": REPORT_TABLES,
        "date_column": DATE_COLUMN
    })


@app.route("/api/dates", methods=["GET"])
def get_dates():
    """
    Returns min and max values for DATE_COLUMN for the configured table.
    Used by the frontend to initialize the date slicer (min/max/default).
    Falls back to sample data when DB unavailable.
    Query param: report (optional, defaults to claims)
    """
    report_type = request.args.get("report", "claims")
    table_name = get_table_name(report_type)
    date_col = REPORT_DATE_COLUMNS.get(report_type, DATE_COLUMN)
    current_engine, current_available = get_db_context(report_type)
    
    try:
        if current_available and current_engine is not None:
            query = text(f"SELECT MIN([{date_col}]) AS min_date, MAX([{date_col}]) AS max_date FROM [{TABLE_SCHEMA}].[{table_name}]")
            with current_engine.connect() as conn:
                row = conn.execute(query).fetchone()
                # row can be tuple-like; ensure safe extraction
                min_date = row[0]
                max_date = row[1]
            # Normalize to YYYY-MM-DD strings (if not None)
            min_s = None
            max_s = None
            if min_date is not None:
                try:
                    min_s = pd.to_datetime(min_date).strftime("%Y-%m-%d")
                except Exception:
                    min_s = str(min_date)
            if max_date is not None:
                try:
                    max_s = pd.to_datetime(max_date).strftime("%Y-%m-%d")
                except Exception:
                    max_s = str(max_date)
            return jsonify({"min": min_s, "max": max_s, "fallback": False})
        else:
            # Use fallback DataFrame
            if DATE_COLUMN in FALLBACK_DF.columns:
                try:
                    min_d = pd.to_datetime(FALLBACK_DF[DATE_COLUMN]).min()
                    max_d = pd.to_datetime(FALLBACK_DF[DATE_COLUMN]).max()
                    min_s = min_d.strftime("%Y-%m-%d")
                    max_s = max_d.strftime("%Y-%m-%d")
                    return jsonify({"min": min_s, "max": max_s, "fallback": True})
                except Exception:
                    pass
            # If date column not present or parsing fails, return sensible defaults (last 90 days)
            today = datetime.utcnow().date()
            default_min = (today.replace(day=1)).strftime("%Y-%m-%d")
            default_max = today.strftime("%Y-%m-%d")
            return jsonify({"min": default_min, "max": default_max, "fallback": True})
    except Exception as e:
        logger.exception("Error in /api/dates")
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500


@app.route("/api/columns", methods=["GET"])
def get_columns():
    """
    Returns a JSON array of column names for the configured table.
    Falls back to sample DataFrame columns if DB is not available.
    Query param: report (optional, defaults to claims)
    """
    report_type = request.args.get("report", "claims")
    table_name = get_table_name(report_type)
    current_engine, current_available = get_db_context(report_type)

    try:
        if current_available and current_engine is not None:
            sql = text("""
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = :table_name
                  AND TABLE_SCHEMA = :table_schema
                ORDER BY ORDINAL_POSITION
            """)
            with current_engine.connect() as conn:
                result = conn.execute(sql, {"table_name": table_name, "table_schema": TABLE_SCHEMA})
                cols = [row[0] for row in result.fetchall()]
            # If no columns returned, fall back to reading zero rows
            if not cols:
                # Try a safe sample query to inspect columns
                with engine.connect() as conn:
                    sample = conn.execute(text(f"SELECT TOP 1 * FROM [{TABLE_SCHEMA}].[{table_name}]")).fetchone()
                    if sample is not None:
                        cols = list(sample.keys()) if hasattr(sample, 'keys') else []
            return jsonify({"columns": cols})
        else:
            # Fallback: use columns from FALLBACK_DF
            cols = list(FALLBACK_DF.columns)
            return jsonify({"columns": cols, "fallback": True})
    except Exception as e:
        logger.exception("Error in /api/columns")
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500


@app.route("/api/categories", methods=["GET"])
def get_categories():
    """
    Returns a list of distinct Categories for the complaints table.
    Falls back to sample data if DB is not available.
    """
    try:
        report_type = request.args.get("report", "complaints")
        current_engine, current_available = get_db_context(report_type)

        if current_available and current_engine is not None:
            if report_type == 'cea':
                # CEA uses "Policy Type (AI/HI)"
                col_name = "Policy Type (AI/HI)"
                table_name = REPORT_TABLES.get("cea")
                query = text(f"SELECT DISTINCT [{col_name}] FROM [{TABLE_SCHEMA}].[{table_name}] WHERE [{col_name}] IS NOT NULL ORDER BY [{col_name}]")
            else:
                # Complaints uses "Product Type"
                # For others, default or empty
                table_name = REPORT_TABLES.get("complaints")
                query = text(f"SELECT DISTINCT [Product Type] FROM [{TABLE_SCHEMA}].[{table_name}] WHERE [Product Type] IS NOT NULL ORDER BY [Product Type]")
            
            with current_engine.connect() as conn:
                rows = conn.execute(query).fetchall()
            categories = [row[0] for row in rows]
            return jsonify({"categories": categories})
        else:
            if report_type == 'cea':
                 return jsonify({
                    "categories": ["AI", "HI"],
                    "fallback": True
                })
            return jsonify({
                "categories": ["Group Accident", "Group Cancer", "Group Critical Illness", "Group Hospital Indemnity", "Group Whole Life"],
                "fallback": True
            })
    except Exception as e:
        logger.exception("Error in /api/categories")
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500


@app.route("/api/preview", methods=["GET"])
def get_preview():
    """
    Returns top N rows (default 5) from the configured table as JSON.
    Query params:
      - n (optional): number of rows (defaults to 5)
      - from: (optional) start date filter (YYYY-MM-DD) applied to DATE_COLUMN
      - to: (optional) end date filter (YYYY-MM-DD) applied to DATE_COLUMN
      - cols: (optional) comma-separated list of columns to fetch
      - cols: (optional) comma-separated list of columns to fetch
      - report: (optional) report type (claims, cea, complaints)
      - categories: (optional) comma-separated list of categories to filter by
    Falls back to sample data when DB is unavailable.
    """
    try:
        n = int(request.args.get("n", 5))
        n = max(1, min(n, 1000))

        from_date = request.args.get("from", None)
        to_date = request.args.get("to", None)
        cols_param = request.args.get("cols", None)
        categories_param = request.args.get("categories", None)
        report_type = request.args.get("report", "claims")
        table_name = get_table_name(report_type)
        date_col = REPORT_DATE_COLUMNS.get(report_type, DATE_COLUMN)

        # Build select clause from 'cols' param
        if cols_param:
            cols = [c.strip() for c in cols_param.split(",") if c.strip()]
            # Basic safety: ensure column names don't contain malicious tokens
            safe_cols = []
            for c in cols:
                if ";" in c or "--" in c or "/*" in c:
                    continue
                safe_cols.append(f"[{c}]") # wrap in brackets
            if not safe_cols:
                select_cols = "*"
            else:
                select_cols = ", ".join(safe_cols)
        else:
            select_cols = "*"
        current_engine, current_available = get_db_context(report_type)

        if current_available and current_engine is not None:
            where_clauses = []
            params_sql = {}
            # Use bracketed column name to support spaces/special chars
            if from_date:
                where_clauses.append(f"[{date_col}] >= :from_date")
                params_sql["from_date"] = from_date
            if to_date:
                where_clauses.append(f"[{date_col}] <= :to_date")
                params_sql["to_date"] = to_date
            
            if categories_param:
                if report_type == 'complaints':
                    cats = [c.strip() for c in categories_param.split(",") if c.strip()]
                    if cats:
                        cat_params = []
                        for i, cat in enumerate(cats):
                            pname = f"cat_{i}"
                            cat_params.append(f":{pname}")
                            params_sql[pname] = cat
                        where_clauses.append(f"[Product Type] IN ({', '.join(cat_params)})")
                elif report_type == 'cea':
                    cats = [c.strip() for c in categories_param.split(",") if c.strip()]
                    if cats:
                        cat_params = []
                        for i, cat in enumerate(cats):
                            pname = f"cat_{i}"
                            cat_params.append(f":{pname}")
                            params_sql[pname] = cat
                        where_clauses.append(f"[Policy Type (AI/HI)] IN ({', '.join(cat_params)})")

            where_sql = ""
            if where_clauses:
                where_sql = " WHERE " + " AND ".join(where_clauses)
            query = text(f"SELECT TOP {n} {select_cols} FROM [{TABLE_SCHEMA}].[{table_name}]{where_sql}")
            with current_engine.connect() as conn:
                df = pd.read_sql(query, conn, params=params_sql)
            data = df.to_dict(orient="records")
            return jsonify({"rows": data, "columns": list(df.columns)})
        else:
            # Filter fallback DF by date column if applicable
            df = FALLBACK_DF.copy()
            # Also filter by selected columns if provided
            if cols_param:
                keep_cols = [c for c in cols_param.split(",") if c in df.columns]
                if keep_cols:
                    df = df[keep_cols]
            if from_date and DATE_COLUMN in df.columns:
                try:
                    df = df[pd.to_datetime(df[DATE_COLUMN]) >= pd.to_datetime(from_date)]
                except Exception:
                    # If parsing fails, ignore filter and continue
                    pass
            if to_date and DATE_COLUMN in df.columns:
                try:
                    df = df[pd.to_datetime(df[DATE_COLUMN]) <= pd.to_datetime(to_date)]
                except Exception:
                    pass
                except Exception:
                    pass
            if categories_param:
                cats = [c.strip() for c in categories_param.split(",") if c.strip()]
                if cats:
                    if report_type == 'complaints' and 'Product Type' in df.columns:
                        df = df[df['Product Type'].isin(cats)]
                    elif report_type == 'cea' and 'Policy Type (AI/HI)' in df.columns:
                         df = df[df['Policy Type (AI/HI)'].isin(cats)]
                    
            df = df.head(n)
            return jsonify({"rows": df.to_dict(orient="records"), "columns": list(df.columns), "fallback": True})
    except Exception as e:
        logger.exception("Error in /api/preview")
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500


@app.route("/api/monthly-stats", methods=["GET"])
def get_monthly_stats():
    """
    Returns aggregated data grouped by month and insurance type.
    Used for the monthly data visualization chart on the home page.
    Returns JSON with months array, data object (insurance types), and totals.
    
    PERFORMANCE: 
    1. Checks in-memory cache first (instant response)
    2. If cache expired, tries pre-aggregated Tbl_MonthlyDataSummary table (fast)
    3. Falls back to on-the-fly aggregation if summary table doesn't exist (slower)
    
    Cache expires after 5 minutes to ensure data freshness.
    """
    global MONTHLY_STATS_CACHE
    
    try:
        # Check if we have valid cached data
        cache_valid = False
        if MONTHLY_STATS_CACHE['data'] is not None and MONTHLY_STATS_CACHE['timestamp'] is not None:
            cache_age = datetime.now() - MONTHLY_STATS_CACHE['timestamp']
            cache_valid = cache_age < timedelta(minutes=MONTHLY_STATS_CACHE['ttl_minutes'])
        
        if cache_valid:
            logger.info("Serving monthly stats from cache (instant)")
            cached_response = MONTHLY_STATS_CACHE['data'].copy()
            cached_response['source'] = 'cache'
            cached_response['cached_at'] = MONTHLY_STATS_CACHE['timestamp'].isoformat()
            return jsonify(cached_response)
        
        # Cache miss or expired - fetch fresh data
        logger.info("Cache miss or expired, fetching fresh monthly stats data")
        
        if DB_AVAILABLE and engine is not None:
            # Try to query the pre-aggregated summary table first (MUCH faster)
            try:
                query = text("""
                    SELECT 
                        [YearMonth] AS month,
                        [InsuranceType] AS insurance_type,
                        [RecordCount] AS count
                    FROM [dbo].[Tbl_MonthlyDataSummary]
                    ORDER BY [YearMonth], [InsuranceType]
                """)
                with engine.connect() as conn:
                    df = pd.read_sql(query, conn)
                data_source = "summary_table"
                logger.info("Using pre-aggregated summary table for monthly stats (fast)")
            except Exception:
                # Summary table doesn't exist or query failed, fall back to original aggregation
                logger.info("Summary table 'Tbl_MonthlyDataSummary' not found or invalid. Using on-the-fly aggregation.")
                query = text(f"""
                    SELECT 
                        FORMAT([{DATE_COLUMN}], 'yyyy-MM') AS month,
                        [Insurance Type] AS insurance_type,
                        COUNT(*) AS count
                    FROM [{TABLE_SCHEMA}].[{DEFAULT_TABLE}]
                    WHERE [{DATE_COLUMN}] IS NOT NULL
                    GROUP BY FORMAT([{DATE_COLUMN}], 'yyyy-MM'), [Insurance Type]
                    ORDER BY FORMAT([{DATE_COLUMN}], 'yyyy-MM')
                """)
                with engine.connect() as conn:
                    df = pd.read_sql(query, conn)
                data_source = "on_the_fly_aggregation"
        else:
            # Fallback: use sample data
            df = FALLBACK_DF.copy()
            if DATE_COLUMN in df.columns and "Insurance Type" in df.columns:
                df[DATE_COLUMN] = pd.to_datetime(df[DATE_COLUMN])
                df['month'] = df[DATE_COLUMN].dt.strftime('%Y-%m')
                df = df.groupby(['month', 'Insurance Type']).size().reset_index(name='count')
                df.rename(columns={'Insurance Type': 'insurance_type'}, inplace=True)
            else:
                # If columns don't exist, return empty structure
                return jsonify({
                    "months": [],
                    "data": {},
                    "totals": [],
                    "fallback": True
                })
            data_source = "fallback_sample"

        # Transform data into the desired format
        months = sorted(df['month'].unique().tolist())
        insurance_types = df['insurance_type'].unique().tolist()
        
        # Build data structure
        data = {}
        for ins_type in insurance_types:
            data[ins_type] = []
            for month in months:
                count = df[(df['month'] == month) & (df['insurance_type'] == ins_type)]['count'].sum()
                data[ins_type].append(int(count))
        
        # Calculate totals per month
        totals = []
        for month in months:
            total = df[df['month'] == month]['count'].sum()
            totals.append(int(total))
        
        response_data = {
            "months": months,
            "data": data,
            "totals": totals,
            "fallback": not DB_AVAILABLE,
            "source": data_source
        }
        
        # Store in cache
        MONTHLY_STATS_CACHE['data'] = response_data
        MONTHLY_STATS_CACHE['timestamp'] = datetime.now()
        logger.info(f"Monthly stats cached successfully (expires in {MONTHLY_STATS_CACHE['ttl_minutes']} minutes)")
        
        return jsonify(response_data)
    
    except Exception as e:
        logger.exception("Error in /api/monthly-stats")
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500


@app.route("/api/clear-cache", methods=["POST"])
def clear_cache():
    """
    Clears the monthly stats cache.
    Useful when new data is added and you want to see it immediately.
    """
    global MONTHLY_STATS_CACHE
    MONTHLY_STATS_CACHE['data'] = None
    MONTHLY_STATS_CACHE['timestamp'] = None
    logger.info("Monthly stats cache cleared manually")
    return jsonify({"message": "Cache cleared successfully"})


@app.route("/api/export", methods=["GET"])
def export_data():
    """
    Exports rows from the configured table as a CSV or XLSX file filtered by the date slicer.
    Query params:
      - format: (optional) 'csv' or 'xlsx', defaults to csv
      - from: (optional) start date filter (YYYY-MM-DD) applied to DATE_COLUMN
      - to: (optional) end date filter (YYYY-MM-DD) applied to DATE_COLUMN
      - cols: (optional) comma-separated list of columns to include; if omitted all columns are returned
      - report: (optional) report type (claims, cea, complaints)
      - categories: (optional) comma-separated list of categories to filter by
    Falls back to sample data if DB unavailable.
    """
    try:
        file_format = request.args.get("format", "csv").lower()
        from_date = request.args.get("from", None)
        to_date = request.args.get("to", None)
        cols_param = request.args.get("cols", None)
        categories_param = request.args.get("categories", None)
        report_type = request.args.get("report", "claims")
        table_name = get_table_name(report_type)
        date_col = REPORT_DATE_COLUMNS.get(report_type, DATE_COLUMN)

        # Build select clause
        if cols_param:
            cols = [c.strip() for c in cols_param.split(",") if c.strip()]
            # Basic safety: ensure column names don't contain semicolons, DROP, or suspicious tokens
            safe_cols = []
            for c in cols:
                if ";" in c or "--" in c or "/*" in c:
                    continue
                # wrap in brackets
                safe_cols.append(f"[{c}]")
            if not safe_cols:
                select_cols = "*"
            else:
                select_cols = ", ".join(safe_cols)
        else:
            select_cols = "*"

        where_clauses = []
        params_sql = {}
        if from_date:
            where_clauses.append(f"[{date_col}] >= :from_date")
            params_sql["from_date"] = from_date
        if to_date:
            where_clauses.append(f"[{date_col}] <= :to_date")
            params_sql["to_date"] = to_date
            
        if categories_param:
            cats = [c.strip() for c in categories_param.split(",") if c.strip()]
            if cats:
                cat_params = []
                for i, cat in enumerate(cats):
                    pname = f"cat_{i}"
                    cat_params.append(f":{pname}")
                    params_sql[pname] = cat
                
                if report_type == 'complaints':
                    where_clauses.append(f"[Product Type] IN ({', '.join(cat_params)})")
                elif report_type == 'cea':
                    where_clauses.append(f"[Policy Type (AI/HI)] IN ({', '.join(cat_params)})")

        where_sql = ""
        if where_clauses:
            where_sql = " WHERE " + " AND ".join(where_clauses)
        
        current_engine, current_available = get_db_context(report_type)

        if current_available and current_engine is not None:
            query = text(f"SELECT {select_cols} FROM [{TABLE_SCHEMA}].[{table_name}]{where_sql}")
            with current_engine.connect() as conn:
                df = pd.read_sql(query, conn, params=params_sql)
        else:
            # fallback: select columns from FALLBACK_DF
            df = FALLBACK_DF.copy()
            if cols_param:
                keep = [c for c in cols_param.split(",") if c in df.columns]
                if keep:
                    df = df[keep]
            # apply date filters if possible
            try:
                if from_date and DATE_COLUMN in df.columns:
                    df = df[pd.to_datetime(df[DATE_COLUMN]) >= pd.to_datetime(from_date)]
                if to_date and DATE_COLUMN in df.columns:
                    df = df[pd.to_datetime(df[DATE_COLUMN]) <= pd.to_datetime(to_date)]
            except Exception:
                # ignore date parse errors
                pass
            
            except Exception:
                # ignore date parse errors
                pass
            
            except Exception:
                # ignore date parse errors
                pass
            
            if categories_param: 
                cats = [c.strip() for c in categories_param.split(",") if c.strip()]
                if cats:
                    if report_type == 'complaints' and 'Product Type' in df.columns:
                        df = df[df['Product Type'].isin(cats)]
                    elif report_type == 'cea' and 'Policy Type (AI/HI)' in df.columns:
                        df = df[df['Policy Type (AI/HI)'].isin(cats)]

        now = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        
        if file_format == 'xlsx':
            # Export as Excel
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                # Check for large dataset (limit 1M rows per sheet)
                MAX_ROWS = 1000000
                if len(df) > MAX_ROWS:
                    total_rows = len(df)
                    num_chunks = (total_rows // MAX_ROWS) + (1 if total_rows % MAX_ROWS else 0)
                    for i in range(num_chunks):
                        start_row = i * MAX_ROWS
                        end_row = min((i + 1) * MAX_ROWS, total_rows)
                        chunk = df.iloc[start_row:end_row]
                        chunk.to_excel(writer, index=False, sheet_name=f'Report_Data_{i+1}')
                else:
                    df.to_excel(writer, index=False, sheet_name='Report_Data')
            output.seek(0)
            
            filename = f"{report_type}_export_{now}.xlsx"
            resp = Response(output.read(), mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            resp.headers["Content-Disposition"] = f"attachment; filename={filename}"
        else:
            # Export as CSV (Default)
            csv_buffer = io.StringIO()
            df.to_csv(csv_buffer, index=False)
            csv_value = csv_buffer.getvalue()
            csv_buffer.close()

            filename = f"{report_type}_export_{now}.csv"
            resp = Response(csv_value, mimetype="text/csv")
            resp.headers["Content-Disposition"] = f"attachment; filename={filename}"
        
        # include header to indicate fallback if used
        if not DB_AVAILABLE:
            resp.headers["X-Data-Source"] = "fallback-sample"
        return resp

    except Exception as e:
        logger.exception("Error in /api/export")
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    # Try to create engine on startup again (useful if network flapped)
    try_create_engine()
    app.run(host="0.0.0.0", port=port, debug=True)
