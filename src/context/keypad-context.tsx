import React, { createContext, useCallback, useContext, useState } from 'react';

interface KeypadContextType {
  isKeypadVisible: boolean;
  dialedNumber: string;
  openKeypad: () => void;
  closeKeypad: () => void;
  toggleKeypad: () => void;
  pressDigit: (digit: string) => void;
  deleteDigit: () => void;
  clearNumber: () => void;
  setDialedNumber: (num: string) => void;
}

const KeypadContext = createContext<KeypadContextType | null>(null);

export function KeypadProvider({ children }: { children: React.ReactNode }) {
  const [isKeypadVisible, setIsKeypadVisible] = useState(false);
  const [dialedNumber, setDialedNumber] = useState('');

  const openKeypad = useCallback(() => {
    setIsKeypadVisible(true);
  }, []);

  const closeKeypad = useCallback(() => {
    setIsKeypadVisible(false);
  }, []);

  const toggleKeypad = useCallback(() => {
    setIsKeypadVisible((prev) => !prev);
  }, []);

  const pressDigit = useCallback((digit: string) => {
    setDialedNumber((prev) => {
      // Prevent unreasonably long numbers
      if (prev.length >= 20) return prev;
      return prev + digit;
    });
  }, []);

  const deleteDigit = useCallback(() => {
    setDialedNumber((prev) => prev.slice(0, -1));
  }, []);

  const clearNumber = useCallback(() => {
    setDialedNumber('');
  }, []);

  return (
    <KeypadContext.Provider
      value={{
        isKeypadVisible,
        dialedNumber,
        openKeypad,
        closeKeypad,
        toggleKeypad,
        pressDigit,
        deleteDigit,
        clearNumber,
        setDialedNumber,
      }}>
      {children}
    </KeypadContext.Provider>
  );
}

export function useKeypad() {
  const context = useContext(KeypadContext);
  if (!context) {
    throw new Error('useKeypad must be used within a KeypadProvider');
  }
  return context;
}

