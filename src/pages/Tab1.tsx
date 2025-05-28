import React, { useState, useRef, useEffect } from 'react';
import { IonContent, IonPage, IonButton } from '@ionic/react';
import './Tab1.css';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'; // ZMIANA: import Camera
import { Share } from '@capacitor/share';

const Tab1: React.FC = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const defaultSettings = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sepia: 0,
  };

  const [imageSettings, setImageSettings] = useState(defaultSettings);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editedImageRef = useRef<HTMLImageElement>(null);
  
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        // ZMIANA: fallback na URL.createObjectURL
        try {
          videoRef.current.srcObject = mediaStream;
        } catch (error) {
          videoRef.current.src = URL.createObjectURL(mediaStream);
        }
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const width = video.videoWidth || video.clientWidth;
      const height = video.videoHeight || video.clientHeight;

      // ZMIANA: sprawdzenie czy kamera gotowa
      if (width === 0 || height === 0) {
        console.warn("Camera not ready yet. Try again.");
        return;
      }

      canvasRef.current.width = width;
      canvasRef.current.height = height;

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      ctx.translate(width, 0);
      ctx.scale(-1, 1);

      ctx.drawImage(video, 0, 0, width, height);

      ctx.setTransform(1, 0, 0, 1, 0, 0);

      const imageDataUrl = canvasRef.current.toDataURL('image/png');
      setCapturedImage(imageDataUrl);
      stopCamera();
    }
  };

  const savePhoto = async () => {
    if (capturedImage && canvasRef.current && editedImageRef.current) {
      const img = new Image();
      img.onload = async () => {
        const canvas = canvasRef.current!;
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d')!;
        ctx.filter = `
          brightness(${imageSettings.brightness}%)
          contrast(${imageSettings.contrast}%)
          saturate(${imageSettings.saturation}%)
          sepia(${imageSettings.sepia}%)
        `;
        ctx.drawImage(img, 0, 0);

        ctx.filter = 'none';

        const imageDataUrlToSave = canvas.toDataURL('image/png');

        try {
          const fileName = `photo_${new Date().getTime()}.png`;
          const base64Data = imageDataUrlToSave.split(',')[1];

          await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: (Directory as any).Pictures,
            recursive: true
          });
          alert('Photo saved successfully!');
        } catch (error) {
          console.error('Error saving photo:', error);
          alert('Failed to save photo.');
        }
      };
      img.src = capturedImage;
    }
  };

  const deletePhoto = () => {
    setCapturedImage(null);
    resetSettings();
    startCamera();
  };

  const applyFilters = () => {
    if (capturedImage && editedImageRef.current) {
      editedImageRef.current.style.filter = `
        brightness(${imageSettings.brightness}%)
        contrast(${imageSettings.contrast}%)
        saturate(${imageSettings.saturation}%)
        sepia(${imageSettings.sepia}%)
      `;
    }
  };

  const handleSettingChange = (setting: keyof typeof defaultSettings, value: string) => {
    setImageSettings(prev => ({
      ...prev,
      [setting]: Number(value),
    }));
  };

  const resetSettings = () => {
    setImageSettings(defaultSettings);
  };

  useEffect(() => {
    applyFilters();
  }, [imageSettings, capturedImage]);

  useEffect(() => {
    // ZMIANA: prosimy o uprawnienia do kamery
    const requestPermissions = async () => {
      try {
        await Camera.requestPermissions();
      } catch (err) {
        console.error("Permission error", err);
      }
    };
    requestPermissions();
    startCamera();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      // ZMIANA: ponowne przypisanie przy zmianie strumienia
      try {
        videoRef.current.srcObject = stream;
      } catch (error) {
        videoRef.current.src = URL.createObjectURL(stream as any);
      }
    }
  }, [stream]);

  return (
    <IonPage>
      <IonContent fullscreen className="tab1-content">
        <div className="app-header">Photo Editor</div>

        <div className="media-container">
          {!capturedImage ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="video-feed"
            />
          ) : (
            <img
              ref={editedImageRef}
              src={capturedImage}
              alt="Captured"
              className="captured-image"
            />
          )}
        </div>

        <div className="button-row">
          {!capturedImage && (
            <IonButton onClick={takePhoto} className="button-take-photo">
              TAKE PHOTO
            </IonButton>
          )}
          {capturedImage && (
            <>
              <IonButton onClick={savePhoto} className="button-save-photo">
                SAVE
              </IonButton>
              <IonButton onClick={deletePhoto} className="button-delete-photo">
                DELETE
              </IonButton>
            </>
          )}
        </div>

        {capturedImage && (
          <div className="sliders-container">
            <div className="slider-control">
              <label>Brightness</label>
              <input
                type="range"
                min="0"
                max="200"
                value={imageSettings.brightness}
                onChange={e => handleSettingChange('brightness', e.target.value)}
              />
              <span>{imageSettings.brightness}%</span>
            </div>

            <div className="slider-control">
              <label>Contrast</label>
              <input
                type="range"
                min="0"
                max="200"
                value={imageSettings.contrast}
                onChange={e => handleSettingChange('contrast', e.target.value)}
              />
              <span>{imageSettings.contrast}%</span>
            </div>

            <div className="slider-control">
              <label>Saturation</label>
              <input
                type="range"
                min="0"
                max="200"
                value={imageSettings.saturation}
                onChange={e => handleSettingChange('saturation', e.target.value)}
              />
              <span>{imageSettings.saturation}%</span>
            </div>

            <div className="slider-control">
              <label>Sepia</label>
              <input
                type="range"
                min="0"
                max="100"
                value={imageSettings.sepia}
                onChange={e => handleSettingChange('sepia', e.target.value)}
              />
              <span>{imageSettings.sepia}%</span>
            </div>

            <IonButton onClick={resetSettings} className="reset-button">
              RESET SETTINGS
            </IonButton>
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} /> {/* ZMIANA: canvas w DOM */}
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
