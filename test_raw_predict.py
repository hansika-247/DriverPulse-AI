import sys, os
sys.path.insert(0, os.path.join(os.path.abspath('.'), 'backend'))
from services.model_loader import load_all_assets
from services.predictor import predict_driver

load_all_assets()
test_ids = ['DRV001', 'DRV050', 'DRV100', 'DRV150', 'DRV200']
print('==== RAW PREDICTIONS ====')
for d in test_ids:
    res = predict_driver(d)
    print('%s: risk=%s, conf=%s, score=%s, source=%s' % (d, res.get('risk_level'), res.get('confidence'), res.get('predicted_safety_score'), res.get('source')))
