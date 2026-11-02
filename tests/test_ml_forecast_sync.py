"""Validation tests for the trusted forecast upload helper."""

import csv
import json
import sys
import tempfile
import unittest
from pathlib import Path
from uuid import uuid4

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1] / "ml" / "training"),
)

from sync_forecasts import load_payload


class ForecastPayloadTests(unittest.TestCase):
    def create_artifacts(self, directory, product_id):
        artifacts = Path(directory)
        (artifacts / "metrics.json").write_text(
            json.dumps({"selected_model": "seasonal_baseline"}),
            encoding="utf-8",
        )
        with (artifacts / "demand_forecast.csv").open(
            "w",
            newline="",
            encoding="utf-8",
        ) as file:
            writer = csv.DictWriter(
                file,
                fieldnames=["order_date", "product_id", "predicted_quantity"],
            )
            writer.writeheader()
            writer.writerow(
                {
                    "order_date": "2026-11-03",
                    "product_id": product_id,
                    "predicted_quantity": "3.5",
                }
            )
        return artifacts

    def test_builds_candidate_model_and_valid_forecast_payload(self):
        with tempfile.TemporaryDirectory() as directory:
            product_id = str(uuid4())
            artifacts = self.create_artifacts(directory, product_id)

            payload = load_payload(artifacts, "orders.csv")

        self.assertEqual(payload["model"]["status"], "CANDIDATE")
        self.assertEqual(payload["model"]["dataset_name"], "orders.csv")
        self.assertEqual(payload["demand_forecasts"][0]["product_id"], product_id)
        self.assertEqual(
            payload["demand_forecasts"][0]["forecast_date"],
            "2026-11-03",
        )
        self.assertEqual(
            payload["demand_forecasts"][0]["predicted_quantity"],
            3.5,
        )
        self.assertTrue(payload["activate"])

    def test_rejects_invalid_product_ids(self):
        with tempfile.TemporaryDirectory() as directory:
            artifacts = self.create_artifacts(directory, "not-a-uuid")

            with self.assertRaisesRegex(ValueError, "Invalid forecast row"):
                load_payload(artifacts, "orders.csv")

    def test_rejects_missing_training_artifacts(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(FileNotFoundError, "Train the model"):
                load_payload(Path(directory), "orders.csv")


if __name__ == "__main__":
    unittest.main()
