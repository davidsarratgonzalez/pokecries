import React, { useRef, useEffect } from 'react';
import './GameOverScreen.css';
import PokemonCard from './PokemonCard';
import { scrollToTop } from '../utils/scrollUtils';

function GameOverScreen({ stats, failedPokemon, onPlayAgain, selectedGameMode, startTime, endTime }) {
  const { correctCount, incorrectCount } = stats;
  const audioRef = useRef(null);

  useEffect(() => {
    scrollToTop();
    const allPokemonCards = document.querySelectorAll('.pokemon-card');
    allPokemonCards.forEach(card => {
      card.classList.remove('hidden');
    });

    // Restore touchAction when navigating to Game Over screen
    document.body.style.touchAction = 'auto';
    document.documentElement.style.touchAction = 'auto';
  }, []);

  const playPokemonCry = (pokemonId) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    audioRef.current = new Audio(`${process.env.PUBLIC_URL}/media/cries/${pokemonId}.mp3`);
    audioRef.current.play();
  };

  const totalTime = ((endTime - startTime) / 1000).toFixed(4);
  const minutes = Math.floor(totalTime / 60);
  const seconds = (totalTime % 60).toFixed(4);

  return (
    <div className="game-over-container">
      <h1 className="game-over-title" data-text="Game Over!">Game Over!</h1>
      <div className="stats-container">
        <div className="stat-item">
          <span className="stat-label">Correct</span>
          <span className="stat-value correct">{correctCount}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Incorrect</span>
          <span className="stat-value incorrect">{incorrectCount}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Time</span>
          <span className="stat-value time">{minutes}:{seconds < 10 ? '0' : ''}{seconds}</span>
        </div>
      </div>
      
      {failedPokemon.length > 0 && (
        <>
          <h2 className="failed-pokemon-title">Pokémon you missed:</h2>
          <div className="failed-pokemon-grid">
            {failedPokemon.map(pokemon => (
              <PokemonCard
                key={pokemon.id}
                pokemon={pokemon}
                onClick={() => playPokemonCry(pokemon.id)}
                isVisible={true}
              />
            ))}
          </div>
        </>
      )}
      
      <button className="play-again-button" onClick={() => {
        scrollToTop();
        onPlayAgain();
      }}>
        Back to Main Menu
      </button>

      <footer className="game-over-footer">
        <a href="https://davidsarratgonzalez.github.io" target="_blank" rel="noopener noreferrer">
          Made with ❤️ by <strong>David Sarrat González</strong>
        </a>
      </footer>
    </div>
  );
}

export default GameOverScreen;