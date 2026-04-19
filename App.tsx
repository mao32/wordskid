import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import * as Speech from 'expo-speech';
import { Volume2, Delete } from 'lucide-react-native';

const LEVELS = [
  { word: "GATTO", emoji: "🐱" },
  { word: "CANE", emoji: "🐶" },
  { word: "SOLE", emoji: "☀️" },
  { word: "MELA", emoji: "🍎" },
  { word: "LUNA", emoji: "🌙" },
];

const shuffleArray = (array: string[]) => {
  let newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

export default function App() {
  const [levelIndex, setLevelIndex] = useState(0);
  const [userInput, setUserInput] = useState<string[]>([]);
  const [shuffledLetters, setShuffledLetters] = useState<string[]>([]);
  const [isWon, setIsWon] = useState(false);

  const currentLevel = LEVELS[levelIndex];

  const initLevel = useCallback(() => {
    setUserInput([]);
    setIsWon(false);
    const letters = currentLevel.word.split('');
    setShuffledLetters(shuffleArray(letters));
    
    // Pronuncia la parola appena caricato il livello
    Speech.speak(currentLevel.word, { language: 'it-IT', rate: 0.8 });
  }, [currentLevel]);

  useEffect(() => {
    initLevel();
  }, [initLevel]);

  const handleSpeak = () => {
    Speech.speak(currentLevel.word, { language: 'it-IT', rate: 0.8 });
  };

  const handleLetterPress = (letter: string) => {
    if (userInput.length < currentLevel.word.length && !isWon) {
      const newInput = [...userInput, letter];
      setUserInput(newInput);
      
      // Pronuncia la lettera toccata (feedback)
      Speech.speak(letter, { language: 'it-IT', rate: 1.0 });

      // Controllo vittoria
      if (newInput.join('') === currentLevel.word) {
        setIsWon(true);
        Speech.speak("Bravissimo!", { language: 'it-IT', rate: 1.0 });
        setTimeout(() => {
          if (levelIndex < LEVELS.length - 1) {
            setLevelIndex(levelIndex + 1);
          } else {
            setLevelIndex(0); // Ricomincia dal primo per ora
          }
        }, 2500);
      } else if (newInput.length === currentLevel.word.length) {
        // Ha riempito tutte le caselle ma la parola è sbagliata
        Speech.speak("Riprova", { language: 'it-IT', rate: 1.0 });
      }
    }
  };

  const handleDelete = () => {
    if (userInput.length > 0 && !isWon) {
      setUserInput(userInput.slice(0, -1));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>WordsKid</Text>
      
      <View style={styles.imageContainer}>
        <Text style={styles.emoji}>{currentLevel.emoji}</Text>
        <TouchableOpacity style={styles.speakerButton} onPress={handleSpeak}>
          <Volume2 size={40} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.boxesContainer}>
        {Array.from({ length: currentLevel.word.length }).map((_, index) => (
          <View 
            key={index} 
            style={[
              styles.box, 
              isWon && styles.boxWon,
              userInput.length > index && styles.boxFilled
            ]}
          >
            <Text style={styles.boxText}>{userInput[index] || ''}</Text>
          </View>
        ))}
      </View>

      <View style={styles.keyboard}>
        {shuffledLetters.map((letter, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.key} 
            onPress={() => handleLetterPress(letter)}
            disabled={isWon}
          >
            <Text style={styles.keyText}>{letter}</Text>
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity style={styles.deleteKey} onPress={handleDelete} disabled={isWon}>
          <Delete size={32} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {isWon && <Text style={styles.winText}>Esatto!</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    paddingTop: 80,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 40,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
    position: 'relative',
  },
  emoji: {
    fontSize: 140,
  },
  speakerButton: {
    position: 'absolute',
    right: -70,
    bottom: 20,
    backgroundColor: '#4DA8DA',
    padding: 16,
    borderRadius: 40,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  boxesContainer: {
    flexDirection: 'row',
    marginBottom: 60,
    gap: 12,
  },
  box: {
    width: 60,
    height: 70,
    borderWidth: 4,
    borderColor: '#D0E1F9',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  boxFilled: {
    borderColor: '#4DA8DA',
  },
  boxWon: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  boxText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#333',
  },
  keyboard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
    paddingHorizontal: 20,
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
  keyText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  deleteKey: {
    width: 70,
    height: 70,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  winText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 40,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  }
});
