import React, { useState, useEffect } from 'react';
import './StartScreen.css';
import GenerationSelector from './GenerationSelector';
import GameModeSelector from './GameModeSelector';
import LimitedAnswersSelector from './LimitedAnswersSelector';
import GameOptionsSelector from './GameOptionsSelector';
import GameScreen from './GameScreen';
import { scrollToTop } from '../utils/scrollUtils';

function StartScreen() {
  const [selectedGenerations, setSelectedGenerations] = useState(['gen1']);
  const [selectedGameMode, setSelectedGameMode] = useState('freestyle');
  const [gameStarted, setGameStarted] = useState(false);
  const [timeAttackSettings, setTimeAttackSettings] = useState({
    minutes: 2,
    seconds: 0,
    gainTime: 0,
    loseTime: 0
  });
  const [limitedAnswers, setLimitedAnswers] = useState(false);
  const [numberOfAnswers, setNumberOfAnswers] = useState(4);
  const [keepCryOnError, setKeepCryOnError] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    scrollToTop();
  }, []);

  const isStartButtonDisabled = () => {
    if (selectedGenerations.length === 0) return true;
    if (selectedGameMode === 'time_attack' && timeAttackSettings.minutes === 0 && timeAttackSettings.seconds === 0) return true;
    if (limitedAnswers && (numberOfAnswers === '' || numberOfAnswers < 2)) return true;
    return false;
  };

  const handleStartGame = () => {
    if (selectedGenerations.length === 0) {
      setError('You must select at least one generation!');
      return;
    }
    if (selectedGameMode === 'time_attack' && timeAttackSettings.minutes === 0 && timeAttackSettings.seconds === 0) {
      setError('Please set a time greater than 0 for Time Attack!');
      return;
    }
    if (limitedAnswers && numberOfAnswers < 2) {
      setError('Number of answers must be at least 2 when Limited answers is enabled!');
      return;
    }
    setError('');
    scrollToTop();
    setTimeout(() => {
      setGameStarted(true);
    }, 100);
  };

  const handleExitGame = () => {
    setGameStarted(false);
  };

  if (gameStarted) {
    return (
      <GameScreen 
        selectedGenerations={selectedGenerations} 
        setSelectedGenerations={setSelectedGenerations}
        selectedGameMode={selectedGameMode} 
        setSelectedGameMode={setSelectedGameMode}
        onExit={handleExitGame}
        timeAttackSettings={timeAttackSettings}
        setTimeAttackSettings={setTimeAttackSettings}
        limitedAnswers={limitedAnswers}
        setLimitedAnswers={setLimitedAnswers}
        numberOfAnswers={numberOfAnswers}
        setNumberOfAnswers={setNumberOfAnswers}
        keepCryOnError={keepCryOnError}
        setKeepCryOnError={setKeepCryOnError}
      />
    );
  }

  return (
    <div className="start-screen">
      <h1 className="title">PokéCries</h1>
      <p className="subtitle">Can you guess the Pokémon by its cry?</p>
      <GenerationSelector 
        selectedGenerations={selectedGenerations}
        setSelectedGenerations={setSelectedGenerations}
      />
      <GameModeSelector 
        selectedGameMode={selectedGameMode}
        setSelectedGameMode={setSelectedGameMode}
        setTimeAttackSettings={setTimeAttackSettings}
        timeAttackSettings={timeAttackSettings}
      />
      <LimitedAnswersSelector
        limitedAnswers={limitedAnswers}
        setLimitedAnswers={setLimitedAnswers}
        numberOfAnswers={numberOfAnswers}
        setNumberOfAnswers={setNumberOfAnswers}
      />
      <GameOptionsSelector
        keepCryOnError={keepCryOnError}
        setKeepCryOnError={setKeepCryOnError}
      />
      <button 
        className="btn btn-primary btn-lg start-button"
        onClick={handleStartGame}
        disabled={isStartButtonDisabled()}
      >
        Start Game
      </button>
      {error && <p className="error-message">{error}</p>}

      <footer className="start-screen-footer">
        <a href="https://davidsarratgonzalez.github.io" target="_blank" rel="noopener noreferrer">
          Made with ❤️ by <strong>David Sarrat González</strong>
        </a>
      </footer>
    </div>
  );
}

export default StartScreen;