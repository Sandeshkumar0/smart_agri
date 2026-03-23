#!/usr/bin/env python3
import argparse
import json
import os
from pathlib import Path


def fail(message: str):
    print(json.dumps({"ok": False, "error": message}))
    raise SystemExit(0)


try:
    import cv2  # type: ignore
    import numpy as np  # type: ignore
except Exception as exc:  # pragma: no cover
    fail(f"Missing python deps (opencv-python, numpy): {exc}")


ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def preprocess_image(path: Path, size: int):
    img = cv2.imread(str(path))
    if img is None:
        return None
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    resized = cv2.resize(gray, (size, size), interpolation=cv2.INTER_AREA)
    arr = resized.astype("float32") / 255.0
    return arr.reshape(-1)


def load_dataset(dataset_dir: Path, size: int):
    labels = []
    samples = []
    label_to_id = {}

    if not dataset_dir.exists() or not dataset_dir.is_dir():
        fail(f"Dataset path not found: {dataset_dir}")

    for cls_dir in sorted(dataset_dir.iterdir()):
        if not cls_dir.is_dir():
            continue
        label = cls_dir.name.strip()
        if not label:
            continue
        if label not in label_to_id:
            label_to_id[label] = len(label_to_id)
        label_id = label_to_id[label]

        for img_path in cls_dir.rglob("*"):
            if not img_path.is_file():
                continue
            if img_path.suffix.lower() not in ALLOWED_EXTS:
                continue
            vec = preprocess_image(img_path, size)
            if vec is None:
                continue
            samples.append(vec)
            labels.append(label_id)

    if not samples:
        fail("No valid images found in dataset directory")

    id_to_label = {v: k for k, v in label_to_id.items()}
    return np.array(samples, dtype=np.float32), np.array(labels, dtype=np.int32), id_to_label


def compute_confidence_from_distance(distance: float):
    # KNN returns squared distance in feature space.
    conf = 100.0 * (1.0 / (1.0 + (distance / 1200.0)))
    if conf < 0:
        conf = 0
    if conf > 100:
        conf = 100
    return float(conf)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--image", required=True)
    parser.add_argument("--size", type=int, default=96)
    parser.add_argument("--k", type=int, default=3)
    args = parser.parse_args()

    dataset_dir = Path(args.dataset).resolve()
    image_path = Path(args.image).resolve()
    if not image_path.exists():
        fail(f"Input image not found: {image_path}")

    train_x, train_y, id_to_label = load_dataset(dataset_dir, args.size)
    q = preprocess_image(image_path, args.size)
    if q is None:
        fail("Could not read input image")
    q = np.array([q], dtype=np.float32)

    knn = cv2.ml.KNearest_create()
    knn.train(train_x, cv2.ml.ROW_SAMPLE, train_y)

    _, results, neighbors, dist = knn.findNearest(q, k=max(1, args.k))
    pred_id = int(results[0][0])
    pred_label = id_to_label.get(pred_id, "unknown")
    nearest_dist = float(dist[0][0]) if dist is not None and len(dist) > 0 else 99999.0
    confidence = compute_confidence_from_distance(nearest_dist)

    print(
        json.dumps(
            {
                "ok": True,
                "label": pred_label,
                "confidence": round(confidence, 2),
                "distance": round(nearest_dist, 4),
                "neighbors": [int(x) for x in (neighbors[0].tolist() if neighbors is not None else [])],
                "classCount": len(id_to_label),
                "sampleCount": int(train_x.shape[0]),
                "engine": "opencv-dataset",
            }
        )
    )


if __name__ == "__main__":
    main()

