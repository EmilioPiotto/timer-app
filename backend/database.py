import os
import boto3
from dotenv import load_dotenv

load_dotenv(".env.local")

_dynamodb = boto3.resource(
    "dynamodb",
    region_name=os.environ.get("AWS_DEFAULT_REGION", "us-east-1"),
    endpoint_url=os.environ.get("DYNAMODB_ENDPOINT_URL") or None,
    aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
)


def get_macros_table():
    return _dynamodb.Table(os.environ.get("DYNAMODB_TABLE_MACROS", "macros"))


def get_timers_table():
    return _dynamodb.Table(os.environ.get("DYNAMODB_TABLE_TIMERS", "timers"))


def init_tables():
    table_configs = [
        {
            "TableName": os.environ.get("DYNAMODB_TABLE_MACROS", "macros"),
            "KeySchema": [{"AttributeName": "id", "KeyType": "HASH"}],
            "AttributeDefinitions": [{"AttributeName": "id", "AttributeType": "S"}],
            "BillingMode": "PAY_PER_REQUEST",
        },
        {
            "TableName": os.environ.get("DYNAMODB_TABLE_TIMERS", "timers"),
            "KeySchema": [{"AttributeName": "id", "KeyType": "HASH"}],
            "AttributeDefinitions": [{"AttributeName": "id", "AttributeType": "S"}],
            "BillingMode": "PAY_PER_REQUEST",
        },
    ]
    for config in table_configs:
        try:
            _dynamodb.create_table(**config)
        except _dynamodb.meta.client.exceptions.ResourceInUseException:
            pass
