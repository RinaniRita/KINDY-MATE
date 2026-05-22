# /// script
# requires-python = "==3.10.*"
# dependencies = [
#     "fastapi",
#     "uvicorn",
#     "websockets",
#     "mediapipe==0.10.11",
#     "opencv-python-headless",
#     "numpy",
# ]
# ///

import asyncio
import base64
import cv2
import json
import numpy as np
import mediapipe as mp
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import mediapipe as mp
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)

from pydantic import BaseModel

class PoseRequest(BaseModel):
    image: str

@app.post("/pose")
async def pose_endpoint(req: PoseRequest):
    img_data = req.image
    if img_data.startswith("data:image"):
        img_data = img_data.split(",")[1]
    
    try:
        img_bytes = base64.b64decode(img_data)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    except Exception as e:
        return {"error": "Invalid image format"}
        
    if img is None:
        return {"error": "Could not decode image"}
        
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = pose.process(img_rgb)
    
    response = {"landmarks": []}
    
    if results.pose_landmarks:
        landmarks = results.pose_landmarks.landmark
        formatted_landmarks = []
        for i, lm in enumerate(landmarks):
            formatted_landmarks.append({
                "id": i,
                "x": lm.x,
                "y": lm.y,
                "z": lm.z,
                "visibility": lm.visibility
            })
        response["landmarks"] = formatted_landmarks
        
    return response

if __name__ == "__main__":
    print("Starting AI Pose Tracker on http://0.0.0.0:8001/pose")
    uvicorn.run(app, host="0.0.0.0", port=8001)
