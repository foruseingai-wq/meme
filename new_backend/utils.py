import pandas as pd

def df_to_json_safe(df: pd.DataFrame) -> list:
    """Convert DataFrame to JSON-safe list of dicts"""
    result = []
    for _, row in df.iterrows():
        record = {}
        for col in df.columns:
            val = row[col]
            if pd.isna(val):
                record[col] = None
            elif isinstance(val, (int, float, str, bool)):
                if isinstance(val, float) and (val != val):  # NaN check
                    record[col] = None
                else:
                    record[col] = val
            else:
                record[col] = str(val)
        result.append(record)
    return result
