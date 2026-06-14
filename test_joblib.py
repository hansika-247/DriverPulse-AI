import pickle

if __name__ == '__main__':
    print('Starting')
    with open('models/risk_classifier.pkl', 'rb') as f:
        pickle.load(f)
    print('Done')
