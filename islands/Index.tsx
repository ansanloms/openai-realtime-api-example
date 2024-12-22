// @see https://platform.openai.com/docs/guides/realtime-webrtc

import { signal } from "@preact/signals";

const pc = signal<RTCPeerConnection | null>(null);
const dc = signal<RTCDataChannel | null>(null);
const logs = signal<{
  role: "user" | "assistant";
  message: string;
}[]>([]);

const getEphemeralKey = async () => {
  const params = new URLSearchParams();
  params.set("model", "gpt-4o-realtime-preview-2024-12-17");
  params.set("voice", "ash");
  params.set(
    "instructions",
    "あなたは快活な AI アシスタントです。敬語は避けてフランクに話してください。",
  );

  const response = await fetch(`/api/session?${params}`);
  const data = await response.json();

  return String(data.client_secret.value);
};

const connect = async () => {
  if (!pc.value) {
    return;
  }

  const offer = await pc.value.createOffer();
  await pc.value.setLocalDescription(offer);

  const baseUrl = "https://api.openai.com/v1/realtime";
  const model = "gpt-4o-realtime-preview-2024-12-17";
  const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
    method: "POST",
    body: offer.sdp,
    headers: {
      Authorization: `Bearer ${await getEphemeralKey()}`,
      "Content-Type": "application/sdp",
    },
  });

  await pc.value.setRemoteDescription({
    type: "answer",
    sdp: await sdpResponse.text(),
  });
};

const start = async () => {
  // WebRTC ピアコネクションの作成。
  pc.value = new RTCPeerConnection();

  // マイクでおれの声を録音する。
  const ms = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });
  pc.value.addTrack(ms.getTracks()[0]);

  // AI がしゃべったのを再生する。
  const audioEl = document.createElement("audio");
  audioEl.autoplay = true;
  pc.value.ontrack = (e) => {
    audioEl.srcObject = e.streams[0];
  };

  // データチャネルの作成。
  dc.value = pc.value.createDataChannel("oai-events");

  // イベント処理。
  dc.value.addEventListener("message", (e) => {
    console.log(e);
    const event = JSON.parse(e.data);

    if (event.type === "response.audio_transcript.done") {
      logs.value = [...logs.value, {
        role: "assistant",
        message: event.transcript,
      }];
    }

    if (
      event.type === "conversation.item.input_audio_transcription.completed"
    ) {
      logs.value = [...logs.value, { role: "user", message: event.transcript }];
    }
  });

  await connect();

  console.log("started.");
};

const stop = () => {
  dc.value?.close();
  dc.value = null;
  pc.value?.close();
  pc.value = null;
  logs.value = [];

  console.log("stopped.");
};

export default function Index() {
  return (
    <div>
      <button onClick={start}>start</button>
      <button onClick={stop}>stop</button>
      <ul>
        {logs.value.map(({ role, message }) => <li>{role}: {message}</li>)}
      </ul>
    </div>
  );
}
