import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    Platform,
} from 'react-native';

interface UseSwipeDownToDismissOptions {
  onClose: () => void;
  visible?: boolean;
  dismissThreshold?: number;
  velocityThreshold?: number;
}

export function useSwipeDownToDismiss({
  onClose,
  visible = true,
  dismissThreshold = 100,
  velocityThreshold = 0.5,
}: UseSwipeDownToDismissOptions) {
  const screenHeight = Dimensions.get('window').height;
  const translateY = useRef(new Animated.Value(0)).current;
  const [isDragging, setIsDragging] = useState(false);

  // Reset position whenever visibility changes
  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
      setIsDragging(false);
    }
  }, [visible, translateY]);

  const dismissModal = () => {
    Animated.timing(translateY, {
      toValue: screenHeight,
      duration: 200,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      onClose();
      setTimeout(() => {
        translateY.setValue(0);
      }, 150);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Capture downward movement when vertical movement dominates
        return (
          gestureState.dy > 8 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.2
        );
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        setIsDragging(true);
      },
      onPanResponderMove: (_, gestureState) => {
        translateY.setValue(Math.max(0, gestureState.dy));
      },
      onPanResponderRelease: (_, gestureState) => {
        setIsDragging(false);
        const shouldDismiss =
          gestureState.dy > dismissThreshold ||
          (gestureState.dy > 40 && gestureState.vy > velocityThreshold);

        if (shouldDismiss) {
          dismissModal();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            tension: 65,
            friction: 9,
            useNativeDriver: Platform.OS !== 'web',
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
        Animated.spring(translateY, {
          toValue: 0,
          tension: 65,
          friction: 9,
          useNativeDriver: Platform.OS !== 'web',
        }).start();
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
    panHandlers: panResponder.panHandlers,
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

