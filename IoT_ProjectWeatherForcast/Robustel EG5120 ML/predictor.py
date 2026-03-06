#!/usr/bin/env python3
import os
# 0 = All logs, 1 = Filter INFO, 2 = Filter INFO/WARNING, 3 = Filter all
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

import json
import sys
import numpy as np
from ai_edge_litert.interpreter import Interpreter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PREPROCESS_PATH = os.path.join(SCRIPT_DIR, "preprocess.json")
MODEL_PATH = os.path.join(SCRIPT_DIR, "weather_model.tflite")

PA_THRESHOLD = 2000.0
TOPK = 5


def load_preprocess(path: str):
    with open(path, "r", encoding="utf-8") as f:
        pp = json.load(f)

    features = pp.get("features", ["temperature", "humidity", "pressure"])
    scaler = pp["scaler"]
    mean = np.array(scaler["mean"], dtype=np.float32)
    std = np.array(scaler["std"], dtype=np.float32)
    labels = pp["labels"]

    if len(features) != len(mean) or len(features) != len(std):
        raise ValueError(
            f"Preprocess mismatch: features={len(features)}, mean={len(mean)}, std={len(std)}"
        )

    return features, mean, std, labels


def normalize_units(payload: dict):
    if "pressure" in payload and payload["pressure"] is not None:
        p = float(payload["pressure"])
        if p > PA_THRESHOLD:
            payload["pressure"] = p / 1000.0
    return payload


def build_input_vector(payload: dict, features: list):
    x = []
    for f in features:
        if f not in payload or payload[f] is None:
            raise ValueError(f"Missing or null feature: {f}")
        x.append(float(payload[f]))
    return np.array(x, dtype=np.float32)


def read_payload_json():
    """
    Read JSON only from command-line argument.
    Works with Node-RED when 'Append msg.payload to command' is enabled.
    """
    if len(sys.argv) < 2:
        raise ValueError("No JSON argument provided")

    return sys.argv[1]


def main():
    if not os.path.exists(PREPROCESS_PATH):
        raise FileNotFoundError(f"preprocess.json not found at: {PREPROCESS_PATH}")

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"weather_model.tflite not found at: {MODEL_PATH}")

    features, mean, std, labels = load_preprocess(PREPROCESS_PATH)

    interpreter = Interpreter(model_path=MODEL_PATH)
    interpreter.allocate_tensors() 
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    raw = read_payload_json()
    payload = json.loads(raw)
    payload = normalize_units(payload)

    x = build_input_vector(payload, features)
    x = (x - mean) / std
    x = x.reshape(1, -1)

    interpreter.set_tensor(input_details[0]["index"], x)
    interpreter.invoke()

    probs = interpreter.get_tensor(output_details[0]["index"])[0].astype(np.float64)
    idx = int(np.argmax(probs))
    conf = float(probs[idx])

    result = {
        "prediction": labels[idx],
        "confidence": conf
    }

    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        error = {"error": str(e), "type": type(e).__name__}
        print(json.dumps(error), file=sys.stderr)
        sys.exit(1)
