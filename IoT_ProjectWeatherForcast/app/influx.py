from influxdb_client import InfluxDBClient
from app.config import INFLUXDB_URL, INFLUXDB_TOKEN, INFLUXDB_ORG, validate_config

validate_config()

_client: InfluxDBClient | None = None

def get_client() -> InfluxDBClient:
    global _client
    if _client is None:
        _client = InfluxDBClient(url=INFLUXDB_URL, token=INFLUXDB_TOKEN, org=INFLUXDB_ORG)
    return _client

def query(flux: str):
    client = get_client()
    return client.query_api().query(flux)