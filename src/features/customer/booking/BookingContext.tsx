import React, {createContext, useCallback, useContext, useState} from "react";
import type {BookingAppointment} from "../../../domain/models/BookingAppointment";
import type {Store} from "../../../domain/models/Store";

interface BookingContextValue {
  selectedStore: Store | null;
  appointments: BookingAppointment[];
  pendingPartyName: string | null;
  pendingDate: string | null;
  pendingTimeSlot: string | null;
  setSelectedStore: (store: Store | null) => void;
  addAppointment: (apt: BookingAppointment) => void;
  beginChainedBooking: (partyName: string | null, date: string, timeSlot: string) => void;
  clearChainedBooking: () => void;
  removeAppointmentAt: (index: number) => void;
  applyRewardAt: (index: number) => void;
  clearCart: () => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({children}: {children: React.ReactNode}) {
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [appointments, setAppointments] = useState<BookingAppointment[]>([]);
  const [pendingPartyName, setPendingPartyName] = useState<string | null>(null);
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [pendingTimeSlot, setPendingTimeSlot] = useState<string | null>(null);

  const addAppointment = useCallback((apt: BookingAppointment) => {
    setAppointments((prev) => [...prev, apt]);
  }, []);

  const beginChainedBooking = useCallback((partyName: string | null, date: string, timeSlot: string) => {
    setPendingPartyName(partyName);
    setPendingDate(date);
    setPendingTimeSlot(timeSlot);
  }, []);

  const clearChainedBooking = useCallback(() => {
    setPendingPartyName(null);
    setPendingDate(null);
    setPendingTimeSlot(null);
  }, []);

  const removeAppointmentAt = useCallback((index: number) => {
    setAppointments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const applyRewardAt = useCallback((index: number) => {
    setAppointments((prev) =>
      prev.map((apt, i) => (i === index ? {...apt, priceCents: 0} : apt))
    );
  }, []);

  const clearCart = useCallback(() => {
    setAppointments([]);
    setSelectedStore(null);
    clearChainedBooking();
  }, [clearChainedBooking]);

  return (
    <BookingContext.Provider
      value={{
        selectedStore,
        appointments,
        pendingPartyName,
        pendingDate,
        pendingTimeSlot,
        setSelectedStore,
        addAppointment,
        beginChainedBooking,
        clearChainedBooking,
        removeAppointmentAt,
        applyRewardAt,
        clearCart,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}
