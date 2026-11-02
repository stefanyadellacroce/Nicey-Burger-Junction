# Sales forecast setup

The Stock & Sales Outlook page only displays estimates; it does not train a
model or invent missing sales history. Do not sync a model until there is enough
completed-order history for training and the chronological validation check.

## Prepare training data

1. Use a trusted administrator workstation and an authorized Supabase SQL
   session. Run [`export_nicey_data.sql`](../../ml/training/export_nicey_data.sql)
   and download the result as `ml/data/nicey_orders.csv`.
2. The export contains completed orders only. Keep the CSV private; it is
   training input and must not be added to source control.
3. Install the packages from `ml/requirements.txt` in the local Python
   environment.
4. Train and validate locally:

   ```powershell
   python ml/training/train.py --input ml/data/nicey_orders.csv --source NICEY
   ```

   Training stops if the export is empty, cannot produce lag features, or has
   fewer than 10 distinct dates in its chronological validation holdout. Add
   more completed-order history before trying again.

## Load an approved forecast

After training succeeds, set `NBJ_SUPABASE_URL` and `ML_SYNC_TOKEN` in the
trusted terminal environment. `ML_SYNC_TOKEN` must match the `ML_SYNC_TOKEN`
secret configured for the deployed `ml-sync` Edge Function. Never put this
token in frontend configuration, Netlify variables, source files, or the CSV.

```powershell
python ml/training/sync_forecasts.py --dataset nicey_orders.csv
```

The loader validates product UUIDs and forecast rows, then uploads and
activates the trained demand model. It does not create inventory forecasts;
the Stock to check card remains empty until inventory-forecast generation is
implemented and its estimates are loaded separately.

The current workspace contains no order-history CSV or trained artifacts. Do
not run the training or sync commands until the real export is available and
passes validation.
