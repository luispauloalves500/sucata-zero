import './style.css';
import { Game } from './app/game';

const root = document.getElementById('app')!;
const game = new Game(root);
game.boot();
(window as any).__game = game;
