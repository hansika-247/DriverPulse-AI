
import os
import pickle
import pandas as pd
import psutil
import sklearn.ensemble  # <--- FIX

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(PROJECT_ROOT, 'models', 'risk_classifier.pkl')
ENC_PATH = os.path.join(PROJECT_ROOT, 'models', 'encoders.pkl')
CSV_PATH = os.path.join(PROJECT_ROOT, 'processed', 'final_driver_dataset.csv')

def show_memory(stage):
    mem = psutil.virtual_memory()
    print(f'\n[{stage}]\nAvailable RAM: {mem.available / (1024**3):.2f} GB\nUsed RAM: {mem.used / (1024**3):.2f} GB')

if __name__ == '__main__':
    show_memory('START')
    print('\nLoading model...')
    with open(MODEL_PATH, 'rb') as f:
        bundle = pickle.load(f)
    print('✅ Model loaded')
