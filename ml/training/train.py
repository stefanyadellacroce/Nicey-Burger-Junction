from __future__ import annotations
import argparse, json, math
from pathlib import Path
import numpy as np, pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
import joblib

def load(path, source):
    p=Path(path)
    if source=='UCI':
        df=pd.read_excel(p)
        cols={c.lower():c for c in df.columns}
        date=cols.get('invoicedate'); stock=cols.get('stockcode'); desc=cols.get('description'); qty=cols.get('quantity')
        df=df[[date,stock,desc,qty]].rename(columns={date:'order_date',stock:'product_id',desc:'product_name',qty:'quantity'})
        df=df[df.quantity>0]
        df['order_date']=pd.to_datetime(df.order_date).dt.date
        return df.groupby(['order_date','product_id','product_name'],as_index=False).quantity.sum().assign(promotion_active=0)
    df=pd.read_csv(p)
    required={'order_date','product_id','product_name','quantity'}
    missing=required-set(df.columns)
    if missing: raise ValueError(f'Missing columns: {sorted(missing)}')
    df['order_date']=pd.to_datetime(df.order_date).dt.date
    if 'promotion_active' not in df: df['promotion_active']=0
    return df

def complete_daily(df):
    out=[]
    for pid,g in df.groupby('product_id'):
        idx=pd.date_range(pd.to_datetime(g.order_date).min(),pd.to_datetime(g.order_date).max(),freq='D')
        x=g.copy(); x.index=pd.to_datetime(x.order_date); x=x.reindex(idx)
        x['product_id']=str(pid); x['product_name']=x.product_name.ffill().bfill(); x['quantity']=x.quantity.fillna(0); x['promotion_active']=x.promotion_active.fillna(0)
        x['order_date']=x.index
        out.append(x.reset_index(drop=True))
    return pd.concat(out,ignore_index=True)

def features(df):
    df=df.sort_values(['product_id','order_date']).copy()
    df['dow']=df.order_date.dt.dayofweek; df['month']=df.order_date.dt.month; df['week']=df.order_date.dt.isocalendar().week.astype(int)
    for lag in (1,7,14): df[f'lag_{lag}']=df.groupby('product_id').quantity.shift(lag)
    df['ma_7']=df.groupby('product_id').quantity.transform(lambda s:s.shift(1).rolling(7,min_periods=2).mean())
    df['ma_28']=df.groupby('product_id').quantity.transform(lambda s:s.shift(1).rolling(28,min_periods=7).mean())
    return df.dropna(subset=['lag_14','ma_7'])

def metrics(y,p):
    mask=np.asarray(y)!=0
    return {'mae':float(mean_absolute_error(y,p)),'rmse':float(math.sqrt(mean_squared_error(y,p))),'r2':float(r2_score(y,p)),'mape':float(np.mean(np.abs((np.asarray(y)[mask]-np.asarray(p)[mask])/np.asarray(y)[mask]))*100) if mask.any() else None}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--input',required=True); ap.add_argument('--source',choices=['NICEY','UCI'],default='NICEY'); ap.add_argument('--horizon',type=int,default=14); a=ap.parse_args()
    raw=load(a.input,a.source)
    if raw.empty: raise ValueError('Training data is empty; export completed order history first.')
    df=features(complete_daily(raw))
    if df.empty: raise ValueError('Not enough order history to build lag features; collect more daily sales data first.')
    dates=sorted(df.order_date.unique()); cutoff=dates[max(1,int(len(dates)*.8))-1]; train=df[df.order_date<=cutoff]; test=df[df.order_date>cutoff]
    if test.order_date.nunique()<10: raise ValueError('Not enough chronological history for validation; the holdout must contain at least 10 distinct sales dates. Collect more data before training.')
    feats=['product_id','dow','month','week','promotion_active','lag_1','lag_7','lag_14','ma_7','ma_28']; cat=['product_id']; num=[x for x in feats if x not in cat]
    pre=ColumnTransformer([('cat',OneHotEncoder(handle_unknown='ignore'),cat),('num',Pipeline([('imp',SimpleImputer(strategy='median'))]),num)])
    models={'linear':LinearRegression(),'random_forest':RandomForestRegressor(n_estimators=180,min_samples_leaf=2,random_state=42,n_jobs=-1),'gradient_boosting':GradientBoostingRegressor(random_state=42)}
    results={}
    baseline=np.maximum(0,test['lag_7'].to_numpy()); results['seasonal_baseline']=metrics(test.quantity,baseline)
    fitted={}
    for name,model in models.items():
        pipe=Pipeline([('pre',pre),('model',model)]); pipe.fit(train[feats],train.quantity); pred=np.maximum(0,pipe.predict(test[feats])); results[name]=metrics(test.quantity,pred); fitted[name]=pipe
    best=min(results,key=lambda k:results[k]['mae'])
    artifacts=Path(__file__).resolve().parents[1]/'artifacts'; artifacts.mkdir(exist_ok=True)
    meta={'dataset_source':a.source,'rows':int(len(raw)),'train_rows':int(len(train)),'test_rows':int(len(test)),'cutoff':str(pd.Timestamp(cutoff).date()),'metrics':results,'selected_model':best}
    (artifacts/'metrics.json').write_text(json.dumps(meta,indent=2))
    if best!='seasonal_baseline': joblib.dump(fitted[best],artifacts/'demand_model.joblib')
    # Recursive future forecast using selected fitted model or lag-7 baseline.
    hist=complete_daily(raw); rows=[]
    for _ in range(a.horizon):
        next_date=pd.to_datetime(hist.order_date).max()+pd.Timedelta(days=1)
        future=[]
        for pid,g in hist.groupby('product_id'):
            pname=g.product_name.iloc[-1]; future.append({'order_date':next_date,'product_id':pid,'product_name':pname,'quantity':np.nan,'promotion_active':0})
        candidate=pd.concat([hist,pd.DataFrame(future)],ignore_index=True); f=features(candidate); target=f[f.order_date==next_date]
        if target.empty: break
        if best=='seasonal_baseline': preds=target.lag_7.to_numpy()
        else: preds=fitted[best].predict(target[feats])
        target=target.copy(); target['quantity']=np.maximum(0,preds); rows.append(target[['order_date','product_id','product_name','quantity']]);
        # append predictions to history for recursive lags
        predmap={str(r.product_id):float(r.quantity) for r in target.itertuples()}
        for item in future: item['quantity']=predmap.get(str(item['product_id']),0)
        hist=pd.concat([hist,pd.DataFrame(future)],ignore_index=True)
    if rows: pd.concat(rows).rename(columns={'quantity':'predicted_quantity'}).to_csv(artifacts/'demand_forecast.csv',index=False)
    print(json.dumps(meta,indent=2))
if __name__=='__main__': main()
