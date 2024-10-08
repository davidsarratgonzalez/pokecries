import React, { useEffect, useRef, useState, useCallback } from 'react';
import './PokemonCard.css';

const PokemonCard = React.memo(function PokemonCard({ pokemon, onClick, isAnimating, isCorrect, isVisible, isGameOver, totalAvailablePokemon, allShiny }) {
  const cardRef = useRef(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isShiny, setIsShiny] = useState(false);

  useEffect(() => {
    if (!isGameOver) {
      setIsShiny(allShiny || Math.random() < (1/10) / totalAvailablePokemon);
    }
  }, [totalAvailablePokemon, isGameOver, allShiny]);

  const handleAnimation = useCallback(() => {
    if (isAnimating) {
      const card = cardRef.current;
      if (card) {
        card.style.animation = 'none';
        void card.offsetWidth;
        card.style.animation = null;
        card.classList.remove('correct-animation', 'incorrect-animation', 'shake-animation');
        void card.offsetWidth;
        if (isGameOver) {
          card.classList.add('shake-animation');
        } else {
          card.classList.add(isCorrect ? 'correct-animation' : 'incorrect-animation');
        }
      }
    }
  }, [isAnimating, isCorrect, isGameOver]);

  useEffect(() => {
    handleAnimation();
  }, [handleAnimation]);

  const handleClick = useCallback(() => {
    const card = cardRef.current;
    if (card) {
      card.style.animation = 'none';
      void card.offsetWidth;
      card.style.animation = null;
      card.classList.remove('correct-animation', 'incorrect-animation', 'shake-animation');
    }
    onClick();
    if (isGameOver) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  }, [onClick, isGameOver]);

  const visibilityClass = isVisible ? '' : 'hidden';
  const shakeClass = isShaking ? 'shake-animation' : '';
  const spritePath = (isShiny || allShiny) && !isGameOver 
    ? `${process.env.PUBLIC_URL}/media/sprites/shiny/${pokemon.id}.png`
    : `${process.env.PUBLIC_URL}/media/sprites/${pokemon.id}.png`;

  return (
    <div 
      ref={cardRef}
      className={`pokemon-card ${visibilityClass} ${shakeClass}`} 
      onClick={handleClick}
    >
      <img 
        src={spritePath} 
        alt={pokemon.name} 
        className="pokemon-image"
      />
      <p className="pokemon-name">{pokemon.name}</p>
    </div>
  );
});

export default PokemonCard;