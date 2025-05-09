import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import PokemonGrid from './PokemonGrid';
import Navbar from './Navbar';
import GameOverScreen from './GameOverScreen';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './GameScreen.css';
import pokemonData from '../data/pokemon.json';
import { scrollToTop } from '../utils/scrollUtils';

const LoadingScreen = () => (
  <div className="loading-container">
    <div className="loading-content">
      <div className="loading-spinner"></div>
      <p>Loading game...</p>
    </div>
  </div>
);

function GameScreen({ 
  selectedGenerations, 
  selectedGameMode, 
  onExit, 
  timedRun,
  timedRunSettings, 
  limitedAnswers, 
  numberOfAnswers, 
  keepCryOnError,
  hardcoreMode,
  limitedQuestions, 
  numberOfQuestions,
  setSelectedGenerations
}) {
  const [pokemonList, setPokemonList] = useState([]);
  const [filteredPokemonList, setFilteredPokemonList] = useState([]);
  const [shuffledPokemonList, setShuffledPokemonList] = useState([]);
  const navbarRef = useRef(null);
  const audioRef = useRef(null);
  const isAudioPlaying = useRef(false);
  const didInitialize = useRef(false);
  const shinyAudioRef = useRef(null);
  const [isGameFullyLoaded, setIsGameFullyLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameFinished, setIsGameFinished] = useState(false);
  const [failedPokemon, setFailedPokemon] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [animatingCards, setAnimatingCards] = useState(new Map());
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState((timedRunSettings.minutes * 60 + timedRunSettings.seconds) * 1000);
  const [timeGained, setTimeGained] = useState(0);
  const [timeLost, setTimeLost] = useState(0);
  const [navbarHeight, setNavbarHeight] = useState(0);
  
  const [gameStartTime, setGameStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [gameDuration, setGameDuration] = useState(0);
  
  const [allShiny, setAllShiny] = useState(false);
  const [shinyPartyActivated, setShinyPartyActivated] = useState(false);
  const [timer, setTimer] = useState(0);
  const [availablePokemonIndices, setAvailablePokemonIndices] = useState([]);
  const [isGameInitialized, setIsGameInitialized] = useState(false);
  const [gameState, setGameState] = useState({
    currentPokemon: null,
    visiblePokemon: [],
    progressCount: 0,
    correctCount: 0,
    incorrectCount: 0,
  });
  const updateInProgress = useRef(false);
  const [isGameReady, setIsGameReady] = useState(true);

  const memoizedPokemonList = useMemo(() => pokemonList, [pokemonList]);

  const resetSearch = useCallback(() => {
    if (navbarRef.current && navbarRef.current.getSearchTerm() !== '') {
      navbarRef.current.resetSearch();
      setFilteredPokemonList(pokemonList);
    }
  }, [pokemonList]);

  const showToast = (content, type) => {
    const existingToasts = document.getElementsByClassName('Toastify__toast');
    for (let i = 0; i < existingToasts.length; i++) {
      existingToasts[i].style.display = 'none';
    }

    toast.dismiss();

    toast(content, {
      position: "top-right",
      autoClose: 1000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: false,
      closeButton: false,
      onMouseEnter: toast.dismiss,
      className: `custom-toast ${type === 'success' ? 'correct-toast' : 'incorrect-toast'}`,
    });
  };

  const endGame = useCallback((addCurrentToFailed = false) => {
    if (addCurrentToFailed && gameState.currentPokemon) {
      setFailedPokemon(prev => [...prev, gameState.currentPokemon]);
    }
    setIsGameFinished(true);
    
    const currentEndTime = Date.now();
    setEndTime(currentEndTime);
    
    if (gameStartTime) {
      const duration = currentEndTime - gameStartTime;
      setGameDuration(duration);
      console.log(`Game ended. Duration: ${Math.floor(duration / 1000)} seconds`);
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setGameOver(true);
    setGameState(prevState => ({
      ...prevState,
      currentPokemon: null
    }));
  }, [gameState.currentPokemon, gameStartTime]);

  const playCurrentCry = useCallback((pokemon = gameState.currentPokemon, isAutoplay = false) => {
    const pokemonToPlay = pokemon || gameState.currentPokemon;
    
    if (!pokemonToPlay || isGameFinished) return;
    
    console.log("Playing cry for:", pokemonToPlay.name, "isPlaying:", isPlaying, "isAudioPlaying:", isAudioPlaying.current);
    
    if (audioRef.current) {
      console.log("Stopping existing audio");
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    
    if (isAudioPlaying.current) {
      console.log("Already playing audio, clearing flags first");
    }
    
    isAudioPlaying.current = false;
    setIsPlaying(false);
    
    const playAudio = () => {
      isAudioPlaying.current = true;
      setIsPlaying(true);
      if (isAutoplay) {
        setIsAutoPlaying(true);
      }
      
      const audioPath = `${process.env.PUBLIC_URL}/media/cries/${pokemonToPlay.id}.mp3`;
      console.log("Playing audio:", audioPath);
      
      const audio = new Audio(audioPath);
      audioRef.current = audio;
      
      const handleEnded = () => {
        console.log("Audio ended");
        setIsPlaying(false);
        isAudioPlaying.current = false;
        if (isAutoplay) {
          setIsAutoPlaying(false);
        }
        audio.removeEventListener('ended', handleEnded);
        audio.src = '';
      };
      
      audio.addEventListener('ended', handleEnded);
      
      return audio.play().catch(error => {
        console.error('Error playing audio:', error);
        setIsPlaying(false);
        isAudioPlaying.current = false;
        if (isAutoplay) {
          setIsAutoPlaying(false);
        }
        audio.removeEventListener('ended', handleEnded);
        audio.src = '';
      });
    };
    
    setTimeout(playAudio, 50);
  }, [gameState.currentPokemon, isGameFinished, isPlaying]);

  const getRandomPokemon = useCallback(() => {
    if (selectedGameMode === 'dontRepeatPokemon') {
      if (availablePokemonIndices.length === 0) {
        endGame();
        return null;
      }
      const randomIndex = Math.floor(Math.random() * availablePokemonIndices.length);
      const pokemonIndex = availablePokemonIndices[randomIndex];
      setAvailablePokemonIndices(prev => prev.filter((_, index) => index !== randomIndex));
      return pokemonList[pokemonIndex];
    } else {
      let randomPokemon;
      do {
        randomPokemon = pokemonList[Math.floor(Math.random() * pokemonList.length)];
      } while (randomPokemon.id === gameState.currentPokemon?.id);
      return randomPokemon;
    }
  }, [selectedGameMode, availablePokemonIndices, pokemonList, gameState.currentPokemon, endGame]);

  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const selectVisiblePokemon = useCallback((allPokemon, currentPokemon) => {
    if (!limitedAnswers || numberOfAnswers >= allPokemon.length) {
      return allPokemon;
    } else {
      const availablePokemon = allPokemon.filter(p => p.id !== currentPokemon.id);
      const randomPokemon = [];
      const usedIndices = new Set();

      while (randomPokemon.length < numberOfAnswers - 1) {
        const randomIndex = Math.floor(Math.random() * availablePokemon.length);
        if (!usedIndices.has(randomIndex)) {
          usedIndices.add(randomIndex);
          randomPokemon.push(availablePokemon[randomIndex]);
        }
      }

      return [...randomPokemon, currentPokemon].sort(() => 0.5 - Math.random());
    }
  }, [limitedAnswers, numberOfAnswers]);

  const initializeGame = useCallback(() => {
    if (isGameInitialized) return;

    console.log("Initializing game");
    
    setIsGameInitialized(true);
    
    const selectedPokemon = selectedGenerations.flatMap(genKey => {
      return pokemonData[genKey] || [];
    });
    
    setPokemonList(selectedPokemon);
    
    if (selectedPokemon.length === 0) {
      console.error("No Pokémon selected, but game initialized with generations:", selectedGenerations);
      return;
    }

    setIsGameReady(true);

    if (selectedGameMode === 'dontRepeatPokemon') {
      setAvailablePokemonIndices([...Array(selectedPokemon.length).keys()]);
    }

    let audioTriggered = false;

    requestAnimationFrame(() => {
      const shuffled = shuffleArray([...selectedPokemon]);
      setShuffledPokemonList(shuffled);

      if (shuffled.length > 0 && !audioTriggered) {
        const firstPokemon = shuffled[0];

        if (selectedGameMode === 'dontRepeatPokemon') {
          const indexToRemove = selectedPokemon.findIndex(p => p.id === firstPokemon.id);
          setAvailablePokemonIndices(prev => prev.filter(index => index !== indexToRemove));
        }

        const initialVisiblePokemon = selectVisiblePokemon(selectedPokemon, firstPokemon);

        setGameState({
          currentPokemon: firstPokemon,
          visiblePokemon: initialVisiblePokemon,
          progressCount: 1,
          correctCount: 0,
          incorrectCount: 0,
        });

        setFilteredPokemonList(initialVisiblePokemon);
        
        if (audioRef.current) {
          console.log("Stopping existing audio");
          audioRef.current.pause();
          audioRef.current.src = '';
          audioRef.current = null;
        }
        isAudioPlaying.current = false;
        
        audioTriggered = true;
        console.log("Playing first Pokémon cry:", firstPokemon.name);
        
        setIsAutoPlaying(true);
        
        const audio = new Audio(`${process.env.PUBLIC_URL}/media/cries/${firstPokemon.id}.mp3`);
        
        audio.addEventListener('canplaythrough', () => {
          playCurrentCry(firstPokemon, true);
          console.log("Game fully loaded, starting timer");
          setIsGameFullyLoaded(true);
        });
        
        audio.addEventListener('error', () => {
          console.error("Error loading first Pokémon cry, starting game anyway");
          setIsGameFullyLoaded(true);
        });
        
        audio.load();
      }
    });
  }, [selectedGenerations, selectedGameMode, selectVisiblePokemon, playCurrentCry]);

  useEffect(() => {
    if (!didInitialize.current) {
      console.log("Mounting component, starting game initialization");
      console.log("Selected generations on mount:", selectedGenerations);
      
      if (!selectedGenerations || selectedGenerations.length === 0) {
        console.error("No generations selected! Using gen1 as fallback");
        const generationsToUse = ['gen1'];
        if (typeof setSelectedGenerations === 'function') {
          setSelectedGenerations(generationsToUse);
        }
      }
      
      didInitialize.current = true;
      
      initializeGame();
    }
  }, []);

  const updateVisiblePokemon = useCallback((nextPokemon) => {
    if (updateInProgress.current) return;
    updateInProgress.current = true;

    setGameState(prevState => {
      const newProgressCount = prevState.progressCount + 1;
      
      if ((limitedQuestions && newProgressCount > numberOfQuestions) ||
          (selectedGameMode === 'dontRepeatPokemon' && newProgressCount > pokemonList.length)) {
        endGame(false);
        return prevState;
      }

      const newVisiblePokemon = selectVisiblePokemon(pokemonList, nextPokemon);
      setFilteredPokemonList(newVisiblePokemon);

      return {
        ...prevState,
        currentPokemon: nextPokemon,
        visiblePokemon: newVisiblePokemon,
        progressCount: newProgressCount,
      };
    });

    setTimeout(() => {
      updateInProgress.current = false;
    }, 0);
  }, [limitedQuestions, numberOfQuestions, selectedGameMode, pokemonList, endGame, selectVisiblePokemon]);

  const moveToNextPokemon = useCallback(() => {
    if (!isGameInitialized || updateInProgress.current) return;

    if (limitedQuestions && gameState.progressCount >= numberOfQuestions) {
      endGame();
      return;
    }

    if (selectedGameMode === 'dontRepeatPokemon' && gameState.progressCount >= pokemonList.length) {
      endGame();
      return;
    }

    const nextPokemon = getRandomPokemon();
    if (nextPokemon) {
      updateVisiblePokemon(nextPokemon);
      
      setTimeout(() => {
        if (isAudioPlaying.current) {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current = null;
          }
          isAudioPlaying.current = false;
        }
        
        setIsAutoPlaying(true);
        playCurrentCry(nextPokemon, true);
      }, 100);
    }
  }, [isGameInitialized, limitedQuestions, gameState.progressCount, numberOfQuestions, 
      selectedGameMode, pokemonList.length, getRandomPokemon, playCurrentCry, 
      endGame, updateVisiblePokemon]);

  // Add timestamp references to track time more precisely
  const startTimeRef = useRef(null);
  const endTimeRef = useRef(null);
  const lastTickRef = useRef(null);
  const remainingTimeRef = useRef(null);

  // Completely overhaul the timed run timer system to use a more precise approach
  useEffect(() => {
    // Clear any existing timer interval first
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    if (isGameFullyLoaded && timedRun && !isGameFinished) {
      console.log("Starting timed run timer with precise timing");
      
      // Initialize the timer only once at the beginning
      if (!gameStartTime) {
        const now = Date.now();
        setGameStartTime(now);
        startTimeRef.current = now;
        lastTickRef.current = now;
        
        // Calculate total milliseconds from settings
        const totalTimeMs = (timedRunSettings.minutes * 60 + timedRunSettings.seconds) * 1000;
        remainingTimeRef.current = totalTimeMs;
        
        // Set the visible time display
        setTimeLeftMs(totalTimeMs);
        
        console.log(`Game started at: ${new Date(now).toISOString()}, Initial time: ${totalTimeMs/1000}s`);
      }
      
      // Use a more precise timer that calculates actual elapsed time
      timerIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - lastTickRef.current;
        lastTickRef.current = now;
        
        // Update the remaining time
        if (remainingTimeRef.current !== null) {
          remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
          
          // Update the visible time display (rounded to whole seconds for display)
          const displayTime = Math.ceil(remainingTimeRef.current / 1000) * 1000;
          setTimeLeftMs(displayTime);
          
          // End game when time runs out
          if (remainingTimeRef.current <= 0) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
            
            // Make sure we only end the game once
            setTimeout(() => {
              if (!isGameFinished) {
                console.log("Time's up! Ending game.");
                endGame(true);
              }
            }, 0);
          }
        }
      }, 100); // Update more frequently for higher precision
      
      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };
    }
  }, [isGameFullyLoaded, timedRun, isGameFinished, endGame, timedRunSettings, gameStartTime]);

  // Create functions to adjust time with precise control
  const addTime = useCallback((milliseconds) => {
    if (remainingTimeRef.current !== null) {
      const oldTime = remainingTimeRef.current;
      remainingTimeRef.current = remainingTimeRef.current + milliseconds;
      
      // Update the visible time immediately
      const displayTime = Math.ceil(remainingTimeRef.current / 1000) * 1000;
      setTimeLeftMs(displayTime);
      
      console.log(`Added ${milliseconds/1000}s: ${oldTime/1000}s → ${remainingTimeRef.current/1000}s (display: ${displayTime/1000}s)`);
    }
  }, []);

  const subtractTime = useCallback((milliseconds) => {
    if (remainingTimeRef.current !== null) {
      const oldTime = remainingTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - milliseconds);
      
      // Update the visible time immediately
      const displayTime = Math.ceil(remainingTimeRef.current / 1000) * 1000;
      setTimeLeftMs(displayTime);
      
      const willEndGame = remainingTimeRef.current <= 0;
      console.log(`Subtracted ${milliseconds/1000}s: ${oldTime/1000}s → ${remainingTimeRef.current/1000}s (display: ${displayTime/1000}s), Will end: ${willEndGame}`);
      
      return willEndGame;
    }
    return false;
  }, []);

  // Modify handlePokemonClick to use the new precise time functions
  const handlePokemonClick = useCallback((clickedPokemon) => {
    if (!isGameInitialized || updateInProgress.current || isGameFinished) return;

    const isCorrect = clickedPokemon.id === gameState.currentPokemon.id;

    setGameState(prevState => ({
      ...prevState,
      correctCount: isCorrect ? prevState.correctCount + 1 : prevState.correctCount,
      incorrectCount: !isCorrect ? prevState.incorrectCount + 1 : prevState.incorrectCount,
    }));

    setAnimatingCards(new Map([[clickedPokemon.id, { isCorrect }]]));
    
    const animationTimer = setTimeout(() => {
      setAnimatingCards(new Map());
    }, 500);

    if (isCorrect) {
      if (timedRun) {
        const gainTimeMs = timedRunSettings.gainTime * 1000;
        
        // Use precise time addition
        addTime(gainTimeMs);
        setTimeGained(gainTimeMs);
        
        const gainTimeTimer = setTimeout(() => setTimeGained(0), 500);
      }
      
      toast.dismiss();
      
      showToast(
        <div>
          <img 
            src={`${process.env.PUBLIC_URL}/media/sprites/${gameState.currentPokemon.id}.png`} 
            alt={gameState.currentPokemon.name} 
            style={{width: '100%', height: '100%', objectFit: 'contain'}} 
          />
        </div>,
        'success'
      );
      resetSearch();
      moveToNextPokemon();
    } else {
      setFailedPokemon(prev => [...prev, gameState.currentPokemon]);

      const toastContent = keepCryOnError ?
        <div>
          <img 
            src={`${process.env.PUBLIC_URL}/media/sprites/0.png`} 
            alt="Unknown Pokémon" 
            style={{width: '100%', height: '100%', objectFit: 'contain'}} 
          />
        </div> :
        <div>
          <img 
            src={`${process.env.PUBLIC_URL}/media/sprites/${gameState.currentPokemon.id}.png`} 
            alt={gameState.currentPokemon.name}
            style={{width: '100%', height: '100%', objectFit: 'contain'}} 
          />
        </div>;

      toast.dismiss();
      
      showToast(toastContent, 'error');

      if (hardcoreMode) {
        endGame();
        return;
      }
      
      if (timedRun) {
        const loseTimeMs = timedRunSettings.loseTime * 1000;
        
        // Use precise time subtraction and check if it will end the game
        const willEndGame = subtractTime(loseTimeMs);
        setTimeLost(loseTimeMs);
        
        const loseTimeTimer = setTimeout(() => setTimeLost(0), 500);
        
        // End the game if time ran out
        if (willEndGame) {
          setTimeout(() => {
            if (!isGameFinished) {
              endGame(true);
            }
          }, 100);
          return;
        }
      }
      
      if (!keepCryOnError) {
        resetSearch();
        moveToNextPokemon();
      } else if (!isGameFinished) { 
        if (gameState.currentPokemon) {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current = null;
          }
          isAudioPlaying.current = false;
          
          setTimeout(() => {
            playCurrentCry(gameState.currentPokemon, false);
          }, 50);
        }
      }
    }
  }, [isGameInitialized, gameState.currentPokemon, keepCryOnError, moveToNextPokemon, playCurrentCry, resetSearch, timedRun, timedRunSettings, endGame, hardcoreMode, isGameFinished, showToast, addTime, subtractTime]);

  const handleSearch = useCallback((searchTerm) => {
    const normalizedSearchTerm = searchTerm.toLowerCase()
      .replace(/♂/g, 'm')
      .replace(/♀/g, 'f')
      .replace(/[^a-z0-9mf]/g, '');
    
    const filtered = gameState.visiblePokemon.filter(pokemon => 
      pokemon.name.toLowerCase()
        .replace(/♂/g, 'm')
        .replace(/♀/g, 'f')
        .replace(/[^a-z0-9mf]/g, '')
        .includes(normalizedSearchTerm)
    );
    
    setFilteredPokemonList(filtered);
    scrollToTop();
  }, [gameState.visiblePokemon]);

  const handleEnterPress = useCallback((searchTerm) => {
    const normalizedSearchTerm = searchTerm.toLowerCase()
      .replace(/♂/g, 'm')
      .replace(/♀/g, 'f')
      .replace(/[^a-z0-9mf]/g, '');

    if (normalizedSearchTerm === 'sarrat' && !shinyPartyActivated) {
      setAllShiny(true);
      setShinyPartyActivated(true);
      
      if (!shinyAudioRef.current) {
        shinyAudioRef.current = new Audio(`${process.env.PUBLIC_URL}/media/sounds/shiny.mp3`);
      }
      
      shinyAudioRef.current.play().catch(error => console.error("Error playing shiny sound:", error));
      
      const existingToasts = document.getElementsByClassName('Toastify__toast');
      for (let i = 0; i < existingToasts.length; i++) {
        existingToasts[i].style.display = 'none';
      }

      toast.dismiss();

      toast(
        <div>
          <img 
            src={`${process.env.PUBLIC_URL}/media/images/ludicolo.gif`}
            alt="Shiny Ludicolo"
            style={{width: '100%', height: '100%', objectFit: 'contain'}} 
          />
          <p>🎉 Welcome to the shiny party! 🎉</p>
        </div>, 
        {
          position: "top-right",
          autoClose: 1500,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: false,
          draggable: false,
          progress: undefined,
          closeButton: false,
          className: 'custom-toast shiny-party-toast',
          onMouseEnter: toast.dismiss,
        }
      );
      if (navbarRef.current) {
        navbarRef.current.resetSearch();
      }
      return;
    }

    const exactMatch = filteredPokemonList.find(pokemon => 
      pokemon.name.toLowerCase()
        .replace(/♂/g, 'm')
        .replace(/♀/g, 'f')
        .replace(/[^a-z0-9mf]/g, '') === normalizedSearchTerm &&
      gameState.visiblePokemon.some(visible => visible.id === pokemon.id)
    );

    if (exactMatch) {
      handlePokemonClick(exactMatch);
      return;
    }

    const filteredVisiblePokemon = filteredPokemonList.filter(pokemon => 
      pokemon.name.toLowerCase()
        .replace(/♂/g, 'm')
        .replace(/♀/g, 'f')
        .replace(/[^a-z0-9mf]/g, '')
        .includes(normalizedSearchTerm) && 
      gameState.visiblePokemon.some(visible => visible.id === pokemon.id)
    );

    if (filteredVisiblePokemon.length === 1) {
      handlePokemonClick(filteredVisiblePokemon[0]);
    }
  }, [filteredPokemonList, gameState.visiblePokemon, handlePokemonClick, shinyPartyActivated]);

  const handleKeyPress = useCallback((event) => {
    const char = event.key;
    if ((/^[a-zA-Z0-9]$/.test(char) || char === 'Backspace') && navbarRef.current) {
      navbarRef.current.focusSearchInput();
    }
  }, []);

  const handleExitClick = () => {
    scrollToTop();
    endGame(true);
  };

  // Update formatTime to handle millisecond precision
  const formatTime = (time) => {
    const totalSeconds = typeof time === 'number' ? Math.ceil(time / 1000) : time;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  useEffect(() => {
    if (isGameInitialized && gameState.currentPokemon) {
      console.log("EFFECT SKIP - Evitando reproducción duplicada en el useEffect");
    }
  }, [isGameInitialized, gameState.currentPokemon, playCurrentCry]);

  useEffect(() => {
    if (isGameFullyLoaded && !timedRun && !isGameFinished) {
      console.log("Starting normal timer");
      setTimer(0);
      
      if (!gameStartTime) {
        const startTime = Date.now();
        setGameStartTime(startTime);
        console.log(`Game started at: ${new Date(startTime).toISOString()}`);
      }
      
      const intervalId = setInterval(() => {
        if (gameStartTime) {
          const elapsedSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
          setTimer(elapsedSeconds);
        } else {
          setTimer(prevTimer => prevTimer + 1);
        }
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, [isGameFullyLoaded, timedRun, isGameFinished, gameStartTime]);

  const timerIntervalRef = useRef(null);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  useEffect(() => {
    if (navbarRef.current) {
      setNavbarHeight(navbarRef.current.offsetHeight);
    }
  }, [navbarRef]);

  useEffect(() => {
    scrollToTop();
  }, []);

  useEffect(() => {
    if (gameOver) {
      setEndTime(Date.now());
    }
  }, [gameOver]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      
      if (shinyAudioRef.current) {
        shinyAudioRef.current.pause();
        shinyAudioRef.current.src = '';
        shinyAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const cleanupTimers = [];
    
    return () => {
      cleanupTimers.forEach(timer => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.type = 'text/css';
    styleSheet.innerHTML = `
      .loading-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: rgba(0, 0, 0, 0.7);
        z-index: 1000;
      }
      .loading-content {
        text-align: center;
        padding: 20px 30px;
        background-color: #fff;
        border-radius: 10px;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
      }
      .loading-spinner {
        width: 50px;
        height: 50px;
        margin: 0 auto 20px;
        border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleSheet);
    
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  if (!isGameReady) {
    return <div className="game-container"></div>;
  }

  if (!isGameFullyLoaded && isGameReady) {
    return <LoadingScreen />;
  }

  if (pokemonList.length === 0) {
    return (
      <div className="game-container">
        <p className="error-message">Loading Pokémon data... If this message persists, please return to the start screen.</p>
      </div>
    );
  }

  if (gameOver) {
    return (
      <GameOverScreen
        stats={{
          correctCount: gameState.correctCount,
          incorrectCount: gameState.incorrectCount,
          totalTime: formatTime(timedRun ? timeLeftMs : gameDuration),
          progressCount: gameState.progressCount
        }}
        failedPokemon={failedPokemon}
        onPlayAgain={() => {
          setGameState(prevState => ({
            ...prevState,
            visiblePokemon: pokemonList,
          }));
          onExit();
        }}
        selectedGameMode={selectedGameMode}
        pokemonList={pokemonList} 
        startTime={gameStartTime}
        endTime={endTime}
      />
    );
  }

  return (
    <div className="game-container" style={{ paddingTop: `${navbarHeight}px` }}>
      <Navbar 
        ref={navbarRef}
        onPlayCry={() => {
          console.log("Play cry button clicked");
          if (isAudioPlaying.current || isPlaying) {
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.src = '';
              audioRef.current = null;
            }
            isAudioPlaying.current = false;
            setIsPlaying(false);
            setTimeout(() => {
              playCurrentCry(gameState.currentPokemon, false);
            }, 50);
          } else {
            playCurrentCry(gameState.currentPokemon, false);
          }
        }}
        correctCount={gameState.correctCount}
        incorrectCount={gameState.incorrectCount}
        onSearch={handleSearch}
        onEnterPress={handleEnterPress}
        isPlaying={isPlaying || isAutoPlaying}
        progressCount={gameState.progressCount}
        totalCount={limitedQuestions ? numberOfQuestions : (selectedGameMode === 'dontRepeatPokemon' ? shuffledPokemonList.length : undefined)}
        showProgress={true}
        timeLeft={timedRun ? timeLeftMs : timer * 1000}
        showTimer={true}
        timeGained={timeGained}
        timeLost={timeLost}
        formatTime={formatTime}
        timer={timer}
        selectedGameMode={selectedGameMode}
        hardcoreMode={hardcoreMode}
      />
      <div className="game-content">
        <div className="game-screen">
          <PokemonGrid 
            pokemonList={memoizedPokemonList}
            visiblePokemonIds={filteredPokemonList.map(p => p.id)}
            onPokemonClick={handlePokemonClick}
            currentPokemon={gameState.currentPokemon}
            animatingCards={animatingCards}
            isGameOver={false}
            totalAvailablePokemon={memoizedPokemonList.length}
            allShiny={allShiny}
            limitedAnswers={limitedAnswers}
            numberOfAnswers={numberOfAnswers}
          />
        </div>
      </div>
      <footer className="game-footer">
        <p className="footer-text">
        <a href="https://davidsarratgonzalez.github.io" target="_blank" rel="noopener noreferrer">Made with ❤️ by <strong>David Sarrat González</strong></a>
        </p>
        <button className="exit-button" onClick={handleExitClick}>Exit Game</button>
      </footer>
      <ToastContainer className="toast-container-custom" />
    </div>
  );
}

export default React.memo(GameScreen);