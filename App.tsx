import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Volume2, Delete, Lightbulb } from 'lucide-react-native';
import DraggableLetter from './DraggableLetter';

const LEVELS = [
  { word: "GATTO", emoji: "🐱", syllables: ["GAT", "TO"] },
  { word: "CANE", emoji: "🐶", syllables: ["CA", "NE"] },
  { word: "SOLE", emoji: "☀️", syllables: ["SO", "LE"] },
  { word: "MELA", emoji: "🍎", syllables: ["ME", "LA"] },
  { word: "LUNA", emoji: "🌙", syllables: ["LU", "NA"] },
];

const shuffleArray = (array: string[]) => {
  let newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// Funzione helper per ottenere la sillaba corrente
const getCurrentSyllable = (word: string, syllables: string[], currentIndex: number) => {
  let lengthSoFar = 0;
  for (const syl of syllables) {
    if (currentIndex >= lengthSoFar && currentIndex < lengthSoFar + syl.length) {
      return syl;
    }
    lengthSoFar += syl.length;
  }
  return word[currentIndex] || word;
};

type UserInputData = {
  letter: string;
  status: 'correct' | 'wrong' | 'pending';
  keyboardIndex?: number;
};

export default function App() {
  const [levelIndex, setLevelIndex] = useState(0);
  const [userInput, setUserInput] = useState<(UserInputData | null)[]>([]);
  const [shuffledLetters, setShuffledLetters] = useState<string[]>([]);
  const [usedIndices, setUsedIndices] = useState<number[]>([]);
  const [isWon, setIsWon] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const [soundSuccess, setSoundSuccess] = useState<Audio.Sound>();
  const [soundWrong, setSoundWrong] = useState<Audio.Sound>();

  const currentLevel = LEVELS[levelIndex];

  // Caricamento dei suoni
  useEffect(() => {
    async function loadSounds() {
      try {
        const { sound: s1 } = await Audio.Sound.createAsync(require('./assets/success.wav'));
        const { sound: s2 } = await Audio.Sound.createAsync(require('./assets/wrong.wav'));
        setSoundSuccess(s1);
        setSoundWrong(s2);
      } catch (error) {
        console.log("Errore caricamento suoni:", error);
      }
    }
    loadSounds();
    return () => {
      soundSuccess?.unloadAsync();
      soundWrong?.unloadAsync();
    };
  }, []);

  const playSuccessSound = async () => {
    try { await soundSuccess?.replayAsync(); } catch (e) {}
  };

  const playWrongSound = async () => {
    try { await soundWrong?.replayAsync(); } catch (e) {}
  };

  // Funzione unificata per la voce per garantire lo stesso tono
  const speakVoice = (text: string, pitch = 1.3, rate = 0.8) => {
    Speech.speak(text.toLowerCase(), { language: 'it-IT', pitch, rate });
  };

  const speakScandito = (word: string, finalMessage: string, onComplete: () => void) => {
    const letters = word.split('');
    letters.forEach((letter) => {
      Speech.speak(letter.toLowerCase(), {
        language: 'it-IT',
        pitch: 1.5,
        rate: 0.5,
      });
    });

    const spellDuration = letters.length * 600;

    setTimeout(() => {
      Speech.speak(word.toLowerCase(), { language: 'it-IT', pitch: 1.4, rate: 0.8 });
    }, spellDuration + 600);

    setTimeout(() => {
      Speech.speak(finalMessage.toLowerCase(), { language: 'it-IT', pitch: 1.6, rate: 0.9 });
    }, spellDuration + 2000);

    setTimeout(() => {
      onComplete();
    }, spellDuration + 4000);
  };

  const initLevel = useCallback(() => {
    const letters = currentLevel.word.split('');
    setUserInput(new Array(letters.length).fill(null));
    setIsWon(false);
    setConsecutiveErrors(0);
    setIsProcessing(false);
    setShuffledLetters(shuffleArray(letters));
    setUsedIndices([]);
    
    speakVoice(currentLevel.word, 1.3, 0.85);
  }, [currentLevel]);

  useEffect(() => {
    initLevel();
  }, [initLevel]);

  // Controllo Vittoria
  useEffect(() => {
    if (userInput.length === currentLevel.word.length && userInput.every(x => x && x.status === 'correct')) {
      if (!isWon) {
        setIsWon(true);
        setTimeout(() => {
          speakScandito(currentLevel.word, 'Bravissimo!', () => {
            if (levelIndex < LEVELS.length - 1) {
              setLevelIndex(levelIndex + 1);
            } else {
              setLevelIndex(0);
            }
          });
        }, 800);
      }
    }
  }, [userInput, currentLevel.word, isWon, levelIndex]);

  const handleSpeak = () => {
    speakVoice(currentLevel.word, 1.3, 0.85);
  };

  const handleHint = () => {
    if (!isWon) {
      const firstNullIndex = userInput.findIndex(x => x === null);
      if (firstNullIndex !== -1) {
        const syllable = getCurrentSyllable(currentLevel.word, currentLevel.syllables, firstNullIndex);
        speakVoice(syllable, 1.4, 0.7);
      }
    }
  };

  const handleLetterDrop = (letter: string, keyboardIndex: number, moveX: number, moveY: number, resetPosition: () => void) => {
    if (!isWon && !isProcessing) {
      const screenHeight = Dimensions.get('window').height;
      const screenWidth = Dimensions.get('window').width;
      const dropZoneBottom = screenHeight * 0.65;
      
      if (moveY > dropZoneBottom || moveY === 0) {
        resetPosition();
        return;
      }

      const wordLen = currentLevel.word.length;
      const totalWidth = wordLen * 60 + (wordLen - 1) * 12; // box: 60, gap: 12
      const startX = (screenWidth - totalWidth) / 2;
      
      let droppedIndex = -1;
      for (let i = 0; i < wordLen; i++) {
        const boxLeft = startX + i * 72;
        const boxRight = boxLeft + 60;
        if (moveX >= boxLeft - 20 && moveX <= boxRight + 20) {
          droppedIndex = i;
          break;
        }
      }

      if (droppedIndex === -1 || userInput[droppedIndex] !== null) {
        resetPosition();
        return;
      }

      setIsProcessing(true);
      const targetLetter = currentLevel.word[droppedIndex];
      const isCorrect = letter === targetLetter;
      
      const newInput = [...userInput];
      newInput[droppedIndex] = { letter, status: isCorrect ? 'correct' : 'wrong', keyboardIndex };
      setUserInput(newInput);
      setUsedIndices(prev => [...prev, keyboardIndex]);
      
      speakVoice(letter, 1.4, 1.0);
      
      if (isCorrect) {
        playSuccessSound();
        setConsecutiveErrors(0);
        setIsProcessing(false);
      } else {
        playWrongSound();
        const newErrors = consecutiveErrors + 1;
        setConsecutiveErrors(newErrors);

        setTimeout(() => {
          const syllable = getCurrentSyllable(currentLevel.word, currentLevel.syllables, droppedIndex);
          speakVoice(syllable, 1.4, 0.7);
        }, 800);

        if (newErrors >= 3) {
          setTimeout(() => {
            setUserInput(prev => {
              const wrongItem = prev[droppedIndex];
              let correctIndex: number | undefined;

              setUsedIndices(u => {
                let newU = [...u];
                if (wrongItem && wrongItem.keyboardIndex !== undefined) {
                  newU = newU.filter(i => i !== wrongItem.keyboardIndex);
                }
                const foundIdx = shuffledLetters.findIndex((l, idx) => l === targetLetter && !newU.includes(idx));
                if (foundIdx !== -1) {
                  correctIndex = foundIdx;
                  newU.push(foundIdx);
                }
                return newU;
              });

              const copy = [...prev];
              copy[droppedIndex] = { letter: targetLetter, status: 'correct', keyboardIndex: correctIndex };
              return copy;
            });
            playSuccessSound();
            speakVoice(targetLetter, 1.4, 1.0);
            setConsecutiveErrors(0);
            setIsProcessing(false);
          }, 1800);
        } else {
          setTimeout(() => {
            setUserInput(prev => {
              const copy = [...prev];
              const wrongItem = copy[droppedIndex];
              if (wrongItem && wrongItem.status === 'wrong') {
                if (wrongItem.keyboardIndex !== undefined) {
                  setUsedIndices(u => u.filter(i => i !== wrongItem.keyboardIndex));
                }
                copy[droppedIndex] = null;
              }
              return copy;
            });
            setIsProcessing(false);
          }, 1500);
        }
      }
    } else {
      resetPosition();
    }
  };

  const handleDelete = () => {
    if (!isWon && userInput.some(x => x !== null)) {
      const lastIndex = userInput.map((x, i) => x ? i : -1).filter(i => i !== -1).pop();
      if (lastIndex !== undefined) {
        const lastItem = userInput[lastIndex];
        if (lastItem && lastItem.keyboardIndex !== undefined) {
          setUsedIndices(prev => prev.filter(i => i !== lastItem.keyboardIndex));
        }
        const copy = [...userInput];
        copy[lastIndex] = null;
        setUserInput(copy);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>WordsKid</Text>
        <TouchableOpacity style={styles.hintButton} onPress={handleHint}>
          <Lightbulb size={28} color="#FF9800" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.imageContainer}>
        <Text style={styles.emoji}>{currentLevel.emoji}</Text>
        <TouchableOpacity style={styles.speakerButton} onPress={handleSpeak}>
          <Volume2 size={40} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.boxesContainer}>
        {Array.from({ length: currentLevel.word.length }).map((_, index) => {
          const inputItem = userInput[index];
          let boxStateStyle = {};
          if (inputItem) {
            boxStateStyle = inputItem.status === 'correct' ? styles.boxCorrect : styles.boxWrong;
          }

          return (
            <View 
              key={index} 
              style={[
                styles.box, 
                boxStateStyle,
                isWon && styles.boxWon
              ]}
            >
              <Text style={[
                styles.boxText,
                inputItem?.status === 'wrong' && styles.boxTextWrong
              ]}>
                {inputItem?.letter || ''}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.keyboard}>
        {shuffledLetters.map((letter, index) => {
          if (usedIndices.includes(index)) {
            return <View key={index} style={[styles.key, { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 }]} />;
          }

          return (
            <DraggableLetter
              key={index}
              letter={letter}
              disabled={isWon}
              onDragRelease={(l, mx, my, reset) => handleLetterDrop(l, index, mx, my, reset)}
              onPressIn={() => speakVoice(letter, 1.4, 1.0)}
            />
          );
        })}
        
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
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 20,
    position: 'relative',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
  },
  hintButton: {
    position: 'absolute',
    right: 30,
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 50,
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
    marginBottom: 50,
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
  boxCorrect: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  boxWrong: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
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
  boxTextWrong: {
    color: '#F44336',
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
    marginTop: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  }
});
