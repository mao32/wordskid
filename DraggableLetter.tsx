import React, { useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';

interface DraggableLetterProps {
  letter: string;
  disabled: boolean;
  onDragRelease: (letter: string, moveX: number, moveY: number, resetPosition: (instant?: boolean) => void) => void;
  onPressIn?: () => void;
}

export default function DraggableLetter({ letter, disabled, onDragRelease, onPressIn }: DraggableLetterProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const [isDragging, setIsDragging] = useState(false);
  
  const propsRef = useRef({ letter, disabled, onDragRelease, onPressIn });
  propsRef.current = { letter, disabled, onDragRelease, onPressIn };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !propsRef.current.disabled,
      onMoveShouldSetPanResponder: () => !propsRef.current.disabled,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
        setIsDragging(true);
        if (propsRef.current.onPressIn) propsRef.current.onPressIn();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gesture) => {
        setIsDragging(false);
        pan.flattenOffset();

        const resetPosition = (instant = false) => {
          if (instant) {
            pan.setValue({ x: 0, y: 0 });
          } else {
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              friction: 5,
              useNativeDriver: false,
            }).start();
          }
        };

        // Call the parent to determine if it was dropped in a valid zone
        propsRef.current.onDragRelease(propsRef.current.letter, gesture.moveX, gesture.moveY, resetPosition);
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.keyWrapper,
        { transform: pan.getTranslateTransform(), zIndex: isDragging ? 100 : 1 },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={[styles.key, disabled && styles.keyDisabled, isDragging && styles.keyDragging]}>
        <Text style={styles.keyText}>{letter}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  keyWrapper: {
    margin: 5,
  },
  key: {
    width: 70,
    height: 70,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  keyDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  keyDragging: {
    transform: [{ scale: 1.1 }],
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  keyText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
});
