import React, { useState, useEffect, useRef } from "react";
import styles from "./PipecatWebSocketClient.module.css";

interface PipecatWebSocketClientProps {
  setCall: (value: boolean) => void;
  isDarkMode: boolean;
}

declare global {
  interface Window {
    protobuf: any;
  }
}

const SAMPLE_RATE = 16000;
const NUM_CHANNELS = 1;
const PLAY_TIME_RESET_THRESHOLD_MS = 1.0;

const PipecatWebSocketClient: React.FC<PipecatWebSocketClientProps> = ({
  setCall,
  isDarkMode,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isWebSocketReady, setIsWebSocketReady] = useState(false);
  const [Frame, setFrame] = useState<any>(null);
  const [transcript, setTranscript] = useState("");
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const playTimeRef = useRef(0);
  const lastMessageTimeRef = useRef(0);

  useEffect(() => {
    const loadProtobuf = () => {
      if (window.protobuf) {
        window.protobuf.load("/frames.proto", (err: any, root: any) => {
          if (err) {
            console.error("Error loading protobuf:", err);
            throw err;
          }
          setFrame(root.lookupType("pipecat.Frame"));
          setIsPlaying(false);
        });
      }
    };

    if (typeof window !== "undefined") {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/protobufjs@7.X.X/dist/protobuf.min.js";
      script.onload = loadProtobuf;
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  const initWebSocket = () => {
    console.log("Initializing WebSocket...");
    wsRef.current = new WebSocket(
      `${process.env.VOICE_URL ? process.env.VOICE_URL : "https://fluffy-space-enigma-7j5v5x64wggfpqv7-8765.app.github.dev/"}`
    );
    wsRef.current.addEventListener("open", () => {
      console.log("WebSocket connection established.");
      setIsWebSocketReady(true);
    });
    wsRef.current.addEventListener("message", handleWebSocketMessage);
    wsRef.current.addEventListener("close", (event) => {
      console.log("WebSocket connection closed.", event.code, event.reason);
      setIsWebSocketReady(false);
      stopAudio(false);
    });
    wsRef.current.addEventListener("error", (event) => {
      console.error("WebSocket error:", event);
      setIsWebSocketReady(false);
    });
  };

  const handleWebSocketMessage = async (event: MessageEvent) => {
    console.log("WebSocket message received");
    const arrayBuffer = await event.data.arrayBuffer();
    enqueueAudioFromProto(arrayBuffer);

    // Simulating AI response and transcription
    setIsAISpeaking(true);
    setTranscript("AI is processing your request...");
    setTimeout(() => {
      setTranscript("Here's the AI response to your query.");
      setTimeout(() => {
        setIsAISpeaking(false);
        setTranscript("");
      }, 3000);
    }, 2000);
  };

  const enqueueAudioFromProto = (arrayBuffer: ArrayBuffer) => {
    console.log("Enqueuing audio from proto...");
    console.log("Current Frame value:", Frame);
    if (!Frame) {
      console.error("Frame is not set");
      return;
    }

    const parsedFrame = Frame.decode(new Uint8Array(arrayBuffer));
    if (!parsedFrame?.audio) return false;

    const diffTime =
      audioContextRef.current?.currentTime! - lastMessageTimeRef.current;
    if (playTimeRef.current === 0 || diffTime > PLAY_TIME_RESET_THRESHOLD_MS) {
      playTimeRef.current = audioContextRef.current?.currentTime!;
    }
    lastMessageTimeRef.current = audioContextRef.current?.currentTime!;

    const audioVector = Array.from(parsedFrame.audio.audio);
    const audioArray = new Uint8Array(new ArrayBuffer(audioVector.length));
    audioVector.forEach((value, index) => {
      audioArray[index] = value as number;
    });

    if (audioContextRef.current) {
      audioContextRef.current.decodeAudioData(
        audioArray.buffer,
        (buffer) => {
          const source = new AudioBufferSourceNode(audioContextRef.current!);
          source.buffer = buffer;
          source.start(playTimeRef.current);
          source.connect(audioContextRef.current!.destination);
          playTimeRef.current = playTimeRef.current + buffer.duration;
          console.log("Audio enqueued successfully");
        },
        (error) => {
          console.error("Error decoding audio data:", error);
        }
      );
    } else {
      console.error("audioContextRef.current is null");
    }
  };

  const convertFloat32ToS16PCM = (float32Array: Float32Array) => {
    let int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      let clampedValue = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] =
        clampedValue < 0 ? clampedValue * 32768 : clampedValue * 32767;
    }
    return int16Array;
  };

  const startAudio = async () => {
    console.log("Starting audio...");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("getUserMedia is not supported in your browser.");
      return;
    }

    audioContextRef.current = new (window.AudioContext ||
      (window as any).webkitAudioContext)({
      latencyHint: "interactive",
      sampleRate: SAMPLE_RATE,
    });

    setIsPlaying(true);
    initWebSocket();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: NUM_CHANNELS,
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      console.log("Microphone stream obtained:", stream);
      microphoneStreamRef.current = stream;
      sourceRef.current =
        audioContextRef.current.createMediaStreamSource(stream);

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      sourceRef.current.connect(analyserRef.current);

      scriptProcessorRef.current =
        audioContextRef.current.createScriptProcessor(512, 1, 1);
      sourceRef.current.connect(scriptProcessorRef.current);
      scriptProcessorRef.current.connect(audioContextRef.current.destination);
      scriptProcessorRef.current.onaudioprocess = (event) => {
        const audioData = event.inputBuffer.getChannelData(0);

        let sum = 0.0;
        for (let i = 0; i < audioData.length; i++) {
          sum += Math.abs(audioData[i]);
        }
        const avgLevel = sum / audioData.length;

        const scaledLevel = Math.min(100, avgLevel * 20000);
        setAudioLevel(scaledLevel);

        const pcmS16Array = convertFloat32ToS16PCM(audioData);
        const pcmByteArray = new Uint8Array(pcmS16Array.buffer);
        const frame = Frame.create({
          audio: {
            audio: Array.from(pcmByteArray),
            sampleRate: SAMPLE_RATE,
            numChannels: NUM_CHANNELS,
          },
        });
        const encodedFrame = new Uint8Array(Frame.encode(frame).finish());
        wsRef.current?.send(encodedFrame);
      };

      console.log("Audio processing set up successfully");

      // Simulating real-time transcription
      const words = "Hello, how can I assist you today?".split(" ");
      let index = 0;
      const interval = setInterval(() => {
        if (index < words.length) {
          setTranscript((prev) => prev + " " + words[index]);
          index++;
        } else {
          clearInterval(interval);
        }
      }, 500);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopAudio = (closeWebsocket = true) => {
    console.log("Stopping audio...");
    playTimeRef.current = 0;
    setIsPlaying(false);
    setIsWebSocketReady(false);
    setAudioLevel(0);
    setTranscript("");

    if (wsRef.current && closeWebsocket) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
    }
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    console.log("Audio stopped and resources cleaned up");
  };

  return (
    <div
      className={`${styles.container} ${isDarkMode ? styles.darkMode : ""}`}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>EduMitra Voice Assistant</h2>
        <button onClick={() => setCall(false)} className={styles.closeButton}>
          Close
        </button>
      </div>
      <div className={styles.content}>
        <img
          className={styles.botImage}
          alt="bot"
          src="https://cdn3d.iconscout.com/3d/premium/thumb/cute-robot-on-call-6374844-5272690.png"
        />
        <div className={styles.transcriptContainer}>
          <p className={styles.transcript}>{transcript}</p>
          {isAISpeaking && (
            <div className={styles.aiSpeakingIndicator}>AI is speaking...</div>
          )}
        </div>
      </div>
      <div className={styles.footer}>
        <button
          className={`${styles.button} ${
            isPlaying ? styles.stopButton : styles.startButton
          }`}
          onClick={isPlaying ? () => stopAudio(true) : startAudio}
        >
          {isPlaying ? "Stop" : "Start"}
        </button>
        <div className={styles.audioLevelContainer}>
          <div
            className={styles.audioLevelBar}
            style={{ width: `${audioLevel}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default PipecatWebSocketClient;
