import requests

def test_hybrid():
    # We will test DRV0001
    url = "http://localhost:8000/api/predict-risk"
    res = requests.post(url, json={"driver_id": "DRV0001"})
    print("Prediction:", res.json())

    # Test insights
    url2 = "http://localhost:8000/api/drivers/DRV0001"
    res2 = requests.get(url2)
    print("Profile:", res2.json())

    # Node insights proxy
    url3 = "http://localhost:5000/insights?driver_id=DRV0001"
    try:
        res3 = requests.get(url3)
        print("Insights:", res3.json()[:1])
    except Exception as e:
        print("Could not reach Node", e)

if __name__ == "__main__":
    test_hybrid()
