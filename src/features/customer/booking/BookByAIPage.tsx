import {useEffect, useMemo, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {
  FunctionsClient,
  type BookByAIAppointmentPayload,
} from "../../../data/functions/FunctionsClient";
import {useBooking} from "./BookingContext";

const swabiIntro =
  "Hi there. My name is Swabi. You can book your appointment with me. " +
  "Just tell me the service you want and date and time along with a " +
  "provider name if you prefer someone.";

type Message = {role: "Swabi" | "Customer"; text: string};
type UserLocation = {latitude: number; longitude: number};

type SpeechRecognitionCtor = new () => SpeechRecognition;

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

function speak(text: string): Promise<void> {
  const clean = text.trim();
  if (!clean || !("speechSynthesis" in window)) return Promise.resolve();
  window.speechSynthesis.cancel();
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

function listenOnce(): Promise<string> {
  const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Recognition) {
    return Promise.reject(
      new Error("Speech recognition is not supported in this browser.")
    );
  }
  return new Promise((resolve, reject) => {
    const recognition = new Recognition();
    let finalText = "";
    let interimText = "";
    let silenceTimer: number | undefined;
    let settled = false;

    const finish = (text: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(silenceTimer);
      recognition.onend = null;
      recognition.stop();
      resolve(text.trim());
    };

    const scheduleFinish = () => {
      window.clearTimeout(silenceTimer);
      silenceTimer = window.setTimeout(() => {
        finish(finalText || interimText);
      }, 2200);
    };

    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) finalText += ` ${transcript}`;
        else interimText += ` ${transcript}`;
      }
      if ((finalText || interimText).trim()) scheduleFinish();
    };
    recognition.onerror = (event) => {
      if (!settled) reject(new Error(event.error || "Speech failed."));
    };
    recognition.onend = () => {
      if (!settled && (finalText || interimText).trim()) {
        finish(finalText || interimText);
      }
    };
    recognition.start();
  });
}

function getUserLocation(): Promise<UserLocation | null> {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => resolve(null),
      {enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 5000}
    );
  });
}

function toAppointment(payload: BookByAIAppointmentPayload) {
  return {
    storeId: payload.storeId,
    storeName: payload.storeName,
    serviceId: payload.serviceId,
    serviceTitle: payload.serviceTitle,
    serviceIcon: "",
    date: payload.date,
    timeSlot: payload.timeSlot,
    durationMinutes: payload.durationMinutes,
    employeeId: payload.employeeId || null,
    employeeName: payload.employeeName || "Any Provider",
    priceCents: payload.priceCents,
    originalPriceCents: payload.priceCents,
    rewardsPoints: payload.rewardsPoints,
    partyName: null,
    isSpecialRequest: payload.isSpecialRequest === true,
  };
}

export function BookByAIPage() {
  const navigate = useNavigate();
  const {setSelectedStore, addAppointment, clearCart} = useBooking();
  const [messages, setMessages] = useState<Message[]>([
    {role: "Swabi", text: swabiIntro},
  ]);
  const [started, setStarted] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);
  const transcriptRef = useRef<HTMLTextAreaElement | null>(null);

  const transcript = useMemo(
    () => messages.map((m) => `${m.role}: ${m.text}`).join("\n\n"),
    [messages]
  );

  useEffect(() => {
    void speak(swabiIntro);
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    const transcriptEl = transcriptRef.current;
    if (!transcriptEl) return;
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  }, [transcript]);

  async function startSession() {
    if (runningRef.current) return;
    runningRef.current = true;
    setStarted(true);
    setWorking(true);
    setError(null);
    try {
      const userLocation = await getUserLocation();
      let nextMessages = messages;
      while (runningRef.current) {
        const spoken = await listenOnce();
        if (!spoken) continue;
        nextMessages = [...nextMessages, {role: "Customer", text: spoken}];
        setMessages(nextMessages);
        const response = await FunctionsClient.bookByAIConversation(
          nextMessages.map((m) => ({role: m.role, content: m.text})),
          userLocation
        );
        const displayText = [response.reply, response.optionsText]
          .map((part) => part?.trim() ?? "")
          .filter(Boolean)
          .join("\n\n");
        nextMessages = [...nextMessages, {role: "Swabi", text: displayText}];
        setMessages(nextMessages);
        await speak(response.reply);
        if (response.appointment) {
          clearCart();
          setSelectedStore({
            id: response.appointment.storeId,
            storeAdminId: response.appointment.storeId,
            businessName: response.appointment.storeName,
            address: response.appointment.storeAddress ?? "",
          });
          addAppointment(toAppointment(response.appointment));
          runningRef.current = false;
          navigate("/customer/booking/summary");
          break;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Book by AI failed.");
      runningRef.current = false;
      setStarted(false);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="nnc-dashboard">
      <AppBar title="Book by AI" backTo="/customer" />
      <main className="nnc-main">
        <section className="nnc-section">
          <textarea
            ref={transcriptRef}
            className="form-input"
            value={transcript}
            readOnly
            rows={18}
            style={{width: "100%", resize: "vertical", lineHeight: 1.5}}
            aria-label="AI conversation"
          />
          {error && (
            <p className="loading-text" style={{color: "#b91c1c"}}>
              {error}
            </p>
          )}
          <button
            className="btn--primary-full"
            onClick={() => void startSession()}
            disabled={started || working}
            style={{marginTop: "1rem"}}
          >
            {started ? "Swabi is listening..." : "Ask the AI"}
          </button>
        </section>
      </main>
    </div>
  );
}
