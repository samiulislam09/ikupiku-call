import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    GestureResponderEvent,
    NativeScrollEvent,
    NativeSyntheticEvent,
    PanResponder,
    Platform,
} from 'react-native';

interface UseSwipeDownToDismissOptions {
  onClose: () => void;
  visible?: boolean;
  dismissThreshold?: number;
}

export function useSwipeDownToDismiss({
  onClose,
  visible = true,
  dismissThreshold = 50,
}: UseSwipeDownToDismissOptions) {
  const screenHeight = Dimensions.get('window').height || 850;
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const [isDragging, setIsDragging] = useState(false);
  const scrollYRef = useRef(0);
  const isDismissing = useRef(false);

  // Direct touch & pointer tracking
  const startY = useRef(0);
  const startX = useRef(0);
  const currentY = useRef(0);
  const draggingActive = useRef(false);

  // Smooth entrance when modal becomes visible
  useEffect(() => {
    if (visible) {
      isDismissing.current = false;
      draggingActive.current = false;
      setIsDragging(false);
      scrollYRef.current = 0;

      // Start below screen and animate up smoothly
      translateY.setValue(screenHeight);
      Animated.spring(translateY, {
        toValue: 0,
        tension: 65,
        friction: 9,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      translateY.setValue(screenHeight);
      isDismissing.current = false;
    }
  }, [visible, screenHeight, translateY]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = Math.max(0, e.nativeEvent.contentOffset.y);
  }, []);

  const dismissModal = useCallback(() => {
    if (isDismissing.current) return;
    isDismissing.current = true;
    setIsDragging(false);
    draggingActive.current = false;

    Animated.timing(translateY, {
      toValue: screenHeight,
      duration: 180,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      onClose();
      // Keep translateY at screenHeight so:
      // 1. Zero flicker during unmount.
      // 2. Next opening starts cleanly from screenHeight.
    });
  }, [screenHeight, onClose, translateY]);

  const resetPosition = useCallback(() => {
    setIsDragging(false);
    draggingActive.current = false;
    Animated.spring(translateY, {
      toValue: 0,
      tension: 80,
      friction: 10,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [translateY]);

  // Touch handlers for mobile (iOS & Android)
  const handleTouchStart = useCallback((e: GestureResponderEvent) => {
    const pageY = e.nativeEvent.pageY;
    const pageX = e.nativeEvent.pageX;
    startY.current = pageY;
    startX.current = pageX;
    currentY.current = pageY;
    draggingActive.current = false;
  }, []);

  const handleTouchMove = useCallback((e: GestureResponderEvent) => {
    const pageY = e.nativeEvent.pageY;
    const pageX = e.nativeEvent.pageX;
    currentY.current = pageY;

    const dy = pageY - startY.current;
    const dx = pageX - startX.current;

    // Trigger downward swipe when at the top of content
    const isAtTop = scrollYRef.current <= 2;
    const isDownward = dy > 6;
    const isVertical = Math.abs(dy) > Math.abs(dx) * 1.1;

    if (isAtTop && isDownward && isVertical) {
      if (!draggingActive.current) {
        draggingActive.current = true;
        setIsDragging(true);
      }
      translateY.setValue(dy);
    } else if (draggingActive.current && dy <= 0) {
      translateY.setValue(0);
    }
  }, [translateY]);

  const handleTouchEnd = useCallback(() => {
    if (draggingActive.current) {
      const dy = currentY.current - startY.current;
      draggingActive.current = false;
      setIsDragging(false);

      if (dy > dismissThreshold) {
        dismissModal();
      } else {
        resetPosition();
      }
    }
  }, [dismissThreshold, dismissModal, resetPosition]);

  // Pointer handlers for Web (mouse drag & touch)
  const handlePointerDown = useCallback((e: any) => {
    if (Platform.OS !== 'web') return;
    const clientY = e.nativeEvent.clientY || e.nativeEvent.pageY || 0;
    const clientX = e.nativeEvent.clientX || e.nativeEvent.pageX || 0;
    startY.current = clientY;
    startX.current = clientX;
    currentY.current = clientY;
    draggingActive.current = false;
  }, []);

  const handlePointerMove = useCallback((e: any) => {
    if (Platform.OS !== 'web') return;
    // For mouse, ensure primary button is down
    if (e.nativeEvent.pointerType === 'mouse' && e.nativeEvent.buttons !== 1) {
      if (draggingActive.current) {
        handlePointerUp();
      }
      return;
    }

    const clientY = e.nativeEvent.clientY || e.nativeEvent.pageY || 0;
    const clientX = e.nativeEvent.clientX || e.nativeEvent.pageX || 0;
    currentY.current = clientY;

    const dy = clientY - startY.current;
    const dx = clientX - startX.current;

    const isAtTop = scrollYRef.current <= 2;
    const isDownward = dy > 6;
    const isVertical = Math.abs(dy) > Math.abs(dx) * 1.1;

    if (isAtTop && isDownward && isVertical) {
      if (!draggingActive.current) {
        draggingActive.current = true;
        setIsDragging(true);
      }
      translateY.setValue(dy);
    }
  }, [translateY]);

  const handlePointerUp = useCallback(() => {
    if (Platform.OS !== 'web') return;
    if (draggingActive.current) {
      const dy = currentY.current - startY.current;
      draggingActive.current = false;
      setIsDragging(false);

      if (dy > dismissThreshold) {
        dismissModal();
      } else {
        resetPosition();
      }
    }
  }, [dismissThreshold, dismissModal, resetPosition]);

  // Dedicated PanResponder for the top grabber pill: claims on start without capturing children
  const grabberPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderGrant: () => {
        setIsDragging(true);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        } else {
          translateY.setValue(0);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        setIsDragging(false);
        if (gestureState.dy > dismissThreshold || (gestureState.dy > 20 && gestureState.vy > 0.2)) {
          dismissModal();
        } else {
          resetPosition();
        }
      },
      onPanResponderTerminate: (_, gestureState) => {
        setIsDragging(false);
        if (gestureState.dy > dismissThreshold) {
          dismissModal();
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const scale = translateY.interpolate({
    inputRange: [0, 400],
    outputRange: [1, 0.96],
    extrapolate: 'clamp',
  });

  const backdropOpacity = translateY.interpolate({
    inputRange: [0, 300],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return {
    grabberPanHandlers: grabberPanResponder.panHandlers,
    panHandlers: grabberPanResponder.panHandlers,
    containerTouchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    },
    onScroll,
    translateY,
    scale,
    backdropOpacity,
    animatedStyle: {
      transform: [{ translateY }, { scale }],
    },
    isDragging,
    dismissModal,
  };
}
