from __future__ import annotations

import argparse
import csv
import json
import math
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import UUID


ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"


def load_payload(artifacts: Path, dataset_name: str) -> dict:
    metrics_path = artifacts / "metrics.json"
    forecast_path = artifacts / "demand_forecast.csv"

    if not metrics_path.is_file() or not forecast_path.is_file():
        raise FileNotFoundError(
            "Forecast artifacts are missing. Train the model with sufficient "
            "order history before syncing."
        )

    metadata = json.loads(metrics_path.read_text(encoding="utf-8"))
    selected_model = metadata.get("selected_model")
    if not selected_model:
        raise ValueError("Training metadata does not identify a selected model.")

    forecasts = []
    with forecast_path.open(newline="", encoding="utf-8-sig") as file:
        for line, row in enumerate(csv.DictReader(file), start=2):
            try:
                product_id = str(UUID(row["product_id"]))
                forecast_date = datetime.strptime(
                    row["order_date"], "%Y-%m-%d"
                ).date().isoformat()
                quantity = float(row["predicted_quantity"])
            except (KeyError, TypeError, ValueError) as error:
                raise ValueError(
                    f"Invalid forecast row at CSV line {line}: {error}"
                ) from error

            if not math.isfinite(quantity) or quantity < 0:
                raise ValueError(
                    f"Forecast quantity must be finite and non-negative at CSV line {line}."
                )

            forecasts.append(
                {
                    "product_id": product_id,
                    "forecast_date": forecast_date,
                    "predicted_quantity": quantity,
                }
            )

    if not forecasts:
        raise ValueError("The forecast CSV has no rows; nothing was synced.")

    version = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    trained_at = datetime.now(timezone.utc).isoformat()

    return {
        "model": {
            "model_name": "nicey-demand-forecast",
            "version": version,
            "algorithm": selected_model,
            "dataset_name": dataset_name,
            "metrics": metadata,
            "trained_at": trained_at,
            "status": "CANDIDATE",
        },
        "demand_forecasts": forecasts,
        "activate": True,
    }


def sync(payload: dict, supabase_url: str, token: str) -> dict:
    endpoint = f"{supabase_url.rstrip('/')}/functions/v1/ml-sync"
    request = Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-ml-sync-token": token,
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"Forecast sync failed with HTTP {error.code}: {detail}"
        ) from error
    except URLError as error:
        raise RuntimeError(f"Unable to reach the forecast sync endpoint: {error}") from error

    if not result.get("ok"):
        raise RuntimeError(f"Forecast sync was rejected: {result}")

    return result


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Load trained sales forecasts into the Supabase project."
    )
    parser.add_argument("--dataset", required=True, help="Name of the exported dataset.")
    parser.add_argument("--artifacts", type=Path, default=ARTIFACTS)
    args = parser.parse_args()

    supabase_url = os.environ.get("NBJ_SUPABASE_URL", "").strip()
    token = os.environ.get("ML_SYNC_TOKEN", "").strip()
    if not supabase_url or not token:
        raise SystemExit(
            "Set NBJ_SUPABASE_URL and ML_SYNC_TOKEN in the trusted terminal first."
        )

    payload = load_payload(args.artifacts, args.dataset)
    result = sync(payload, supabase_url, token)
    print(
        f"Activated forecast model {payload['model']['model_name']} "
        f"({payload['model']['version']}); loaded "
        f"{len(payload['demand_forecasts'])} sales estimates "
        f"(model id {result['model_id']})."
    )


if __name__ == "__main__":
    main()
