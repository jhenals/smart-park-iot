from fastapi import APIRouter, Query
from typing import List, Dict, Any
from app.schemas import WeatherPoint
from app.influx import query as influx_query
from app.config import INFLUXDB_BUCKET, INFLUXDB_MEASUREMENT as meas


router = APIRouter(prefix="")


@router.get("/forecast/", response_model=List[WeatherPoint])
def get_weather_forecast(
    # device_id: str,
    minutes: int = Query(60, ge=1, le=7*24*60),
        measurement: str = Query(meas),):
    # Flux query: filter by time range, measurement, and device_id tag
    flux = f'''
from(bucket: "{INFLUXDB_BUCKET}")
  |> range(start: -{minutes}m)
  |> filter(fn: (r) => r._measurement == "{measurement}")
  |> keep(columns: ["_time","_field","_value"])
'''

    tables = influx_query(flux)

    # Influx results are "tall": each record is (time, field, value).
    # We reshape into "wide" JSON: one object per time with multiple fields.
    by_time: Dict[str, Dict[str, Any]] = {}

    for table in tables:
        for record in table.records:
            t = record.get_time().isoformat()
            field = record.get_field()
            value = record.get_value()

            if t not in by_time:
                by_time[t] = {"time": record.get_time()}
            by_time[t][field] = value

    # Convert dict->list, sort by time ascending
    result = list(by_time.values())
    result.sort(key=lambda x: x["time"])
    return result
