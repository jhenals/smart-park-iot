import json
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report
import matplotlib.pyplot as plt
import os

SEED = 42
FEATURES = ["temperature", "humidity", "pressure"]
LABEL_COL = "Weather"
MIN_SAMPLES = 10
dropout = 0.3

def main():
    df = pd.read_csv("WeatherData.csv")

    # Remove rare classes
    print("\n============ Step 1: preprocessing step ==============\n")
    counts = df[LABEL_COL].value_counts()
    valid = counts[counts >= MIN_SAMPLES].index
    df = df[df[LABEL_COL].isin(valid)].reset_index(drop=True)

    X = df[FEATURES].astype(np.float32).values
    le = LabelEncoder()
    y = le.fit_transform(df[LABEL_COL].values)

    scaler = StandardScaler()
    Xs = scaler.fit_transform(X).astype(np.float32)

    X_train, X_test, y_train, y_test = train_test_split(
        Xs, y, test_size=0.2, random_state=SEED, stratify=y, shuffle=True
    )
   
    n_classes = len(le.classes_)
    print(f"Number of Classes: {n_classes} \n ")
    print(f"Classes: {le.classes_} \n")
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(len(FEATURES),)),
        tf.keras.layers.Dense(64, activation="relu"),
        tf.keras.layers.Dropout(dropout),
        tf.keras.layers.Dense(32, activation="relu"),
        tf.keras.layers.Dense(n_classes, activation="softmax"),
    ])
    print("\n============ Step 2: training step ==============\n")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )

    history = model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=30,
        batch_size=32,
        verbose=1
    )
    
    print("\n============ Step 3: evaluation & export step ==============\n")
    def save_learning_curves(history, out_dir="artifacts"):
        os.makedirs(out_dir, exist_ok=True)

        # ---- Loss plot ----
        plt.figure()
        plt.plot(history.history.get("loss", []), label="train_loss")
        plt.plot(history.history.get("val_loss", []), label="val_loss")
        plt.xlabel("Epoch")
        plt.ylabel("Loss")
        plt.title("Training vs Validation Loss")
        plt.legend()
        plt.grid(True)
        plt.tight_layout()
        plt.savefig(os.path.join(out_dir, f"learning_curve_loss_{dropout}.png"), dpi=200)
        plt.close()

        # ---- Accuracy plot (if available) ----
        if "accuracy" in history.history and "val_accuracy" in history.history:
            plt.figure()
            plt.plot(history.history.get("accuracy", []), label="train_acc")
            plt.plot(history.history.get("val_accuracy", []), label="val_acc")
            plt.xlabel("Epoch")
            plt.ylabel("Accuracy")
            plt.title("Training vs Validation Accuracy")
            plt.legend()
            plt.grid(True)
            plt.tight_layout()
            plt.savefig(os.path.join(out_dir, f"learning_curve_accuracy_{dropout}.png"), dpi=200)
            plt.close()

    save_learning_curves(history, out_dir="artifacts")
    print(f"Saved: artifacts/learning_curve_loss_{dropout}.png")
    print(f"Saved: artifacts/learning_curve_accuracy_{dropout}.png (if accuracy available)")

    print("\n============ Step 4: prediction on Test Set step ==============\n")
    preds = np.argmax(model.predict(X_test, verbose=0), axis=1)
    print("\nClassification report:\n")
    print(classification_report(y_test, preds, target_names=le.classes_))

    print("\n============= Step 5: export step ==============\n")
    # Export TFLite
        
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS]
    tflite_model = converter.convert()

    with open("weather_model.tflite", "wb") as f:
        f.write(tflite_model)
    print("Saved: weather_model.tflite")

    # Export preprocess.json (edge friendly)
    preprocess = {
        "version": "1.0",
        "features": FEATURES,
        "units": {
            # Based on your dataset values, pressure appears to be kPa (~101.x)
            "pressure": "kPa",
            "temperature": "C",
            "humidity": "%",
        },
        "scaler": {
            "mean": scaler.mean_.tolist(),
            "std": scaler.scale_.tolist()
        },
        "labels": le.classes_.tolist()
    }
    with open("preprocess.json", "w", encoding="utf-8") as f:
        json.dump(preprocess, f, indent=2)
    print("Saved: preprocess.json")

if __name__ == "__main__":
    main()
